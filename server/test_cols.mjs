import initSqlJs from "sql.js";
import fs from "fs";
import path from "path";

const dataDir = path.join(process.cwd(), "data");
const dbFilePath = path.join(dataDir, "app.sqlite");
const SQL = await initSqlJs();
const buf = fs.readFileSync(dbFilePath);
const db = new SQL.Database(buf);

const tables = ["attendance_tables", "attendance_enrollments", "attendance_records"];
for (const t of tables) {
  try {
    const stmt = db.prepare(`PRAGMA table_info('${t}')`);
    const rows = [];
    while (stmt.step()) rows.push(stmt.getAsObject());
    stmt.free();
    console.log(`${t}:`, rows.map(r => r.name).join(", "));
  } catch (e) {
    console.log(`${t}: ERROR:`, e.message);
  }
}

db.close();
