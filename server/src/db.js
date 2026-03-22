import { config } from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// Load .env from server directory regardless of CWD
config({ path: resolve(__dirname, "../../.env") });
config({ path: resolve(__dirname, "../.env") }); // fallback: server/.env
import pg from "pg";
const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set in the environment!");
}

export const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false // Required for Supabase in many environments
  }
});

// Helper to convert SQLite '?' placeholders to PostgreSQL '$1, $2, ...'
function convertSql(sql) {
  let count = 0;
  return sql.replace(/\?/g, () => `$${++count}`);
}

export async function initDB() {
  console.log("[DB] Initializing PostgreSQL schema...");
  
  // PostgreSQL schema equivalent to original SQLite schema
  await pool.query(`
    -- Create table for users with case-insensitive username handling via unique index
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('student','teacher','developer','owner','saps','register','cashier','viewer')),
      user_type TEXT,
      student_id TEXT,
      full_name TEXT,
      uuid TEXT,
      deleted_at TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username_lower ON users (LOWER(username));

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    CREATE TABLE IF NOT EXISTS students (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      course TEXT NOT NULL,
      year TEXT NOT NULL,
      birth_year TEXT,
      email TEXT NOT NULL,
      status TEXT NOT NULL,
      permit_number INTEGER,
      tuition_balance DECIMAL DEFAULT 0,
      enrollment_year TEXT,
      program_years TEXT,
      deleted_at TIMESTAMP WITH TIME ZONE
    );

    CREATE TABLE IF NOT EXISTS subjects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      units INTEGER NOT NULL,
      professor TEXT,
      schedule TEXT,
      room TEXT,
      campus TEXT,
      time TEXT,
      semester_id INTEGER,
      deleted_at TIMESTAMP WITH TIME ZONE
    );

    CREATE TABLE IF NOT EXISTS grades (
      student_id TEXT NOT NULL,
      subject_id TEXT NOT NULL,
      prelim1 INTEGER,
      prelim2 INTEGER,
      midterm INTEGER,
      semi_final INTEGER,
      final INTEGER,
      deleted_at TIMESTAMP WITH TIME ZONE,
      PRIMARY KEY (student_id, subject_id),
      FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
      FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS payments (
      id SERIAL PRIMARY KEY,
      student_id TEXT NOT NULL,
      amount DECIMAL NOT NULL,
      reference TEXT,
      method TEXT,
      status TEXT DEFAULT 'posted',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS audit_log (
      id SERIAL PRIMARY KEY,
      user_id INTEGER,
      action TEXT NOT NULL,
      entity TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      details TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS student_id_sequence (
      year TEXT PRIMARY KEY,
      last INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS semesters (
      id SERIAL PRIMARY KEY,
      school_year TEXT NOT NULL,
      term TEXT NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (school_year, term)
    );

    CREATE TABLE IF NOT EXISTS permit_periods (
      id SERIAL PRIMARY KEY,
      semester_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      sort_order INTEGER NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (semester_id, name),
      FOREIGN KEY (semester_id) REFERENCES semesters(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS student_permits (
      id SERIAL PRIMARY KEY,
      student_id TEXT NOT NULL,
      permit_period_id INTEGER NOT NULL,
      permit_number TEXT NOT NULL,
      status TEXT DEFAULT 'active',
      issue_date TEXT,
      expiry_date TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE,
      UNIQUE (student_id, permit_period_id),
      FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
      FOREIGN KEY (permit_period_id) REFERENCES permit_periods(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS "authorization" (
      id SERIAL PRIMARY KEY,
      role TEXT NOT NULL,
      module TEXT NOT NULL,
      can_read INTEGER DEFAULT 0,
      can_write INTEGER DEFAULT 0,
      can_delete INTEGER DEFAULT 0,
      UNIQUE(role, module)
    );

    CREATE TABLE IF NOT EXISTS user_permissions (
      user_id INTEGER NOT NULL,
      module TEXT NOT NULL,
      can_read INTEGER DEFAULT 0,
      can_write INTEGER DEFAULT 0,
      can_delete INTEGER DEFAULT 0,
      PRIMARY KEY (user_id, module),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS attendance_tables (
      id SERIAL PRIMARY KEY,
      course_name TEXT NOT NULL,
      block_number TEXT NOT NULL,
      subject_id TEXT,
      semester_id INTEGER,
      time_slot TEXT,
      term_period TEXT,
      created_by_teacher_id TEXT NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS attendance_enrollments (
      table_id INTEGER NOT NULL,
      student_id TEXT NOT NULL,
      created_by_teacher_id TEXT NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (table_id, student_id),
      FOREIGN KEY (table_id) REFERENCES attendance_tables(id) ON DELETE CASCADE,
      FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS attendance_records (
      id SERIAL PRIMARY KEY,
      table_id INTEGER NOT NULL,
      student_id TEXT NOT NULL,
      date TEXT NOT NULL,
      status TEXT NOT NULL,
      created_by_teacher_id TEXT NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (table_id, student_id, date),
      FOREIGN KEY (table_id) REFERENCES attendance_tables(id) ON DELETE CASCADE,
      FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS permit_number_sequence (
      id INTEGER PRIMARY KEY CHECK(id = 1),
      last INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS user_files (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      rel_path TEXT NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      deleted_at TIMESTAMP WITH TIME ZONE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  console.log("[DB] Seeding default values...");
  const semCheck = await get("SELECT COUNT(*) as c FROM semesters");
  if (parseInt(semCheck?.c || "0") === 0) {
    const s1 = await lastInsertId("INSERT INTO semesters (school_year, term) VALUES ('2025-2026', '1st Semester') RETURNING id");
    const s2 = await lastInsertId("INSERT INTO semesters (school_year, term) VALUES ('2025-2026', '2nd Semester') RETURNING id");
    const periods = ["First Prelim", "Second Prelim", "Midterm", "Semi-Final", "Final"];
    for (const sid of [s1, s2]) {
      for (let i = 0; i < periods.length; i++) {
        await run("INSERT INTO permit_periods (semester_id, name, sort_order) VALUES (?,?,?)", [sid, periods[i], i + 1]);
      }
    }
  }

  // Seed default RBAC
  const attTeacher = await get("SELECT 1 FROM \"authorization\" WHERE role='teacher' AND module='attendance'");
  if (!attTeacher) await run("INSERT INTO \"authorization\" (role,module,can_read,can_write,can_delete) VALUES ('teacher','attendance',1,1,1)");
  
  const attStudent = await get("SELECT 1 FROM \"authorization\" WHERE role='student' AND module='attendance'");
  if (!attStudent) await run("INSERT INTO \"authorization\" (role,module,can_read,can_write,can_delete) VALUES ('student','attendance',1,0,0)");
  
  const subStudent = await get("SELECT 1 FROM \"authorization\" WHERE role='student' AND module='subjects'");
  if (!subStudent) await run("INSERT INTO \"authorization\" (role,module,can_read,can_write,can_delete) VALUES ('student','subjects',1,0,0)");

  console.log("[DB] Initialization completed.");
}

export async function tx(fn) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn({
      run: (sql, params) => client.query(convertSql(sql), params),
      get: (sql, params) => client.query(convertSql(sql), params).then(res => res.rows[0]),
      all: (sql, params) => client.query(convertSql(sql), params).then(res => res.rows)
    });
    await client.query("COMMIT");
    return result;
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

export async function run(sql, params = []) {
  // Translate SQLite specific SQL to PostgreSQL on the fly if needed
  let psql = sql
    .replace(/INSERT OR IGNORE/gi, "INSERT")
    .replace(/INSERT OR REPLACE/gi, "INSERT");
  
  // Handle ON CONFLICT for common settings pattern
  if (sql.includes("settings") && sql.includes("REPLACE")) {
    psql += " ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value";
  }

  return pool.query(convertSql(psql), params);
}

export async function get(sql, params = []) {
  const res = await pool.query(convertSql(sql), params);
  return res.rows[0] || null;
}

export async function all(sql, params = []) {
  const res = await pool.query(convertSql(sql), params);
  return res.rows;
}

export async function lastInsertId(sqlWithReturning) {
  if (sqlWithReturning) {
    const res = await pool.query(convertSql(sqlWithReturning));
    return res.rows[0]?.id || 0;
  }
  // Generic last value fetch (warning: not thread safe for SERIAL without RETURNING)
  const res = await pool.query("SELECT lastval() as id");
  return res.rows[0]?.id || 0;
}

export async function logAction({ userId, action, entity, entityId, details }) {
  await pool.query(
    "INSERT INTO audit_log (user_id, action, entity, entity_id, details) VALUES ($1, $2, $3, $4, $5)",
    [userId || null, action, entity, entityId, details ? JSON.stringify(details) : null]
  );
}

export default {
  initDB,
  run,
  get,
  all,
  tx,
  logAction
};
