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
  console.log(`${pass ? "PASS" : "FAIL"} - ${label}`);
}

(async () => {
  const login = await j("/auth/login", { method: "POST", body: { username: "developer", password: "admin123" } });
  if (!login.ok) { console.log("login failed", login); process.exit(1); }
  const token = login.data.token;

  const ts = Date.now();
  const sid = `DUP${ts}`;
  const subid = `DUPSUB${ts}`;

  // Create subject and student
  await j("/subjects", { method: "POST", token, body: { id: subid, name: "Dup Test", units: 3 } });
  await j("/students", { method: "POST", token, body: { id: sid, name: "Dup Tester", course: "BSCS", year: "1st Year", email: `dup${ts}@edu.ph`, status: "Active" } });

  // 1) Create grade (should succeed 201)
  const c1 = await j("/grades", { method: "POST", token, body: { student_id: sid, subject_id: subid, prelim: 80, midterm: 80, prefinal: 80, final: 80 } });
  log("initial create", c1.ok && c1.status === 201);

  // 2) Delete grade (soft delete)
  const del = await j(`/grades/${sid}/${subid}`, { method: "DELETE", token });
  log("soft delete", del.ok);

  // 3) Re-create grade for same key; should now UPSERT restore instead of 409
  const c2 = await j("/grades", { method: "POST", token, body: { student_id: sid, subject_id: subid, prelim: 85, midterm: 85, prefinal: 85, final: 85 } });
  const revived = c2.ok && (c2.status === 200 || c2.status === 201);
  log("recreate after soft delete (revive)", revived);
  if (!revived) console.log("details", JSON.stringify(c2, null, 2));

  // 4) Attempt duplicate again without delete; should 409
  const c3 = await j("/grades", { method: "POST", token, body: { student_id: sid, subject_id: subid, prelim: 90, midterm: 90, prefinal: 90, final: 90 } });
  log("duplicate create blocked", !c3.ok && c3.status === 409);
})(); 
