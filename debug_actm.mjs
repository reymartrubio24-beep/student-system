import { initDB, get } from './server/src/db.js';
await initDB();
const subject = get('SELECT * FROM subjects WHERE id = ?', ['ACTM 208']);
console.log('SUBJECT ACTM 208:', JSON.stringify(subject, null, 2));

const grade = get('SELECT * FROM grades WHERE student_id = ? AND subject_id = ?', ['2006-0001', 'ACTM 208']);
console.log('GRADE RECORD:', JSON.stringify(grade, null, 2));

process.exit(0);
