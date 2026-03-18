import "dotenv/config";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import db, { logAction, run, get, all, lastInsertId } from "./db.js";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";

export function signToken(user) {
  return jwt.sign({ id: user.id, role: user.role, username: user.username, student_id: user.student_id, uuid: user.uuid }, JWT_SECRET, { expiresIn: "12h" });
}

export function authRequired(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) {
    console.log("[AUTH] Missing token in header");
    return res.status(401).json({ error: "Unauthorized" });
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch (err) {
    console.log(`[AUTH] Token verification failed: ${err.message}`);
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

    // 1. Check for specific user override
    const userPerm = get(
      `SELECT ${column} FROM user_permissions WHERE user_id=? AND (module=? OR module='*')`,
      [req.user.id, module]
    );

    if (userPerm !== null && userPerm[column]) {
      return next();
    }

    // 2. Fallback to role-based permission
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
  
  console.log(`[LOGIN] Attempt for: ${username}`);
  
  // Find all users with matching username (case-insensitive)
  const matches = all("SELECT * FROM users WHERE LOWER(username) = LOWER(?) AND deleted_at IS NULL", [username]);
  console.log(`[LOGIN] Found ${matches.length} case-insensitive matches`);
  
  if (!matches || matches.length === 0) {
    console.log(`[LOGIN] No matching user found for: ${username}`);
    return res.status(401).json({ error: "Invalid credentials" });
  }
  
  // Iterate through matches to find the one with the correct password
  let user = null;
  for (const m of matches) {
    const isMatch = bcrypt.compareSync(password, m.password_hash);
    console.log(`[LOGIN] Checking match ID: ${m.id}, Username: ${m.username}, Password match: ${isMatch}`);
    if (isMatch) {
      user = m;
      break;
    }
  }

  if (!user) {
    console.log(`[LOGIN] Password mismatch for: ${username}`);
    return res.status(401).json({ error: "Invalid credentials" });
  }
  
  if (user.deleted_at) return res.status(403).json({ error: "Account disabled" });
  if (user.role === "student") {
    if (!user.student_id) return res.status(403).json({ error: "Account not linked to a student" });
    const activeStudent = get("SELECT 1 FROM students WHERE id=? AND deleted_at IS NULL", [user.student_id]);
    if (!activeStudent) return res.status(403).json({ error: "Student record inactive or deleted" });
  }
  // Ensure uuid is present for isolation context
  if (!user.uuid) {
    const gen = (typeof globalThis.crypto?.randomUUID === "function") ? globalThis.crypto.randomUUID() : `${Date.now()}-${Math.random()}`.replace(/\./g,"");
    run("UPDATE users SET uuid=? WHERE id=?", [gen, user.id]);
    user = get("SELECT * FROM users WHERE id = ?", [user.id]);
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
  
  // Fetch with potential student fallback
  const finalUser = get(`
    SELECT u.*, s.name as student_full_name 
    FROM users u 
    LEFT JOIN students s ON u.student_id = s.id 
    WHERE u.id = ?
  `, [user.id]);
  
  res.json({ 
    token, 
    role: finalUser.role, 
    username: finalUser.username, 
    student_id: finalUser.student_id, 
    uuid: finalUser.uuid,
    full_name: finalUser.full_name || finalUser.student_full_name || null
  });
}

export function registerHandler(req, res) {
  const { username, password, role, user_type } = req.body || {};
  if (!username || !password || !role) return res.status(400).json({ error: "Missing fields" });
  
  const existing = get("SELECT * FROM users WHERE LOWER(username) = LOWER(?) AND deleted_at IS NULL", [username]);
  if (existing && role !== "student") {
    return res.status(409).json({ error: "Username exists" });
  }

  // Check if this specific username+password combo (or just username if we prefer) exists and is deleted
  const deleted = get("SELECT * FROM users WHERE username = ? AND deleted_at IS NOT NULL", [username]);
  if (deleted) {
    const hash = bcrypt.hashSync(password, 10);
    run("UPDATE users SET password_hash=?, role=?, user_type=?, deleted_at=NULL WHERE id=?", [hash, role, user_type || role, deleted.id]);
    const revived = get("SELECT id, username, role, user_type, uuid FROM users WHERE id=?", [deleted.id]);
    return res.status(200).json({ id: revived.id, username: revived.username, role: revived.role, user_type: revived.user_type, revived: true, uuid: revived.uuid });
  }

  if (!["teacher","student","developer","saps","register","cashier"].includes(role)) return res.status(400).json({ error: "Invalid role" });
  const hash = bcrypt.hashSync(password, 10);
  run("INSERT INTO users (username, password_hash, role, user_type) VALUES (?, ?, ?, ?)", [username, hash, role, user_type || role]);
  const id = lastInsertId();
  const revived = get("SELECT id, username, role, user_type, uuid FROM users WHERE id=?", [id]);
  res.status(201).json({ id: revived.id, username: revived.username, role: revived.role, user_type: revived.user_type, uuid: revived.uuid });
}

export function studentSelfRegister(req, res) {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: "Missing fields" });
  const exists = get("SELECT 1 FROM users WHERE LOWER(username) = LOWER(?) AND deleted_at IS NULL", [username]);
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
