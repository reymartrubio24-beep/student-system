import { readFileSync, writeFileSync } from 'fs';

const file = 'src/App.js';
let src = readFileSync(file, 'utf8');

console.log('File length before:', src.length);

// ── 1. Fix the attendance page render (remove duplicate TeacherAttendanceDashboard line) ──
src = src.replace(
  `            {page === "attendance"  && hasPermission(permissions, "attendance",  role) && <AttendanceManage token={auth.token} role={role} students={students} subjects={subjects} />}\r\n            {page === "attendance"  && role === "teacher" && <TeacherAttendanceDashboard token={auth.token} teacherUuid={auth?.uuid} subjects={subjects} />}`,
  `            {page === "attendance"  && hasPermission(permissions, "attendance",  role) && <AttendanceManage token={auth.token} role={role} students={students} subjects={subjects} />}`
);

// Also try with \n only
src = src.replace(
  `            {page === "attendance"  && hasPermission(permissions, "attendance",  role) && <AttendanceManage token={auth.token} role={role} students={students} subjects={subjects} />}\n            {page === "attendance"  && role === "teacher" && <TeacherAttendanceDashboard token={auth.token} teacherUuid={auth?.uuid} subjects={subjects} />}`,
  `            {page === "attendance"  && hasPermission(permissions, "attendance",  role) && <AttendanceManage token={auth.token} role={role} students={students} subjects={subjects} />}`
);

// ── 2. Find and remove the old AttendanceManage component ──
const oldAttStart = '\nfunction AttendanceManage({ token, role, students, subjects }) {\n  const [tables, setTables] = useState([]);\n  const [loading, setLoading] = useState(false);\n  const [error, setError] = useState(null);';

const idx1 = src.indexOf(oldAttStart);
if (idx1 === -1) {
  console.log('Old AttendanceManage not found - trying alternate search');
  // Try finding by unique pattern in old component
  const altSearch = 'const [undoStack, setUndoStack] = useState([]);';
  const idx_alt = src.indexOf(altSearch);
  console.log('Alt search idx:', idx_alt);
} else {
  console.log('Found old AttendanceManage at index:', idx1);
}

// ── 3. Remove old AttendanceManage + TeacherAttendanceDashboard block ──
// Find the start marker (just before old AttendanceManage)
const MARKER_START = '\nfunction AttendanceManage({ token, role, students, subjects }) {';
const MARKER_END_TEACHER = '\nfunction TeacherAttendanceDashboard({ token, teacherUuid, subjects }) {';

const startIdx = src.indexOf(MARKER_START);

if (startIdx !== -1) {
  // Find end: the closing } of TeacherAttendanceDashboard
  // Look for "}\n/*" which appears right after the TeacherAttendanceDashboard ends
  const teacherIdx = src.indexOf(MARKER_END_TEACHER, startIdx);
  if (teacherIdx !== -1) {
    // Find the closing of TeacherAttendanceDashboard - look for "}\n/*" or the next function
    const afterTeacher = src.indexOf('\n/*\nfunction MyAttendance', teacherIdx);
    if (afterTeacher !== -1) {
      // Remove from startIdx to end of TeacherAttendanceDashboard 
      // End is the "}" line just before the "/*"
      const endIdx = afterTeacher;
      const removed = src.substring(startIdx, endIdx);
      console.log('Removing block from', startIdx, 'to', endIdx);
      console.log('First 100 chars of removed block:', removed.substring(0, 100));
      console.log('Last 100 chars of removed block:', removed.substring(removed.length - 100));
      src = src.substring(0, startIdx) + src.substring(endIdx);
      console.log('Removed old attendance components');
    } else {
      console.log('Could not find end of TeacherAttendanceDashboard');
    }
  } else {
    console.log('Could not find TeacherAttendanceDashboard');
  }
} else {
  console.log('Old AttendanceManage not found - may already be removed');
}

// ── 4. Insert new AttendanceManage + AttendanceSessionView before AuthScreen ──
const AUTH_MARKER = '\nfunction AuthScreen({ onAuthed, logo }) {';
const authIdx = src.indexOf(AUTH_MARKER);

if (authIdx === -1) {
  console.error('FATAL: AuthScreen not found!');
  process.exit(1);
}

const newComponents = `
// ─── Attendance Management ────────────────────────────────────────────────────
function AttendanceManage({ token, role, students, subjects }) {
  const [tables, setTables] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedTable, setSelectedTable] = useState(null);
  const [msg, setMsg] = useState({ text: "", type: "ok" });
  const [form, setForm] = useState({
    subject_id: "",
    block_number: "",
    time_slot: "Morning Class",
    term_period: "1st prelim",
    semester_id: ""
  });
  const [creating, setCreating] = useState(false);

  const flash = (text, type = "ok") => { setMsg({ text, type }); setTimeout(() => setMsg({ text: "", type: "ok" }), 3000); };

  const loadTables = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await api("/attendance/tables", {}, token);
      setTables(rows);
    } catch (e) { flash(e.message, "err"); }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { loadTables(); }, [loadTables]);
  useEffect(() => {
    api("/semesters", {}, token).then(d => setSemesters(d)).catch(() => {});
  }, [token]);
  useEffect(() => {
    if (subjects.length > 0 && !form.subject_id) {
      setForm(f => ({ ...f, subject_id: subjects[0].id }));
    }
  }, [subjects]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (semesters.length > 0 && !form.semester_id) {
      setForm(f => ({ ...f, semester_id: String(semesters[0].id) }));
    }
  }, [semesters]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCreate = async () => {
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
      flash("\u2705 Attendance sheet created!");
      setShowCreate(false);
      setForm(f => ({ ...f, block_number: "" }));
      loadTables();
    } catch (e) { flash(e.message, "err"); }
    finally { setCreating(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this attendance sheet?")) return;
    try {
      await api(\`/attendance/tables/\${id}\`, { method: "DELETE" }, token);
      flash("\uD83D\uDDD1\uFE0F Deleted.");
      if (selectedTable?.id === id) setSelectedTable(null);
      loadTables();
    } catch (e) { flash(e.message, "err"); }
  };

  const semesterLabel = (semId) => {
    const s = semesters.find(x => String(x.id) === String(semId));
    return s ? \`\${s.school_year} \u00B7 \${s.term}\` : \`Semester \${semId}\`;
  };

  const subjectLabel = (subjectId) => {
    const s = subjects.find(x => x.id === subjectId);
    return s ? \`\${s.id} \u2014 \${s.name}\` : subjectId;
  };

  if (selectedTable) {
    return (
      <AttendanceSessionView
        table={selectedTable}
        token={token}
        role={role}
        allStudents={students}
        subjects={subjects}
        onBack={() => { setSelectedTable(null); loadTables(); }}
        subjectLabel={subjectLabel}
        semesterLabel={semesterLabel}
      />
    );
  }

  return (
    <div>
      <PageHeader title="\uD83D\uDCC5 Attendance" sub="Create and manage attendance sheets by subject" />

      {msg.text && (
        <div style={{
          background: msg.type === "err" ? "rgba(239,68,68,0.12)" : "rgba(16,185,129,0.12)",
          border: \`1px solid \${msg.type === "err" ? "rgba(239,68,68,0.3)" : "rgba(16,185,129,0.3)"}\`,
          color: msg.type === "err" ? "#fca5a5" : "#34d399",
          borderRadius: 10, padding: "10px 16px", marginBottom: 20, fontSize: 13, fontWeight: 600
        }}>{msg.text}</div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div style={{ fontSize: 14, color: "var(--text-dim)" }}>
          {tables.length} attendance sheet{tables.length !== 1 ? "s" : ""}
        </div>
        {(role === "teacher" || role === "developer" || role === "owner") && (
          <Btn variant="primary" onClick={() => setShowCreate(true)}>
            + New Attendance Sheet
          </Btn>
        )}
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 60, color: "var(--text-dim)", fontSize: 14 }}>
          Loading attendance sheets...
        </div>
      ) : tables.length === 0 ? (
        <div className="glass-card" style={{ textAlign: "center", padding: "60px 20px" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>\uD83D\uDCC5</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "white", marginBottom: 8 }}>No Attendance Sheets Yet</div>
          <div style={{ fontSize: 14, color: "var(--text-dim)", marginBottom: 24 }}>
            Create your first attendance sheet to get started.
          </div>
          {(role === "teacher" || role === "developer" || role === "owner") && (
            <Btn variant="primary" onClick={() => setShowCreate(true)}>+ Create First Sheet</Btn>
          )}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
          {tables.map(t => (
            <div key={t.id}
              onClick={() => setSelectedTable(t)}
              className="glass-card"
              style={{
                cursor: "pointer",
                border: "1px solid var(--border-color)",
                borderRadius: 14, padding: "20px 22px",
                transition: "all 0.25s ease",
                position: "relative",
                overflow: "hidden"
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = "var(--neon-blue)";
                e.currentTarget.style.boxShadow = "0 0 24px rgba(68,215,255,0.15)";
                e.currentTarget.style.transform = "translateY(-2px)";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = "var(--border-color)";
                e.currentTarget.style.boxShadow = "none";
                e.currentTarget.style.transform = "none";
              }}
            >
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3,
                background: "linear-gradient(90deg, var(--neon-blue), #6366f1)", borderRadius: "14px 14px 0 0" }} />

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, color: "var(--neon-blue)", fontWeight: 700,
                    textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>
                    {t.time_slot}
                  </div>
                  <div style={{ fontSize: 17, fontWeight: 800, color: "white", marginBottom: 6,
                    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {subjectLabel(t.subject_id)}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-dim)", marginBottom: 4 }}>
                    Block / Section: <strong style={{ color: "white" }}>{t.block_number}</strong>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-dim)", marginBottom: 4 }}>
                    {semesterLabel(t.semester_id)}
                  </div>
                  {t.term_period && (
                    <div style={{ fontSize: 12, color: "var(--text-dim)" }}>
                      {t.term_period}
                    </div>
                  )}
                </div>
                {(role === "teacher" || role === "developer" || role === "owner") && (
                  <button
                    onClick={e => { e.stopPropagation(); handleDelete(t.id); }}
                    style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)",
                      color: "#f87171", borderRadius: 8, cursor: "pointer", padding: "6px 10px",
                      fontSize: 12, fontWeight: 700, flexShrink: 0, marginLeft: 10, transition: "all 0.2s" }}
                    onMouseEnter={e => { e.currentTarget.style.background = "rgba(239,68,68,0.22)"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "rgba(239,68,68,0.12)"; }}
                  >
                    Delete
                  </button>
                )}
              </div>

              <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid var(--border-color)",
                display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 12, color: "var(--neon-blue)", fontWeight: 600 }}>
                  Click to open attendance
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal show={showCreate} title="New Attendance Sheet" onClose={() => setShowCreate(false)} width={540}>
        <div style={{ display: "grid", gap: 4 }}>
          <Select label="Subject *" value={form.subject_id} onChange={e => setForm(f => ({ ...f, subject_id: e.target.value }))}>
            <option value="">--- Select Subject ---</option>
            {subjects.map(s => (
              <option key={s.id} value={s.id}>{s.id} - {s.name}</option>
            ))}
          </Select>

          <Input label="Block / Section *" placeholder="e.g. BSCS 2A, Block 3"
            value={form.block_number} onChange={e => setForm(f => ({ ...f, block_number: e.target.value }))} />

          <Select label="Semester *" value={form.semester_id} onChange={e => setForm(f => ({ ...f, semester_id: e.target.value }))}>
            <option value="">--- Select Semester ---</option>
            {semesters.map(s => (
              <option key={s.id} value={s.id}>{s.school_year} - {s.term}</option>
            ))}
          </Select>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Select label="Time Slot" value={form.time_slot} onChange={e => setForm(f => ({ ...f, time_slot: e.target.value }))}>
              <option value="Morning Class">Morning Class</option>
              <option value="Afternoon Class">Afternoon Class</option>
              <option value="Evening Class">Evening Class</option>
            </Select>
            <Select label="Term Period" value={form.term_period} onChange={e => setForm(f => ({ ...f, term_period: e.target.value }))}>
              <option value="1st prelim">1st Prelim</option>
              <option value="2nd prelim">2nd Prelim</option>
              <option value="midterm">Midterm</option>
              <option value="semi-final">Semi-Final</option>
              <option value="final">Final</option>
            </Select>
          </div>

          {form.subject_id && (
            <div style={{ background: "rgba(68,215,255,0.07)", border: "1px solid rgba(68,215,255,0.2)",
              borderRadius: 10, padding: "12px 16px", fontSize: 13, color: "var(--text-dim)", marginBottom: 4 }}>
              <strong style={{ color: "var(--neon-blue)" }}>Note:</strong> After creating this sheet, you can add students from the enrolled students tab.
            </div>
          )}

          <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
            <Btn variant="primary" onClick={handleCreate} disabled={creating} style={{ flex: 1 }}>
              {creating ? "Creating..." : "Create Sheet"}
            </Btn>
            <Btn variant="ghost" onClick={() => setShowCreate(false)} style={{ flex: 1 }}>Cancel</Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ─── Attendance Session View ──────────────────────────────────────────────────
function AttendanceSessionView({ table, token, role, allStudents, subjects, onBack, subjectLabel, semesterLabel }) {
  const [tab, setTab] = useState("attendance");
  const [enrolledStudents, setEnrolledStudents] = useState([]);
  const [attendanceData, setAttendanceData] = useState([]);
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    return d.toISOString().split("T")[0];
  });
  const [loading, setLoading] = useState(false);
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [msg, setMsg] = useState({ text: "", type: "ok" });
  const [searchStu, setSearchStu] = useState("");
  const [addStudentId, setAddStudentId] = useState("");
  const [savingMap, setSavingMap] = useState({});

  const flash = (text, type = "ok") => { setMsg({ text, type }); setTimeout(() => setMsg({ text: "", type: "ok" }), 3000); };

  const loadEnrolled = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await api(\`/attendance/tables/\${table.id}/enrollments\`, {}, token);
      setEnrolledStudents(rows);
    } catch (e) { flash(e.message, "err"); }
    finally { setLoading(false); }
  }, [table.id, token]);

  const loadAttendance = useCallback(async () => {
    setLoadingAttendance(true);
    try {
      const data = await api(\`/attendance/tables/\${table.id}/attendance?date=\${selectedDate}\`, {}, token);
      setAttendanceData(data.rows || []);
    } catch (e) { flash(e.message, "err"); }
    finally { setLoadingAttendance(false); }
  }, [table.id, token, selectedDate]);

  useEffect(() => { loadEnrolled(); }, [loadEnrolled]);
  useEffect(() => { if (tab === "attendance") loadAttendance(); }, [loadAttendance, tab]);

  const alreadyEnrolledIds = new Set(enrolledStudents.map(s => s.student_id));
  const availableToAdd = allStudents.filter(s => !alreadyEnrolledIds.has(s.id));

  const handleEnrollStudent = async () => {
    if (!addStudentId) return;
    try {
      await api(\`/attendance/tables/\${table.id}/enroll\`, { method: "POST", body: { student_id: addStudentId } }, token);
      setAddStudentId("");
      flash("\u2705 Student added to attendance sheet.");
      loadEnrolled();
      if (tab === "attendance") loadAttendance();
    } catch (e) { flash(e.message, "err"); }
  };

  const handleUnenroll = async (studentId) => {
    if (!window.confirm("Remove this student from the attendance sheet?")) return;
    try {
      await api(\`/attendance/tables/\${table.id}/enroll/\${encodeURIComponent(studentId)}\`, { method: "DELETE" }, token);
      flash("Student removed.");
      loadEnrolled();
      if (tab === "attendance") loadAttendance();
    } catch (e) { flash(e.message, "err"); }
  };

  const handleSetAttendance = async (studentId, status) => {
    setSavingMap(m => ({ ...m, [studentId]: true }));
    try {
      await api(\`/attendance/tables/\${table.id}/attendance/\${encodeURIComponent(studentId)}\`,
        { method: "PUT", body: { status, date: selectedDate } }, token);
      setAttendanceData(prev => prev.map(r =>
        r.student_id === studentId ? { ...r, attendance_status: status } : r
      ));
    } catch (e) { flash(e.message, "err"); }
    finally { setSavingMap(m => ({ ...m, [studentId]: false })); }
  };

  const subj = subjects.find(s => s.id === table.subject_id);

  const statusColor = {
    present: { bg: "rgba(74,222,128,0.15)", border: "rgba(74,222,128,0.4)", color: "#4ade80" },
    absent:  { bg: "rgba(248,113,113,0.15)", border: "rgba(248,113,113,0.4)", color: "#f87171" },
    late:    { bg: "rgba(251,191,36,0.15)", border: "rgba(251,191,36,0.4)", color: "#fbbf24" },
    excuse:  { bg: "rgba(148,163,184,0.15)", border: "rgba(148,163,184,0.4)", color: "#94a3b8" },
  };

  const filteredEnrolled = enrolledStudents.filter(s =>
    s.name?.toLowerCase().includes(searchStu.toLowerCase()) ||
    s.student_id?.toLowerCase().includes(searchStu.toLowerCase())
  );

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 24 }}>
        <button
          onClick={onBack}
          style={{ background: "rgba(68,215,255,0.1)", border: "1px solid rgba(68,215,255,0.3)",
            color: "var(--neon-blue)", borderRadius: 10, cursor: "pointer", padding: "8px 16px",
            fontSize: 13, fontWeight: 700 }}
        >
          Back to Attendance List
        </button>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--neon-blue)", textTransform: "uppercase", letterSpacing: 1.5 }}>
            Attendance Sheet
          </div>
          <h1 className="glow-text" style={{ fontSize: 24, fontWeight: 800, color: "white", margin: 0 }}>
            {subjectLabel ? subjectLabel(table.subject_id) : table.subject_id}
          </h1>
        </div>
      </div>

      {msg.text && (
        <div style={{
          background: msg.type === "err" ? "rgba(239,68,68,0.12)" : "rgba(16,185,129,0.12)",
          border: \`1px solid \${msg.type === "err" ? "rgba(239,68,68,0.3)" : "rgba(16,185,129,0.3)"}\`,
          color: msg.type === "err" ? "#fca5a5" : "#34d399",
          borderRadius: 10, padding: "10px 16px", marginBottom: 16, fontSize: 13, fontWeight: 600
        }}>{msg.text}</div>
      )}

      <div className="glass-card" style={{ padding: "16px 22px", marginBottom: 22,
        background: "linear-gradient(135deg, rgba(68,215,255,0.07), rgba(99,102,241,0.07))",
        border: "1px solid rgba(68,215,255,0.2)", borderRadius: 14 }}>
        <div style={{ display: "flex", gap: 28, flexWrap: "wrap" }}>
          {[
            { label: "Block/Section", value: table.block_number },
            { label: "Time Slot", value: table.time_slot },
            { label: "Term Period", value: table.term_period || "-" },
            { label: "Semester", value: semesterLabel ? semesterLabel(table.semester_id) : table.semester_id },
            { label: "Students Enrolled", value: \`\${enrolledStudents.length} enrolled\` },
            ...(subj ? [{ label: "Professor", value: subj.professor || "-" }, { label: "Room", value: subj.room || "-" }] : []),
          ].map(item => (
            <div key={item.label}>
              <div style={{ fontSize: 10, color: "var(--text-dim)", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>{item.label}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "white", marginTop: 2 }}>{item.value}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", gap: 4, marginBottom: 20, background: "rgba(255,255,255,0.05)", borderRadius: 12, padding: 4 }}>
        {[
          { id: "attendance", label: "Take Attendance" },
          { id: "students", label: "Enrolled Students" },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flex: 1, padding: "10px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700,
            background: tab === t.id ? "rgba(68,215,255,0.2)" : "transparent",
            color: tab === t.id ? "var(--neon-blue)" : "var(--text-dim)",
            outline: tab === t.id ? "1px solid rgba(68,215,255,0.3)" : "1px solid transparent",
            transition: "all 0.2s"
          }}>{t.label}</button>
        ))}
      </div>

      {tab === "attendance" && (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: "var(--text-dim)", display: "block", marginBottom: 6 }}>
                DATE
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                style={{ padding: "10px 14px", border: "1px solid var(--border-color)", borderRadius: 10,
                  background: "#0f172a", color: "white", outline: "none", fontSize: 14 }}
              />
            </div>
            <div style={{ alignSelf: "flex-end" }}>
              <Btn variant="outline" onClick={loadAttendance}>Refresh</Btn>
            </div>
          </div>

          {loadingAttendance ? (
            <div style={{ textAlign: "center", padding: 40, color: "var(--text-dim)" }}>Loading...</div>
          ) : attendanceData.length === 0 ? (
            <div className="glass-card" style={{ textAlign: "center", padding: "40px 20px", color: "var(--text-dim)" }}>
              No students enrolled yet. Go to the <strong style={{ color: "var(--neon-blue)" }}>Enrolled Students</strong> tab to add students.
            </div>
          ) : (
            <div className="glass-card" style={{ padding: 0, overflow: "hidden", borderRadius: 14 }}>
              <div className="table-container">
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      {["#", "Student ID", "Name", "Course / Year", "Status", "Mark Attendance"].map(h => <Th key={h}>{h}</Th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {attendanceData.map((row, idx) => {
                      const status = row.attendance_status || "";
                      const sc = statusColor[status] || { bg: "transparent", border: "transparent", color: "var(--text-dim)" };
                      return (
                        <tr key={row.student_id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                          <Td><span style={{ fontSize: 12, color: "var(--text-dim)" }}>{idx + 1}</span></Td>
                          <Td><code style={{ background: "rgba(68,215,255,0.1)", color: "var(--neon-blue)", padding: "3px 8px", borderRadius: 6, fontSize: 12 }}>{row.student_id}</code></Td>
                          <Td><strong>{row.name}</strong></Td>
                          <Td style={{ fontSize: 12, color: "var(--text-dim)" }}>{row.course} - {row.year}</Td>
                          <Td>
                            {status ? (
                              <span style={{ background: sc.bg, border: \`1px solid \${sc.border}\`, color: sc.color,
                                padding: "3px 12px", borderRadius: 20, fontSize: 12, fontWeight: 700 }}>
                                {status.charAt(0).toUpperCase() + status.slice(1)}
                              </span>
                            ) : (
                              <span style={{ color: "var(--text-dim)", fontSize: 12 }}>Not marked</span>
                            )}
                          </Td>
                          <Td>
                            {(role === "teacher" || role === "developer" || role === "owner") && (
                              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                                {["present", "absent", "late", "excuse"].map(s => {
                                  const c = statusColor[s];
                                  const isActive = status === s;
                                  return (
                                    <button key={s}
                                      disabled={savingMap[row.student_id]}
                                      onClick={() => handleSetAttendance(row.student_id, s)}
                                      style={{
                                        padding: "4px 10px", borderRadius: 8, fontSize: 11, fontWeight: 700,
                                        cursor: savingMap[row.student_id] ? "not-allowed" : "pointer",
                                        border: \`1px solid \${isActive ? c.border : "var(--border-color)"}\`,
                                        background: isActive ? c.bg : "transparent",
                                        color: isActive ? c.color : "var(--text-dim)",
                                        transition: "all 0.15s",
                                        opacity: savingMap[row.student_id] ? 0.5 : 1
                                      }}
                                    >
                                      {s.charAt(0).toUpperCase() + s.slice(1)}
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </Td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div style={{ padding: "12px 20px", background: "rgba(255,255,255,0.03)", borderTop: "1px solid var(--border-color)",
                display: "flex", gap: 20, flexWrap: "wrap" }}>
                {Object.entries(statusColor).map(([s, c]) => {
                  const count = attendanceData.filter(r => r.attendance_status === s).length;
                  return (
                    <div key={s} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ width: 10, height: 10, borderRadius: "50%", background: c.color }} />
                      <span style={{ fontSize: 12, color: c.color, fontWeight: 700 }}>
                        {s.charAt(0).toUpperCase() + s.slice(1)}: {count}
                      </span>
                    </div>
                  );
                })}
                <div style={{ marginLeft: "auto", fontSize: 12, color: "var(--text-dim)" }}>
                  Not marked: {attendanceData.filter(r => !r.attendance_status).length}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "students" && (
        <div>
          {(role === "teacher" || role === "developer" || role === "owner") && (
            <Card title="Add Student to Sheet">
              <div style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 220 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: "var(--text-dim)", display: "block", marginBottom: 6 }}>SELECT STUDENT</label>
                  <select
                    value={addStudentId}
                    onChange={e => setAddStudentId(e.target.value)}
                    style={{ width: "100%", padding: "11px 14px", border: "1px solid var(--border-color)", borderRadius: 10,
                      background: "#0f172a", color: "white", outline: "none", fontSize: 14 }}
                  >
                    <option value="">--- Select Student ---</option>
                    {availableToAdd.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.id}) - {s.course}</option>
                    ))}
                  </select>
                </div>
                <Btn variant="primary" onClick={handleEnrollStudent} disabled={!addStudentId}>+ Add</Btn>
              </div>
              <div style={{ marginTop: 10, fontSize: 12, color: "var(--text-dim)" }}>
                Tip: Select a student from the full student list to add them to this attendance sheet.
                Subject: <strong style={{ color: "var(--neon-blue)" }}>
                  {subjects.find(s => s.id === table.subject_id)?.name || table.subject_id}
                </strong>
              </div>
            </Card>
          )}

          <Card title={\`Enrolled Students (\${enrolledStudents.length})\`}>
            <input
              placeholder="Search by name or ID..."
              value={searchStu}
              onChange={e => setSearchStu(e.target.value)}
              style={{ width: "100%", padding: "10px 14px", border: "1px solid var(--border-color)",
                borderRadius: 10, background: "#0f172a", color: "white", outline: "none",
                fontSize: 13, marginBottom: 16, boxSizing: "border-box" }}
            />
            {loading ? (
              <div style={{ textAlign: "center", padding: 30, color: "var(--text-dim)" }}>Loading...</div>
            ) : filteredEnrolled.length === 0 ? (
              <div style={{ textAlign: "center", padding: "30px 0", color: "var(--text-dim)" }}>
                {enrolledStudents.length === 0 ? "No students enrolled yet." : "No matches found."}
              </div>
            ) : (
              <div className="table-container">
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>{["#", "Student ID", "Name", "Course", "Year", "Status", "Actions"].map(h => <Th key={h}>{h}</Th>)}</tr>
                  </thead>
                  <tbody>
                    {filteredEnrolled.map((s, idx) => (
                      <tr key={s.student_id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                        <Td><span style={{ fontSize: 12, color: "var(--text-dim)" }}>{idx + 1}</span></Td>
                        <Td><code style={{ background: "rgba(68,215,255,0.1)", color: "var(--neon-blue)", padding: "3px 8px", borderRadius: 6, fontSize: 12 }}>{s.student_id}</code></Td>
                        <Td><strong>{s.name}</strong></Td>
                        <Td style={{ fontSize: 12 }}>{s.course}</Td>
                        <Td style={{ fontSize: 12 }}>{s.year}</Td>
                        <Td><Badge text={s.status} type={s.status === "Active" ? "green" : "red"} /></Td>
                        <Td>
                          {(role === "teacher" || role === "developer" || role === "owner") && (
                            <Btn variant="danger" onClick={() => handleUnenroll(s.student_id)}
                              style={{ fontSize: 11, padding: "4px 10px" }}>Remove</Btn>
                          )}
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}

`;

src = src.substring(0, authIdx) + newComponents + src.substring(authIdx);
console.log('Inserted new attendance components before AuthScreen');
console.log('File length after:', src.length);

writeFileSync(file, src, 'utf8');
console.log('Written successfully with UTF-8 encoding (no BOM)');
