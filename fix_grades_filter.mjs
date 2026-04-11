import { readFileSync, writeFileSync } from 'fs';

const file = 'src/App.js';
let src = readFileSync(file, 'utf8');

// Fix: grades may not be an array — add Array.isArray guard in AttendanceSessionView
const OLD_GRADES_FILTER = `  const subjectGradeIds = new Set(grades.filter(g => g.subject_id === table.subject_id).map(g => g.student_id));`;
const NEW_GRADES_FILTER = `  const gradesArr = Array.isArray(grades) ? grades : [];
  const subjectGradeIds = new Set(gradesArr.filter(g => g.subject_id === table.subject_id).map(g => g.student_id));`;

if (src.includes(OLD_GRADES_FILTER)) {
  src = src.replace(OLD_GRADES_FILTER, NEW_GRADES_FILTER);
  console.log('Fixed grades.filter guard in AttendanceSessionView');
} else {
  console.log('Not found - looking for pattern...');
  const idx = src.indexOf('subjectGradeIds');
  if (idx !== -1) {
    console.log('Found at char', idx, ':', src.substring(idx - 10, idx + 100));
  }
}

// Also fix in AttendanceManage handleCreate - grades.filter could fail there too
const OLD_GRADES_FILTER2 = `        const subjectStudentIds = [...new Set(
          grades
            .filter(g => g.subject_id === form.subject_id)
            .map(g => g.student_id)
        )];`;
const NEW_GRADES_FILTER2 = `        const gradesData = Array.isArray(grades) ? grades : [];
        const subjectStudentIds = [...new Set(
          gradesData
            .filter(g => g.subject_id === form.subject_id)
            .map(g => g.student_id)
        )];`;

if (src.includes(OLD_GRADES_FILTER2)) {
  src = src.replace(OLD_GRADES_FILTER2, NEW_GRADES_FILTER2);
  console.log('Fixed grades.filter guard in handleCreate');
} else {
  console.log('handleCreate pattern not found - looking...');
  const idx = src.indexOf('subjectStudentIds');
  if (idx !== -1) console.log('Found at:', src.substring(idx - 10, idx + 120));
}

writeFileSync(file, src, 'utf8');
console.log('Done.');

// Verify emoji still ok
const result = readFileSync(file, 'utf8');
const sample = result.substring(result.indexOf('icon: "'), result.indexOf('icon: "') + 30);
console.log('Emoji check:', JSON.stringify(sample));
console.log('Array.isArray check:', result.includes('Array.isArray(grades)') ? 'FOUND' : 'MISSING');
