import { readFileSync, writeFileSync } from 'fs';

const file = 'src/App.js';
let src = readFileSync(file, 'utf8');

// ── 1. Update the "Note" text in create modal to reflect auto-enrollment ──
const OLD_NOTE = `              <strong style={{ color: "var(--neon-blue)" }}>Note:</strong> After creating this sheet, you can add students from the enrolled students tab.`;
const NEW_NOTE = `              <strong style={{ color: "var(--neon-blue)" }}>Auto-enroll:</strong> Students already enrolled in this subject via Student Management will be automatically added to this attendance sheet.`;

if (src.includes(OLD_NOTE)) {
  src = src.replace(OLD_NOTE, NEW_NOTE);
  console.log('✅ Updated create modal note text');
} else {
  console.log('❌ Could not find old note text');
}

// ── 2. Update AttendanceSessionView to accept grades and show grouped dropdown ──
// Update component signature
const OLD_SESSION_SIG = `function AttendanceSessionView({ table, token, role, allStudents, subjects, onBack, subjectLabel, semesterLabel }) {`;
const NEW_SESSION_SIG = `function AttendanceSessionView({ table, token, role, allStudents, subjects, grades = [], onBack, subjectLabel, semesterLabel }) {`;

if (src.includes(OLD_SESSION_SIG)) {
  src = src.replace(OLD_SESSION_SIG, NEW_SESSION_SIG);
  console.log('✅ Updated AttendanceSessionView signature');
} else {
  console.log('❌ Could not find AttendanceSessionView signature');
}

// ── 3. Update the available students logic to separate subject-enrolled from others ──
const OLD_AVAILABLE = `  const alreadyEnrolledIds = new Set(enrolledStudents.map(s => s.student_id));
  // Students not yet enrolled in this attendance sheet
  const availableToAdd = allStudents.filter(s => !alreadyEnrolledIds.has(s.id));`;

const NEW_AVAILABLE = `  const alreadyEnrolledIds = new Set(enrolledStudents.map(s => s.student_id));
  // Students enrolled in this subject via grades (student management)
  const subjectGradeIds = new Set(grades.filter(g => g.subject_id === table.subject_id).map(g => g.student_id));
  // Students not yet enrolled in this attendance sheet
  const availableToAdd = allStudents.filter(s => !alreadyEnrolledIds.has(s.id));
  // Split into subject-enrolled (priority) and others
  const subjectAvailable = availableToAdd.filter(s => subjectGradeIds.has(s.id));
  const otherAvailable = availableToAdd.filter(s => !subjectGradeIds.has(s.id));`;

if (src.includes(OLD_AVAILABLE)) {
  src = src.replace(OLD_AVAILABLE, NEW_AVAILABLE);
  console.log('✅ Updated available students logic');
} else {
  console.log('❌ Could not find available students logic, trying alternate...');
  const OLD_AVAILABLE2 = `  const alreadyEnrolledIds = new Set(enrolledStudents.map(s => s.student_id));
  const availableToAdd = allStudents.filter(s => !alreadyEnrolledIds.has(s.id));`;
  if (src.includes(OLD_AVAILABLE2)) {
    src = src.replace(OLD_AVAILABLE2, NEW_AVAILABLE);
    console.log('✅ Updated available students logic (alternate)');
  }
}

// ── 4. Replace the "Add Student" dropdown to group subject-enrolled vs others ──
const OLD_DROPDOWN = `                    <option value="">--- Select Student ---</option>
                    {availableToAdd.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.id}) - {s.course}</option>
                    ))}`;

const NEW_DROPDOWN = `                    <option value="">--- Select Student ---</option>
                    {subjectAvailable.length > 0 && (
                      <optgroup label="--- Enrolled in this Subject ---">
                        {subjectAvailable.map(s => (
                          <option key={s.id} value={s.id}>{s.name} ({s.id}) - {s.course}</option>
                        ))}
                      </optgroup>
                    )}
                    {otherAvailable.length > 0 && (
                      <optgroup label="--- Other Students ---">
                        {otherAvailable.map(s => (
                          <option key={s.id} value={s.id}>{s.name} ({s.id}) - {s.course}</option>
                        ))}
                      </optgroup>
                    )}`;

if (src.includes(OLD_DROPDOWN)) {
  src = src.replace(OLD_DROPDOWN, NEW_DROPDOWN);
  console.log('✅ Updated add student dropdown with groups');
} else {
  console.log('❌ Could not find dropdown - trying to locate...');
  const idx = src.indexOf('availableToAdd.map');
  if (idx !== -1) {
    console.log('Found at char', idx, ':', src.substring(idx - 50, idx + 150));
  }
}

// ── 5. Update AttendanceManage to pass grades to AttendanceSessionView ──
const OLD_SESSION_CALL = `      <AttendanceSessionView
        table={selectedTable}
        token={token}
        role={role}
        allStudents={students}
        subjects={subjects}
        onBack={() => { setSelectedTable(null); loadTables(); }}
        subjectLabel={subjectLabel}
        semesterLabel={semesterLabel}
      />`;

const NEW_SESSION_CALL = `      <AttendanceSessionView
        table={selectedTable}
        token={token}
        role={role}
        allStudents={students}
        subjects={subjects}
        grades={grades}
        onBack={() => { setSelectedTable(null); loadTables(); }}
        subjectLabel={subjectLabel}
        semesterLabel={semesterLabel}
      />`;

if (src.includes(OLD_SESSION_CALL)) {
  src = src.replace(OLD_SESSION_CALL, NEW_SESSION_CALL);
  console.log('✅ Updated AttendanceSessionView call to pass grades');
} else {
  console.log('❌ Could not find AttendanceSessionView call');
}

writeFileSync(file, src, 'utf8');
console.log('\n✅ All changes applied. File written with UTF-8 encoding.');

// Verify
const result = readFileSync(file, 'utf8');
console.log('Auto-enroll note check:', result.includes('Auto-enroll') ? 'FOUND' : 'NOT FOUND');
console.log('subjectAvailable check:', result.includes('subjectAvailable') ? 'FOUND' : 'NOT FOUND');
console.log('optgroup check:', result.includes('optgroup') ? 'FOUND' : 'NOT FOUND');
console.log('grades={grades} in session call:', result.includes('grades={grades}') ? 'FOUND' : 'NOT FOUND');
const iconIdx = result.indexOf('icon: "');
const sample = result.substring(iconIdx, iconIdx + 30);
console.log('Emoji still intact:', JSON.stringify(sample));
