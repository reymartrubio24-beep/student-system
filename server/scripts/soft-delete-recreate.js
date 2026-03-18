const base = process.env.BASE || "http://localhost:4000";
async function json(r) { const t = await r.text(); try { return JSON.parse(t); } catch { return t; } }
async function login(username, password) {
  const r = await fetch(base + "/auth/login", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
  });
  const d = await json(r);
  if (!r.ok) throw new Error("login failed: " + JSON.stringify(d));
  return d.token;
}
async function j(path, opts = {}) {
  const r = await fetch(base + path, {
    ...opts,
    headers: { "Content-Type": "application/json", ...(opts.headers || {}), Authorization: "Bearer " + globalThis.token }
  });
  const d = await json(r);
  return { ok: r.ok, status: r.status, data: d };
}
(async () => {
  globalThis.token = await login("developer", "admin123");
  const id = "RECREATE-TEST-" + Date.now();
  console.log("create subject", id);
  let r = await j("/subjects", { method: "POST", body: JSON.stringify({ id, name: "X", units: 3 }) });
  console.log("create status", r.status, r.ok);
  r = await j("/subjects/" + id, { method: "DELETE" });
  console.log("delete status", r.status, r.ok);
  r = await j("/subjects", { method: "POST", body: JSON.stringify({ id, name: "Y", units: 4 }) });
  console.log("recreate status", r.status, r.ok);
  // restart simulation: second create should still work after server restart because restore path is used; we simulate by calling again
  r = await j("/subjects", { method: "POST", body: JSON.stringify({ id, name: "Z", units: 5 }) });
  console.log("recreate again (restore) status", r.status, r.ok);
})(); 
