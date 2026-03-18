import initSqlJs from "sql.js";
import fs from "fs";
import path from "path";

const dataDir = path.join("c:\\Users\\anneb\\OneDrive\\Desktop\\student-system\\server", "data");
const dbFilePath = path.join(dataDir, "app.sqlite");

console.log("Step 1: Loading sql.js...");
const SQL = await initSqlJs();
console.log("Step 2: sql.js loaded");

const buf = fs.existsSync(dbFilePath) ? fs.readFileSync(dbFilePath) : undefined;
console.log("Step 3: DB file read, size:", buf?.length || "new db");

const database = buf ? new SQL.Database(buf) : new SQL.Database();
console.log("Step 4: Database opened");

// Try the big SQL block in smaller chunks
const statements = [
  `PRAGMA foreign_keys = ON;`,
  `CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('student','teacher','developer','owner','saps','register','cashier')),
    user_type TEXT,
    student_id TEXT,
    deleted_at TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );`,
  `CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );`,
  `CREATE TABLE IF NOT EXISTS students (
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
  );`,
];

for (let i = 0; i < statements.length; i++) {
  try {
    database.run(statements[i]);
    console.log(`Step 5.${i}: Statement ${i} OK`);
  } catch (e) {
    console.error(`Step 5.${i}: Statement ${i} FAILED:`, e.message);
  }
}

// Now try the full big block from initDB
console.log("Step 6: Trying full multi-statement block...");
try {
  database.run(`
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
  `);
  console.log("Step 6: Multi-statement block OK");
} catch (e) {
  console.error("Step 6: Multi-statement block FAILED:", e.message);
}

// Test PRAGMA table_info
console.log("Step 7: Testing PRAGMA...");
try {
  const stmt = database.prepare("PRAGMA table_info('users')");
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  console.log("Step 7: PRAGMA OK, columns:", rows.map(r => r.name).join(", "));
} catch (e) {
  console.error("Step 7: PRAGMA FAILED:", e.message);
}

console.log("Step 8: All tests done, closing...");
database.close();
console.log("Done!");
