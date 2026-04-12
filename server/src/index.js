import { config } from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
const __filename = fileURLToPath(import.meta.url);
const __dirname_idx = dirname(__filename);
config({ path: resolve(__dirname_idx, "../../.env") });
config({ path: resolve(__dirname_idx, "../.env") });
import express from "express";
import helmet from "helmet";
import cors from "cors";
import morgan from "morgan";
import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import db, { tx, logAction, initDB, run, get, all, lastInsertId } from "./db.js";
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
await ensureInitialAdmin();

const app = express();
app.use(helmet());
const allowedOrigins = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(",") : ["http://localhost:3000", "http://localhost:5173", "http://localhost:4000"];
app.use(cors({ origin: allowedOrigins, credentials: false }));
app.use(express.json({ limit: "1mb" }));
morgan.token('time', () => new Date().toLocaleTimeString());
app.use(morgan('[:time] :method :url :status :response-time ms - :res[content-length]'));

app.get("/health", (_, res) => res.json({ ok: true }));
app.post("/auth/login", loginHandler);
app.get("/auth/session", authRequired, async (req, res) => {
  const { id } = req.user;
  try {
    const finalUser = await get("SELECT * FROM users WHERE id = ?", [id]);
    if (!finalUser || finalUser.deleted_at) {
      return res.status(401).json({ error: "Session invalid or disabled" });
    }
    const authRecords = await all('SELECT module, can_read, can_write, can_delete FROM "authorization" WHERE role=?', [finalUser.role]);
    const userPerms = await all("SELECT module, can_read, can_write, can_delete FROM user_permissions WHERE user_id=?", [finalUser.id]);
    
    const permissions = {};
    if (authRecords) {
      for (const p of authRecords) {
        permissions[p.module] = { can_read: !!p.can_read, can_write: !!p.can_write, can_delete: !!p.can_delete };
      }
    }
    if (userPerms) {
      for (const p of userPerms) {
        if (!permissions[p.module]) permissions[p.module] = { can_read: false, can_write: false, can_delete: false };
        if (p.can_read !== null) permissions[p.module].can_read = !!p.can_read;
        if (p.can_write !== null) permissions[p.module].can_write = !!p.can_write;
        if (p.can_delete !== null) permissions[p.module].can_delete = !!p.can_delete;
      }
    }
    res.json({ permissions, role: finalUser.role });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});
app.post(
  "/auth/register",
  authRequired,
  requireRole("users", "write"),
  registerHandler,
);
app.post("/auth/register-student", studentSelfRegister);
app.post("/auth/bootstrap-owner", bootstrapOwner);

console.log("[DEBUG] Registering /teacher/subjects routes...");

// Teacher-specific permit view endpoints
app.get("/teacher/subjects", authRequired, requireRole("students"), async (req, res) => {
  const { role, username, id } = req.user;
  if (role !== "teacher" && role !== "developer" && role !== "owner") {
    return res.status(403).json({ error: "Forbidden" });
  }
  
  // Get teacher's full name to match against subjects
  const teacher = await get("SELECT full_name FROM users WHERE id=?", [id]);
  const fullName = teacher?.full_name || username;

  // Return subjects where this teacher is the professor
  const rows = await all(
    "SELECT id, name FROM subjects WHERE (professor=? OR professor=?) AND deleted_at IS NULL", 
    [username, fullName]
  );
  res.json(rows);
});

app.get("/teacher/subjects/:id/students", authRequired, requireRole("students"), async (req, res) => {
    const { id: subjectId } = req.params;
    const { username, id: userId } = req.user;
    
    // Get teacher's full name
    const teacher = await get("SELECT full_name FROM users WHERE id=?", [userId]);
    const fullName = teacher?.full_name || username;

    const students = await all(`
        SELECT DISTINCT s.* 
        FROM students s
        JOIN grades g ON g.student_id = s.id
        JOIN subjects sub ON sub.id = g.subject_id
        WHERE sub.id = ? AND (sub.professor = ? OR sub.professor = ?) AND s.deleted_at IS NULL
    `, [subjectId, username, fullName]);

    // For each student, check if they have any active permit containing "Prelim" in its period name
    const result = await Promise.all(students.map(async s => {
        const permit = await get(`
            SELECT sp.status 
            FROM student_permits sp
            JOIN permit_periods pp ON sp.permit_period_id = pp.id
            WHERE sp.student_id = ? AND pp.name LIKE '%Prelim%' AND sp.status = 'active'
            ORDER BY sp.created_at DESC LIMIT 1
        `, [s.id]);
        return { ...s, has_active_permit: !!permit };
    }));
    res.json(result);
});

// Admin: get students enrolled in a subject (via grades), no teacher ownership check
app.get("/subjects/:subjectId/students", authRequired, requireRole("subjects"), async (req, res) => {
  const { subjectId } = req.params;
  try {
    const students = await all(`
      SELECT DISTINCT s.id, s.name, s.course, s.year, s.status
      FROM students s
      JOIN grades g ON g.student_id = s.id
      WHERE g.subject_id = ? AND s.deleted_at IS NULL
      ORDER BY s.name ASC
    `, [subjectId]);
    res.json(students);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post(
  "/auth/change-password",
  authRequired,
  async (req, res) => {
    const body = req.body || {};
    const pwd = typeof body.password === "string" ? body.password : "";
    if (!pwd || pwd.length < 6)
      return res.status(400).json({ error: "Invalid password" });
    const me = await get("SELECT id, deleted_at FROM users WHERE id=?", [req.user.id]);
    if (!me || me.deleted_at)
      return res.status(401).json({ error: "Unauthorized" });
    const hash = bcrypt.hashSync(pwd, 10);
    await tx(async () => {
      await run("UPDATE users SET password_hash=? WHERE id=?", [hash, req.user.id]);
      await logAction({
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

async function settingValue(key, fallback) {
  const row = await get("SELECT value FROM settings WHERE key=?", [key]);
  return row?.value ?? fallback;
}
async function intSetting(key, fallback) {
  const v = Number(await settingValue(key, fallback));
  return Number.isFinite(v) ? v : Number(fallback);
}
async function strSetting(key, fallback) {
  const v = await settingValue(key, fallback);
  return typeof v === "string" ? v : String(fallback);
}

// Debug: fetch a user by id (developer only)
app.get(
  "/debug/user/:id",
  authRequired,
  requireRole("debug"),
  async (req, res) => {
    const id = Number(req.params.id);
    const row = await get(
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
  async (req, res) => {
    const rows = await all(
      "SELECT rowid, id, username, role, user_type, deleted_at, created_at FROM users ORDER BY id",
    );
    res.json(rows);
  },
);
app.get(
  "/debug/grade/:studentId/:subjectId",
  authRequired,
  requireRole("debug"),
  async (req, res) => {
    const { studentId, subjectId } = req.params;
    const row = await get(
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
  async (req, res) => {
    const includeDeleted = String(req.query.include_deleted || "") === "1";
    const users = includeDeleted
      ? await all(
          "SELECT u.id, u.username, u.role, u.user_type, u.student_id, u.created_at, u.deleted_at, " +
          "CASE WHEN u.full_name IS NOT NULL AND u.full_name <> '' THEN u.full_name " +
          "     WHEN s.name IS NOT NULL AND s.name <> '' THEN s.name " +
          "     ELSE NULL END AS full_name " +
          "FROM users u LEFT JOIN students s ON u.student_id = s.id AND u.student_id <> '' " +
          "ORDER BY u.created_at DESC",
        )
      : await all(
          "SELECT u.id, u.username, u.role, u.user_type, u.student_id, u.created_at, " +
          "CASE WHEN u.full_name IS NOT NULL AND u.full_name <> '' THEN u.full_name " +
          "     WHEN s.name IS NOT NULL AND s.name <> '' THEN s.name " +
          "     ELSE NULL END AS full_name " +
          "FROM users u LEFT JOIN students s ON u.student_id = s.id AND u.student_id <> '' " +
          "WHERE u.deleted_at IS NULL ORDER BY u.created_at DESC",
        );
    res.json(users);
  },
);
app.post(
  "/users",
  authRequired,
  requireRole("users", "write"),
  async (req, res) => {
    console.log(`[USER_CREATE] Attempt by ${req.user.username}:`, req.body);
    const body = req.body || {};
    const norm = {
      username: typeof body.username === "string" ? body.username.trim() : body.username,
      password: body.password,
      role: typeof body.role === "string" ? body.role.trim() : body.role,
      user_type: typeof body.user_type === "string" ? body.user_type.trim() : body.user_type,
      student_id: typeof body.student_id === "string" ? body.student_id.trim() : body.student_id,
      full_name: typeof body.full_name === "string" ? body.full_name.trim() : body.full_name,
    };
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
        "viewer",
      ]),
      user_type: z
        .enum([
          "teacher",
          "student",
          "developer",
          "saps",
          "register",
          "cashier",
          "viewer",
        ])
        .optional(),
      student_id: z.string().min(1).optional(),
      full_name: z.string().nullable().optional(),
    });
    const parsed = shape.safeParse(norm);
    if (!parsed.success)
      return res.status(400).json({ error: "Invalid fields", details: parsed.error.flatten() });
    const { username, password, role, user_type, student_id } = parsed.data;
    const exists = await get("SELECT 1 FROM users WHERE LOWER(username) = LOWER(?) AND deleted_at IS NULL", [username]);
    if (exists && role !== "student") return res.status(409).json({ error: "Username already taken (case-insensitive)" });
    const hash = bcrypt.hashSync(password, 10);
    try {
      await tx(async () => {
        await run(
          "INSERT INTO users (username, password_hash, role, user_type, student_id, full_name) VALUES (?, ?, ?, ?, ?, ?)",
          [
            username,
            hash,
            role,
            user_type || role,
            role === "student" ? student_id || null : null,
            parsed.data.full_name || null,
          ],
        );
        // Fetch the specific user we just created. For students, use student_id for uniqueness.
        const row = role === "student" 
          ? await get("SELECT id, username, role, user_type, created_at FROM users WHERE student_id=? AND deleted_at IS NULL", [student_id])
          : await get("SELECT id, username, role, user_type, created_at FROM users WHERE username=? AND deleted_at IS NULL ORDER BY id DESC LIMIT 1", [username]);
        
        if (row) {
          writeProfile(row);
          await logAction({
            userId: req.user.id,
            action: "CREATE",
            entity: "user",
            entityId: String(row.id),
            details: { username, role, user_type: user_type || role },
          });
        }
      });
      console.log(`[USER_CREATE] Successfully created user: ${username}`);
      res.status(201).json({ ok: true });
    } catch (err) {
      console.error("[USER_CREATE] Error:", err.message);
      res.status(500).json({ error: "Creation failed: " + err.message });
    }
  },
);
app.put(
  "/users/:id",
  authRequired,
  requireRole(["developer", "owner"]),
  async (req, res) => {
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
    if ("student_id" in body) norm.student_id = (body.student_id === null || typeof body.student_id !== "string") ? null : body.student_id.trim();
    if ("full_name" in body) norm.full_name = (body.full_name === null || typeof body.full_name !== "string") ? null : body.full_name.trim();
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
          ["teacher", "student", "developer", "saps", "register", "cashier", "viewer"],
          {
            errorMap: () => ({
              message:
                "role must be a valid system role (teacher, student, developer, saps, register, cashier, or viewer)",
            }),
          },
        )
        .optional(),
      user_type: z
        .enum(
          ["teacher", "student", "developer", "saps", "register", "cashier", "viewer"],
          { errorMap: () => ({ message: "user_type must be a valid role" }) },
        )
        .optional(),
      student_id: z.string().nullable().optional(),
      full_name: z.string().nullable().optional(),
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
        await get("SELECT * FROM users WHERE id=? AND deleted_at IS NULL", [id]) ||
        await get(
          "SELECT * FROM users WHERE id=CAST(? AS INTEGER) AND deleted_at IS NULL",
          [String(id)],
        );
    }
    if (!prev && username) {
      prev = await get(
        "SELECT * FROM users WHERE username=? AND deleted_at IS NULL",
        [username],
      );
    }
    if (!prev) return res.status(404).json({ error: "Not found" });
    if (parsed.data.username) {
      const dup = await get("SELECT 1 FROM users WHERE LOWER(username)=LOWER(?) AND id<>? AND deleted_at IS NULL", [
        parsed.data.username,
        prev.id,
      ]);
      if (dup) return res.status(409).json({ error: "Username already taken (case-insensitive)" });
    }
    await tx(async () => {
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
      if ("student_id" in parsed.data) {
        updates.push("student_id=?");
        params.push(parsed.data.student_id);
      }
      if ("full_name" in parsed.data) {
        updates.push("full_name=?");
        params.push(parsed.data.full_name);
      }
      if (parsed.data.password) {
        updates.push("password_hash=?");
        params.push(bcrypt.hashSync(parsed.data.password, 10));
      }
      if (updates.length) {
        await run(`UPDATE users SET ${updates.join(", ")} WHERE id=?`, [
          ...params,
          prev.id,
        ]);
      }
      const next = await get("SELECT * FROM users WHERE id=?", [prev.id]);
      moveIfNeeded(prev, next);
      const details = parsed.data;
      await logAction({
        userId: req.user.id,
        action: "UPDATE",
        entity: "user",
        entityId: String(prev.id),
        details,
      });
      if (prev.role !== next.role) {
        await logAction({
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
  async (req, res) => {
    const idRaw = req.params.id;
    const hard = String(req.query.hard || "") === "1";
    const username =
      req.query.username || (req.body && req.body.username) || null;
    let prev = null;
    if (/^\d+$/.test(String(idRaw))) {
      const idNum = Number(idRaw);
      prev =
        await get("SELECT * FROM users WHERE id=?", [idNum]) ||
        await get("SELECT * FROM users WHERE id=CAST(? AS INTEGER)", [String(idNum)]);
    }
    if (!prev && username) {
      prev = await get("SELECT * FROM users WHERE username=?", [username]);
    }
    if (!prev) return res.status(404).json({ error: "Not found" });
    if (
      prev.role === "owner" &&
      !(req.user.role === "owner" || req.user.role === "developer")
    )
      return res.status(403).json({ error: "Cannot delete owner" });
    await tx(async () => {
      if (hard) {
        await run("DELETE FROM users WHERE id=?", [prev.id]);
        await logAction({
          userId: req.user.id,
          action: "HARD_DELETE",
          entity: "user",
          entityId: String(prev.id),
        });
      } else {
        await run("UPDATE users SET deleted_at=CURRENT_TIMESTAMP WHERE id=?", [
          prev.id,
        ]);
        // Also soft-delete the linked student if this user is a student
        if (prev.student_id) {
          await run("UPDATE students SET deleted_at=CURRENT_TIMESTAMP WHERE id=?", [prev.student_id]);
          await logAction({
            userId: req.user.id,
            action: "DELETE",
            entity: "student",
            entityId: prev.student_id,
            details: { reason: "Linked user deleted" }
          });
        }
        await logAction({
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

app.get("/users/:id/permissions", authRequired, requireRole("users"), async (req, res) => {
  const id = Number(req.params.id);
  const rows = await all("SELECT * FROM user_permissions WHERE user_id=?", [id]);
  res.json(rows);
});

app.post("/users/:id/permissions", authRequired, requireRole("users", "write"), async (req, res) => {
  const userId = Number(req.params.id);
  const { module, can_read, can_write, can_delete } = req.body;
  if (!module) return res.status(400).json({ error: "Module required" });
  
  await tx(async () => {
    await run(`
      INSERT INTO user_permissions (user_id, module, can_read, can_write, can_delete)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT (user_id, module) DO UPDATE SET
      can_read = EXCLUDED.can_read, can_write = EXCLUDED.can_write, can_delete = EXCLUDED.can_delete
    `, [userId, module, can_read ? 1 : 0, can_write ? 1 : 0, can_delete ? 1 : 0]);
    
    await logAction({
      userId: req.user.id,
      action: "SET_PERMISSION",
      entity: "user_permission",
      entityId: `${userId}:${module}`,
      details: { module, can_read, can_write, can_delete }
    });
  });
  res.json({ ok: true });
});

app.delete("/users/:id/permissions/:module", authRequired, requireRole("users", "write"), async (req, res) => {
  const userId = Number(req.params.id);
  const module = req.params.module;
  
  await tx(async () => {
    await run("DELETE FROM user_permissions WHERE user_id=? AND module=?", [userId, module]);
    await logAction({
      userId: req.user.id,
      action: "DELETE_PERMISSION",
      entity: "user_permission",
      entityId: `${userId}:${module}`
    });
  });
  res.json({ ok: true });
});

// ─── Role-level permissions (authorization table) ─────────────────────────────
app.get("/authorization", authRequired, requireRole("users"), async (req, res) => {
  try {
    const rows = await all(`SELECT role, module, can_read, can_write, can_delete FROM "authorization" ORDER BY role, module`, []);
    // Group by role
    const grouped = {};
    for (const r of rows) {
      if (!grouped[r.role]) grouped[r.role] = { role: r.role, permissions: {} };
      grouped[r.role].permissions[r.module] = {
        can_read: r.can_read,
        can_write: r.can_write,
        can_delete: r.can_delete
      };
    }
    res.json(Object.values(grouped));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put("/authorization/:role/:module", authRequired, requireRole("users", "write"), async (req, res) => {
  const { role, module } = req.params;
  const { can_read, can_write, can_delete } = req.body;
  try {
    // Upsert with COALESCE to avoid overwriting unspecified fields with NULL
    await run(
      `INSERT INTO "authorization" (role, module, can_read, can_write, can_delete)
       VALUES ($1, $2, COALESCE($3, 0), COALESCE($4, 0), COALESCE($5, 0))
       ON CONFLICT (role, module) DO UPDATE SET
         can_read = COALESCE($3, "authorization".can_read),
         can_write = COALESCE($4, "authorization".can_write),
         can_delete = COALESCE($5, "authorization".can_delete)`,
      [
        role,
        module,
        can_read !== undefined ? (can_read ? 1 : 0) : null,
        can_write !== undefined ? (can_write ? 1 : 0) : null,
        can_delete !== undefined ? (can_delete ? 1 : 0) : null
      ]
    );
    await logAction({ userId: req.user.id, action: "UPDATE_ROLE_PERMISSION", entity: "authorization", entityId: `${role}:${module}` });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/authorization/reset", authRequired, requireRole("users", "write"), async (req, res) => {
  try {
    const { seedRBAC } = await import("./seedRBAC.js");
    await seedRBAC();
    await logAction({ userId: req.user.id, action: "RESET_PERMISSIONS", entity: "authorization", entityId: "all" });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.patch(
  "/users/:id/disable",
  authRequired,
  requireRole("users", "write"),

  async (req, res) => {
    const idRaw = req.params.id;
    const username =
      req.query.username || (req.body && req.body.username) || null;
    let prev = null;
    if (/^\d+$/.test(String(idRaw))) {
      const id = Number(idRaw);
      prev =
        await get("SELECT * FROM users WHERE id=?", [id]) ||
        await get("SELECT * FROM users WHERE id=CAST(? AS INTEGER)", [String(id)]);
    }
    if (!prev && username) {
      prev = await get("SELECT * FROM users WHERE username=?", [username]);
    }
    if (!prev) return res.status(404).json({ error: "Not found" });
    if (
      prev.role === "owner" &&
      !(req.user.role === "owner" || req.user.role === "developer")
    )
      return res.status(403).json({ error: "Cannot disable owner" });
    if (prev.deleted_at)
      return res.status(200).json({ ok: true, alreadyDisabled: true });
    await tx(async () => {
      await run("UPDATE users SET deleted_at=CURRENT_TIMESTAMP WHERE id=?", [
        prev.id,
      ]);
      markFilesDeleted(prev.id);
      await logAction({
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
  campus: z.string().optional().default(""),
  time: z.string().optional().default(""),
  semester_id: z.number().int().optional().nullable(),
});
const gradeSchema = z.object({
  student_id: z.string().min(1),
  subject_id: z.string().min(1),
  prelim1: z.number().int().min(0).max(100).nullable().optional(),
  prelim2: z.number().int().min(0).max(100).nullable().optional(),
  midterm: z.number().int().min(0).max(100).nullable().optional(),
  semi_final: z.number().int().min(0).max(100).nullable().optional(),
  final: z.number().int().min(0).max(100).nullable().optional(),
});

app.get("/students", authRequired, requireRole("students"), async (req, res) => {
  const { role } = req.user;
  
  const query = `
    SELECT s.*, 
      ROUND((
        COALESCE(l.tuition_fee::numeric,0) + COALESCE(l.misc_fee::numeric,0) + COALESCE(l.internship_fee::numeric,0) + 
        COALESCE(l.computer_lab_fee::numeric,0) + COALESCE(l.chem_lab_fee::numeric,0) + COALESCE(l.aircon_fee::numeric,0) + 
        COALESCE(l.shop_fee::numeric,0) + COALESCE(l.other_fees::numeric,0) + COALESCE(l.id_fee::numeric,0) + COALESCE(l.subscription_fee::numeric,0) - 
        COALESCE(l.discount::numeric,0) + COALESCE(l.bank_account::numeric,0)
      ) - COALESCE(p.total_paid, 0), 2) as computed_balance
    FROM students s
    LEFT JOIN student_ledgers l ON l.student_id = s.id
    LEFT JOIN (SELECT student_id, SUM(amount) as total_paid FROM payments WHERE payment_type = 'Tuition' OR payment_type IS NULL GROUP BY student_id) p ON p.student_id = s.id
    WHERE s.deleted_at IS NULL
  `;

  if (role === "student") {
    const row = await get(query + " AND s.id=$1", [req.user.student_id]);
    if (row) { row.tuition_balance = row.computed_balance !== null ? row.computed_balance : row.tuition_balance; }
    return res.json(row ? [row] : []);
  }

  const rows = await all(query);
  rows.forEach(r => { r.tuition_balance = r.computed_balance !== null ? r.computed_balance : r.tuition_balance; });
  res.json(rows);
});

app.get("/dashboard-stats", authRequired, async (req, res) => {
  const { role, student_id } = req.user;
  const stats = {};

  // Total students (Available to all roles)
  const totalStudents = await get("SELECT COUNT(*) as c FROM students WHERE deleted_at IS NULL");
  stats.totalStudents = parseInt(totalStudents?.c || 0);

  // Department / Course counts for the new bar graph
  const deptCounts = await all(`
    SELECT course as department, COUNT(*) as total 
    FROM students 
    WHERE deleted_at IS NULL 
    GROUP BY course
  `);
  stats.departmentCounts = deptCounts.map(d => ({ ...d, total: parseInt(d.total) }));

  if (role === "student") {
    // Student Dashboard: own grades count, own subjects
    const ownGrades = await get(`
      SELECT COUNT(*) as c FROM grades g
      JOIN students s ON s.id = g.student_id AND s.deleted_at IS NULL
      WHERE g.student_id=? AND g.deleted_at IS NULL`, [student_id]);
    stats.gradeRecords = parseInt(ownGrades?.c || 0);
    
    // Own subjects count
    const ownSubjects = await get(`
      SELECT COUNT(*) as c FROM grades g 
      JOIN students s ON s.id = g.student_id AND s.deleted_at IS NULL
      WHERE g.student_id=? AND g.deleted_at IS NULL`, [student_id]);
    stats.activeSubjects = parseInt(ownSubjects?.c || 0);
    
    return res.json(stats);
  }

  // Staff Dashboard
  const activeSubs = await get("SELECT COUNT(*) as c FROM subjects WHERE deleted_at IS NULL");
  stats.activeSubjects = parseInt(activeSubs?.c || 0);
  
  const gradeRecordsCount = await get(`
    SELECT COUNT(*) as c FROM grades g
    JOIN students s ON s.id = g.student_id AND s.deleted_at IS NULL
    WHERE g.deleted_at IS NULL
  `);
  stats.gradeRecords = parseInt(gradeRecordsCount?.c || 0);

  // At-risk students
  // Calculation: 
  // 1. Only join with active students.
  // 2. Only consider grade entries that have at least one numeric grade (prelim1, prelim2, etc. IS NOT NULL).
  // 3. For each subject, average only the present grades.
  // 4. Then average those subject averages per student.
  const atRisk = await all(`
    WITH subject_avgs AS (
      SELECT 
        student_id,
        ( (COALESCE(prelim1,0) + COALESCE(prelim2,0) + COALESCE(midterm,0) + COALESCE(semi_final,0) + COALESCE(final,0))::FLOAT / 
          NULLIF((CASE WHEN prelim1 IS NULL THEN 0 ELSE 1 END) + 
                 (CASE WHEN prelim2 IS NULL THEN 0 ELSE 1 END) + 
                 (CASE WHEN midterm IS NULL THEN 0 ELSE 1 END) + 
                 (CASE WHEN semi_final IS NULL THEN 0 ELSE 1 END) + 
                 (CASE WHEN final IS NULL THEN 0 ELSE 1 END), 0)
        ) as subj_avg
      FROM grades
      WHERE deleted_at IS NULL
        AND (prelim1 IS NOT NULL OR prelim2 IS NOT NULL OR midterm IS NOT NULL OR semi_final IS NOT NULL OR final IS NOT NULL)
    )
    SELECT student_id, AVG(subj_avg) as final_avg
    FROM subject_avgs sa
    JOIN students s ON s.id = sa.student_id AND s.deleted_at IS NULL
    GROUP BY student_id
    HAVING AVG(subj_avg) < 75
  `);
  stats.atRiskCount = atRisk.length;

  res.json(stats);
});

// GET dashboard extra content
app.get("/dashboard/content", authRequired, async (req, res) => {
  const exam = (await get("SELECT value FROM settings WHERE key='next_examination'"))?.value || "No exam scheduled.";
  const staff = (await get("SELECT value FROM settings WHERE key='ybvc_staff'"))?.value || "[]";
  res.json({ next_examination: exam, ybvc_staff: JSON.parse(staff) });
});

// UPDATE dashboard extra content
app.post("/dashboard/content", authRequired, async (req, res) => {
  const { role, username } = req.user;
  const { type, value } = req.body;
  
  console.log(`[DASHBOARD_CONTENT] Update attempt by ${username} (${role}): type=${type}`);

  // Permission check
  const allowedRoles = ["developer", "saps"];
  if (!allowedRoles.includes(role)) {
    console.warn(`[DASHBOARD_CONTENT] Access denied for role: ${role}`);
    return res.status(403).json({ error: "Access denied: Unauthorized to edit dashboard content" });
  }

  try {
    if (type === "ybvc_staff") {
      await run("INSERT INTO settings (key, value) VALUES ('ybvc_staff', ?) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value", [JSON.stringify(value)]);
    } else if (type === "next_examination") {
      await run("INSERT INTO settings (key, value) VALUES ('next_examination', ?) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value", [String(value)]);
    } else if (type === "school_leadership") {
      // value should be { founder, evp, quote }
      await run("INSERT INTO settings (key, value) VALUES ('school_leadership', ?) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value", [JSON.stringify(value)]);
    } else {
      console.error(`[DASHBOARD_CONTENT] Invalid type: ${type}`);
      return res.status(400).json({ error: "Invalid content type" });
    }
    console.log(`[DASHBOARD_CONTENT] Update successful: ${type}`);
    res.json({ ok: true });
  } catch (err) {
    console.error("[DASHBOARD_CONTENT] DB Error:", err);
    res.status(500).json({ error: "Database error: " + err.message });
  }
});
// GET Audit Logs (developer/owner only)
app.get("/audit-logs", authRequired, async (req, res) => {
  const { role } = req.user;
  if (role !== "developer" && role !== "owner") {
    return res.status(403).json({ error: "Access denied" });
  }
  const rows = await all(`
    SELECT a.*, u.username, u.role as user_role 
    FROM audit_log a 
    LEFT JOIN users u ON a.user_id = u.id 
    ORDER BY a.created_at DESC 
    LIMIT 200
  `);
  res.json(rows);
});

app.post(
  "/students",
  authRequired,
  requireRole("students", "write"),
  async (req, res) => {
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
      await run(
        "INSERT INTO student_id_sequence (year,last) VALUES (?,?) ON CONFLICT (year) DO NOTHING",
        ["global", 0],
      );
      let assignedId = null;
      for (let attempts = 0; attempts < 1000; attempts++) {
        await run("UPDATE student_id_sequence SET last = last + 1 WHERE year = ?", [
          "global",
        ]);
        const row = await get("SELECT last FROM student_id_sequence WHERE year=?", [
          "global",
        ]);
        const next = Number(row?.last || 0);
        const candidate = `${birthYear}-${String(next).padStart(4, "0")}`; // user asked for (birth)-(padded_sequence)
        const exists = await get(
          "SELECT 1 FROM students WHERE id=?",
          [candidate],
        );
        if (exists) {
          continue;
        }
        await run(
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
        await logAction({
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
        })().toLowerCase();

        const username = baseLast;

        const password = assignedId; // Student ID as password
        const hash = bcrypt.hashSync(password, 10);
        
        // Find if an account for this specific student already exists (e.g. was deleted)
        const existingUser = await get("SELECT * FROM users WHERE student_id=?", [assignedId]);
        
        if (existingUser) {
          await run("UPDATE users SET username=?, password_hash=?, role='student', user_type='student', deleted_at=NULL WHERE id=?", [username, hash, existingUser.id]);
          await logAction({
            userId: existingUser.id,
            action: "RESTORE",
            entity: "user",
            entityId: String(existingUser.id),
            details: { username, linked_student_id: assignedId, via: "AUTO_RELINK" },
          });
        } else {
          await run(
            "INSERT INTO users (username, password_hash, role, user_type, student_id) VALUES (?,?,?,?,?)",
            [username, hash, "student", "student", assignedId],
          );
          const uidRow = await get("SELECT id FROM users WHERE student_id=?", [assignedId]);
          await logAction({
            userId: uidRow?.id || req.user.id,
            action: "USER_CREATE",
            entity: "user",
            entityId: String(uidRow?.id || 0),
            details: { username, linked_student_id: assignedId, msg: "Lastname as username, StudentID as password" },
          });
        }
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
  async (req, res) => {
    const parsed = studentSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid data" });
    const id = req.params.id;
    const s = await get(
      "SELECT * FROM students WHERE id = ? AND deleted_at IS NULL",
      [id],
    );
    if (!s) return res.status(404).json({ error: "Not found" });
    await tx(async () => {
      const fields = ["name", "course", "year", "email", "status"];
      const sets = fields
        .filter((f) => f in parsed.data)
        .map((f) => `${f}=?`)
        .join(", ");
      if (sets)
        await run(`UPDATE students SET ${sets} WHERE id=?`, [
          ...fields.filter((f) => f in parsed.data).map((f) => parsed.data[f]),
          id,
        ]);
      await logAction({
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
  async (req, res) => {
    const id = req.params.id;
    const s = await get("SELECT 1 FROM students WHERE id=? AND deleted_at IS NULL", [
      id,
    ]);
    if (!s) return res.status(404).json({ error: "Not found" });
    await tx(async () => {
      await run("UPDATE students SET deleted_at=CURRENT_TIMESTAMP WHERE id=?", [id]);
      await run(
        "UPDATE grades SET deleted_at=CURRENT_TIMESTAMP WHERE student_id=? AND deleted_at IS NULL",
        [id],
      );
      // Also soft-delete the corresponding user
      await run("UPDATE users SET deleted_at=CURRENT_TIMESTAMP WHERE student_id=?", [id]);
      
      await logAction({
        userId: req.user.id,
        action: "DELETE",
        entity: "student",
        entityId: id,
      });
      await logAction({
        userId: req.user.id,
        action: "BULK_DELETE",
        entity: "grade",
        entityId: `student:${id}`,
      });
      await logAction({
        userId: req.user.id,
        action: "DELETE",
        entity: "user",
        entityId: `student_id:${id}`,
        details: { reason: "Linked student deleted" }
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
  async (req, res) => {
    const rows = await all(
      "SELECT * FROM semesters ORDER BY school_year DESC, term ASC",
    );
    res.json(rows);
  },
);
app.get(
  "/semesters/:id/permits",
  authRequired,
  requireRole("permits", "read"),
  async (req, res) => {
    const id = Number(req.params.id);
    const sem = await get("SELECT 1 FROM semesters WHERE id=?", [id]);
    if (!sem) return res.status(404).json({ error: "Semester not found" });
    const rows = await all(
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
  async (req, res) => {
    const shape = z.object({
      school_year: z.string().min(4),
      term: z.string().min(1),
    });
    const parsed = shape.safeParse(req.body || {});
    if (!parsed.success)
      return res.status(400).json({ error: "Invalid fields" });
    try {
      await tx(async () => {
        await run("INSERT INTO semesters (school_year, term) VALUES (?,?)", [
          parsed.data.school_year,
          parsed.data.term,
        ]);
        const id = lastInsertId();
        await logAction({
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
      res.status(500).json({ error: "Internal error", details: msg });
    }
  },
);
app.put(
  "/semesters/:id",
  authRequired,
  requireRole("permits", "write"),
  async (req, res) => {
    const id = Number(req.params.id);
    const shape = z.object({
      school_year: z.string().min(4).optional(),
      term: z.string().min(1).optional(),
    });
    const parsed = shape.safeParse(req.body || {});
    if (!parsed.success)
      return res.status(400).json({ error: "Invalid fields" });
    const prev = await get("SELECT 1 FROM semesters WHERE id=?", [id]);
    if (!prev) return res.status(404).json({ error: "Not found" });
    try {
      await tx(async () => {
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
          await run(`UPDATE semesters SET ${fields.join(",")} WHERE id=?`, [
            ...params,
            id,
          ]);
        await logAction({
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
      res.status(500).json({ error: "Internal error", details: msg });
    }
  },
);
app.delete(
  "/semesters/:id",
  authRequired,
  requireRole("permits", "delete"),
  async (req, res) => {
    const id = Number(req.params.id);
    const prev = await get("SELECT 1 FROM semesters WHERE id=?", [id]);
    if (!prev) return res.status(404).json({ error: "Not found" });
    await tx(async () => {
      await run("DELETE FROM semesters WHERE id=?", [id]);
      await logAction({
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
  async (req, res) => {
    const id = Number(req.params.id);
    const rows = await all(
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
  async (req, res) => {
    const id = Number(req.params.id);
    const shape = z.object({
      name: z.string().min(2),
      sort_order: z.number().int().min(0),
    });
    const parsed = shape.safeParse(req.body || {});
    if (!parsed.success)
      return res.status(400).json({ error: "Invalid fields" });
    const sem = await get("SELECT 1 FROM semesters WHERE id=?", [id]);
    if (!sem) return res.status(404).json({ error: "Semester not found" });
    try {
      await tx(async () => {
        await run(
          "INSERT INTO permit_periods (semester_id, name, sort_order) VALUES (?,?,?)",
          [id, parsed.data.name, parsed.data.sort_order],
        );
        const pid = lastInsertId();
        await logAction({
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
      res.status(500).json({ error: "Internal error", details: msg });
    }
  },
);
app.put(
  "/periods/:id",
  authRequired,
  requireRole("permits", "write"),
  async (req, res) => {
    const id = Number(req.params.id);
    const shape = z.object({
      name: z.string().min(2).optional(),
      sort_order: z.number().int().min(0).optional(),
    });
    const parsed = shape.safeParse(req.body || {});
    if (!parsed.success)
      return res.status(400).json({ error: "Invalid fields" });
    const prev = await get("SELECT 1 FROM permit_periods WHERE id=?", [id]);
    if (!prev) return res.status(404).json({ error: "Not found" });
    try {
      await tx(async () => {
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
          await run(`UPDATE permit_periods SET ${fields.join(",")} WHERE id=?`, [
            ...params,
            id,
          ]);
        await logAction({
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
      res.status(500).json({ error: "Internal error", details: msg });
    }
  },
);
app.delete(
  "/periods/:id",
  authRequired,
  requireRole("permits", "delete"),
  async (req, res) => {
    const id = Number(req.params.id);
    const prev = await get("SELECT 1 FROM permit_periods WHERE id=?", [id]);
    if (!prev) return res.status(404).json({ error: "Not found" });
    await tx(async () => {
      await run("DELETE FROM permit_periods WHERE id=?", [id]);
      await logAction({
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
  async (req, res) => {
    const id = Number(req.params.id);
    const sem = await get("SELECT 1 FROM semesters WHERE id=?", [id]);
    if (!sem) return res.status(404).json({ error: "Semester not found" });
    const defaults = [
      { name: "First Prelim Permit", sort_order: 1 },
      { name: "Second Prelim Permit", sort_order: 2 },
      { name: "Midterm Permit", sort_order: 3 },
      { name: "Semi-final Permit", sort_order: 4 },
      { name: "Final Permit", sort_order: 5 },
    ];
    await tx(async () => {
      for (const d of defaults) {
        const exists = await get(
          "SELECT 1 FROM permit_periods WHERE semester_id=? AND name=?",
          [id, d.name],
        );
        if (!exists)
          await run(
            "INSERT INTO permit_periods (semester_id, name, sort_order) VALUES (?,?,?)",
            [id, d.name, d.sort_order],
          );
      }
      await logAction({
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
  async (req, res) => {
    const id = String(req.params.id);
    const semesterId = req.query.semester_id
      ? Number(req.query.semester_id)
      : null;
    const exists = await get(
      "SELECT 1 FROM students WHERE id=? AND deleted_at IS NULL",
      [id],
    );
    if (!exists) return res.status(404).json({ error: "Student not found" });
    const rows = semesterId
      ? await all(
          `SELECT sp.*, pp.name, pp.semester_id FROM student_permits sp JOIN permit_periods pp ON pp.id=sp.permit_period_id WHERE sp.student_id=? AND pp.semester_id=? ORDER BY pp.sort_order`,
          [id, semesterId],
        )
      : await all(
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
  async (req, res) => {
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
    const student = await get(
      "SELECT 1 FROM students WHERE id=? AND deleted_at IS NULL",
      [id],
    );
    if (!student) return res.status(404).json({ error: "Student not found" });
    const period = await get("SELECT 1 FROM permit_periods WHERE id=?", [
      parsed.data.permit_period_id,
    ]);
    if (!period) return res.status(404).json({ error: "Period not found" });
    try {
      await tx(async () => {
        const existing = await get(
          "SELECT id, permit_number FROM student_permits WHERE student_id=? AND permit_period_id=?",
          [id, parsed.data.permit_period_id],
        );
        if (existing) {
          const nextNumber =
            (parsed.data.permit_number && parsed.data.permit_number.trim()) ||
            String(existing.permit_number);
          await run(
            "UPDATE student_permits SET permit_number=?, issue_date=COALESCE(?, issue_date), expiry_date=COALESCE(?, expiry_date), status=COALESCE(?, status), updated_at=CURRENT_TIMESTAMP WHERE id=?",
            [
              nextNumber,
              parsed.data.issue_date || null,
              parsed.data.expiry_date || null,
              parsed.data.status || null,
              existing.id,
            ],
          );
          // Sync to student base table for management view summary
          await run("UPDATE students SET permit_number=? WHERE id=?", [nextNumber, id]);
          await logAction({
            userId: req.user.id,
            action: "UPDATE",
            entity: "student_permit",
            entityId: String(existing.id),
            details: parsed.data,
          });
        } else {
          const seq = await get(
            "SELECT last FROM permit_number_sequence WHERE id=1",
          );
          const next = Number(seq?.last || 0) + 1;
          await run("UPDATE permit_number_sequence SET last=?", [next]);
          const assignedNumber = String(next);
          const pRes = await run(
            "INSERT INTO student_permits (student_id, permit_period_id, permit_number, issue_date, expiry_date, status) VALUES (?,?,?,?,?,?) RETURNING id",
            [
              id,
              parsed.data.permit_period_id,
              assignedNumber,
              parsed.data.issue_date || null,
              parsed.data.expiry_date || null,
              parsed.data.status || "active",
            ],
          );
          const spid = pRes.rows[0].id;
          // Sync to student base table for management view summary
          await run("UPDATE students SET permit_number=? WHERE id=?", [assignedNumber, id]);
          await logAction({
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
      res.status(500).json({ error: "Internal error", details: msg });
    }
  },
);
app.put(
  "/students/:id/permits/:periodId",
  authRequired,
  requireRole("permits", "write"),
  async (req, res) => {
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
    const sp = await get(
      "SELECT id FROM student_permits WHERE student_id=? AND permit_period_id=?",
      [id, periodId],
    );
    if (!sp) return res.status(404).json({ error: "Not found" });
    await tx(async () => {
      let nextNumber = parsed.data.permit_number || null;
      if (!nextNumber) {
        const seq = await get("SELECT last FROM permit_number_sequence WHERE id=1");
        const next = Number(seq?.last || 0) + 1;
        await run("UPDATE permit_number_sequence SET last=?", [next]);
        nextNumber = String(next);
      }
      await run(
        "UPDATE student_permits SET permit_number=?, issue_date=COALESCE(?, issue_date), expiry_date=COALESCE(?, expiry_date), status=COALESCE(?, status), updated_at=CURRENT_TIMESTAMP WHERE id=?",
        [
          nextNumber,
          parsed.data.issue_date || null,
          parsed.data.expiry_date || null,
          parsed.data.status || null,
          sp.id,
        ],
      );
      await logAction({
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
  async (req, res) => {
    const id = String(req.params.id);
    const periodId = Number(req.params.periodId);
    const sp = await get(
      "SELECT id FROM student_permits WHERE student_id=? AND permit_period_id=?",
      [id, periodId],
    );
    if (!sp) return res.status(404).json({ error: "Not found" });
    await tx(async () => {
      await run("DELETE FROM student_permits WHERE id=?", [sp.id]);
      await logAction({
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
  async (req, res) => {
    const id = req.params.id;
    const row = await get(`
      SELECT s.tuition_balance,
        ROUND((
          COALESCE(l.tuition_fee::numeric,0) + COALESCE(l.misc_fee::numeric,0) + COALESCE(l.internship_fee::numeric,0) + 
          COALESCE(l.computer_lab_fee::numeric,0) + COALESCE(l.chem_lab_fee::numeric,0) + COALESCE(l.aircon_fee::numeric,0) + 
          COALESCE(l.shop_fee::numeric,0) + COALESCE(l.other_fees::numeric,0) + COALESCE(l.id_fee::numeric,0) + COALESCE(l.subscription_fee::numeric,0) - 
          COALESCE(l.discount::numeric,0) + COALESCE(l.bank_account::numeric,0)
        ) - COALESCE(p.total_paid, 0), 2) as computed_balance
      FROM students s
      LEFT JOIN student_ledgers l ON l.student_id = s.id
      LEFT JOIN (SELECT student_id, SUM(amount) as total_paid FROM payments WHERE payment_type = 'Tuition' OR payment_type IS NULL GROUP BY student_id) p ON p.student_id = s.id
      WHERE s.id=$1 AND s.deleted_at IS NULL
    `, [id]);
    if (!row) return res.status(404).json({ error: "Not found" });
    const finalBalance = row.computed_balance !== null ? row.computed_balance : row.tuition_balance;
    res.json({ id, tuition_balance: Number(finalBalance || 0) });
  },
);
app.put(
  "/students/:id/tuition-balance",
  authRequired,
  requireRole("payments", "write"),
  async (req, res) => {
    const id = req.params.id;
    const amount = Number(req.body?.amount);
    if (!Number.isFinite(amount))
      return res.status(400).json({ error: "Invalid amount" });
    const exists = await get(
      "SELECT 1 FROM students WHERE id=? AND deleted_at IS NULL",
      [id],
    );
    if (!exists) return res.status(404).json({ error: "Not found" });
    await tx(async () => {
      await run("UPDATE students SET tuition_balance=? WHERE id=?", [amount, id]);
      await logAction({
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
  async (req, res) => {
    const shape = z.object({
      student_id: z.string().min(1),
      amount: z.number().min(0.01),
      method: z.string().optional(),
      reference: z.string().optional(),
      payment_type: z.string().optional(),
      status: z.enum(["posted","void","pending"]).optional()
    });
    const parsed = shape.safeParse(req.body || {});
    if (!parsed.success)
      return res.status(400).json({ error: "Invalid fields" });
    const s = await get("SELECT 1 FROM students WHERE id=$1 AND deleted_at IS NULL", [
      parsed.data.student_id,
    ]);
    if (!s) return res.status(404).json({ error: "Student not found" });

    await tx(async () => {
      let ref = parsed.data.reference;
      if (!ref || ref.trim() === "") {
        const seqRow = await get("SELECT nextval('txn_seq') as seq");
        ref = String(seqRow.seq).padStart(6, '0');
      }

      await run(
        "INSERT INTO payments (student_id, amount, method, reference, payment_type, status) VALUES ($1,$2,$3,$4,$5,$6)",
        [
          parsed.data.student_id,
          parsed.data.amount,
          parsed.data.method || null,
          ref,
          parsed.data.payment_type || "Tuition",
          parsed.data.status || "posted"
        ],
      );
      // Removed legacy tuition_balance manual decrement code because balance 
      // is now fully auto-computed using COALESCE via the GET /students endpoint!
      await logAction({
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
  async (req, res) => {
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
      const rows = await all(
      "SELECT id, amount, method, reference, payment_type, status, created_at FROM payments WHERE student_id=$1"+where+" ORDER BY created_at DESC",
        [student_id, ...params],
      );
      await logAction({ userId: req.user.id, action: "READ", entity: "payment", entityId: String(student_id), details: { from, to, method } });
      return res.json(rows);
    }
    const rows = await all(
    "SELECT p.*, s.name AS student_name FROM payments p JOIN students s ON s.id=p.student_id" + (where ? ` WHERE ${where.slice(5)}` : "") + " ORDER BY p.created_at DESC",
      params
    );
    res.json(rows);
  },
);
app.get(
  "/payments/:studentId",
  authRequired,
  requireRole("payments", "read"),
  async (req, res) => {
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
       await logAction({ userId: req.user.id, action: "ACCESS_DENIED", entity: "payment", entityId: sid, details: { path: "/payments/:studentId" } });
       return res.status(403).json({ error: "Forbidden" });
    }
    const rows = await all(
      "SELECT id, amount, method, reference, payment_type, status, created_at FROM payments WHERE student_id=$1"+where+" ORDER BY created_at DESC",
      [sid, ...params],
    );
    await logAction({ userId: req.user.id, action: "READ", entity: "payment", entityId: String(sid), details: { from, to, method } });
    res.json(rows);
  },
);

app.get("/subjects", authRequired, requireRole("subjects"), async (req, res) => {
  const { role } = req.user;
  if (role === "teacher") {
    const rows = await all("SELECT * FROM subjects WHERE deleted_at IS NULL");
    return res.json(rows);
  }
  if (role === "student") {
    const sid = req.user.student_id;
    console.log(`[DEBUG] Fetching subjects for student_id: ${sid}`);
    const rows = await all(`
      SELECT b.* FROM subjects b
      JOIN grades g ON g.subject_id = b.id
      WHERE g.student_id = ? 
      AND g.deleted_at IS NULL 
      AND b.deleted_at IS NULL
    `, [sid]);
    console.log(`[DEBUG] Found ${rows.length} subjects for ${sid}`);
    return res.json(rows);
  }
  const rows = await all("SELECT * FROM subjects WHERE deleted_at IS NULL");
  res.json(rows);
});
app.post(
  "/subjects",
  authRequired,
  requireRole("subjects", "write"),
  async (req, res) => {
    const body = req.body || {};
    const norm = {
      id: String(body.id || "").trim(),
      name: String(body.name || "").trim(),
      units: Number(body.units),
      professor: String(body.professor || "").trim(),
      schedule: String(body.schedule || "").trim(),
      room: String(body.room || "").trim(),
      campus: String(body.campus || "").trim(),
      semester_id: body.semester_id != null ? Number(body.semester_id) : null,
      time: String(body.time || "").trim(),
    };
    const parsed = subjectSchema.safeParse(norm);
    if (!parsed.success)
      return res
        .status(400)
        .json({ error: "Invalid data", details: parsed.error.flatten() });
    try {
      const existing = await get("SELECT deleted_at FROM subjects WHERE id=?", [parsed.data.id]);
      if (existing && existing.deleted_at) {
        await tx(async () => {
          await run(
            "UPDATE subjects SET name=?, units=?, professor=?, schedule=?, room=?, campus=?, time=?, semester_id=?, deleted_at=NULL WHERE id=?",
            [
              parsed.data.name,
              parsed.data.units,
              parsed.data.professor,
              parsed.data.schedule,
              parsed.data.room,
              parsed.data.campus,
              parsed.data.time,
              parsed.data.semester_id || null,
              parsed.data.id
            ],
          );
          await logAction({
            userId: req.user.id,
            action: "RESTORE",
            entity: "subject",
            entityId: parsed.data.id,
            details: { via: "POST_UPSERT" }
          });
        });
        return res.status(200).json({ ok: true, revived: true });
      }
      await tx(async () => {
        await run(
          "INSERT INTO subjects (id,name,units,professor,schedule,room,campus,time,semester_id) VALUES (?,?,?,?,?,?,?,?,?)",
          [
            parsed.data.id,
            parsed.data.name,
            parsed.data.units,
            parsed.data.professor,
            parsed.data.schedule,
            parsed.data.room,
            parsed.data.campus,
            parsed.data.time,
            parsed.data.semester_id || null,
          ],
        );
        await logAction({
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
      if (isUnique) {
        const soft = await get("SELECT deleted_at FROM subjects WHERE id=?", [parsed.data.id]);
        if (soft && soft.deleted_at) {
          await tx(async () => {
            await run(
              "UPDATE subjects SET name=?, units=?, professor=?, schedule=?, room=?, campus=?, time=?, semester_id=?, deleted_at=NULL WHERE id=?",
              [
                parsed.data.name,
                parsed.data.units,
                parsed.data.professor,
                parsed.data.schedule,
                parsed.data.room,
                parsed.data.campus,
                parsed.data.time,
                parsed.data.semester_id || null,
                parsed.data.id
              ],
            );
            await logAction({
              userId: req.user.id,
              action: "RESTORE",
              entity: "subject",
              entityId: parsed.data.id,
              details: { via: "POST_UPSERT_FALLBACK" }
            });
          });
          return res.status(200).json({ ok: true, revived: true });
        }
        return res.status(409).json({ error: "Subject exists" });
      }
      res.status(500).json({ error: "Internal error", details: e.message });
    }
  },
);
app.put(
  "/subjects/:id",
  authRequired,
  requireRole("subjects", "write"),
  async (req, res) => {
    const parsed = subjectSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid data" });
    const id = req.params.id;
    const s = await get(
      "SELECT * FROM subjects WHERE id = ? AND deleted_at IS NULL",
      [id],
    );
    if (!s) return res.status(404).json({ error: "Not found" });
    await tx(async () => {
      const fields = ["name", "units", "professor", "schedule", "room", "campus", "time", "semester_id"];
      const sets = fields
        .filter((f) => f in parsed.data)
        .map((f) => `${f}=?`)
        .join(", ");
      if (sets)
        await run(`UPDATE subjects SET ${sets} WHERE id=?`, [
          ...fields.filter((f) => f in parsed.data).map((f) => parsed.data[f]),
          id,
        ]);
      await logAction({
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
app.get("/students/:id/subjects", authRequired, requireRole("students"), async (req, res) => {
  const id = String(req.params.id);
  if (req.user.role === "student" && id !== req.user.student_id) {
    return res.status(403).json({ error: "Forbidden" });
  }
  const semesterId = req.query.semester_id ? Number(req.query.semester_id) : null;
  const rows = semesterId
    ? await all(`
        SELECT b.* FROM subjects b
        JOIN grades g ON g.subject_id=b.id AND g.deleted_at IS NULL
        WHERE g.student_id=? AND b.deleted_at IS NULL AND b.semester_id=?
      `, [id, semesterId])
    : await all(`
        SELECT b.* FROM subjects b
        JOIN grades g ON g.subject_id=b.id AND g.deleted_at IS NULL
        WHERE g.student_id=? AND b.deleted_at IS NULL
      `, [id]);
  res.json(rows);
});
app.get("/ledgers/:id", authRequired, async (req, res) => {
  const id = String(req.params.id);
  if (req.user.role === "student" && id !== req.user.student_id) return res.status(403).json({ error: "Forbidden" });
  let ledger = await get("SELECT * FROM student_ledgers WHERE student_id = ?", [id]);
  if (!ledger) {
    ledger = {
      student_id: id, petition_class: "", regular_units: "", total_units: "", tuition_fee: 0, misc_fee: 0, internship_fee: 0,
      computer_lab_fee: 0, chem_lab_fee: 0, aircon_fee: 0, shop_fee: 0, other_fees: 0,
      id_fee: 0, subscription_fee: 0, discount: 0, bank_account: "", bill_of_payment: "", notes: ""
    };
  }
  res.json(ledger);
});

app.put("/ledgers/:id", authRequired, requireRole("students", "write"), async (req, res) => {
  const id = String(req.params.id);
  const data = req.body;
  const existing = await get("SELECT student_id FROM student_ledgers WHERE student_id = ?", [id]);
  if (existing) {
    await run(`UPDATE student_ledgers SET 
      petition_class = ?, regular_units = ?, total_units = ?, tuition_fee = ?, misc_fee = ?, internship_fee = ?, computer_lab_fee = ?, chem_lab_fee = ?, aircon_fee = ?, shop_fee = ?, other_fees = ?, id_fee = ?, subscription_fee = ?, discount = ?, bank_account = ?, bill_of_payment = ?, notes = ? WHERE student_id = ?`,
      [data.petition_class, data.regular_units, data.total_units, data.tuition_fee, data.misc_fee, data.internship_fee, data.computer_lab_fee, data.chem_lab_fee, data.aircon_fee, data.shop_fee, data.other_fees, data.id_fee, data.subscription_fee, data.discount, data.bank_account, data.bill_of_payment, data.notes, id]);
  } else {
    await run(`INSERT INTO student_ledgers (student_id, petition_class, regular_units, total_units, tuition_fee, misc_fee, internship_fee, computer_lab_fee, chem_lab_fee, aircon_fee, shop_fee, other_fees, id_fee, subscription_fee, discount, bank_account, bill_of_payment, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, data.petition_class, data.regular_units, data.total_units, data.tuition_fee, data.misc_fee, data.internship_fee, data.computer_lab_fee, data.chem_lab_fee, data.aircon_fee, data.shop_fee, data.other_fees, data.id_fee, data.subscription_fee, data.discount, data.bank_account, data.bill_of_payment, data.notes]);
  }
  await logAction({ userId: req.user.id, action: "UPDATE", entity: "student_ledger", entityId: id });
  res.json({ ok: true });
});

app.delete(
  "/subjects/:id",
  authRequired,
  requireRole("subjects", "delete"),
  async (req, res) => {
    const id = req.params.id;
    const s = await get("SELECT 1 FROM subjects WHERE id=? AND deleted_at IS NULL", [
      id,
    ]);
    if (!s) return res.status(404).json({ error: "Not found" });
    await tx(async () => {
      await run("UPDATE subjects SET deleted_at=CURRENT_TIMESTAMP WHERE id=?", [id]);
      await run(
        "UPDATE grades SET deleted_at=CURRENT_TIMESTAMP WHERE subject_id=? AND deleted_at IS NULL",
        [id],
      );
      await logAction({
        userId: req.user.id,
        action: "DELETE",
        entity: "subject",
        entityId: id,
      });
      await logAction({
        userId: req.user.id,
        action: "BULK_DELETE",
        entity: "grade",
        entityId: `subject:${id}`,
      });
    });
    res.json({ ok: true });
  },
);

app.get("/grades/:studentId", authRequired, requireRole("grades"), async (req, res) => {
  const sid = req.params.studentId;
  if (req.user.role === "student" && sid !== req.user.student_id) {
    await logAction({ userId: req.user.id, action: "ACCESS_DENIED", entity: "grade", entityId: sid, details: { path: "/grades/:studentId", ip: req.ip } });
    return res.status(403).json({ error: "Forbidden" });
  }
  const semesterId = req.query.semester_id ? Number(req.query.semester_id) : null;
  const rows = await all(
    `SELECT g.* FROM grades g
     JOIN students s ON s.id = g.student_id AND s.deleted_at IS NULL
     JOIN subjects b ON b.id = g.subject_id AND b.deleted_at IS NULL
     WHERE g.student_id = ? AND g.deleted_at IS NULL` + (semesterId ? ` AND b.semester_id = ?` : ``),
    semesterId ? [sid, semesterId] : [sid],
  );
  await logAction({ userId: req.user.id, action: "READ", entity: "grade", entityId: sid, details: { semester_id: semesterId || null, ip: req.ip } });
  res.json(rows);
});
app.get("/grades", authRequired, requireRole("grades"), async (req, res) => {
  // Student privacy: students can only see their own grades
  if (req.user.role === "student") {
    const sid = req.user.student_id;
    if (!sid) return res.status(403).json({ error: "Forbidden" });
    const semesterId = req.query.semester_id ? Number(req.query.semester_id) : null;
    const bySelf = await all(
      `SELECT g.* FROM grades g
       JOIN students s ON s.id = g.student_id AND s.deleted_at IS NULL
       JOIN subjects b ON b.id = g.subject_id AND b.deleted_at IS NULL
       WHERE g.deleted_at IS NULL AND g.student_id = ?` + (semesterId ? ` AND b.semester_id = ?` : ``),
      semesterId ? [sid, semesterId] : [sid],
    );
    await logAction({ userId: req.user.id, action: "READ", entity: "grade", entityId: sid, details: { semester_id: semesterId || null, ip: req.ip } });
    return res.json(bySelf);
  }
  const rows = await all(
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
  async (req, res) => {
    const body = req.body || {};
    const norm = {
      student_id: String(body.student_id || "").trim(),
      subject_id: String(body.subject_id || "").trim(),
      prelim1: (body.prelim1 === undefined || body.prelim1 === "" || body.prelim1 === null) ? null : Number(body.prelim1),
      prelim2: (body.prelim2 === undefined || body.prelim2 === "" || body.prelim2 === null) ? null : Number(body.prelim2),
      midterm: (body.midterm === undefined || body.midterm === "" || body.midterm === null) ? null : Number(body.midterm),
      semi_final: (body.semi_final === undefined || body.semi_final === "" || body.semi_final === null) ? null : Number(body.semi_final),
      final: (body.final === undefined || body.final === "" || body.final === null) ? null : Number(body.final),
    };
    const parsed = gradeSchema.safeParse(norm);
    if (!parsed.success)
      return res
        .status(400)
        .json({ error: "Invalid data", details: parsed.error.flatten() });
    try {
      // Ensure both student and subject are active (not soft-deleted)
      const activeStudent = await get(
        "SELECT 1 FROM students WHERE id=? AND deleted_at IS NULL",
        [parsed.data.student_id],
      );
      if (!activeStudent)
        return res.status(404).json({ error: "Student not found or inactive" });
      const activeSubject = await get(
        "SELECT 1 FROM subjects WHERE id=? AND deleted_at IS NULL",
        [parsed.data.subject_id],
      );
      if (!activeSubject)
        return res.status(404).json({ error: "Subject not found or inactive" });
      const key = [parsed.data.student_id, parsed.data.subject_id];
      const existing = await get(
        "SELECT deleted_at FROM grades WHERE student_id=? AND subject_id=?",
        key,
      );
      if (existing && !existing.deleted_at) {
        return res.status(409).json({ error: "Grade exists" });
      }
      await tx(async () => {
        if (existing && existing.deleted_at) {
          await run(
            "UPDATE grades SET prelim1=?, prelim2=?, midterm=?, semi_final=?, final=?, deleted_at=NULL WHERE student_id=? AND subject_id=?",
            [
              parsed.data.prelim1 ?? null,
              parsed.data.prelim2 ?? null,
              parsed.data.midterm ?? null,
              parsed.data.semi_final ?? null,
              parsed.data.final ?? null,
              ...key,
            ],
          );
          await logAction({
            userId: req.user.id,
            action: "RESTORE",
            entity: "grade",
            entityId: `${parsed.data.student_id}:${parsed.data.subject_id}`,
            details: { via: "POST_UPSERT" },
          });
        } else {
          await run(
            "INSERT INTO grades (student_id,subject_id,prelim1,prelim2,midterm,semi_final,final) VALUES (?,?,?,?,?,?,?)",
            [
              parsed.data.student_id,
              parsed.data.subject_id,
              parsed.data.prelim1 ?? null,
              parsed.data.prelim2 ?? null,
              parsed.data.midterm ?? null,
              parsed.data.semi_final ?? null,
              parsed.data.final ?? null,
            ],
          );
          await logAction({
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
        const soft = await get(
          "SELECT deleted_at FROM grades WHERE student_id=? AND subject_id=?",
          [student_id, subject_id],
        );
        if (soft && soft.deleted_at) {
          await tx(async () => {
            await run(
              "UPDATE grades SET prelim1=?, prelim2=?, midterm=?, semi_final=?, final=?, deleted_at=NULL WHERE student_id=? AND subject_id=?",
              [
                parsed.data.prelim1 ?? null,
                parsed.data.prelim2 ?? null,
                parsed.data.midterm ?? null,
                parsed.data.semi_final ?? null,
                parsed.data.final ?? null,
                student_id,
                subject_id,
              ],
            );
            await logAction({
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
      res.status(500).json({ error: "Internal error", details: e.message });
    }
  },
);
app.put(
  "/grades/:studentId/:subjectId",
  authRequired,
  requireRole("grades", "write"),
  async (req, res) => {
    const parsed = gradeSchema
      .pick({ prelim1: true, prelim2: true, midterm: true, semi_final: true, final: true })
      .partial()
      .safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid data" });
    const { studentId, subjectId } = req.params;
    const g = await get(
      "SELECT 1 FROM grades WHERE student_id=? AND subject_id=? AND deleted_at IS NULL",
      [studentId, subjectId],
    );
    if (!g) return res.status(404).json({ error: "Not found" });
    await tx(async () => {
      const fields = ["prelim1", "prelim2", "midterm", "semi_final", "final"];
      const sets = fields
        .filter((f) => f in parsed.data)
        .map((f) => `${f}=?`)
        .join(", ");
      if (sets)
        await run(`UPDATE grades SET ${sets} WHERE student_id=? AND subject_id=?`, [
          ...fields.filter((f) => f in parsed.data).map((f) => parsed.data[f]),
          studentId,
          subjectId,
        ]);
      await logAction({
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
  async (req, res) => {
    const { studentId, subjectId } = req.params;
    const g = await get(
      "SELECT 1 FROM grades WHERE student_id=? AND subject_id=? AND deleted_at IS NULL",
      [studentId, subjectId],
    );
    if (!g) return res.status(404).json({ error: "Not found" });
    await tx(async () => {
      await run(
        "UPDATE grades SET deleted_at=CURRENT_TIMESTAMP WHERE student_id=? AND subject_id=?",
        [studentId, subjectId],
      );
      await logAction({
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
  async (req, res) => {
    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    const backupsDir = "server/data/backups";
    if (!fs.existsSync(backupsDir))
      fs.mkdirSync(backupsDir, { recursive: true });
    const dest = path.join(backupsDir, `app-${ts}.db`);
    fs.copyFileSync(dbFilePath, dest);
    await logAction({
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
  async (req, res) => {
    const orphans = await all(`
    SELECT g.student_id, g.subject_id
    FROM grades g
    LEFT JOIN students s ON s.id = g.student_id AND s.deleted_at IS NULL
    LEFT JOIN subjects b ON b.id = g.subject_id AND b.deleted_at IS NULL
    WHERE g.deleted_at IS NULL AND (s.id IS NULL OR b.id IS NULL)
  `);
    if (orphans.length === 0) return res.json({ ok: true, updated: 0 });
    await tx(async () => {
      await run(`
      UPDATE grades SET deleted_at=CURRENT_TIMESTAMP
      WHERE deleted_at IS NULL AND (
        NOT EXISTS (SELECT 1 FROM students s WHERE s.id=grades.student_id AND s.deleted_at IS NULL)
        OR NOT EXISTS (SELECT 1 FROM subjects b WHERE b.id=grades.subject_id AND b.deleted_at IS NULL)
      )
    `);
      await logAction({
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
app.post("/admin/restore", authRequired, requireRole("settings", "write"), async (req, res) => {
  const shape = z.object({
    entity: z.enum(["user", "student", "subject", "grade"]),
    id: z.string().min(1),
  });
  const parsed = shape.safeParse(req.body || {});
  if (!parsed.success) return res.status(400).json({ error: "Invalid fields" });
  const { entity, id } = parsed.data;
  const within = async (table, where, params) => {
    const row = await get(`SELECT deleted_at FROM ${table} WHERE ${where}`, params);
    if (!row || !row.deleted_at) return { ok: false, error: "Not deleted" };
    const del = new Date(row.deleted_at);
    const diff = (Date.now() - del.getTime()) / (1000 * 60 * 60 * 24);
    if (diff > 30) return { ok: false, error: "Restore window expired" };
    return { ok: true };
  };
  await tx(async () => {
    if (entity === "user") {
      const chk = await within("users", "id=?", [id]);
      if (!chk.ok) return res.status(400).json({ error: chk.error });
      const row = await get("SELECT student_id FROM users WHERE id=?", [id]);
      await run("UPDATE users SET deleted_at=NULL WHERE id=?", [id]);
      if (row?.student_id) {
        await run("UPDATE students SET deleted_at=NULL WHERE id=?", [row.student_id]);
      }
      await logAction({
        userId: req.user.id,
        action: "RESTORE",
        entity: "user",
        entityId: id,
      });
    } else if (entity === "student") {
      const chk = await within("students", "id=?", [id]);
      if (!chk.ok) return res.status(400).json({ error: chk.error });
      await run("UPDATE students SET deleted_at=NULL WHERE id=?", [id]);
      await run("UPDATE users SET deleted_at=NULL WHERE student_id=?", [id]);
      await logAction({
        userId: req.user.id,
        action: "RESTORE",
        entity: "student",
        entityId: id,
      });
    } else if (entity === "subject") {
      const chk = await within("subjects", "id=?", [id]);
      if (!chk.ok) return res.status(400).json({ error: chk.error });
      await run("UPDATE subjects SET deleted_at=NULL WHERE id=?", [id]);
      await logAction({
        userId: req.user.id,
        action: "RESTORE",
        entity: "subject",
        entityId: id,
      });
    } else if (entity === "grade") {
      const [sid, subid] = id.split(":");
      const chk = await within("grades", "student_id=? AND subject_id=?", [
        sid,
        subid,
      ]);
      if (!chk.ok) return res.status(400).json({ error: chk.error });
      await run(
        "UPDATE grades SET deleted_at=NULL WHERE student_id=? AND subject_id=?",
        [sid, subid],
      );
      await logAction({
        userId: req.user.id,
        action: "RESTORE",
        entity: "grade",
        entityId: id,
      });
    }
  });
  res.json({ ok: true });
});

// Student Permit filtering

// Student Permit filtering
app.get("/my-permits", authRequired, async (req, res) => {
  if (req.user.role !== "student") return res.status(403).json({ error: "Forbidden" });
  const sid = req.user.student_id;
  const rows = await all(`
    SELECT sp.*, pp.name as period_name, pp.sort_order, s.school_year, s.term
    FROM student_permits sp
    JOIN permit_periods pp ON pp.id = sp.permit_period_id
    JOIN semesters s ON s.id = pp.semester_id
    WHERE sp.student_id = ?
    ORDER BY s.school_year DESC, s.term DESC, pp.sort_order ASC
  `, [sid]);
  await logAction({ userId: req.user.id, action: "READ", entity: "student_permit", entityId: String(sid) });
  res.json(rows);
});

// Attendance CRUD with teacher isolation
const attendanceCreateSchema = z.object({
  course_name: z.string().min(1),
  block_number: z.string().min(1),
  subject_id: z.string().min(1),
  semester_id: z.number().int(),
  time_slot: z.enum(["Morning Class", "Afternoon Class", "Evening Class"]),
  term_period: z.enum(["1st prelim", "2nd prelim", "midterm", "semi-final", "final"]).optional()
});

function teacherUUID(req) {
  return req.user?.uuid || null;
}

function isOwnerMatch(row, uuid) {
  if (!row) return false;
  if (!uuid) return false;
  return String(row.created_by_teacher_id) === String(uuid);
}

function today() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// List tables (accessible by teacher [own only] or owner/dev [all])
app.get("/attendance/tables", authRequired, requireRole("attendance"), async (req, res) => {
  const { role } = req.user;
  const uuid = teacherUUID(req);
  let rows;
  if (role === "owner" || role === "developer") {
    rows = await all("SELECT * FROM attendance_tables ORDER BY created_at DESC");
  } else {
    rows = await all("SELECT * FROM attendance_tables WHERE created_by_teacher_id = ? ORDER BY created_at DESC", [uuid]);
  }
  res.json(rows);
});

// Legacy support for TeacherAttendanceDashboard which might call /attendance
app.get("/attendance", authRequired, requireRole("attendance"), async (req, res) => {
  const { role } = req.user;
  const uuid = teacherUUID(req);
  const rows = await all("SELECT * FROM attendance_tables WHERE created_by_teacher_id = ? ORDER BY created_at DESC", [uuid]);
  res.json(rows);
});

app.post("/attendance", authRequired, requireRole("attendance", "write"), async (req, res) => {
  const uuid = teacherUUID(req);
  const parsed = attendanceCreateSchema.safeParse(req.body || {});
  if (!parsed.success) return res.status(400).json({ error: "Invalid fields", details: parsed.error.errors.map(e => e.message) });
  
  const subjectExists = await get("SELECT 1 FROM subjects WHERE id=? AND deleted_at IS NULL", [parsed.data.subject_id]);
  if (!subjectExists) return res.status(400).json({ error: "Invalid subject_id" });
  
  const semesterExists = await get("SELECT 1 FROM semesters WHERE id=?", [parsed.data.semester_id]);
  if (!semesterExists) return res.status(400).json({ error: "Invalid semester_id" });

  try {
    await tx(async () => {
      const insertRes = await run(`
        INSERT INTO attendance_tables (course_name, block_number, subject_id, semester_id, time_slot, term_period, created_by_teacher_id)
        VALUES (?,?,?,?,?,?,?) RETURNING id
      `, [parsed.data.course_name, parsed.data.block_number, parsed.data.subject_id, parsed.data.semester_id, parsed.data.time_slot, parsed.data.term_period || null, uuid]);
      const id = String(insertRes.rows[0].id);
      await logAction({ userId: req.user.id, action: "CREATE", entity: "attendance_table", entityId: id, details: { created_by: uuid, payload: parsed.data } });
    });
    res.status(201).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: "Internal error", details: e.message });
  }
});

app.delete("/attendance/tables/:id", authRequired, requireRole("attendance", "delete"), async (req, res) => {
  const uuid = teacherUUID(req);
  const id = Number(req.params.id);
  const row = await get("SELECT * FROM attendance_tables WHERE id=?", [id]);
  if (!row) return res.status(404).json({ error: "Not found" });
  if (req.user.role === "teacher" && !isOwnerMatch(row, uuid)) return res.status(403).json({ error: "Forbidden" });
  
  await tx(async () => {
    await run("DELETE FROM attendance_tables WHERE id=?", [id]);
    await logAction({ userId: req.user.id, action: "DELETE", entity: "attendance_table", entityId: String(id) });
  });
  res.json({ ok: true });
});

// Enrollment management
app.get("/attendance/tables/:id/enrollments", authRequired, requireRole("attendance"), async (req, res) => {
  const id = Number(req.params.id);
  const table = await get("SELECT * FROM attendance_tables WHERE id=?", [id]);
  if (!table) return res.status(404).json({ error: "Not found" });
  
  const rows = await all(`
    SELECT e.student_id, s.name, s.course, s.year, s.status
    FROM attendance_enrollments e
    JOIN students s ON s.id = e.student_id
    WHERE e.table_id = ?
    ORDER BY s.name
  `, [id]);
  res.json(rows);
});

app.post("/attendance/tables/:id/enroll", authRequired, requireRole("attendance", "write"), async (req, res) => {
  const id = Number(req.params.id);
  const uuid = teacherUUID(req);
  const table = await get("SELECT * FROM attendance_tables WHERE id=?", [id]);
  if (!table) return res.status(404).json({ error: "Not found" });
  
  const shape = z.object({ student_id: z.string().min(1) });
  const parsed = shape.safeParse(req.body || {});
  if (!parsed.success) return res.status(400).json({ error: "Invalid fields" });
  
  const sid = parsed.data.student_id;
  const stud = await get("SELECT 1 FROM students WHERE id=? AND deleted_at IS NULL", [sid]);
  if (!stud) return res.status(404).json({ error: "Student not found" });

  try {
    await tx(async () => {
      const already = await get("SELECT 1 FROM attendance_enrollments WHERE table_id=? AND student_id=?", [id, sid]);
      if (!already) {
        await run("INSERT INTO attendance_enrollments (table_id, student_id, created_by_teacher_id) VALUES (?,?,?)", [id, sid, uuid]);
      }
      await logAction({ userId: req.user.id, action: "ENROLL", entity: "attendance", entityId: String(id), details: { student_id: sid } });
    });
    res.status(201).json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete("/attendance/tables/:id/enroll/:studentId", authRequired, requireRole("attendance", "delete"), async (req, res) => {
  const id = Number(req.params.id);
  const sid = String(req.params.studentId);
  const exists = await get("SELECT 1 FROM attendance_enrollments WHERE table_id=? AND student_id=?", [id, sid]);
  if (!exists) return res.status(404).json({ error: "Not found" });
  
  await tx(async () => {
    await run("DELETE FROM attendance_enrollments WHERE table_id=? AND student_id=?", [id, sid]);
    await logAction({ userId: req.user.id, action: "UNENROLL", entity: "attendance", entityId: String(id), details: { student_id: sid } });
  });
  res.json({ ok: true });
});

// Attendance records
app.get("/attendance/tables/:id/attendance", authRequired, requireRole("attendance"), async (req, res) => {
  const id = Number(req.params.id);
  const date = typeof req.query.date === "string" ? req.query.date : today();
  const table = await get("SELECT 1 FROM attendance_tables WHERE id=?", [id]);
  if (!table) return res.status(404).json({ error: "Not found" });
  
  const rows = await all(`
    SELECT s.id as student_id, s.name, s.course, s.year, s.status,
           COALESCE(ar.status, '') as attendance_status
    FROM attendance_enrollments e
    JOIN students s ON s.id = e.student_id
    LEFT JOIN attendance_records ar ON ar.table_id = e.table_id AND ar.student_id = e.student_id AND ar.date = ?
    WHERE e.table_id = ?
    ORDER BY s.name
  `, [date, id]);
  res.json({ date, rows });
});

app.put("/attendance/tables/:id/attendance/:studentId", authRequired, requireRole("attendance", "write"), async (req, res) => {
  const id = Number(req.params.id);
  const sid = String(req.params.studentId);
  const uuid = teacherUUID(req);
  const shape = z.object({ status: z.enum(["present", "absent", "late", "excuse"]), date: z.string().optional() });
  const parsed = shape.safeParse(req.body || {});
  if (!parsed.success) return res.status(400).json({ error: "Invalid fields" });
  
  const date = parsed.data.date || today();
  const enrolled = await get("SELECT 1 FROM attendance_enrollments WHERE table_id=? AND student_id=?", [id, sid]);
  if (!enrolled) return res.status(404).json({ error: "Not enrolled" });

  try {
    await tx(async () => {
      const existing = await get("SELECT id FROM attendance_records WHERE table_id=? AND student_id=? AND date=?", [id, sid, date]);
      if (existing) {
        await run("UPDATE attendance_records SET status=?, updated_at=CURRENT_TIMESTAMP WHERE id=?", [parsed.data.status, existing.id]);
      } else {
        await run("INSERT INTO attendance_records (table_id, student_id, date, status, created_by_teacher_id) VALUES (?,?,?,?,?)", [id, sid, date, parsed.data.status, uuid]);
      }
      await logAction({ userId: req.user.id, action: "ATTENDANCE_SET", entity: "attendance", entityId: `${id}:${sid}:${date}`, details: { status: parsed.data.status } });
    });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/attendance/tables/:id/attendance/present-all", authRequired, requireRole("attendance", "write"), async (req, res) => {
  const id = Number(req.params.id);
  const uuid = teacherUUID(req);
  const date = typeof req.body?.date === "string" ? req.body.date : today();
  const table = await get("SELECT 1 FROM attendance_tables WHERE id=?", [id]);
  if (!table) return res.status(404).json({ error: "Not found" });
  
  const students = await all("SELECT student_id FROM attendance_enrollments WHERE table_id=?", [id]).map(r => r.student_id);
  try {
    await tx(async () => {
      for (const sid of students) {
        const existing = await get("SELECT id FROM attendance_records WHERE table_id=? AND student_id=? AND date=?", [id, sid, date]);
        if (existing) {
          await run("UPDATE attendance_records SET status='present', updated_at=CURRENT_TIMESTAMP WHERE id=?", [existing.id]);
        } else {
          await run("INSERT INTO attendance_records (table_id, student_id, date, status, created_by_teacher_id) VALUES (?,?,?,?,?)", [id, sid, date, "present", uuid]);
        }
      }
      await logAction({ userId: req.user.id, action: "ATTENDANCE_BULK", entity: "attendance", entityId: String(id), details: { date, count: students.length, status: "present_all" } });
    });
    res.json({ ok: true, count: students.length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Student: view-only attendance
app.get("/attendance/my", authRequired, async (req, res) => {
  if (req.user.role !== "student") return res.status(403).json({ error: "Forbidden" });
  const sid = req.user.student_id;
  const date = typeof req.query.date === "string" ? req.query.date : null;
  const rows = date
    ? await all(`
        SELECT at.id as table_id, at.course_name, at.block_number, at.time_slot,
               ar.date, ar.status
        FROM attendance_records ar
        JOIN attendance_tables at ON at.id = ar.table_id
        WHERE ar.student_id = ? AND ar.date = ?
        ORDER BY at.course_name
      `, [sid, date])
    : await all(`
        SELECT at.id as table_id, at.course_name, at.block_number, at.time_slot,
               ar.date, ar.status
        FROM attendance_records ar
        JOIN attendance_tables at ON at.id = ar.table_id
        WHERE ar.student_id = ?
        ORDER BY ar.date DESC
      `, [sid]);
  await logAction({ userId: req.user.id, action: "READ", entity: "attendance", entityId: String(sid), details: { date: date || null } });
  res.json(rows);
});


const port = process.env.PORT || 4000;
app.listen(port, () => {
  process.stdout.write(`server listening on ${port}\n`);
});
