import { readFileSync, writeFileSync } from 'fs';

const file = 'src/App.js';
let src = readFileSync(file, 'utf8');

// ── 1. Add grades prop to AttendanceManage render call ──
const OLD_RENDER = `{page === "attendance" && (role === "teacher" || role === "developer" || role === "owner") && <AttendanceManage token={auth.token} role={role} students={students} subjects={subjects} />}`;
const NEW_RENDER = `{page === "attendance" && (role === "teacher" || role === "developer" || role === "owner") && <AttendanceManage token={auth.token} role={role} students={students} subjects={subjects} grades={grades} />}`;

if (src.includes(OLD_RENDER)) {
  src = src.replace(OLD_RENDER, NEW_RENDER);
  console.log('✅ Added grades prop to AttendanceManage render call');
} else {
  console.log('❌ Could not find AttendanceManage render call');
}

// ── 2. Update component signature to accept grades ──
const OLD_SIG = `function AttendanceManage({ token, role, students, subjects }) {`;
const NEW_SIG = `function AttendanceManage({ token, role, students, subjects, grades = [] }) {`;

if (src.includes(OLD_SIG)) {
  src = src.replace(OLD_SIG, NEW_SIG);
  console.log('✅ Updated AttendanceManage signature to accept grades');
} else {
  console.log('❌ Could not find AttendanceManage signature');
}

// ── 3. Replace handleCreate to auto-enroll subject students ──
const OLD_HANDLE_CREATE = `  const handleCreate = async () => {
    if (!form.subject_id) return flash("Please select a subject.", "err");
    if (!form.block_number.trim()) return flash("Block/Section is required.", "err");
    if (!form.semester_id) return flash("Select a semester.", "err");
    setCreating(true);
    try {
      const selectedSubject = subjects.find(s => s.id === form.subject_id);
      await api("/attendance", { method: "POST", body: {
        course_name: selectedSubject?.name || form.subject_id,
        block_number: form.block_number.trim(),
        subject_id: form.subject_id,
        semester_id: Number(form.semester_id),
        time_slot: form.time_slot,
        term_period: form.term_period
      }}, token);
      flash("✅ Attendance sheet created!");
      setShowCreate(false);
      setForm(f => ({ ...f, block_number: "" }));
      loadTables();
    } catch (e) { flash(e.message, "err"); }
    finally { setCreating(false); }
  };`;

const NEW_HANDLE_CREATE = `  const handleCreate = async () => {
    if (!form.subject_id) return flash("Please select a subject.", "err");
    if (!form.block_number.trim()) return flash("Block/Section is required.", "err");
    if (!form.semester_id) return flash("Select a semester.", "err");
    setCreating(true);
    try {
      const selectedSubject = subjects.find(s => s.id === form.subject_id);
      await api("/attendance", { method: "POST", body: {
        course_name: selectedSubject?.name || form.subject_id,
        block_number: form.block_number.trim(),
        subject_id: form.subject_id,
        semester_id: Number(form.semester_id),
        time_slot: form.time_slot,
        term_period: form.term_period
      }}, token);

      // Auto-enroll students already enrolled in this subject (via grades/student management)
      const freshTables = await api("/attendance/tables", {}, token);
      const newTable = freshTables[0]; // newest table is first (ORDER BY created_at DESC)
      if (newTable) {
        // Get students enrolled in this subject from grades data
        const subjectStudentIds = [...new Set(
          grades
            .filter(g => g.subject_id === form.subject_id)
            .map(g => g.student_id)
        )];
        // Enroll each student into the new attendance table
        let enrolled = 0;
        for (const sid of subjectStudentIds) {
          try {
            await api(\`/attendance/tables/\${newTable.id}/enroll\`, { method: "POST", body: { student_id: sid } }, token);
            enrolled++;
          } catch (_) { /* skip already enrolled or not found */ }
        }
        flash(\`Attendance sheet created! Auto-enrolled \${enrolled} student\${enrolled !== 1 ? "s" : ""} from subject enrollment.\`);
      } else {
        flash("Attendance sheet created!");
      }

      setShowCreate(false);
      setForm(f => ({ ...f, block_number: "" }));
      loadTables();
    } catch (e) { flash(e.message, "err"); }
    finally { setCreating(false); }
  };`;

if (src.includes(OLD_HANDLE_CREATE)) {
  src = src.replace(OLD_HANDLE_CREATE, NEW_HANDLE_CREATE);
  console.log('✅ Updated handleCreate to auto-enroll students');
} else {
  console.log('❌ Could not find handleCreate - trying to locate it...');
  const idx = src.indexOf('const handleCreate = async');
  if (idx !== -1) {
    console.log('Found at char', idx, ':', src.substring(idx, idx + 100));
  }
}

// ── 4. Update "Add Student" section in AttendanceSessionView to show subject-enrolled students first ──
// In AttendanceSessionView, we want to show students enrolled in the attendance table's subject 
// at the top of the "Add Student" dropdown
const OLD_AVAILABLE = `  const alreadyEnrolledIds = new Set(enrolledStudents.map(s => s.student_id));
  const availableToAdd = allStudents.filter(s => !alreadyEnrolledIds.has(s.id));`;

const NEW_AVAILABLE = `  const alreadyEnrolledIds = new Set(enrolledStudents.map(s => s.student_id));
  // Students not yet enrolled in this attendance sheet
  const availableToAdd = allStudents.filter(s => !alreadyEnrolledIds.has(s.id));`;

// No change needed here since the list already shows unenrolled students correctly

writeFileSync(file, src, 'utf8');
console.log('\\n✅ Done. File written with UTF-8 encoding.');

// Verify
const result = readFileSync(file, 'utf8');
const iconIdx = result.indexOf('icon: "');
const sample = result.substring(iconIdx, iconIdx + 30);
console.log('Emoji check:', JSON.stringify(sample));
console.log('grades prop check:', result.includes('grades={grades}') ? 'FOUND' : 'NOT FOUND');
console.log('grades default check:', result.includes('grades = []') ? 'FOUND' : 'NOT FOUND');
console.log('Auto-enroll check:', result.includes('Auto-enrolled') ? 'FOUND' : 'NOT FOUND');
