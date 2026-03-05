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
  // Login developer and create SAPS user
  const dev = await j("/auth/login", { method: "POST", body: { username: "developer", password: "admin123" } });
  if (!dev.ok) { console.log("dev login failed", dev); return; }
  const d = dev.data.token;
  await j("/users", { method: "POST", token: d, body: { username: "saps1", password: "admin123", role: "saps", user_type: "saps" } });

  // Ensure student exists
  await j("/students", { method: "POST", token: d, body: { id: "TST-0002", name: "Permit Student", course: "BSIT", year: "2nd Year", email: "permit@stu.edu", status: "Active" } });

  // Login saps
  const saps = await j("/auth/login", { method: "POST", body: { username: "saps1", password: "admin123" } });
  ok("saps login", saps.ok);
  if (!saps.ok) return;
  const tok = saps.data.token;

  // Assign permit
  const put = await j("/students/TST-0002/permit", { method: "PUT", token: tok, body: { permit_number: "PRM-2026-001" } });
  ok("assign permit", put.ok);
  if (!put.ok) console.log("PUT details", put);

  // Read permit
  const getp = await j("/students/TST-0002/permit", { token: tok });
  ok("read permit", getp.ok && getp.data.permit_number === "PRM-2026-001");
  if (!getp.ok) console.log("GET details", getp);
})(); 
