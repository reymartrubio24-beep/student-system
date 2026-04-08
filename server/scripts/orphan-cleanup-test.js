const base = "http://localhost:4000";

async function j(path, { method = "GET", token, body } = {}) {
  const res = await fetch(base + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: "Bearer " + token } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

function ok(label, pass) {
  console.log(`${pass ? "PASS" : "FAIL"} - ${label}`);
}

(async () => {
  const login = await j("/auth/login", { method: "POST", body: { username: "developer", password: "admin123" } });
  if (!login.ok) { console.log("login failed", login); process.exit(1); }
  const token = login.data.token;

  // Soft delete all students/subjects (if any)
  const students = await j("/students", { token });
  for (const s of students.data || []) {
    await j(`/students/${s.id}`, { method: "DELETE", token });
  }
  const subjects = await j("/subjects", { token });
  for (const b of subjects.data || []) {
    await j(`/subjects/${b.id}`, { method: "DELETE", token });
  }

  // Run cleanup
  const cleanup = await j("/admin/cleanup-orphan-grades", { method: "POST", token });
  ok("cleanup endpoint ran", cleanup.ok);
  if (!cleanup.ok) console.log("cleanup details", cleanup);

  // Verify /grades shows none
  const grades = await j("/grades", { token });
  ok("no active grades after cleanup", grades.ok && Array.isArray(grades.data) && grades.data.length === 0);
  if (!(grades.ok && Array.isArray(grades.data) && grades.data.length === 0)) {
    console.log("grades payload", grades);
  }
})(); 
