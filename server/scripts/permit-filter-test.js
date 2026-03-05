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

  // Prepare a semester and first period
  const sems = await j("/semesters", { token });
  const semId = (sems.data && sems.data[0] && sems.data[0].id) || null;
  if (!semId) {
    console.error("No semester available");
    process.exit(1);
  }
  const periods = await j(`/semesters/${semId}/periods`, { token });
  const periodId = (periods.data && periods.data[0] && periods.data[0].id) || null;
  if (!periodId) {
    console.error("No periods for semester");
    process.exit(1);
  }

  // Create a student
  const ts = String(Date.now());
  const resp = await j("/students", {
    method: "POST",
    token,
    body: {
      name: "Permit Filter " + ts,
      course: "BSCS",
      year: "1st Year",
      email: `permit${ts}@edu.ph`,
      status: "Active",
      birth_year: "2006",
    },
  });
  if (!resp.ok) {
    console.error("Student create failed", resp);
    process.exit(1);
  }
  const studentId = resp.data.id;

  // Assign a permit for selected period
  const createPermit = await j(`/students/${encodeURIComponent(studentId)}/permits`, {
    method: "POST",
    token,
    body: { permit_period_id: Number(periodId), status: "active" },
  });
  if (!createPermit.ok) {
    console.error("Assign permit failed", createPermit);
    process.exit(1);
  }

  // Delete the student record
  await j(`/students/${encodeURIComponent(studentId)}`, { method: "DELETE", token });

  // Ensure fetch for semester permits excludes deleted student
  const list = await j(`/semesters/${semId}/permits`, { token });
  const present = (list.data || []).some((r) => r.student_id === studentId);
  console.log("Deleted students excluded from semester permits:", !present ? "PASS" : "FAIL");
})();
