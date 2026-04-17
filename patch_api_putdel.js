const fs = require('fs');
let src = fs.readFileSync('server/src/index.js', 'utf8');

// Patch PUT /grades/:studentId/:subjectId
const putTarget = `    const { studentId, subjectId } = req.params;
    const g = await get(
      "SELECT 1 FROM grades WHERE student_id=? AND subject_id=? AND deleted_at IS NULL",
      [studentId, subjectId],
    );
    if (!g) return res.status(404).json({ error: "Not found" });
    await tx(async () => {
      const fields = ["prelim1", "prelim2", "midterm", "semi_final", "final"];
      const sets = fields
        .filter((f) => f in parsed.data)
        .map((f) => \`\${f}=?\`)
        .join(", ");
      if (sets)
        await run(\`UPDATE grades SET \${sets} WHERE student_id=? AND subject_id=?\`, [
          ...fields.filter((f) => f in parsed.data).map((f) => parsed.data[f]),
          studentId,
          subjectId,
        ]);`;

const putReplacement = `    const { studentId, subjectId } = req.params;
    const semesterId = req.query.semester_id ? Number(req.query.semester_id) : null;
    const g = await get(
      "SELECT 1 FROM grades WHERE student_id=? AND subject_id=? AND deleted_at IS NULL" + (semesterId ? " AND semester_id=?" : ""),
      semesterId ? [studentId, subjectId, semesterId] : [studentId, subjectId],
    );
    if (!g) return res.status(404).json({ error: "Not found" });
    await tx(async () => {
      const fields = ["prelim1", "prelim2", "midterm", "semi_final", "final"];
      const sets = fields
        .filter((f) => f in parsed.data)
        .map((f) => \`\${f}=?\`)
        .join(", ");
      if (sets) {
        if (semesterId) {
          await run(\`UPDATE grades SET \${sets} WHERE student_id=? AND subject_id=? AND semester_id=?\`, [
            ...fields.filter((f) => f in parsed.data).map((f) => parsed.data[f]),
            studentId,
            subjectId,
            semesterId
          ]);
        } else {
          await run(\`UPDATE grades SET \${sets} WHERE student_id=? AND subject_id=?\`, [
            ...fields.filter((f) => f in parsed.data).map((f) => parsed.data[f]),
            studentId,
            subjectId,
          ]);
        }
      }`;
if(src.includes(putTarget)) {
  src = src.replace(putTarget, putReplacement);
  console.log("Updated PUT /grades endpoints");
}

// Patch DELETE 
const delTarget = `    const { studentId, subjectId } = req.params;
    const g = await get(
      "SELECT 1 FROM grades WHERE student_id=? AND subject_id=? AND deleted_at IS NULL",
      [studentId, subjectId],
    );
    if (!g) return res.status(404).json({ error: "Not found" });
    await tx(async () => {
      await run(
        "UPDATE grades SET deleted_at=CURRENT_TIMESTAMP WHERE student_id=? AND subject_id=?",
        [studentId, subjectId],
      );`;

const delReplacement = `    const { studentId, subjectId } = req.params;
    const semesterId = req.query.semester_id ? Number(req.query.semester_id) : null;
    const g = await get(
      "SELECT 1 FROM grades WHERE student_id=? AND subject_id=? AND deleted_at IS NULL" + (semesterId ? " AND semester_id=?" : ""),
      semesterId ? [studentId, subjectId, semesterId] : [studentId, subjectId],
    );
    if (!g) return res.status(404).json({ error: "Not found" });
    await tx(async () => {
      if (semesterId) {
        await run(
          "UPDATE grades SET deleted_at=CURRENT_TIMESTAMP WHERE student_id=? AND subject_id=? AND semester_id=?",
          [studentId, subjectId, semesterId],
        );
      } else {
        await run(
          "UPDATE grades SET deleted_at=CURRENT_TIMESTAMP WHERE student_id=? AND subject_id=?",
          [studentId, subjectId],
        );
      }`;

if(src.includes(delTarget)) {
  src = src.replace(delTarget, delReplacement);
  console.log("Updated DELETE /grades endpoints");
}

fs.writeFileSync('server/src/index.js', src);
