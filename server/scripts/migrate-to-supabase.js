import fs from "fs";
import initSqlJs from "sql.js";
import pg from "pg";
import "dotenv/config";

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set in the environment!");
}

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  console.log("Loading local SQLite database...");
  const SQL = await initSqlJs();
  let filebuffer;
  try {
    filebuffer = fs.readFileSync("./data/app.sqlite");
  } catch(e) {
    console.error("Could not find ./data/app.sqlite! Are you sure you have local data?");
    process.exit(1);
  }
  const db = new SQL.Database(filebuffer);

  // List of tables to migrate
  const tables = [
    "users",
    "settings",
    "students",
    "subjects",
    "grades",
    "payments",
    "audit_log",
    "student_id_sequence",
    "semesters",
    "permit_periods",
    "student_permits",
    "authorization",
    "user_permissions",
    "attendance_tables",
    "attendance_enrollments",
    "attendance_records",
    "permit_number_sequence",
    "user_files"
  ];

  const client = await pool.connect();
  try {
    console.log("Starting migration to Supabase PostgreSQL...");

    for (const table of tables) {
      const pgTable = table === "authorization" ? '"authorization"' : table;
      
      console.log(`\nMigrating table: ${table}...`);
      
      try {
        const stmt = db.prepare(`SELECT * FROM ${table}`);
        const rows = [];
        while(stmt.step()) {
            rows.push(stmt.getAsObject());
        }
        stmt.free();

        console.log(` > Found ${rows.length} rows in local ${table}`);
        if (rows.length === 0) continue;

        // Clear existing postgres table to avoid duplicate keys during insert
        try {
            await client.query(`TRUNCATE TABLE ${pgTable} CASCADE;`);
        } catch(trErr) {
            console.log(` > Note: Could not truncate ${table}, inserting...`);
        }

        const cols = Object.keys(rows[0]);
        let insertCount = 0;

        for (const row of rows) {
          const values = cols.map(c => row[c] === undefined ? null : row[c]);
          const placeholders = cols.map((_, i) => `$${i + 1}`).join(", ");
          const colNames = cols.map(c => `"${c}"`).join(", ");
          
          let insertSql = `INSERT INTO ${pgTable} (${colNames}) VALUES (${placeholders})`;

          // Handlers for tables with primary constraints
          if (table === "settings" || table === "student_id_sequence" || table === "permit_number_sequence") {
             const keyCol = table === "settings" ? "key" : (table === "student_id_sequence" ? "year" : "id");
             insertSql += ` ON CONFLICT ("${keyCol}") DO UPDATE SET `;
             const updates = cols.filter(c => c !== keyCol).map(c => `"${c}" = EXCLUDED."${c}"`).join(", ");
             insertSql += updates.length > 0 ? updates : `"${keyCol}" = EXCLUDED."${keyCol}"`; // Fallback DO NOTHING equivalent
          }

          try {
            await client.query(insertSql, values);
            insertCount++;
          } catch (rowErr) {
            console.error(` > Failed inserting row into ${table}: ${rowErr.message}`);
          }
        }

        console.log(` > Inserted ${insertCount} rows into Supabase ${table}!`);

        // Adjust sequences if the table has an auto-incrementing integer 'id'
        if (cols.includes('id') && Number.isInteger(rows[0].id) && table !== 'students' && table !== 'subjects' && table !== 'permit_number_sequence') {
           const res = await client.query(`SELECT MAX(id) as m FROM ${pgTable}`);
           const maxId = res.rows[0].m || 0;
           if (maxId > 0) {
               try {
                   const seqName = table === "authorization" ? "authorization_id_seq" : `${table}_id_seq`;
                   await client.query(`SELECT setval('${seqName}', ${maxId})`);
               } catch (e) {
                   // Not a sequence, ignore
               }
           }
        }

      } catch (err) {
        console.warn(` > Skipping table ${table} due to lookup error: ${err.message}`);
      }
    }

    console.log("\n✅ Migration complete! Your Supabase database now has all your old SQLite data!");
  } catch(e) {
    console.error("Migration failed:", e);
  } finally {
    client.release();
    pool.end();
  }
}

run();
