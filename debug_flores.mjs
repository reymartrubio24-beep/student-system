import { initDB, all, get } from './server/src/db.js';
await initDB();
const user = get('SELECT id, username, role, student_id FROM users WHERE LOWER(username) = LOWER(?)', ['flores']);
console.log('USER flores:', user);
if (user) {
  const student = get('SELECT * FROM students WHERE id = ?', [user.student_id]);
  console.log('STUDENT RECORD:', student);
  const grades = all('SELECT * FROM grades WHERE student_id = ? AND deleted_at IS NULL', [user.student_id]);
  console.log('GRADES:', grades);
  if (grades.length > 0) {
    for (const g of grades) {
      const subject = get('SELECT * FROM subjects WHERE id = ? AND deleted_at IS NULL', [g.subject_id]);
      console.log('SUBJECT:', subject);
    }
  }
}
const allGrades = all('SELECT * FROM grades');
console.log('ALL GRADES:', allGrades);
const allSubjects = all('SELECT * FROM subjects');
console.log('ALL SUBJECTS:', allSubjects);
process.exit(0);
