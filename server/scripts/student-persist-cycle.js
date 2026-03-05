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
  const id = "TST-" + Math.random().toString(36).slice(2,6).toUpperCase();
  const create = await fetch(base + "/students", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
    body: JSON.stringify({ id, name: "Temp User", course: "BSCS", year: "1st Year", email: id+"@edu.ph", status: "Active" })
  });
  console.log("create", create.status);
  const del = await fetch(base + "/students/" + id, {
    method: "DELETE",
    headers: { Authorization: "Bearer " + token }
  });
  console.log("delete", del.status);
  const list = await fetch(base + "/students", { headers: { Authorization: "Bearer " + token } });
  const arr = await list.json();
  const still = arr.find(x => x.id === id);
  console.log("existsAfterDelete", !!still);
})(); 
