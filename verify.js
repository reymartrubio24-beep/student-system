const fs = require('fs');
let src = fs.readFileSync('src/App.js', 'utf8');
const checks = [
  ['assignSemId state (StudentMgmt)', 'const [assignSemId, setAssignSemId] = useState'],
  ['semester_id in assignSubject POST', 'semester_id: Number(assignSemId)'],
  ['Semester dropdown in Assign UI', 'Select Semester'],
  ['semesterId form field (Grades)', 'semesterId: ""'],
  ['semester_id in Grades POST', 'semester_id: Number(formSemId)'],
  ['Choose Semester in modal', 'Choose Semester'],
  ['semester_id in grade map', 'semester_id: r.semester_id'],
];
checks.forEach(([name, str]) => console.log(src.includes(str) ? '[OK]' : '[MISSING]', name));
