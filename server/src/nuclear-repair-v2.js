import { initDB, all, dbFilePath, run as serverRun } from "./db.js";
import fs from "fs";

(async () => {
  await initDB();
  console.log("FINAL NUCLEAR REPAIR V2: BACKING UP DATA...");
  
  // 1. Export all data
  const users = all("SELECT * FROM users");
  const settings = all("SELECT * FROM settings");
  const students = all("SELECT * FROM students");
  const subjects = all("SELECT * FROM subjects");
  const grades = all("SELECT * FROM grades");
  const payments = all("SELECT * FROM payments");
  const audit_log = all("SELECT * FROM audit_log");
  const auth = all("SELECT * FROM authorization");
  const seq = all("SELECT * FROM student_id_sequence") || [];
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
  // Table users
  for (const u of users) {
    if (u.role === 'viewer') continue;
    const cols = Object.keys(u).join(", ");
    const placeholders = Object.keys(u).map(() => "?").join(", ");
    const vals = Object.values(u);
    serverRun(`INSERT INTO users (${cols}) VALUES (${placeholders})`, vals);
  }
  console.log("- Restored existing users (filtered viewers).");
  
  // Rest of tables
  const tables = {
    settings, students, subjects, grades, payments, audit_log, authorization: auth,
    student_id_sequence: seq, semesters, user_permissions: user_perms
  };
  
  for (const [name, rows] of Object.entries(tables)) {
    for (const r of rows) {
      if (!r) continue;
      const cols = Object.keys(r).join(", ");
      const placeholders = Object.keys(r).map(() => "?").join(", ");
      const vals = Object.values(r);
      serverRun(`INSERT INTO ${name} (${cols}) VALUES (${placeholders})`, vals);
    }
    console.log(`- Restored ${rows.length} rows to ${name}`);
  }
  
  // 5. Explicitly ensure viewer permissions in auth table
  const viewerModules = ["students", "grades", "payments", "permits", "subjects", "attendance", "users", "audit_log", "settings", "dashboard", "schedule", "rooms", "*"];
  for (const m of viewerModules) {
    serverRun("INSERT OR IGNORE INTO authorization (role, module, can_read, can_write, can_delete) VALUES ('viewer', ?, 1, 0, 0)", [m]);
  }
  console.log("- Restored viewer permissions.");
  
  console.log("NUCLEAR REPAIR V2 COMPLETED SUCCESSFULLY.");
  process.exit(0);
})();
