import { initDB, all } from './server/src/db.js';
await initDB();

console.log('--- ALL GRADES for Flores ---');
const grades = all('SELECT * FROM grades WHERE student_id LIKE "2006-0001%"');
console.log(JSON.stringify(grades, null, 2));

console.log('\n--- ALL STUDENTS for Flores ---');
const students = all('SELECT * FROM students WHERE id LIKE "2006-0001%"');
console.log(JSON.stringify(students, null, 2));

process.exit(0);
