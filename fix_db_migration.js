const fs = require('fs');
let src = fs.readFileSync('server/src/db.js', 'utf8');

const t = `
      const checkGrades = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name='grades' AND column_name='semester_id'");
      if (checkGrades.rows.length === 0) {
        console.log("[DB] Migrating grades table to include semester_id...");
        await pool.query("ALTER TABLE grades ADD COLUMN semester_id INTEGER REFERENCES semesters(id) ON DELETE SET NULL");
        
        const firstSem = await pool.query("SELECT id FROM semesters ORDER BY id ASC LIMIT 1");
        const sid = firstSem?.rows?.[0]?.id;
        if (sid) {
          await pool.query("UPDATE grades SET semester_id = $1 WHERE semester_id IS NULL", [sid]);
        }
        
        try {
          await pool.query("ALTER TABLE grades DROP CONSTRAINT IF EXISTS grades_pkey");
          await pool.query("ALTER TABLE grades ADD PRIMARY KEY (student_id, subject_id, semester_id)");
        } catch (pkErr) {
          console.warn("[DB] Note: Could not safely reassign grades PK, skipping. ", pkErr.message);
        }
      }
      
      console.log("[DB] Finished semester tracking migrations.");
    }
  } catch (e) {
`;

const rep = `
      console.log("[DB] Finished ledger tracking migrations.");
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
      
      try {
        await pool.query("ALTER TABLE grades DROP CONSTRAINT IF EXISTS grades_pkey");
        await pool.query("ALTER TABLE grades ADD PRIMARY KEY (student_id, subject_id, semester_id)");
      } catch (pkErr) {
        console.warn("[DB] Note: Could not safely reassign grades PK, skipping. ", pkErr.message);
      }
    }
    console.log("[DB] Finished all semester tracking migrations.");

  } catch (e) {
`;

if (src.includes(t)) {
  src = src.replace(t, rep);
  fs.writeFileSync('server/src/db.js', src);
  console.log('Fixed nested migration.');
} else {
  console.log('Migration block not found!');
  process.exit(1);
}
