
import { initDB, run, get, all, tx } from "./db.js";

async function check() {
    await initDB();
    console.log("Before seed, count:", all("SELECT * FROM authorization").length);
    
    const permissions = [
        { role: "student", module: "dashboard", can_read: 1, can_write: 0, can_delete: 0 },
        { role: "student", module: "grades", can_read: 1, can_write: 0, can_delete: 0 },
        { role: "student", module: "payments", can_read: 1, can_write: 0, can_delete: 0 }
    ];

    tx(() => {
        run("DELETE FROM authorization WHERE role='student'");
        for (const p of permissions) {
            console.log("Inserting for", p.module);
            run("INSERT INTO authorization (role, module, can_read, can_write, can_delete) VALUES (?, ?, ?, ?, ?)",
                [p.role, p.module, p.can_read, p.can_write, p.can_delete]);
        }
    });

    console.log("After seed, count:", all("SELECT * FROM authorization WHERE role='student'").length);
}

check().catch(console.error);
