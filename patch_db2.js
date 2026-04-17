const fs = require('fs');
let src = fs.readFileSync('server/src/db.js', 'utf8');

// Replace grades create table
src = src.replace(
  /CREATE TABLE IF NOT EXISTS grades \([\s\S]*?PRIMARY KEY \(student_id, subject_id\),[\s\S]*?\);/,
  `CREATE TABLE IF NOT EXISTS grades (
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
    );`
);

// Append grades migration right before 'Finished semester tracking migrations.'
const MIGRATION_APPEND = `
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
      
      console.log("[DB] Finished semester tracking migrations.");`;

src = src.replace(/console\.log\("\[DB\] Finished semester tracking migrations\."\);/, MIGRATION_APPEND);

fs.writeFileSync('server/src/db.js', src);
console.log('db.js regex patched successfully.');
