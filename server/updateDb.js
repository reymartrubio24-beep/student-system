import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

try {
  // First drop the constraint, update, then recreate
  await pool.query("ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check");
  await pool.query("UPDATE users SET role='registrar' WHERE role='register'");
  await pool.query(`ALTER TABLE users ADD CONSTRAINT users_role_check CHECK(role IN ('student','teacher','developer','owner','saps','registrar','cashier'))`);
  await pool.query("UPDATE \"authorization\" SET role='registrar' WHERE role='register'");
  console.log("Done: DB updated, constraint updated, all 'register' -> 'registrar'");
} catch(e) {
  console.error(e.message);
} finally {
  await pool.end();
}
