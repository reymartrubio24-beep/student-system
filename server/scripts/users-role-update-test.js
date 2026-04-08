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

function ok(label, pass) {
  console.log(`${pass ? "PASS" : "FAIL"} - ${label}`);
}

(async () => {
  const login = await j("/auth/login", { method: "POST", body: { username: "developer", password: "admin123" } });
  if (!login.ok) { console.log("login failed", login); process.exit(1); }
  const token = login.data.token;

  // Create user to mutate
  const uname = "role_tester_" + Date.now();
  const create = await j("/users", { method: "POST", token, body: { username: uname, password: "Passw0rd!", role: "teacher", user_type: "teacher" } });
  ok("create user for role update", create.ok);

  // Fetch list and get id
  const list = await j("/users", { token });
  const user = list.data.find(x => x.username === uname);
  ok("user present in list", !!user);

  // Update role to student
  const upd1 = await j(`/users/${user.id}`, { method: "PUT", token, body: { role: "student", user_type: "student" } });
  ok("update role to student", upd1.ok);

  // Update role to developer
  const upd2 = await j(`/users/${user.id}`, { method: "PUT", token, body: { role: "developer", user_type: "developer" } });
  ok("update role to developer", upd2.ok);
  if (!upd2.ok) console.log("details", JSON.stringify(upd2, null, 2));

  // Verify via list
  const list2 = await j("/users", { token });
  const user2 = list2.data.find(x => x.id === user.id);
  ok("role is developer", user2 && user2.role === "developer");
})(); 
