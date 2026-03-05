const base = "http://localhost:4000";
(async () => {
  const r = await fetch(base + "/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "developer", password: "admin123" })
  });
  const d = await r.json();
  if (!r.ok) { console.log("login failed", d); process.exit(1); }
  const token = d.token;
  const resp = await fetch(base + "/students", { headers: { Authorization: "Bearer " + token } });
  const arr = await resp.json();
  console.log("count", arr.length);
})(); 
