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
  await j("/users", { method: "POST", token: d, body: { username: "reg1", password: "admin123", role: "register", user_type: "register" } });

  const reg = await j("/auth/login", { method: "POST", body: { username: "reg1", password: "admin123" } });
  ok("register login", reg.ok);
  if (!reg.ok) return;
  const tok = reg.data.token;

  // Ensure student and subject exist
  await j("/students", { method: "POST", token: d, body: { id: "TST-0003", name: "Reg Student", course: "BSIS", year: "3rd Year", email: "reg@stu.edu", status: "Active" } });
  await j("/subjects", { method: "POST", token: tok, body: { id: "IS201", name: "Systems", units: 3, professor: "", schedule: "", room: "" } });

  // Create grade
  const cg = await j("/grades", { method: "POST", token: tok, body: { student_id: "TST-0003", subject_id: "IS201", prelim: 80, midterm: 82, prefinal: 84, final: 86 } });
  ok("create grade", cg.ok);

  // Update grade
  const ug = await j("/grades/TST-0003/IS201", { method: "PUT", token: tok, body: { final: 90 } });
  ok("update grade", ug.ok);

  // Delete grade
  const dg = await j("/grades/TST-0003/IS201", { method: "DELETE", token: tok });
  ok("delete grade", dg.ok);
})(); 
