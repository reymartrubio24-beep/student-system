import sqlite3 from "sqlite3";

function check(p) {
  const db = new sqlite3.Database(p);
  db.get("SELECT sql FROM sqlite_master WHERE type='table' AND name='users'", (err, row) => {
    if (err) console.error(p, err.message);
    else console.log(p, "SCHEMA:", row ? row.sql : 'NOT FOUND');
    db.close();
  });
}

check('data/app.sqlite');
check('server/data/app.sqlite');
