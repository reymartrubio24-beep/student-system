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

function ok(label, pass) { console.log(`${pass ? "PASS" : "FAIL"} - ${label}`); }

(async () => {
  const login = await j("/auth/login", { method: "POST", body: { username: "developer", password: "admin123" } });
  if (!login.ok) { console.log("login failed", login); process.exit(1); }
  const token = login.data.token;
  const year = String(new Date().getFullYear());
  const payload = { course: "BSCS", year: "1st Year", status: "Active" };
  const emails = Array.from({ length: 20 }).map(() => `c${Math.random().toString(36).slice(2,8)}@e.edu`);
  const reqs = emails.map((e, i) => j("/students", { method: "POST", token, body: { ...payload, email: e, name: `Concurrent${i}, User${i}` } }));
  const resps = await Promise.all(reqs);
  ok("all created", resps.every(r => r.ok));
  const ids = resps.map(r => r.data.id).sort();
  ok("pattern ok", ids.every(id => new RegExp(`^${year}-\\d{6}$`).test(id)));
  const nums = ids.map(id => parseInt(id.split("-")[1], 10)).sort((a,b)=>a-b);
  const sequential = nums.every((n, i, arr) => i === 0 || n === arr[i-1] + 1);
  ok("sequential without gaps", sequential);
})(); 
