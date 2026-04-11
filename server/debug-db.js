import dotenv from 'dotenv';
import pg from 'pg';
dotenv.config();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  const res = await pool.query('SELECT module, can_read, can_write, can_delete FROM "authorization" WHERE role=\'saps\'');
  console.log(JSON.stringify(res.rows, null, 2));
  process.exit(0);
}
run();
