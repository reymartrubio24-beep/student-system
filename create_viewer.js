import bcrypt from "bcryptjs";
import sqlite3 from "sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbFilePath = path.join(__dirname, "server", "data", "app.sqlite");

const db = new sqlite3.Database(dbFilePath);

const username = "View";
const password = "123123";
const role = "viewer";
const hash = bcrypt.hashSync(password, 10);

db.serialize(() => {
  // 1. Create user
  db.run("INSERT OR REPLACE INTO users (username, password_hash, role) VALUES (?, ?, ?)", [username, hash, role], function(err) {
    if (err) return console.error("Error creating user:", err.message);
    const userId = this.lastID || 0;
    console.log(`User ${username} created/updated with ID ${userId}`);

    // 2. Grant global read permissions to the 'viewer' role
    const modules = ["students", "grades", "payments", "permits", "subjects", "attendance", "users", "audit_log", "settings", "dashboard", "schedule", "rooms"];
    modules.forEach(m => {
      db.run("INSERT OR IGNORE INTO authorization (role, module, can_read, can_write, can_delete) VALUES (?, ?, 1, 0, 0)", [role, m]);
    });
    // Global fallback
    db.run("INSERT OR IGNORE INTO authorization (role, module, can_read, can_write, can_delete) VALUES (?, '*', 1, 0, 0)", [role]);

    console.log("Permissions granted to role: viewer");
    db.close();
  });
});
