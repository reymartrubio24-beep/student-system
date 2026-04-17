const fs = require('fs');
let src = fs.readFileSync('src/App.js', 'utf8');

// 1. Add semesters + selectedSemId state to StudentManagement
const smStateTarget = `  const [selectedStudent, setSelectedStudent] = useState("");
  const [assigned, setAssigned] = useState([]);
  const [searchStu, setSearchStu] = useState("");
  const [msg, setMsg] = useState("");
  const [editSubject, setEditSubject] = useState(null);
  const [editForm, setEditForm] = useState({ name: "", units: 3, professor: "", schedule: "MWF", room: "Room 101", campus: "main campus", time: "" });
  const [assignId, setAssignId] = useState("");

  const flash = (m) => { setMsg(m); setTimeout(() => setMsg(""), 2500); };`;
const smStateReplacement = `  const [selectedStudent, setSelectedStudent] = useState("");
  const [assigned, setAssigned] = useState([]);
  const [searchStu, setSearchStu] = useState("");
  const [msg, setMsg] = useState("");
  const [editSubject, setEditSubject] = useState(null);
  const [editForm, setEditForm] = useState({ name: "", units: 3, professor: "", schedule: "MWF", room: "Room 101", campus: "main campus", time: "" });
  const [assignId, setAssignId] = useState("");
  const [semesters, setSemesters] = useState([]);
  const [assignSemId, setAssignSemId] = useState("");

  const flash = (m) => { setMsg(m); setTimeout(() => setMsg(""), 2500); };

  useEffect(() => {
    api("/semesters", {}, token).then(r => {
      const list = Array.isArray(r) ? r : [];
      setSemesters(list);
      if (list.length > 0) setAssignSemId(String(list[0].id));
    }).catch(() => {});
  }, [token]);`;
if (src.includes(smStateTarget)) {
  src = src.replace(smStateTarget, smStateReplacement);
  console.log("Added semesters state to StudentManagement");
}

// 2. Fix assignSubject to send semester_id
const assignTarget = `  const assignSubject = async () => {
    if (!selectedStudent || !assignId) return;
    try {
      await api("/grades", { method: "POST", body: {
        student_id: selectedStudent, subject_id: assignId
      } }, token);`;
const assignReplacement = `  const assignSubject = async () => {
    if (!selectedStudent || !assignId) return;
    if (!assignSemId) return alert("Please select a semester before assigning a subject.");
    try {
      await api("/grades", { method: "POST", body: {
        student_id: selectedStudent, subject_id: assignId, semester_id: Number(assignSemId)
      } }, token);`;
if (src.includes(assignTarget)) {
  src = src.replace(assignTarget, assignReplacement);
  console.log("Fixed assignSubject to send semester_id");
}

// 3. Add semester dropdown to Assign Subject UI
const assignBtnTarget = `          <Btn onClick={assignSubject}>+ Assign</Btn>`;
const assignBtnReplacement = `          <div style={{marginBottom:8}}>
            <label style={{fontSize:11,fontWeight:600,color:"var(--text-dim)",textTransform:"uppercase",display:"block",marginBottom:4}}>Semester</label>
            <Select value={assignSemId} onChange={e => setAssignSemId(e.target.value)}>
              <option value="">-- Select Semester --</option>
              {semesters.map(s => <option key={s.id} value={s.id}>{s.school_year} - {s.term}</option>)}
            </Select>
          </div>
          <Btn onClick={assignSubject}>+ Assign</Btn>`;
if (src.includes(assignBtnTarget)) {
  src = src.replace(assignBtnTarget, assignBtnReplacement);
  console.log("Added semester dropdown to assign UI");
}

fs.writeFileSync('src/App.js', src);
console.log("Done patching StudentManagement.");
