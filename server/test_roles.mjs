import "dotenv/config";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;
const baseUrl = "http://localhost:4000";

const roles = ["owner", "developer", "cashier", "saps", "teacher", "student", "register", "viewer"];

async function testRoles() {
  for (const role of roles) {
    const token = jwt.sign({ id: 100, role, username: `test_${role}`, student_id: role === 'student' ? '2026-0001' : null }, JWT_SECRET);
    const headers = { Authorization: `Bearer ${token}` };

    // Test /users
    const usersRes = await fetch(`${baseUrl}/users`, { headers });
    let usersStr = await usersRes.text();
    if (usersRes.status === 200) usersStr = `OK (length: ${JSON.parse(usersStr).length})`;
    
    // Test /payments
    const paymentsRes = await fetch(`${baseUrl}/payments`, { headers });
    let payStr = await paymentsRes.text();
    if (paymentsRes.status === 200) payStr = `OK (length: ${JSON.parse(payStr).length})`;

    console.log(`ROLE ${role.padEnd(10)} | /users: ${usersStr.padEnd(20)} | /payments: ${payStr}`);
  }
}
testRoles().catch(console.error);
