import { useState, useMemo, useEffect, useCallback } from "react";

/*
const INITIAL_STUDENTS = [
  { id: "2024-0001", name: "Maria Cruz",     course: "BSCS", year: "1st Year", email: "maria.cruz@edu.ph",    status: "Active" },
  { id: "2023-0045", name: "Jose Rizal",     course: "BSIT", year: "2nd Year", email: "jose.rizal@edu.ph",    status: "Active" },
  { id: "2023-0067", name: "Ana Gomez",      course: "BSIS", year: "2nd Year", email: "ana.gomez@edu.ph",     status: "Active" },
  { id: "2024-0012", name: "Juan dela Cruz", course: "BSCS", year: "1st Year", email: "juan.delacruz@edu.ph", status: "At Risk" },
  { id: "2022-0023", name: "Luisa Diaz",     course: "BSCS", year: "3rd Year", email: "luisa.diaz@edu.ph",    status: "Active" },
  { id: "2023-0089", name: "Pedro Santos",   course: "BSIT", year: "2nd Year", email: "pedro.santos@edu.ph",  status: "At Risk" },
];
*/

/*
const INITIAL_SUBJECTS = [
  { id: "CS101",   name: "Introduction to Programming",    units: 3, professor: "Prof. Santos", schedule: "MWF 8:00-9:00 AM",   room: "Room 101", campus: "main campus" },
  { id: "MATH201", name: "Calculus & Analytical Geometry", units: 3, professor: "Prof. Reyes",  schedule: "TTH 10:00-11:30 AM", room: "Room 205", campus: "main campus" },
  { id: "ENG102",  name: "Technical Communication",        units: 3, professor: "Prof. Garcia", schedule: "MWF 1:00-2:00 PM",   room: "Room 302", campus: "annex 1" },
  { id: "CS201",   name: "Data Structures & Algorithms",   units: 3, professor: "Prof. Lim",    schedule: "TTH 1:00-2:30 PM",   room: "Room 104", campus: "main campus" },
  { id: "PHY101",  name: "Physics for Engineers",          units: 3, professor: "Prof. Torres", schedule: "MWF 3:00-4:00 PM",   room: "Room 201", campus: "annex 2" },
  { id: "IT301",   name: "Database Management Systems",    units: 3, professor: "Prof. Aquino", schedule: "TTH 3:00-4:30 PM",   room: "Room 206", campus: "main campus" },
];
*/

/*
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
*/

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
  if (avg >= 85) return "#4ade80"; // Bright green
  if (avg >= 75) return "#60a5fa"; // Bright blue
  if (avg >= 70) return "#fbbf24"; // Bright amber
  return "#f87171"; // Bright red
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
            <div style={{ width: 60, height: 60, background: "#0f172a", border: "1px solid var(--border-color)", borderRadius: 10,
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
    green:  { bg: "rgba(74, 222, 128, 0.15)", color: "#4ade80", border: "rgba(74, 222, 128, 0.3)" },
    blue:   { bg: "rgba(68, 215, 255, 0.15)", color: "#44d7ff", border: "rgba(68, 215, 255, 0.3)" },
    red:    { bg: "rgba(248, 113, 113, 0.15)", color: "#f87171", border: "rgba(248, 113, 113, 0.3)" },
    yellow: { bg: "rgba(251, 191, 36, 0.15)", color: "#fbbf24", border: "rgba(251, 191, 36, 0.3)" },
    gray:   { bg: "rgba(148, 163, 184, 0.15)", color: "#94a3b8", border: "rgba(148, 163, 184, 0.3)" },
  };
  const c = colors[type] || colors.gray;
  return (
    <span style={{ background: c.bg, color: c.color, padding: "2px 10px", borderRadius: 20,
      fontSize: 11, fontWeight: 700, whiteSpace: "nowrap", border: `1px solid ${c.border}` }}>
      {text}
    </span>
  );
};

const Modal = ({ show, title, onClose, children, width = 500 }) => {
  if (!show) return null;
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(4, 11, 22, 0.8)", backdropFilter: "blur(8px)",
      zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div onClick={e => e.stopPropagation()} className="glass-card" style={{ 
        padding: 28, width, maxWidth: "95vw", boxShadow: "0 20px 50px rgba(0,0,0,0.5)",
        maxHeight: "90vh", display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: "var(--neon-blue)" }} className="glow-text">{title}</div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20,
            cursor: "pointer", color: "var(--text-dim)" }}>✕</button>
        </div>
        <div style={{ overflowY: "auto", flex: 1 }}>{children}</div>
      </div>
    </div>
  );
};

const Input = ({ label, ...props }) => (
  <div style={{ marginBottom: 16 }}>
    {label && <label style={{ display: "block", fontSize: 13, fontWeight: 600,
      color: "var(--text-dim)", marginBottom: 6 }}>{label}</label>}
    <input {...props} style={{ width: "100%", padding: "12px 16px", border: "1px solid var(--border-color)",
      borderRadius: 10, fontSize: 14, outline: "none", background: "#0f172a", color: "#ffffff", transition: "all 0.2s", ...props.style }} />
  </div>
);
const Select = ({ label, children, ...props }) => (
  <div style={{ marginBottom: 16 }}>
    {label && <label htmlFor={props.id} style={{ display: "block", fontSize: 13, fontWeight: 600,
      color: "var(--text-dim)", marginBottom: 6 }}>{label}</label>}
    <select {...props} style={{ width: "100%", padding: "12px 16px", border: "1.5px solid var(--border-color)",
      borderRadius: 10, fontSize: 14, outline: "none", background: "#0f172a", boxSizing: "border-box",
      color: "#ffffff", cursor: "pointer", transition: "all 0.2s", ...props.style }}>
      {children}
    </select>
  </div>
);

const Btn = ({ children, variant = "primary", onClick, style = {}, disabled }) => {
  const styles = {
    primary: { background: "var(--accent-gradient)", color: "white", border: "none" },
    success: { background: "#10b981", color: "white", border: "none" },
    danger:  { background: "#ef4444", color: "white", border: "none" },
    outline: { background: "transparent", color: "var(--neon-blue)", border: "1px solid var(--neon-blue)" },
    ghost:   { background: "rgba(148, 163, 184, 0.1)", color: "var(--text-dim)", border: "none" },
  };
  return (
    <button onClick={onClick} disabled={disabled} style={{ padding: "10px 20px", borderRadius: 10,
      cursor: disabled ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 600,
      display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: disabled ? 0.5 : 1,
      transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)", boxShadow: (variant === "primary") ? "0 4px 15px rgba(68, 215, 255, 0.3)" : "none",
      ...styles[variant], ...style }}
      onMouseEnter={e => { if(!disabled) e.currentTarget.style.filter = 'brightness(1.1)'; }}
      onMouseLeave={e => { if(!disabled) e.currentTarget.style.filter = 'none'; }}>
      {children}
    </button>
  );
};

function PageHeader({ title, sub }) {
  return (
    <div style={{ marginBottom: 32 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--neon-blue)", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 4 }}>
        ADMIN DASHBOARD | STUDENT PORTAL
      </div>
      <h1 className="glow-text" style={{ fontSize: 32, fontWeight: 800, color: "white", letterSpacing: "-0.02em", margin: "0 0 8px 0" }}>{title}</h1>
      {sub && <p style={{ fontSize: 15, color: "var(--text-dim)", margin: 0, fontWeight: 400 }}>{sub}</p>}
    </div>
  );
}

function Card({ title, action, children, variant = "default" }) {
  return (
    <div className="glass-card" style={{ 
      padding: 24, marginBottom: 24,
      ...(variant === "active" ? { border: "1px solid var(--neon-blue)", boxShadow: "var(--neon-glow)" } : {})
    }}>
      {(title || action) && (
        <div style={{ display: "flex", alignItems: "center",
          justifyContent: "space-between", marginBottom: 20 }}>
          {title && <div style={{ fontSize: 16, fontWeight: 700, color: "var(--neon-blue)" }} className="glow-text">{title}</div>}
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

const Th = ({ children }) => (
  <th style={{ background: "#0f172a", color: "var(--neon-blue)", fontWeight: 700, textAlign: "left",
    padding: "16px", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em",
    borderBottom: "1px solid var(--border-color)" }}>{children}</th>
);
const Td = ({ children, style }) => (
  <td style={{ padding: "16px", fontSize: 14, verticalAlign: "middle", borderBottom: "1px solid rgba(255,255,255,0.05)", color: "var(--text-main)", ...style }}>{children}</td>
);
const GradeCell = ({ val }) => {
  const isNull = val === null || val === undefined || val === "";
  return (
    <span style={{ 
      fontWeight: 600, 
      color: isNull ? "var(--text-dim)" : gradeColor(val),
      background: isNull ? "rgba(148, 163, 184, 0.1)" : (val >= 75 ? "rgba(74, 222, 128, 0.1)" : "rgba(248, 113, 113, 0.1)"),
      padding: "4px 12px", borderRadius: 8, fontSize: 13, 
      border: `1px solid ${isNull ? "var(--border-color)" : gradeColor(val) + "33"}` 
    }}>
      {isNull ? "—" : val}
    </span>
  );
};

const API = process.env.REACT_APP_API_URL || "http://localhost:4000";

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
  const [page, setPage] = useState(() => {
    const parts = window.location.pathname.split("/").filter(Boolean);
    if (parts.length >= 2) return parts[1];
    return "dashboard";
  });
  const [students, setStudents] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [grades, setGrades] = useState({});
  const [gradesLoaded, setGradesLoaded] = useState(false); // eslint-disable-line no-unused-vars
  const [studentsError, setStudentsError] = useState(null); // eslint-disable-line no-unused-vars
  const [gradesError, setGradesError] = useState(null);
  const [subjectsError, setSubjectsError] = useState(null); // eslint-disable-line no-unused-vars
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
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const setAuthPersist = a => {
    setAuth(a);
    if (a) {
      localStorage.setItem("auth", JSON.stringify(a));
      // On login, move to dashboard URL
      window.history.pushState({ page: "dashboard" }, "", `/${encodeURIComponent(a.username)}/dashboard`);
      setPage("dashboard");
    } else {
      localStorage.removeItem("auth");
      window.history.pushState({}, "", "/");
    }
  };

  const navigate = (p) => {
    setPage(p);
    if (auth?.username) {
      window.history.pushState({ page: p }, "", `/${encodeURIComponent(auth.username)}/${p}`);
    }
  };

  useEffect(() => {
    const handlePop = (e) => {
      if (e.state && e.state.page) {
        setPage(e.state.page);
      } else {
        const parts = window.location.pathname.split("/").filter(Boolean);
        if (parts.length >= 2) setPage(parts[1]);
        else setPage("dashboard");
      }
    };
    window.addEventListener("popstate", handlePop);
    return () => window.removeEventListener("popstate", handlePop);
  }, []);

  useEffect(() => {
    let last = Date.now();
    const timeoutMs = 5 * 60 * 1000;
    let timer = setTimeout(() => {}, 0);
    const reset = () => {
      last = Date.now();
      clearTimeout(timer);
      timer = setTimeout(() => {
        const now = Date.now();
        if (auth && now - last >= timeoutMs) {
          setAuthPersist(null);
          alert("Session expired due to inactivity.");
        }
      }, timeoutMs + 1000);
    };
    const handler = () => reset();
    window.addEventListener("mousemove", handler);
    window.addEventListener("keydown", handler);
    reset();
    return () => {
      window.removeEventListener("mousemove", handler);
      window.removeEventListener("keydown", handler);
      clearTimeout(timer);
    };
  }, [auth]);

  const navItems = [
    { id: "dashboard", icon: "📊", label: "Dashboard" },
    ...((role === "register" || role === "cashier" || role === "saps" || role === "teacher" || role === "developer" || role === "owner")
       ? [{ id: "search",    icon: "🔍", label: "Student Search" }] : []),
    ...((role === "register" || role === "cashier" || role === "saps" || role === "teacher" || role === "developer" || role === "owner")
       ? [{ id: "students",  icon: "👤", label: "Students" }] : []),
    ...((role === "register" || role === "saps" || role === "developer" || role === "owner")
       ? [{ id: "studentmgmt", icon: "🧭", label: "Student Management" }] : []),
    ...((role === "student" || role === "register" || role === "saps" || role === "teacher" || role === "developer" || role === "owner")
       ? [{ id: "subjects",  icon: "📚", label: role === "student" ? "My Schedule" : "Subjects" }] : []),
    ...((role === "student" || role === "register" || role === "saps" || role === "teacher" || role === "developer" || role === "owner")
       ? [{ id: "grades",    icon: "📝", label: "Grades" }] : []),
    ...((role === "teacher" || role === "developer" || role === "owner")
       ? [{ id: "attendance", icon: "🗓️", label: "Attendance" }] : []),
    ...(role === "student" ? [{ id: "mypermits", icon: "🎫", label: "My Permits" }] : []),
    ...((role === "cashier" || role === "saps" || role === "teacher" || role === "developer" || role === "owner")
       ? [{ id: "permits", icon: "🎫", label: "Student Permits" }] : []),
    ...((role === "student" || role === "register" || role === "cashier" || role === "saps" || role === "developer" || role === "owner")
       ? [{ id: "payments", icon: "💳", label: "Payments" }] : []),
    ...(role === "student" ? [{ id: "profile", icon: "👤", label: "My Profile" }] : []),
    ...((role === "developer" || role === "owner")
       ? [{ id: "users",    icon: "👥", label: "Users Admin" }] : []),
    ...((role === "developer" || role === "owner")
       ? [{ id: "logs",     icon: "📜", label: "System Logs" }] : []),
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
    <div style={{ fontFamily: "'Outfit', 'Inter', sans-serif", background: "var(--bg-dark)",
      minHeight: "100vh", display: "flex", flexDirection: "column", color: "white" }}>
      {!auth && (
        <AuthScreen onAuthed={setAuthPersist} />
      )}
      
      {auth && (<div style={{ display: "flex", flex: 1, overflow: "hidden", position: "relative" }}>
        {/* Sidebar overlay for mobile */}
        {sidebarExpanded && <div className="mobile-only sidebar-overlay" onClick={() => setSidebarExpanded(false)} />}

        {/* Collapsible Sidebar */}
        <div className={`sidebar ${sidebarExpanded ? "open" : ""}`} style={{ width: sidebarExpanded ? 240 : 80, background: "rgba(4, 11, 22, 0.95)", color: "var(--text-dim)", flexShrink: 0,
          display: "flex", flexDirection: "column", overflowY: "auto", transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
          borderRight: "1px solid var(--border-color)", zIndex: 100, backdropFilter: "blur(10px)" }}>
          
          <div style={{ height: 80, display: "flex", alignItems: "center", justifyContent: sidebarExpanded ? "flex-start" : "center", 
            padding: sidebarExpanded ? "0 24px" : "0", borderBottom: "1px solid var(--border-color)" }}>
            <div className="neon-border" style={{ width: 44, height: 44, background: "rgba(68, 215, 255, 0.1)", borderRadius: "50%",
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, overflow: "hidden" }}>
              <img src={logo || "/yllanalogo.png"} alt="Logo" style={{ width: "95%", height: "95%", objectFit: "contain" }}
                onError={e => { e.currentTarget.style.display = "none"; e.currentTarget.parentElement.style.background = "rgba(68, 215, 255, 0.1)"; e.currentTarget.parentElement.textContent = "🎓"; }} />
            </div>
            {sidebarExpanded && (
              <div className="glow-text" style={{ marginLeft: 16, fontSize: 16, fontWeight: 800, letterSpacing: 0.5, color: "var(--neon-blue)",
                 whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden", lineHeight: 1.2 }}>
                STUDENT<br/><span style={{ fontSize: 13, opacity: 0.8 }}>DASHBOARD</span>
              </div>
            )}
          </div>

          <div style={{ padding: sidebarExpanded ? "24px 24px 12px" : "24px 0 12px", fontSize: 11, fontWeight: 800,
            textTransform: "uppercase", letterSpacing: 2, color: "rgba(255,255,255,0.2)", textAlign: sidebarExpanded ? "left" : "center" }}>
            {sidebarExpanded ? "App Drawer" : "•••"}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6, padding: sidebarExpanded ? "0 16px" : "0 12px" }}>
            {navItems.map(n => (
              <div key={n.id} onClick={() => navigate(n.id)} title={!sidebarExpanded ? n.label : ""} style={{
                display: "flex", alignItems: "center", justifyContent: sidebarExpanded ? "flex-start" : "center",
                padding: sidebarExpanded ? "12px 16px" : "14px 0", cursor: "pointer", fontSize: 14,
                borderRadius: 12,
                background: page === n.id ? "rgba(68, 215, 255, 0.15)" : "transparent",
                border: page === n.id ? "1px solid rgba(68, 215, 255, 0.3)" : "1px solid transparent",
                color: page === n.id ? "white" : "var(--text-dim)",
                fontWeight: page === n.id ? 700 : 500, transition: "all 0.3s ease",
              }}>
                <span className={page === n.id ? "glow-text" : ""} style={{ fontSize: 20, color: page === n.id ? "var(--neon-blue)" : "inherit" }}>{n.icon}</span>
                {sidebarExpanded && <span style={{ marginLeft: 16 }}>{n.label}</span>}
              </div>
            ))}
          </div>

          {page === "permits" && sidebarExpanded && (
            <div style={{ padding: "10px 12px" }}>
              <PermitsSidebar token={auth.token} onSelectSemester={sid => setPermitsSemester(sid)} selectedSemester={permitsSemester} />
            </div>
          )}
          <div style={{ marginTop: "auto", padding: "16px 24px 24px", borderTop: "1px solid var(--border-color)" }}>
             {sidebarExpanded && (
               <>
                 <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                   <div style={{ width: 40, height: 40, borderRadius: "50%", background: "var(--accent-gradient)", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, color: "white" }}>
                     {auth.full_name ? auth.full_name.slice(0, 2).toUpperCase() : auth.username.slice(0, 2).toUpperCase()}
                   </div>
                   <div style={{ overflow: "hidden" }}>
                     <div style={{ fontSize: 13, fontWeight: 700, color: "white", whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden" }}>
                       {auth.full_name || auth.username}
                     </div>
                     <div style={{ fontSize: 11, color: "var(--text-dim)", textTransform: "capitalize" }}>{role}</div>
                     <div style={{ fontSize: 10, color: "#10b981", display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
                       <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#10b981" }} /> Online
                     </div>
                   </div>
                 </div>
                 <div style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", textAlign: "center", borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: 8 }}>
                    Developer: <span style={{ color: "var(--neon-blue)", fontWeight: 700 }}>April Jay</span>
                 </div>
               </>
             )}
             {!sidebarExpanded && (
               <div style={{ textAlign: "center", fontSize: 10, color: "rgba(255,255,255,0.2)" }}>AJ</div>
             )}
           </div>
        </div>

        {/* Main Content Area */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: "var(--bg-dark)" }}>
          
          {/* Top Navbar */}
          <div style={{ height: 80, display: "flex", alignItems: "center",
            justifyContent: "space-between", padding: "0 16px", borderBottom: "1px solid var(--border-color)", zIndex: 5, backdropFilter: "blur(10px)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <button onClick={() => setSidebarExpanded(!sidebarExpanded)} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", 
                fontSize: 20, cursor: "pointer", color: "var(--text-dim)", width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 10 }}>
                ☰
              </button>
              <div className="desktop-only" style={{ position: "relative" }}>
                 <input placeholder="Search Projects, Data, Researchers..." style={{
                   background: "#0f172a", border: "1px solid var(--border-color)", borderRadius: 12,
                   padding: "10px 16px 10px 40px", width: 400, color: "white", outline: "none", fontSize: 13
                 }} />
                 <span style={{ position: "absolute", left: 14, top: 10, color: "var(--text-dim)" }}>🔍</span>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
              <div style={{ display: "flex", gap: 16 }}>
              </div>
              
              <div className="desktop-only" style={{ fontSize: 13, color: "var(--text-dim)", fontWeight: 500 }}>
                {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} | {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
              </div>

              <div style={{ position: "relative" }}>
                <div onClick={() => setDropdownOpen(!dropdownOpen)} style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
                  <div style={{ width: 36, height: 36, background: "var(--accent-gradient)", color: "white", borderRadius: 10,
                    display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 12, boxShadow: "var(--neon-glow)" }}>
                    {role?.slice(0,1).toUpperCase()}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-dim)" }}>▼</div>
                </div>
                
                {/* User Profile Dropdown */}
                {dropdownOpen && (
                  <div className="glass-card" style={{ position: "absolute", top: "150%", right: 0, width: 220, 
                    boxShadow: "0 10px 40px rgba(0,0,0,0.5)", overflow: "hidden", zIndex: 100 }}>
                    <div style={{ padding: "20px", borderBottom: "1px solid var(--border-color)", background: "rgba(255,255,255,0.03)" }}>
                      <div className="glow-text" style={{ fontWeight: 800, fontSize: 15, color: "var(--neon-blue)" }}>{auth.full_name || auth.username}</div>
                      <div style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>Role: {role}</div>
                    </div>
                    <div style={{ padding: 10 }}>
                      {role !== "student" && (
                        <button onClick={() => { setSettingsOpen(true); setDropdownOpen(false); }} style={{ width: "100%", textAlign: "left", padding: "12px 14px", background: "none", border: "none", borderRadius: 8, fontSize: 13, color: "var(--text-main)", cursor: "pointer", fontWeight: 600, transition: "background 0.2s" }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'} onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                          ⚙️ Settings
                        </button>
                      )}
                      <button onClick={() => setAuthPersist(null)} style={{ width: "100%", textAlign: "left", padding: "12px 14px", background: "none", border: "none", borderRadius: 8, fontSize: 13, color: "#f87171", cursor: "pointer", fontWeight: 600, transition: "background 0.2s" }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(248, 113, 113, 0.05)'} onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                        🚪 Logout
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="main-content" style={{ flex: 1, overflowY: "auto", padding: "32px 40px" }}>
            {page === "grades" && gradesError && (
              <div style={{ background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.3)", borderRadius: 12, padding: "12px 16px", marginBottom: 24, fontSize: 13, color: "#fca5a5", fontWeight: 600 }}>
                ⚠️ {gradesError}
              </div>
            )}
            {page === "dashboard" && <Dashboard token={auth.token} role={role} username={auth.username} full_name={auth.full_name} />}
            {page === "search"    && <StudentSearch students={students} subjects={subjects} grades={grades}
                searchId={searchId} setSearchId={setSearchId} searchResult={searchResult}
                setSearchResult={setSearchResult} searchDone={searchDone} setSearchDone={setSearchDone} />}
            {page === "students"  && (role === "register" || role === "cashier" || role === "saps" || role === "teacher" || role === "developer" || role === "owner") && <Students students={students} setStudents={setStudents} subjects={subjects} token={auth.token} role={role} />}
            {page === "studentmgmt" && (role === "register" || role === "saps" || role === "developer" || role === "owner") && <StudentManagement token={auth.token} role={role} students={students} allSubjects={subjects} grades={grades} setGrades={setGrades} />}
            {page === "subjects"  && (role === "student" || role === "register" || role === "saps" || role === "teacher" || role === "developer" || role === "owner") && <Subjects subjects={subjects} setSubjects={setSubjects} token={auth.token} role={role} />}
            {page === "grades"    && (role === "student" || role === "register" || role === "saps" || role === "teacher" || role === "developer" || role === "owner") && <Grades students={students} subjects={subjects} grades={grades} setGrades={setGrades} token={auth.token} role={role} studentIdFromAuth={auth.student_id} />}
            {page === "attendance" && (role === "teacher" || role === "developer" || role === "owner") && <AttendanceManage token={auth.token} role={role} students={students} subjects={subjects} />}
            {page === "attendance" && role === "teacher" && <TeacherAttendanceDashboard token={auth.token} teacherUuid={auth?.uuid} subjects={subjects} />}
            {page === "mypermits" && role === "student" && <MyPermits token={auth.token} />}
            {page === "permits"   && (role === "cashier" || role === "saps" || role === "teacher" || role === "developer" || role === "owner") && <PermitsView token={auth.token} semesterId={permitsSemester} role={role} username={auth.username} />}
            {page === "payments"  && (role === "student" || role === "register" || role === "cashier" || role === "saps" || role === "developer" || role === "owner") && <Payments token={auth.token} role={role} studentIdFromAuth={auth.student_id} />}
            {page === "profile"   && <Profile token={auth.token} username={auth.username} />}
            {page === "users"     && (role === "developer" || role === "owner") && <UsersAdmin token={auth.token} />}
            {page === "logs"      && (role === "developer" || role === "owner") && <LogsView token={auth.token} />}
          </div>
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

function Dashboard({ token, role, username, full_name }) {
  const [stats, setStats] = useState(null);
  const [content, setContent] = useState({ next_examination: "No examination scheduled.", ybvc_staff: [] });
  const [editExamOpen, setEditExamOpen] = useState(false);
  const [examValue, setExamValue] = useState("");
  const [editStaffOpen, setEditStaffOpen] = useState(false);
  const [staffJson, setStaffJson] = useState("");

  const canEditExam = role === "saps" || role === "developer";
  const canEditStaff = role === "saps" || role === "developer";
  const canEditFounder = role === "developer";

  const loadData = useCallback(async () => {
    try {
      const s = await api("/dashboard-stats", {}, token);
      setStats(s);
      const c = await api("/dashboard/content", {}, token);
      setContent(c);
      setExamValue(c.next_examination);
      setStaffJson(JSON.stringify(c.ybvc_staff, null, 2));
    } catch {}
  }, [token]);

  useEffect(() => { loadData(); }, [loadData]);

  const saveExam = async () => {
    try {
      await api("/dashboard/content", { method: "POST", body: { type: "next_examination", value: examValue } }, token);
      setEditExamOpen(false);
      loadData();
    } catch (e) { alert(e.message); }
  };

  const saveStaff = async () => {
    try {
      const val = JSON.parse(staffJson);
      await api("/dashboard/content", { method: "POST", body: { type: "ybvc_staff", value: val } }, token);
      setEditStaffOpen(false);
      loadData();
    } catch (e) { alert("Invalid JSON format. Please provide a valid array of staff objects."); }
  };

  if (!stats) return <div style={{ color: "var(--neon-blue)", fontWeight: 800, padding: 40 }} className="glow-text">LOADING STUDENT SYSTEM...</div>;

  const items = [
    { icon: "🎓", val: stats.totalStudents, label: "Total Students", color: "#44d7ff", variant: "active" },
    { icon: "📚", val: stats.activeSubjects, label: role === "student" ? "My Subjects" : "Active Subjects", color: "#44d7ff" },
    ...(role !== "student" ? [{ icon: "⚠️", val: stats.atRiskCount || 0, label: "At-Risk Students", color: "#f87171" }] : []),
    { icon: "📝", val: stats.gradeRecords, label: role === "student" ? "My Grade Records" : "Grade Records", color: "#44d7ff" },
  ];

  return (
    <div>
      <PageHeader title="Overview" sub={`Dashboard / Welcome back, ${full_name || username || role}`} />
      
      <div className="grid-1-on-mobile" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 24, marginBottom: 32 }}>
        {items.map((s, i) => (
          <div key={i} className="glass-card" style={{ padding: "24px 32px", display: "flex", alignItems: "center", gap: 24 }}>
            <div className="neon-border" style={{ width: 64, height: 64, borderRadius: 16, background: "rgba(68, 215, 255, 0.1)", color: "var(--neon-blue)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>
              {s.icon}
            </div>
            <div>
              <div style={{ fontSize: 11, color: "var(--text-dim)", fontWeight: 800, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 8 }}>{s.label}</div>
              <div style={{ fontSize: 32, fontWeight: 800, color: "white", lineHeight: 1 }}>{s.val}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid-1-on-mobile" style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 24, marginBottom: 32 }}>
        <Card title="Department Statistics (Student Population)">
          <div style={{ height: 260, display: "flex", alignItems: "flex-end", gap: 20, paddingBottom: 20 }}>
            {(stats.departmentCounts || []).length > 0 ? stats.departmentCounts.slice(0, 6).map((d, i) => {
              const max = Math.max(...stats.departmentCounts.map(x => x.total), 1);
              const height = (d.total / max) * 180;
              return (
                <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: "var(--neon-blue)" }}>{d.total}</div>
                  <div style={{ width: "100%", height, background: "var(--accent-gradient)", borderRadius: "8px 8px 0 0", boxShadow: "0 4px 15px rgba(68,215,255,0.2)" }} />
                  <div style={{ fontSize: 10, color: "var(--text-dim)", fontWeight: 700, textAlign: "center", height: 30 }}>{d.department}</div>
                </div>
              );
            }) : <div style={{ color: "var(--text-dim)", width: "100%", textAlign: "center" }}>No department data available.</div>}
          </div>
        </Card>

        <Card title="School Founder & Leadership" action={canEditFounder && <Btn variant="outline" style={{ fontSize: 11, padding: "4px 8px" }}>Edit</Btn>}>
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div>
              <div style={{ fontSize: 11, color: "var(--neon-blue)", fontWeight: 800, textTransform: "uppercase", marginBottom: 4 }}>Owner / Founder</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: "white" }}>Dr. Grace B. Talpis, MPA</div>
            </div>
            <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: 16 }}>
              <div style={{ fontSize: 11, color: "var(--text-dim)", fontWeight: 800, textTransform: "uppercase", marginBottom: 4 }}>Executive Vice President</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "white" }}>Lito Talpis</div>
            </div>
            <div style={{ marginTop: 10, background: "rgba(68, 215, 255, 0.05)", padding: 12, borderRadius: 10, border: "1px dashed rgba(68, 215, 255, 0.2)" }}>
              <div style={{ fontSize: 11, color: "var(--text-dim)", fontStyle: "italic" }}>"Dedicated to academic excellence and student success at YBVC."</div>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid-1-on-mobile" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        <Card title="Next Examination" action={canEditExam && <Btn variant="outline" onClick={() => setEditExamOpen(true)} style={{ fontSize: 11, padding: "4px 8px" }}>Manage</Btn>}>
          <div style={{ background: "rgba(68, 215, 255, 0.05)", borderRadius: 12, padding: 24, border: "1px solid rgba(68, 215, 255, 0.1)", minHeight: 180 }}>
            <div style={{ fontSize: 18, color: "white", fontWeight: 600, lineHeight: 1.6 }}>{content.next_examination}</div>
            <div style={{ marginTop: 24, fontSize: 12, color: "var(--text-dim)", display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ color: "var(--neon-blue)" }}>📢</span> Important notice for all students
            </div>
          </div>
        </Card>

        <Card title="YBVC STAFF" action={canEditStaff && <Btn variant="outline" onClick={() => setEditStaffOpen(true)} style={{ fontSize: 11, padding: "4px 8px" }}>Configure</Btn>}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, maxHeigth: 200, overflowY: "auto" }}>
            {content.ybvc_staff && content.ybvc_staff.length > 0 ? content.ybvc_staff.map((s, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: "rgba(255,255,255,0.03)", borderRadius: 10 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--neon-blue)" }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "white" }}>{s.name}</div>
                  <div style={{ fontSize: 11, color: "var(--text-dim)" }}>{s.position}</div>
                </div>
              </div>
            )) : <div style={{ color: "var(--text-dim)", padding: 20, textAlign: "center" }}>No staff records added.</div>}
          </div>
        </Card>
      </div>

      <Modal show={editExamOpen} title="📢 Edit Examination Message" onClose={() => setEditExamOpen(false)} width={500}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ fontSize: 13, color: "var(--text-dim)" }}>This message will be visible to all roles on the dashboard.</div>
          <textarea 
            value={examValue} 
            onChange={e => setExamValue(e.target.value)}
            style={{ width: "100%", height: 120, padding: 14, borderRadius: 10, background: "#0f172a", color: "white", border: "1px solid var(--border-color)", outline: "none", fontSize: 14 }}
          />
          <div style={{ display: "flex", gap: 10 }}>
            <Btn style={{ flex: 1 }} onClick={saveExam}>Save Message</Btn>
            <Btn variant="ghost" onClick={() => setEditExamOpen(false)}>Cancel</Btn>
          </div>
        </div>
      </Modal>

      <Modal show={editStaffOpen} title="👥 Configure YBVC STAFF" onClose={() => setEditStaffOpen(false)} width={600}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ fontSize: 13, color: "var(--text-dim)" }}>Enter staff list as a JSON array of objects: <code>{"[{\"name\": \"...\", \"position\": \"...\"}]"}</code></div>
          <textarea 
            value={staffJson} 
            onChange={e => setStaffJson(e.target.value)}
            style={{ width: "100%", height: 200, padding: 14, borderRadius: 10, background: "#0f172a", color: "white", border: "1px solid var(--border-color)", fontSize: 12, fontFamily: "monospace" }}
          />
          <div style={{ display: "flex", gap: 10 }}>
            <Btn style={{ flex: 1 }} onClick={saveStaff}>Save Staff List</Btn>
            <Btn variant="ghost" onClick={() => setEditStaffOpen(false)}>Cancel</Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function AttendanceManage({ token, role, students, subjects }) {
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({ course_name: "", block_number: "", subject_id: "", semester_id: "", time_slot: "", term_period: "" });
  const [selected, setSelected] = useState(null);
  const [enrollments, setEnrollments] = useState([]);
  const [date, setDate] = useState(() => {
    const d = new Date(); const y = d.getFullYear(); const m = String(d.getMonth()+1).padStart(2,"0"); const day = String(d.getDate()).padStart(2,"0"); return `${y}-${m}-${day}`;
  });
  const [attRows, setAttRows] = useState([]);
  const [enrollInput, setEnrollInput] = useState("");
  const [semesters, setSemesters] = useState([]);
  const [rangeStart, setRangeStart] = useState("");
  const [rangeEnd, setRangeEnd] = useState("");
  const [sheetDates, setSheetDates] = useState([]);
  const [sheetMap, setSheetMap] = useState({});
  const [selectedCells, setSelectedCells] = useState([]);
  const [focusCell, setFocusCell] = useState(null);
  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  const [searchTables, setSearchTables] = useState("");
  const [createOpen, setCreateOpen] = useState(false);

  const refreshTables = useCallback(async () => {
    setLoading(true); setError(null);
    try { const data = await api("/attendance/tables", {}, token); setTables(data); } catch (e) { setError(e.message); }
    setLoading(false);
  }, [token]);
  useEffect(() => { refreshTables(); }, [refreshTables]);
  useEffect(() => { api("/semesters", {}, token).then(arr => setSemesters(Array.isArray(arr) ? arr : [])).catch(() => setSemesters([])); }, [token]);

  const createTable = async () => {
    if (!form.course_name || !form.block_number || !form.subject_id || !form.semester_id || !form.time_slot || !form.term_period) {
      return setError("All fields are required");
    }
    setError(null);
    try {
      await api("/attendance", { method: "POST", body: {
        course_name: form.course_name,
        block_number: form.block_number,
        subject_id: form.subject_id,
        semester_id: Number(form.semester_id),
        time_slot: form.time_slot,
        term_period: form.term_period
      } }, token);
      setForm({ course_name: "", block_number: "", subject_id: "", semester_id: "", time_slot: "", term_period: "" });
      await refreshTables();
    } catch (e) { setError(e.message); }
  };

  const openTable = async (id) => {
    setSelected(id);
    await refreshEnrollments(id);
    await refreshAttendance(id, date);
  };
  const refreshEnrollments = async (id) => {
    try { const data = await api(`/attendance/tables/${id}/enrollments`, {}, token); setEnrollments(data); } catch (e) { setError(e.message); }
  };
  const refreshAttendance = async (id, d) => {
    try { const data = await api(`/attendance/tables/${id}/attendance?date=${encodeURIComponent(d)}`, {}, token); setAttRows(data.rows || []); } catch (e) { setError(e.message); }
  };
  const setStatus = async (sid, status) => {
    const send = status === "leave" ? "excuse" : status;
    try {
      const before = attRows.find(r => r.student_id === sid)?.attendance_status || "";
      await api(`/attendance/tables/${selected}/attendance/${sid}`, { method: "PUT", body: { status: send, date } }, token);
      await refreshAttendance(selected, date);
      setUndoStack(s => [{ sid, date, prev: before, next: send }, ...s]);
      setRedoStack([]);
    } catch (e) { setError(e.message); }
  };
  const presentAll = async () => {
    if (!window.confirm("Mark all enrolled students as Present?")) return;
    try { await api(`/attendance/tables/${selected}/attendance/present-all`, { method: "POST", body: { date } }, token); await refreshAttendance(selected, date); } catch (e) { setError(e.message); }
  };
  const deleteTable = async (id) => {
    if (!window.confirm("Delete this attendance table? This cannot be undone.")) return;
    try {
      await api(`/attendance/tables/${id}`, { method: "DELETE" }, token);
      await refreshTables();
    } catch (e) { setError(e.message); }
  };
  const enroll = async () => {
    if (!enrollInput) return;
    try { await api(`/attendance/tables/${selected}/enroll`, { method: "POST", body: { student_id: enrollInput } }, token); setEnrollInput(""); await refreshEnrollments(selected); await refreshAttendance(selected, date); } catch (e) { setError(e.message); }
  };
  const unenroll = async (sid) => {
    if (!window.confirm("Remove student from this attendance table?")) return;
    try { await api(`/attendance/tables/${selected}/enroll/${sid}`, { method: "DELETE" }, token); setEnrollInput(""); await refreshEnrollments(selected); await refreshAttendance(selected, date); } catch (e) { setError(e.message); }
  };
  const dateList = (start, end) => {
    if (!start || !end) return [];
    const s = new Date(start); const e = new Date(end);
    const out = [];
    for (let d = new Date(s); d <= e; d.setDate(d.getDate()+1)) {
      const y = d.getFullYear(); const m = String(d.getMonth()+1).padStart(2,"0"); const day = String(d.getDate()).padStart(2,"0");
      out.push(`${y}-${m}-${day}`);
    }
    return out;
  };
  const loadSheet = async () => {
    if (!selected) return;
    if (!rangeStart || !rangeEnd) return setError("Select a date range");
    const dates = dateList(rangeStart, rangeEnd);
    setError(null);
    setSheetDates(dates);
    const map = {};
    for (const d of dates) {
      try {
        const data = await api(`/attendance/tables/${selected}/attendance?date=${encodeURIComponent(d)}`, {}, token);
        map[d] = {};
        for (const r of data.rows || []) map[d][r.student_id] = r.attendance_status || "";
      } catch (e) { setError(e.message); }
    }
    setSheetMap(map);
    setSelectedCells([]);
    setFocusCell(null);
  };
  const markSelection = useCallback(async (status) => {
    if (selectedCells.length === 0) return;
    const send = status === "leave" ? "excuse" : status;
    const actions = [];
    for (const { sid, date: d } of selectedCells) {
      const before = sheetMap[d]?.[sid] || "";
      actions.push({ sid, d, before, after: send });
    }
    const newMap = { ...sheetMap };
    for (const a of actions) {
      try {
        await api(`/attendance/tables/${selected}/attendance/${a.sid}`, { method: "PUT", body: { status: send, date: a.d } }, token);
        if (!newMap[a.d]) newMap[a.d] = {};
        newMap[a.d][a.sid] = send;
      } catch (e) { setError(e.message); }
    }
    setSheetMap(newMap);
    setUndoStack(s => [...actions.map(a => ({ sid: a.sid, date: a.d, prev: a.before, next: send })), ...s]);
    setRedoStack([]);
  }, [selectedCells, sheetMap, selected, token]);
  const handleKey = useCallback((e) => {
    if (!focusCell) return;
    const idxD = sheetDates.indexOf(focusCell.date);
    const idxS = enrollments.findIndex(x => x.student_id === focusCell.sid);
    if (e.key === "ArrowRight" && idxD < sheetDates.length - 1) setFocusCell({ sid: focusCell.sid, date: sheetDates[idxD+1] });
    if (e.key === "ArrowLeft" && idxD > 0) setFocusCell({ sid: focusCell.sid, date: sheetDates[idxD-1] });
    if (e.key === "ArrowDown" && idxS < enrollments.length - 1) setFocusCell({ sid: enrollments[idxS+1].student_id, date: focusCell.date });
    if (e.key === "ArrowUp" && idxS > 0) setFocusCell({ sid: enrollments[idxS-1].student_id, date: focusCell.date });
    if (e.key.toLowerCase() === "p") markSelection("present");
    if (e.key.toLowerCase() === "a") markSelection("absent");
    if (e.key.toLowerCase() === "l") markSelection("late");
    if (e.key.toLowerCase() === "e") markSelection("leave");
  }, [focusCell, sheetDates, enrollments, markSelection]);
  useEffect(() => {
    const f = (e) => handleKey(e);
    window.addEventListener("keydown", f);
    return () => window.removeEventListener("keydown", f);
  }, [handleKey]);
  const toggleSelect = (sid, d, multi) => {
    if (multi) {
      setSelectedCells(s => {
        const exists = s.some(c => c.sid === sid && c.date === d);
        if (exists) return s.filter(c => !(c.sid === sid && c.date === d));
        return [...s, { sid, date: d }];
      });
    } else {
      setSelectedCells([{ sid, date: d }]);
    }
    setFocusCell({ sid, date: d });
  };
  const statusColor = (s) => s === "present" ? "#dcfce7" : s === "late" ? "#fef9c3" : s === "excuse" || s === "leave" ? "#e0e7ff" : s === "absent" ? "#fee2e2" : "transparent";
  const exportCSV = () => {
    if (sheetDates.length === 0 || enrollments.length === 0) return;
    const header = ["Student ID","Name",...sheetDates];
    const lines = [header.join(",")];
    for (const s of enrollments) {
      const row = [s.student_id, `"${s.name.replace(/"/g,'""')}"`];
      for (const d of sheetDates) {
        const v = sheetMap[d]?.[s.student_id] || "";
        row.push(v);
      }
      lines.push(row.join(","));
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "attendance.csv"; a.click();
    URL.revokeObjectURL(url);
  };
  const exportXLSX = async () => {
    if (sheetDates.length === 0 || enrollments.length === 0) return;
    const header = ["Student ID","Name",...sheetDates];
    const data = [header];
    for (const s of enrollments) {
      const row = [s.student_id, s.name];
      for (const d of sheetDates) row.push(sheetMap[d]?.[s.student_id] || "");
      data.push(row);
    }
    let XLSX;
    try { XLSX = await import("xlsx"); } catch { return alert("Excel export not available"); }
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, "Attendance");
    // Summary with formulas
    const summary = [["Student ID","Name","Present","Absent","Late","Leave","Rate"]];
    const startColIdx = 3; // C
    const endColIdx = 2 + sheetDates.length;
    const colLetter = (n) => {
      let s = ""; while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s;
    };
    const startCol = colLetter(startColIdx);
    const endCol = colLetter(endColIdx);
    enrollments.forEach((stu, i) => {
      const rowIdx = 2 + i; // Attendance sheet data starts at row 2
      const range = `'Attendance'!${startCol}${rowIdx}:${endCol}${rowIdx}`;
      summary.push([
        stu.student_id,
        stu.name,
        { f: `COUNTIF(${range},"present")` },
        { f: `COUNTIF(${range},"absent")` },
        { f: `COUNTIF(${range},"late")` },
        { f: `COUNTIF(${range},"excuse")` },
        { f: `IF(COUNTA(${range})=0,0,(COUNTIF(${range},"present")/COUNTA(${range})) )` }
      ]);
    });
    const ws2 = XLSX.utils.aoa_to_sheet(summary);
    XLSX.utils.book_append_sheet(wb, ws2, "Summary");
    XLSX.writeFile(wb, "attendance.xlsx");
  };
  const computeStats = () => {
    const stats = {};
    for (const s of enrollments) stats[s.student_id] = { present: 0, absent: 0, late: 0, leave: 0, rate: 0 };
    for (const d of sheetDates) {
      const m = sheetMap[d] || {};
      for (const sid of Object.keys(stats)) {
        const v = m[sid] || "";
        if (v === "present") stats[sid].present += 1;
        if (v === "absent") stats[sid].absent += 1;
        if (v === "late") stats[sid].late += 1;
        if (v === "excuse" || v === "leave") stats[sid].leave += 1;
      }
    }
    for (const sid of Object.keys(stats)) {
      const tot = sheetDates.length;
      const p = stats[sid].present;
      stats[sid].rate = tot ? Math.round((p / tot) * 100) : 0;
    }
    return stats;
  };
  const undo = async () => {
    const last = undoStack[0];
    if (!last) return;
    try {
      await api(`/attendance/tables/${selected}/attendance/${last.sid}`, { method: "PUT", body: { status: last.prev || "", date: last.date } }, token);
      setUndoStack(s => s.slice(1));
      setRedoStack(s => [{ sid: last.sid, date: last.date, prev: last.prev, next: last.next }, ...s]);
      if (last.date === date) await refreshAttendance(selected, date);
      if (sheetMap[last.date]) {
        const nm = { ...sheetMap };
        nm[last.date] = { ...nm[last.date], [last.sid]: last.prev || "" };
        setSheetMap(nm);
      }
    } catch (e) { setError(e.message); }
  };
  const redo = async () => {
    const last = redoStack[0];
    if (!last) return;
    try {
      await api(`/attendance/tables/${selected}/attendance/${last.sid}`, { method: "PUT", body: { status: last.next || "", date: last.date } }, token);
      setRedoStack(s => s.slice(1));
      setUndoStack(s => [{ sid: last.sid, date: last.date, prev: last.prev, next: last.next }, ...s]);
      if (last.date === date) await refreshAttendance(selected, date);
      if (sheetMap[last.date]) {
        const nm = { ...sheetMap };
        nm[last.date] = { ...nm[last.date], [last.sid]: last.next || "" };
        setSheetMap(nm);
      }
    } catch (e) { setError(e.message); }
  };

  return (
    <div>
      <PageHeader title="🗓️ Attendance Management" sub="Create tables, enroll students, and track daily attendance" />
      <div style={{ marginBottom: 20, display: "flex", justifyContent: "flex-end" }}>
        <Btn variant="primary" onClick={() => setCreateOpen(true)} style={{ padding: "12px 24px" }}>+ New Attendance Table</Btn>
      </div>
      {error && <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "8px 12px", marginBottom: 12, fontSize: 12, color: "#b91c1c", fontWeight: 600 }}>{error}</div>}
      <Modal show={createOpen} title="➕ Create Attendance Table" onClose={() => setCreateOpen(false)} width={600}>
        <div className="grid-1-on-mobile" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Input label="Course Name" value={form.course_name} onChange={e => setForm(f => ({ ...f, course_name: e.target.value }))} />
          <Input label="Block Number" value={form.block_number} onChange={e => setForm(f => ({ ...f, block_number: e.target.value }))} />
          <Select label="Subject" value={form.subject_id} onChange={e => setForm(f => ({ ...f, subject_id: e.target.value }))}>
            <option value="">-- Choose Subject --</option>
            {subjects.map(s => <option key={s.id} value={s.id}>{s.id} · {s.name}</option>)}
          </Select>
          <Select label="Semester" value={form.semester_id} onChange={e => setForm(f => ({ ...f, semester_id: e.target.value }))}>
            <option value="">-- Choose Semester --</option>
            {semesters.map(s => <option key={s.id} value={s.id}>{s.school_year} · {s.term}</option>)}
          </Select>
          <Select label="Class Time Slot" value={form.time_slot} onChange={e => setForm(f => ({ ...f, time_slot: e.target.value }))}>
            <option value="">-- Choose Time Slot --</option>
            <option value="Morning Class">Morning Class</option>
            <option value="Afternoon Class">Afternoon Class</option>
            <option value="Evening Class">Evening Class</option>
          </Select>
          <Select label="Prelim/Term" value={form.term_period} onChange={e => setForm(f => ({ ...f, term_period: e.target.value }))}>
            <option value="">-- Choose Term --</option>
            <option value="1st prelim">1st prelim</option>
            <option value="2nd prelim">2nd prelim</option>
            <option value="midterm">midterm</option>
            <option value="semi-final">semi-final</option>
            <option value="final prelim">final prelim</option>
          </Select>
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
          <Btn onClick={createTable} style={{ flex: 1 }}>✅ Create Table</Btn>
          <Btn variant="ghost" onClick={() => setCreateOpen(false)} style={{ flex: 1 }}>Cancel</Btn>
        </div>
      </Modal>

      <Card title="Existing Attendance Tables">
        <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
          <input placeholder="🔍 Search tables by course, term or subject..."
            value={searchTables} onChange={e => setSearchTables(e.target.value)}
            style={{ flex: 1, padding: "10px 14px", border: "1px solid var(--border-color)",
              borderRadius: 10, fontSize: 13, outline: "none", background: "#0f172a", color: "white" }} />
        </div>
        {loading ? <div style={{ textAlign: "center", padding: 40, color: "var(--text-dim)" }}>Loading tables...</div> : (
          <div className="grid-1-on-mobile" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
            {tables.filter(t => {
              const q = searchTables.toLowerCase();
              return !q || [t.course_name, t.term_period, t.id, t.subject_id].some(v => String(v).toLowerCase().includes(q));
            }).map((t, idx) => (
              <div key={t.id} className="glass-card" style={{ 
                padding: 20, 
                borderTop: `4px solid ${["#44d7ff", "#2563eb", "#7c3aed", "#10b981", "#fbbf24"][idx % 5]}`,
                transition: "transform 0.2s",
                cursor: "default"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                  <div>
                    <code style={{ fontSize: 11, background: "rgba(68, 215, 255, 0.1)", color: "var(--neon-blue)", padding: "2px 6px", borderRadius: 4, fontWeight: 800 }}>ID: {t.id}</code>
                    <div style={{ fontSize: 18, fontWeight: 800, color: "white", marginTop: 8 }}>{t.course_name}</div>
                    <div style={{ fontSize: 13, color: "var(--text-dim)", marginTop: 2 }}>{t.subject_id} · Block {t.block_number}</div>
                  </div>
                  <Badge text={t.term_period} type={t.term_period?.includes("final") ? "green" : "blue"} />
                </div>
                
                <div style={{ padding: "12px 0", borderTop: "1px solid rgba(255,255,255,0.05)", borderBottom: "1px solid rgba(255,255,255,0.05)", marginBottom: 16 }}>
                  <div style={{ fontSize: 12, color: "var(--text-dim)", marginBottom: 6 }}>
                    <span style={{ marginRight: 8 }}>🕒</span> {t.time_slot || "Scheduled Class"}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-dim)" }}>
                    <span style={{ marginRight: 8 }}>📅</span> Academic Year 2026-2027
                  </div>
                </div>

                <div style={{ display: "flex", gap: 8 }}>
                  <Btn onClick={() => openTable(t.id)} style={{ flex: 1 }}>📂 Open Tracker</Btn>
                  {(role === "developer" || role === "owner") && (
                    <Btn variant="danger" onClick={() => deleteTable(t.id)} style={{ padding: "10px 14px" }}>🗑️</Btn>
                  )}
                </div>
              </div>
            ))}
            {tables.length === 0 && <div style={{ gridColumn: "1/-1", textAlign: "center", padding: 40, color: "var(--text-dim)" }}>No attendance tables created yet.</div>}
          </div>
        )}
      </Card>

      {selected && (
        <>
          <Card title="Enrollment">
            <div style={{ display: "flex", gap: 10 }}>
              <Input label="Search Student by Name or ID" value={enrollInput} onChange={e => setEnrollInput(e.target.value)} />
              <Btn onClick={enroll}>Add Student</Btn>
            </div>
            <div style={{ marginTop: 10 }}>
              {enrollInput && (
                <div style={{ marginBottom: 16, background: "rgba(255, 255, 255, 0.03)", border: "1px solid var(--border-color)", borderRadius: 12, padding: 16 }}>
                  <div style={{ fontSize: 11, color: "var(--text-dim)", marginBottom: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>Matches:</div>
                  <div className="grid-1-on-mobile" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10 }}>
                    {students
                      .filter(s => [s.name, s.id].some(x => String(x).toLowerCase().includes(enrollInput.toLowerCase())))
                      .slice(0, 8)
                      .map(s => (
                        <div key={s.id} onClick={() => setEnrollInput(s.id)} style={{ cursor: "pointer", padding: "10px 14px", borderRadius: 10, background: "rgba(255, 255, 255, 0.05)", border: "1px solid var(--border-color)", transition: "all 0.2s" }} onMouseEnter={e => e.currentTarget.style.borderColor = "var(--neon-blue)"} onMouseLeave={e => e.currentTarget.style.borderColor = "var(--border-color)"}>
                          <div style={{ fontWeight: 800, color: "white", fontSize: 13 }}>{s.name}</div>
                          <div style={{ color: "var(--neon-blue)", fontSize: 11, fontWeight: 700 }}>{s.id}</div>
                        </div>
                      ))}
                  </div>
                </div>
              )}
              <div className="table-container">
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead><tr><Th>ID</Th><Th>Name</Th><Th>Course/Year</Th><Th>Status</Th><Th>Action</Th></tr></thead>
                  <tbody>
                    {enrollments.map(s => (
                      <tr key={s.student_id} style={{ borderBottom: "1px solid var(--border-color)" }}>
                        <Td><code style={{ fontSize: 11, background: "rgba(68, 215, 255, 0.1)", color: "var(--neon-blue)", padding: "4px 8px", borderRadius: 6, fontWeight: 800 }}>{s.student_id}</code></Td>
                        <Td><strong style={{ color: "white" }}>{s.name}</strong></Td>
                        <Td style={{ color: "var(--text-dim)" }}>{s.course} - {s.year}</Td>
                        <Td><Badge text={s.status} type={s.status === "Active" ? "green" : "red"} /></Td>
                        <Td><Btn onClick={() => unenroll(s.student_id)}>Remove</Btn></Td>
                      </tr>
                    ))}
                    {enrollments.length === 0 && <tr><Td colSpan={5}>No students enrolled.</Td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </Card>

          <Card title="Attendance Tracking">
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <Input label="Date (YYYY-MM-DD)" value={date} onChange={e => { setDate(e.target.value); refreshAttendance(selected, e.target.value); }} />
              <Btn onClick={presentAll}>Present All</Btn>
            </div>
            <div style={{ marginTop: 10 }}>
              <div className="table-container">
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead><tr><Th>ID</Th><Th>Name</Th><Th>Course/Year</Th><Th>Status</Th><Th>Mark</Th></tr></thead>
                  <tbody>
                    {attRows.map(r => (
                      <tr key={r.student_id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <Td><code style={{ fontSize: 11, background: "#f1f5f9", color: "#111827", padding: "2px 5px", borderRadius: 4, fontWeight: 800 }}>{r.student_id}</code></Td>
                        <Td><strong>{r.name}</strong></Td>
                        <Td>{r.course} - {r.year}</Td>
                        <Td>{r.attendance_status ? <Badge text={r.attendance_status} type={r.attendance_status === "present" ? "green" : r.attendance_status === "late" ? "yellow" : r.attendance_status === "excuse" ? "blue" : "red"} /> : <span style={{ color: "#6b7280" }}>—</span>}</Td>
                        <Td>
                          <div style={{ display: "flex", gap: 6 }}>
                            <Btn onClick={() => setStatus(r.student_id, "present")}>Present</Btn>
                            <Btn onClick={() => setStatus(r.student_id, "absent")}>Absent</Btn>
                            <Btn onClick={() => setStatus(r.student_id, "late")}>Late</Btn>
                            <Btn onClick={() => setStatus(r.student_id, "leave")}>Leave</Btn>
                          </div>
                        </Td>
                      </tr>
                    ))}
                    {attRows.length === 0 && <tr><Td colSpan={5}>No enrolled students.</Td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </Card>
          <Card title="Spreadsheet">
            <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10 }}>
              <Input label="Start Date" value={rangeStart} onChange={e => setRangeStart(e.target.value)} />
              <Input label="End Date" value={rangeEnd} onChange={e => setRangeEnd(e.target.value)} />
              <Btn onClick={loadSheet}>Load</Btn>
              <Select label="Bulk Status" onChange={e => { const v = e.target.value; if (v) markSelection(v); }}>
                <option value="">Bulk set…</option>
                <option value="present">Present</option>
                <option value="absent">Absent</option>
                <option value="late">Late</option>
                <option value="leave">Leave</option>
              </Select>
              <Btn onClick={undo} variant="outline">Undo</Btn>
              <Btn onClick={redo} variant="outline">Redo</Btn>
              <Btn onClick={exportCSV} variant="outline">Export CSV</Btn>
              <Btn onClick={exportXLSX} variant="outline">Export Excel</Btn>
            </div>
            {sheetDates.length > 0 ? (
              <div style={{ overflowX: "auto" }}>
                <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 12 }}>
                  <thead>
                    <tr>
                      <Th>Student</Th>
                      {sheetDates.map(d => <Th key={d}>{d}</Th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {enrollments.map(s => (
                      <tr key={s.student_id}>
                        <Td><strong>{s.name}</strong> <span style={{ color: "#6b7280" }}>({s.student_id})</span></Td>
                        {sheetDates.map(d => {
                          const val = sheetMap[d]?.[s.student_id] || "";
                          const isSelected = selectedCells.some(c => c.sid === s.student_id && c.date === d);
                          const isFocus = focusCell && focusCell.sid === s.student_id && focusCell.date === d;
                          return (
                            <td key={d}
                              onClick={(e) => toggleSelect(s.student_id, d, e.shiftKey)}
                              style={{
                                padding: "6px 8px",
                                border: "1px solid #e5e7eb",
                                background: isFocus ? "#e0f2fe" : isSelected ? "#f3f4f6" : statusColor(val),
                                cursor: "pointer",
                                textAlign: "center",
                                minWidth: 90
                              }}>
                              {val || "—"}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ color: "#6b7280", fontSize: 12 }}>Load a date range to view the spreadsheet.</div>
            )}
            {sheetDates.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <PageHeader title="Summary" />
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead><tr><Th>Student</Th><Th>Present</Th><Th>Absent</Th><Th>Late</Th><Th>Leave</Th><Th>Rate %</Th></tr></thead>
                  <tbody>
                    {Object.entries(computeStats()).map(([sid, st]) => {
                      const s = enrollments.find(x => x.student_id === sid);
                      return (
                        <tr key={sid} style={{ borderBottom: "1px solid #f1f5f9" }}>
                          <Td><strong>{s?.name || sid}</strong></Td>
                          <Td>{st.present}</Td>
                          <Td>{st.absent}</Td>
                          <Td>{st.late}</Td>
                          <Td>{st.leave}</Td>
                          <Td>{st.rate}</Td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}

function TeacherAttendanceDashboard({ token, teacherUuid, subjects }) {
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");
  const [filterSubject, setFilterSubject] = useState("");
  const [filterSem, setFilterSem] = useState("");
  const [filterSlot, setFilterSlot] = useState(""); // eslint-disable-line no-unused-vars
  const [page, setPage] = useState(1);
  const [perPage] = useState(10);
  const [semesters, setSemesters] = useState([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ subject_id: "", semester_id: "", time_slot: "" });
  const slots = ["Morning Class","Afternoon Class","Evening Class"];
  useEffect(() => {
    api("/semesters", {}, token).then(arr => setSemesters(Array.isArray(arr) ? arr : [])).catch(() => setSemesters([]));
  }, [token]);
  const load = useCallback(async () => {
    if (!teacherUuid) return;
    const data = await api(`/attendance?teacher_id=${encodeURIComponent(teacherUuid)}`, {}, token);
    setRows(data);
  }, [teacherUuid, token]);
  useEffect(() => { load(); }, [load]);
  const filtered = rows.filter(r => {
    const matchQ = q ? [r.course_name, r.class_identifier, r.block_number, r.academic_year].some(x => String(x).toLowerCase().includes(q.toLowerCase())) : true;
    const matchSub = filterSubject ? r.subject_id === filterSubject : true;
    const matchSem = filterSem ? String(r.semester_id) === String(filterSem) : true;
    const matchSlot = filterSlot ? r.time_slot === filterSlot : true;
    return matchQ && matchSub && matchSem && matchSlot;
  });
  const pages = Math.max(1, Math.ceil(filtered.length / perPage));
  const view = filtered.slice((page-1)*perPage, (page-1)*perPage + perPage);
  const canEdit = (row) => String(row.created_by_teacher_id) === String(teacherUuid);
  const submitCreate = async () => {
    if (!form.subject_id || !form.semester_id || !form.time_slot) {
      alert("All fields are required"); return;
    }
    try {
      await api("/attendance", { method: "POST", body: {
        course_name: "Course",
        class_identifier: "Class",
        block_number: "Block",
        academic_year: "2026-2027",
        subject_id: form.subject_id,
        semester_id: Number(form.semester_id),
        time_slot: form.time_slot
      } }, token);
      setCreateOpen(false);
      setForm({ subject_id: "", semester_id: "", time_slot: "" });
      await load();
    } catch (e) { alert(e.message); }
  };
  const onDelete = async (row) => {
    if (!canEdit(row)) return;
    if (!window.confirm("Delete this attendance record?")) return;
    await api(`/attendance/${row.id}`, { method: "DELETE" }, token);
    await load();
  };
  return (
    <div>
      <Card title="My Attendance Records" action={<Btn onClick={() => setCreateOpen(true)}>+ New</Btn>}>
        <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "flex-start" }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase", marginBottom: 6, display: "block" }}>Search</label>
            <input placeholder="Search records..." value={q} onChange={e => { setQ(e.target.value); setPage(1); }} 
              style={{ width: "100%", padding: "10px 14px", border: "1px solid var(--border-color)", borderRadius: 10, background: "#0f172a", color: "#ffffff", outline: "none" }} />
          </div>
          <div style={{ width: 180 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase", marginBottom: 6, display: "block" }}>Subject</label>
            <select value={filterSubject} onChange={e => { setFilterSubject(e.target.value); setPage(1); }}
              style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--border-color)", borderRadius: 10, background: "#0f172a", color: "#ffffff", outline: "none" }}>
              <option value="">All Subjects</option>
              {subjects.map(s => <option key={s.id} value={s.id} style={{ background: "#0f172a" }}>{s.name}</option>)}
            </select>
          </div>
          <div style={{ width: 180 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase", marginBottom: 6, display: "block" }}>Semester</label>
            <select value={filterSem} onChange={e => { setFilterSem(e.target.value); setPage(1); }}
              style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--border-color)", borderRadius: 10, background: "#0f172a", color: "#ffffff", outline: "none" }}>
              <option value="">All Semesters</option>
              {semesters.map(s => <option key={s.id} value={s.id} style={{ background: "#0f172a" }}>{s.school_year} · {s.term}</option>)}
            </select>
          </div>
        </div>

        <div className="grid-1-on-mobile" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
          {view.map((r, idx) => (
            <div key={r.id} className="glass-card" style={{ 
              padding: 20, 
              borderTop: `4px solid ${["#44d7ff", "#2563eb", "#7c3aed", "#10b981", "#fbbf24"][idx % 5]}`,
              transition: "transform 0.2s"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                <code style={{ fontSize: 10, background: "rgba(68, 215, 255, 0.1)", color: "var(--neon-blue)", padding: "2px 6px", borderRadius: 4, fontWeight: 800 }}>{r.id}</code>
                <Badge text={r.time_slot} type="blue" />
              </div>
              <div style={{ fontSize: 16, fontWeight: 800, color: "white", marginBottom: 4 }}>{r.subject_id}</div>
              <div style={{ fontSize: 13, color: "var(--text-dim)", marginBottom: 16 }}>{r.course_name} · Block {r.block_number}</div>
              
              <div style={{ display: "flex", gap: 8, marginTop: "auto" }}>
                <Btn variant="outline" disabled={!canEdit(r)} style={{ flex: 1, fontSize: 12 }}>Edit</Btn>
                <Btn variant="danger" disabled={!canEdit(r)} onClick={() => onDelete(r)} style={{ fontSize: 12 }}>🗑️</Btn>
              </div>
            </div>
          ))}
          {view.length === 0 && <div style={{ gridColumn: "1/-1", textAlign: "center", padding: 40, color: "var(--text-dim)" }}>No attendance records found.</div>}
        </div>

        <div style={{ display: "flex", gap: 12, marginTop: 20, alignItems: "center", justifyContent: "center" }}>
          <Btn variant="outline" disabled={page<=1} onClick={() => setPage(p => Math.max(1, p-1))} style={{ padding: "8px 16px" }}>Prev</Btn>
          <div style={{ fontSize: 13, color: "var(--text-dim)", fontWeight: 600 }}>Page {page} of {pages}</div>
          <Btn variant="outline" disabled={page>=pages} onClick={() => setPage(p => Math.min(pages, p+1))} style={{ padding: "8px 16px" }}>Next</Btn>
        </div>
      </Card>
      <Modal show={createOpen} title="Create Attendance" onClose={() => setCreateOpen(false)} width={520}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 10 }}>
          <Input label="Teacher UUID" value={teacherUuid || ""} readOnly />
          <Select label="Subject" value={form.subject_id} onChange={e => setForm(f => ({ ...f, subject_id: e.target.value }))}>
            <option value="">-- Choose Subject --</option>
            {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
          <Select label="Semester" value={form.semester_id} onChange={e => setForm(f => ({ ...f, semester_id: e.target.value }))}>
            <option value="">-- Choose Semester --</option>
            {semesters.map(s => <option key={s.id} value={s.id}>{s.school_year} · {s.term}</option>)}
          </Select>
          <Select label="Class Time Slot" value={form.time_slot} onChange={e => setForm(f => ({ ...f, time_slot: e.target.value }))}>
            <option value="">-- Choose Time Slot --</option>
            {slots.map(v => <option key={v} value={v}>{v}</option>)}
          </Select>
          <div style={{ display: "flex", gap: 8 }}>
            <Btn onClick={submitCreate}>Create</Btn>
            <Btn variant="ghost" onClick={() => setCreateOpen(false)}>Cancel</Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
}
/*
function MyAttendance({ token }) {
  const [rows, setRows] = useState([]);
  const [date, setDate] = useState("");
  const [error, setError] = useState(null);
  const refresh = useCallback(async () => {
    setError(null);
    try {
      const path = date ? `/attendance/my?date=${encodeURIComponent(date)}` : "/attendance/my";
      const data = await api(path, {}, token);
      setRows(data);
    } catch (e) { setError(e.message); }
  }, [date, token]);
  useEffect(() => { refresh(); }, [refresh]);
  return (
    <div>
      <PageHeader title="🗓️ My Attendance" sub="View your attendance across classes" />
      {error && <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "8px 12px", marginBottom: 12, fontSize: 12, color: "#b91c1c", fontWeight: 600 }}>{error}</div>}
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <Input label="Filter Date (YYYY-MM-DD)" value={date} onChange={e => setDate(e.target.value)} />
        <Btn onClick={refresh}>Apply Filter</Btn>
      </div>
      <Card title="Attendance Records">
        <div className="table-container">
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead><tr><Th>Course</Th><Th>Block</Th><Th>Time Slot</Th><Th>Date</Th><Th>Status</Th></tr></thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <Td><strong>{r.course_name}</strong></Td>
                  <Td>{r.block_number}</Td>
                  <Td>{r.time_slot || "-"}</Td>
                  <Td>{r.date}</Td>
                  <Td><Badge text={r.status} type={r.status === "present" ? "green" : r.status === "late" ? "yellow" : "red"} /></Td>
                </tr>
              ))}
              {rows.length === 0 && <tr><Td colSpan={6}>No attendance records found.</Td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
*/

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
            <input id="profile-username" type="text" value={username} disabled style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--border-color)", background: "#0f172a", fontSize: 13, color: "var(--text-dim)" }} />
          </div>
          <div>
            <label htmlFor="profile-newpass" style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>New Password</label>
            <input id="profile-newpass" type="password" value={pass} onChange={e => setPass(e.target.value)} style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--border-color)", background: "#0f172a", color: "#ffffff", fontSize: 13 }} />
          </div>
          <div>
            <label htmlFor="profile-confirm" style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>Confirm Password</label>
            <input id="profile-confirm" type="password" value={confirm} onChange={e => setConfirm(e.target.value)} style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--border-color)", background: "#0f172a", color: "white", fontSize: 13 }} />
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
                <div className="table-container">
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
                </div>
              )}
            </Card>
          )}
        </>
      ) : (
        <>
      {msg && <div style={{ background: "linear-gradient(135deg, #ecfdf5, #d1fae5)", border: "1px solid #bbf7d0", borderRadius: 8, padding: "10px 16px", marginBottom: 14, color: "#065f46", fontWeight: 600, fontSize: 13 }}>{msg}</div>}
      <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 18 }}>
        <Card title="Select Student">
          <input placeholder="🔍 Search..." value={searchStu} onChange={e => setSearchStu(e.target.value)}
            style={{ width: "100%", padding: "8px 11px", border: "1px solid var(--border-color)", borderRadius: 8, fontSize: 12, outline: "none", marginBottom: 10, background: "#0f172a", color: "white" }} />
          <div style={{ maxHeight: 420, overflowY: "auto" }}>
            {filteredStudents.map(s => (
              <div key={s.id} onClick={() => setSelectedStudent(s.id)} style={{
                padding: "10px 12px", borderRadius: 8, cursor: "pointer", marginBottom: 4,
                background: selectedStudent === s.id ? "rgba(68, 215, 255, 0.15)" : "rgba(255,255,255,0.08)",
                border: `1.5px solid ${selectedStudent === s.id ? "var(--neon-blue)" : "transparent"}`,
                transition: "all 0.15s",
              }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: selectedStudent === s.id ? "white" : "var(--text-main)" }}>{s.name}</div>
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
                <div className="table-container">
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead><tr><Th>Period</Th><Th>Permit #</Th><Th>Issue</Th><Th>Expiry</Th><Th>Status</Th><Th>Actions</Th></tr></thead>
                    <tbody>
                      {permitsFiltered.map(p => (
                        <tr key={p.id} style={{ borderBottom: "1px solid var(--border-color)" }}>
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
                </div>
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

  const loadBalance = useCallback(async () => {
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
  }, [studentId, token, fromDate, toDate, filterMethod]);

  useEffect(() => {
    if (studentId) loadBalance();
  }, [studentId, loadBalance]);
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
      {msg && <div style={{ background: "rgba(68, 215, 255, 0.1)", border: "1px solid var(--border-color)", color: "var(--neon-blue)", borderRadius: 8, padding: "10px 16px", marginBottom: 12, fontSize: 13, fontWeight: 600 }}>{msg}</div>}
      
      {role !== "student" && (
        <Card title="Record Payment">
          <div className="grid-1-on-mobile" style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr", gap: 10 }}>
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
        <div className="grid-1-on-mobile" style={{ display: "grid", gridTemplateColumns: role === 'student' ? "1fr 1fr 1fr" : "2fr 1fr 1fr 1fr", gap: 10 }}>
          {role !== "student" && <Input label="Student ID" value={studentId} onChange={e => setStudentId(e.target.value)} />}
          <Input label="From (YYYY-MM-DD)" value={fromDate} onChange={e => setFromDate(e.target.value)} placeholder="2026-01-01" />
          <Input label="To (YYYY-MM-DD)" value={toDate} onChange={e => setToDate(e.target.value)} placeholder="2026-12-31" />
          <Input label="Method" value={filterMethod} onChange={e => setFilterMethod(e.target.value)} placeholder="e.g. Cash, GCash, Card" />
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
          <Btn variant="outline" onClick={() => { if (studentId) loadBalance(); }} disabled={role === "student" && !studentId}>Apply Filters</Btn>
          <Btn variant="ghost" onClick={() => { setFromDate(""); setToDate(""); setFilterMethod(""); if (studentId) loadBalance(); }}>Clear</Btn>
        </div>
      </Card>

      {balance !== null && (
        <Card title={role === "student" ? "My Balance" : `Account Balance: ${studentId}`}>
          <div className="glow-text" style={{ fontSize: 32, fontWeight: 900, color: "var(--neon-blue)", marginBottom: 4 }}>₱{balance.toFixed(2)}</div>
          <div style={{ fontSize: 13, color: "var(--text-dim)", fontWeight: 500 }}>Remaining balance for current semester.</div>
        </Card>
      )}

      {payments.length > 0 && (
        <Card title={role === "student" ? "Payment History" : (studentId ? `Recent Payments for ${studentId}` : "All Payments")}>
          <div className="table-container">
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead><tr><Th>Date</Th><Th>Amount</Th><Th>Method</Th><Th>Reference</Th></tr></thead>
              <tbody>
                {payments.map(p => (
                  <tr key={p.id} style={{ borderBottom: "1px solid var(--border-color)" }}>
                    <Td>{new Date(p.created_at).toLocaleString()}</Td>
                    <Td>₱{Number(p.amount).toFixed(2)}</Td>
                    <Td>{p.method || "-"}</Td>
                    <Td>{p.reference || "-"}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
          <div className="table-container">
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr><Th>ID</Th><Th>Name</Th><Th>Course</Th><Th>Year</Th><Th>Email</Th><Th>Status</Th><Th>Action</Th></tr>
              </thead>
              <tbody>
                {results.map(s => (
                  <tr key={s.id} style={{ borderBottom: "1px solid var(--border-color)", cursor: "pointer" }}
                    onClick={() => setSearchResult(s)}>
                    <Td><code style={{ background: "#f1f5f9", color: "#111827", padding: "2px 7px", borderRadius: 5, fontWeight: 800 }}>{s.id}</code></Td>
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
          </div>
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
                  <div style={{ fontSize: 20, fontWeight: 800, color: "white" }}>{searchResult.name}</div>
                  <Badge text={searchResult.status} type={searchResult.status === "Active" ? "green" : "red"} />
                </div>
                <div className="grid-1-on-mobile" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
                  {[
                    { label: "Student ID", val: searchResult.id },
                    { label: "Course",     val: searchResult.course },
                    { label: "Year Level", val: searchResult.year },
                    { label: "Email",      val: searchResult.email },
                  ].map(r => (
                    <div key={r.label}>
                      <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 600,
                        textTransform: "uppercase" }}>{r.label}</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-main)",
                        marginTop: 2 }}>{r.val}</div>
                    </div>
                  ))}
                </div>
              </div>
              {gpa && (
                <div style={{ textAlign: "center", background: "#0f172a", border: "1px solid var(--border-color)", borderRadius: 12,
                  padding: "14px 22px", flexShrink: 0 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "var(--neon-blue)",
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
                <div className="table-container">
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
                          <tr key={subj.id} style={{ borderBottom: "1px solid var(--border-color)" }}>
                            <Td><code style={{ background: "#f1f5f9", color: "#111827", padding: "2px 7px",
                              borderRadius: 5, fontSize: 12, fontWeight: 800 }}>{subj.id}</code></Td>
                            <Td><div style={{ fontWeight: 600 }}>{subj.name}</div>
                              <div style={{ fontSize: 11, color: "#6b7280" }}>{subj.professor}</div>
                              <div style={{ fontSize: 10, color: "#94a3b8" }}>{subj.campus || "-"} · {subj.room || "-"}</div></Td>
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
                </div>
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
  // const subjectById = Object.fromEntries(subjects.map(su => [su.id, su]));
  const filtered = students.filter(s => {
    const q = search.toLowerCase();
    const matchesSearch = (s.name.toLowerCase().includes(q) || s.id.toLowerCase().includes(q) || s.email.toLowerCase().includes(q));
    const matchesStatus = (filter === "All" || s.status === filter);
    const matchesTerm = (() => {
      if (termFilter === "All") return true;
      // Determine if student has any subject in the selected term
      // We infer via existing grades in global state (loaded separately in App and used to populate subjects list)
      // Since Students component does not have grades here, we approximate by checking subjects array for semester term.
      // In practice, staff uses this view alongside Student Management to focus on term.
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
        <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
          <input placeholder="🔍  Search by name, ID, or email..."
            value={search} onChange={e => setSearch(e.target.value)}
            style={{ flex: 1, minWidth: 200, padding: "10px 14px", border: "1px solid var(--border-color)",
              borderRadius: 10, fontSize: 13, outline: "none", background: "#0f172a", color: "#ffffff" }} />
          <select value={filter} onChange={e => setFilter(e.target.value)}
            style={{ padding: "10px 12px", border: "1px solid var(--border-color)", borderRadius: 10,
              fontSize: 13, cursor: "pointer", background: "#0f172a", color: "#ffffff" }}>
            <option style={{ background: "#0f172a" }}>All Status</option>
            <option style={{ background: "#0f172a" }}>Active</option>
            <option style={{ background: "#0f172a" }}>At Risk</option>
          </select>
          <select value={termFilter} onChange={e => setTermFilter(e.target.value)}
            style={{ padding: "10px 12px", border: "1px solid var(--border-color)", borderRadius: 10,
              fontSize: 13, cursor: "pointer", background: "#0f172a", color: "#ffffff" }}>
            <option style={{ background: "#0f172a" }} value="All">All Terms</option>
            <option style={{ background: "#0f172a" }} value="1st Semester">1st Semester</option>
            <option style={{ background: "#0f172a" }} value="2nd Semester">2nd Semester</option>
          </select>
          {(role === "register" || role === "developer" || role === "owner") && (
            <Btn variant="primary" onClick={openAdd}>+ Add Student</Btn>
          )}
        </div>
        <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 10 }}>
          Showing {filtered.length} of {students.length} students
        </div>
        <div className="table-container">
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
                  <tr key={s.id} style={{ borderBottom: "1px solid var(--border-color)" }}>
                    <Td><code style={{ background: "#f1f5f9", color: "#111827", padding: "2px 7px",
                      borderRadius: 5, fontSize: 12, fontWeight: 800 }}>{s.id}</code></Td>
                    <Td><div style={{ fontWeight: 700 }}>{s.name}</div></Td>
                    <Td>{s.course}</Td>
                    <Td>{s.year}</Td>
                    <Td style={{ fontSize: 12, color: "#6b7280" }}>{s.email}</Td>
                    <Td><Badge text={s.status} type={s.status === "Active" ? "green" : "red"} /></Td>
                    {role !== "student" && (
                      <>
                        <Td>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <code style={{ background: "#f1f5f9", color: "#111827", padding: "2px 7px", borderRadius: 5, fontWeight: 800 }}>{s.permit_number || "—"}</code>
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
                        {(role === "register" || role === "developer" || role === "owner") ? (
                          <>
                            <Btn variant="outline" onClick={() => openEdit(s)}
                              style={{ fontSize: 11, padding: "4px 10px" }}>✏️ Edit</Btn>
                            <Btn variant="danger" onClick={() => setDeleteConfirm(s.id)}
                              style={{ fontSize: 11, padding: "4px 10px" }}>🗑️ Delete</Btn>
                          </>
                        ) : (
                          <span style={{ fontSize: 11, color: "#94a3b8" }}>Read-only</span>
                        )}
                      </div>
                    </Td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
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

function Subjects({ subjects, setSubjects, token, role }) {
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(null);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ id: "", name: "", units: 3, professor: "", schedule: "MWF", room: "Room 101", campus: "main campus", time: "" });
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
    setForm({ id: "", name: "", units: 3, professor: "", schedule: "", room: "", campus: "", time: "" });
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
      campus: String(form.campus || "").trim(),
      time: String(form.time || "").trim(),
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
      <PageHeader title={role === "student" ? "📅 My Class Schedule" : "📚 Subject Management"} sub={role === "student" ? "View your enrolled subjects and their locations" : "Add, edit, and remove subjects from the course offerings"} />
      {msg && <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8,
        padding: "10px 16px", marginBottom: 14, color: "#15803d", fontWeight: 600, fontSize: 13 }}>{msg}</div>}
      <Card>
        <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
          <input placeholder="🔍  Search by code, name, or professor..."
            value={search} onChange={e => setSearch(e.target.value)}
            style={{ flex: 1, padding: "9px 13px", border: "1px solid #d1d5db",
              borderRadius: 8, fontSize: 13, outline: "none" }} />
          {(role === "register" || role === "developer" || role === "owner") && (
            <Btn variant="primary" onClick={openAdd}>+ Add Subject</Btn>
          )}
        </div>
        <div className="grid-1-on-mobile" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
          {filtered.map((s, i) => (
            <div key={s.id} className="glass-card" style={{ padding: 16,
              borderTop: `4px solid ${COLORS[i % COLORS.length]}`, transition: "all 0.3s ease" }}
              onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-5px)"; e.currentTarget.style.boxShadow = "var(--neon-glow)"; }}
              onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 8px 32px 0 rgba(0, 0, 0, 0.3)"; }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <code style={{ fontSize: 11, fontWeight: 800, color: "var(--neon-blue)",
                  background: "rgba(68, 215, 255, 0.1)", padding: "2px 8px", borderRadius: 5, border: "1px solid var(--border-color)" }}>{s.id}</code>
                <span style={{ fontSize: 11, background: "rgba(68, 215, 255, 0.15)", color: "var(--neon-blue)",
                  padding: "2px 8px", borderRadius: 10, fontWeight: 700, border: "1px solid var(--border-color)" }}>{s.units} Units</span>
              </div>
              <div style={{ fontWeight: 800, fontSize: 15, color: "white", margin: "6px 0 4px" }}>{s.name}</div>
              <div style={{ fontSize: 12, color: "var(--text-dim)", marginBottom: 4 }}>👨‍🏫 <span style={{ color: "white" }}>{s.professor || "No professor info available"}</span></div>
              <div style={{ fontSize: 12, color: "var(--text-dim)", marginBottom: 4 }}>🕐 <span style={{ color: "white" }}>{s.schedule} {s.time && ` | ${s.time}`}</span></div>
              <div style={{ fontSize: 12, color: "var(--text-dim)", marginBottom: 4 }}>🏢 <span style={{ color: "white" }}>{s.campus}</span></div>
              <div style={{ fontSize: 12, color: "var(--text-dim)", marginBottom: 12 }}>📍 <span style={{ color: "white" }}>{s.room}</span></div>
              <div style={{ display: "flex", gap: 7, marginTop: "auto" }}>
                {(role === "register" || role === "developer" || role === "owner") ? (
                  <>
                    <Btn variant="outline" onClick={() => openEdit(s)}
                      style={{ flex: 1, fontSize: 11, padding: "5px 8px", justifyContent: "center" }}>✏️ Edit</Btn>
                    <Btn variant="danger" onClick={() => setDeleteConfirm(s.id)}
                      style={{ flex: 1, fontSize: 11, padding: "5px 8px", justifyContent: "center" }}>🗑️ Delete</Btn>
                  </>
                ) : (
                  <div style={{ fontSize: 12, color: "var(--neon-blue)", fontWeight: 800, textAlign: "center", width: "100%", padding: "8px", background: "rgba(68, 215, 255, 0.1)", borderRadius: 8, border: "1px dashed var(--border-color)" }}>
                    {role === "student" ? "✓ ENROLLED" : "READ-ONLY ACCESS"}
                  </div>
                )}
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
        <Input label="Time" placeholder="e.g. 8:00 AM - 10:00 AM"
          value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Select label="Schedule" value={form.schedule} onChange={e => setForm(f => ({ ...f, schedule: e.target.value }))}>
            <option value="Monday">Monday</option>
            <option value="Tuesday">Tuesday</option>
            <option value="Wednesday">Wednesday</option>
            <option value="Thursday">Thursday</option>
            <option value="Friday">Friday</option>
            <option value="Saturday">Saturday</option>
            <option value="Sunday">Sunday</option>
          </Select>
          <Select label="Campus" value={form.campus} onChange={e => setForm(f => ({ ...f, campus: e.target.value }))}>
            <option value="main campus">main campus</option>
            <option value="annex 1">annex 1</option>
            <option value="annex 2">annex 2</option>
            <option value="annex 3">annex 3</option>
            <option value="annex 4">annex 4</option>
          </Select>
          <Input label="Room" placeholder="e.g. Room 101"
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

function StudentManagement({ token, role, students, allSubjects, grades, setGrades }) {
  const [selectedStudent, setSelectedStudent] = useState("");
  const [assigned, setAssigned] = useState([]);
  const [searchStu, setSearchStu] = useState("");
  const [msg, setMsg] = useState("");
  const [editSubject, setEditSubject] = useState(null);
  const [editForm, setEditForm] = useState({ name: "", units: 3, professor: "", schedule: "MWF", room: "Room 101", campus: "main campus", time: "" });
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
      room: s.room || "",
      campus: s.campus || "",
      time: s.time || ""
    });
  };
  const saveEdit = async () => {
    try {
      const payload = {
        name: String(editForm.name || "").trim(),
        units: Number(editForm.units),
        professor: String(editForm.professor || "").trim(),
        schedule: String(editForm.schedule || "").trim(),
        room: String(editForm.room || "").trim(),
        campus: String(editForm.campus || "").trim(),
        time: String(editForm.time || "").trim()
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
      <div className="grid-1-on-mobile" style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 18 }}>
        <Card title="Select Student">
          <input placeholder="🔍 Search..." value={searchStu} onChange={e => setSearchStu(e.target.value)}
            style={{ width: "100%", padding: "10px 14px", border: "1px solid var(--border-color)", borderRadius: 10, fontSize: 12, outline: "none", marginBottom: 12, background: "#0f172a", color: "#ffffff" }} />
          <div style={{ maxHeight: 420, overflowY: "auto" }}>
            {filteredStudents.map(s => (
              <div key={s.id} onClick={() => setSelectedStudent(s.id)} style={{
                padding: "10px 12px", borderRadius: 8, cursor: "pointer", marginBottom: 4,
                background: selectedStudent === s.id ? "rgba(68, 215, 255, 0.15)" : "rgba(255,255,255,0.08)",
                border: `1.5px solid ${selectedStudent === s.id ? "var(--neon-blue)" : "transparent"}`,
                transition: "all 0.15s",
              }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: selectedStudent === s.id ? "white" : "var(--text-main)" }}>{s.name}</div>
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
                  <div className="table-container">
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                      <thead>
                        <tr><Th>Code</Th><Th>Name</Th><Th>Units</Th><Th>Professor</Th><Th>Schedule</Th><Th>Time</Th><Th>Campus</Th><Th>Room</Th><Th>Actions</Th></tr>
                      </thead>
                      <tbody>
                        {assigned.map(s => (
                          <tr key={s.id} style={{ borderBottom: "1px solid var(--border-color)" }}>
                            <Td><code style={{ background: "#f1f5f9", color: "#111827", padding: "2px 7px", borderRadius: 5, fontWeight: 800 }}>{s.id}</code></Td>
                            <Td><strong>{s.name}</strong></Td>
                            <Td>{s.units}</Td>
                            <Td>{s.professor || "-"}</Td>
                            <Td>{s.schedule || "-"}</Td>
                            <Td>{s.time || "-"}</Td>
                            <Td>{s.campus || "-"}</Td>
                            <Td>{s.room || "-"}</Td>
                            <Td>
                              <div style={{ display: "flex", gap: 6 }}>
                                <Btn variant="outline" onClick={() => openEdit(s)} style={{ fontSize: 11, padding: "4px 8px" }}>✏️ Edit</Btn>
                                <Btn variant="danger" disabled={role === "teacher"} onClick={() => removeSubject(s.id)} style={{ fontSize: 11, padding: "4px 8px" }}>🗑️ Remove</Btn>
                              </div>
                            </Td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
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
          <Input label="Time" value={editForm.time} onChange={e => setEditForm({ ...editForm, time: e.target.value })} />
          <Select label="Schedule" value={editForm.schedule} onChange={e => setEditForm(f => ({ ...f, schedule: e.target.value }))}>
            <option value="Monday">Monday</option>
            <option value="Tuesday">Tuesday</option>
            <option value="Wednesday">Wednesday</option>
            <option value="Thursday">Thursday</option>
            <option value="Friday">Friday</option>
            <option value="Saturday">Saturday</option>
            <option value="Sunday">Sunday</option>
          </Select>
          <Select label="Campus" value={editForm.campus} onChange={e => setEditForm(f => ({ ...f, campus: e.target.value }))}>
            <option value="main campus">main campus</option>
            <option value="annex 1">annex 1</option>
            <option value="annex 2">annex 2</option>
            <option value="annex 3">annex 3</option>
            <option value="annex 4">annex 4</option>
          </Select>
          <Input label="Room" placeholder="e.g. Room 101"
            value={editForm.room} onChange={e => setEditForm(f => ({ ...f, room: e.target.value }))} />
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

  const student = useMemo(() => students.find(s => s.id === selectedStudent) || (role === "student" && selectedStudent ? { id: selectedStudent, name: selectedStudent, course: "" } : null), [students, selectedStudent, role]);
  const studentGrades = useMemo(() => selectedStudent ? (grades[selectedStudent] || {}) : {}, [selectedStudent, grades]);
  const enrolledSubjects = useMemo(() => role === "student"
    ? Object.keys(studentGrades).map(id => subjects.find(s => s.id === id) || ({ id, name: id }))
    : subjects.filter(s => studentGrades[s.id]).filter(s => (semesterId ? String(s.semester_id || "") === String(semesterId) : true)), [role, studentGrades, subjects, semesterId]);
  const availableSubjects = useMemo(() => subjects.filter(s => !studentGrades[s.id]), [subjects, studentGrades]);

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

      <div className="grid-1-on-mobile" style={{ display: "grid", gridTemplateColumns: role !== "student" ? "260px 1fr" : "1fr", gap: 18 }}>
        {role !== "student" && (
          <Card title="Select Student">
            <input placeholder="🔍 Search..." value={searchStu} onChange={e => setSearchStu(e.target.value)}
              style={{ width: "100%", padding: "10px 14px", border: "1px solid var(--border-color)", borderRadius: 10, fontSize: 12, outline: "none", marginBottom: 12, background: "#0f172a", color: "white" }} />
            <div style={{ maxHeight: 400, overflowY: "auto" }}>
              {filteredStudents.map(s => (
                <div key={s.id} onClick={() => setSelectedStudent(s.id)} style={{
                  padding: "10px 12px", borderRadius: 8, cursor: "pointer", marginBottom: 4,
                  background: selectedStudent === s.id ? "rgba(68, 215, 255, 0.15)" : "rgba(255,255,255,0.08)",
                  border: `1.5px solid ${selectedStudent === s.id ? "var(--neon-blue)" : "transparent"}`,
                  transition: "all 0.15s",
                }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: selectedStudent === s.id ? "white" : "var(--text-main)" }}>{s.name}</div>
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
                  <div style={{ fontWeight: 800, fontSize: 17, color: "white" }}>{student.name}</div>
                  <div style={{ fontSize: 12, opacity: 0.8, color: "var(--neon-blue)" }}>{student.id} · {student.course}</div>
                </div>
                <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
                  {gpa && (
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 10, opacity: 0.6 }}>GWA</div>
                      <div style={{ fontSize: 22, fontWeight: 900 }}>{toGPA(parseFloat(gpa))}</div>
                    </div>
                  )}
                  {(role === "teacher" || role === "register" || role === "developer" || role === "owner") && (
                    <Btn variant="success" onClick={() => {
                        if (availableSubjects.length === 0) return;
                        setForm({ subjectId: availableSubjects[0].id, prelim: "", midterm: "", prefinal: "", final: "" });
                        setEditingSubj(null); setModal("form");
                    }} disabled={availableSubjects.length === 0}>+ Add Grade</Btn>
                  )}
                </div>
              </div>

              <Card title={`Grade Records (${enrolledSubjects.length})`}>
                <div className="table-container">
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr>{["Code","Subject","Prelim","Midterm","Pre-Final","Final","Average","GPA","Remarks", ...(role !== "student" ? ["Actions"] : [])].map(h => <Th key={h}>{h}</Th>)}</tr>
                  </thead>
                  <tbody>
                    {enrolledSubjects.map(subj => {
                      const g = studentGrades[subj.id];
                      const avg = computeGrade(g);
                      return (
                        <tr key={subj.id} style={{ borderBottom: "1px solid var(--border-color)" }}>
                          <Td>{subj.id}</Td>
                          <Td>
                            <strong>{subj.name}</strong>
                            <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 4 }}>
                              📍 {subj.room || "-"} | 🏢 {subj.campus || "-"}
                            </div>
                          </Td>
                          <Td><GradeCell val={g.prelim} /></Td>
                          <Td><GradeCell val={g.midterm} /></Td>
                          <Td><GradeCell val={g.prefinal} /></Td>
                          <Td><GradeCell val={g.final} /></Td>
                          <Td><strong>{avg}%</strong></Td>
                          <Td><strong>{toGPA(avg)}</strong></Td>
                          <Td><Badge text={avg >= 75 ? "PASSED" : "FAILED"} type={avg >= 75 ? "green" : "red"} /></Td>
                          {(role === "teacher" || role === "register" || role === "developer" || role === "owner") ? (
                            <Td>
                              <div style={{ display: "flex", gap: 5 }}>
                                <Btn variant="outline" onClick={() => {
                                    setForm({ subjectId: subj.id, prelim: g.prelim, midterm: g.midterm, prefinal: g.prefinal, final: g.final });
                                    setEditingSubj(subj.id); setModal("form");
                                }} style={{ fontSize: 10, padding: "3px 8px" }}>✏️</Btn>
                                <Btn variant="danger" onClick={() => setDeleteConfirm(subj.id)} style={{ fontSize: 10, padding: "3px 8px" }}>🗑️</Btn>
                              </div>
                            </Td>
                          ) : role !== "student" ? (
                            <Td><span style={{ fontSize: 11, color: "#94a3b8" }}>Read-only</span></Td>
                          ) : null}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
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
      onAuthed({ token: r.token, role: r.role, username: r.username, student_id: r.student_id || null, full_name: r.full_name || null });
    } catch (e) {
      setMsg(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "grid", placeItems: "center", minHeight: "100vh", background: "var(--bg-dark)", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", width: "600px", height: "600px", background: "radial-gradient(circle, rgba(68,215,255,0.1) 0%, transparent 70%)", top: "-10%", left: "-10%" }} />
      <div style={{ position: "absolute", width: "800px", height: "800px", background: "radial-gradient(circle, rgba(37,99,235,0.05) 0%, transparent 70%)", bottom: "-20%", right: "-10%" }} />
      
      <div className="glass-card" style={{ width: 420, padding: 48, boxShadow: "0 25px 80px rgba(0,0,0,0.6)", zIndex: 1, textAlign: "center" }}>
        <div className="neon-border" style={{ width: 80, height: 80, background: "rgba(68, 215, 255, 0.1)", borderRadius: 20, margin: "0 auto 32px", display: "flex", alignItems: "center", justifyContent: "center" }}>
           <span style={{ fontSize: 40 }}>🎓</span>
        </div>
        <div className="glow-text" style={{ fontSize: 28, fontWeight: 900, marginBottom: 8, color: "white", letterSpacing: "-0.5px" }}>STUDENT<span style={{ color: "var(--neon-blue)" }}>DASHBOARD</span></div>
        <div style={{ fontSize: 13, color: "var(--text-dim)", marginBottom: 40, fontWeight: 500 }}>
          STUDENT SUBJECT TRACKING PORTAL
        </div>
        
        <div style={{ textAlign: "left" }}>
          <Input label="ACCESS KEY (USERNAME)" value={u} onChange={e => setU(e.target.value)} placeholder="Enter username" style={{ padding: "14px 18px" }} />
          <Input label="SECURITY PHRASE (PASSWORD)" type="password" value={p} onChange={e => setP(e.target.value)} placeholder="••••••••" style={{ padding: "14px 18px" }} />
        </div>
        
        <Btn variant="primary" onClick={submit} disabled={loading || !u || !p} style={{ width: "100%", padding: "16px", fontSize: 15, marginTop: 20 }}>
          INITIALIZE SESSION
        </Btn>
        
        {msg && <div style={{ marginTop: 20, fontSize: 13, color: "#f87171", fontWeight: 700, background: "rgba(248,113,113,0.1)", padding: "10px", borderRadius: 10 }}>⚠️ {msg}</div>}
        
        <div style={{ marginTop: 40, fontSize: 11, color: "var(--text-dim)", lineHeight: 1.6, fontWeight: 500 }}>
          SYSTEM SECURITY PROTOCOL ACTIVE.<br/>
          UNAUTHORIZED ACCESS IS STRICTLY PROHIBITED.
        </div>
      </div>
    </div>
  );
}

function PermissionsEditor({ userId, token }) {
  const [perms, setPerms] = useState([]);
  const [loading, setLoading] = useState(true);
  const modules = ["dashboard", "students", "subjects", "grades", "permits", "payments", "search", "attendance", "users", "debug"];

  useEffect(() => {
    api(`/users/${userId}/permissions`, {}, token)
      .then(data => { setPerms(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [userId, token]);

  const toggle = async (mod, col, current) => {
    const existing = perms.find(p => p.module === mod);
    const body = {
      module: mod,
      can_read: col === "can_read" ? !current : (existing?.can_read || 0),
      can_write: col === "can_write" ? !current : (existing?.can_write || 0),
      can_delete: col === "can_delete" ? !current : (existing?.can_delete || 0)
    };
    try {
      await api(`/users/${userId}/permissions`, { method: "POST", body }, token);
      const fresh = await api(`/users/${userId}/permissions`, {}, token);
      setPerms(fresh);
    } catch (e) { alert(e.message); }
  };

  const removeOverride = async (mod) => {
    try {
      await api(`/users/${userId}/permissions/${mod}`, { method: "DELETE" }, token);
      const fresh = await api(`/users/${userId}/permissions`, {}, token);
      setPerms(fresh);
    } catch (e) { alert(e.message); }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div style={{ padding: 4 }}>
      <p style={{ fontSize: 12, color: "var(--text-dim)", marginBottom: 16 }}>
        User-specific overrides. If a module is not listed, the role's default permissions apply.
      </p>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr><Th>Module</Th><Th>Read</Th><Th>Write</Th><Th>Delete</Th><Th></Th></tr>
        </thead>
        <tbody>
          {modules.map(mod => {
            const p = perms.find(x => x.module === mod);
            const isSet = !!p;
            const vals = p || { can_read: 0, can_write: 0, can_delete: 0 };
            return (
              <tr key={mod} style={{ borderBottom: "1px solid var(--border-color)", opacity: isSet ? 1 : 0.6 }}>
                <Td><strong>{mod}</strong></Td>
                <Td><input type="checkbox" checked={!!vals.can_read} onChange={() => toggle(mod, "can_read", vals.can_read)} /></Td>
                <Td><input type="checkbox" checked={!!vals.can_write} onChange={() => toggle(mod, "can_write", vals.can_write)} /></Td>
                <Td><input type="checkbox" checked={!!vals.can_delete} onChange={() => toggle(mod, "can_delete", vals.can_delete)} /></Td>
                <Td>
                  {isSet && <button onClick={() => removeOverride(mod)} style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer", fontSize: 11 }}>Reset</button>}
                </Td>
              </tr>
            );
          })}
        </tbody>
      </table>
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
  const [fullName, setFullName] = useState("");
  const [msg, setMsg] = useState("");
  const [edit, setEdit] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);
  const [permModal, setPermModal] = useState(null);
  const [hardDel, setHardDel] = useState(false);
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    try {
      const users = await api("/users", {}, token);
      setList(users);
    } catch (e) {
      setMsg(e.message);
    }
  }, [token]);
  useEffect(() => { load(); }, [load]);
  const createUser = async () => {
    try {
      setBusy(true);
      if (!u || !p) throw new Error("Missing username or password");
      const body = { username: u, password: p, role: r, user_type: ut, full_name: fullName.trim() || null };
      if (r === "student" && studentIdLink.trim()) body.student_id = studentIdLink.trim();
      await api("/users", { method: "POST", body }, token);
      setU(""); setP(""); setR("teacher"); setUT("teacher"); setStudentIdLink(""); setFullName(""); setMsg("User created");
      load();
    } catch (e) {
      setMsg(e.message);
    } finally {
      setBusy(false);
    }
  };
  const openEdit = (user) => {
    setEdit({ id: user.id, username: user.username, role: user.role, user_type: user.user_type || user.role, full_name: user.full_name || "", password: "" });
  };
  const saveEdit = async () => {
    try {
      setBusy(true);
      if (!edit.username) throw new Error("Username required");
      const body = { username: edit.username, role: edit.role, user_type: edit.user_type, full_name: edit.full_name.trim() || null };
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
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
          <Input label="Full Name (Optional)" value={fullName} onChange={e => setFullName(e.target.value)} />
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
          <div style={{ display: "flex", alignItems: "flex-end", marginBottom: 16 }}>
             <Btn variant="primary" onClick={createUser} disabled={!u || !p || busy} style={{ width: "100%" }}>Create</Btn>
          </div>
        </div>
      </Card>
      <Card title="Users">
        <div className="table-container">
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead><tr><Th>Full Name</Th><Th>Username</Th><Th>Role</Th><Th>User Type</Th><Th>Created</Th><Th>Actions</Th></tr></thead>
          <tbody>
            {list.map(x => (
              <tr key={x.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                <Td><strong>{x.full_name || "-"}</strong></Td>
                <Td>{x.username}</Td>
                <Td><Badge text={x.role} type={x.role === "teacher" ? "blue" : x.role === "developer" ? "yellow" : "green"} /></Td>
                <Td>{x.user_type || "-"}</Td>
                <Td style={{ color: "#6b7280", fontSize: 12 }}>{x.created_at}</Td>
                <Td>
                  <div style={{ display: "flex", gap: 6 }}>
                    <Btn variant="outline" onClick={() => openEdit(x)} style={{ fontSize: 11, padding: "4px 10px" }}>Edit</Btn>
                    <Btn variant="outline" onClick={() => setPermModal(x)} style={{ fontSize: 11, padding: "4px 10px", borderColor: "var(--neon-blue)" }}>🛡️ Perms</Btn>
                    <Btn variant="danger" onClick={() => setConfirmDel(x.id)} style={{ fontSize: 11, padding: "4px 10px" }}>Delete</Btn>
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
      <Modal show={!!edit} title="Edit User" onClose={() => setEdit(null)}>
        {edit && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Input label="Full Name" value={edit.full_name} onChange={e => setEdit(s => ({ ...s, full_name: e.target.value }))} />
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
      <Modal show={!!permModal} title={`🛡️ User Permissions: ${permModal?.username}`} onClose={() => setPermModal(null)} width={600}>
        {permModal && <PermissionsEditor userId={permModal.id} token={token} />}
      </Modal>
    </div>
  );
}

function LogsView({ token }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterAction, setFilterAction] = useState("");
  const [filterDate, setFilterDate] = useState("");

  const refresh = useCallback(() => {
    setLoading(true);
    let path = "/audit-logs";
    const params = new URLSearchParams();
    if (filterAction) params.append("action", filterAction);
    if (filterDate) params.append("date", filterDate);
    if (params.toString()) path += "?" + params.toString();

    api(path, {}, token)
      .then(d => { setLogs(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [token, filterAction, filterDate]);

  useEffect(() => { refresh(); }, [refresh]);

  const uniqueActions = ["LOGIN", "CREATE", "UPDATE", "DELETE", "ATTENDANCE_SET", "ENROLL", "UNENROLL", "PAYMENT", "GRADE_UPDATE"];

  return (
    <div>
      <PageHeader title="📜 System Audit Logs" sub="Track system-wide activities" />
      
      <Card title="Recent Activity" action={<Btn variant="outline" onClick={refresh}>🔄 Refresh</Btn>}>
        <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div style={{ width: 220 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase", marginBottom: 6, display: "block" }}>Action</label>
            <select value={filterAction} onChange={e => setFilterAction(e.target.value)}
              style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--border-color)", borderRadius: 10, background: "#0f172a", color: "#ffffff", outline: "none" }}>
              <option value="">All Actions</option>
              {uniqueActions.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div style={{ width: 180 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase", marginBottom: 6, display: "block" }}>Date</label>
            <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)}
              style={{ width: "100%", padding: "9px 12px", border: "1px solid var(--border-color)", borderRadius: 10, background: "#0f172a", color: "#ffffff", outline: "none" }} />
          </div>
          <Btn variant="ghost" onClick={() => { setFilterAction(""); setFilterDate(""); }}>Clear</Btn>
        </div>

        <div className="table-container">
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr>
                <Th>Time</Th>
                <Th>User</Th>
                <Th>Action</Th>
                <Th>Entity</Th>
                <Th>ID</Th>
                <Th>Details</Th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ textAlign: "center", padding: 40, color: "var(--text-dim)" }}>Loading...</td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: "center", padding: 40, color: "var(--text-dim)" }}>No results.</td></tr>
              ) : (
                logs.map(log => (
                  <tr key={log.id} style={{ borderBottom: "1px solid var(--border-color)" }}>
                    <Td style={{ fontSize: 11, color: "var(--text-dim)" }}>{new Date(log.created_at).toLocaleString()}</Td>
                    <Td>
                      <div style={{ fontWeight: 800, fontSize: 13 }}>{log.username || "(system)"}</div>
                      <div style={{ fontSize: 10, color: "var(--text-dim)", opacity: 0.7 }}>{log.user_role}</div>
                    </Td>
                    <Td><Badge text={log.action} type={log.action === "DELETE" ? "red" : (log.action === "CREATE" ? "green" : "blue")} /></Td>
                    <Td style={{ fontWeight: 700, color: "var(--neon-blue)" }}>{log.entity}</Td>
                    <Td><code style={{ fontSize: 11 }}>{log.entity_id}</code></Td>
                    <Td style={{ fontSize: 12, color: "var(--text-dim)", maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{log.details}</Td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
