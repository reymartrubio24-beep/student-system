import fs from "fs";
import initSqlJs from "sql.js";

async function check(p) {
  const SQL = await initSqlJs();
  if (!fs.existsSync(p)) return;
  const buf = fs.readFileSync(p);
  const database = new SQL.Database(buf);
  const rows = database.exec("SELECT sql FROM sqlite_master WHERE type='table' AND name='users'");
  const sql = rows[0]?.values[0][0];
  fs.writeFileSync('DEBUG_SCHEMA.txt', sql);
  console.log("SCHEMA WRITTEN TO DEBUG_SCHEMA.txt");
}

(async () => {
  await check('data/app.sqlite');
  process.exit(0);
})();
