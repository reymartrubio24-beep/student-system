const base = "http://localhost:4000";
(async () => {
  const r = await fetch(base + "/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "developer", password: "admin123" })
  });
  const d = await r.json();
  const token = d.token;
  const g = await fetch(base + "/grades", { headers: { Authorization: "Bearer " + token } });
  const arr = await g.json();
  console.log("status", g.status);
  console.log(arr);
})(); 
