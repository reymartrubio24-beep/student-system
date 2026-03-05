import "dotenv/config";
import express from "express";
import helmet from "helmet";
import cors from "cors";
import morgan from "morgan";
import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import db, { tx, logAction, initDB, run, get, all, dbFilePath } from "./db.js";
import {
  authRequired,
  requireRole,
  ensureInitialAdmin,
  loginHandler,
  registerHandler,
  studentSelfRegister,
  bootstrapOwner,
} from "./auth.js";
import { z } from "zod";
import { writeProfile, moveIfNeeded, markFilesDeleted } from "./userFiles.js";

await initDB();
ensureInitialAdmin();

const app = express();
app.use(helmet());
app.use(cors({ origin: ["http://localhost:3000"], credentials: false }));
app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));

app.get("/health", (_, res) => res.json({ ok: true }));
app.post("/auth/login", loginHandler);
app.post(
  "/auth/register",
  authRequired,
  requireRole("users", "write"),
  registerHandler,
);
app.post("/auth/register-student", studentSelfRegister);
app.post("/auth/bootstrap-owner", bootstrapOwner);

app.post(
  "/auth/change-password",
  authRequired,
  (req, res) => {
    const body = req.body || {};
    const pwd = typeof body.password === "string" ? body.password : "";
    if (!pwd || pwd.length < 6)
      return res.status(400).json({ error: "Invalid password" });
    const me = get("SELECT id, deleted_at FROM users WHERE id=?", [req.user.id]);
    if (!me || me.deleted_at)
      return res.status(401).json({ error: "Unauthorized" });
    const hash = bcrypt.hashSync(pwd, 10);
    tx(() => {
      run("UPDATE users SET password_hash=? WHERE id=?", [hash, req.user.id]);
      logAction({
        userId: req.user.id,
        action: "UPDATE",
        entity: "user_password",
        entityId: String(req.user.id),
        details: { ip: req.ip, at: Date.now() },
      });
    });
    res.json({ ok: true });
  },
);

function settingValue(key, fallback) {
  const row = get("SELECT value FROM settings WHERE key=?", [key]);
  return row?.value ?? fallback;
}
function intSetting(key, fallback) {
  const v = Number(settingValue(key, fallback));
  return Number.isFinite(v) ? v : Number(fallback);
}
function strSetting(key, fallback) {
  const v = settingValue(key, fallback);
  return typeof v === "string" ? v : String(fallback);
}

// Debug: fetch a user by id (developer only)
app.get(
  "/debug/user/:id",
  authRequired,
  requireRole("debug"),
  (req, res) => {
    const id = Number(req.params.id);
    const row = get(
      "SELECT id, username, role, user_type, deleted_at, created_at FROM users WHERE id=?",
      [id],
    );
    res.json({ row });
  },
);
app.get(
  "/debug/users/raw",
  authRequired,
  requireRole("debug"),
  (req, res) => {
    const rows = all(
      "SELECT rowid, id, username, role, user_type, deleted_at, created_at FROM users ORDER BY id",
    );
    res.json(rows);
  },
);
app.get(
  "/debug/grade/:studentId/:subjectId",
  authRequired,
  requireRole("debug"),
  (req, res) => {
    const { studentId, subjectId } = req.params;
    const row = get(
      "SELECT * FROM grades WHERE student_id=? AND subject_id=?",
      [studentId, subjectId],
    );
    res.json({ row });
  },
);
app.get(
  "/users",
  authRequired,
  requireRole("users"),
  (req, res) => {
    const includeDeleted = String(req.query.include_deleted || "") === "1";
    const users = includeDeleted
      ? all(
          "SELECT id, username, role, user_type, student_id, created_at, deleted_at FROM users ORDER BY created_at DESC",
        )
      : all(
          "SELECT id, username, role, user_type, student_id, created_at FROM users WHERE deleted_at IS NULL ORDER BY created_at DESC",
        );
    res.json(users);
  },
);
app.post(
  "/users",
  authRequired,
  requireRole("users", "write"),
  (req, res) => {
    const shape = z.object({
      username: z.string().min(3),
      password: z.string().min(6),
      role: z.enum([
        "teacher",
        "student",
        "developer",
        "saps",
        "register",
        "cashier",
      ]),
      user_type: z
        .enum([
          "teacher",
          "student",
          "developer",
          "saps",
          "register",
          "cashier",
        ])
        .optional(),
      student_id: z.string().min(1).optional(),
    });
    const parsed = shape.safeParse(req.body);
    if (!parsed.success)
      return res.status(400).json({ error: "Invalid fields" });
    const { username, password, role, user_type, student_id } = parsed.data;
    const exists = get("SELECT 1 FROM users WHERE username = ? AND deleted_at IS NULL", [username]);
    if (exists) return res.status(409).json({ error: "Username exists" });
    const hash = bcrypt.hashSync(password, 10);
    tx(() => {
      run(
        "INSERT INTO users (username, password_hash, role, user_type, student_id) VALUES (?, ?, ?, ?, ?)",
        [
          username,
          hash,
          role,
          user_type || role,
          role === "student" ? student_id || null : null,
        ],
      );
      const row = get(
        "SELECT id, username, role, user_type, created_at FROM users WHERE username=?",
        [username],
      );
      writeProfile(row);
      logAction({
        userId: req.user.id,
        action: "CREATE",
        entity: "user",
        entityId: String(row.id),
        details: { username, role, user_type: user_type || role },
      });
    });
    res.status(201).json({ ok: true });
  },
);
app.put(
  "/users/:id",
  authRequired,
  requireRole(["developer", "owner"]),
  (req, res) => {
    const idRaw = req.params.id;
    const username =
      req.query.username || (req.body && req.body.username) || null;
    // Normalize input to avoid false negatives on validation
    const body = req.body || {};
    const norm = {};
    if (typeof body.username === "string") norm.username = body.username.trim();
    if (typeof body.password === "string") norm.password = body.password;
    if (typeof body.role === "string") norm.role = body.role.trim();
    if (typeof body.user_type === "string")
      norm.user_type = body.user_type.trim();
    const shape = z.object({
      username: z
        .string()
        .min(3, "username must be at least 3 characters")
        .optional(),
      password: z
        .string()
        .min(6, "password must be at least 6 characters")
        .optional(),
      role: z
        .enum(
          ["teacher", "student", "developer", "saps", "register", "cashier"],
          {
            errorMap: () => ({
              message:
                "role must be 'teacher', 'student', 'developer', 'saps', 'register' or 'cashier'",
            }),
          },
        )
        .optional(),
      user_type: z
        .enum(
          ["teacher", "student", "developer", "saps", "register", "cashier"],
          { errorMap: () => ({ message: "user_type must be a valid role" }) },
        )
        .optional(),
      student_id: z.string().min(1).optional(),
    });
    const parsed = shape.safeParse(norm);
    if (!parsed.success)
      return res
        .status(400)
        .json({ error: "Invalid fields", details: parsed.error.flatten() });
    let prev = null;
    if (/^\d+$/.test(String(idRaw))) {
      const id = Number(idRaw);
      prev =
        get("SELECT * FROM users WHERE id=? AND deleted_at IS NULL", [id]) ||
        get(
          "SELECT * FROM users WHERE id=CAST(? AS INTEGER) AND deleted_at IS NULL",
          [String(id)],
        );
    }
    if (!prev && username) {
      prev = get(
        "SELECT * FROM users WHERE username=? AND deleted_at IS NULL",
        [username],
      );
    }
    if (!prev) return res.status(404).json({ error: "Not found" });
    if (parsed.data.username) {
      const dup = get("SELECT 1 FROM users WHERE username=? AND id<>? AND deleted_at IS NULL", [
        parsed.data.username,
        prev.id,
      ]);
      if (dup) return res.status(409).json({ error: "Username exists" });
    }
    tx(() => {
      const updates = [];
      const params = [];
      if (parsed.data.username) {
        updates.push("username=?");
        params.push(parsed.data.username);
      }
      if (parsed.data.role) {
        updates.push("role=?");
        params.push(parsed.data.role);
      }
      if (parsed.data.user_type) {
        updates.push("user_type=?");
        params.push(parsed.data.user_type);
      }
      if (typeof parsed.data.student_id === "string") {
        updates.push("student_id=?");
        params.push(parsed.data.student_id);
      }
      if (parsed.data.password) {
        updates.push("password_hash=?");
        params.push(bcrypt.hashSync(parsed.data.password, 10));
      }
      if (updates.length) {
        run(`UPDATE users SET ${updates.join(", ")} WHERE id=?`, [
          ...params,
          prev.id,
        ]);
      }
      const next = get("SELECT * FROM users WHERE id=?", [prev.id]);
      moveIfNeeded(prev, next);
      const details = parsed.data;
      logAction({
        userId: req.user.id,
        action: "UPDATE",
        entity: "user",
        entityId: String(prev.id),
        details,
      });
      if (prev.role !== next.role) {
        logAction({
          userId: req.user.id,
          action: "ROLE_CHANGE",
          entity: "user",
          entityId: String(prev.id),
          details: { from: prev.role, to: next.role },
        });
      }
    });
    res.json({ ok: true });
  },
);
app.delete(
  "/users/:id",
  authRequired,
  requireRole(["developer", "owner"]),
  (req, res) => {
    const idRaw = req.params.id;
    const hard = String(req.query.hard || "") === "1";
    const username =
      req.query.username || (req.body && req.body.username) || null;
    let prev = null;
    if (/^\d+$/.test(String(idRaw))) {
      const idNum = Number(idRaw);
      prev =
        get("SELECT * FROM users WHERE id=?", [idNum]) ||
        get("SELECT * FROM users WHERE id=CAST(? AS INTEGER)", [String(idNum)]);
    }
    if (!prev && username) {
      prev = get("SELECT * FROM users WHERE username=?", [username]);
    }
    if (!prev) return res.status(404).json({ error: "Not found" });
    if (
      prev.role === "owner" &&
      !(req.user.role === "owner" || req.user.role === "developer")
    )
      return res.status(403).json({ error: "Cannot delete owner" });
    tx(() => {
      if (hard) {
        run("DELETE FROM users WHERE id=?", [prev.id]);
        logAction({
          userId: req.user.id,
          action: "HARD_DELETE",
          entity: "user",
          entityId: String(prev.id),
        });
      } else {
        if (prev.deleted_at)
          return res.status(200).json({ ok: true, alreadyDeleted: true });
        run("UPDATE users SET deleted_at=CURRENT_TIMESTAMP WHERE id=?", [
          prev.id,
        ]);
        logAction({
          userId: req.user.id,
          action: "DELETE",
          entity: "user",
          entityId: String(prev.id),
        });
      }
      markFilesDeleted(prev.id);
    });
    res.json({ ok: true, hard });
  },
);

app.patch(
  "/users/:id/disable",
  authRequired,
  requireRole("users", "write"),
  (req, res) => {
    const idRaw = req.params.id;
    const username =
      req.query.username || (req.body && req.body.username) || null;
    let prev = null;
    if (/^\d+$/.test(String(idRaw))) {
      const id = Number(idRaw);
      prev =
        get("SELECT * FROM users WHERE id=?", [id]) ||
        get("SELECT * FROM users WHERE id=CAST(? AS INTEGER)", [String(id)]);
    }
    if (!prev && username) {
      prev = get("SELECT * FROM users WHERE username=?", [username]);
    }
    if (!prev) return res.status(404).json({ error: "Not found" });
    if (
      prev.role === "owner" &&
      !(req.user.role === "owner" || req.user.role === "developer")
    )
      return res.status(403).json({ error: "Cannot disable owner" });
    if (prev.deleted_at)
      return res.status(200).json({ ok: true, alreadyDisabled: true });
    tx(() => {
      run("UPDATE users SET deleted_at=CURRENT_TIMESTAMP WHERE id=?", [
        prev.id,
      ]);
      markFilesDeleted(prev.id);
      logAction({
        userId: req.user.id,
        action: "DISABLE",
        entity: "user",
        entityId: String(prev.id),
      });
    });
    res.json({ ok: true });
  },
);

const studentSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  course: z.string().min(1),
  year: z.string().min(1),
  email: z.string().email(),
  status: z.string().min(1),
  enrollment_year: z.string().optional(),
  program_years: z.number().int().min(1).max(10).optional(),
});
const subjectSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  units: z.number().int().min(1),
  professor: z.string().optional().default(""),
  schedule: z.string().optional().default(""),
  room: z.string().optional().default(""),
  semester_id: z.number().int().optional().nullable(),
});
const gradeSchema = z.object({
  student_id: z.string().min(1),
  subject_id: z.string().min(1),
  prelim: z.number().int().min(0).max(100).nullable().optional(),
  midterm: z.number().int().min(0).max(100).nullable().optional(),
  prefinal: z.number().int().min(0).max(100).nullable().optional(),
  final: z.number().int().min(0).max(100).nullable().optional(),
});

app.get("/students", authRequired, requireRole("students"), (req, res) => {
  const { role } = req.user;
  if (role === "student") {
    const row = get(
      "SELECT * FROM students WHERE id=? AND deleted_at IS NULL",
      [req.user.student_id],
    );
    return res.json(row ? [row] : []);
  }

  const rows = all("SELECT * FROM students WHERE deleted_at IS NULL");
  res.json(rows);
});

app.get("/dashboard-stats", authRequired, (req, res) => {
  const { role, student_id } = req.user;
  const stats = {};

  // Total students (Available to all roles by request)
  const totalStudents = get("SELECT COUNT(*) as c FROM students WHERE deleted_at IS NULL");
  stats.totalStudents = totalStudents?.c || 0;

  if (role === "student") {
    // Student Dashboard: own grades count, own subjects
    const ownGrades = get("SELECT COUNT(*) as c FROM grades WHERE student_id=? AND deleted_at IS NULL", [student_id]);
    stats.gradeRecords = ownGrades?.c || 0;
    
    const ownSubjects = get("SELECT COUNT(*) as c FROM grades WHERE student_id=? AND deleted_at IS NULL", [student_id]);
    stats.activeSubjects = ownSubjects?.c || 0;
    
    // Hide at-risk (not in stats)
    return res.json(stats);
  }

  // Staff Dashboard
  const activeSubs = get("SELECT COUNT(*) as c FROM subjects WHERE deleted_at IS NULL");
  stats.activeSubjects = activeSubs?.c || 0;
  
  const gradeRecords = get("SELECT COUNT(*) as c FROM grades WHERE deleted_at IS NULL");
  stats.gradeRecords = gradeRecords?.c || 0;

  // At-risk students (only for staff, hide for student)
  // This is a complex query, we'll return a count
  const atRisk = all(`
    SELECT student_id, AVG((prelim + midterm + prefinal + final) / 4.0) as avg_grade
    FROM grades
    WHERE deleted_at IS NULL
    GROUP BY student_id
    HAVING avg_grade < 75
  `);
  stats.atRiskCount = atRisk.length;

  res.json(stats);
});
app.post(
  "/students",
  authRequired,
  requireRole("students", "write"),
  (req, res) => {
    const body = req.body || {};
    const norm = {
      name: String(body.name || "").trim(),
      course: String(body.course || "").trim(),
      year: String(body.year || "").trim(),
      email: String(body.email || "").trim(),
      status: String(body.status || "Active").trim(),
      birth_year: String(body.birth_year || "").trim(),
    };
    if (
      !norm.name ||
      !norm.course ||
      !norm.year ||
      !norm.email ||
      !norm.birth_year
    ) {
      return res
        .status(400)
        .json({
          error: "Invalid data",
          details: "Missing required fields, including birth year",
        });
    }
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(norm.email);
    if (!emailOk)
      return res
        .status(400)
        .json({ error: "Invalid data", details: "Email invalid" });

    const birthYear = norm.birth_year;
    if (!/^\d{4}$/.test(birthYear))
      return res
        .status(400)
        .json({
          error: "Invalid data",
          details: "Birth year must be a 4-digit number",
        });

    try {
      run(
        "INSERT OR IGNORE INTO student_id_sequence (year,last) VALUES (?,?)",
        [birthYear, 0],
      );
      let assignedId = null;
      for (let attempts = 0; attempts < 1000; attempts++) {
        run("UPDATE student_id_sequence SET last = last + 1 WHERE year = ?", [
          birthYear,
        ]);
        const row = get("SELECT last FROM student_id_sequence WHERE year=?", [
          birthYear,
        ]);
        const next = Number(row?.last || 0);
        const candidate = `${birthYear}-${String(next).padStart(4, "0")}`; // user asked for YYYY-auto_increment, example 2006-0001
        const exists = get(
          "SELECT 1 FROM students WHERE id=? AND deleted_at IS NULL",
          [candidate],
        );
        if (exists) {
          continue;
        }
        run(
          "INSERT INTO students (id,name,course,year,email,status,birth_year) VALUES (?,?,?,?,?,?,?)",
          [
            candidate,
            norm.name,
            norm.course,
            norm.year,
            norm.email,
            norm.status,
            norm.birth_year,
          ],
        );
        assignedId = candidate;
        logAction({
          userId: req.user.id,
          action: "ID_GENERATE",
          entity: "student",
          entityId: assignedId,
          details: { year: birthYear, seq: next },
        });
        const baseLast = (() => {
          const n = norm.name || "";
          if (n.includes(",")) return n.split(",")[0].trim();
          const parts = n.trim().split(/\s+/);
          return parts[parts.length - 1] || "student";
        })();
        const cleanBase = baseLast.toLowerCase().replace(/[^a-z0-9]/g, "");
        let username = cleanBase || "student";
        for (let i = 1; i < 1000; i++) {
          const uexists = get(
            "SELECT 1 FROM users WHERE username=? AND deleted_at IS NULL",
            [username],
          );
          if (!uexists) break;
          username = `${cleanBase}-${i + 1}`;
        }
        const hash = bcrypt.hashSync(assignedId, 10);
        run(
          "INSERT INTO users (username, password_hash, role, user_type, student_id) VALUES (?,?,?,?,?)",
          [username, hash, "student", "student", assignedId],
        );
        const uidRow = get("SELECT id FROM users WHERE username=?", [username]);
        logAction({
          userId: uidRow?.id || req.user.id,
          action: "USER_CREATE",
          entity: "user",
          entityId: String(uidRow?.id || 0),
          details: { username, linked_student_id: assignedId },
        });
        return res.status(201).json({ ok: true, id: assignedId, username });
      }
      return res.status(409).json({ error: "Could not assign unique ID" });
    } catch (e) {
      const msg = String((e && e.message) || "");
      return res.status(500).json({ error: "Internal error", details: msg });
    }
  },
);
app.put(
  "/students/:id",
  authRequired,
  requireRole("students", "write"),
  (req, res) => {
    const parsed = studentSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid data" });
    const id = req.params.id;
    const s = get(
      "SELECT * FROM students WHERE id = ? AND deleted_at IS NULL",
      [id],
    );
    if (!s) return res.status(404).json({ error: "Not found" });
    tx(() => {
      const fields = ["name", "course", "year", "email", "status"];
      const sets = fields
        .filter((f) => f in parsed.data)
        .map((f) => `${f}=?`)
        .join(", ");
      if (sets)
        run(`UPDATE students SET ${sets} WHERE id=?`, [
          ...fields.filter((f) => f in parsed.data).map((f) => parsed.data[f]),
          id,
        ]);
      logAction({
        userId: req.user.id,
        action: "UPDATE",
        entity: "student",
        entityId: id,
        details: parsed.data,
      });
    });
    res.json({ ok: true });
  },
);
app.delete(
  "/students/:id",
  authRequired,
  requireRole("students", "delete"),
  (req, res) => {
    const id = req.params.id;
    const s = get("SELECT 1 FROM students WHERE id=? AND deleted_at IS NULL", [
      id,
    ]);
    if (!s) return res.status(404).json({ error: "Not found" });
    tx(() => {
      run("UPDATE students SET deleted_at=CURRENT_TIMESTAMP WHERE id=?", [id]);
      run(
        "UPDATE grades SET deleted_at=CURRENT_TIMESTAMP WHERE student_id=? AND deleted_at IS NULL",
        [id],
      );
      logAction({
        userId: req.user.id,
        action: "DELETE",
        entity: "student",
        entityId: id,
      });
      logAction({
        userId: req.user.id,
        action: "BULK_DELETE",
        entity: "grade",
        entityId: `student:${id}`,
      });
    });
    res.json({ ok: true });
  },
);

// Permit number management (SAPS)
// Semester-based permit hierarchy
app.get(
  "/semesters",
  authRequired,
  requireRole("permits", "read"),
  (req, res) => {
    const rows = all(
      "SELECT * FROM semesters ORDER BY school_year DESC, term ASC",
    );
    res.json(rows);
  },
);
app.get(
  "/semesters/:id/permits",
  authRequired,
  requireRole("permits", "read"),
  (req, res) => {
    const id = Number(req.params.id);
    const sem = get("SELECT 1 FROM semesters WHERE id=?", [id]);
    if (!sem) return res.status(404).json({ error: "Semester not found" });
    const rows = all(
      `
    SELECT sp.id, sp.student_id, sp.permit_period_id, sp.permit_number, sp.issue_date, sp.expiry_date, sp.status,
           sp.created_at, sp.updated_at, pp.name, pp.semester_id
    FROM student_permits sp
    JOIN permit_periods pp ON pp.id = sp.permit_period_id
    JOIN students s ON s.id = sp.student_id AND s.deleted_at IS NULL
    WHERE pp.semester_id = ?
    ORDER BY pp.sort_order ASC, sp.student_id ASC
  `,
      [id],
    );
    res.json(rows);
  },
);
app.post(
  "/semesters",
  authRequired,
  requireRole("permits", "write"),
  (req, res) => {
    const shape = z.object({
      school_year: z.string().min(4),
      term: z.string().min(1),
    });
    const parsed = shape.safeParse(req.body || {});
    if (!parsed.success)
      return res.status(400).json({ error: "Invalid fields" });
    try {
      tx(() => {
        run("INSERT INTO semesters (school_year, term) VALUES (?,?)", [
          parsed.data.school_year,
          parsed.data.term,
        ]);
        const id = lastInsertId();
        logAction({
          userId: req.user.id,
          action: "CREATE",
          entity: "semester",
          entityId: String(id),
          details: parsed.data,
        });
      });
      res.status(201).json({ ok: true });
    } catch (e) {
      const msg = String((e && e.message) || "");
      const isUnique = /UNIQUE constraint/i.test(msg);
      if (isUnique) return res.status(409).json({ error: "Semester exists" });
      res.status(500).json({ error: "Internal error" });
    }
  },
);
app.put(
  "/semesters/:id",
  authRequired,
  requireRole("permits", "write"),
  (req, res) => {
    const id = Number(req.params.id);
    const shape = z.object({
      school_year: z.string().min(4).optional(),
      term: z.string().min(1).optional(),
    });
    const parsed = shape.safeParse(req.body || {});
    if (!parsed.success)
      return res.status(400).json({ error: "Invalid fields" });
    const prev = get("SELECT 1 FROM semesters WHERE id=?", [id]);
    if (!prev) return res.status(404).json({ error: "Not found" });
    try {
      tx(() => {
        const fields = [];
        const params = [];
        if (parsed.data.school_year) {
          fields.push("school_year=?");
          params.push(parsed.data.school_year);
        }
        if (parsed.data.term) {
          fields.push("term=?");
          params.push(parsed.data.term);
        }
        if (fields.length)
          run(`UPDATE semesters SET ${fields.join(",")} WHERE id=?`, [
            ...params,
            id,
          ]);
        logAction({
          userId: req.user.id,
          action: "UPDATE",
          entity: "semester",
          entityId: String(id),
          details: parsed.data,
        });
      });
      res.json({ ok: true });
    } catch (e) {
      const msg = String((e && e.message) || "");
      const isUnique = /UNIQUE constraint/i.test(msg);
      if (isUnique) return res.status(409).json({ error: "Semester exists" });
      res.status(500).json({ error: "Internal error" });
    }
  },
);
app.delete(
  "/semesters/:id",
  authRequired,
  requireRole("permits", "delete"),
  (req, res) => {
    const id = Number(req.params.id);
    const prev = get("SELECT 1 FROM semesters WHERE id=?", [id]);
    if (!prev) return res.status(404).json({ error: "Not found" });
    tx(() => {
      run("DELETE FROM semesters WHERE id=?", [id]);
      logAction({
        userId: req.user.id,
        action: "DELETE",
        entity: "semester",
        entityId: String(id),
      });
    });
    res.json({ ok: true });
  },
);
app.get(
  "/semesters/:id/periods",
  authRequired,
  requireRole("permits", "read"),
  (req, res) => {
    const id = Number(req.params.id);
    const rows = all(
      "SELECT * FROM permit_periods WHERE semester_id=? ORDER BY sort_order ASC, name ASC",
      [id],
    );
    res.json(rows);
  },
);
app.post(
  "/semesters/:id/periods",
  authRequired,
  requireRole("permits", "write"),
  (req, res) => {
    const id = Number(req.params.id);
    const shape = z.object({
      name: z.string().min(2),
      sort_order: z.number().int().min(0),
    });
    const parsed = shape.safeParse(req.body || {});
    if (!parsed.success)
      return res.status(400).json({ error: "Invalid fields" });
    const sem = get("SELECT 1 FROM semesters WHERE id=?", [id]);
    if (!sem) return res.status(404).json({ error: "Semester not found" });
    try {
      tx(() => {
        run(
          "INSERT INTO permit_periods (semester_id, name, sort_order) VALUES (?,?,?)",
          [id, parsed.data.name, parsed.data.sort_order],
        );
        const pid = lastInsertId();
        logAction({
          userId: req.user.id,
          action: "CREATE",
          entity: "permit_period",
          entityId: String(pid),
          details: { semester_id: id, ...parsed.data },
        });
      });
      res.status(201).json({ ok: true });
    } catch (e) {
      const msg = String((e && e.message) || "");
      const isUnique = /UNIQUE constraint/i.test(msg);
      if (isUnique) return res.status(409).json({ error: "Period exists" });
      res.status(500).json({ error: "Internal error" });
    }
  },
);
app.put(
  "/periods/:id",
  authRequired,
  requireRole("permits", "write"),
  (req, res) => {
    const id = Number(req.params.id);
    const shape = z.object({
      name: z.string().min(2).optional(),
      sort_order: z.number().int().min(0).optional(),
    });
    const parsed = shape.safeParse(req.body || {});
    if (!parsed.success)
      return res.status(400).json({ error: "Invalid fields" });
    const prev = get("SELECT 1 FROM permit_periods WHERE id=?", [id]);
    if (!prev) return res.status(404).json({ error: "Not found" });
    try {
      tx(() => {
        const fields = [];
        const params = [];
        if (parsed.data.name) {
          fields.push("name=?");
          params.push(parsed.data.name);
        }
        if (typeof parsed.data.sort_order === "number") {
          fields.push("sort_order=?");
          params.push(parsed.data.sort_order);
        }
        if (fields.length)
          run(`UPDATE permit_periods SET ${fields.join(",")} WHERE id=?`, [
            ...params,
            id,
          ]);
        logAction({
          userId: req.user.id,
          action: "UPDATE",
          entity: "permit_period",
          entityId: String(id),
          details: parsed.data,
        });
      });
      res.json({ ok: true });
    } catch (e) {
      const msg = String((e && e.message) || "");
      const isUnique = /UNIQUE constraint/i.test(msg);
      if (isUnique) return res.status(409).json({ error: "Period exists" });
      res.status(500).json({ error: "Internal error" });
    }
  },
);
app.delete(
  "/periods/:id",
  authRequired,
  requireRole("permits", "delete"),
  (req, res) => {
    const id = Number(req.params.id);
    const prev = get("SELECT 1 FROM permit_periods WHERE id=?", [id]);
    if (!prev) return res.status(404).json({ error: "Not found" });
    tx(() => {
      run("DELETE FROM permit_periods WHERE id=?", [id]);
      logAction({
        userId: req.user.id,
        action: "DELETE",
        entity: "permit_period",
        entityId: String(id),
      });
    });
    res.json({ ok: true });
  },
);
app.post(
  "/semesters/:id/bootstrap-default-periods",
  authRequired,
  requireRole("permits", "write"),
  (req, res) => {
    const id = Number(req.params.id);
    const sem = get("SELECT 1 FROM semesters WHERE id=?", [id]);
    if (!sem) return res.status(404).json({ error: "Semester not found" });
    const defaults = [
      { name: "First Prelim Permit", sort_order: 1 },
      { name: "Second Prelim Permit", sort_order: 2 },
      { name: "Midterm Permit", sort_order: 3 },
      { name: "Semi-final Permit", sort_order: 4 },
      { name: "Final Permit", sort_order: 5 },
    ];
    tx(() => {
      for (const d of defaults) {
        const exists = get(
          "SELECT 1 FROM permit_periods WHERE semester_id=? AND name=?",
          [id, d.name],
        );
        if (!exists)
          run(
            "INSERT INTO permit_periods (semester_id, name, sort_order) VALUES (?,?,?)",
            [id, d.name, d.sort_order],
          );
      }
      logAction({
        userId: req.user.id,
        action: "CREATE",
        entity: "permit_periods",
        entityId: String(id),
        details: { preset: "defaults", count: defaults.length },
      });
    });
    res.json({ ok: true });
  },
);
app.get(
  "/students/:id/permits",
  authRequired,
  requireRole("permits", "read"),
  (req, res) => {
    const id = String(req.params.id);
    const semesterId = req.query.semester_id
      ? Number(req.query.semester_id)
      : null;
    const exists = get(
      "SELECT 1 FROM students WHERE id=? AND deleted_at IS NULL",
      [id],
    );
    if (!exists) return res.status(404).json({ error: "Student not found" });
    const rows = semesterId
      ? all(
          `SELECT sp.*, pp.name, pp.semester_id FROM student_permits sp JOIN permit_periods pp ON pp.id=sp.permit_period_id WHERE sp.student_id=? AND pp.semester_id=? ORDER BY pp.sort_order`,
          [id, semesterId],
        )
      : all(
          `SELECT sp.*, pp.name, pp.semester_id FROM student_permits sp JOIN permit_periods pp ON pp.id=sp.permit_period_id WHERE sp.student_id=? ORDER BY pp.semester_id, pp.sort_order`,
          [id],
        );
    res.json(rows);
  },
);
app.post(
  "/students/:id/permits",
  authRequired,
  requireRole("permits", "write"),
  (req, res) => {
    const id = String(req.params.id);
    const shape = z.object({
      permit_period_id: z.number().int().min(1),
      permit_number: z.string().min(1).optional(),
      issue_date: z.string().optional(),
      expiry_date: z.string().optional(),
      status: z.enum(["active", "expired", "pending"]).optional(),
    });
    const parsed = shape.safeParse(req.body || {});
    if (!parsed.success)
      return res.status(400).json({ error: "Invalid fields" });
    const student = get(
      "SELECT 1 FROM students WHERE id=? AND deleted_at IS NULL",
      [id],
    );
    if (!student) return res.status(404).json({ error: "Student not found" });
    const period = get("SELECT 1 FROM permit_periods WHERE id=?", [
      parsed.data.permit_period_id,
    ]);
    if (!period) return res.status(404).json({ error: "Period not found" });
    try {
      tx(() => {
        const existing = get(
          "SELECT id, permit_number FROM student_permits WHERE student_id=? AND permit_period_id=?",
          [id, parsed.data.permit_period_id],
        );
        if (existing) {
          const nextNumber =
            (parsed.data.permit_number && parsed.data.permit_number.trim()) ||
            String(existing.permit_number);
          run(
            "UPDATE student_permits SET permit_number=?, issue_date=COALESCE(?, issue_date), expiry_date=COALESCE(?, expiry_date), status=COALESCE(?, status), updated_at=CURRENT_TIMESTAMP WHERE id=?",
            [
              nextNumber,
              parsed.data.issue_date || null,
              parsed.data.expiry_date || null,
              parsed.data.status || null,
              existing.id,
            ],
          );
          logAction({
            userId: req.user.id,
            action: "UPDATE",
            entity: "student_permit",
            entityId: String(existing.id),
            details: parsed.data,
          });
        } else {
          const seq = get(
            "SELECT last FROM permit_number_sequence WHERE id=1",
          );
          const next = Number(seq?.last || 0) + 1;
          run("UPDATE permit_number_sequence SET last=?", [next]);
          const assignedNumber = String(next);
          run(
            "INSERT INTO student_permits (student_id, permit_period_id, permit_number, issue_date, expiry_date, status) VALUES (?,?,?,?,?,?)",
            [
              id,
              parsed.data.permit_period_id,
              assignedNumber,
              parsed.data.issue_date || null,
              parsed.data.expiry_date || null,
              parsed.data.status || "active",
            ],
          );
          const spid = lastInsertId();
          logAction({
            userId: req.user.id,
            action: "CREATE",
            entity: "student_permit",
            entityId: String(spid),
            details: { ...parsed.data, auto_number: assignedNumber },
          });
        }
      });
      res.status(201).json({ ok: true });
    } catch (e) {
      const msg = String((e && e.message) || "");
      const isUnique = /UNIQUE constraint/i.test(msg);
      if (isUnique)
        return res.status(409).json({ error: "Permit exists for period" });
      res.status(500).json({ error: "Internal error" });
    }
  },
);
app.put(
  "/students/:id/permits/:periodId",
  authRequired,
  requireRole("permits", "write"),
  (req, res) => {
    const id = String(req.params.id);
    const periodId = Number(req.params.periodId);
    const shape = z.object({
      permit_number: z.string().min(1).optional(),
      issue_date: z.string().optional(),
      expiry_date: z.string().optional(),
      status: z.enum(["active", "expired", "pending"]).optional(),
    });
    const parsed = shape.safeParse(req.body || {});
    if (!parsed.success)
      return res.status(400).json({ error: "Invalid fields" });
    const sp = get(
      "SELECT id FROM student_permits WHERE student_id=? AND permit_period_id=?",
      [id, periodId],
    );
    if (!sp) return res.status(404).json({ error: "Not found" });
    tx(() => {
      let nextNumber = parsed.data.permit_number || null;
      if (!nextNumber) {
        const seq = get("SELECT last FROM permit_number_sequence WHERE id=1");
        const next = Number(seq?.last || 0) + 1;
        run("UPDATE permit_number_sequence SET last=?", [next]);
        nextNumber = String(next);
      }
      run(
        "UPDATE student_permits SET permit_number=?, issue_date=COALESCE(?, issue_date), expiry_date=COALESCE(?, expiry_date), status=COALESCE(?, status), updated_at=CURRENT_TIMESTAMP WHERE id=?",
        [
          nextNumber,
          parsed.data.issue_date || null,
          parsed.data.expiry_date || null,
          parsed.data.status || null,
          sp.id,
        ],
      );
      logAction({
        userId: req.user.id,
        action: "UPDATE",
        entity: "student_permit",
        entityId: String(sp.id),
        details: { permit_number: nextNumber },
      });
    });
    res.json({ ok: true });
  },
);
app.delete(
  "/students/:id/permits/:periodId",
  authRequired,
  requireRole("permits", "delete"),
  (req, res) => {
    const id = String(req.params.id);
    const periodId = Number(req.params.periodId);
    const sp = get(
      "SELECT id FROM student_permits WHERE student_id=? AND permit_period_id=?",
      [id, periodId],
    );
    if (!sp) return res.status(404).json({ error: "Not found" });
    tx(() => {
      run("DELETE FROM student_permits WHERE id=?", [sp.id]);
      logAction({
        userId: req.user.id,
        action: "DELETE",
        entity: "student_permit",
        entityId: String(sp.id),
      });
    });
    res.json({ ok: true });
  },
);

// Tuition balance management (SAPS/Register/Cashier)
app.get(
  "/students/:id/tuition-balance",
  authRequired,
  requireRole("payments", "read"),
  (req, res) => {
    const id = req.params.id;
    const row = get(
      "SELECT tuition_balance FROM students WHERE id=? AND deleted_at IS NULL",
      [id],
    );
    if (!row) return res.status(404).json({ error: "Not found" });
    res.json({ id, tuition_balance: Number(row.tuition_balance || 0) });
  },
);
app.put(
  "/students/:id/tuition-balance",
  authRequired,
  requireRole("payments", "write"),
  (req, res) => {
    const id = req.params.id;
    const amount = Number(req.body?.amount);
    if (!Number.isFinite(amount))
      return res.status(400).json({ error: "Invalid amount" });
    const exists = get(
      "SELECT 1 FROM students WHERE id=? AND deleted_at IS NULL",
      [id],
    );
    if (!exists) return res.status(404).json({ error: "Not found" });
    tx(() => {
      run("UPDATE students SET tuition_balance=? WHERE id=?", [amount, id]);
      logAction({
        userId: req.user.id,
        action: "UPDATE",
        entity: "tuition_balance",
        entityId: id,
        details: { amount },
      });
    });
    res.json({ ok: true });
  },
);

// Payments (Cashier)
app.post(
  "/payments",
  authRequired,
  requireRole("payments", "write"),
  (req, res) => {
    const shape = z.object({
      student_id: z.string().min(1),
      amount: z.number().min(0.01),
      method: z.string().optional(),
      reference: z.string().optional(),
      status: z.enum(["posted","void","pending"]).optional()
    });
    const parsed = shape.safeParse(req.body || {});
    if (!parsed.success)
      return res.status(400).json({ error: "Invalid fields" });
    const s = get("SELECT 1 FROM students WHERE id=? AND deleted_at IS NULL", [
      parsed.data.student_id,
    ]);
    if (!s) return res.status(404).json({ error: "Student not found" });
    tx(() => {
      run(
        "INSERT INTO payments (student_id, amount, method, reference, status) VALUES (?,?,?,?,?)",
        [
          parsed.data.student_id,
          parsed.data.amount,
          parsed.data.method || null,
          parsed.data.reference || null,
          parsed.data.status || "posted"
        ],
      );
      // Decrease tuition balance automatically
      const bal = get("SELECT tuition_balance FROM students WHERE id=?", [
        parsed.data.student_id,
      ]);
      const next = Number(bal?.tuition_balance || 0) - parsed.data.amount;
      run("UPDATE students SET tuition_balance=? WHERE id=?", [
        next,
        parsed.data.student_id,
      ]);
      logAction({
        userId: req.user.id,
        action: "CREATE",
        entity: "payment",
        entityId: parsed.data.student_id,
        details: parsed.data,
      });
    });
    res.status(201).json({ ok: true });
  },
);
app.get(
  "/payments",
  authRequired,
  requireRole("payments", "read"),
  (req, res) => {
    const { role, student_id } = req.user;
    const from = req.query.from ? String(req.query.from) : null;
    const to = req.query.to ? String(req.query.to) : null;
    const method = req.query.method ? String(req.query.method) : null;
    const clauses = [];
    const params = [];
    if (from) { clauses.push("created_at >= ?"); params.push(from); }
    if (to) { clauses.push("created_at <= ?"); params.push(to); }
    if (method) { clauses.push("COALESCE(method,'') = ?"); params.push(method); }
    const where = clauses.length ? ` AND ${clauses.join(" AND ")}` : "";
    if (role === "student") {
      const rows = all(
      "SELECT id, amount, method, reference, status, created_at FROM payments WHERE student_id=?"+where+" ORDER BY created_at DESC",
        [student_id, ...params],
      );
      logAction({ userId: req.user.id, action: "READ", entity: "payment", entityId: String(student_id), details: { from, to, method } });
      return res.json(rows);
    }
    const rows = all(
    "SELECT p.*, s.name FROM payments p JOIN students s ON s.id=p.student_id" + (where ? ` WHERE ${where.slice(5)}` : "") + " ORDER BY p.created_at DESC",
      params
    );
    res.json(rows);
  },
);
app.get(
  "/payments/:studentId",
  authRequired,
  requireRole("payments", "read"),
  (req, res) => {
    const sid = req.params.studentId;
    const from = req.query.from ? String(req.query.from) : null;
    const to = req.query.to ? String(req.query.to) : null;
    const method = req.query.method ? String(req.query.method) : null;
    const clauses = [];
    const params = [];
    if (from) { clauses.push("created_at >= ?"); params.push(from); }
    if (to) { clauses.push("created_at <= ?"); params.push(to); }
    if (method) { clauses.push("COALESCE(method,'') = ?"); params.push(method); }
    const where = clauses.length ? ` AND ${clauses.join(" AND ")}` : "";
    if (req.user.role === "student" && sid !== req.user.student_id) {
       logAction({ userId: req.user.id, action: "ACCESS_DENIED", entity: "payment", entityId: sid, details: { path: "/payments/:studentId" } });
       return res.status(403).json({ error: "Forbidden" });
    }
    const rows = all(
      "SELECT id, amount, method, reference, status, created_at FROM payments WHERE student_id=?"+where+" ORDER BY created_at DESC",
      [sid, ...params],
    );
    logAction({ userId: req.user.id, action: "READ", entity: "payment", entityId: String(sid), details: { from, to, method } });
    res.json(rows);
  },
);

app.get("/subjects", authRequired, requireRole("subjects"), (req, res) => {
  const { role, username } = req.user;
  if (role === "teacher") {
    const rows = all("SELECT * FROM subjects WHERE professor=? AND deleted_at IS NULL", [username]);
    return res.json(rows);
  }
  if (role === "student") {
    const sid = req.user.student_id;
    const rows = all(`
      SELECT b.* FROM subjects b
      JOIN grades g ON g.subject_id = b.id
      WHERE g.student_id = ? AND g.deleted_at IS NULL AND b.deleted_at IS NULL
    `, [sid]);
    return res.json(rows);
  }
  const rows = all("SELECT * FROM subjects WHERE deleted_at IS NULL");
  res.json(rows);
});
app.post(
  "/subjects",
  authRequired,
  requireRole("subjects", "write"),
  (req, res) => {
    const body = req.body || {};
    const norm = {
      id: String(body.id || "").trim(),
      name: String(body.name || "").trim(),
      units: Number(body.units),
      professor: String(body.professor || "").trim(),
      schedule: String(body.schedule || "").trim(),
      room: String(body.room || "").trim(),
      semester_id: body.semester_id != null ? Number(body.semester_id) : null,
    };
    const parsed = subjectSchema.safeParse(norm);
    if (!parsed.success)
      return res
        .status(400)
        .json({ error: "Invalid data", details: parsed.error.flatten() });
    try {
      tx(() => {
        run(
          "INSERT INTO subjects (id,name,units,professor,schedule,room,semester_id) VALUES (?,?,?,?,?,?,?)",
          [
            parsed.data.id,
            parsed.data.name,
            parsed.data.units,
            parsed.data.professor,
            parsed.data.schedule,
            parsed.data.room,
            parsed.data.semester_id || null,
          ],
        );
        logAction({
          userId: req.user.id,
          action: "CREATE",
          entity: "subject",
          entityId: parsed.data.id,
        });
      });
      res.status(201).json({ ok: true });
    } catch (e) {
      const msg = String((e && e.message) || "");
      const isUnique =
        /UNIQUE constraint failed|UNIQUE constraint|ConstraintError/i.test(msg);
      if (isUnique) return res.status(409).json({ error: "Subject exists" });
      res.status(500).json({ error: "Internal error" });
    }
  },
);
app.put(
  "/subjects/:id",
  authRequired,
  requireRole("subjects", "write"),
  (req, res) => {
    const parsed = subjectSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid data" });
    const id = req.params.id;
    const s = get(
      "SELECT * FROM subjects WHERE id = ? AND deleted_at IS NULL",
      [id],
    );
    if (!s) return res.status(404).json({ error: "Not found" });
    tx(() => {
      const fields = ["name", "units", "professor", "schedule", "room", "semester_id"];
      const sets = fields
        .filter((f) => f in parsed.data)
        .map((f) => `${f}=?`)
        .join(", ");
      if (sets)
        run(`UPDATE subjects SET ${sets} WHERE id=?`, [
          ...fields.filter((f) => f in parsed.data).map((f) => parsed.data[f]),
          id,
        ]);
      logAction({
        userId: req.user.id,
        action: "UPDATE",
        entity: "subject",
        entityId: id,
        details: parsed.data,
      });
    });
    res.json({ ok: true });
  },
);

// Subjects assigned to a student (via grades), optional semester filter
app.get("/students/:id/subjects", authRequired, requireRole("students"), (req, res) => {
  const id = String(req.params.id);
  if (req.user.role === "student" && id !== req.user.student_id) {
    return res.status(403).json({ error: "Forbidden" });
  }
  const semesterId = req.query.semester_id ? Number(req.query.semester_id) : null;
  const rows = semesterId
    ? all(`
        SELECT b.* FROM subjects b
        JOIN grades g ON g.subject_id=b.id AND g.deleted_at IS NULL
        WHERE g.student_id=? AND b.deleted_at IS NULL AND b.semester_id=?
      `, [id, semesterId])
    : all(`
        SELECT b.* FROM subjects b
        JOIN grades g ON g.subject_id=b.id AND g.deleted_at IS NULL
        WHERE g.student_id=? AND b.deleted_at IS NULL
      `, [id]);
  res.json(rows);
});
app.delete(
  "/subjects/:id",
  authRequired,
  requireRole("subjects", "delete"),
  (req, res) => {
    const id = req.params.id;
    const s = get("SELECT 1 FROM subjects WHERE id=? AND deleted_at IS NULL", [
      id,
    ]);
    if (!s) return res.status(404).json({ error: "Not found" });
    tx(() => {
      run("UPDATE subjects SET deleted_at=CURRENT_TIMESTAMP WHERE id=?", [id]);
      run(
        "UPDATE grades SET deleted_at=CURRENT_TIMESTAMP WHERE subject_id=? AND deleted_at IS NULL",
        [id],
      );
      logAction({
        userId: req.user.id,
        action: "DELETE",
        entity: "subject",
        entityId: id,
      });
      logAction({
        userId: req.user.id,
        action: "BULK_DELETE",
        entity: "grade",
        entityId: `subject:${id}`,
      });
    });
    res.json({ ok: true });
  },
);

app.get("/grades/:studentId", authRequired, requireRole("grades"), (req, res) => {
  const sid = req.params.studentId;
  if (req.user.role === "student" && sid !== req.user.student_id) {
    logAction({ userId: req.user.id, action: "ACCESS_DENIED", entity: "grade", entityId: sid, details: { path: "/grades/:studentId", ip: req.ip } });
    return res.status(403).json({ error: "Forbidden" });
  }
  const semesterId = req.query.semester_id ? Number(req.query.semester_id) : null;
  const rows = all(
    `SELECT g.* FROM grades g
     JOIN students s ON s.id = g.student_id AND s.deleted_at IS NULL
     JOIN subjects b ON b.id = g.subject_id AND b.deleted_at IS NULL
     WHERE g.student_id = ? AND g.deleted_at IS NULL` + (semesterId ? ` AND b.semester_id = ?` : ``),
    semesterId ? [sid, semesterId] : [sid],
  );
  logAction({ userId: req.user.id, action: "READ", entity: "grade", entityId: sid, details: { semester_id: semesterId || null, ip: req.ip } });
  res.json(rows);
});
app.get("/grades", authRequired, requireRole("grades"), (req, res) => {
  // Student privacy: students can only see their own grades
  if (req.user.role === "student") {
    const sid = req.user.student_id;
    if (!sid) return res.status(403).json({ error: "Forbidden" });
    const semesterId = req.query.semester_id ? Number(req.query.semester_id) : null;
    const bySelf = all(
      `SELECT g.* FROM grades g
       JOIN students s ON s.id = g.student_id AND s.deleted_at IS NULL
       JOIN subjects b ON b.id = g.subject_id AND b.deleted_at IS NULL
       WHERE g.deleted_at IS NULL AND g.student_id = ?` + (semesterId ? ` AND b.semester_id = ?` : ``),
      semesterId ? [sid, semesterId] : [sid],
    );
    logAction({ userId: req.user.id, action: "READ", entity: "grade", entityId: sid, details: { semester_id: semesterId || null, ip: req.ip } });
    return res.json(bySelf);
  }
  const rows = all(
    `SELECT g.* FROM grades g
     JOIN students s ON s.id = g.student_id AND s.deleted_at IS NULL
     JOIN subjects b ON b.id = g.subject_id AND b.deleted_at IS NULL
     WHERE g.deleted_at IS NULL`,
  );
  res.json(rows);
});
app.post(
  "/grades",
  authRequired,
  requireRole("grades", "write"),
  (req, res) => {
    const body = req.body || {};
    const norm = {
      student_id: String(body.student_id || "").trim(),
      subject_id: String(body.subject_id || "").trim(),
      prelim: body.prelim === undefined ? null : Number(body.prelim),
      midterm: body.midterm === undefined ? null : Number(body.midterm),
      prefinal: body.prefinal === undefined ? null : Number(body.prefinal),
      final: body.final === undefined ? null : Number(body.final),
    };
    const parsed = gradeSchema.safeParse(norm);
    if (!parsed.success)
      return res
        .status(400)
        .json({ error: "Invalid data", details: parsed.error.flatten() });
    try {
      // Ensure both student and subject are active (not soft-deleted)
      const activeStudent = get(
        "SELECT 1 FROM students WHERE id=? AND deleted_at IS NULL",
        [parsed.data.student_id],
      );
      if (!activeStudent)
        return res.status(404).json({ error: "Student not found or inactive" });
      const activeSubject = get(
        "SELECT 1 FROM subjects WHERE id=? AND deleted_at IS NULL",
        [parsed.data.subject_id],
      );
      if (!activeSubject)
        return res.status(404).json({ error: "Subject not found or inactive" });
      const key = [parsed.data.student_id, parsed.data.subject_id];
      const existing = get(
        "SELECT deleted_at FROM grades WHERE student_id=? AND subject_id=?",
        key,
      );
      if (existing && !existing.deleted_at) {
        return res.status(409).json({ error: "Grade exists" });
      }
      tx(() => {
        if (existing && existing.deleted_at) {
          run(
            "UPDATE grades SET prelim=?, midterm=?, prefinal=?, final=?, deleted_at=NULL WHERE student_id=? AND subject_id=?",
            [
              parsed.data.prelim ?? null,
              parsed.data.midterm ?? null,
              parsed.data.prefinal ?? null,
              parsed.data.final ?? null,
              ...key,
            ],
          );
          logAction({
            userId: req.user.id,
            action: "RESTORE",
            entity: "grade",
            entityId: `${parsed.data.student_id}:${parsed.data.subject_id}`,
            details: { via: "POST_UPSERT" },
          });
        } else {
          run(
            "INSERT INTO grades (student_id,subject_id,prelim,midterm,prefinal,final) VALUES (?,?,?,?,?,?)",
            [
              parsed.data.student_id,
              parsed.data.subject_id,
              parsed.data.prelim ?? null,
              parsed.data.midterm ?? null,
              parsed.data.prefinal ?? null,
              parsed.data.final ?? null,
            ],
          );
          logAction({
            userId: req.user.id,
            action: "CREATE",
            entity: "grade",
            entityId: `${parsed.data.student_id}:${parsed.data.subject_id}`,
          });
        }
      });
      res.status(existing ? 200 : 201).json({ ok: true, revived: !!existing });
    } catch (e) {
      const msg = String((e && e.message) || "");
      const isUnique =
        /UNIQUE constraint failed|UNIQUE constraint|ConstraintError/i.test(msg);
      if (isUnique) {
        const { student_id, subject_id } = parsed.data;
        const soft = get(
          "SELECT deleted_at FROM grades WHERE student_id=? AND subject_id=?",
          [student_id, subject_id],
        );
        if (soft && soft.deleted_at) {
          tx(() => {
            run(
              "UPDATE grades SET prelim=?, midterm=?, prefinal=?, final=?, deleted_at=NULL WHERE student_id=? AND subject_id=?",
              [
                parsed.data.prelim ?? null,
                parsed.data.midterm ?? null,
                parsed.data.prefinal ?? null,
                parsed.data.final ?? null,
                student_id,
                subject_id,
              ],
            );
            logAction({
              userId: req.user.id,
              action: "RESTORE",
              entity: "grade",
              entityId: `${student_id}:${subject_id}`,
              details: { via: "POST_UPSERT_FALLBACK" },
            });
          });
          return res.status(200).json({ ok: true, revived: true });
        }
        return res.status(409).json({ error: "Grade exists" });
      }
      res.status(500).json({ error: "Internal error" });
    }
  },
);
app.put(
  "/grades/:studentId/:subjectId",
  authRequired,
  requireRole("grades", "write"),
  (req, res) => {
    const parsed = gradeSchema
      .pick({ prelim: true, midterm: true, prefinal: true, final: true })
      .partial()
      .safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid data" });
    const { studentId, subjectId } = req.params;
    const g = get(
      "SELECT 1 FROM grades WHERE student_id=? AND subject_id=? AND deleted_at IS NULL",
      [studentId, subjectId],
    );
    if (!g) return res.status(404).json({ error: "Not found" });
    tx(() => {
      const fields = ["prelim", "midterm", "prefinal", "final"];
      const sets = fields
        .filter((f) => f in parsed.data)
        .map((f) => `${f}=?`)
        .join(", ");
      if (sets)
        run(`UPDATE grades SET ${sets} WHERE student_id=? AND subject_id=?`, [
          ...fields.filter((f) => f in parsed.data).map((f) => parsed.data[f]),
          studentId,
          subjectId,
        ]);
      logAction({
        userId: req.user.id,
        action: "UPDATE",
        entity: "grade",
        entityId: `${studentId}:${subjectId}`,
        details: parsed.data,
      });
    });
    res.json({ ok: true });
  },
);
app.delete(
  "/grades/:studentId/:subjectId",
  authRequired,
  requireRole("grades", "delete"),
  (req, res) => {
    const { studentId, subjectId } = req.params;
    const g = get(
      "SELECT 1 FROM grades WHERE student_id=? AND subject_id=? AND deleted_at IS NULL",
      [studentId, subjectId],
    );
    if (!g) return res.status(404).json({ error: "Not found" });
    tx(() => {
      run(
        "UPDATE grades SET deleted_at=CURRENT_TIMESTAMP WHERE student_id=? AND subject_id=?",
        [studentId, subjectId],
      );
      logAction({
        userId: req.user.id,
        action: "DELETE",
        entity: "grade",
        entityId: `${studentId}:${subjectId}`,
      });
    });
    res.json({ ok: true });
  },
);

app.post(
  "/admin/backup",
  authRequired,
  requireRole("settings", "write"),
  (req, res) => {
    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    const backupsDir = "server/data/backups";
    if (!fs.existsSync(backupsDir))
      fs.mkdirSync(backupsDir, { recursive: true });
    const dest = path.join(backupsDir, `app-${ts}.db`);
    fs.copyFileSync(dbFilePath, dest);
    logAction({
      userId: req.user.id,
      action: "BACKUP",
      entity: "system",
      entityId: ts,
      details: { file: dest },
    });
    res.json({ ok: true, file: dest });
  },
);

// Cleanup orphan grades (developer/owner)
app.post(
  "/admin/cleanup-orphan-grades",
  authRequired,
  requireRole("settings", "write"),
  (req, res) => {
    const orphans = all(`
    SELECT g.student_id, g.subject_id
    FROM grades g
    LEFT JOIN students s ON s.id = g.student_id AND s.deleted_at IS NULL
    LEFT JOIN subjects b ON b.id = g.subject_id AND b.deleted_at IS NULL
    WHERE g.deleted_at IS NULL AND (s.id IS NULL OR b.id IS NULL)
  `);
    if (orphans.length === 0) return res.json({ ok: true, updated: 0 });
    tx(() => {
      run(`
      UPDATE grades SET deleted_at=CURRENT_TIMESTAMP
      WHERE deleted_at IS NULL AND (
        NOT EXISTS (SELECT 1 FROM students s WHERE s.id=grades.student_id AND s.deleted_at IS NULL)
        OR NOT EXISTS (SELECT 1 FROM subjects b WHERE b.id=grades.subject_id AND b.deleted_at IS NULL)
      )
    `);
      logAction({
        userId: req.user.id,
        action: "CLEANUP",
        entity: "grade",
        entityId: "orphans",
        details: { count: orphans.length },
      });
    });
    res.json({ ok: true, updated: orphans.length });
  },
);

// Owner-only restore within 30-day window
app.post("/admin/restore", authRequired, requireRole("settings", "write"), (req, res) => {
  const shape = z.object({
    entity: z.enum(["user", "student", "subject", "grade"]),
    id: z.string().min(1),
  });
  const parsed = shape.safeParse(req.body || {});
  if (!parsed.success) return res.status(400).json({ error: "Invalid fields" });
  const { entity, id } = parsed.data;
  const within = (table, where, params) => {
    const row = get(`SELECT deleted_at FROM ${table} WHERE ${where}`, params);
    if (!row || !row.deleted_at) return { ok: false, error: "Not deleted" };
    const del = new Date(row.deleted_at);
    const diff = (Date.now() - del.getTime()) / (1000 * 60 * 60 * 24);
    if (diff > 30) return { ok: false, error: "Restore window expired" };
    return { ok: true };
  };
  tx(() => {
    if (entity === "user") {
      const chk = within("users", "id=?", [id]);
      if (!chk.ok) return res.status(400).json({ error: chk.error });
      run("UPDATE users SET deleted_at=NULL WHERE id=?", [id]);
      logAction({
        userId: req.user.id,
        action: "RESTORE",
        entity: "user",
        entityId: id,
      });
    } else if (entity === "student") {
      const chk = within("students", "id=?", [id]);
      if (!chk.ok) return res.status(400).json({ error: chk.error });
      run("UPDATE students SET deleted_at=NULL WHERE id=?", [id]);
      logAction({
        userId: req.user.id,
        action: "RESTORE",
        entity: "student",
        entityId: id,
      });
    } else if (entity === "subject") {
      const chk = within("subjects", "id=?", [id]);
      if (!chk.ok) return res.status(400).json({ error: chk.error });
      run("UPDATE subjects SET deleted_at=NULL WHERE id=?", [id]);
      logAction({
        userId: req.user.id,
        action: "RESTORE",
        entity: "subject",
        entityId: id,
      });
    } else if (entity === "grade") {
      const [sid, subid] = id.split(":");
      const chk = within("grades", "student_id=? AND subject_id=?", [
        sid,
        subid,
      ]);
      if (!chk.ok) return res.status(400).json({ error: chk.error });
      run(
        "UPDATE grades SET deleted_at=NULL WHERE student_id=? AND subject_id=?",
        [sid, subid],
      );
      logAction({
        userId: req.user.id,
        action: "RESTORE",
        entity: "grade",
        entityId: id,
      });
    }
  });
  res.json({ ok: true });
});

// Teacher-specific permit view endpoints
app.get("/teacher/rooms", authRequired, requireRole("students"), (req, res) => {
  const { role, username } = req.user;
  if (role !== "teacher" && role !== "developer" && role !== "owner") {
    return res.status(403).json({ error: "Forbidden" });
  }
  const rows = all("SELECT DISTINCT room FROM subjects WHERE professor=? AND deleted_at IS NULL", [username]);
  res.json(rows);
});

app.get("/teacher/rooms/:room/students", authRequired, requireRole("students"), (req, res) => {
    const { room } = req.params;
    const { username } = req.user;
    const students = all(`
        SELECT DISTINCT s.* 
        FROM students s
        JOIN grades g ON g.student_id = s.id
        JOIN subjects sub ON sub.id = g.subject_id
        WHERE sub.room = ? AND sub.professor = ? AND s.deleted_at IS NULL
    `, [room, username]);

    // For each student, check their latest permit status
    const result = students.map(s => {
        const permit = get(`
            SELECT status FROM student_permits 
            WHERE student_id = ? 
            ORDER BY created_at DESC LIMIT 1
        `, [s.id]);
        return { ...s, has_active_permit: permit?.status === "active" };
    });
    res.json(result);
});

// Student Permit filtering
app.get("/my-permits", authRequired, (req, res) => {
  if (req.user.role !== "student") return res.status(403).json({ error: "Forbidden" });
  const sid = req.user.student_id;
  const rows = all(`
    SELECT sp.*, pp.name as period_name, pp.sort_order, s.school_year, s.term
    FROM student_permits sp
    JOIN permit_periods pp ON pp.id = sp.permit_period_id
    JOIN semesters s ON s.id = pp.semester_id
    WHERE sp.student_id = ?
    ORDER BY s.school_year DESC, s.term DESC, pp.sort_order ASC
  `, [sid]);
  logAction({ userId: req.user.id, action: "READ", entity: "student_permit", entityId: String(sid) });
  res.json(rows);
});

const port = process.env.PORT || 4000;
app.listen(port, () => {
  process.stdout.write(`server listening on ${port}\n`);
});
