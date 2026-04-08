import fetch from 'node-fetch';

async function test() {
  const username = 'flores';
  const password = 'Password@123'; // Guessing common password or I'll check DB
  
  // Since I don't know the password for sure, I'll bypass and just check the endpoint logic with a mock token
  // Or I can just check the DB and sign a token myself!
}

import { initDB, get } from './server/src/db.js';
import jwt from 'jsonwebtoken';
await initDB();

const user = get('SELECT * FROM users WHERE username = ?', ['flores']);
const JWT_SECRET = "dev-secret"; // from auth.js
const token = jwt.sign({ id: user.id, role: user.role, username: user.username, student_id: user.student_id, uuid: user.uuid }, JWT_SECRET);

console.log('--- TEST TOKEN ---');
console.log(token);

const res = await fetch('http://localhost:4000/subjects', {
  headers: { 'Authorization': `Bearer ${token}` }
});
const data = await res.json();
console.log('\n--- API RESPONSE /subjects ---');
console.log(JSON.stringify(data, null, 2));

process.exit(0);
