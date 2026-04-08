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

  const cases = [
    { name: "De la Cruz, Maria", expectBase: "delacruz" },
    { name: "O'Neil, Sam", expectBase: "oneil" },
    { name: "Van der Waals, Alex", expectBase: "waals" },
    { name: "Lopez", expectBase: "lopez" }
  ];
  const created = [];
  for (const c of cases) {
    const r = await j("/students", { method: "POST", token, body: { name: c.name, course: "BSCS", year: "1st Year", email: `u${Math.random().toString(36).slice(2,7)}@e.edu`, status: "Active" } });
    ok(`create ${c.name}`, r.ok);
    if (r.ok) created.push(r.data.username);
  }
  ok("usernames sanitized", created.every(u => /^[a-z0-9\-]+$/.test(u)));
  const dupe1 = await j("/students", { method: "POST", token, body: { name: "Lopez, Juan", course: "BSCS", year: "1st Year", email: `u${Math.random().toString(36).slice(2,7)}@e.edu`, status: "Active" } });
  const dupe2 = await j("/students", { method: "POST", token, body: { name: "Lopez, Ana", course: "BSCS", year: "1st Year", email: `u${Math.random().toString(36).slice(2,7)}@e.edu`, status: "Active" } });
  ok("duplicate base handled", dupe1.ok && dupe2.ok && dupe1.data.username !== dupe2.data.username);
})(); 
