import { initDB, all, get } from './server/src/db.js';
await initDB();

const sid = '2006-0001';
console.log('--- ALL GRADES FOR 2006-0001 ---');
const grades = all('SELECT * FROM grades WHERE student_id = ?', [sid]);
console.log(JSON.stringify(grades, null, 2));

console.log('\n--- ALL SUBJECTS ---');
const subjects = all('SELECT id, name, deleted_at FROM subjects');
console.log(JSON.stringify(subjects, null, 2));

process.exit(0);
