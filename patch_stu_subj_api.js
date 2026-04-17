const fs = require('fs');
let src = fs.readFileSync('server/src/index.js', 'utf8');

const t = `app.get("/students/:id/subjects", authRequired, requireRole("students"), async (req, res) => {
  const id = String(req.params.id);
  if (req.user.role === "student" && id !== req.user.student_id) {
    return res.status(403).json({ error: "Forbidden" });
  }
  const semesterId = req.query.semester_id ? Number(req.query.semester_id) : null;
  const rows = semesterId
    ? await all(\`
        SELECT b.* FROM subjects b
        JOIN grades g ON g.subject_id=b.id AND g.deleted_at IS NULL
        WHERE g.student_id=? AND b.deleted_at IS NULL AND b.semester_id=?
      \`, [id, semesterId])
    : await all(\`
        SELECT b.* FROM subjects b
        JOIN grades g ON g.subject_id=b.id AND g.deleted_at IS NULL
        WHERE g.student_id=? AND b.deleted_at IS NULL
      \`, [id]);
  res.json(rows);
});`;

const tr = `app.get("/students/:id/subjects", authRequired, requireRole("students"), async (req, res) => {
  const id = String(req.params.id);
  if (req.user.role === "student" && id !== req.user.student_id) {
    return res.status(403).json({ error: "Forbidden" });
  }
  const semesterId = req.query.semester_id ? Number(req.query.semester_id) : null;
  const rows = semesterId
    ? await all(\`
        SELECT b.*, g.semester_id as assigned_semester FROM subjects b
        JOIN grades g ON g.subject_id=b.id AND g.deleted_at IS NULL
        WHERE g.student_id=? AND b.deleted_at IS NULL AND g.semester_id=?
      \`, [id, semesterId])
    : await all(\`
        SELECT b.*, g.semester_id as assigned_semester FROM subjects b
        JOIN grades g ON g.subject_id=b.id AND g.deleted_at IS NULL
        WHERE g.student_id=? AND b.deleted_at IS NULL
      \`, [id]);
  res.json(rows);
});`;

if(src.includes(t)) {
  src = src.replace(t, tr);
  fs.writeFileSync('server/src/index.js', src);
  console.log('Fixed /students/:id/subjects API.');
} else {
  console.log('Target not found in backend!');
}
