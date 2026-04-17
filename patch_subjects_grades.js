const fs = require('fs');
let src = fs.readFileSync('src/App.js', 'utf8');
const origLen = src.length;

// ====================================================================
// PATCH 1: Add semester state + filter to Subjects component (student)
// ====================================================================

// 1a) Add semesters/semesterId state after the 'busy' state
const SUBJ_STATE_TARGET = `  const [busy, setBusy] = useState(false);\r\n\r\n  const displaySubjects = useMemo(() => {
    if (role === "student" && studentIdFromAuth && grades) {
      const myGrades = grades[studentIdFromAuth] || {};
      return subjects.filter(s => myGrades[s.id] !== undefined);
    }
    return subjects;
  }, [subjects, role, studentIdFromAuth, grades]);`;

// Use regex since line endings may vary
const subStateIdx = src.indexOf(`  const [busy, setBusy] = useState(false);\r\n\r\n  const displaySubjects = useMemo`);
if (subStateIdx === -1) {
  console.error('PATCH 1a TARGET NOT FOUND! Searching...');
  const idx = src.indexOf('function Subjects(');
  console.log(src.slice(idx, idx + 800));
  process.exit(1);
}

const subStateEnd = src.indexOf('}, [subjects, role, studentIdFromAuth, grades]);', subStateIdx) + '}, [subjects, role, studentIdFromAuth, grades]);'.length;
const subStateOld = src.slice(subStateIdx, subStateEnd);
const subStateNew = `  const [busy, setBusy] = useState(false);\r\n  const [subjectSemesters, setSubjectSemesters] = useState([]);\r\n  const [subjectSemId, setSubjectSemId] = useState(\"\");\r\n\r\n  useEffect(() => {\r\n    if (role === \"student\") {\r\n      api(\"/semesters\", {}, token).then(r => {\r\n        const list = Array.isArray(r) ? r : [];\r\n        setSubjectSemesters(list);\r\n      }).catch(() => {});\r\n    }\r\n  }, [role, token]);\r\n\r\n  const displaySubjects = useMemo(() => {\r\n    if (role === \"student\" && studentIdFromAuth && grades) {\r\n      const myGrades = grades[studentIdFromAuth] || {};\r\n      return subjects.filter(s => myGrades[s.id] !== undefined);\r\n    }\r\n    return subjects;\r\n  }, [subjects, role, studentIdFromAuth, grades]);`;

src = src.replace(subStateOld, subStateNew);
console.log('Patch 1a done (subjects state)');

// 1b) Add semester filter to the subjects search bar row (for student role)
const SUBJ_SEARCH_TARGET = `      <Card>\r\n        <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>\r\n          <input placeholder="🔍  Search by code, name, or professor..."\r\n            value={search} onChange={e => setSearch(e.target.value)}\r\n            style={{ flex: 1, padding: "9px 13px", border: "1px solid #d1d5db",\r\n              borderRadius: 8, fontSize: 13, outline: "none" }} />\r\n          {canWrite && (\r\n            <Btn variant="primary" onClick={openAdd}>+ Add Subject</Btn>\r\n          )}\r\n        </div>`;

const SUBJ_SEARCH_NEW = `      <Card>\r\n        <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>\r\n          <input placeholder="🔍  Search by code, name, or professor..."\r\n            value={search} onChange={e => setSearch(e.target.value)}\r\n            style={{ flex: 1, minWidth: 180, padding: "9px 13px", border: "1px solid #d1d5db",\r\n              borderRadius: 8, fontSize: 13, outline: "none" }} />\r\n          {role === "student" && subjectSemesters.length > 0 && (\r\n            <select\r\n              value={subjectSemId}\r\n              onChange={e => setSubjectSemId(e.target.value)}\r\n              style={{ padding: "9px 14px", borderRadius: 8, border: "1.5px solid var(--border-color)", background: "#0f172a", color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer" }}\r\n            >\r\n              <option value="">All Semesters</option>\r\n              {subjectSemesters.map(s => (\r\n                <option key={s.id} value={String(s.id)} style={{ background: "#1e293b" }}>\r\n                  {s.school_year} - {s.term}\r\n                </option>\r\n              ))}\r\n            </select>\r\n          )}\r\n          {canWrite && (\r\n            <Btn variant="primary" onClick={openAdd}>+ Add Subject</Btn>\r\n          )}\r\n        </div>`;

if (!src.includes(SUBJ_SEARCH_TARGET)) {
  console.error('PATCH 1b TARGET NOT FOUND');
  process.exit(1);
}
src = src.replace(SUBJ_SEARCH_TARGET, SUBJ_SEARCH_NEW);
console.log('Patch 1b done (subjects search bar)');

// 1c) Filter the displaySubjects by subjectSemId when student is viewing
// The 'filtered' variable is derived from displaySubjects – we update it to also filter by semester
const SUBJ_FILTERED_TARGET = `  const filtered = displaySubjects.filter(s =>\r\n    s.id.toLowerCase().includes(search.toLowerCase()) ||\r\n    s.name.toLowerCase().includes(search.toLowerCase()) ||\r\n    s.professor.toLowerCase().includes(search.toLowerCase())\r\n  );`;

const SUBJ_FILTERED_NEW = `  const filtered = displaySubjects.filter(s =>\r\n    (s.id.toLowerCase().includes(search.toLowerCase()) ||\r\n    s.name.toLowerCase().includes(search.toLowerCase()) ||\r\n    s.professor.toLowerCase().includes(search.toLowerCase())) &&\r\n    (role !== \"student\" || !subjectSemId || String(s.semester_id || \"\") === String(subjectSemId))\r\n  );`;

if (!src.includes(SUBJ_FILTERED_TARGET)) {
  console.error('PATCH 1c TARGET NOT FOUND');
  process.exit(1);
}
src = src.replace(SUBJ_FILTERED_TARGET, SUBJ_FILTERED_NEW);
console.log('Patch 1c done (subjects filtered logic)');

// ====================================================================
// PATCH 2: Improve Grades semester filter UI - make it inline at top
//          instead of inside a separate Card
// ====================================================================

// The existing Grades filter is: role === "student" && wrapped in <Card title="Filters">
// We replace it with an inline bar similar to MyLedger
const GRADES_FILTER_OLD = `              {role === "student" && (\r\n                <Card title="Filters">\r\n                  <div>\r\n                    <Select label="Semester" value={semesterId} onChange={e => setSemesterId(e.target.value)}>\r\n                      <option value="">All Semesters</option>\r\n                      {semesters.map(s => <option key={s.id} value={s.id}>{s.school_year} · {s.term}</option>)}\r\n                    </Select>\r\n                  </div>\r\n                </Card>\r\n              )}`;

const GRADES_FILTER_NEW = `              {role === "student" && semesters.length > 0 && (\r\n                <div style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>\r\n                  <span style={{ fontSize: 13, color: "var(--text-dim)", fontWeight: 700 }}>School Year / Semester:</span>\r\n                  <select\r\n                    value={semesterId}\r\n                    onChange={e => setSemesterId(e.target.value)}\r\n                    style={{ padding: "8px 14px", borderRadius: 8, border: "1.5px solid var(--border-color)", background: "#0f172a", color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer" }}\r\n                  >\r\n                    <option value="">All Semesters</option>\r\n                    {semesters.map(s => (\r\n                      <option key={s.id} value={String(s.id)} style={{ background: "#1e293b" }}>\r\n                        {s.school_year} - {s.term}\r\n                      </option>\r\n                    ))}\r\n                  </select>\r\n                </div>\r\n              )}`;

if (!src.includes(GRADES_FILTER_OLD)) {
  console.error('PATCH 2 TARGET NOT FOUND - checking partial...');
  const idx = src.indexOf('<Card title="Filters">');
  if (idx !== -1) console.log('Found at', idx, ':', src.slice(idx-100, idx+400));
  process.exit(1);
}
src = src.replace(GRADES_FILTER_OLD, GRADES_FILTER_NEW);
console.log('Patch 2 done (grades semester UI)');

fs.writeFileSync('src/App.js', src);
console.log('All done. File size:', src.length, '(was', origLen, ')');
