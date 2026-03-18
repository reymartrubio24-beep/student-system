import { initDB, all } from './server/src/db.js';
await initDB();
const users = all('SELECT id, username, role FROM users');
console.log('USERS:', users);
