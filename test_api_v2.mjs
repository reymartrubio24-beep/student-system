import { initDB, get } from './server/src/db.js';
import jwt from 'jsonwebtoken';

await initDB();

const user = await get('SELECT * FROM users WHERE username = ?', ['flores']);
if (!user) {
  console.log('No user "flores" found.');
  process.exit(1);
}

const JWT_SECRET = "dev-secret"; 
const token = jwt.sign({ 
  id: user.id, 
  role: user.role, 
  username: user.username, 
  student_id: user.student_id, 
  uuid: user.uuid 
}, JWT_SECRET);

console.log('--- TEST TOKEN ---');
console.log(token);

try {
  const res = await fetch('http://localhost:4000/subjects', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const data = await res.json();
  console.log('\n--- API RESPONSE /subjects ---');
  console.log(JSON.stringify(data, null, 2));
} catch (e) {
  console.log('\nFailed to fetch from port 4000. Is the server running?');
  console.log(e.message);
}

process.exit(0);
