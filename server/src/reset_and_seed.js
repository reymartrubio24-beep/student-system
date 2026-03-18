import bcrypt from "bcryptjs";
import { initDB, run, tx, get } from "./db.js";

async function resetAndSeed() {
  console.log("Starting full system reset...");
  await initDB();

  tx(() => {
    // 1. Wipe all data tables
    const tables = [
      "students",
      "users",
      "grades",
      "payments",
      "student_permits",
      "attendance_tables",
      "attendance_records",
      "attendance_enrollments",
      "authorization",
      "user_permissions",
      "audit_log",
      "settings",
      "student_id_sequence",
      "semesters",
      "permit_periods",
      "user_files"
    ];

    for (const table of tables) {
      try {
        run(`DELETE FROM ${table}`);
        console.log(`Wiped table: ${table}`);
      } catch (e) {
        console.warn(`Could not wipe table ${table}: ${e.message}`);
      }
    }

    // 2. Create the Owner user
    const username = "owner";
    const password = "123123";
    const hash = bcrypt.hashSync(password, 10);
    
    run(
      "INSERT INTO users (username, password_hash, role, user_type) VALUES (?, ?, ?, ?)",
      [username, hash, "owner", "owner"]
    );
    console.log(`Created user: ${username} (role: owner)`);

    // 3. Initialize settings
    run("INSERT INTO settings (key, value) VALUES ('owner_initialized', '1')");

    // 4. Seed basic RBAC roles (as fallback)
    const permissions = [
      { role: "register", module: "students",     can_read: 1, can_write: 1, can_delete: 1 },
      { role: "register", module: "subjects",     can_read: 1, can_write: 1, can_delete: 1 },
      { role: "register", module: "grades",       can_read: 1, can_write: 1, can_delete: 1 },
      { role: "register", module: "payments",     can_read: 1, can_write: 1, can_delete: 1 },
      { role: "register", module: "search",       can_read: 1, can_write: 0, can_delete: 0 },

      { role: "cashier",  module: "students",     can_read: 1, can_write: 1, can_delete: 1 },
      { role: "cashier",  module: "permits",      can_read: 1, can_write: 1, can_delete: 1 },
      { role: "cashier",  module: "payments",     can_read: 1, can_write: 1, can_delete: 1 },
      { role: "cashier",  module: "search",       can_read: 1, can_write: 0, can_delete: 0 },

      { role: "saps",     module: "students",     can_read: 1, can_write: 1, can_delete: 1 },
      { role: "saps",     module: "subjects",     can_read: 1, can_write: 1, can_delete: 1 },
      { role: "saps",     module: "grades",       can_read: 1, can_write: 1, can_delete: 1 },
      { role: "saps",     module: "permits",      can_read: 1, can_write: 1, can_delete: 1 },
      { role: "saps",     module: "payments",     can_read: 1, can_write: 1, can_delete: 1 },
      { role: "saps",     module: "search",       can_read: 1, can_write: 0, can_delete: 0 },

      { role: "teacher",  module: "dashboard",    can_read: 1, can_write: 0, can_delete: 0 },
      { role: "teacher",  module: "students",     can_read: 1, can_write: 1, can_delete: 1 },
      { role: "teacher",  module: "subjects",     can_read: 1, can_write: 1, can_delete: 0 },
      { role: "teacher",  module: "grades",       can_read: 1, can_write: 1, can_delete: 1 },
      { role: "teacher",  module: "search",       can_read: 1, can_write: 0, can_delete: 0 },
      { role: "teacher",  module: "attendance",   can_read: 1, can_write: 1, can_delete: 1 },

      { role: "student",  module: "dashboard",    can_read: 1, can_write: 0, can_delete: 0 },
      { role: "student",  module: "grades",       can_read: 1, can_write: 0, can_delete: 0 },
      { role: "student",  module: "permits",      can_read: 1, can_write: 0, can_delete: 0 },
      { role: "student",  module: "payments",     can_read: 1, can_write: 0, can_delete: 0 },
      { role: "student",  module: "profile",      can_read: 1, can_write: 1, can_delete: 0 },
      { role: "student",  module: "attendance",   can_read: 1, can_write: 0, can_delete: 0 }
    ];

    for (const p of permissions) {
      run(`
        INSERT INTO authorization (role, module, can_read, can_write, can_delete)
        VALUES (?, ?, ?, ?, ?)
      `, [p.role, p.module, p.can_read, p.can_write, p.can_delete]);
    }
    console.log("Seeded basic RBAC permissions.");

    // 5. Initialize default semesters (as in db.js)
    const sems = [
      { sy: "2025-2026", term: "1st Semester" },
      { sy: "2025-2026", term: "2nd Semester" }
    ];
    const periods = ["First Prelim", "Second Prelim", "Midterm", "Semi-Final", "Final"];
    
    for (const s of sems) {
      run("INSERT INTO semesters (school_year, term) VALUES (?,?)", [s.sy, s.term]);
      const lastIdRow = get("SELECT last_insert_rowid() AS id");
      const semId = lastIdRow?.id || 0;
      for (let i = 0; i < periods.length; i++) {
        run("INSERT INTO permit_periods (semester_id, name, sort_order) VALUES (?,?,?)", [semId, periods[i], i + 1]);
      }
    }
    console.log("Seeded default semesters and periods.");
  });

  console.log("Reset and seeding completed successfully.");
}

resetAndSeed().then(() => process.exit(0)).catch(e => {
  console.error("Critical error during reset:", e);
  process.exit(1);
});
