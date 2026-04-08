import { initDB, all, get } from './server/src/db.js';
await initDB();
const username = 'flores';
const user = get('SELECT id, username, role, student_id FROM users WHERE LOWER(username) = LOWER(?)', [username]);
console.log('--- USER INFO ---');
console.log(JSON.stringify(user, null, 2));

if (user) {
  console.log('\n--- STUDENT RECORD ---');
  const student = get('SELECT * FROM students WHERE id = ?', [user.student_id]);
  console.log(JSON.stringify(student, null, 2));

  console.log('\n--- GRADES FOR THIS STUDENT ---');
  const grades = all('SELECT * FROM grades WHERE student_id = ?', [user.student_id]);
  console.log(JSON.stringify(grades, null, 2));

  if (grades.length > 0) {
    console.log('\n--- LINKED SUBJECTS ---');
    for (const g of grades) {
      const subject = get('SELECT * FROM subjects WHERE id = ?', [g.subject_id]);
      console.log(`Subject ID: ${g.subject_id}`);
      console.log(JSON.stringify(subject, null, 2));
    }
  } else {
    console.log('\nNo grades found for this student ID in grades table.');
  }
}

console.log('\n--- SYSTEM CHECK ---');
const subjectsCount = get('SELECT COUNT(*) as c FROM subjects WHERE deleted_at IS NULL');
console.log('Total active subjects:', subjectsCount.c);
const usersCount = get('SELECT COUNT(*) as c FROM users WHERE role="student"');
console.log('Total student users:', usersCount.c);
const gradesRecord = all('SELECT * FROM grades LIMIT 5');
console.log('Sample grades records:', JSON.stringify(gradesRecord, null, 2));

process.exit(0);
