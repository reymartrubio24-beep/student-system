const { all } = require('./server/src/db.js');
async function test() {
  try {
    const cols = await all(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'grades'
    `);
    console.log('grades columns:', cols);
    process.exit(0);
  } catch(e) {
    console.log(e); process.exit(1);
  }
}
test();
