
import bcrypt from "bcryptjs";
import { initDB, run, get, tx } from "../src/db.js";

async function seed() {
  console.log("Seeding test data...");
  await initDB();

  const password = "password";
  const hash = bcrypt.hashSync(password, 10);

  tx(() => {
    // 1. Create a Semester
    run("INSERT OR IGNORE INTO settings (key, value) VALUES ('current_semester', '1')");
    
    // 2. Create a Student Record
    const sid = "2024-0001";
    run("INSERT OR REPLACE INTO students (id, name, course, year, email, status, birth_year) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [sid, "Belen, Maria", "BSCS", "1", "maria.belen@example.com", "Active", "2006"]);

    // 3. Create a Student User
    run("INSERT OR REPLACE INTO users (username, password_hash, role, user_type, student_id) VALUES (?, ?, ?, ?, ?)",
      ["belen", hash, "student", "student", sid]);

    // 4. Create a Teacher User
    run("INSERT OR REPLACE INTO users (username, password_hash, role, user_type) VALUES (?, ?, ?, ?)",
      ["teacher1", hash, "teacher", "teacher"]);

    // 5. Create a Cashier User
    run("INSERT OR REPLACE INTO users (username, password_hash, role, user_type) VALUES (?, ?, ?, ?)",
      ["cashier1", hash, "cashier", "cashier"]);

    // 6. Create a Register User
    run("INSERT OR REPLACE INTO users (username, password_hash, role, user_type) VALUES (?, ?, ?, ?)",
      ["register1", hash, "register", "register"]);

    // 7. Create a Subject
    const subId = "CS101";
    run("INSERT OR REPLACE INTO subjects (id, name, units, professor, schedule, room) VALUES (?, ?, ?, ?, ?, ?)",
      [subId, "Introduction to Computer Science", 3, "Dr. Smith", "MWF 9-10AM", "Room 101"]);

    // 8. Create a Grade
    run("INSERT OR REPLACE INTO grades (student_id, subject_id, prelim, midterm, prefinal, final) VALUES (?, ?, ?, ?, ?, ?)",
      [sid, subId, 85, 88, 90, 92]);

    // 9. Create a Payment
    run("INSERT OR REPLACE INTO payments (student_id, amount, method, reference, status) VALUES (?, ?, ?, ?, ?)",
      [sid, 5000, "Cash", "REF12345", "posted"]);

    console.log("Seed complete:");
    console.log("- Student: belen / password (ID: 2024-0001)");
    console.log("- Teacher: teacher1 / password");
    console.log("- Cashier: cashier1 / password");
    console.log("- Register: register1 / password");
  });
}

seed().catch(console.error);
