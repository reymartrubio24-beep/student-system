import pg from 'pg';
import 'dotenv/config';

const { Pool } = pg;
const p = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

p.query('SELECT role, module, can_read, can_write, can_delete FROM "authorization"')
  .then(res => console.log(JSON.stringify(res.rows, null, 2)))
  .catch(console.error)
  .finally(() => p.end());
