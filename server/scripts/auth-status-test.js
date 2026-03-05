const base = "http://localhost:4000";

async function j(path, { method = "GET", token, body } = {}) {
  const res = await fetch(base + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: "Bearer " + token } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

(async () => {
  const dev = await j("/auth/login", {
    method: "POST",
    body: { username: "developer", password: "admin123" },
  });
  if (!dev.ok) {
    console.error("Developer login failed", dev);
    process.exit(1);
  }
  const token = dev.data.token;

  // Create a new student (auto-generates linked user)
  const ts = String(Date.now());
  const resp = await j("/students", {
    method: "POST",
    token,
    body: {
      name: "Auth Status Test " + ts,
      course: "BSCS",
      year: "1st Year",
      email: `auth${ts}@edu.ph`,
      status: "Active",
      birth_year: "2006",
    },
  });
  if (!resp.ok) {
    console.error("Student create failed", resp);
    process.exit(1);
  }
  const studentId = resp.data.id;
  const username = resp.data.username;
  const password = studentId; // default password policy

  // Verify can login
  const login1 = await j("/auth/login", {
    method: "POST",
    body: { username, password },
  });
  console.log("Login active user:", login1.ok ? "PASS" : "FAIL");

  // Soft-disable the user
  const users = await j("/users", { token });
  const u = (users.data || []).find((x) => x.username === username);
  if (!u) {
    console.error("Created user not found");
    process.exit(1);
  }
  await j(`/users/${u.id}/disable?username=${encodeURIComponent(username)}`, {
    method: "PATCH",
    token,
  });

  // Now login should fail
  const login2 = await j("/auth/login", {
    method: "POST",
    body: { username, password },
  });
  console.log("Login disabled user blocked:", !login2.ok ? "PASS" : "FAIL");

  // Restore: delete student and ensure login blocked due to missing student
  await j(`/students/${encodeURIComponent(studentId)}`, { method: "DELETE", token });
  const login3 = await j("/auth/login", {
    method: "POST",
    body: { username, password },
  });
  console.log("Login after student deletion blocked:", !login3.ok ? "PASS" : "FAIL");
})(); 
