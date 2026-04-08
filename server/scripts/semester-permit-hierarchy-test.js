const base = process.env.BASE || "http://localhost:4000";

async function j(path, opts = {}) {
  const res = await fetch(base + path, {
    method: opts.method || "GET",
    headers: {
      "Content-Type": "application/json",
      ...(opts.token ? { Authorization: "Bearer " + opts.token } : {})
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

function ok(label, pass) {
  console.log(`${pass ? "PASS" : "FAIL"} - ${label}`);
}

(async () => {
  const dev = await j("/auth/login", { method: "POST", body: { username: "developer", password: "admin123" } });
  if (!dev.ok) { console.log("dev login failed", dev); return; }
  const d = dev.data.token;

  // Create SAPS user if missing
  await j("/users", { method: "POST", token: d, body: { username: "saps2", password: "admin123", role: "saps", user_type: "saps" } });
  const sLogin = await j("/auth/login", { method: "POST", body: { username: "saps2", password: "admin123" } });
  ok("saps login", sLogin.ok);
  if (!sLogin.ok) return;
  const tok = sLogin.data.token;

  // Ensure student
  await j("/students", { method: "POST", token: d, body: { id: "TST-SEM-0001", name: "Semester Student", course: "BSCS", year: "1st Year", email: "sem@stu.edu", status: "Active" } });

  // Create semester and bootstrap periods
  const sem = await j("/semesters", { method: "POST", token: tok, body: { school_year: "2026-2027", term: "1st" } });
  ok("create semester", sem.ok || sem.status === 409);
  const semesters = await j("/semesters", { token: tok });
  const ss = semesters.data.find(x => x.school_year === "2026-2027" && x.term === "1st");
  const sid = ss.id;
  const boot = await j(`/semesters/${sid}/bootstrap-default-periods`, { method: "POST", token: tok });
  ok("bootstrap periods", boot.ok);

  // Read periods
  const periods = await j(`/semesters/${sid}/periods`, { token: tok });
  ok("five periods exist", periods.ok && Array.isArray(periods.data) && periods.data.length >= 5);
  const names = periods.data.map(p => p.name);
  ok("contains Final Permit", names.includes("Final Permit"));

  // Assign permits for student for two periods
  const firstPrelim = periods.data.find(p => p.name.includes("First Prelim"));
  const finalPermit = periods.data.find(p => p.name.includes("Final Permit"));
  const add1 = await j(`/students/TST-SEM-0001/permits`, { method: "POST", token: tok, body: { permit_period_id: firstPrelim.id, permit_number: "PRM-FP-001" } });
  ok("assign First Prelim", add1.ok);
  const add2 = await j(`/students/TST-SEM-0001/permits`, { method: "POST", token: tok, body: { permit_period_id: finalPermit.id, permit_number: "PRM-FINAL-001" } });
  ok("assign Final", add2.ok);

  // Read student permits for semester
  const list = await j(`/students/TST-SEM-0001/permits?semester_id=${sid}`, { token: tok });
  ok("list student permits", list.ok && Array.isArray(list.data) && list.data.length >= 2);

  // Update one permit
  const upd = await j(`/students/TST-SEM-0001/permits/${firstPrelim.id}`, { method: "PUT", token: tok, body: { permit_number: "PRM-FP-002" } });
  ok("update First Prelim", upd.ok);

  // Delete one permit
  const del = await j(`/students/TST-SEM-0001/permits/${finalPermit.id}`, { method: "DELETE", token: tok });
  ok("delete Final", del.ok);

  // Verify reflects changes
  const list2 = await j(`/students/TST-SEM-0001/permits?semester_id=${sid}`, { token: tok });
  ok("list reflects changes", list2.ok && list2.data.some(r => r.permit_number === "PRM-FP-002") && !list2.data.some(r => r.permit_number === "PRM-FINAL-001"));
})(); 
