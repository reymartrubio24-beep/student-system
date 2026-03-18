import initSqlJs from "sql.js";
import fs from "fs";
import path from "path";

const dataDir = path.join(process.cwd(), "data");
const dbFilePath = path.join(dataDir, "app.sqlite");

const SQL = await initSqlJs();
const buf = fs.existsSync(dbFilePath) ? fs.readFileSync(dbFilePath) : undefined;
const database = buf ? new SQL.Database(buf) : new SQL.Database();
console.log("DB opened, size:", buf?.length || "fresh");

// Test 1: Run the EXACT same multi-statement block from db.js 
console.log("\n--- Test 1: Full multi-statement block ---");
try {
  database.run(`
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('student','teacher','developer','owner','saps','register','cashier')),
      user_type TEXT,
      student_id TEXT,
      deleted_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
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
    CREATE INDEX IF NOT EXISTS idx_att_tables_teacher ON attendance_tables(created_by_teacher_id);
    CREATE INDEX IF NOT EXISTS idx_att_enroll_teacher ON attendance_enrollments(created_by_teacher_id);
    CREATE INDEX IF NOT EXISTS idx_att_records_teacher ON attendance_records(created_by_teacher_id);
  `);
  console.log("Test 1: OK");
} catch (e) {
  console.error("Test 1 FAIL:", e.message);
}

// Test 2: CHECK constraint expansion
console.log("\n--- Test 2: CHECK constraint expansion ---");
try {
  database.run("INSERT INTO users (username,password_hash,role) VALUES ('__role_check_expand__','x','saps')");
  database.run("DELETE FROM users WHERE username='__role_check_expand__'");
  console.log("Test 2a: saps role allowed, no rebuild needed");
} catch (e) {
  console.log("Test 2a: saps role rejected, rebuilding...", e.message);
  try {
    database.run(`
      PRAGMA foreign_keys=OFF;
      BEGIN TRANSACTION;
      CREATE TABLE IF NOT EXISTS users_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
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
    console.log("Test 2b: Rebuild OK");
  } catch (e2) {
    console.error("Test 2b: Rebuild FAIL:", e2.message);
  }
}

// Test 3: user_files table
console.log("\n--- Test 3: user_files ---");
try {
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
  console.log("Test 3: OK");
} catch (e) {
  console.error("Test 3 FAIL:", e.message);
}

// Test 4: owner CHECK 
console.log("\n--- Test 4: owner CHECK ---");
try {
  database.run("INSERT INTO users (username,password_hash,role) VALUES ('__owner_check__','x','owner')");
  database.run("DELETE FROM users WHERE username='__owner_check__'");
  console.log("Test 4: OK");
} catch (e) {
  console.error("Test 4 FAIL:", e.message);
}

console.log("\nAll done, closing...");
database.close();
console.log("DONE");
