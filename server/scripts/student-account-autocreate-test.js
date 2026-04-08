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

  const r = await j("/students", { method: "POST", token, body: { name: "Garcia, Ana", course: "BSCS", year: "1st Year", email: `a${Math.random().toString(36).slice(2,7)}@e.edu`, status: "Active" } });
  ok("student created", r.ok);
  if (!r.ok) { console.log("details", r); process.exit(1); }
  ok("id pattern", new RegExp(`^${new Date().getFullYear()}-\\d{6}$`).test(r.data.id));
  ok("username sanitized", /^[a-z0-9\-]+$/.test(r.data.username));
  await new Promise(r => setTimeout(r, 50));
  const users = await j("/users", { token });
  ok("user exists", users.ok && Array.isArray(users.data) && users.data.some(u => u.username === r.data.username && u.student_id === r.data.id));
})(); 
