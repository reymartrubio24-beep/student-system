const fs = require('fs');
let src = fs.readFileSync('server/src/db.js', 'utf8');

const GRADES_TARGET = `    CREATE TABLE IF NOT EXISTS grades (
      student_id TEXT NOT NULL,
      subject_id TEXT NOT NULL,
      prelim1 INTEGER,
      prelim2 INTEGER,
      midterm INTEGER,
      semi_final INTEGER,
      final INTEGER,
      deleted_at TIMESTAMP WITH TIME ZONE,
      PRIMARY KEY (student_id, subject_id),
      FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
      FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
    );`;

const GRADES_REPLACEMENT = `    CREATE TABLE IF NOT EXISTS grades (
      student_id TEXT NOT NULL,
      subject_id TEXT NOT NULL,
      semester_id INTEGER,
      prelim1 INTEGER,
      prelim2 INTEGER,
      midterm INTEGER,
      semi_final INTEGER,
      final INTEGER,
      deleted_at TIMESTAMP WITH TIME ZONE,
      PRIMARY KEY (student_id, subject_id, semester_id),
      FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
      FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
      FOREIGN KEY (semester_id) REFERENCES semesters(id) ON DELETE SET NULL
    );`;

if (!src.includes(GRADES_TARGET)) {
  console.error("Grades table target not found!");
  process.exit(1);
}
src = src.replace(GRADES_TARGET, GRADES_REPLACEMENT);

// Migration block
const MIGRATION_TARGET = `      await pool.query("ALTER TABLE student_ledgers ADD PRIMARY KEY (student_id, semester_id)");
      console.log("[DB] Finished semester tracking migrations.");
    }
  } catch (e) {
    console.error("[DB] Migration failed:", e);
  }`;

const MIGRATION_REPLACEMENT = `      await pool.query("ALTER TABLE student_ledgers ADD PRIMARY KEY (student_id, semester_id)");
      console.log("[DB] Finished semester tracking migrations.");
    }

    const checkGrades = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name='grades' AND column_name='semester_id'");
    if (checkGrades.rows.length === 0) {
      console.log("[DB] Migrating grades table to include semester_id...");
      await pool.query("ALTER TABLE grades ADD COLUMN semester_id INTEGER REFERENCES semesters(id) ON DELETE SET NULL");
      
      const firstSem = await pool.query("SELECT id FROM semesters ORDER BY id ASC LIMIT 1");
      const sid = firstSem?.rows?.[0]?.id;
      if (sid) {
        await pool.query("UPDATE grades SET semester_id = $1 WHERE semester_id IS NULL", [sid]);
      }
      
      // Update primary key dynamically for PSQL
      try {
        await pool.query("ALTER TABLE grades DROP CONSTRAINT IF EXISTS grades_pkey");
        await pool.query("ALTER TABLE grades ADD PRIMARY KEY (student_id, subject_id, semester_id)");
      } catch (pkErr) {
        console.warn("[DB] Note: Could not safely reassign grades PK, skipping. ", pkErr.message);
      }
    }
  } catch (e) {
    console.error("[DB] Migration failed:", e);
  }`;

if (!src.includes(MIGRATION_TARGET)) {
  console.error("Migration target not found!");
  process.exit(1);
}
src = src.replace(MIGRATION_TARGET, MIGRATION_REPLACEMENT);

fs.writeFileSync('server/src/db.js', src);
console.log('db.js updated properly.');
