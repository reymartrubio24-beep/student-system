import { readFileSync, writeFileSync } from 'fs';

const file = 'src/App.js';
let src = readFileSync(file, 'utf8');

// Remove the TeacherAttendanceDashboard render line
const OLD_RENDER = `            {page === "attendance" && role === "teacher" && <TeacherAttendanceDashboard token={auth.token} teacherUuid={auth?.uuid} subjects={subjects} />}\r\n`;
const OLD_RENDER2 = `            {page === "attendance" && role === "teacher" && <TeacherAttendanceDashboard token={auth.token} teacherUuid={auth?.uuid} subjects={subjects} />}\n`;

if (src.includes(OLD_RENDER)) {
  src = src.replace(OLD_RENDER, '');
  console.log('Removed TeacherAttendanceDashboard render line (CRLF)');
} else if (src.includes(OLD_RENDER2)) {
  src = src.replace(OLD_RENDER2, '');
  console.log('Removed TeacherAttendanceDashboard render line (LF)');
} else {
  console.log('WARNING: TeacherAttendanceDashboard render line not found - searching...');
  const idx = src.indexOf('TeacherAttendanceDashboard');
  if (idx !== -1) {
    const lineStart = src.lastIndexOf('\n', idx);
    const lineEnd = src.indexOf('\n', idx);
    console.log('Found at char', idx, '| Line:', src.substring(lineStart + 1, lineEnd));
  }
}

writeFileSync(file, src, 'utf8');
console.log('Done. Verifying...');

// Verify no more TeacherAttendanceDashboard references
const result = readFileSync(file, 'utf8');
if (result.includes('TeacherAttendanceDashboard')) {
  console.log('WARNING: TeacherAttendanceDashboard still found!');
  const idx = result.indexOf('TeacherAttendanceDashboard');
  const lineStart = result.lastIndexOf('\n', idx);
  const lineEnd = result.indexOf('\n', idx);
  console.log('Remaining:', result.substring(lineStart + 1, lineEnd));
} else {
  console.log('OK: No more TeacherAttendanceDashboard references');
}

// Verify emoji are intact
const iconIdx = result.indexOf('icon: "');
const sample = result.substring(iconIdx, iconIdx + 30);
console.log('Sample emoji area:', JSON.stringify(sample));
