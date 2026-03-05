const base = "http://localhost:4000";
(async () => {
  const r = await fetch(base + "/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "developer", password: "admin123" })
  });
  let d = await r.json();
  if (!r.ok) {
    const r2 = await fetch(base + "/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "admin", password: "admin123" })
    });
    d = await r2.json();
    if (!r2.ok) {
      console.log("login failed");
      process.exit(1);
    }
  }
  const token = d.token;
  const create = await fetch(base + "/users", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
    body: JSON.stringify({ username: "dev", password: "admin123", role: "developer", user_type: "teacher" })
  });
  const body = await create.text();
  console.log(create.status, body);
})(); 
