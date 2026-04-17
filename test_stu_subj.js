async function test() {
  try {
    const { all } = require('./server/src/db.js');
    console.log('DB connected');
    const query = `
        SELECT b.*, g.semester_id as assigned_semester FROM subjects b
        JOIN grades g ON g.subject_id=b.id AND g.deleted_at IS NULL
        WHERE g.student_id='foo' AND b.deleted_at IS NULL
    `;
    const rows = await all(query);
    console.log('Success, rows:', rows.length);
    process.exit(0);
  } catch(e) {
    console.log('Error in SQL:', e.message);
    process.exit(1);
  }
}
test();
