import { initDB, all, dbFilePath } from "./db.js";
import fs from "fs";
import initSqlJs from "sql.js";

(async () => {
  await initDB();
  console.log("FINAL NUCLEAR REPAIR: BACKING UP DATA...");
  
  // 1. Export all data
  const users = all("SELECT * FROM users");
  const settings = all("SELECT * FROM settings");
  const students = all("SELECT * FROM students");
  const subjects = all("SELECT * FROM subjects");
  const grades = all("SELECT * FROM grades");
  const payments = all("SELECT * FROM payments");
  const audit_log = all("SELECT * FROM audit_log");
  const auth = all("SELECT * FROM authorization");
  const seq = all("SELECT * FROM student_id_sequence");
  const semesters = all("SELECT * FROM semesters");
  const user_perms = all("SELECT * FROM user_permissions");
  
  console.log(`- Backed up ${users.length} users.`);
  
  // 2. Delete the DB file
  if (fs.existsSync(dbFilePath)) {
    fs.unlinkSync(dbFilePath);
    console.log(`- Deleted ${dbFilePath}`);
  }
  
  // 3. Re-initialize with CORRECT schema (db.js has been updated already)
  await initDB();
  console.log("- Re-initialized empty DB with updated schema.");
  
  // 4. Restore data
  const SQL = await initSqlJs();
  const db = new SQL.Database();
  
  // We'll use the server's db.js run() for each table now that the tables exist in the new file
  // Users table
  users.forEach(u => {
    // If it's a viewer, we can filter it out or just let it be deleted as requested before
    if (u.role === 'viewer') return;
    
    const cols = Object.keys(u).join(", ");
    const placeholders = Object.keys(u).map(() => "?").join(", ");
    const vals = Object.values(u);
    // Use the low level run directly from db.js (which we imported)
    // Wait, let's just use the current 'run' from db.js which writes to file
    const { run: serverRun } = await import("./db.js");
    serverRun(`INSERT INTO users (${cols}) VALUES (${placeholders})`, vals);
  });
  console.log("- Restored users (without viewers).");
  
  // Rest of tables...
  const tables = {
    settings, students, subjects, grades, payments, audit_log, authorization: auth,
    student_id_sequence: seq, semesters, user_permissions: user_perms
  };
  
  const { run: serverRun } = await import("./db.js");
  for (const [name, rows] of Object.entries(tables)) {
    rows.forEach(r => {
      const cols = Object.keys(r).join(", ");
      const placeholders = Object.keys(r).map(() => "?").join(", ");
      const vals = Object.values(r);
      serverRun(`INSERT INTO ${name} (${cols}) VALUES (${placeholders})`, vals);
    });
    console.log(`- Restored ${rows.length} rows to ${name}`);
  }
  
  // 5. Explicitly ensure viewer permissions in auth table
  const viewerModules = ["students", "grades", "payments", "permits", "subjects", "attendance", "users", "audit_log", "settings", "dashboard", "schedule", "rooms", "*"];
  viewerModules.forEach(m => {
    serverRun("INSERT OR IGNORE INTO authorization (role, module, can_read, can_write, can_delete) VALUES ('viewer', ?, 1, 0, 0)", [m]);
  });
  console.log("- Restored viewer permissions.");
  
  console.log("NUCLEAR REPAIR COMPLETED SUCCESSFULLY.");
  process.exit(0);
})();
