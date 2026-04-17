const fs = require('fs');
let src = fs.readFileSync('server/src/index.js', 'utf8');
const initialLength = src.length;

// 1. Update gradeSchema
const schemaTarget = `const gradeSchema = z.object({`;
const schemaReplacement = `const gradeSchema = z.object({\n  semester_id: z.coerce.number().optional().nullable(),`;
if(src.includes(schemaTarget)) {
  src = src.replace(schemaTarget, schemaReplacement);
  console.log("Updated gradeSchema");
}

// 2. Update GET /grades (student visibility part)
const getStudentTarget = `    const bySelf = await all(
      \`SELECT g.* FROM grades g
       JOIN students s ON s.id = g.student_id AND s.deleted_at IS NULL
       JOIN subjects b ON b.id = g.subject_id AND b.deleted_at IS NULL
       WHERE g.deleted_at IS NULL AND g.student_id = ?\` + (semesterId ? \` AND b.semester_id = ?\` : \`\`),
      semesterId ? [sid, semesterId] : [sid],
    );`;

const getStudentReplacement = `    const bySelf = await all(
      \`SELECT g.* FROM grades g
       JOIN students s ON s.id = g.student_id AND s.deleted_at IS NULL
       JOIN subjects b ON b.id = g.subject_id AND b.deleted_at IS NULL
       WHERE g.deleted_at IS NULL AND g.student_id = ?\` + (semesterId ? \` AND g.semester_id = ?\` : \`\`),
      semesterId ? [sid, semesterId] : [sid],
    );`;
if(src.includes(getStudentTarget)) {
  src = src.replace(getStudentTarget, getStudentReplacement);
  console.log("Updated GET /grades student query");
}

// 3. Update GET /grades (admin query)
const getAdminTarget = `  const rows = await all(
    \`SELECT g.* FROM grades g
     JOIN students s ON s.id = g.student_id AND s.deleted_at IS NULL
     JOIN subjects b ON b.id = g.subject_id AND b.deleted_at IS NULL
     WHERE g.deleted_at IS NULL\`,
  );
  res.json(rows);`;

const getAdminReplacement = `  const semesterId = req.query.semester_id ? Number(req.query.semester_id) : null;
  const rows = await all(
    \`SELECT g.* FROM grades g
     JOIN students s ON s.id = g.student_id AND s.deleted_at IS NULL
     JOIN subjects b ON b.id = g.subject_id AND b.deleted_at IS NULL
     WHERE g.deleted_at IS NULL\` + (semesterId ? \` AND g.semester_id = ?\` : \`\`),
    semesterId ? [semesterId] : []
  );
  res.json(rows);`;
if(src.includes(getAdminTarget)) {
  src = src.replace(getAdminTarget, getAdminReplacement);
  console.log("Updated GET /grades admin query");
}

// 4. Update POST /grades normalization
const postNormTarget = `      student_id: String(body.student_id || "").trim(),
      subject_id: String(body.subject_id || "").trim(),`;
const postNormReplacement = `      student_id: String(body.student_id || "").trim(),
      subject_id: String(body.subject_id || "").trim(),
      semester_id: body.semester_id,`;
if(src.includes(postNormTarget)) {
  src = src.replace(postNormTarget, postNormReplacement);
  console.log("Updated POST /grades normalization");
}

// 5. Update POST /grades uniqueness check and update/insert
// It uses `const key = [parsed.data.student_id, parsed.data.subject_id];`
// We need to change the key and queries to incorporate semester_id.
const postCheckTarget = `      const key = [parsed.data.student_id, parsed.data.subject_id];
      const existing = await get(
        "SELECT deleted_at FROM grades WHERE student_id=? AND subject_id=?",
        key,
      );`;
const postCheckReplacement = `      const key = [parsed.data.student_id, parsed.data.subject_id, parsed.data.semester_id];
      // If semester_id is missing (from an old client), we might have issues. We expect it to be present.
      if (!parsed.data.semester_id) return res.status(400).json({ error: "semester_id is required" });
      
      const existing = await get(
        "SELECT deleted_at FROM grades WHERE student_id=? AND subject_id=? AND semester_id=?",
        key,
      );`;
if(src.includes(postCheckTarget)) {
  src = src.replace(postCheckTarget, postCheckReplacement);
  console.log("Updated POST /grades uniqueness check");
}

const postUpdateTarget = `          await run(
            "UPDATE grades SET prelim1=?, prelim2=?, midterm=?, semi_final=?, final=?, deleted_at=NULL WHERE student_id=? AND subject_id=?",
            [
              parsed.data.prelim1 ?? null,
              parsed.data.prelim2 ?? null,
              parsed.data.midterm ?? null,
              parsed.data.semi_final ?? null,
              parsed.data.final ?? null,
              ...key,
            ],
          );`;
const postUpdateReplacement = `          await run(
            "UPDATE grades SET prelim1=?, prelim2=?, midterm=?, semi_final=?, final=?, deleted_at=NULL WHERE student_id=? AND subject_id=? AND semester_id=?",
            [
              parsed.data.prelim1 ?? null,
              parsed.data.prelim2 ?? null,
              parsed.data.midterm ?? null,
              parsed.data.semi_final ?? null,
              parsed.data.final ?? null,
              ...key,
            ],
          );`;
if(src.includes(postUpdateTarget)) {
  src = src.replace(postUpdateTarget, postUpdateReplacement);
  console.log("Updated POST /grades update logic");
}

const postInsertTarget = `          await run(
            "INSERT INTO grades (student_id,subject_id,prelim1,prelim2,midterm,semi_final,final) VALUES (?,?,?,?,?,?,?)",
            [
              parsed.data.student_id,
              parsed.data.subject_id,
              parsed.data.prelim1 ?? null,
              parsed.data.prelim2 ?? null,
              parsed.data.midterm ?? null,
              parsed.data.semi_final ?? null,
              parsed.data.final ?? null,
            ],
          );`;
const postInsertReplacement = `          await run(
            "INSERT INTO grades (student_id,subject_id,semester_id,prelim1,prelim2,midterm,semi_final,final) VALUES (?,?,?,?,?,?,?,?)",
            [
              parsed.data.student_id,
              parsed.data.subject_id,
              parsed.data.semester_id,
              parsed.data.prelim1 ?? null,
              parsed.data.prelim2 ?? null,
              parsed.data.midterm ?? null,
              parsed.data.semi_final ?? null,
              parsed.data.final ?? null,
            ],
          );`;
if(src.includes(postInsertTarget)) {
  src = src.replace(postInsertTarget, postInsertReplacement);
  console.log("Updated POST /grades insert logic");
}

const postUniqueCatchTarget = `        const { student_id, subject_id } = parsed.data;
        const soft = await get(
          "SELECT deleted_at FROM grades WHERE student_id=? AND subject_id=?",
          [student_id, subject_id],
        );
        if (soft && soft.deleted_at) {
          await tx(async () => {
            await run(
              "UPDATE grades SET prelim1=?, prelim2=?, midterm=?, semi_final=?, final=?, deleted_at=NULL WHERE student_id=? AND subject_id=?",
              [
                parsed.data.prelim1 ?? null,
                parsed.data.prelim2 ?? null,
                parsed.data.midterm ?? null,
                parsed.data.semi_final ?? null,
                parsed.data.final ?? null,
                student_id,
                subject_id,
              ],
            );`;
const postUniqueCatchReplacement = `        const { student_id, subject_id, semester_id } = parsed.data;
        const soft = await get(
          "SELECT deleted_at FROM grades WHERE student_id=? AND subject_id=? AND semester_id=?",
          [student_id, subject_id, semester_id],
        );
        if (soft && soft.deleted_at) {
          await tx(async () => {
            await run(
              "UPDATE grades SET prelim1=?, prelim2=?, midterm=?, semi_final=?, final=?, deleted_at=NULL WHERE student_id=? AND subject_id=? AND semester_id=?",
              [
                parsed.data.prelim1 ?? null,
                parsed.data.prelim2 ?? null,
                parsed.data.midterm ?? null,
                parsed.data.semi_final ?? null,
                parsed.data.final ?? null,
                student_id,
                subject_id,
                semester_id,
              ],
            );`;
if(src.includes(postUniqueCatchTarget)) {
  src = src.replace(postUniqueCatchTarget, postUniqueCatchReplacement);
  console.log("Updated POST /grades unique catch logic");
}

fs.writeFileSync('server/src/index.js', src);
console.log('Done patch API!', src.length, 'vs', initialLength);
