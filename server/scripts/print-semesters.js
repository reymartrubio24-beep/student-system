const base = process.env.BASE || "http://localhost:4000";
(async () => {
  const r = await fetch(base + "/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "saps2", password: "admin123" })
  });
  const d = await r.json();
  const s = await fetch(base + "/semesters", { headers: { Authorization: "Bearer " + d.token } });
  const txt = await s.text();
  console.log("status", s.status);
  console.log("body", txt);
  try { console.log("parsed", JSON.parse(txt)); } catch {}
})(); 
