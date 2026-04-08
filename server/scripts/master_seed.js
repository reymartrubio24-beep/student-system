
import bcrypt from "bcryptjs";
import { initDB, run, get, all, tx } from "../src/db.js";

async function main() {
  console.log("Starting master seed...");
  await initDB();

  const password = "password";
  const hash = bcrypt.hashSync(password, 10);

  const permissions = [
    { role: "register", module: "students", can_read: 1, can_write: 1, can_delete: 1 },
    { role: "register", module: "subjects", can_read: 1, can_write: 1, can_delete: 1 },
    { role: "register", module: "grades", can_read: 1, can_write: 1, can_delete: 1 },
    { role: "register", module: "payments", can_read: 1, can_write: 1, can_delete: 1 },
    { role: "register", module: "search", can_read: 1, can_write: 0, can_delete: 0 },
    { role: "cashier", module: "students", can_read: 1, can_write: 1, can_delete: 1 },
    { role: "cashier", module: "permits", can_read: 1, can_write: 1, can_delete: 1 },
    { role: "cashier", module: "payments", can_read: 1, can_write: 1, can_delete: 1 },
    { role: "cashier", module: "search", can_read: 1, can_write: 0, can_delete: 0 },
    { role: "saps", module: "students", can_read: 1, can_write: 1, can_delete: 1 },
    { role: "saps", module: "subjects", can_read: 1, can_write: 1, can_delete: 1 },
    { role: "saps", module: "grades", can_read: 1, can_write: 1, can_delete: 1 },
    { role: "saps", module: "permits", can_read: 1, can_write: 1, can_delete: 1 },
    { role: "saps", module: "payments", can_read: 1, can_write: 1, can_delete: 1 },
    { role: "saps", module: "search", can_read: 1, can_write: 0, can_delete: 0 },
    { role: "teacher", module: "dashboard", can_read: 1, can_write: 0, can_delete: 0 },
    { role: "teacher", module: "students", can_read: 1, can_write: 1, can_delete: 1 },
    { role: "teacher", module: "subjects", can_read: 1, can_write: 1, can_delete: 1 },
    { role: "teacher", module: "grades", can_read: 1, can_write: 1, can_delete: 1 },
    { role: "teacher", module: "search", can_read: 1, can_write: 0, can_delete: 0 },
    { role: "teacher", module: "permits", can_read: 1, can_write: 0, can_delete: 0 },
    { role: "teacher", module: "attendance", can_read: 1, can_write: 1, can_delete: 1 },
    { role: "student", module: "dashboard", can_read: 1, can_write: 0, can_delete: 0 },
    { role: "student", module: "grades", can_read: 1, can_write: 0, can_delete: 0 },
    { role: "student", module: "permits", can_read: 1, can_write: 0, can_delete: 0 },
    { role: "student", module: "payments", can_read: 1, can_write: 0, can_delete: 0 },
    { role: "student", module: "profile", can_read: 1, can_write: 1, can_delete: 0 },
    { role: "student", module: "attendance", can_read: 1, can_write: 0, can_delete: 0 },
    { role: "developer", module: "*", can_read: 1, can_write: 1, can_delete: 1 }
  ];

  tx(() => {
    // 1. Settings
    run("INSERT OR REPLACE INTO settings (key, value) VALUES ('owner_initialized', '1')");
    run("INSERT OR REPLACE INTO settings (key, value) VALUES ('current_semester', '1')");

    // 2. Authorization
    run("DELETE FROM authorization");
    for (const p of permissions) {
      run("INSERT INTO authorization (role, module, can_read, can_write, can_delete) VALUES (?, ?, ?, ?, ?)",
        [p.role, p.module, p.can_read, p.can_write, p.can_delete]);
    }

    // Clear Attendance
    run("DELETE FROM attendance_records");
    run("DELETE FROM attendance_enrollments");
    run("DELETE FROM attendance_tables");

    // 3. Students
    const sid = "2024-0001";
    run("INSERT OR REPLACE INTO students (id, name, course, year, email, status, birth_year) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [sid, "Belen, Maria", "BSCS", "1", "maria.belen@example.com", "Active", "2006"]);

    // 4. Users
    // Clear users except maybe owner, but let's just REPLACE
    const users = [
      { u: 'owner', p: '123123', r: 'owner', ut: 'developer', sid: null },
      { u: 'belen', p: 'password', r: 'student', ut: 'student', sid: sid },
      { u: 'teacher1', p: 'password', r: 'teacher', ut: 'teacher', sid: null },
      { u: 'cashier1', p: 'password', r: 'cashier', ut: 'cashier', sid: null },
      { u: 'register1', p: 'password', r: 'register', ut: 'register', sid: null }
    ];
    
    // We can't easily REPLACE into users due to incremental ID, so DELETE and INSERT
    run("DELETE FROM users");
    for (const u of users) {
      const h = bcrypt.hashSync(u.p, 10);
      run("INSERT INTO users (username, password_hash, role, user_type, student_id) VALUES (?, ?, ?, ?, ?)",
        [u.u, h, u.r, u.ut, u.sid]);
    }

    // 5. Subjects & Grades
    const subId = "CS101";
    run("INSERT OR REPLACE INTO subjects (id, name, units, professor, schedule, room) VALUES (?, ?, ?, ?, ?, ?)",
      [subId, "Introduction to Computer Science", 3, "Dr. Smith", "MWF 9-10AM", "Room 101"]);
    
    run("INSERT OR REPLACE INTO grades (student_id, subject_id, prelim, midterm, prefinal, final) VALUES (?, ?, ?, ?, ?, ?)",
      [sid, subId, 85, 88, 90, 92]);

    // 6. Payments
    run("INSERT OR REPLACE INTO payments (student_id, amount, method, reference, status) VALUES (?, ?, ?, ?, ?)",
      [sid, 5000, "Cash", "REF12345", "posted"]);
  });

  console.log("Master seed complete.");
}

main().catch(console.error);
