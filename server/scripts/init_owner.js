
import bcrypt from "bcryptjs";
import db, { initDB, tx, run, get } from "../src/db.js";

async function start() {
  console.log("Initializing database...");
  await initDB();
  
  const username = "owner";
  const password = "123123";
  const hash = bcrypt.hashSync(password, 10);
  
  tx(() => {
    // Clear existing users as requested by user earlier
    run("DELETE FROM users");
    run("DELETE FROM user_permissions");
    
    // Insert owner
    run("INSERT INTO users (username, password_hash, role, user_type) VALUES (?, ?, 'owner', 'developer')", [username, hash]);
    
    // Set settings
    run("INSERT OR REPLACE INTO settings (key, value) VALUES ('owner_initialized', '1')");
    
    console.log("Owner account created: owner / 123123");
  });
}

start().catch(err => {
  console.error("Failed to initialize owner:", err);
  process.exit(1);
});
