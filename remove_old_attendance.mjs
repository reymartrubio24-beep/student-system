import { readFileSync, writeFileSync } from 'fs';

const file = 'src/App.js';
let src = readFileSync(file, 'utf8');

const lines = src.split('\n');
console.log('Total lines:', lines.Count);

// Find old components
let oldStart = -1, oldEnd = -1;

for (let i = 0; i < lines.length; i++) {
  if (oldStart === -1 && lines[i].includes('function AttendanceManage') && i < 2000) {
    oldStart = i;
    console.log('Old AttendanceManage starts at line', i + 1);
  }
}

// Find TeacherAttendanceDashboard
let teacherStart = -1;
for (let i = oldStart; i < lines.length; i++) {
  if (lines[i].includes('function TeacherAttendanceDashboard')) {
    teacherStart = i;
    console.log('TeacherAttendanceDashboard starts at line', i + 1);
    break;
  }
}

// Find end of TeacherAttendanceDashboard - look for the next function or comment block after it
for (let i = teacherStart + 1; i < lines.length; i++) {
  const l = lines[i];
  // End when we hit another top-level function or a comment section
  if ((l.startsWith('function ') || l.startsWith('/*') || l.startsWith('export ')) && i > teacherStart + 5) {
    oldEnd = i;
    console.log('Old block ends at line', i + 1, ':', l.substring(0, 60));
    break;
  }
}

if (oldStart !== -1 && oldEnd !== -1) {
  const newLines = [...lines.slice(0, oldStart), ...lines.slice(oldEnd)];
  src = newLines.join('\n');
  console.log('Removed old block: lines', oldStart + 1, 'to', oldEnd);
} else {
  console.log('Could not determine block boundaries:', { oldStart, oldEnd });
}

writeFileSync(file, src, 'utf8');
console.log('Done. File length:', src.length);

// Verify
const result = readFileSync(file, 'utf8');
const resultLines = result.split('\n');
let count = 0;
for (let i = 0; i < resultLines.length; i++) {
  if (resultLines[i].includes('function AttendanceManage') || resultLines[i].includes('function TeacherAttendanceDashboard')) {
    console.log(`Found at line ${i+1}: ${resultLines[i].substring(0, 80)}`);
    count++;
  }
}
console.log('Total attendance function declarations:', count, '(should be 2: AttendanceManage + AttendanceSessionView)');
