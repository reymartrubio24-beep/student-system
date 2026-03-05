const base = process.env.BASE || "http://localhost:4000";

async function j(path, opts = {}) {
  const res = await fetch(base + path, {
    method: opts.method || "GET",
    headers: {
      "Content-Type": "application/json",
      ...(opts.token ? { Authorization: "Bearer " + opts.token } : {})
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

function ok(label, pass) {
  console.log(`${pass ? "PASS" : "FAIL"} - ${label}`);
}

(async () => {
  // Prepare data as developer
  let loginDev = await j("/auth/login", { method: "POST", body: { username: "developer", password: "admin123" } });
  if (!loginDev.ok) loginDev = await j("/auth/login", { method: "POST", body: { username: "admin", password: "admin123" } });
  if (!loginDev.ok) { console.log("dev login failed", loginDev); return; }
  const dev = loginDev.data.token;
  await j("/students", { method: "POST", token: dev, body: { id: "TST-0001", name: "Test Student", course: "BSCS", year: "1st Year", email: "test@student.edu", status: "Active" } });
  await j("/users", { method: "POST", token: dev, body: { username: "stud1", password: "pass1234", role: "student", user_type: "student", student_id: "TST-0001" } });

  // Login as student
  const loginStu = await j("/auth/login", { method: "POST", body: { username: "stud1", password: "pass1234" } });
  ok("student login", loginStu.ok);
  if (!loginStu.ok) return;
  const stuTok = loginStu.data.token;

  // Students GET /students should return only self
  const listStu = await j("/students", { token: stuTok });
  ok("students endpoint returns only one entry", listStu.ok && Array.isArray(listStu.data) && listStu.data.length <= 1);
  if (listStu.data?.[0]) {
    ok("students endpoint returns own record", listStu.data[0].id === "TST-0001");
  }

  // Students GET /grades returns only own grades
  // Add a grade for the test student
  await j("/subjects", { method: "POST", token: dev, body: { id: "CS101", name: "Intro to CS", units: 3, professor: "", schedule: "", room: "" } });
  await j("/grades", { method: "POST", token: dev, body: { student_id: "TST-0001", subject_id: "CS101", prelim: 85, midterm: 88, prefinal: 90, final: 92 } });
  const gradesAll = await j("/grades", { token: stuTok });
  ok("grades returns array", gradesAll.ok && Array.isArray(gradesAll.data));
  ok("grades only own", gradesAll.data.every(g => g.student_id === "TST-0001"));
})(); 
