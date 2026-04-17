const fs = require('fs');
let src = fs.readFileSync('src/App.js', 'utf8');

// 1) Load semesters for all roles, not just student
const semLoadTarget = `  useEffect(() => {
    if (role === "student") {
      api("/semesters", {}, token).then(setSemesters).catch(() => {});
    }
  }, [role, token]);`;
const semLoadReplacement = `  useEffect(() => {
    api("/semesters", {}, token).then(setSemesters).catch(() => {});
  }, [role, token]);`;
if(src.includes(semLoadTarget)) src=src.replace(semLoadTarget, semLoadReplacement);

// 2) Update Grades map generation (client-side state).
// We include semester_id in the payload, but we'll key the local map by subjectId_semesterId to support multiples.
// Wait, actually, let's keep it mostly untouched, just add semester_id to the object, and we can filter.
// The GET /grades endpoint already returns all grades. 
// "const studentGrades = useMemo(() => selectedStudent ? (grades[selectedStudent] || {}) : {}, [selectedStudent, grades]);"
// Right now, map is built outside:
//      const map = allRows.reduce((acc, r) => {
//        if (!acc[r.student_id]) acc[r.student_id] = {};
//        acc[r.student_id][r.subject_id] = {
//          prelim1: r.prelim1, prelim2: r.prelim2, midterm: r.midterm, semi_final: r.semi_final, final: r.final
//        };

// We will change it in index.js useEffect and App.js initialization. That is too widespread.
// Let's just pass semester_id in handleSave.
const formStateTarget = `  const [form, setForm] = useState({ subjectId: "", prelim1: "", prelim2: "", midterm: "", semi_final: "", final: "" });`;
const formStateReplacement = `  const [form, setForm] = useState({ subjectId: "", semesterId: "", prelim1: "", prelim2: "", midterm: "", semi_final: "", final: "" });`;
if(src.includes(formStateTarget)) src=src.replace(formStateTarget, formStateReplacement);

const saveTarget = `  const handleSave = async () => {
    const { subjectId, prelim1, prelim2, midterm, semi_final, final: fin } = form;
    if (!subjectId) return alert("Select a subject.");
    const nums = [prelim1, prelim2, midterm, semi_final, fin].map(v => (v === "" || v === null) ? null : Number(v));
    try {
      if (!editingSubj) {
        await api("/grades", { method: "POST", body: {
          student_id: selectedStudent, subject_id: subjectId,
          prelim1: nums[0], prelim2: nums[1], midterm: nums[2], semi_final: nums[3], final: nums[4]
        } }, token);
      } else {
        await api(\`/grades/\${selectedStudent}/\${subjectId}\`, { method: "PUT", body: {
          prelim1: nums[0], prelim2: nums[1], midterm: nums[2], semi_final: nums[3], final: nums[4]
        } }, token);
      }`;
const saveReplacement = `  const handleSave = async () => {
    const { subjectId, semesterId: formSemId, prelim1, prelim2, midterm, semi_final, final: fin } = form;
    if (!subjectId) return alert("Select a subject.");
    if (!formSemId && !editingSubj) return alert("Select a semester.");
    const nums = [prelim1, prelim2, midterm, semi_final, fin].map(v => (v === "" || v === null) ? null : Number(v));
    try {
      if (!editingSubj) {
        await api("/grades", { method: "POST", body: {
          student_id: selectedStudent, subject_id: subjectId, semester_id: Number(formSemId),
          prelim1: nums[0], prelim2: nums[1], midterm: nums[2], semi_final: nums[3], final: nums[4]
        } }, token);
      } else {
        await api(\`/grades/\${selectedStudent}/\${subjectId}?semester_id=\${formSemId}\`, { method: "PUT", body: {
          prelim1: nums[0], prelim2: nums[1], midterm: nums[2], semi_final: nums[3], final: nums[4]
        } }, token);
      }`;
if(src.includes(saveTarget)) src=src.replace(saveTarget, saveReplacement);

const deleteActionTarget = `                      <Btn variant="danger" onClick={() => setDeleteConfirm(s.id)}>🗑</Btn>`;
const deleteActionReplacement = `                      <Btn variant="danger" onClick={() => setDeleteConfirm({ subj: s.id, sem: studentGrades[s.id]?.semester_id || semesterId })}>🗑</Btn>`;
if(src.includes(deleteActionTarget)) src=src.replace(deleteActionTarget, deleteActionReplacement);

const deleteModalTarget = `      {deleteConfirm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
          <div className="glass-card" style={{ padding: 24, width: "90%", maxWidth: 360, textAlign: "center" }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>⚠️</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "white", marginBottom: 8 }}>Clear Grades?</div>
            <div style={{ fontSize: 13, color: "var(--text-dim)", marginBottom: 24 }}>This will permanently remove the grades for this subject.</div>
            <div style={{ display: "flex", gap: 12 }}>
              <Btn variant="ghost" onClick={() => setDeleteConfirm(null)} style={{ flex: 1 }}>Cancel</Btn>
              <Btn variant="danger" style={{ flex: 1 }} onClick={async () => {
                try {
                  await api(\`/grades/\${selectedStudent}/\${deleteConfirm}\`, { method: "DELETE" }, token);
                  const fresh = await api("/grades", {}, token);
                  const map = fresh.reduce((acc, r) => {
                    if (!acc[r.student_id]) acc[r.student_id] = {};
                    acc[r.student_id][r.subject_id] = { prelim1: r.prelim1, prelim2: r.prelim2, midterm: r.midterm, semi_final: r.semi_final, final: r.final };
                    return acc;
                  }, {});
                  setGrades(map);
                  setDeleteConfirm(null);
                  flash("Grades removed.");
                } catch (e) { alert(e.message); }
              }}>Delete</Btn>`;
// Replace delete logic to pass semesterId
const deleteModalReplacement = `      {deleteConfirm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
          <div className="glass-card" style={{ padding: 24, width: "90%", maxWidth: 360, textAlign: "center" }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>⚠️</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "white", marginBottom: 8 }}>Clear Grades?</div>
            <div style={{ fontSize: 13, color: "var(--text-dim)", marginBottom: 24 }}>This will permanently remove the grades for this subject.</div>
            <div style={{ display: "flex", gap: 12 }}>
              <Btn variant="ghost" onClick={() => setDeleteConfirm(null)} style={{ flex: 1 }}>Cancel</Btn>
              <Btn variant="danger" style={{ flex: 1 }} onClick={async () => {
                try {
                  await api(\`/grades/\${selectedStudent}/\${deleteConfirm.subj}?semester_id=\${deleteConfirm.sem || ""}\`, { method: "DELETE" }, token);
                  const fresh = await api("/grades", {}, token);
                  const map = fresh.reduce((acc, r) => {
                    if (!acc[r.student_id]) acc[r.student_id] = {};
                    acc[r.student_id][r.subject_id] = { prelim1: r.prelim1, prelim2: r.prelim2, midterm: r.midterm, semi_final: r.semi_final, final: r.final, semester_id: r.semester_id };
                    return acc;
                  }, {});
                  setGrades(map);
                  setDeleteConfirm(null);
                  flash("Grades removed.");
                } catch (e) { alert(e.message); }
              }}>Delete</Btn>`;
if(src.includes(deleteModalTarget)) src=src.replace(deleteModalTarget, deleteModalReplacement);

// 3) Modal form additions:
const modalSubjectSelectTarget = `              {!editingSubj ? (
                <div>
                  <div style={{ fontSize: 11, fontWeight: "600", color: "var(--text-dim)", marginBottom: 4, textTransform: "uppercase" }}>Subject</div>
                  <Select value={form.subjectId} onChange={e => setForm({ ...form, subjectId: e.target.value })}>
                    <option value="">-- Choose Subject --</option>
                    {availableSubjects.map(s => <option key={s.id} value={s.id}>{s.name} ({s.id})</option>)}
                  </Select>
                </div>
              ) : (`;
const modalSubjectSelectReplacement = `              {!editingSubj && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: "600", color: "var(--text-dim)", marginBottom: 4, textTransform: "uppercase" }}>Semester</div>
                  <Select value={form.semesterId} onChange={e => setForm({ ...form, semesterId: e.target.value })}>
                    <option value="">-- Choose Semester --</option>
                    {semesters.map(s => <option key={s.id} value={s.id}>{s.school_year} - {s.term}</option>)}
                  </Select>
                </div>
              )}
              {!editingSubj ? (
                <div>
                  <div style={{ fontSize: 11, fontWeight: "600", color: "var(--text-dim)", marginBottom: 4, textTransform: "uppercase" }}>Subject</div>
                  <Select value={form.subjectId} onChange={e => setForm({ ...form, subjectId: e.target.value })}>
                    <option value="">-- Choose Subject --</option>
                    {availableSubjects.map(s => <option key={s.id} value={s.id}>{s.name} ({s.id})</option>)}
                  </Select>
                </div>
              ) : (`;
if(src.includes(modalSubjectSelectTarget)) src=src.replace(modalSubjectSelectTarget, modalSubjectSelectReplacement);

// Add semester dropdown to Admin's Grades view (not just student)
const adminFiltersTarget = `              {role === "student" && semesters.length > 0 && (
                <div style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>`;
const adminFiltersReplacement = `              {semesters.length > 0 && (
                <div style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>`;
if(src.includes(adminFiltersTarget)) src=src.replace(adminFiltersTarget, adminFiltersReplacement);

// Also change open Edit logic:
const openEditTarget = `                            <Btn variant="primary" onClick={() => {
                              const g = studentGrades[s.id] || {};
                              setForm({ subjectId: s.id, prelim1: g.prelim1 ?? "", prelim2: g.prelim2 ?? "", midterm: g.midterm ?? "", semi_final: g.semi_final ?? "", final: g.final ?? "" });
                              setEditingSubj(s.id); setModal("form");
                            }}>✎</Btn>`;
const openEditReplacement = `                            <Btn variant="primary" onClick={() => {
                              const g = studentGrades[s.id] || {};
                              setForm({ subjectId: s.id, semesterId: g.semester_id ?? semesterId, prelim1: g.prelim1 ?? "", prelim2: g.prelim2 ?? "", midterm: g.midterm ?? "", semi_final: g.semi_final ?? "", final: g.final ?? "" });
                              setEditingSubj(s.id); setModal("form");
                            }}>✎</Btn>`;
if(src.includes(openEditTarget)) src=src.replace(openEditTarget, openEditReplacement);

// Update map building everywhere in handleSave:
const mapTarget1 = `      const map = allRows.reduce((acc, r) => {
        if (!acc[r.student_id]) acc[r.student_id] = {};
        acc[r.student_id][r.subject_id] = {
          prelim1: r.prelim1, prelim2: r.prelim2, midterm: r.midterm, semi_final: r.semi_final, final: r.final
        };`;
const mapReplacement1 = `      const map = allRows.reduce((acc, r) => {
        if (!acc[r.student_id]) acc[r.student_id] = {};
        acc[r.student_id][r.subject_id] = {
          prelim1: r.prelim1, prelim2: r.prelim2, midterm: r.midterm, semi_final: r.semi_final, final: r.final, semester_id: r.semester_id
        };`;
if(src.includes(mapTarget1)) src=src.replace(mapTarget1, mapReplacement1);

fs.writeFileSync('src/App.js', src);
console.log('App.js patched successfully for Grades semester logic!');
