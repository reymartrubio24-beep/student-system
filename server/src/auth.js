import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import db, { logAction, run, get, lastInsertId } from "./db.js";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";

export function signToken(user) {
  return jwt.sign({ id: user.id, role: user.role, username: user.username, student_id: user.student_id }, JWT_SECRET, { expiresIn: "12h" });
}

export function authRequired(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}

export function requireRole(module, action = "read") {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    const { role } = req.user;
    if (role === "owner" || role === "developer") return next();

    const column =
      action === "write" ? "can_write" :
      action === "delete" ? "can_delete" : "can_read";

    const permission = get(
      `SELECT ${column} FROM authorization WHERE role=? AND (module=? OR module='*')`,
      [role, module],
    );

    if (!permission || !permission[column]) {
      try {
        logAction({ userId: req.user.id, action: "ACCESS_DENIED", entity: "rbac", entityId: module, details: { action, role, ip: req.ip } });
      } catch {}
      return res.status(403).json({ error: "Forbidden" });
    }

    // Student ownership check: if resource is students, grades, payments, or permits
    // and role is student, they can only access their own student_id.
    // This part is handled partially here and partially in endpoint logic filtering.
    // But we block if they try to access a specific ID that isn't theirs.
    if (role === "student" && req.params.id && req.params.id !== req.user.student_id) {
       // Exceptional cases like /students/:id/permits or /grades/:id
       // We'll allow it if the endpoint logic itself filters, but strictly speaking
       // if there is an ID in params, it MUST match for students.
       if (["students", "grades", "payments", "permits", "student_permits"].includes(module)) {
         try {
           logAction({ userId: req.user.id, action: "ACCESS_DENIED", entity: "ownership", entityId: String(req.params.id), details: { module, role, ip: req.ip } });
         } catch {}
         return res.status(403).json({ error: "Forbidden: Not your record" });
       }
    }

    next();
  };
}

export function ensureInitialAdmin() {
  const row = get("SELECT COUNT(*) as c FROM users");
  const count = row ? row.c : 0;
  if (count === 0) {
    const hash = bcrypt.hashSync("admin123", 10);
    run("INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)", ["developer", hash, "developer"]);
  }
  // Controlled owner bootstrap through environment variables, only if no owner set and not initialized
  const ownerExists = get("SELECT 1 as x FROM users WHERE role='owner' AND deleted_at IS NULL");
  const initialized = get("SELECT value FROM settings WHERE key='owner_initialized'");
  const envUser = process.env.OWNER_USERNAME;
  const envPass = process.env.OWNER_PASSWORD;
  if (!ownerExists && (!initialized || initialized.value !== "1") && envUser && envPass) {
    const hash = bcrypt.hashSync(envPass, 12);
    run("INSERT INTO users (username, password_hash, role) VALUES (?, ?, 'owner')", [envUser, hash]);
    run("INSERT OR REPLACE INTO settings (key, value) VALUES ('owner_initialized','1')");
  }
}

export function loginHandler(req, res) {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: "Missing credentials" });
  let user = get("SELECT * FROM users WHERE username = ? AND deleted_at IS NULL", [username]);
  if (!user) return res.status(401).json({ error: "Invalid credentials" });
  const ok = bcrypt.compareSync(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: "Invalid credentials" });
  if (user.deleted_at) return res.status(403).json({ error: "Account disabled" });
  if (user.role === "student") {
    if (!user.student_id) return res.status(403).json({ error: "Account not linked to a student" });
    const activeStudent = get("SELECT 1 FROM students WHERE id=? AND deleted_at IS NULL", [user.student_id]);
    if (!activeStudent) return res.status(403).json({ error: "Student record inactive or deleted" });
  }
  // Auto-link: if student account has no student_id but username looks like a Student ID (YYYY-NNNN) and such student exists, link it
  if (user.role === "student" && (!user.student_id || user.student_id === null)) {
    const isId = /^\d{4}-\d{4}$/.test(user.username);
    if (isId) {
      const exists = get("SELECT 1 FROM students WHERE id=? AND deleted_at IS NULL", [user.username]);
      if (exists) {
        run("UPDATE users SET student_id=? WHERE id=?", [user.username, user.id]);
        user = get("SELECT * FROM users WHERE id = ?", [user.id]);
        logAction({ userId: user.id, action: "LINK_STUDENT_ID", entity: "user", entityId: String(user.id), details: { student_id: user.student_id } });
      }
    }
  }
  const token = signToken(user);
  logAction({ userId: user.id, action: "LOGIN", entity: "user", entityId: String(user.id), details: { username } });
  res.json({ token, role: user.role, username: user.username, student_id: user.student_id });
}

export function registerHandler(req, res) {
  const { username, password, role, user_type } = req.body || {};
  if (!username || !password || !role) return res.status(400).json({ error: "Missing fields" });
  const exists = get("SELECT 1 FROM users WHERE username = ? AND deleted_at IS NULL", [username]);
  if (exists) return res.status(409).json({ error: "Username exists" });
  if (!["teacher","student","developer","saps","register","cashier"].includes(role)) return res.status(400).json({ error: "Invalid role" });
  const hash = bcrypt.hashSync(password, 10);
  run("INSERT INTO users (username, password_hash, role, user_type) VALUES (?, ?, ?, ?)", [username, hash, role, user_type || role]);
  const id = lastInsertId();
  res.status(201).json({ id, username, role, user_type: user_type || role });
}

export function studentSelfRegister(req, res) {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: "Missing fields" });
  const exists = get("SELECT 1 FROM users WHERE username = ? AND deleted_at IS NULL", [username]);
  if (exists) return res.status(409).json({ error: "Username exists" });
  const hash = bcrypt.hashSync(password, 10);
  run("INSERT INTO users (username, password_hash, role, user_type) VALUES (?, ?, ?, ?)", [username, hash, "student", "student"]);
  const id = lastInsertId();
  res.status(201).json({ id, username, role: "student" });
}

// One-time bootstrap endpoint (requires env token and no owner yet). Not listed publicly.
export function bootstrapOwner(req, res) {
  const tokenEnv = process.env.OWNER_BOOTSTRAP_TOKEN || "";
  if (!tokenEnv) return res.status(404).json({ error: "Not available" });
  const ownerExists = get("SELECT 1 as x FROM users WHERE role='owner' AND deleted_at IS NULL");
  const initialized = get("SELECT value FROM settings WHERE key='owner_initialized'");
  if (ownerExists || (initialized && initialized.value === "1")) return res.status(409).json({ error: "Owner already initialized" });
  const { token, username, password } = req.body || {};
  if (!token || token !== tokenEnv) return res.status(403).json({ error: "Forbidden" });
  if (!username || !password) return res.status(400).json({ error: "Missing fields" });
  const hash = bcrypt.hashSync(password, 12);
  run("INSERT INTO users (username, password_hash, role) VALUES (?, ?, 'owner')", [username, hash]);
  run("INSERT OR REPLACE INTO settings (key, value) VALUES ('owner_initialized','1')");
  res.status(201).json({ ok: true });
}
