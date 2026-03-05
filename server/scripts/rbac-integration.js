const base = "http://localhost:4000";

async function json(res) {
  const t = await res.text();
  try { return JSON.parse(t); } catch { return {}; }
}

async function login(username, password) {
  const r = await fetch(base + "/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
  });
  const d = await json(r);
  if (!r.ok) throw new Error("login failed: " + (d.error || r.status));
  return d.token;
}

async function devToken() {
  return login("developer", "admin123");
}

async function ensureUser(token, username, password, role, user_type, student_id) {
  // Try create; ignore conflicts
  const r = await fetch(base + "/users", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
    body: JSON.stringify({ username, password, role, user_type, ...(student_id ? { student_id } : {}) })
  });
  if (r.status === 409) return;
  if (!r.ok) {
    const d = await json(r);
    console.log("ensureUser failed", username, r.status, d);
  }
}

async function ensureStudent(token, data) {
  const r = await fetch(base + "/students", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
    body: JSON.stringify(data)
  });
  const d = await json(r);
  if (!r.ok) throw new Error("create student failed: " + (d.error || r.status));
  return d.id || data.id;
}

async function run() {
  console.log("RBAC integration checks starting...");
  const dev = await devToken();

  // Prepare a student
  const sid = await ensureStudent(dev, {
    name: "Test Student",
    course: "BSCS",
    year: "1st Year",
    email: "student@example.com",
    status: "Active",
    birth_year: "2006"
  });
  await ensureUser(dev, "student1", "stud1234", "student", "student", sid);
  await ensureUser(dev, "cashier1", "cash1234", "cashier", "cashier");
  await ensureUser(dev, "register1", "reg1234", "register", "teacher");
  await ensureUser(dev, "saps1", "saps1234", "saps", "teacher");
  await ensureUser(dev, "teacher1", "teach1234", "teacher", "teacher");

  const studentToken = await login("student1", "stud1234");
  const cashierToken = await login("cashier1", "cash1234");
  const registrarToken = await login("register1", "reg1234");
  const sapsToken = await login("saps1", "saps1234");
  const teacherToken = await login("teacher1", "teach1234");

  // Student: cannot view other payments/grades
  const stuGradesSelf = await fetch(base + "/grades", { headers: { Authorization: "Bearer " + studentToken } });
  console.log("student /grades", stuGradesSelf.status);
  const stuGradesOther = await fetch(base + "/grades/0000-0000", { headers: { Authorization: "Bearer " + studentToken } });
  console.log("student /grades/:other", stuGradesOther.status, stuGradesOther.status === 403 ? "OK" : "FAIL");

  // Student: cannot view other payments
  const stuPayOther = await fetch(base + "/payments/0000-0000", { headers: { Authorization: "Bearer " + studentToken } });
  console.log("student /payments/:other", stuPayOther.status, stuPayOther.status === 403 ? "OK" : "FAIL");

  // Issue a permit via SAPS to the student
  // Pick an existing semester/period
  const semResp = await fetch(base + "/semesters", { headers: { Authorization: "Bearer " + sapsToken } });
  const sems = await json(semResp);
  const semId = sems[0]?.id;
  let periodId = null;
  if (semId) {
    const perResp = await fetch(base + `/semesters/${semId}/periods`, { headers: { Authorization: "Bearer " + sapsToken } });
    const periods = await json(perResp);
    periodId = periods[0]?.id;
  }
  if (periodId) {
    const assign = await fetch(base + `/students/${encodeURIComponent(sid)}/permits`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + sapsToken },
      body: JSON.stringify({ permit_period_id: periodId, status: "active" })
    });
    console.log("assign permit", assign.status, assign.status === 201 ? "OK" : "CHECK");
  } else {
    console.log("No period found to assign permit, skipping.");
  }

  // Student sees own permits
  const myPermits = await fetch(base + "/my-permits", { headers: { Authorization: "Bearer " + studentToken } });
  console.log("student /my-permits", myPermits.status, myPermits.status === 200 ? "OK" : "FAIL");
  const myPermitsRows = await json(myPermits);
  console.log("permits count", Array.isArray(myPermitsRows) ? myPermitsRows.length : "n/a");

  // Auto-linking test: create a student-only user with username == student ID, then login and read /my-permits
  const aliasU = `${sid}`;
  await ensureUser(dev, aliasU, "aliaspass1", "student", "student");
  const aliasTok = await login(aliasU, "aliaspass1");
  const aliasPerms = await fetch(base + "/my-permits", { headers: { Authorization: "Bearer " + aliasTok } });
  console.log("alias /my-permits", aliasPerms.status, aliasPerms.status === 200 ? "OK" : "FAIL");

  // Cashier: cannot read subjects
  const cashierSubjects = await fetch(base + "/subjects", { headers: { Authorization: "Bearer " + cashierToken } });
  console.log("cashier /subjects", cashierSubjects.status, cashierSubjects.status === 403 ? "OK" : "FAIL");

  // Registrar: can access subjects
  const regSubjects = await fetch(base + "/subjects", { headers: { Authorization: "Bearer " + registrarToken } });
  console.log("registrar /subjects", regSubjects.status, regSubjects.status === 200 ? "OK" : "FAIL");

  // SAPS: can list semesters (permits read)
  const sapsSem = await fetch(base + "/semesters", { headers: { Authorization: "Bearer " + sapsToken } });
  console.log("saps /semesters", sapsSem.status, sapsSem.status === 200 ? "OK" : "FAIL");

  // Teacher: rooms endpoint
  const tRooms = await fetch(base + "/teacher/rooms", { headers: { Authorization: "Bearer " + teacherToken } });
  console.log("teacher /rooms", tRooms.status, [200,403].includes(tRooms.status) ? "OK" : "CHECK"); // may be 200 with empty, or 403 if no auth seeded

  console.log("RBAC integration checks done.");
}

run().catch(e => { console.error(e); process.exit(1); });
