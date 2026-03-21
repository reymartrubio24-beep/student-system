import pg from 'pg';
import 'dotenv/config';

const { Pool } = pg;
const p = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

p.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'authorization'")
  .then(res => console.log(res.rows))
  .catch(console.error)
  .finally(() => p.end());
