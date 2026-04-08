const base = "http://localhost:4000";
(async () => {
  const r = await fetch(base + "/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "developer", password: "admin123" })
  });
  const d = await r.json();
  const token = d.token;
  const u = await fetch(base + "/debug/users/raw", { headers: { Authorization: "Bearer " + token } });
  const txt = await u.text();
  console.log(txt);
})(); 
