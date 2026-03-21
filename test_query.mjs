import { initDB, all, get } from './server/src/db.js';
await initDB();

const sid = '2006-0001';
console.log(`[TEST] Querying subjects for student_id: '${sid}'`);

const rows = all(`
  SELECT b.* FROM subjects b
  JOIN grades g ON g.subject_id = b.id
  WHERE g.student_id = ? 
  AND (g.deleted_at IS NULL OR g.deleted_at = '') 
  AND (b.deleted_at IS NULL OR b.deleted_at = '')
`, [sid]);

console.log(`[TEST] Found ${rows.length} subjects.`);
if (rows.length > 0) {
  rows.forEach(r => console.log(` - ${r.id}: ${r.name}`));
}

const allGrades = all('SELECT * FROM grades');
console.log('\n--- ALL GRADES IN SYSTEM ---');
console.log(JSON.stringify(allGrades, null, 2));

process.exit(0);
