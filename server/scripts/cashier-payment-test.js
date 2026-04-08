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
  await j("/users", { method: "POST", token: d, body: { username: "cash1", password: "admin123", role: "cashier", user_type: "cashier" } });
  await j("/students", { method: "POST", token: d, body: { id: "TST-0004", name: "Cashier Student", course: "BSCS", year: "1st Year", email: "cash@stu.edu", status: "Active" } });
  // Set tuition balance
  await j("/students/TST-0004/tuition-balance", { method: "PUT", token: d, body: { amount: 5000 } });

  const cashier = await j("/auth/login", { method: "POST", body: { username: "cash1", password: "admin123" } });
  ok("cashier login", cashier.ok);
  if (!cashier.ok) return;
  const tok = cashier.data.token;

  const before = await j("/students/TST-0004/tuition-balance", { token: tok });
  ok("read balance before", before.ok);
  const pay = await j("/payments", { method: "POST", token: tok, body: { student_id: "TST-0004", amount: 1500, method: "cash", reference: "OR-001" } });
  ok("record payment", pay.ok);
  const after = await j("/students/TST-0004/tuition-balance", { token: tok });
  ok("balance decreased", after.ok && Number(after.data.tuition_balance) === Number(before.data.tuition_balance) - 1500);
  const history = await j("/payments/TST-0004", { token: tok });
  ok("history includes payment", history.ok && Array.isArray(history.data) && history.data.length > 0);
})(); 
