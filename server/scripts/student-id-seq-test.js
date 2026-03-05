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
  const createMany = await Promise.all(Array.from({ length: 10 }).map((_, i) =>
    j("/students", { method: "POST", token, body: { name: `Last${i}, First${i}`, course: "BSCS", year: "1st Year", email: `t${Math.random().toString(36).slice(2,7)}@e.edu`, status: "Active" } })
  ));
  const allOk = createMany.every(r => r.ok);
  ok("batch create succeeds", allOk);
  if (!allOk) {
    console.log("failures", createMany.filter(r => !r.ok));
  }
  const ids = createMany.filter(r => r.ok).map(r => r.data.id).filter(Boolean).sort();
  ok("ids match pattern", ids.every(id => new RegExp(`^${year}-\\d{6}$`).test(id)));
  const nums = ids.map(id => parseInt(id.split("-")[1], 10)).sort((a,b)=>a-b);
  const sequential = nums.every((n, i, arr) => i === 0 || n === arr[i-1] + 1);
  ok("ids are sequential without gaps", sequential);
})(); 
