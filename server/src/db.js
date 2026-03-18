import fs from "fs";
import path from "path";
import initSqlJs from "sql.js";

import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// DB is in server/src/db.js, data should be in server/data
const dataDir = path.join(__dirname, "..", "data");

if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
export const dbFilePath = path.join(dataDir, "app.sqlite");

let SQL;
let database;

export async function initDB() {
  SQL = await initSqlJs();
  const buf = fs.existsSync(dbFilePath) ? fs.readFileSync(dbFilePath) : undefined;
  database = buf ? new SQL.Database(buf) : new SQL.Database();
  database.run(`
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL COLLATE NOCASE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('student','teacher','developer','owner','saps','register','cashier')),
      user_type TEXT,
      student_id TEXT COLLATE NOCASE,
      full_name TEXT,
      deleted_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );
    CREATE TABLE IF NOT EXISTS students (
      id TEXT PRIMARY KEY COLLATE NOCASE,
      name TEXT NOT NULL,
      course TEXT NOT NULL,
      year TEXT NOT NULL,
      birth_year TEXT,
      email TEXT NOT NULL,
      status TEXT NOT NULL,
      permit_number INTEGER,
      tuition_balance REAL DEFAULT 0,
      deleted_at TEXT
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
      deleted_at TEXT
    );
    CREATE TABLE IF NOT EXISTS grades (
      student_id TEXT NOT NULL,
      subject_id TEXT NOT NULL,
      prelim INTEGER,
      midterm INTEGER,
      prefinal INTEGER,
      final INTEGER,
      deleted_at TEXT,
      PRIMARY KEY (student_id, subject_id),
      FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
      FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id TEXT NOT NULL,
      amount REAL NOT NULL,
      reference TEXT,
      method TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      action TEXT NOT NULL,
      entity TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      details TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
    CREATE TABLE IF NOT EXISTS student_id_sequence (
      year TEXT PRIMARY KEY,
      last INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS semesters (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_year TEXT NOT NULL,
      term TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (school_year, term)
    );
    CREATE TABLE IF NOT EXISTS permit_periods (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      semester_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      sort_order INTEGER NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (semester_id, name),
      FOREIGN KEY (semester_id) REFERENCES semesters(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS student_permits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id TEXT NOT NULL,
      permit_period_id INTEGER NOT NULL,
      permit_number TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT,
      UNIQUE (student_id, permit_period_id),
      FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
      FOREIGN KEY (permit_period_id) REFERENCES permit_periods(id) ON DELETE CASCADE
    );
    CREATE TRIGGER IF NOT EXISTS trg_softdel_student_grades
    AFTER UPDATE OF deleted_at ON students
    WHEN NEW.deleted_at IS NOT NULL
    BEGIN
      UPDATE grades SET deleted_at = COALESCE(deleted_at, CURRENT_TIMESTAMP)
      WHERE student_id = NEW.id AND deleted_at IS NULL;
    END;
    CREATE TRIGGER IF NOT EXISTS trg_softdel_subject_grades
    AFTER UPDATE OF deleted_at ON subjects
    WHEN NEW.deleted_at IS NOT NULL
    BEGIN
      UPDATE grades SET deleted_at = COALESCE(deleted_at, CURRENT_TIMESTAMP)
      WHERE subject_id = NEW.id AND deleted_at IS NULL;
    END;

    -- Sync permit_number triggers
    CREATE TRIGGER IF NOT EXISTS trg_sync_student_permit_insert
    AFTER INSERT ON student_permits
    BEGIN
      UPDATE students
      SET permit_number = CAST(NEW.permit_number AS INTEGER)
      WHERE id = NEW.student_id;
    END;
    CREATE TRIGGER IF NOT EXISTS trg_sync_student_permit_update
    AFTER UPDATE ON student_permits
    BEGIN
      UPDATE students
      SET permit_number = CAST(NEW.permit_number AS INTEGER)
      WHERE id = NEW.student_id;
    END;
    CREATE TRIGGER IF NOT EXISTS trg_sync_student_permit_delete
    AFTER DELETE ON student_permits
    BEGIN
      UPDATE students
      SET permit_number = (
        SELECT CAST(permit_number AS INTEGER)
        FROM student_permits
        WHERE student_id = OLD.student_id
        ORDER BY id DESC
        LIMIT 1
      )
      WHERE id = OLD.student_id;
    END;
    CREATE TABLE IF NOT EXISTS authorization (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
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
    -- Attendance management
    CREATE TABLE IF NOT EXISTS attendance_tables (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      course_name TEXT NOT NULL,
      block_number TEXT NOT NULL,
      subject_id TEXT,
      semester_id INTEGER,
      time_slot TEXT CHECK(time_slot IN ('Morning Class','Afternoon Class','Evening Class')),
      term_period TEXT CHECK(term_period IN ('1st prelim','2nd prelim','midterm','semi-final','final prelim')),
      created_by_teacher_id TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS attendance_enrollments (
      table_id INTEGER NOT NULL,
      student_id TEXT NOT NULL,
      created_by_teacher_id TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (table_id, student_id),
      FOREIGN KEY (table_id) REFERENCES attendance_tables(id) ON DELETE CASCADE,
      FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS attendance_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      table_id INTEGER NOT NULL,
      student_id TEXT NOT NULL,
      date TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('present','absent','late','excuse')),
      created_by_teacher_id TEXT NOT NULL,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (table_id, student_id, date),
      FOREIGN KEY (table_id) REFERENCES attendance_tables(id) ON DELETE CASCADE,
      FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
    );
  `);

  // Seed default semesters and periods if empty
  const semCount = get("SELECT COUNT(*) as c FROM semesters");
  if (semCount && semCount.c === 0) {
    const sems = [
      { sy: "2025-2026", term: "1st Semester" },
      { sy: "2025-2026", term: "2nd Semester" }
    ];
    const periods = ["First Prelim", "Second Prelim", "Midterm", "Semi-Final", "Final"];
    
    for (const s of sems) {
      run("INSERT INTO semesters (school_year, term) VALUES (?,?)", [s.sy, s.term]);
      const semId = lastInsertId();
      for (let i = 0; i < periods.length; i++) {
        run("INSERT INTO permit_periods (semester_id, name, sort_order) VALUES (?,?,?)", [semId, periods[i], i + 1]);
      }
    }
  }

  // Migrate students columns if existing DB lacks them
  try {
    const scols = all(`PRAGMA table_info('students')`).map(r => r.name);
    if (!scols.includes("permit_number")) {
      run("ALTER TABLE students ADD COLUMN permit_number INTEGER");
    }
    if (!scols.includes("tuition_balance")) {
      run("ALTER TABLE students ADD COLUMN tuition_balance REAL DEFAULT 0");
    }
    if (!scols.includes("birth_year")) {
      run("ALTER TABLE students ADD COLUMN birth_year TEXT");
    }
    if (!scols.includes("enrollment_year")) {
      run("ALTER TABLE students ADD COLUMN enrollment_year TEXT");
    }
    if (!scols.includes("program_years")) {
      run("ALTER TABLE students ADD COLUMN program_years INTEGER");
    }
  } catch {}
  // Migrate subjects columns if existing DB lacks semester linkage
  try {
    const subcols = all(`PRAGMA table_info('subjects')`).map(r => r.name);
    if (!subcols.includes("semester_id")) {
      run("ALTER TABLE subjects ADD COLUMN semester_id INTEGER");
    }
    if (!subcols.includes("time")) {
      run("ALTER TABLE subjects ADD COLUMN time TEXT");
    }
    if (!subcols.includes("campus")) {
      run("ALTER TABLE subjects ADD COLUMN campus TEXT");
    }
  } catch {}
  // Ensure attendance permissions exist for teacher and student
  try {
    const attTeacher = get("SELECT 1 FROM authorization WHERE role='teacher' AND module='attendance'");
    if (!attTeacher) {
      run("INSERT INTO authorization (role,module,can_read,can_write,can_delete) VALUES ('teacher','attendance',1,1,1)");
    }
    const attStudent = get("SELECT 1 FROM authorization WHERE role='student' AND module='attendance'");
    if (!attStudent) {
      run("INSERT INTO authorization (role,module,can_read,can_write,can_delete) VALUES ('student','attendance',1,0,0)");
    }
  } catch {}
  // Enforce teacher cannot delete subjects (RBAC hardening)
  try {
    run("UPDATE authorization SET can_delete=0 WHERE role='teacher' AND module='subjects'");
  } catch {}
  // Migrate student_permits columns if missing
  try {
    const pcols = all(`PRAGMA table_info('student_permits')`).map(r => r.name);
    if (!pcols.includes("issue_date")) {
      run("ALTER TABLE student_permits ADD COLUMN issue_date TEXT");
    }
    if (!pcols.includes("expiry_date")) {
      run("ALTER TABLE student_permits ADD COLUMN expiry_date TEXT");
    }
    if (!pcols.includes("status")) {
      run("ALTER TABLE student_permits ADD COLUMN status TEXT");
      // Optional: backfill status as 'active' for existing rows
      run("UPDATE student_permits SET status = COALESCE(status, 'active')");
    }
    // Backfill permit_number if null using the row id as a stable surrogate
    run("UPDATE student_permits SET permit_number = COALESCE(permit_number, id)");
  } catch {}
  // Permit number global sequence (auto-increment)
  try {
    run(`
      CREATE TABLE IF NOT EXISTS permit_number_sequence (
        id INTEGER PRIMARY KEY CHECK(id = 1),
        last INTEGER NOT NULL DEFAULT 0
      )
    `);
    const seq = get("SELECT last FROM permit_number_sequence WHERE id=1");
    if (!seq) {
      const maxNumRow = get("SELECT MAX(CAST(permit_number AS INTEGER)) as m FROM student_permits");
      const maxIdRow = get("SELECT MAX(id) as m FROM student_permits");
      const maxVal = Math.max(Number(maxNumRow?.m || 0), Number(maxIdRow?.m || 0));
      run("INSERT INTO permit_number_sequence (id,last) VALUES (1,?)", [maxVal]);
    }
    // Ensure students.permit_number reflects the latest permit_number per student
    run(`
      UPDATE students
      SET permit_number = (
        SELECT CAST(permit_number AS INTEGER)
        FROM student_permits
        WHERE student_id = students.id
        ORDER BY id DESC
        LIMIT 1
      )
      WHERE EXISTS (
        SELECT 1 FROM student_permits WHERE student_id = students.id
      )
    `);
  } catch {}
  // Payments: add status column for visibility when needed
  try {
    const paycols = all(`PRAGMA table_info('payments')`).map(r => r.name);
    if (!paycols.includes("status")) {
      run("ALTER TABLE payments ADD COLUMN status TEXT");
      run("UPDATE payments SET status = COALESCE(status, 'posted')");
    }
  } catch {}
  // Migration: add user_type and deleted_at if missing; backfill
  const cols = all(`PRAGMA table_info('users')`).map(r => r.name);
  if (!cols.includes("user_type")) {
    run("ALTER TABLE users ADD COLUMN user_type TEXT");
  }
  if (!cols.includes("student_id")) {
    run("ALTER TABLE users ADD COLUMN student_id TEXT");
  }
  if (!cols.includes("deleted_at")) {
    run("ALTER TABLE users ADD COLUMN deleted_at TEXT");
  }
  if (!cols.includes("full_name")) {
    run("ALTER TABLE users ADD COLUMN full_name TEXT");
  }
  // Add uuid for teachers/developers/owners for row-level isolation context
  if (!cols.includes("uuid")) {
    run("ALTER TABLE users ADD COLUMN uuid TEXT");
    // Backfill UUIDs for existing users
    const users = all("SELECT id, role, uuid FROM users");
    for (const u of users) {
      if (!u.uuid) {
        // Generate pseudo-UUID using SQL.js functions by proxying through JS
        const gen = (typeof globalThis.crypto?.randomUUID === "function") ? globalThis.crypto.randomUUID() : `${Date.now()}-${Math.random()}`.replace(/\./g,"");
        run("UPDATE users SET uuid=? WHERE id=?", [gen, u.id]);
      }
    }
  }
  // Attendance columns migration for existing databases
  try {
    const attCols = all(`PRAGMA table_info('attendance_tables')`);
    const names = attCols.map(c => c.name);
    if (!names.includes("subject_id")) run("ALTER TABLE attendance_tables ADD COLUMN subject_id TEXT");
    if (!names.includes("semester_id")) run("ALTER TABLE attendance_tables ADD COLUMN semester_id INTEGER");
    if (!names.includes("time_slot")) run("ALTER TABLE attendance_tables ADD COLUMN time_slot TEXT");
    if (!names.includes("term_period")) run("ALTER TABLE attendance_tables ADD COLUMN term_period TEXT");
    if (!names.includes("created_by_teacher_id")) run("ALTER TABLE attendance_tables ADD COLUMN created_by_teacher_id TEXT");
    // If the legacy column academic_year exists, migrate to new table without it
    if (names.includes("academic_year") || names.includes("class_identifier")) {
      tx(() => {
        run(`
          CREATE TABLE IF NOT EXISTS attendance_tables__new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            course_name TEXT NOT NULL,
            block_number TEXT NOT NULL,
            subject_id TEXT,
            semester_id INTEGER,
            time_slot TEXT CHECK(time_slot IN ('Morning Class','Afternoon Class','Evening Class')),
            term_period TEXT CHECK(term_period IN ('1st prelim','2nd prelim','midterm','semi-final','final prelim')),
            created_by_teacher_id TEXT NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
          )
        `);
        run(`
          INSERT INTO attendance_tables__new (id, course_name, block_number, subject_id, semester_id, time_slot, term_period, created_by_teacher_id, created_at)
          SELECT id, course_name, block_number, subject_id, semester_id, COALESCE(time_slot, 'Morning Class'), NULL, COALESCE(created_by_teacher_id, ''), created_at
          FROM attendance_tables
        `);
        run("DROP TABLE attendance_tables");
        run("ALTER TABLE attendance_tables__new RENAME TO attendance_tables");
      });
    }
    const enrCols = all(`PRAGMA table_info('attendance_enrollments')`).map(c => c.name);
    if (!enrCols.includes("created_by_teacher_id")) run("ALTER TABLE attendance_enrollments ADD COLUMN created_by_teacher_id TEXT");
    const recCols = all(`PRAGMA table_info('attendance_records')`).map(c => c.name);
    if (!recCols.includes("created_by_teacher_id")) run("ALTER TABLE attendance_records ADD COLUMN created_by_teacher_id TEXT");
  } catch {}

  // Create attendance indexes after ensuring columns exist
  try {
    database.run(`
      CREATE INDEX IF NOT EXISTS idx_att_tables_teacher ON attendance_tables(created_by_teacher_id);
      CREATE INDEX IF NOT EXISTS idx_att_enroll_teacher ON attendance_enrollments(created_by_teacher_id);
      CREATE INDEX IF NOT EXISTS idx_att_records_teacher ON attendance_records(created_by_teacher_id);
    `);
  } catch {}

  // Backfill user_type = role for student/teacher; null for developer
  run("UPDATE users SET user_type = CASE WHEN role IN ('student','teacher') THEN role ELSE NULL END WHERE user_type IS NULL");
  // Ensure new roles are allowed and UNIQUE constraint is removed
  try {
    const indices = all("PRAGMA index_list('users')");
    for (const idx of indices) {
      if (idx.unique === 1) {
        const cols = all(`PRAGMA index_info('${idx.name}')`);
        if (cols.some(c => c.name === 'username')) {
          throw new Error("Rebuild needed to remove UNIQUE username");
        }
      }
    }
    run("INSERT INTO users (username,password_hash,role) VALUES (?,?,?)", ["__role_check_expand__", "x", "saps"]);
    run("DELETE FROM users WHERE username=?", ["__role_check_expand__"]);
  } catch {
    // Rebuild users table to expand CHECK constraint
    database.run(`
      PRAGMA foreign_keys=OFF;
      BEGIN TRANSACTION;
      CREATE TABLE IF NOT EXISTS users_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('student','teacher','developer','owner','saps','register','cashier')),
        user_type TEXT,
        student_id TEXT,
        deleted_at TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
      INSERT INTO users_new (id, username, password_hash, role, user_type, student_id, deleted_at, created_at)
      SELECT id, username, password_hash, role, user_type, student_id, deleted_at, created_at FROM users;
      DROP TABLE users;
      ALTER TABLE users_new RENAME TO users;
      COMMIT;
      PRAGMA foreign_keys=ON;
    `);
  }

  // Auxiliary table: user_files for automated file management
  database.run(`
    CREATE TABLE IF NOT EXISTS user_files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      rel_path TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      deleted_at TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);
  // Ensure role supports 'owner' by rebuild if needed
  try {
    run("INSERT INTO users (username,password_hash,role) VALUES (?,?,?)", ["__owner_check__", "x", "owner"]);
    run("DELETE FROM users WHERE username=?", ["__owner_check__"]);
  } catch {
    // Skip rebuild to avoid FK issues; assume existing table is sufficient
  }
  try {
    const testUser = get("SELECT 1 as x FROM users WHERE username = ?", ["__role_test__"]);
    if (!testUser) {
      run("INSERT INTO users (username,password_hash,role) VALUES (?,?,?)", ["__role_test__", "x", "developer"]);
      run("DELETE FROM users WHERE username = ?", ["__role_test__"]);
    }
  } catch {
    // Skip rebuild if constraint prevents it
  }

  // Rebuild grades table to allow NULL scores if previous schema had NOT NULL
  try {
    const gcols = all(`PRAGMA table_info('grades')`);
    const mustRebuild = gcols.some(c => ["prelim","midterm","prefinal","final"].includes(c.name) && c.notnull === 1);
    if (mustRebuild) {
      database.run(`
        PRAGMA foreign_keys=OFF;
        BEGIN TRANSACTION;
        CREATE TABLE IF NOT EXISTS grades_new (
          student_id TEXT NOT NULL,
          subject_id TEXT NOT NULL,
          prelim INTEGER,
          midterm INTEGER,
          prefinal INTEGER,
          final INTEGER,
          deleted_at TEXT,
          PRIMARY KEY (student_id, subject_id)
        );
        INSERT INTO grades_new (student_id, subject_id, prelim, midterm, prefinal, final, deleted_at)
        SELECT student_id, subject_id, prelim, midterm, prefinal, final, deleted_at FROM grades;
        DROP TABLE grades;
        ALTER TABLE grades_new RENAME TO grades;
        COMMIT;
        PRAGMA foreign_keys=ON;
      `);
    }
  } catch {}

  persist();
}

function persist() {
  const data = database.export();
  fs.writeFileSync(dbFilePath, Buffer.from(data));
}

export function tx(fn) {
  const result = fn({ run, get, all });
  persist();
  return result;
}

export function run(sql, params = []) {
  const stmt = database.prepare(sql);
  stmt.run(params);
  stmt.free();
}

export function get(sql, params = []) {
  const stmt = database.prepare(sql);
  stmt.bind(params);
  const has = stmt.step();
  const row = has ? stmt.getAsObject() : null;
  stmt.free();
  return row;
}

export function all(sql, params = []) {
  const stmt = database.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

export function lastInsertId() {
  const row = get("SELECT last_insert_rowid() AS id");
  return row?.id || 0;
}

export function logAction({ userId, action, entity, entityId, details }) {
  run(
    "INSERT INTO audit_log (user_id, action, entity, entity_id, details) VALUES (?, ?, ?, ?, ?)",
    [userId || null, action, entity, entityId, details ? JSON.stringify(details) : null]
  );
  persist();
}

export default {
  initDB,
  run,
  get,
  all,
  tx
};
