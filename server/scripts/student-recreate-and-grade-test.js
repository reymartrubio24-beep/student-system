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
  const sid = "2026-0999";
  const sub = "SRGT101";
  // Ensure subject exists
  await j("/subjects", { method: "POST", token, body: { id: sub, name: "Recreate Grade Test", units: 3 } });
  // Create student
  await j("/students", { method: "POST", token, body: { id: sid, name: "Temp Student", course: "BSIT", year: "1st Year", email: "temp@edu.ph", status: "Active" } });
  // Delete student (soft)
  await j(`/students/${sid}`, { method: "DELETE", token });
  // Recreate same ID; should revive
  const revive = await j("/students", { method: "POST", token, body: { id: sid, name: "Temp Student 2", course: "BSIT", year: "2nd Year", email: "temp2@edu.ph", status: "Active" } });
  ok("student revive works", revive.ok && (revive.status === 200 || revive.status === 201));
  // Add grade now
  const c = await j("/grades", { method: "POST", token, body: { student_id: sid, subject_id: sub, prelim: 80, midterm: 80, prefinal: 80, final: 80 } });
  ok("can add grade after revive", c.ok);
})(); 
