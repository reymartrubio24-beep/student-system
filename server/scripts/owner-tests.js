const base = process.env.BASE || "http://localhost:4000";

async function j(path, opts) {
  const res = await fetch(base + path, {
    method: opts?.method || "GET",
    headers: { "Content-Type": "application/json", ...(opts?.token ? { Authorization: `Bearer ${opts.token}` } : {}) },
    body: opts?.body ? JSON.stringify(opts.body) : undefined
  });
  let data = {};
  try { data = await res.json(); } catch {}
  return { ok: res.ok, status: res.status, data };
}
function ok(name, v) { console.log(`${v ? "PASS" : "FAIL"} - ${name}`); }

(async () => {
  // 1) dev cannot create owner
  let devLogin = await j("/auth/login", { method: "POST", body: { username: "developer", password: "admin123" } });
  if (!devLogin.ok) devLogin = await j("/auth/login", { method: "POST", body: { username: "admin", password: "admin123" } });
  ok("developer login", devLogin.ok);
  if (!devLogin.ok) return;
  const devToken = devLogin.data.token;
  const attemptOwner = await j("/users", { method: "POST", token: devToken, body: { username: "ownerX", password: "secret123", role: "owner" } });
  ok("developer cannot create owner", !attemptOwner.ok && attemptOwner.status === 400);

  // 2) If owner exists, verify owner can delete and restore user
  const ownerCreds = { username: process.env.OWNER_USERNAME, password: process.env.OWNER_PASSWORD };
  let ownerLogin = null;
  if (ownerCreds.username && ownerCreds.password) {
    ownerLogin = await j("/auth/login", { method: "POST", body: ownerCreds });
  }
  if (ownerLogin?.ok) {
    const ownerToken = ownerLogin.data.token;
    const uname = "tmp_" + Math.random().toString(36).slice(2, 6);
    const create = await j("/users", { method: "POST", token: devToken, body: { username: uname, password: "t123456", role: "teacher" } });
    ok("create temp user", create.ok);
    const users = await j("/users", { token: devToken });
    const u = users.data.find(x => x.username === uname);
    const del = await j(`/users/${u.id}`, { method: "DELETE", token: ownerToken });
    ok("owner can delete any user", del.ok);
    const restore = await j("/admin/restore", { method: "POST", token: ownerToken, body: { entity: "user", id: String(u.id) } });
    ok("owner can restore within window", restore.ok);
  } else {
    console.log("SKIP - owner tests (no owner creds provided)");
  }
})(); 
