const base = process.env.BASE || "http://localhost:4000";

async function j(path, opts) {
  const res = await fetch(base + path, {
    method: opts?.method || "GET",
    headers: { "Content-Type": "application/json", ...(opts?.token ? { Authorization: `Bearer ${opts.token}` } : {}) },
    body: opts?.body ? JSON.stringify(opts.body) : undefined
  });
  let data = {};
  try { data = await res.json(); } catch {}
  return { ok: res.ok, status: res.status, data };
}

function log(step, pass, extra) {
  console.log(`${pass ? "PASS" : "FAIL"} - ${step}${extra ? " - " + extra : ""}`);
}

(async () => {
  let devLogin = await j("/auth/login", { method: "POST", body: { username: "developer", password: "admin123" } });
  if (!devLogin.ok) devLogin = await j("/auth/login", { method: "POST", body: { username: "admin", password: "admin123" } });
  log("developer login", devLogin.ok);
  if (!devLogin.ok) return;
  const devToken = devLogin.data.token;

  const unameT = "teacher_" + Math.random().toString(36).slice(2, 7);
  const unameS = "student_" + Math.random().toString(36).slice(2, 7);

  const cTeacher = await j("/users", { method: "POST", token: devToken, body: { username: unameT, password: "test123", role: "teacher" } });
  log("developer creates teacher", cTeacher.ok);

  const cStudentByDev = await j("/users", { method: "POST", token: devToken, body: { username: unameS, password: "test123", role: "student" } });
  log("developer creates student", cStudentByDev.ok);

  const sSelf = "student_self_" + Math.random().toString(36).slice(2, 7);
  const regSelf = await j("/auth/register-student", { method: "POST", body: { username: sSelf, password: "test123" } });
  log("student self-register", regSelf.ok);

  const tLogin = await j("/auth/login", { method: "POST", body: { username: unameT, password: "test123" } });
  log("teacher login", tLogin.ok);
  const sLogin = await j("/auth/login", { method: "POST", body: { username: unameS, password: "test123" } });
  log("student login", sLogin.ok);

  const teacherToken = tLogin.data?.token;
  const studentToken = sLogin.data?.token;

  const subCreateByTeacher = await j("/subjects", { method: "POST", token: teacherToken, body: { id: "TEST" + Date.now(), name: "RBAC Test", units: 3 } });
  log("teacher can create subject", subCreateByTeacher.ok);

  const subCreateByStudent = await j("/subjects", { method: "POST", token: studentToken, body: { id: "TESTX" + Date.now(), name: "RBAC Test", units: 3 } });
  log("student cannot create subject", !subCreateByStudent.ok && subCreateByStudent.status === 403);

  const listUsers = await j("/users", { token: devToken });
  log("developer can list users", listUsers.ok);
})(); 
