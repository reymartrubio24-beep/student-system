import { initDB, get, all } from './server/src/db.js';
await initDB();
const auths = all('SELECT * FROM authorization WHERE role = ?', ['student']);
console.log('STUDENT AUTHORIZATION:', JSON.stringify(auths, null, 2));

const userperms = all('SELECT * FROM user_permissions WHERE user_id = ?', [133]);
console.log('USER flores PERMISSIONS:', JSON.stringify(userperms, null, 2));

process.exit(0);
