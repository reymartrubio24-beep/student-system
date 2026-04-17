const fs = require('fs');
let c = fs.readFileSync('src/App.js', 'utf8');

// 1. Add nav item
const navSearch = `    ...(hasPerm("grades") ? [{ id: "grades", icon: "📝", label: role === "student" ? "My Grades" : "Grades" }] : []),`;
const navReplace = `    ...(hasPerm("grades") ? [{ id: "grades", icon: "📝", label: role === "student" ? "My Grades" : "Grades" }] : []),
    ...(["saps", "owner", "register", "developer", "teacher"].includes(role) ? [{ id: "graderequests", icon: "📬", label: "Grade Requests" }] : []),`;
c = c.replace(navSearch, navReplace);

// 2. Add route renderer
const routeSearch = `            {page === "grades"    && hasPerm("grades") && <Grades students={students} subjects={subjects} grades={grades} setGrades={setGrades} token={auth.token} role={role} studentIdFromAuth={auth.student_id} canWrite={hasPerm("grades", "write")} canDelete={hasPerm("grades", "delete")} />}`;
const routeReplace = `            {page === "grades"    && hasPerm("grades") && <Grades students={students} subjects={subjects} grades={grades} setGrades={setGrades} token={auth.token} role={role} studentIdFromAuth={auth.student_id} canWrite={hasPerm("grades", "write")} canDelete={hasPerm("grades", "delete")} />}
            {page === "graderequests" && <GradeRequestsView token={auth.token} role={role} />}`;
c = c.replace(routeSearch, routeReplace);

// 3. Remove embedded table from Grades and keep the Teacher Modal logic there.
// Instead of removing it totally, let's just create the new standalone component and leave the old one or just delete it from Grades.
const removeTableRegex = /\{\/\* Grade Change Requests Table \*\/\}.*?<\/div>\r?\n\s*\}\)/s;
// The fix3 injected it without the "/* Grade Change Requests Table */" comment.
// Let's find exactly what to remove from Grades:
const startTable = c.indexOf('{role !== "student" && (\r\n            <div style={{ marginTop: 24 }}>\r\n              <Card title={`Grade Change Requests (${requests.length})`}>');
if (startTable !== -1) {
    const endTableStr = `          )}\r\n\r\n        </div>`;
    const endTable = c.indexOf(endTableStr, startTable);
    if (endTable !== -1) {
        c = c.slice(0, startTable) + c.slice(endTable);
    }
}

// 4. Append GradeRequestsView component
const newComponent = `
function GradeRequestsView({ token, role }) {
  const [requests, setRequests] = useState([]);
  const [msg, setMsg] = useState("");

  const flash = m => { setMsg(m); setTimeout(() => setMsg(""), 2500); };

  const fetchRequests = useCallback(async () => {
    try {
      const data = await api("/grade-change-requests", {}, token);
      if (Array.isArray(data)) setRequests(data);
    } catch {}
  }, [token]);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  return (
    <div>
      <PageHeader title={<span>{"\\u{1F4EC}"} Grade Change Requests</span>} sub="Review and manage student grade modifications" />
      {msg && <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, padding: "10px 16px", marginBottom: 14, color: "#15803d", fontWeight: 600, fontSize: 13 }}>{msg}</div>}
      
      <Card title={\`Pending & Recent Requests (\${requests.length})\`} variant={requests.length > 0 ? "active" : "default"}>
        {requests.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: "var(--text-dim)", fontSize: 13 }}>No grade change requests found.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {requests.map(req => (
              <div key={req.id} style={{
                padding: 20, borderRadius: 12, border: "1px solid var(--border-color)", background: req.status === "done" ? "rgba(16, 185, 129, 0.05)" : "rgba(255,255,255,0.03)",
                display: "flex", justifyContent: "space-between", alignItems: "flex-start"
              }}>
                <div>
                  <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 6 }}>
                    <div style={{ fontSize: 16, fontWeight: 800, color: "white" }}>{req.student_name}</div>
                    <span style={{ fontSize: 10, padding: "3px 8px", borderRadius: 4, background: req.status === "done" ? "#065f46" : "#854d0e", color: "white", fontWeight: 700 }}>{req.status.toUpperCase()}</span>
                    <span style={{ fontSize: 11, color: "var(--text-dim)" }}>{new Date(req.created_at).toLocaleString()}</span>
                  </div>
                  <div style={{ fontSize: 13, color: "var(--neon-blue)", marginBottom: 10, fontWeight: 600 }}>{req.subject_name} • Requested by: {req.teacher_username}</div>
                  <div style={{ fontSize: 14, color: "var(--text-main)", background: "rgba(0,0,0,0.2)", padding: "12px 16px", borderRadius: 8, borderLeft: "3px solid var(--neon-blue)", lineHeight: 1.5 }}>
                    {req.requested_changes.split('|').map((part, i) => <div key={i}>{part.trim()}</div>)}
                  </div>
                </div>
                {req.status !== "done" && ["saps","owner","register","developer"].includes(role) && (
                  <Btn variant="primary" onClick={async () => {
                    try {
                      await api(\`/grade-change-requests/\${req.id}/done\`, { method: "PUT" }, token);
                      fetchRequests();
                      flash("✅ Request marked as done.");
                    } catch (e) { alert(e.message); }
                  }} style={{ fontSize: 12, padding: "8px 16px", marginLeft: 16, flexShrink: 0 }}>✓ Mark Done</Btn>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
`;

c += newComponent;
fs.writeFileSync('src/App.js', c);
console.log("Extraction to GradeRequestsView complete");
