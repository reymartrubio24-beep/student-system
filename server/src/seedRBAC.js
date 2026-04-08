import { initDB, run, tx } from "./db.js";

const permissions = [
  // Register: Student search, Students, Subjects, Grades, Payment
  { role: "register", module: "students",     can_read: 1, can_write: 1, can_delete: 1 },
  { role: "register", module: "subjects",     can_read: 1, can_write: 1, can_delete: 1 },
  { role: "register", module: "grades",       can_read: 1, can_write: 1, can_delete: 1 },
  { role: "register", module: "payments",     can_read: 1, can_write: 1, can_delete: 1 },
  { role: "register", module: "search",       can_read: 1, can_write: 0, can_delete: 0 }, // Search is mostly read-only view

  // Cashier: Student search, Students, Student permit, Payment
  { role: "cashier",  module: "students",     can_read: 1, can_write: 1, can_delete: 1 },
  { role: "cashier",  module: "permits",      can_read: 1, can_write: 1, can_delete: 1 },
  { role: "cashier",  module: "payments",     can_read: 1, can_write: 1, can_delete: 1 },
  { role: "cashier",  module: "search",       can_read: 1, can_write: 0, can_delete: 0 },

  // SAPS: Student search, Students, Subjects, Grades, Student permit, Payment
  { role: "saps",     module: "students",     can_read: 1, can_write: 1, can_delete: 1 },
  { role: "saps",     module: "subjects",     can_read: 1, can_write: 1, can_delete: 1 },
  { role: "saps",     module: "grades",       can_read: 1, can_write: 1, can_delete: 1 },
  { role: "saps",     module: "permits",      can_read: 1, can_write: 1, can_delete: 1 },
  { role: "saps",     module: "payments",     can_read: 1, can_write: 1, can_delete: 1 },
  { role: "saps",     module: "search",       can_read: 1, can_write: 0, can_delete: 0 },

  // Teacher: Dashboard (handled in logic), Student search, Students, Subjects, Grades
  { role: "teacher",  module: "dashboard",    can_read: 1, can_write: 0, can_delete: 0 },
  { role: "teacher",  module: "students",     can_read: 1, can_write: 1, can_delete: 1 },
  { role: "teacher",  module: "subjects",     can_read: 1, can_write: 1, can_delete: 1 },
  { role: "teacher",  module: "grades",       can_read: 1, can_write: 1, can_delete: 1 },
  { role: "teacher",  module: "search",       can_read: 1, can_write: 0, can_delete: 0 },
  { role: "teacher",  module: "permits",      can_read: 1, can_write: 0, can_delete: 0 }, // Teacher can view permits via room/block
  { role: "teacher",  module: "attendance",   can_read: 1, can_write: 1, can_delete: 1 },

  // Student: own grades, own subjects, global student count (dashboard), own permits, own payments, own password
  { role: "student",  module: "dashboard",    can_read: 1, can_write: 0, can_delete: 0 },
  { role: "student",  module: "grades",       can_read: 1, can_write: 0, can_delete: 0 },
  { role: "student",  module: "permits",      can_read: 1, can_write: 0, can_delete: 0 },
  { role: "student",  module: "payments",     can_read: 1, can_write: 0, can_delete: 0 },
  { role: "student",  module: "profile",      can_read: 1, can_write: 1, can_delete: 0 },
  { role: "student",  module: "attendance",   can_read: 1, can_write: 0, can_delete: 0 },

  // Developer (full bypass in middleware, but for completeness)
  { role: "developer", module: "*",           can_read: 1, can_write: 1, can_delete: 1 }
];

export async function seedRBAC() {
  await initDB();
  tx(() => {
    run("DELETE FROM authorization"); // Clear old
    for (const p of permissions) {
      run(`
        INSERT INTO authorization (role, module, can_read, can_write, can_delete)
        VALUES (?, ?, ?, ?, ?)
      `, [p.role, p.module, p.can_read, p.can_write, p.can_delete]);
    }
  });
  console.log("RBAC seeded successfully.");
}

if (process.argv[1] && process.argv[1].endsWith("seedRBAC.js")) {
  seedRBAC().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
}
