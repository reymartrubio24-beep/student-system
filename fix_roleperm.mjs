import { readFileSync, writeFileSync } from 'fs';

const file = 'src/App.js';
let src = readFileSync(file, 'utf8');

// ── 1. Add Role Permissions to navItems (back between logs and end) ──
const OLD_NAV_END = `    ...((role === "developer" || role === "owner")
       ? [{ id: "logs",     icon: "📜", label: "System Logs" }] : []),
  ];`;

const NEW_NAV_END = `    ...((role === "developer" || role === "owner")
       ? [{ id: "logs",     icon: "📜", label: "System Logs" }] : []),
    ...((role === "developer" || role === "owner")
       ? [{ id: "rolepermissions", icon: "🔐", label: "Role Permissions" }] : []),
  ];`;

if (src.includes(OLD_NAV_END)) {
  src = src.replace(OLD_NAV_END, NEW_NAV_END);
  console.log('✅ Added Role Permissions to navItems');
} else {
  console.log('❌ Could not find navItems end');
}

// ── 2. Fix grades format issue - grades is a MAP object, not flat array ──
// The grades passed to AttendanceManage need to be a flat array of {student_id, subject_id} objects
// Currently grades = { student_id: { subject_id: {...grade} } }
// We need to convert it to a flat array for the filter to work

// Fix the attendanceManage render call to convert grades map to flat array
const OLD_ATT_RENDER = `{page === "attendance" && (role === "teacher" || role === "developer" || role === "owner") && <AttendanceManage token={auth.token} role={role} students={students} subjects={subjects} grades={grades} />}`;
const NEW_ATT_RENDER = `{page === "attendance" && (role === "teacher" || role === "developer" || role === "owner") && <AttendanceManage token={auth.token} role={role} students={students} subjects={subjects} grades={Object.entries(grades).flatMap(([sid, subs]) => Object.keys(subs).map(subId => ({ student_id: sid, subject_id: subId })))} />}`;

if (src.includes(OLD_ATT_RENDER)) {
  src = src.replace(OLD_ATT_RENDER, NEW_ATT_RENDER);
  console.log('✅ Fixed grades map-to-array conversion in render call');
} else {
  console.log('❌ Could not find attendance render call');
}

// ── 3. Add Role Permissions page render ──
// Find where logs page renders and add rolepermissions after it
const OLD_LOGS_RENDER = `{page === "logs"      && (role === "developer" || role === "owner") && <LogsView token={auth.token} />}`;
const NEW_LOGS_RENDER = `{page === "logs"      && (role === "developer" || role === "owner") && <LogsView token={auth.token} />}
            {page === "rolepermissions" && (role === "developer" || role === "owner") && <RolePermissionsView token={auth.token} />}`;

if (src.includes(OLD_LOGS_RENDER)) {
  src = src.replace(OLD_LOGS_RENDER, NEW_LOGS_RENDER);
  console.log('✅ Added rolepermissions page render');
} else {
  // Try alternate format
  const alt = `{page === "logs"      && (role === "developer" || role === "owner") && <LogsView token={auth.token} />}\r\n`;
  if (src.includes(alt)) {
    src = src.replace(alt, alt + `            {page === "rolepermissions" && (role === "developer" || role === "owner") && <RolePermissionsView token={auth.token} />}\r\n`);
    console.log('✅ Added rolepermissions page render (alternate)');
  } else {
    console.log('❌ Could not find logs render - searching...');
    const idx = src.indexOf('LogsView');
    if (idx !== -1) console.log('Found LogsView at:', src.substring(idx - 30, idx + 80));
  }
}

// ── 4. Add the RolePermissionsView component if not already present ──
if (!src.includes('function RolePermissionsView')) {
  const authMarker = '\nfunction AuthScreen({ onAuthed, logo }) {';
  const authIdx = src.indexOf(authMarker);
  if (authIdx !== -1) {
    const rolePermComponent = `
// ─── Role Permissions View ────────────────────────────────────────────────────
function RolePermissionsView({ token }) {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState({ text: "", type: "ok" });
  const modules = ["students", "subjects", "grades", "attendance", "permits", "payments", "settings", "users", "logs"];

  const flash = (text, type = "ok") => { setMsg({ text, type }); setTimeout(() => setMsg({ text: "", type: "ok" }), 3000); };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api("/roles", {}, token);
      setRoles(Array.isArray(data) ? data : []);
    } catch (e) { flash(e.message, "err"); }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const handleToggle = async (role, module, field, current) => {
    try {
      await api("/roles/" + role + "/" + module, { method: "PUT", body: { [field]: current ? 0 : 1 } }, token);
      load();
    } catch (e) { flash(e.message, "err"); }
  };

  const CheckToggle = ({ active, onClick }) => (
    <button onClick={onClick} style={{
      width: 32, height: 18, borderRadius: 10, border: "none", cursor: "pointer",
      background: active ? "#4ade80" : "rgba(255,255,255,0.1)",
      position: "relative", transition: "background 0.2s", flexShrink: 0
    }}>
      <span style={{
        position: "absolute", top: 2, left: active ? 16 : 2, width: 14, height: 14,
        borderRadius: "50%", background: "white", transition: "left 0.2s"
      }} />
    </button>
  );

  return (
    <div>
      <PageHeader title="Role Permissions" sub="Manage what each role can read, write, or delete" />
      {msg.text && (
        <div style={{
          background: msg.type === "err" ? "rgba(239,68,68,0.12)" : "rgba(16,185,129,0.12)",
          border: \`1px solid \${msg.type === "err" ? "rgba(239,68,68,0.3)" : "rgba(16,185,129,0.3)"}\`,
          color: msg.type === "err" ? "#fca5a5" : "#34d399",
          borderRadius: 10, padding: "10px 16px", marginBottom: 20, fontSize: 13, fontWeight: 600
        }}>{msg.text}</div>
      )}
      {loading ? (
        <div style={{ textAlign: "center", padding: 40, color: "var(--text-dim)" }}>Loading...</div>
      ) : (
        <div className="glass-card" style={{ padding: 0, overflow: "hidden", borderRadius: 14 }}>
          <div className="table-container">
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <Th>Role</Th>
                  {modules.map(m => (
                    <Th key={m} style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 1 }}>{m}</div>
                      <div style={{ display: "flex", gap: 4, justifyContent: "center", fontSize: 9, color: "var(--text-dim)", marginTop: 2 }}>
                        <span>R</span><span>W</span><span>D</span>
                      </div>
                    </Th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {roles.map(r => (
                  <tr key={r.role} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                    <Td>
                      <code style={{ background: "rgba(68,215,255,0.1)", color: "var(--neon-blue)", padding: "3px 8px", borderRadius: 6, fontSize: 12, fontWeight: 700 }}>
                        {r.role}
                      </code>
                    </Td>
                    {modules.map(m => {
                      const perm = r.permissions?.[m] || {};
                      return (
                        <Td key={m} style={{ textAlign: "center" }}>
                          <div style={{ display: "flex", gap: 4, justifyContent: "center" }}>
                            <CheckToggle active={!!perm.can_read} onClick={() => handleToggle(r.role, m, "can_read", perm.can_read)} />
                            <CheckToggle active={!!perm.can_write} onClick={() => handleToggle(r.role, m, "can_write", perm.can_write)} />
                            <CheckToggle active={!!perm.can_delete} onClick={() => handleToggle(r.role, m, "can_delete", perm.can_delete)} />
                          </div>
                        </Td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

`;
    src = src.substring(0, authIdx) + rolePermComponent + src.substring(authIdx);
    console.log('✅ Added RolePermissionsView component');
  } else {
    console.log('❌ Could not find AuthScreen to insert before');
  }
} else {
  console.log('ℹ️  RolePermissionsView already exists - checking if nav was there');
}

writeFileSync(file, src, 'utf8');
console.log('\n✅ All changes applied.');

// Verify
const result = readFileSync(file, 'utf8');
console.log('Role Permissions nav:', result.includes('rolepermissions') ? 'FOUND' : 'MISSING');
console.log('RolePermissionsView component:', result.includes('function RolePermissionsView') ? 'FOUND' : 'MISSING');
console.log('Grades flatMap conversion:', result.includes('flatMap') ? 'FOUND' : 'MISSING');
const sample = result.substring(result.indexOf('icon: "'), result.indexOf('icon: "') + 30);
console.log('Emoji check:', JSON.stringify(sample));
