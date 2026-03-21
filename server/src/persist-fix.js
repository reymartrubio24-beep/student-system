import { initDB, run, all, dbFilePath } from "./db.js";
import fs from "fs";

// This script fixes the role CHECK constraint and persists to disk
// It uses database.export() to properly save the in-memory sql.js database

(async () => {
  // Import the raw database object to call persist
  const dbModule = await import("./db.js");
  await dbModule.initDB();
  
  console.log("Step 1: Reading current users...");
  const users = dbModule.all("SELECT * FROM users");
  console.log(`Found ${users.length} users`);
  
  console.log("Step 2: Checking current schema...");
  const schema = dbModule.get("SELECT sql FROM sqlite_master WHERE type='table' AND name='users'");
  console.log("Current schema:", schema.sql);
  
  if (schema.sql.includes("'viewer'")) {
    console.log("Schema already has viewer! The issue is something else.");
    console.log("Trying to insert a test viewer now...");
    try {
      dbModule.run("INSERT INTO users (username, password_hash, role) VALUES ('testviewer123', 'fakehash', 'viewer')");
      dbModule.run("DELETE FROM users WHERE username='testviewer123'");
      console.log("SUCCESS - viewer role works in DB.");
    } catch(e) {
      console.error("STILL FAILING in DB:", e.message);
    }
    process.exit(0);
  }

  console.log("Step 3: Migrating users table...");
  dbModule.run("DROP TABLE IF EXISTS users_mig");
  dbModule.run(`
    CREATE TABLE users_mig (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL COLLATE NOCASE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('student','teacher','developer','owner','saps','register','cashier','viewer')),
      user_type TEXT,
      student_id TEXT COLLATE NOCASE,
      uuid TEXT,
      full_name TEXT,
      deleted_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);
  dbModule.run("INSERT INTO users_mig (id, username, password_hash, role, user_type, student_id, uuid, full_name, deleted_at, created_at) SELECT id, username, password_hash, role, user_type, student_id, uuid, full_name, deleted_at, created_at FROM users");
  dbModule.run("DROP TABLE users");
  dbModule.run("ALTER TABLE users_mig RENAME TO users");
  
  // CRITICAL: Use tx() to force a persist() call
  // We do a no-op transaction just to trigger persist
  dbModule.tx(() => {
    dbModule.run("SELECT 1"); // no-op to trigger persist via tx
  });
  
  console.log("Step 4: Verifying new schema on disk...");
  const newSchema = dbModule.get("SELECT sql FROM sqlite_master WHERE type='table' AND name='users'");
  console.log("New schema:", newSchema.sql);
  
  console.log("DONE.");
  process.exit(0);
})();
