import { useState, useMemo, useEffect } from "react";

const INITIAL_STUDENTS = [
  { id: "2024-0001", name: "Maria Cruz",     course: "BSCS", year: "1st Year", email: "maria.cruz@edu.ph",    status: "Active" },
  { id: "2023-0045", name: "Jose Rizal",     course: "BSIT", year: "2nd Year", email: "jose.rizal@edu.ph",    status: "Active" },
  { id: "2023-0067", name: "Ana Gomez",      course: "BSIS", year: "2nd Year", email: "ana.gomez@edu.ph",     status: "Active" },
  { id: "2024-0012", name: "Juan dela Cruz", course: "BSCS", year: "1st Year", email: "juan.delacruz@edu.ph", status: "At Risk" },
  { id: "2022-0023", name: "Luisa Diaz",     course: "BSCS", year: "3rd Year", email: "luisa.diaz@edu.ph",    status: "Active" },
  { id: "2023-0089", name: "Pedro Santos",   course: "BSIT", year: "2nd Year", email: "pedro.santos@edu.ph",  status: "At Risk" },
];

const INITIAL_SUBJECTS = [
  { id: "CS101",   name: "Introduction to Programming",    units: 3, professor: "Prof. Santos", schedule: "MWF 8:00-9:00 AM",   room: "Room 101" },
  { id: "MATH201", name: "Calculus & Analytical Geometry", units: 3, professor: "Prof. Reyes",  schedule: "TTH 10:00-11:30 AM", room: "Room 205" },
  { id: "ENG102",  name: "Technical Communication",        units: 3, professor: "Prof. Garcia", schedule: "MWF 1:00-2:00 PM",   room: "Room 302" },
  { id: "CS201",   name: "Data Structures & Algorithms",   units: 3, professor: "Prof. Lim",    schedule: "TTH 1:00-2:30 PM",   room: "Room 104" },
  { id: "PHY101",  name: "Physics for Engineers",          units: 3, professor: "Prof. Torres", schedule: "MWF 3:00-4:00 PM",   room: "Room 201" },
  { id: "IT301",   name: "Database Management Systems",    units: 3, professor: "Prof. Aquino", schedule: "TTH 3:00-4:30 PM",   room: "Room 206" },
];

const INITIAL_GRADES = {
  "2024-0001": {
    "CS101":   { prelim: 92, midterm: 88, prefinal: 90, final: 95 },
    "MATH201": { prelim: 88, midterm: 85, prefinal: 87, final: 90 },
    "ENG102":  { prelim: 91, midterm: 93, prefinal: 89, final: 92 },
  },
  "2023-0045": {
    "CS101":   { prelim: 85, midterm: 82, prefinal: 80, final: 83 },
    "MATH201": { prelim: 78, midterm: 80, prefinal: 79, final: 82 },
  },
  "2024-0012": {
    "CS101":  { prelim: 65, midterm: 60, prefinal: 58, final: 62 },
    "ENG102": { prelim: 55, midterm: 50, prefinal: 48, final: 52 },
  },
  "2022-0023": {
    "CS101": { prelim: 97, midterm: 95, prefinal: 98, final: 96 },
    "CS201": { prelim: 94, midterm: 96, prefinal: 95, final: 97 },
    "IT301": { prelim: 90, midterm: 92, prefinal: 91, final: 93 },
  },
};

function computeGrade(g) {
  if (!g) return null;
  return Math.round(((g.prelim + g.midterm + g.prefinal + g.final) / 4) * 100) / 100;
}
function toGPA(avg) {
  if (avg >= 97) return "1.00";
  if (avg >= 94) return "1.25";
  if (avg >= 91) return "1.50";
  if (avg >= 88) return "1.75";
  if (avg >= 85) return "2.00";
  if (avg >= 82) return "2.25";
  if (avg >= 79) return "2.50";
  if (avg >= 76) return "2.75";
  if (avg >= 75) return "3.00";
  return "5.00 (F)";
}
function gradeColor(avg) {
  if (avg >= 85) return "#16a34a";
  if (avg >= 75) return "#2563eb";
  if (avg >= 70) return "#d97706";
  return "#dc2626";
}

function SettingsModal({ title, logo, onClose, onSave }) {
  const [t, setT] = useState(title);
  const [fileMsg, setFileMsg] = useState("");
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(logo || "");
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  const validTitle = v => v && v.trim().length >= 4 && v.trim().length <= 80;

  const handleFile = e => {
    setErr(""); setOk(""); setFileMsg(""); setProgress(0);
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = ["image/png","image/jpeg","image/svg+xml"];
    if (!allowed.includes(file.type)) {
      setErr("Unsupported file type. Use PNG, JPG, or SVG.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setErr("File too large. Max 2MB.");
      return;
    }
    const reader = new FileReader();
    reader.onprogress = ev => {
      if (ev.lengthComputable) {
        const pct = Math.round((ev.loaded / ev.total) * 100);
        setProgress(pct);
        setUploading(true);
      }
    };
    reader.onload = () => {
      const dataUrl = reader.result;
      setPreview(String(dataUrl));
      setUploading(false);
      setOk("Logo loaded.");
    };
    reader.onerror = () => {
      setUploading(false);
      setErr("Failed to read file.");
    };
    setFileMsg(`${file.name} (${Math.round(file.size/1024)} KB)`);
    reader.readAsDataURL(file);
  };

  const save = () => {
    setErr(""); setOk("");
    if (!validTitle(t)) {
      setErr("Title must be 4–80 characters.");
      return;
    }
    onSave(t.trim(), preview);
  };

  return (
    <Modal show={true} title="App Settings" onClose={onClose} width={520}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
        <Input label="Title" value={t} onChange={e => setT(e.target.value)} />
        <div>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 6 }}>Logo</label>
          <input type="file" accept="image/png,image/jpeg,image/svg+xml" onChange={handleFile} />
          {fileMsg && <div style={{ fontSize: 12, color: "#6b7280", marginTop: 6 }}>{fileMsg}</div>}
          {uploading && <div style={{ marginTop: 8, height: 8, background: "#e5e7eb", borderRadius: 6 }}>
            <div style={{ width: `${progress}%`, height: 8, background: "#2563eb", borderRadius: 6 }} />
          </div>}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 12 }}>
            <div style={{ width: 60, height: 60, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10,
              display: "flex", alignItems: "center", justifyContent: "center" }}>
              <img alt="Preview" src={preview || "/yllanalogo.png"} style={{ width: 50, height: 50, objectFit: "contain" }} />
            </div>
            <div style={{ fontSize: 12, color: "#6b7280" }}>PNG, JPG, or SVG up to 2MB. Maintains aspect ratio.</div>
          </div>
        </div>
        {err && <div style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b", padding: "8px 12px", borderRadius: 8, fontSize: 13, fontWeight: 600 }}>{err}</div>}
        {ok && <div style={{ background: "#ecfdf5", border: "1px solid #bbf7d0", color: "#065f46", padding: "8px 12px", borderRadius: 8, fontSize: 13, fontWeight: 600 }}>{ok}</div>}
        <div style={{ display: "flex", gap: 10 }}>
          <Btn variant="primary" onClick={save} disabled={uploading} style={{ flex: 1 }}>Save</Btn>
          <Btn variant="ghost" onClick={onClose} style={{ flex: 1 }}>Cancel</Btn>
        </div>
      </div>
    </Modal>
  );
}
const Badge = ({ text, type }) => {
  const colors = {
    green:  { bg: "#dcfce7", color: "#166534" },
    blue:   { bg: "#dbeafe", color: "#1e40af" },
    red:    { bg: "#fee2e2", color: "#991b1b" },
    yellow: { bg: "#fef9c3", color: "#854d0e" },
    gray:   { bg: "#f3f4f6", color: "#374151" },
  };
  const c = colors[type] || colors.gray;
  return (
    <span style={{ background: c.bg, color: c.color, padding: "2px 10px", borderRadius: 20,
      fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" }}>
      {text}
    </span>
  );
};

const Modal = ({ show, title, onClose, children, width = 500 }) => {
  if (!show) return null;
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
      zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: "white", borderRadius: 14,
        padding: 28, width, maxWidth: "95vw", boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
        maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: "#1e3a5f" }}>{title}</div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20,
            cursor: "pointer", color: "#6b7280" }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
};

const Input = ({ label, ...props }) => (
  <div style={{ marginBottom: 14 }}>
    {label && <label style={{ display: "block", fontSize: 12, fontWeight: 600,
      color: "#374151", marginBottom: 5 }}>{label}</label>}
    <input {...props} style={{ width: "100%", padding: "9px 12px", border: "1px solid #d1d5db",
      borderRadius: 8, fontSize: 13, outline: "none", background: "#f9fafb",
      color: "#111827", ...props.style }} />
  </div>
);

const Select = ({ label, children, ...props }) => (
  <div style={{ marginBottom: 14 }}>
    {label && <label htmlFor={props.id} style={{ display: "block", fontSize: 12, fontWeight: 600,
      color: "#374151", marginBottom: 5 }}>{label}</label>}
    <select {...props} style={{ width: "100%", padding: "9px 12px", border: "1px solid #d1d5db",
      borderRadius: 8, fontSize: 13, outline: "none", background: "#f9fafb",
      color: "#111827", cursor: "pointer", ...props.style }}>
      {children}
    </select>
  </div>
);

const Btn = ({ children, variant = "primary", onClick, style = {}, disabled }) => {
  const styles = {
    primary: { background: "#1e3a5f", color: "white" },
    success: { background: "#16a34a", color: "white" },
    danger:  { background: "#dc2626", color: "white" },
    outline: { background: "white", color: "#1e3a5f", border: "1.5px solid #1e3a5f" },
    ghost:   { background: "#f3f4f6", color: "#374151" },
  };
  return (
    <button onClick={onClick} disabled={disabled} style={{ padding: "8px 16px", borderRadius: 8,
      border: "none", cursor: disabled ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 600,
      display: "inline-flex", alignItems: "center", gap: 6, opacity: disabled ? 0.5 : 1,
      transition: "opacity 0.15s", ...styles[variant], ...style }}>
      {children}
    </button>
  );
};

function PageHeader({ title, sub }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: "#0f2340" }}>{title}</h1>
      {sub && <p style={{ fontSize: 13, color: "#6b7280", marginTop: 3 }}>{sub}</p>}
    </div>
  );
}

function Card({ title, action, children }) {
  return (
    <div style={{ background: "white", borderRadius: 12, padding: 20,
      boxShadow: "0 1px 5px rgba(0,0,0,0.07)", marginBottom: 18 }}>
      {(title || action) && (
        <div style={{ display: "flex", alignItems: "center",
          justifyContent: "space-between", marginBottom: 16 }}>
          {title && <div style={{ fontSize: 15, fontWeight: 700, color: "#0f2340" }}>{title}</div>}
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

const Th = ({ children }) => (
  <th style={{ background: "#f8fafc", color: "#374151", fontWeight: 700, textAlign: "left",
    padding: "9px 11px", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.5px",
    borderBottom: "1px solid #e5e7eb" }}>{children}</th>
);
const Td = ({ children, style }) => (
  <td style={{ padding: "9px 11px", fontSize: 13, verticalAlign: "middle", ...style }}>{children}</td>
);
const GradeCell = ({ val }) => (
  <span style={{ fontWeight: 600, color: gradeColor(val),
    background: val >= 75 ? "#f0fdf4" : "#fef2f2",
    padding: "2px 8px", borderRadius: 6, fontSize: 13 }}>{val}</span>
);

const API = "http://localhost:4000";

async function api(path, opts = {}, token) {
  const res = await fetch(API + path, {
    method: opts.method || "GET",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    let msg = data.error || "Request failed";
    if (data.details) {
      try {
        const flat = Array.isArray(data.details) ? data.details.join(", ") : JSON.stringify(data.details);
        msg += `: ${flat}`;
      } catch {}
    }
    throw new Error(msg);
  }
  return data;
}

export default function App() {
  const [page, setPage] = useState("dashboard");
  const [students, setStudents] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [grades, setGrades] = useState({});
  const [gradesLoaded, setGradesLoaded] = useState(false);
  const [studentsError, setStudentsError] = useState(null);
  const [gradesError, setGradesError] = useState(null);
  const [subjectsError, setSubjectsError] = useState(null);
  const [searchId, setSearchId] = useState("");
  const [searchResult, setSearchResult] = useState(null);
  const [searchDone, setSearchDone] = useState(false);
  const [permitsSemester, setPermitsSemester] = useState(null);
  const [auth, setAuth] = useState(() => {
    try { return JSON.parse(localStorage.getItem("auth") || "null"); } catch { return null; }
  });
  const role = auth?.role || null;
  const [title, setTitle] = useState(() => localStorage.getItem("appTitle") || "Student Subject Management & Tracking System");
  const [logo, setLogo] = useState(() => localStorage.getItem("appLogo") || "");
  const [settingsOpen, setSettingsOpen] = useState(false);

  const setAuthPersist = a => {
    setAuth(a);
    if (a) localStorage.setItem("auth", JSON.stringify(a));
    else localStorage.removeItem("auth");
  };

  const navItems = [
    { id: "dashboard", icon: "📊", label: "Dashboard" },
    ...((role === "register" || role === "cashier" || role === "saps" || role === "teacher" || role === "developer" || role === "owner")
       ? [{ id: "search",    icon: "🔍", label: "Student Search" }] : []),
    ...((role === "register" || role === "cashier" || role === "saps" || role === "teacher" || role === "developer" || role === "owner")
       ? [{ id: "students",  icon: "👤", label: "Students" }] : []),
    ...((role === "register" || role === "cashier" || role === "saps" || role === "teacher" || role === "developer" || role === "owner")
       ? [{ id: "studentmgmt", icon: "🧭", label: "Student Management" }] : []),
    ...((role === "register" || role === "saps" || role === "teacher" || role === "developer" || role === "owner")
       ? [{ id: "subjects",  icon: "📚", label: "Subjects" }] : []),
    ...((role === "student" || role === "register" || role === "saps" || role === "teacher" || role === "developer" || role === "owner")
       ? [{ id: "grades",    icon: "📝", label: "Grades" }] : []),
    ...(role === "student" ? [{ id: "mypermits", icon: "🎫", label: "My Permits" }] : []),
    ...((role === "cashier" || role === "saps" || role === "teacher" || role === "developer" || role === "owner")
       ? [{ id: "permits", icon: "🎫", label: "Student Permits" }] : []),
    ...((role === "student" || role === "cashier" || role === "register" || role === "saps" || role === "developer" || role === "owner")
       ? [{ id: "payments", icon: "💳", label: "Payments" }] : []),
    ...(role === "student" ? [{ id: "profile", icon: "👤", label: "Profile" }] : []),
    ...((role === "developer" || role === "owner") ? [{ id: "users", icon: "🛠️", label: "Users" }] : [])
  ];

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!auth?.token) {
        if (mounted) {
          setStudents([]);
          setStudentsError(null);
        }
        return;
      }
      try {
        const data = await api("/students", {}, auth.token);
        if (mounted) {
          setStudents(data);
          setStudentsError(null);
        }
      } catch (e) {
        if (mounted) {
          setStudents([]);
          setStudentsError(e.message || "Failed to load students");
        }
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [auth?.token]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!auth?.token) {
        if (mounted) {
          setGrades({});
          setGradesLoaded(false);
          setGradesError(null);
        }
        return;
      }
      if (mounted) {
        setGrades({});
        setGradesLoaded(false);
        setGradesError(null);
      }
      try {
        const rows = await api("/grades", {}, auth.token);
        const map = rows.reduce((acc, r) => {
          if (!acc[r.student_id]) acc[r.student_id] = {};
          acc[r.student_id][r.subject_id] = {
            prelim: r.prelim,
            midterm: r.midterm,
            prefinal: r.prefinal,
            final: r.final,
          };
          return acc;
        }, {});
        if (mounted) {
          setGrades(map);
          setGradesError(null);
        }
      } catch (e) {
        if (mounted) {
          setGrades({});
          setGradesError(e.message || "Failed to load grades");
        }
      } finally {
        if (mounted) setGradesLoaded(true);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [auth?.token]);

  useEffect(() => {
    let mounted = true;
    const maybeRefreshGrades = async () => {
      if (!auth?.token) return;
      if (page !== "grades") return;
      try {
        const rows = await api("/grades", {}, auth.token);
        const map = rows.reduce((acc, r) => {
          if (!acc[r.student_id]) acc[r.student_id] = {};
          acc[r.student_id][r.subject_id] = {
            prelim: r.prelim,
            midterm: r.midterm,
            prefinal: r.prefinal,
            final: r.final,
          };
          return acc;
        }, {});
        if (mounted) setGrades(map);
      } catch (e) {
        if (mounted) setGradesError(e.message || "Failed to load grades");
      }
    };
    maybeRefreshGrades();
    return () => { mounted = false; };
  }, [page, auth?.token]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!auth?.token) {
        if (mounted) {
          setSubjects([]);
          setSubjectsError(null);
        }
        return;
      }
      try {
        const data = await api("/subjects", {}, auth.token);
        if (mounted) {
          setSubjects(data);
          setSubjectsError(null);
        }
      } catch (e) {
        if (mounted) {
          setSubjects([]);
          setSubjectsError(e.message || "Failed to load subjects");
        }
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [auth?.token]);

  return (
    <div style={{ fontFamily: "'Segoe UI', sans-serif", background: "#f1f5f9",
      minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {!auth && (
        <AuthScreen onAuthed={setAuthPersist} />
      )}
      {auth && (
      <div style={{ background: "linear-gradient(135deg,#0f2340 0%,#1e3a5f 60%,#2563eb 100%)",
        color: "white", padding: "0 24px", height: 60, display: "flex", alignItems: "center",
        justifyContent: "space-between", boxShadow: "0 2px 12px rgba(0,0,0,0.25)", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 36, height: 36, background: "white", borderRadius: 9,
            display: "flex", alignItems: "center", justifyContent: "center" }}>
            <img src={logo || "/yllanalogo.png"} alt="Logo" style={{ width: 30, height: 30, objectFit: "contain", borderRadius: 6 }}
              onError={e => { e.currentTarget.style.display = "none"; e.currentTarget.parentElement.textContent = "🎓"; }} />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: 0.2, lineHeight: 1.2, maxWidth: "56vw", whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden" }}>
              {title}
            </div>
            <div style={{ fontSize: 10, opacity: 0.7 }}>Academic Information System · AY 2025–2026</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ fontSize: 11, opacity: 0.8, textAlign: "right" }}>
            <div style={{ fontWeight: 700 }}>{auth.username}</div>
            <div>{role}</div>
          </div>
          <div style={{ width: 34, height: 34, background: "#2563eb", borderRadius: "50%",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontWeight: 800, fontSize: 13, border: "2px solid rgba(255,255,255,0.3)" }}>{role?.slice(0,2).toUpperCase()}</div>
          <Btn variant="ghost" onClick={() => setSettingsOpen(true)}>Settings</Btn>
          <Btn variant="ghost" onClick={() => setAuthPersist(null)}>Logout</Btn>
        </div>
      </div>
      )}

      {auth && (<div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        <div style={{ width: 210, background: "#0f2340", color: "#94a3b8", flexShrink: 0,
          display: "flex", flexDirection: "column", overflowY: "auto" }}>
          <div style={{ padding: "18px 12px 8px", fontSize: 10, fontWeight: 700,
            textTransform: "uppercase", letterSpacing: 1, color: "#475569" }}>Navigation</div>
          {navItems.map(n => (
            <div key={n.id} onClick={() => setPage(n.id)} style={{
              display: "flex", alignItems: "center", gap: 9, padding: "10px 14px",
              cursor: "pointer", fontSize: 13,
              borderLeft: `3px solid ${page === n.id ? "#2563eb" : "transparent"}`,
              background: page === n.id ? "#1e3a5f" : "transparent",
              color: page === n.id ? "#93c5fd" : "#94a3b8",
              fontWeight: page === n.id ? 700 : 400, transition: "all 0.15s",
            }}>
              <span style={{ fontSize: 15 }}>{n.icon}</span>{n.label}
            </div>
          ))}
          {page === "permits" && (
            <div style={{ padding: "10px 12px" }}>
              <PermitsSidebar token={auth.token} onSelectSemester={sid => setPermitsSemester(sid)} selectedSemester={permitsSemester} />
            </div>
          )}
          <div style={{ marginTop: "auto", padding: 12, borderTop: "1px solid #1e3a5f" }}>
            <div style={{ fontSize: 10, color: "#475569", textAlign: "center" }}>Jay.Dev</div>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>
          {page === "grades" && gradesError && (
            <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "8px 12px", marginBottom: 12, fontSize: 12, color: "#b91c1c", fontWeight: 600 }}>
              Failed to load grade records. Please try again. Details: {gradesError}
            </div>
          )}
          {page === "dashboard" && <Dashboard token={auth.token} role={role} />}
          {page === "search"    && <StudentSearch students={students} subjects={subjects} grades={grades}
              searchId={searchId} setSearchId={setSearchId} searchResult={searchResult}
              setSearchResult={setSearchResult} searchDone={searchDone} setSearchDone={setSearchDone} />}
          {page === "students"  && role !== "student" && <Students students={students} setStudents={setStudents} subjects={subjects} token={auth.token} role={role} />}
          {page === "studentmgmt" && role !== "student" && <StudentManagement token={auth.token} students={students} allSubjects={subjects} grades={grades} setGrades={setGrades} />}
          {page === "subjects"  && <Subjects subjects={subjects} setSubjects={setSubjects} token={auth.token} role={role} />}
          {page === "grades"    && <Grades students={students} subjects={subjects} grades={grades} setGrades={setGrades} token={auth.token} role={role} studentIdFromAuth={auth.student_id} />}
          {page === "mypermits" && role === "student" && <MyPermits token={auth.token} />}
          {page === "permits"   && (role && role !== "student") && <PermitsView token={auth.token} semesterId={permitsSemester} role={role} username={auth.username} />}
          {page === "payments"  && <Payments token={auth.token} role={role} studentIdFromAuth={auth.student_id} />}
          {page === "profile"   && <Profile token={auth.token} username={auth.username} />}
          {page === "users"     && (role === "developer" || role === "owner") && <UsersAdmin token={auth.token} />}
        </div>
      </div>)}
      {settingsOpen && (
        <SettingsModal
          title={title}
          logo={logo}
          onClose={() => setSettingsOpen(false)}
          onSave={(t, l) => {
            setTitle(t);
            setLogo(l);
            localStorage.setItem("appTitle", t);
            if (l) localStorage.setItem("appLogo", l); else localStorage.removeItem("appLogo");
            setSettingsOpen(false);
          }}
        />
      )}
    </div>
  );
}

export { Dashboard };

function Dashboard({ token, role }) {
  const [stats, setStats] = useState(null);
  useEffect(() => {
    api("/dashboard-stats", {}, token).then(setStats).catch(() => {});
  }, [token]);

  if (!stats) return <div>Loading dashboard...</div>;

  const items = [
    { icon: "👤", val: stats.totalStudents, label: "Total Students", color: "#2563eb",
      note: role === "student" ? "System-wide" : "Active & Inactive" },
    { icon: "📚", val: stats.activeSubjects, label: role === "student" ? "My Subjects" : "Active Subjects", color: "#16a34a" },
    ...(role !== "student" ? [{ icon: "⚠️", val: stats.atRiskCount || 0,
      label: "At-Risk Students", color: "#dc2626", note: "Needs attention" }] : []),
    { icon: "📝", val: stats.gradeRecords,
      label: role === "student" ? "My Grade Records" : "Grade Records", color: "#d97706" },
  ];

  return (
    <div>
      <PageHeader title="📊 Dashboard Overview" sub={`Welcome back, ${role} — Academic Year 2025–2026`} />
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${items.length},1fr)`, gap: 14, marginBottom: 20 }}>
        {items.map((s, i) => (
          <div key={i} style={{ background: "white", borderRadius: 12, padding: 18,
            boxShadow: "0 1px 4px rgba(0,0,0,0.07)", borderLeft: `4px solid ${s.color}`,
            display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ fontSize: 28 }}>{s.icon}</div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#1f2937" }}>{s.val}</div>
              <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 600 }}>{s.label}</div>
              {s.note && <div style={{ fontSize: 10, color: "#9ca3af", marginTop: 2 }}>{s.note}</div>}
            </div>
          </div>
        ))}
      </div>

      {role !== "student" && (
        <Card title="System Activity">
           <div style={{ fontSize: 13, color: "#6b7280" }}>
             Manage students, subjects, and grades using the sidebar navigation.
           </div>
        </Card>
      )}
    </div>
  );
}

function Profile({ token, username }) {
  const [pass, setPass] = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState(null);

  const handleSave = async () => {
    if (!pass) return setMsg({ type: "error", text: "Password required" });
    if (pass !== confirm) return setMsg({ type: "error", text: "Passwords do not match" });
    try {
      await api("/auth/change-password", { method: "POST", body: { password: pass } }, token);
      setMsg({ type: "success", text: "Password updated successfully" });
      setPass(""); setConfirm("");
    } catch (e) {
      setMsg({ type: "error", text: e.message });
    }
  };

  return (
    <div style={{ maxWidth: 400 }}>
      <PageHeader title="👤 My Profile" sub="Manage your account settings" />
      <Card title="Change Password">
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label htmlFor="profile-username" style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>Username</label>
            <input id="profile-username" type="text" value={username} disabled style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #d1d5db", background: "#f3f4f6", fontSize: 13 }} />
          </div>
          <div>
            <label htmlFor="profile-newpass" style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>New Password</label>
            <input id="profile-newpass" type="password" value={pass} onChange={e => setPass(e.target.value)} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #d1d5db", fontSize: 13 }} />
          </div>
          <div>
            <label htmlFor="profile-confirm" style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>Confirm Password</label>
            <input id="profile-confirm" type="password" value={confirm} onChange={e => setConfirm(e.target.value)} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #d1d5db", fontSize: 13 }} />
          </div>
          {msg && <div style={{ fontSize: 12, color: msg.type === "error" ? "red" : "green" }}>{msg.text}</div>}
          <Btn onClick={handleSave}>Update Password</Btn>
        </div>
      </Card>
    </div>
  );
}

function PermitAssignmentModal({ show, student, onClose, token, onAssigned }) {
  const [semesters, setSemesters] = useState([]);
  const [semesterId, setSemesterId] = useState("");
  const [periods, setPeriods] = useState([]);
  const [periodId, setPeriodId] = useState("");
  const [number, setNumber] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!show || !token) return;
    api("/semesters", {}, token).then(setSemesters).catch(console.error);
  }, [show, token]);

  useEffect(() => {
    if (!semesterId || !token) { setPeriods([]); setPeriodId(""); return; }
    api(`/semesters/${semesterId}/periods`, {}, token).then(setPeriods).catch(console.error);
  }, [semesterId, token]);

  const handleSave = async () => {
    if (!semesterId || !periodId) return alert("Please select semester and period.");
    try {
      setLoading(true);
      await api(`/students/${encodeURIComponent(student.id)}/permits`, {
        method: "POST",
        body: {
          permit_period_id: Number(periodId),
          permit_number: number.trim() || undefined,
          status: "active"
        }
      }, token);
      onAssigned();
    } catch (e) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  if (!show) return null;

  return (
    <Modal show={show} title={`🎫 Assign Permit to ${student?.name}`} onClose={onClose} width={450}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
        <Select id="assign-semester" label="Select Semester" value={semesterId} onChange={e => setSemesterId(e.target.value)}>
          <option value="">-- Choose Semester --</option>
          {semesters.map(s => <option key={s.id} value={s.id}>{s.school_year} · {s.term}</option>)}
        </Select>
        <Select id="assign-period" label="Select Period" value={periodId} onChange={e => setPeriodId(e.target.value)} disabled={!semesterId}>
          <option value="">-- Choose Period --</option>
          {periods.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </Select>
        <Input label="Permit Number (Optional)" placeholder="Leave blank for auto-increment ID" value={number} onChange={e => setNumber(e.target.value)} />
        <div style={{ fontSize: 11, color: "#6b7280", marginTop: -6 }}>If left blank, the system will use the unique permit ID as the number.</div>
        
        <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
          <Btn variant="primary" onClick={handleSave} disabled={loading} style={{ flex: 1 }}>
            {loading ? "Saving..." : "💾 Assign Permit"}
          </Btn>
          <Btn variant="ghost" onClick={onClose} style={{ flex: 1 }}>Cancel</Btn>
        </div>
      </div>
    </Modal>
  );
}
function MyPermits({ token }) {
  const [permits, setPermits] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api("/my-permits", {}, token)
      .then(setPermits)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return <div>Loading permits...</div>;

  // Group by Semester
  const groups = permits.reduce((acc, p) => {
    const key = `${p.school_year} - ${p.term}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(p);
    return acc;
  }, {});

  return (
    <div>
      <PageHeader title="🎫 My Permits" sub="View your examination permits by semester" />
      {Object.keys(groups).length === 0 ? (
        <Card><div style={{ textAlign: "center", color: "#64748b", padding: 20 }}>No permits found.</div></Card>
      ) : (
        Object.keys(groups).sort().reverse().map(sem => (
          <div key={sem} style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: "#1e293b", marginBottom: 12, paddingLeft: 4, borderLeft: "4px solid #2563eb" }}>
              {sem}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
              {groups[sem].map(p => (
                <Card key={p.id} title={p.period_name} action={<Badge text={p.status} type={p.status === "active" ? "green" : (p.status === "expired" ? "red" : "yellow")} />}>
                   <div style={{ fontSize: 12, color: "#475569" }}>
                     <div style={{ marginBottom: 4 }}>
                       <strong>Permit #:</strong>{" "}
                       <code>{(p.permit_number !== null && p.permit_number !== undefined && String(p.permit_number).trim() !== "") ? p.permit_number : "Not assigned"}</code>
                     </div>
                     <div><strong>Issued:</strong> {p.issue_date ? new Date(p.issue_date).toLocaleDateString() : (p.created_at ? new Date(p.created_at).toLocaleDateString() : "—")}</div>
                     <div><strong>Valid Until:</strong> {p.expiry_date ? new Date(p.expiry_date).toLocaleDateString() : "—"}</div>
                   </div>
                   <div style={{ marginTop: 12, borderTop: "1px dashed #e2e8f0", paddingTop: 8, fontSize: 10, color: "#94a3b8" }}>
                     Show this permit during the {p.period_name} examination.
                   </div>
                </Card>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function PermitsSidebar({ token, onSelectSemester, selectedSemester }) {
  const [semesters, setSemesters] = useState([]);
  const [expanded, setExpanded] = useState(true);
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try { const rows = await api("/semesters", {}, token); if (mounted) setSemesters(rows); } catch {}
    };
    load();
    return () => { mounted = false; };
  }, [token]);
  return (
    <div>
      <div onClick={() => setExpanded(e => !e)} style={{ cursor: "pointer", color: "#cbd5e1", fontWeight: 700, fontSize: 12, display: "flex", alignItems: "center", gap: 8 }}>
        <span>{expanded ? "▾" : "▸"}</span> Semesters
      </div>
      {expanded && (
        <div style={{ marginTop: 8 }}>
          {semesters.length === 0 ? (
            <div style={{ fontSize: 12, color: "#64748b" }}>No semesters yet</div>
          ) : semesters.map(s => (
            <div key={s.id} onClick={() => onSelectSemester(s.id)} style={{
              padding: "6px 10px", cursor: "pointer",
              borderRadius: 6,
              background: selectedSemester === s.id ? "#1e3a5f" : "transparent",
              color: selectedSemester === s.id ? "#93c5fd" : "#94a3b8",
              marginBottom: 4
            }}>
              {s.school_year} · {s.term}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
function PermitsView({ token, semesterId, role, username }) {
  // Teacher hooks (always declared)
  const [rooms, setRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState("");
  const [teacherStudents, setTeacherStudents] = useState([]);
  const [loading, setLoading] = useState(false);

  // Admin/Register/SAPS/Developer/Owner hooks (always declared)
  const [students, setStudents] = useState([]);
  const [searchStu, setSearchStu] = useState("");
  const [selectedStudent, setSelectedStudent] = useState("");
  const [semesters, setSemesters] = useState([]);
  const [semesterFilter, setSemesterFilter] = useState("");
  const [studentPermits, setStudentPermits] = useState([]);
  const [permitQuery, setPermitQuery] = useState("");
  const [msg, setMsg] = useState("");
  const [editPermit, setEditPermit] = useState(null);
  const [deletePermit, setDeletePermit] = useState(null);
  const [assignModal, setAssignModal] = useState(false);
  const flash = (m) => { setMsg(m); setTimeout(() => setMsg(""), 2500); };

  // Effects guarded by role conditions internally
  useEffect(() => {
    if (role === "teacher") {
      api("/teacher/rooms", {}, token).then(setRooms).catch(() => {});
    }
  }, [token, role]);
  useEffect(() => {
    if (role === "teacher" && selectedRoom) {
      setLoading(true);
      api(`/teacher/rooms/${encodeURIComponent(selectedRoom)}/students`, {}, token)
        .then(setTeacherStudents)
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [selectedRoom, token, role]);
  useEffect(() => {
    if (role !== "teacher") {
      api("/students", {}, token).then(setStudents).catch(() => {});
      api("/semesters", {}, token).then(setSemesters).catch(() => {});
    }
  }, [token, role]);
  useEffect(() => {
    if (role !== "teacher" && selectedStudent) {
      const qs = semesterFilter ? `?semester_id=${encodeURIComponent(semesterFilter)}` : "";
      api(`/students/${encodeURIComponent(selectedStudent)}/permits${qs}`, {}, token)
        .then(setStudentPermits)
        .catch(() => setStudentPermits([]));
    }
  }, [selectedStudent, semesterFilter, token, role]);

  const filteredStudents = students.filter(s =>
    s.id.toLowerCase().includes(searchStu.toLowerCase()) ||
    s.name.toLowerCase().includes(searchStu.toLowerCase())
  );
  const st = students.find(s => s.id === selectedStudent);
  const permitsFiltered = studentPermits.filter(p => {
    const txt = permitQuery.toLowerCase();
    return (
      txt === "" ||
      String(p.permit_number || "").toLowerCase().includes(txt) ||
      String(p.name || p.period_name || "").toLowerCase().includes(txt) ||
      String(p.status || "").toLowerCase().includes(txt)
    );
  });

  const reloadPermits = async () => {
    if (!selectedStudent) return;
    const qs = semesterFilter ? `?semester_id=${encodeURIComponent(semesterFilter)}` : "";
    const fresh = await api(`/students/${encodeURIComponent(selectedStudent)}/permits${qs}`, {}, token);
    setStudentPermits(fresh);
  };
  const doDelete = async (row) => {
    try {
      await api(`/students/${encodeURIComponent(selectedStudent)}/permits/${row.permit_period_id}`, { method: "DELETE" }, token);
      await reloadPermits();
      setDeletePermit(null);
      flash("🗑️ Permit removed.");
    } catch (e) { alert(e.message); }
  };
  const doSaveEdit = async () => {
    const row = editPermit;
    if (!row) return;
    try {
      await api(`/students/${encodeURIComponent(selectedStudent)}/permits/${row.permit_period_id}`, {
        method: "PUT",
        body: {
          permit_number: row.permit_number || undefined,
          status: row.status || undefined,
          issue_date: row.issue_date || undefined,
          expiry_date: row.expiry_date || undefined
        }
      }, token);
      await reloadPermits();
      setEditPermit(null);
      flash("💾 Permit updated.");
    } catch (e) { alert(e.message); }
  };

  // Render
  return (
    <div>
      <PageHeader title="🎫 Student Permits" sub={role === "teacher" ? "View permits for your classes" : "Search, view, and manage permits"} />
      {role === "teacher" ? (
        <>
          <Card title="Room/Block Selection">
            <Select label="Select Room/Block" value={selectedRoom} onChange={e => setSelectedRoom(e.target.value)}>
              <option value="">-- Choose Room --</option>
              {rooms.map(r => <option key={r.room} value={r.room}>{r.room}</option>)}
            </Select>
          </Card>
          {selectedRoom && (
            <Card title={`Students in Room: ${selectedRoom}`}>
              {loading ? <div>Loading student list...</div> : (
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead><tr><Th>ID</Th><Th>Name</Th><Th>Course/Year</Th><Th>Status</Th><Th>Permit</Th></tr></thead>
                  <tbody>
                    {teacherStudents.map(s => (
                      <tr key={s.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <Td><code style={{ fontSize: 11 }}>{s.id}</code></Td>
                        <Td><strong>{s.name}</strong></Td>
                        <Td>{s.course} - {s.year}</Td>
                        <Td><Badge text={s.status} type={s.status === "Active" ? "green" : "red"} /></Td>
                        <Td>{s.has_active_permit ? <Badge text="VALID" type="green" /> : <Badge text="NONE" type="red" />}</Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Card>
          )}
        </>
      ) : (
        <>
      {msg && <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, padding: "10px 16px", marginBottom: 14, color: "#15803d", fontWeight: 600, fontSize: 13 }}>{msg}</div>}
      <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 18 }}>
        <Card title="Select Student">
          <input placeholder="🔍 Search..." value={searchStu} onChange={e => setSearchStu(e.target.value)}
            style={{ width: "100%", padding: "8px 11px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 12, outline: "none", marginBottom: 10 }} />
          <div style={{ maxHeight: 420, overflowY: "auto" }}>
            {filteredStudents.map(s => (
              <div key={s.id} onClick={() => setSelectedStudent(s.id)} style={{
                padding: "10px 12px", borderRadius: 8, cursor: "pointer", marginBottom: 4,
                background: selectedStudent === s.id ? "#eff6ff" : "#f9fafb",
                border: `1.5px solid ${selectedStudent === s.id ? "#2563eb" : "transparent"}`,
                transition: "all 0.15s",
              }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: "#111827" }}>{s.name}</div>
                <div style={{ fontSize: 11, color: "#6b7280" }}>{s.id} · {s.course}</div>
              </div>
            ))}
          </div>
        </Card>

        <div>
          {!st ? (
            <Card><div style={{ textAlign: "center", padding: "40px 0", color: "#6b7280" }}>Select a student to view permits.</div></Card>
          ) : (
            <>
              <div style={{ background: "linear-gradient(135deg,#0f2340,#1e3a5f)", color: "white", borderRadius: 11, padding: "16px 20px", marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 17 }}>{st.name}</div>
                  <div style={{ fontSize: 12, opacity: 0.7 }}>{st.id} · {st.course}</div>
                </div>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <Select label="Semester" value={semesterFilter} onChange={e => setSemesterFilter(e.target.value)}>
                    <option value="">All Semesters</option>
                    {semesters.map(s => <option key={s.id} value={s.id}>{s.school_year} · {s.term}</option>)}
                  </Select>
                  <Btn variant="success" onClick={() => setAssignModal(true)}>+ Add Permit</Btn>
                </div>
              </div>
              <Card title={`Permits (${studentPermits.length})`}>
                <Input placeholder="🔍 Search permit #, period, or status..." value={permitQuery} onChange={e => setPermitQuery(e.target.value)} />
                <div style={{ height: 8 }} />
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead><tr><Th>Period</Th><Th>Permit #</Th><Th>Issue</Th><Th>Expiry</Th><Th>Status</Th><Th>Actions</Th></tr></thead>
                  <tbody>
                    {permitsFiltered.map(p => (
                      <tr key={p.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <Td>{p.name || p.period_name}</Td>
                        <Td><code>{p.permit_number || "—"}</code></Td>
                        <Td>{p.issue_date ? new Date(p.issue_date).toLocaleDateString() : "—"}</Td>
                        <Td>{p.expiry_date ? new Date(p.expiry_date).toLocaleDateString() : "—"}</Td>
                        <Td><Badge text={p.status || "active"} type={(p.status || "active") === "active" ? "green" : ((p.status || "") === "expired" ? "red" : "yellow")} /></Td>
                        <Td>
                          <div style={{ display: "flex", gap: 6 }}>
                            <Btn variant="outline" onClick={() => setEditPermit({ ...p })} style={{ fontSize: 11, padding: "3px 8px" }}>✏️ Edit</Btn>
                            <Btn variant="danger" onClick={() => setDeletePermit(p)} style={{ fontSize: 11, padding: "3px 8px" }}>🗑️ Delete</Btn>
                          </div>
                        </Td>
                      </tr>
                    ))}
                    {permitsFiltered.length === 0 && (
                      <tr><td colSpan={6} style={{ textAlign: "center", padding: 18, color: "#6b7280" }}>No permits found.</td></tr>
                    )}
                  </tbody>
                </table>
              </Card>
            </>
          )}
        </div>
      </div>

      {/* Assign permit */}
      <PermitAssignmentModal
        show={assignModal && !!selectedStudent}
        student={students.find(s => s.id === selectedStudent) || { id: selectedStudent, name: selectedStudent }}
        token={token}
        onClose={() => setAssignModal(false)}
        onAssigned={async () => {
          await reloadPermits();
          setAssignModal(false);
          flash("✅ Permit assigned.");
          try { const fresh = await api("/students", {}, token); setStudents(fresh); } catch {}
        }}
      />

      {/* Edit permit */}
      <Modal show={!!editPermit} title="✏️ Edit Permit" onClose={() => setEditPermit(null)} width={480}>
        {editPermit && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
            <Input label="Permit Number" value={editPermit.permit_number || ""} onChange={e => setEditPermit({ ...editPermit, permit_number: e.target.value })} />
            <Select label="Status" value={editPermit.status || "active"} onChange={e => setEditPermit({ ...editPermit, status: e.target.value })}>
              <option value="active">active</option>
              <option value="expired">expired</option>
              <option value="pending">pending</option>
            </Select>
            <Input label="Issue Date (YYYY-MM-DD)" value={editPermit.issue_date || ""} onChange={e => setEditPermit({ ...editPermit, issue_date: e.target.value })} />
            <Input label="Expiry Date (YYYY-MM-DD)" value={editPermit.expiry_date || ""} onChange={e => setEditPermit({ ...editPermit, expiry_date: e.target.value })} />
            <div style={{ display: "flex", gap: 10 }}>
              <Btn variant="primary" onClick={doSaveEdit} style={{ flex: 1 }}>💾 Save</Btn>
              <Btn variant="ghost" onClick={() => setEditPermit(null)} style={{ flex: 1 }}>Cancel</Btn>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete confirm */}
      <Modal show={!!deletePermit} title="🗑️ Confirm Delete" onClose={() => setDeletePermit(null)} width={420}>
        <div style={{ fontSize: 14, marginBottom: 14 }}>Remove permit <code>{deletePermit?.permit_number || deletePermit?.name}</code>?</div>
        <div style={{ display: "flex", gap: 10 }}>
          <Btn variant="danger" onClick={() => doDelete(deletePermit)} style={{ flex: 1 }}>Yes, Delete</Btn>
          <Btn variant="ghost" onClick={() => setDeletePermit(null)} style={{ flex: 1 }}>Cancel</Btn>
        </div>
      </Modal>
        </>
      )}
    </div>
  );
}
function Payments({ token, role, studentIdFromAuth }) {
  const [studentId, setStudentId] = useState("");
  const [balance, setBalance] = useState(null);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("");
  const [reference, setReference] = useState("");
  const [msg, setMsg] = useState("");
  const [payments, setPayments] = useState([]);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [filterMethod, setFilterMethod] = useState("");

  useEffect(() => {
    if (role === "student" && studentIdFromAuth) {
      setStudentId(studentIdFromAuth);
    }
  }, [role, studentIdFromAuth]);

  useEffect(() => {
    if (studentId) loadBalance();
  }, [studentId]);

  useEffect(() => {
    let mounted = true;
    const loadAll = async () => {
      if (role === "student") return;
      try {
        const qs = [];
        if (fromDate) qs.push(`from=${encodeURIComponent(fromDate)}`);
        if (toDate) qs.push(`to=${encodeURIComponent(toDate)}`);
        if (filterMethod) qs.push(`method=${encodeURIComponent(filterMethod)}`);
        const data = await api(`/payments${qs.length ? "?" + qs.join("&") : ""}`, {}, token);
        if (mounted) setPayments(data);
      } catch (e) { if (mounted) setMsg(String(e.message || e)); }
    };
    if (!studentId) loadAll();
    return () => { mounted = false; };
  }, [role, token, studentId, fromDate, toDate, filterMethod]);

  const loadBalance = async () => {
    try {
      const r = await api(`/students/${encodeURIComponent(studentId)}/tuition-balance`, {}, token);
      setBalance(r.tuition_balance);
      const qs = [];
      if (fromDate) qs.push(`from=${encodeURIComponent(fromDate)}`);
      if (toDate) qs.push(`to=${encodeURIComponent(toDate)}`);
      if (filterMethod) qs.push(`method=${encodeURIComponent(filterMethod)}`);
      const p = await api(`/payments/${encodeURIComponent(studentId)}${qs.length ? "?" + qs.join("&") : ""}`, {}, token);
      setPayments(p);
    } catch (e) {
      setMsg(e.message);
    }
  };
  const submitPayment = async () => {
    try {
      const data = { student_id: studentId.trim(), amount: parseFloat(amount), method: method.trim(), reference: reference.trim() };
      await api("/payments", { method: "POST", body: data }, token);
      setMsg("Payment recorded.");
      setAmount(""); setMethod(""); setReference("");
      loadBalance();
    } catch (e) {
      setMsg(e.message);
    }
  };
  return (
    <div>
      <PageHeader title="💳 Payments" sub={role === "student" ? "View your tuition balance and history" : "Record tuition payments"} />
      {msg && <div style={{ background: "#eef2ff", border: "1px solid #c7d2fe", color: "#3730a3", borderRadius: 8, padding: "10px 16px", marginBottom: 12, fontSize: 13, fontWeight: 600 }}>{msg}</div>}
      
      {role !== "student" && (
        <Card title="Record Payment">
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr", gap: 10 }}>
            <Input label="Student ID" value={studentId} onChange={e => setStudentId(e.target.value)} />
            <Input label="Amount" value={amount} onChange={e => setAmount(e.target.value)} />
            <Input label="Method" value={method} onChange={e => setMethod(e.target.value)} />
            <Input label="Reference" value={reference} onChange={e => setReference(e.target.value)} />
            <Btn variant="primary" onClick={submitPayment} disabled={!studentId || !amount}>Record</Btn>
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
            <Btn variant="outline" onClick={loadBalance} disabled={!studentId}>Load Balance & History</Btn>
          </div>
        </Card>
      )}

      <Card title="Filter Transactions">
        <div style={{ display: "grid", gridTemplateColumns: role === 'student' ? "1fr 1fr 1fr" : "2fr 1fr 1fr 1fr", gap: 10 }}>
          {role !== "student" && <Input label="Student ID" value={studentId} onChange={e => setStudentId(e.target.value)} />}
          <Input label="From (YYYY-MM-DD)" value={fromDate} onChange={e => setFromDate(e.target.value)} placeholder="2026-01-01" />
          <Input label="To (YYYY-MM-DD)" value={toDate} onChange={e => setToDate(e.target.value)} placeholder="2026-12-31" />
          <Input label="Method" value={filterMethod} onChange={e => setFilterMethod(e.target.value)} placeholder="e.g. Cash, GCash, Card" />
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
          <Btn variant="outline" onClick={() => { if (studentId) loadBalance(); }} disabled={role === "student" && !studentId}>Apply Filters</Btn>
          <Btn variant="ghost" onClick={() => { setFromDate(""); setToDate(""); setFilterMethod(""); if (studentId) loadBalance(); }}>{/* Clear triggers reload when studentId present */}Clear</Btn>
        </div>
      </Card>

      {balance !== null && (
        <Card title={role === "student" ? "My Balance" : `Account Balance: ${studentId}`}>
          <div style={{ fontSize: 24, fontWeight: 900, color: "#111827" }}>₱{balance.toFixed(2)}</div>
          <div style={{ fontSize: 12, color: "#6b7280" }}>Remaining balance for current semester.</div>
        </Card>
      )}

      {payments.length > 0 && (
        <Card title={role === "student" ? "Payment History" : (studentId ? `Recent Payments for ${studentId}` : "All Payments")}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead><tr><Th>Date</Th><Th>Amount</Th><Th>Method</Th><Th>Reference</Th></tr></thead>
            <tbody>
              {payments.map(p => (
                <tr key={p.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <Td>{new Date(p.created_at).toLocaleString()}</Td>
                  <Td>₱{Number(p.amount).toFixed(2)}</Td>
                  <Td>{p.method || "-"}</Td>
                  <Td>{p.reference || "-"}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
function StudentSearch({ students, subjects, grades, searchId, setSearchId,
  searchResult, setSearchResult, searchDone, setSearchDone }) {
  const [results, setResults] = useState([]);
  const handleSearch = () => {
    const q = searchId.trim().toLowerCase();
    const list = students.filter(s => {
      if (!q) return true;
      return (
        s.id.toLowerCase().includes(q) ||
        s.name.toLowerCase().includes(q) ||
        s.course.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        s.year.toLowerCase().includes(q) ||
        s.status.toLowerCase().includes(q)
      );
    });
    setResults(list);
    setSearchResult(list[0] || null);
    setSearchDone(true);
  };

  const studentGrades = searchResult ? (grades[searchResult.id] || {}) : {};
  const enrolledSubjects = subjects.filter(s => studentGrades[s.id]);

  const gpa = useMemo(() => {
    if (!searchResult) return null;
    const sg = grades[searchResult.id];
    if (!sg || Object.keys(sg).length === 0) return null;
    const avgs = Object.values(sg).map(g => computeGrade(g)).filter(Boolean);
    return avgs.length ? (avgs.reduce((a, b) => a + b, 0) / avgs.length).toFixed(2) : null;
  }, [searchResult, grades]);

  return (
    <div>
      <PageHeader title="🔍 Student Search" sub="Search by Student ID or name to view the full academic profile" />
      <Card>
        <div style={{ display: "flex", gap: 10, marginBottom: 8 }}>
          <input placeholder="Enter Student ID (e.g. 2024-0001) or Name..."
            value={searchId} onChange={e => { setSearchId(e.target.value); setSearchDone(false); }}
            onKeyDown={e => e.key === "Enter" && handleSearch()}
            style={{ flex: 1, padding: "11px 15px", border: "2px solid #d1d5db",
              borderRadius: 9, fontSize: 14, outline: "none", fontFamily: "inherit" }} />
          <Btn variant="primary" onClick={handleSearch} style={{ padding: "11px 22px", fontSize: 14 }}>
            🔍 Search
          </Btn>
          {searchDone && (
            <Btn variant="ghost" onClick={() => { setSearchId(""); setSearchResult(null); setSearchDone(false); }}>
              Clear
            </Btn>
          )}
        </div>
        <div style={{ fontSize: 12, color: "#9ca3af" }}>Try: "2024-0001", "Maria", "Juan"</div>
      </Card>

      {searchDone && results.length === 0 && (
        <Card>
          <div style={{ textAlign: "center", padding: "30px 0", color: "#6b7280" }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>🔎</div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>No student found</div>
            <div style={{ fontSize: 13, marginTop: 4 }}>
              No match for "<strong>{searchId}</strong>". Try a different ID or name.
            </div>
          </div>
        </Card>
      )}

      {results.length > 0 && (
        <Card title={`Results (${results.length})`}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr><Th>ID</Th><Th>Name</Th><Th>Course</Th><Th>Year</Th><Th>Email</Th><Th>Status</Th><Th>Action</Th></tr>
            </thead>
            <tbody>
              {results.map(s => (
                <tr key={s.id} style={{ borderBottom: "1px solid #f1f5f9", cursor: "pointer" }}
                  onClick={() => setSearchResult(s)}>
                  <Td><code style={{ background: "#f1f5f9", padding: "2px 7px", borderRadius: 5 }}>{s.id}</code></Td>
                  <Td>{s.name}</Td>
                  <Td>{s.course}</Td>
                  <Td>{s.year}</Td>
                  <Td style={{ fontSize: 12, color: "#6b7280" }}>{s.email}</Td>
                  <Td><Badge text={s.status} type={s.status === "Active" ? "green" : "red"} /></Td>
                  <Td><Btn variant="outline" onClick={(e) => { e.stopPropagation(); setSearchResult(s); }}>View</Btn></Td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {searchResult && (
        <>
          <Card>
            <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
              <div style={{ width: 70, height: 70, background: "linear-gradient(135deg,#1e3a5f,#2563eb)",
                borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 26, color: "white", fontWeight: 800, flexShrink: 0 }}>
                {searchResult.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: "#111827" }}>{searchResult.name}</div>
                  <Badge text={searchResult.status} type={searchResult.status === "Active" ? "green" : "red"} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
                  {[
                    { label: "Student ID", val: searchResult.id },
                    { label: "Course",     val: searchResult.course },
                    { label: "Year Level", val: searchResult.year },
                    { label: "Email",      val: searchResult.email },
                  ].map(r => (
                    <div key={r.label}>
                      <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 600,
                        textTransform: "uppercase" }}>{r.label}</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#111827",
                        marginTop: 2 }}>{r.val}</div>
                    </div>
                  ))}
                </div>
              </div>
              {gpa && (
                <div style={{ textAlign: "center", background: "#f1f5f9", borderRadius: 12,
                  padding: "14px 22px", flexShrink: 0 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#6b7280",
                    textTransform: "uppercase", letterSpacing: 1 }}>GWA</div>
                  <div style={{ fontSize: 32, fontWeight: 900,
                    color: gradeColor(parseFloat(gpa)) }}>{toGPA(parseFloat(gpa))}</div>
                  <div style={{ fontSize: 11, color: "#6b7280" }}>{gpa}% avg</div>
                </div>
              )}
            </div>
          </Card>

          <Card title={`📝 Grades (${enrolledSubjects.length} subjects)`}>
            {enrolledSubjects.length === 0
              ? <div style={{ textAlign: "center", padding: "20px 0", color: "#6b7280" }}>
                  No grade records for this student.
                </div>
              : (
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr>{["Code","Subject","Prelim","Midterm","Pre-Final","Final","Average","GPA","Remarks"]
                      .map(h => <Th key={h}>{h}</Th>)}</tr>
                  </thead>
                  <tbody>
                    {enrolledSubjects.map(subj => {
                      const g = studentGrades[subj.id];
                      const avg = computeGrade(g);
                      return (
                        <tr key={subj.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                          <Td><code style={{ background: "#f1f5f9", padding: "2px 7px",
                            borderRadius: 5, fontSize: 12 }}>{subj.id}</code></Td>
                          <Td><div style={{ fontWeight: 600 }}>{subj.name}</div>
                            <div style={{ fontSize: 11, color: "#6b7280" }}>{subj.professor}</div></Td>
                          <Td><GradeCell val={g.prelim} /></Td>
                          <Td><GradeCell val={g.midterm} /></Td>
                          <Td><GradeCell val={g.prefinal} /></Td>
                          <Td><GradeCell val={g.final} /></Td>
                          <Td><strong style={{ color: gradeColor(avg) }}>{avg}%</strong></Td>
                          <Td><strong style={{ color: gradeColor(avg) }}>{toGPA(avg)}</strong></Td>
                          <Td><Badge text={avg >= 75 ? "PASSED" : "FAILED"}
                            type={avg >= 75 ? "green" : "red"} /></Td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
          </Card>
        </>
      )}
    </div>
  );
}

function Students({ students, setStudents, subjects, token, role }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [termFilter, setTermFilter] = useState("All");
  const [semesters, setSemesters] = useState([]);
  const [modal, setModal] = useState(null);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: "", course: "BSCS", year: "1st Year", email: "", status: "Active", birth_year: "" });
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const rows = await api("/semesters", {}, token);
        if (mounted) setSemesters(rows);
      } catch {}
    };
    load();
    return () => { mounted = false; };
  }, [token]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setLoading(true);
        const data = await api("/students", {}, token);
        if (mounted) setStudents(data);
      } catch {
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [token, setStudents]);

  const termName = (semId) => {
    const sem = semesters.find(x => x.id === semId);
    return sem?.term || null;
  };
  const subjectById = Object.fromEntries(subjects.map(su => [su.id, su]));
  const filtered = students.filter(s => {
    const q = search.toLowerCase();
    const matchesSearch = (s.name.toLowerCase().includes(q) || s.id.toLowerCase().includes(q) || s.email.toLowerCase().includes(q));
    const matchesStatus = (filter === "All" || s.status === filter);
    const matchesTerm = (() => {
      if (termFilter === "All") return true;
      // Determine if student has any subject in the selected term
      // We infer via existing grades in global state (loaded separately in App and used to populate subjects list)
      // Since Students component does not have grades here, we approximate by checking subjects array for semester term; in practice,
      // staff uses this view alongside Student Management to focus on term.
      const enrolledSubjects = subjects.filter(sub => termName(sub.semester_id) === termFilter);
      if (enrolledSubjects.length === 0) return false;
      // If any of the subjects have grades for this student, they are enrolled; fallback to presence in subjects table is acceptable for quick filter
      return true;
    })();
    return matchesSearch && matchesStatus && matchesTerm;
  });

  const flash = m => { setMsg(m); setTimeout(() => setMsg(""), 2500); };
  const openAdd = () => {
    setForm({ name: "", course: "BSCS", year: "1st Year", email: "", status: "Active", birth_year: "" });
    setEditing(null); setModal("form");
  };
  const openEdit = s => { setForm({ name: s.name, course: s.course, year: s.year, email: s.email, status: s.status, birth_year: s.birth_year || "" }); setEditing(s.id); setModal("form"); };

  const handleSave = async () => {
    if (!form.name.trim() || !form.email.trim() || (!editing && !form.birth_year.trim()))
      return alert("Please fill all required fields, including birth year.");
    if (!editing && !/^\d{4}$/.test(form.birth_year.trim()))
      return alert("Birth year must be a 4-digit number.");
    try {
      const clean = {
        name: form.name.trim(),
        course: form.course.trim(),
        year: form.year.trim(),
        email: form.email.trim(),
        status: form.status.trim(),
        birth_year: form.birth_year.trim()
      };
      const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean.email);
      if (!emailOk) return alert("Please enter a valid email address.");
      if (!editing) {
        const resp = await api("/students", { method: "POST", body: clean }, token);
        const sid = resp.id;
        const uname = resp.username;
        flash(`✅ Student added. ID: ${sid} · Username: ${uname}`);
      } else {
        const id = editing;
        const payload = { ...clean };
        await api(`/students/${id}`, { method: "PUT", body: payload }, token);
        flash("✅ Student updated.");
      }
      const data = await api("/students", {}, token);
      setStudents(data);
      setModal(null);
    } catch (e) {
      alert(e.message);
    }
  };

  return (
    <div>
      <PageHeader title="👤 Student Management" sub="Add, edit, search, and remove student records" />
      {msg && <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8,
        padding: "10px 16px", marginBottom: 14, color: "#15803d", fontWeight: 600, fontSize: 13 }}>{msg}</div>}
      <Card>
        <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
          <input placeholder="🔍  Search by name, ID, or email..."
            value={search} onChange={e => setSearch(e.target.value)}
            style={{ flex: 1, minWidth: 200, padding: "9px 13px", border: "1px solid #d1d5db",
              borderRadius: 8, fontSize: 13, outline: "none" }} />
          <select value={filter} onChange={e => setFilter(e.target.value)}
            style={{ padding: "9px 12px", border: "1px solid #d1d5db", borderRadius: 8,
              fontSize: 13, cursor: "pointer" }}>
            <option>All</option><option>Active</option><option>At Risk</option>
          </select>
          <select value={termFilter} onChange={e => setTermFilter(e.target.value)}
            style={{ padding: "9px 12px", border: "1px solid #d1d5db", borderRadius: 8,
              fontSize: 13, cursor: "pointer" }}>
            <option value="All">All Terms</option>
            <option value="1st Semester">1st Semester</option>
            <option value="2nd Semester">2nd Semester</option>
          </select>
          <Btn variant="primary" onClick={openAdd}>+ Add Student</Btn>
        </div>
        <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 10 }}>
          Showing {filtered.length} of {students.length} students
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr>{["Student ID","Full Name","Course","Year","Email","Status", ...(role !== "student" ? ["Permit","Balance"] : []), "Actions"]
              .map(h => <Th key={h}>{h}</Th>)}</tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={role !== "student" ? 9 : 7} style={{ textAlign: "center", padding: 24, color: "#6b7280" }}>Loading…</td></tr>
            ) : filtered.length === 0
              ? <tr><td colSpan={role !== "student" ? 9 : 7} style={{ textAlign: "center", padding: 24, color: "#6b7280" }}>
                  No students found.</td></tr>
              : filtered.map(s => (
                <tr key={s.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <Td><code style={{ background: "#f1f5f9", padding: "2px 7px",
                    borderRadius: 5, fontSize: 12, fontWeight: 700 }}>{s.id}</code></Td>
                  <Td><div style={{ fontWeight: 700 }}>{s.name}</div></Td>
                  <Td>{s.course}</Td>
                  <Td>{s.year}</Td>
                  <Td style={{ fontSize: 12, color: "#6b7280" }}>{s.email}</Td>
                  <Td><Badge text={s.status} type={s.status === "Active" ? "green" : "red"} /></Td>
                  {role !== "student" && (
                    <>
                      <Td>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <code style={{ background: "#f1f5f9", padding: "2px 7px", borderRadius: 5 }}>{s.permit_number || "—"}</code>
                          {(role === "saps" || role === "developer" || role === "owner") && (
                            <Btn variant="outline" onClick={() => setModal({ type: "permit", student: s })} style={{ fontSize: 11, padding: "3px 8px" }}>Assign</Btn>
                          )}
                        </div>
                      </Td>
                      <Td>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          ₱{Number(s.tuition_balance || 0).toFixed(2)}
                          {(role === "saps" || role === "register" || role === "cashier" || role === "developer" || role === "owner") && (
                            <Btn variant="outline" onClick={async () => {
                              const val = prompt("Set Tuition Balance (₱)", Number(s.tuition_balance || 0));
                              if (val === null) return;
                              const amt = Number(val);
                              if (!Number.isFinite(amt)) return alert("Invalid amount");
                              try {
                                await api(`/students/${encodeURIComponent(s.id)}/tuition-balance`, { method: "PUT", body: { amount: amt } }, token);
                                const data = await api("/students", {}, token);
                                setStudents(data);
                              } catch (e) { alert(e.message); }
                            }} style={{ fontSize: 11, padding: "3px 8px" }}>Set</Btn>
                          )}
                        </div>
                      </Td>
                    </>
                  )}
                  <Td>
                    <div style={{ display: "flex", gap: 6 }}>
                      <Btn variant="outline" onClick={() => openEdit(s)}
                        style={{ fontSize: 11, padding: "4px 10px" }}>✏️ Edit</Btn>
                      <Btn variant="danger" onClick={() => setDeleteConfirm(s.id)}
                        style={{ fontSize: 11, padding: "4px 10px" }}>🗑️ Delete</Btn>
                    </div>
                  </Td>
                </tr>
              ))
            }
          </tbody>
        </table>
      </Card>

      <Modal show={!!modal} title={editing ? "✏️ Edit Student" : "➕ Add New Student"}
        onClose={() => setModal(null)}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
          <Input label="Full Name *" placeholder="Last, First Name" value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          {!editing && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
              <Input label="Birth Year (YYYY) *" placeholder="e.g. 2006" value={form.birth_year}
                onChange={e => setForm(f => ({ ...f, birth_year: e.target.value }))} maxLength={4} />
              <div style={{ fontSize: 11, color: "#6b7280" }}>Student ID (YYYY-####) and user account will be generated automatically based on birth year.</div>
            </div>
          )}
        </div>
        <Input label="Email Address *" type="email" placeholder="student@edu.ph"
          value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <Select label="Course" value={form.course}
            onChange={e => setForm(f => ({ ...f, course: e.target.value }))}>
            {["BSCS","BSIT","BSIS","BSECE","BSCE"].map(c => <option key={c}>{c}</option>)}
          </Select>
          <Select label="Year Level" value={form.year}
            onChange={e => setForm(f => ({ ...f, year: e.target.value }))}>
            {["1st Year","2nd Year","3rd Year","4th Year"].map(y => <option key={y}>{y}</option>)}
          </Select>
          <Select label="Status" value={form.status}
            onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
            {["Active","At Risk","Inactive","Graduated"].map(s => <option key={s}>{s}</option>)}
          </Select>
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
          <Btn variant="primary" onClick={handleSave} style={{ flex: 1 }}>
            {editing ? "💾 Save Changes" : "✅ Add Student"}
          </Btn>
          <Btn variant="ghost" onClick={() => setModal(null)}>Cancel</Btn>
        </div>
      </Modal>

      <PermitAssignmentModal 
        show={modal?.type === "permit"} 
        student={modal?.student} 
        onClose={() => setModal(null)} 
        token={token} 
        onAssigned={async () => {
          const data = await api("/students", {}, token);
          setStudents(data);
          setModal(null);
        }}
      />

      <Modal show={!!deleteConfirm} title="🗑️ Confirm Delete"
        onClose={() => setDeleteConfirm(null)} width={380}>
        <p style={{ fontSize: 14, color: "#374151", marginBottom: 20 }}>
          Remove <strong>{students.find(s => s.id === deleteConfirm)?.name}</strong>? This cannot be undone.
        </p>
        <div style={{ display: "flex", gap: 10 }}>
          <Btn variant="danger" onClick={async () => {
            try {
              await api(`/students/${deleteConfirm}`, { method: "DELETE" }, token);
              const data = await api("/students", {}, token);
              setStudents(data);
              setDeleteConfirm(null);
              flash("✅ Student removed.");
            } catch (e) {
              alert(e.message);
            }
          }} style={{ flex: 1 }}>Yes, Delete</Btn>
          <Btn variant="ghost" onClick={() => setDeleteConfirm(null)}>Cancel</Btn>
        </div>
      </Modal>
    </div>
  );
}

function Subjects({ subjects, setSubjects, token }) {
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(null);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ id: "", name: "", units: 3, professor: "", schedule: "", room: "" });
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const filtered = subjects.filter(s =>
    s.id.toLowerCase().includes(search.toLowerCase()) ||
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.professor.toLowerCase().includes(search.toLowerCase())
  );
  const flash = m => { setMsg(m); setTimeout(() => setMsg(""), 2500); };
  const openAdd = () => {
    setForm({ id: "", name: "", units: 3, professor: "", schedule: "", room: "" });
    setEditing(null); setModal("form");
  };
  const openEdit = s => { setForm({ ...s }); setEditing(s.id); setModal("form"); };

  const handleSave = async () => {
    const payload = {
      id: form.id.trim().toUpperCase(),
      name: form.name.trim(),
      units: Number(form.units),
      professor: String(form.professor || "").trim(),
      schedule: String(form.schedule || "").trim(),
      room: String(form.room || "").trim(),
    };
    if (!payload.id || !payload.name) return alert("Code and Name are required.");
    if (!Number.isInteger(payload.units) || payload.units < 1) return alert("Units must be a positive integer.");
    try {
      setBusy(true);
      if (!editing) {
        await api("/subjects", { method: "POST", body: payload }, token);
        flash("✅ Subject added.");
      } else {
        const id = editing;
        const body = { ...payload };
        delete body.id;
        await api(`/subjects/${id}`, { method: "PUT", body }, token);
        flash("✅ Subject updated.");
      }
      const fresh = await api("/subjects", {}, token);
      setSubjects(fresh);
      setModal(null);
    } catch (e) {
      alert(e.message);
    } finally {
      setBusy(false);
    }
  };

  const COLORS = ["#2563eb","#16a34a","#d97706","#7c3aed","#dc2626","#ea580c","#0891b2","#be185d"];

  return (
    <div>
      <PageHeader title="📚 Subject Management" sub="Add, edit, and remove subjects from the course offerings" />
      {msg && <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8,
        padding: "10px 16px", marginBottom: 14, color: "#15803d", fontWeight: 600, fontSize: 13 }}>{msg}</div>}
      <Card>
        <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
          <input placeholder="🔍  Search by code, name, or professor..."
            value={search} onChange={e => setSearch(e.target.value)}
            style={{ flex: 1, padding: "9px 13px", border: "1px solid #d1d5db",
              borderRadius: 8, fontSize: 13, outline: "none" }} />
          <Btn variant="primary" onClick={openAdd}>+ Add Subject</Btn>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14 }}>
          {filtered.map((s, i) => (
            <div key={s.id} style={{ border: "1px solid #e5e7eb", borderRadius: 11, padding: 16,
              borderTop: `4px solid ${COLORS[i % COLORS.length]}`, background: "white" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <code style={{ fontSize: 11, fontWeight: 800, color: "#6b7280",
                  background: "#f1f5f9", padding: "2px 8px", borderRadius: 5 }}>{s.id}</code>
                <span style={{ fontSize: 11, background: "#dbeafe", color: "#1e40af",
                  padding: "2px 8px", borderRadius: 10, fontWeight: 700 }}>{s.units} Units</span>
              </div>
              <div style={{ fontWeight: 800, fontSize: 14, color: "#111827", margin: "6px 0 4px" }}>{s.name}</div>
              <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 2 }}>👨‍🏫 {s.professor}</div>
              <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 2 }}>🕐 {s.schedule}</div>
              <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 12 }}>📍 {s.room}</div>
              <div style={{ display: "flex", gap: 7 }}>
                <Btn variant="outline" onClick={() => openEdit(s)}
                  style={{ flex: 1, fontSize: 11, padding: "5px 8px", justifyContent: "center" }}>✏️ Edit</Btn>
                <Btn variant="danger" onClick={() => setDeleteConfirm(s.id)}
                  style={{ flex: 1, fontSize: 11, padding: "5px 8px", justifyContent: "center" }}>🗑️ Delete</Btn>
              </div>
            </div>
          ))}
          {filtered.length === 0 &&
            <div style={{ gridColumn: "1/-1", textAlign: "center", padding: 30, color: "#6b7280" }}>
              No subjects found.
            </div>
          }
        </div>
      </Card>

      <Modal show={modal === "form"} title={editing ? "✏️ Edit Subject" : "➕ Add New Subject"}
        onClose={() => setModal(null)}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Input label="Subject Code *" placeholder="e.g. CS101"
            value={form.id} onChange={e => setForm(f => ({ ...f, id: e.target.value.toUpperCase() }))}
            disabled={!!editing} />
          <Input label="Units" type="number" min={1} max={6}
            value={form.units} onChange={e => setForm(f => ({ ...f, units: e.target.value }))} />
        </div>
        <Input label="Subject Name *" placeholder="e.g. Introduction to Programming"
          value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
        <Input label="Professor" placeholder="e.g. Prof. Santos"
          value={form.professor} onChange={e => setForm(f => ({ ...f, professor: e.target.value }))} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Input label="Schedule" placeholder="MWF 8:00-9:00 AM"
            value={form.schedule} onChange={e => setForm(f => ({ ...f, schedule: e.target.value }))} />
          <Input label="Room" placeholder="Room 101"
            value={form.room} onChange={e => setForm(f => ({ ...f, room: e.target.value }))} />
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
          <Btn variant="primary" onClick={handleSave} style={{ flex: 1 }}>
            {editing ? "💾 Save Changes" : "✅ Add Subject"}
          </Btn>
          <Btn variant="ghost" onClick={() => setModal(null)}>Cancel</Btn>
        </div>
      </Modal>

      <Modal show={!!deleteConfirm} title="🗑️ Confirm Delete"
        onClose={() => setDeleteConfirm(null)} width={380}>
        <p style={{ fontSize: 14, color: "#374151", marginBottom: 20 }}>
          Remove <strong>{subjects.find(s => s.id === deleteConfirm)?.name}</strong>?
        </p>
        <div style={{ display: "flex", gap: 10 }}>
          <Btn variant="danger" onClick={async () => {
            try {
              setBusy(true);
              await api(`/subjects/${deleteConfirm}`, { method: "DELETE" }, token);
              const fresh = await api("/subjects", {}, token);
              setSubjects(fresh);
              setDeleteConfirm(null);
              flash("✅ Subject removed.");
            } catch (e) {
              alert(e.message);
            } finally {
              setBusy(false);
            }
          }} style={{ flex: 1 }} disabled={busy}>Yes, Remove</Btn>
          <Btn variant="ghost" onClick={() => setDeleteConfirm(null)}>Cancel</Btn>
        </div>
      </Modal>
    </div>
  );
}

function StudentManagement({ token, students, allSubjects, grades, setGrades }) {
  const [selectedStudent, setSelectedStudent] = useState("");
  const [assigned, setAssigned] = useState([]);
  const [searchStu, setSearchStu] = useState("");
  const [msg, setMsg] = useState("");
  const [editSubject, setEditSubject] = useState(null);
  const [editForm, setEditForm] = useState({ name: "", units: 3, professor: "", schedule: "", room: "" });
  const [assignId, setAssignId] = useState("");

  const flash = (m) => { setMsg(m); setTimeout(() => setMsg(""), 2500); };

  useEffect(() => {
    if (!selectedStudent) return;
    const load = async () => {
      try {
        const rows = await api(`/students/${encodeURIComponent(selectedStudent)}/subjects`, {}, token);
        setAssigned(rows);
      } catch { setAssigned([]); }
    };
    load();
  }, [selectedStudent, token]);

  const filteredStudents = students.filter(s =>
    s.id.toLowerCase().includes(searchStu.toLowerCase()) ||
    s.name.toLowerCase().includes(searchStu.toLowerCase())
  );
  const assignedIds = new Set(assigned.map(s => s.id));
  const available = allSubjects.filter(s => !assignedIds.has(s.id));

  const assignSubject = async () => {
    if (!selectedStudent || !assignId) return;
    try {
      await api("/grades", { method: "POST", body: {
        student_id: selectedStudent, subject_id: assignId
      } }, token);
      const rows = await api(`/students/${encodeURIComponent(selectedStudent)}/subjects`, {}, token);
      setAssigned(rows);
      const allRows = await api("/grades", {}, token);
      const map = allRows.reduce((acc, r) => {
        if (!acc[r.student_id]) acc[r.student_id] = {};
        acc[r.student_id][r.subject_id] = { prelim: r.prelim, midterm: r.midterm, prefinal: r.prefinal, final: r.final };
        return acc;
      }, {});
      setGrades(map);
      setAssignId("");
      flash("✅ Subject assigned to student.");
    } catch (e) { alert(e.message); }
  };

  const removeSubject = async (sid) => {
    try {
      await api(`/grades/${encodeURIComponent(selectedStudent)}/${encodeURIComponent(sid)}`, { method: "DELETE" }, token);
      const rows = await api(`/students/${encodeURIComponent(selectedStudent)}/subjects`, {}, token);
      setAssigned(rows);
      flash("🗑️ Subject removed from student.");
    } catch (e) { alert(e.message); }
  };

  const openEdit = (s) => {
    setEditSubject(s);
    setEditForm({
      name: s.name || "",
      units: s.units || 3,
      professor: s.professor || "",
      schedule: s.schedule || "",
      room: s.room || ""
    });
  };
  const saveEdit = async () => {
    try {
      const payload = {
        name: String(editForm.name || "").trim(),
        units: Number(editForm.units),
        professor: String(editForm.professor || "").trim(),
        schedule: String(editForm.schedule || "").trim(),
        room: String(editForm.room || "").trim()
      };
      if (!payload.name || !Number.isInteger(payload.units) || payload.units < 1) return alert("Fill required fields correctly.");
      await api(`/subjects/${encodeURIComponent(editSubject.id)}`, { method: "PUT", body: payload }, token);
      const rows = await api(`/students/${encodeURIComponent(selectedStudent)}/subjects`, {}, token);
      setAssigned(rows);
      setEditSubject(null);
      flash("💾 Subject details updated.");
    } catch (e) { alert(e.message); }
  };

  return (
    <div>
      <PageHeader title="🧭 Student Management" sub="Assign, update, and remove student subjects" />
      {msg && <div style={{ background: "#eef2ff", border: "1px solid #c7d2fe", color: "#3730a3", borderRadius: 8, padding: "10px 16px", marginBottom: 12, fontSize: 13, fontWeight: 600 }}>{msg}</div>}
      <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 18 }}>
        <Card title="Select Student">
          <input placeholder="🔍 Search..." value={searchStu} onChange={e => setSearchStu(e.target.value)}
            style={{ width: "100%", padding: "8px 11px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 12, outline: "none", marginBottom: 10 }} />
          <div style={{ maxHeight: 420, overflowY: "auto" }}>
            {filteredStudents.map(s => (
              <div key={s.id} onClick={() => setSelectedStudent(s.id)} style={{
                padding: "10px 12px", borderRadius: 8, cursor: "pointer", marginBottom: 4,
                background: selectedStudent === s.id ? "#eff6ff" : "#f9fafb",
                border: `1.5px solid ${selectedStudent === s.id ? "#2563eb" : "transparent"}`,
                transition: "all 0.15s",
              }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: "#111827" }}>{s.name}</div>
                <div style={{ fontSize: 11, color: "#6b7280" }}>{s.id} · {s.course}</div>
              </div>
            ))}
          </div>
        </Card>
        <div>
          {!selectedStudent ? (
            <Card><div style={{ textAlign: "center", padding: "40px 0", color: "#6b7280" }}>Select a student to begin.</div></Card>
          ) : (
            <>
              <Card title="Assign Subjects">
                <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 10 }}>
                  <Select label="Assign Subject" value={assignId} onChange={e => setAssignId(e.target.value)}>
                    <option value="">— Select —</option>
                    {available.map(s => <option key={s.id} value={s.id}>{s.id} · {s.name}</option>)}
                  </Select>
                  <div>
                    <Btn variant="primary" onClick={assignSubject} disabled={!assignId}>+ Assign</Btn>
                  </div>
                </div>
              </Card>
              <Card title={`Subjects Assigned (${assigned.length})`}>
                {assigned.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "20px 0", color: "#6b7280" }}>No subjects for selected filters.</div>
                ) : (
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr><Th>Code</Th><Th>Name</Th><Th>Units</Th><Th>Professor</Th><Th>Schedule</Th><Th>Room</Th><Th>Actions</Th></tr>
                    </thead>
                    <tbody>
                      {assigned.map(s => (
                        <tr key={s.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                          <Td><code>{s.id}</code></Td>
                          <Td><strong>{s.name}</strong></Td>
                          <Td>{s.units}</Td>
                          <Td>{s.professor || "-"}</Td>
                          <Td>{s.schedule || "-"}</Td>
                          <Td>{s.room || "-"}</Td>
                          <Td>
                            <div style={{ display: "flex", gap: 6 }}>
                              <Btn variant="outline" onClick={() => openEdit(s)} style={{ fontSize: 11, padding: "4px 8px" }}>✏️ Edit</Btn>
                              <Btn variant="danger" onClick={() => removeSubject(s.id)} style={{ fontSize: 11, padding: "4px 8px" }}>🗑️ Remove</Btn>
                            </div>
                          </Td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </Card>
            </>
          )}
        </div>
      </div>

      <Modal show={!!editSubject} title={`Edit Subject · ${editSubject?.id || ""}`} onClose={() => setEditSubject(null)} width={520}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Input label="Name" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
          <Input label="Units" type="number" value={editForm.units} onChange={e => setEditForm({ ...editForm, units: e.target.value })} />
          <Input label="Professor" value={editForm.professor} onChange={e => setEditForm({ ...editForm, professor: e.target.value })} />
          <Input label="Schedule" value={editForm.schedule} onChange={e => setEditForm({ ...editForm, schedule: e.target.value })} />
          <Input label="Room" value={editForm.room} onChange={e => setEditForm({ ...editForm, room: e.target.value })} />
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
          <Btn variant="primary" onClick={saveEdit} style={{ flex: 1 }}>💾 Save</Btn>
          <Btn variant="ghost" onClick={() => setEditSubject(null)} style={{ flex: 1 }}>Cancel</Btn>
        </div>
      </Modal>
    </div>
  );
}

function Grades({ students, subjects, grades, setGrades, token, role, studentIdFromAuth }) {
  const [selectedStudent, setSelectedStudent] = useState("");
  const [modal, setModal] = useState(null);
  const [editingSubj, setEditingSubj] = useState(null);
  const [form, setForm] = useState({ subjectId: "", prelim: "", midterm: "", prefinal: "", final: "" });
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [msg, setMsg] = useState("");
  const [searchStu, setSearchStu] = useState("");
  const [semesters, setSemesters] = useState([]);
  const [semesterId, setSemesterId] = useState("");

  useEffect(() => {
    if (role === "student") {
      api("/semesters", {}, token).then(setSemesters).catch(() => {});
    }
  }, [role, token]);

  const flash = m => { setMsg(m); setTimeout(() => setMsg(""), 2500); };

  useEffect(() => {
    if (role === "student" && students.length > 0) {
      setSelectedStudent(students[0].id);
    }
  }, [role, students]);
  useEffect(() => {
    if (role === "student" && !selectedStudent && studentIdFromAuth) {
      setSelectedStudent(studentIdFromAuth);
    }
  }, [role, selectedStudent, studentIdFromAuth]);

  const student = students.find(s => s.id === selectedStudent) || (role === "student" && selectedStudent ? { id: selectedStudent, name: selectedStudent, course: "" } : null);
  const studentGrades = selectedStudent ? (grades[selectedStudent] || {}) : {};
  const enrolledSubjects = role === "student"
    ? Object.keys(studentGrades).map(id => subjects.find(s => s.id === id) || ({ id, name: id }))
    : subjects.filter(s => studentGrades[s.id]).filter(s => (semesterId ? String(s.semester_id || "") === String(semesterId) : true));
  const availableSubjects = subjects.filter(s => !studentGrades[s.id]);

  const filteredStudents = students.filter(s =>
    s.id.toLowerCase().includes(searchStu.toLowerCase()) ||
    s.name.toLowerCase().includes(searchStu.toLowerCase())
  );

  const handleSave = async () => {
    const { subjectId, prelim, midterm, prefinal, final: fin } = form;
    if (!subjectId) return alert("Select a subject.");
    const nums = [prelim, midterm, prefinal, fin].map(Number);
    try {
      if (!editingSubj) {
        await api("/grades", { method: "POST", body: {
          student_id: selectedStudent, subject_id: subjectId,
          prelim: nums[0], midterm: nums[1], prefinal: nums[2], final: nums[3]
        } }, token);
      } else {
        await api(`/grades/${selectedStudent}/${subjectId}`, { method: "PUT", body: {
          prelim: nums[0], midterm: nums[1], prefinal: nums[2], final: nums[3]
        } }, token);
      }
      const allRows = await api("/grades", {}, token);
      const map = allRows.reduce((acc, r) => {
        if (!acc[r.student_id]) acc[r.student_id] = {};
        acc[r.student_id][r.subject_id] = { prelim: r.prelim, midterm: r.midterm, prefinal: r.prefinal, final: r.final };
        return acc;
      }, {});
      setGrades(map);
      setModal(null);
      flash("✅ Grade record saved.");
    } catch (e) {
      alert(e.message);
    }
  };

  const gpa = useMemo(() => {
    if (!student) return null;
    const entries = enrolledSubjects.map(s => studentGrades[s.id]).map(g => computeGrade(g)).filter(v => v !== null);
    if (entries.length === 0) return null;
    return (entries.reduce((a, b) => a + b, 0) / entries.length).toFixed(2);
  }, [student, studentGrades, enrolledSubjects]);

  return (
    <div>
      <PageHeader title="📝 Grades & Performance" sub={role === "student" ? "View your academic performance" : "Select a student to manage their subject grades"} />
      {msg && <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, padding: "10px 16px", marginBottom: 14, color: "#15803d", fontWeight: 600, fontSize: 13 }}>{msg}</div>}

      <div style={{ display: "grid", gridTemplateColumns: role !== "student" ? "260px 1fr" : "1fr", gap: 18 }}>
        {role !== "student" && (
          <Card title="Select Student">
            <input placeholder="🔍 Search..." value={searchStu} onChange={e => setSearchStu(e.target.value)}
              style={{ width: "100%", padding: "8px 11px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 12, outline: "none", marginBottom: 10 }} />
            <div style={{ maxHeight: 400, overflowY: "auto" }}>
              {filteredStudents.map(s => (
                <div key={s.id} onClick={() => setSelectedStudent(s.id)} style={{
                  padding: "10px 12px", borderRadius: 8, cursor: "pointer", marginBottom: 4,
                  background: selectedStudent === s.id ? "#eff6ff" : "#f9fafb",
                  border: `1.5px solid ${selectedStudent === s.id ? "#2563eb" : "transparent"}`,
                  transition: "all 0.15s",
                }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: "#111827" }}>{s.name}</div>
                  <div style={{ fontSize: 11, color: "#6b7280" }}>{s.id} · {s.course}</div>
                </div>
              ))}
            </div>
          </Card>
        )}

        <div>
          {!student ? (
            <Card><div style={{ textAlign: "center", padding: "40px 0", color: "#6b7280" }}>Select a student to begin.</div></Card>
          ) : (
            <>
              {role === "student" && (
                <Card title="Filters">
                  <div>
                    <Select label="Semester" value={semesterId} onChange={e => setSemesterId(e.target.value)}>
                      <option value="">All Semesters</option>
                      {semesters.map(s => <option key={s.id} value={s.id}>{s.school_year} · {s.term}</option>)}
                    </Select>
                  </div>
                </Card>
              )}
              <div style={{ background: "linear-gradient(135deg,#0f2340,#1e3a5f)", color: "white", borderRadius: 11, padding: "16px 20px", marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 17 }}>{student.name}</div>
                  <div style={{ fontSize: 12, opacity: 0.7 }}>{student.id} · {student.course}</div>
                </div>
                <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
                  {gpa && (
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 10, opacity: 0.6 }}>GWA</div>
                      <div style={{ fontSize: 22, fontWeight: 900 }}>{toGPA(parseFloat(gpa))}</div>
                    </div>
                  )}
                  {role !== "student" && (
                    <Btn variant="success" onClick={() => {
                        if (availableSubjects.length === 0) return;
                        setForm({ subjectId: availableSubjects[0].id, prelim: "", midterm: "", prefinal: "", final: "" });
                        setEditingSubj(null); setModal("form");
                    }} disabled={availableSubjects.length === 0}>+ Add Grade</Btn>
                  )}
                </div>
              </div>

              <Card title={`Grade Records (${enrolledSubjects.length})`}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr>{["Code","Subject","Prelim","Midterm","Pre-Final","Final","Average","GPA","Remarks", ...(role !== "student" ? ["Actions"] : [])].map(h => <Th key={h}>{h}</Th>)}</tr>
                  </thead>
                  <tbody>
                    {enrolledSubjects.map(subj => {
                      const g = studentGrades[subj.id];
                      const avg = computeGrade(g);
                      return (
                        <tr key={subj.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                          <Td>{subj.id}</Td>
                          <Td><strong>{subj.name}</strong></Td>
                          <Td><GradeCell val={g.prelim} /></Td>
                          <Td><GradeCell val={g.midterm} /></Td>
                          <Td><GradeCell val={g.prefinal} /></Td>
                          <Td><GradeCell val={g.final} /></Td>
                          <Td><strong>{avg}%</strong></Td>
                          <Td><strong>{toGPA(avg)}</strong></Td>
                          <Td><Badge text={avg >= 75 ? "PASSED" : "FAILED"} type={avg >= 75 ? "green" : "red"} /></Td>
                          {role !== "student" && (
                            <Td>
                              <div style={{ display: "flex", gap: 5 }}>
                                <Btn variant="outline" onClick={() => {
                                    setForm({ subjectId: subj.id, prelim: g.prelim, midterm: g.midterm, prefinal: g.prefinal, final: g.final });
                                    setEditingSubj(subj.id); setModal("form");
                                }} style={{ fontSize: 10, padding: "3px 8px" }}>✏️</Btn>
                                <Btn variant="danger" onClick={() => setDeleteConfirm(subj.id)} style={{ fontSize: 10, padding: "3px 8px" }}>🗑️</Btn>
                              </div>
                            </Td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </Card>
            </>
          )}
        </div>
      </div>

      <Modal show={modal === "form"} title={editingSubj ? "Update Grade" : "Add Subject Grade"} onClose={() => setModal(null)}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 10 }}>
          <Select label="Subject" value={form.subjectId} onChange={e => setForm({...form, subjectId: e.target.value})} disabled={!!editingSubj}>
            {editingSubj ? (
              <option value={editingSubj}>{subjects.find(s => s.id === editingSubj)?.name}</option>
            ) : availableSubjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Input label="Prelim" type="number" value={form.prelim} onChange={e => setForm({...form, prelim: e.target.value})} />
            <Input label="Midterm" type="number" value={form.midterm} onChange={e => setForm({...form, midterm: e.target.value})} />
            <Input label="Pre-Final" type="number" value={form.prefinal} onChange={e => setForm({...form, prefinal: e.target.value})} />
            <Input label="Final" type="number" value={form.final} onChange={e => setForm({...form, final: e.target.value})} />
          </div>
          <Btn variant="primary" onClick={handleSave} style={{ width: "100%", marginTop: 10 }}>Save Grade</Btn>
        </div>
      </Modal>

      <Modal show={!!deleteConfirm} title="Confirm Delete" onClose={() => setDeleteConfirm(null)} width={400}>
        <div style={{ fontSize: 14, marginBottom: 14 }}>Are you sure you want to remove this grade record?</div>
        <div style={{ display: "flex", gap: 10 }}>
          <Btn variant="danger" onClick={async () => {
              try {
                await api(`/grades/${selectedStudent}/${deleteConfirm}`, { method: "DELETE" }, token);
                const allRows = await api("/grades", {}, token);
                const map = allRows.reduce((acc, r) => {
                  if (!acc[r.student_id]) acc[r.student_id] = {};
                  acc[r.student_id][r.subject_id] = { prelim: r.prelim, midterm: r.midterm, prefinal: r.prefinal, final: r.final };
                  return acc;
                }, {});
                setGrades(map);
                setDeleteConfirm(null);
                flash("🗑️ Grade record removed.");
              } catch (e) {
                alert(e.message);
              }
          }} style={{ flex: 1 }}>Yes, Delete</Btn>
          <Btn variant="ghost" onClick={() => setDeleteConfirm(null)} style={{ flex: 1 }}>Cancel</Btn>
        </div>
      </Modal>
    </div>
  );
}

function AuthScreen({ onAuthed }) {
  const [u, setU] = useState("");
  const [p, setP] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true); setMsg("");
    try {
      const r = await api("/auth/login", { method: "POST", body: { username: u, password: p } });
      onAuthed({ token: r.token, role: r.role, username: r.username, student_id: r.student_id || null });
    } catch (e) {
      setMsg(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "grid", placeItems: "center", minHeight: "100vh", background: "#0f2340" }}>
      <div style={{ width: 380, background: "white", padding: 24, borderRadius: 12, boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
        <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 8, color: "#111827" }}>Login</div>
        <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 10 }}>
          Choose your account type: Student, Teacher/Instructor, SAPS (Permit Checker), Register, or Cashier.
        </div>
        <Input label="Username" value={u} onChange={e => setU(e.target.value)} />
        <Input label="Password" type="password" value={p} onChange={e => setP(e.target.value)} />
        <Btn variant="primary" onClick={submit} disabled={loading || !u || !p} style={{ width: "100%" }}>
          Login
        </Btn>
        {msg && <div style={{ marginTop: 10, fontSize: 12, color: "#dc2626" }}>{msg}</div>}
        <div style={{ marginTop: 12, fontSize: 12, color: "#6b7280" }}>
          Accounts are provisioned by a Developer or Owner. Students can only access their own dashboard and grades.
        </div>
      </div>
    </div>
  );
}

function UsersAdmin({ token }) {
  const [list, setList] = useState([]);
  const [u, setU] = useState("");
  const [p, setP] = useState("");
  const [r, setR] = useState("teacher");
  const [ut, setUT] = useState("teacher");
  const [studentIdLink, setStudentIdLink] = useState("");
  const [msg, setMsg] = useState("");
  const [edit, setEdit] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);
  const [hardDel, setHardDel] = useState(false);
  const [busy, setBusy] = useState(false);
  const load = async () => {
    try {
      const users = await api("/users", {}, token);
      setList(users);
    } catch (e) {
      setMsg(e.message);
    }
  };
  useEffect(() => { load(); }, []);
  const createUser = async () => {
    try {
      setBusy(true);
      if (!u || !p) throw new Error("Missing username or password");
      const body = { username: u, password: p, role: r, user_type: ut };
      if (r === "student" && studentIdLink.trim()) body.student_id = studentIdLink.trim();
      await api("/users", { method: "POST", body }, token);
      setU(""); setP(""); setR("teacher"); setUT("teacher"); setStudentIdLink(""); setMsg("User created");
      load();
    } catch (e) {
      setMsg(e.message);
    } finally {
      setBusy(false);
    }
  };
  const openEdit = (user) => {
    setEdit({ id: user.id, username: user.username, role: user.role, user_type: user.user_type || user.role, password: "" });
  };
  const saveEdit = async () => {
    try {
      setBusy(true);
      if (!edit.username) throw new Error("Username required");
      const body = { username: edit.username, role: edit.role, user_type: edit.user_type };
      if (edit.password) body.password = edit.password;
      await api(`/users/${edit.id}`, { method: "PUT", body }, token);
      setMsg("User updated");
      setEdit(null);
      load();
    } catch (e) {
      setMsg(e.message);
    } finally {
      setBusy(false);
    }
  };
  const doDelete = async () => {
    try {
      setBusy(true);
      const user = list.find(x => x.id === confirmDel);
      const qs = hardDel ? `?hard=1&username=${encodeURIComponent(user?.username || "")}` : `?username=${encodeURIComponent(user?.username || "")}`;
      const path = `/users/${confirmDel}${qs}`;
      await api(path, { method: "DELETE", body: { username: user?.username } }, token);
      setMsg("User deleted");
      setConfirmDel(null);
      setHardDel(false);
      load();
    } catch (e) {
      setMsg(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div>
      <PageHeader title="🛠️ User Management" sub="Create teacher and student accounts" />
      {msg && <div style={{ background: "#eef2ff", border: "1px solid #c7d2fe", color: "#3730a3", borderRadius: 8, padding: "10px 16px", marginBottom: 12, fontSize: 13, fontWeight: 600 }}>{msg}</div>}
      <Card title="Create User">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr auto", gap: 10 }}>
          <Input label="Username" value={u} onChange={e => setU(e.target.value)} />
          <Input label="Password" type="password" value={p} onChange={e => setP(e.target.value)} />
          <Select label="Role" value={r} onChange={e => setR(e.target.value)}>
            <option value="teacher">teacher</option>
            <option value="student">student</option>
            <option value="developer">developer</option>
            <option value="saps">saps</option>
            <option value="register">register</option>
            <option value="cashier">cashier</option>
          </Select>
          <Select label="User Type" value={ut} onChange={e => setUT(e.target.value)}>
            <option value="teacher">teacher</option>
            <option value="student">student</option>
            <option value="developer">developer</option>
            <option value="saps">saps</option>
            <option value="register">register</option>
            <option value="cashier">cashier</option>
          </Select>
          <Input label="Student ID Link" value={studentIdLink} onChange={e => setStudentIdLink(e.target.value)} />
          <Btn variant="primary" onClick={createUser} disabled={!u || !p || busy}>Create</Btn>
        </div>
      </Card>
      <Card title="Users">
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead><tr><Th>Username</Th><Th>Role</Th><Th>User Type</Th><Th>Created</Th><Th>Actions</Th></tr></thead>
          <tbody>
            {list.map(x => (
              <tr key={x.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                <Td>{x.username}</Td>
                <Td><Badge text={x.role} type={x.role === "teacher" ? "blue" : x.role === "developer" ? "yellow" : "green"} /></Td>
                <Td>{x.user_type || "-"}</Td>
                <Td style={{ color: "#6b7280", fontSize: 12 }}>{x.created_at}</Td>
                <Td>
                  <div style={{ display: "flex", gap: 6 }}>
                    <Btn variant="outline" onClick={() => openEdit(x)} style={{ fontSize: 11, padding: "4px 10px" }}>Edit</Btn>
                    <Btn variant="danger" onClick={() => setConfirmDel(x.id)} style={{ fontSize: 11, padding: "4px 10px" }}>Delete</Btn>
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <Modal show={!!edit} title="Edit User" onClose={() => setEdit(null)}>
        {edit && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Input label="Username" value={edit.username} onChange={e => setEdit(s => ({ ...s, username: e.target.value }))} />
            <Input label="New Password" type="password" value={edit.password} onChange={e => setEdit(s => ({ ...s, password: e.target.value }))} />
            <Select label="Role" value={edit.role} onChange={e => setEdit(s => ({ ...s, role: e.target.value }))}>
              <option value="teacher">teacher</option>
              <option value="student">student</option>
              <option value="developer">developer</option>
              <option value="saps">saps</option>
              <option value="register">register</option>
              <option value="cashier">cashier</option>
            </Select>
            <Select label="User Type" value={edit.user_type} onChange={e => setEdit(s => ({ ...s, user_type: e.target.value }))}>
              <option value="teacher">teacher</option>
              <option value="student">student</option>
              <option value="developer">developer</option>
              <option value="saps">saps</option>
              <option value="register">register</option>
              <option value="cashier">cashier</option>
            </Select>
            <div style={{ gridColumn: "1/-1", display: "flex", gap: 10 }}>
              <Btn variant="primary" onClick={saveEdit} style={{ flex: 1 }} disabled={busy}>Save</Btn>
              <Btn variant="ghost" onClick={() => setEdit(null)} style={{ flex: 1 }}>Cancel</Btn>
            </div>
          </div>
        )}
      </Modal>
      <Modal show={!!confirmDel} title="Confirm Delete" onClose={() => setConfirmDel(null)} width={420}>
        <div style={{ fontSize: 14, marginBottom: 14 }}>
          Delete this user? Default is soft delete (disable). Enable "Hard delete" to permanently remove.
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, fontSize: 13 }}>
          <input type="checkbox" checked={hardDel} onChange={e => setHardDel(e.target.checked)} />
          Hard delete (permanent)
        </label>
        <div style={{ display: "flex", gap: 10 }}>
          <Btn variant="danger" onClick={doDelete} style={{ flex: 1 }}>Yes, Delete</Btn>
          <Btn variant="ghost" onClick={() => setConfirmDel(null)} style={{ flex: 1 }}>Cancel</Btn>
        </div>
      </Modal>
    </div>
  );
}
