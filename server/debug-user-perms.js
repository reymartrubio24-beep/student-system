import dotenv from 'dotenv';
import pg from 'pg';
dotenv.config();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  const res = await pool.query('SELECT * FROM user_permissions WHERE user_id = (SELECT id FROM users WHERE username=\'saps\')');
  console.log(JSON.stringify(res.rows, null, 2));
  process.exit(0);
}
run();
