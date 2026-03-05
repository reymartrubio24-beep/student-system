import bcrypt from "bcryptjs";
import { initDB, get, run } from "../src/db.js";

await initDB();
const exists = get("SELECT 1 as x FROM users WHERE username = ?", ["dev"]);
if (!exists) {
  const hash = bcrypt.hashSync("admin123", 10);
  run("INSERT INTO users (username, password_hash, role) VALUES (?, ?, 'developer')", ["dev", hash]);
  console.log("created developer user 'dev'");
} else {
  console.log("developer user 'dev' already exists");
}
