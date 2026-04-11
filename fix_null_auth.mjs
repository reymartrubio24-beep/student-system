import { config } from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: resolve(__dirname, "server/.env") });
import pg from "pg";
const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});
async function run() {
  await pool.query('UPDATE "authorization" SET can_read = COALESCE(can_read, 0), can_write = COALESCE(can_write, 0), can_delete = COALESCE(can_delete, 0)');
  console.log("Fixed NULL values");
  await pool.end();
}
run().catch(console.error);
