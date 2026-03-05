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
  let login = await j("/auth/login", { method: "POST", body: { username: "developer", password: "admin123" } });
  if (!login.ok) login = await j("/auth/login", { method: "POST", body: { username: "admin", password: "admin123" } });
  ok("developer login", login.ok);
  if (!login.ok) return;
  const token = login.data.token;

  const uname = "u_" + Math.random().toString(36).slice(2, 7);
  const create = await j("/users", { method: "POST", token, body: { username: uname, password: "pass1234", role: "teacher", user_type: "teacher" } });
  ok("create user", create.ok);

  const list1 = await j("/users", { token });
  const user = list1.data.find(x => x.username === uname);
  ok("list includes user", !!user);
  if (user) console.log("USER_ID", user.id, "USERNAME", user.username);

  const dbg = await j(`/debug/user/${user.id}`, { token });
  console.log("DEBUG_BEFORE", dbg.data || dbg);

  const update = await j(`/users/${user.id}`, { method: "PUT", token, body: { username: user.username, user_type: "teacher", role: "teacher" } });
  ok("update user", update.ok);

  const disable = await j(`/users/${user.id}/disable?username=${encodeURIComponent(user.username)}`, { method: "PATCH", token, body: { username: user.username } });
  ok("disable user (soft)", disable.ok);

  const list2 = await j("/users?include_deleted=1", { token });
  const deleted = list2.data.find(x => x.id === user.id && x.deleted_at);
  ok("deleted user visible with include_deleted", !!deleted);

  const hard = await j(`/users/${user.id}?hard=1&username=${encodeURIComponent(user.username)}`, { method: "DELETE", token, body: { username: user.username } });
  ok("hard delete user", hard.ok);

  const list3 = await j("/users?include_deleted=1", { token });
  const stillThere = list3.data.find(x => x.id === user.id);
  ok("hard deleted user removed from list", !stillThere);
})(); 
