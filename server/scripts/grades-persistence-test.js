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

function log(label, pass) {
  const s = pass ? "PASS" : "FAIL";
  console.log(`${s} - ${label}`);
}

(async () => {
  const login = await j("/auth/login", { method: "POST", body: { username: "developer", password: "admin123" } });
  if (!login.ok) {
    console.log("login failed", login);
    process.exit(1);
  }
  const token = login.data.token;
  const ts = Date.now();
  const sid = `T${ts}`;
  const subid = `SUB${ts}`;

  // Ensure subject exists
  const subCreate = await j("/subjects", { method: "POST", token, body: { id: subid, name: "Persistence Test", units: 3 } });
  log("create subject (or already exists 409)", subCreate.ok || subCreate.status === 409);

  // Ensure student exists (auto-id increment logic not needed here; we use unique id)
  const stuCreate = await j("/students", { method: "POST", token, body: { id: sid, name: "Persist Tester", course: "BSCS", year: "1st Year", email: `persist${ts}@edu.ph`, status: "Active" } });
  log("create student (or already exists 409)", stuCreate.ok || stuCreate.status === 409);

  // Create grade record
  const gCreate = await j("/grades", { method: "POST", token, body: { student_id: sid, subject_id: subid, prelim: 80, midterm: 85, prefinal: 90, final: 88 } });
  log("create grade", gCreate.ok);

  // Fetch list (all) and per student to verify presence
  // Retry /grades briefly to avoid timing flakiness
  let allGrades = await j("/grades", { token });
  for (let i = 0; i < 3 && (!allGrades.ok || !Array.isArray(allGrades.data)); i++) {
    await new Promise(r => setTimeout(r, 100));
    allGrades = await j("/grades", { token });
  }
  const byStudent = await j(`/grades/${sid}`, { token });
  const inAll = allGrades.ok && Array.isArray(allGrades.data) && allGrades.data.find(r => r.student_id === sid && r.subject_id === subid);
  const inStudent = byStudent.ok && Array.isArray(byStudent.data) && byStudent.data.find(r => r.student_id === sid && r.subject_id === subid);
  log("grade visible in /grades", !!inAll);
  log("grade visible in /grades/:studentId", !!inStudent);

  // Update grade
  const gUpdate = await j(`/grades/${sid}/${subid}`, { method: "PUT", token, body: { final: 90 } });
  log("update grade", gUpdate.ok);

  // Verify update reflected
  const afterUpdate = await j(`/grades/${sid}`, { token });
  const updated = afterUpdate.ok && afterUpdate.data.find(r => r.student_id === sid && r.subject_id === subid && r.final === 90);
  log("grade update persisted", !!updated);

  // Delete and verify
  const gDelete = await j(`/grades/${sid}/${subid}`, { method: "DELETE", token });
  log("delete grade", gDelete.ok);
  const afterDelete = await j(`/grades/${sid}`, { token });
  const stillThere = afterDelete.ok && afterDelete.data.find(r => r.student_id === sid && r.subject_id === subid);
  log("grade removed", !stillThere);
})(); 
