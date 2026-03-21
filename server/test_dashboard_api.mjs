import jwt from 'jsonwebtoken';

const API = "http://localhost:4000";
const SECRET = "dev-secret";

const token = jwt.sign({ 
  id: 1,
  uuid: "test-uuid", 
  username: "test-dev", 
  role: "developer" 
}, SECRET);

async function test() {
  try {
    console.log("Testing GET /dashboard/content...");
    const r1 = await fetch(API + "/dashboard/content", {
      headers: { "Authorization": `Bearer ${token}` }
    });
    console.log("Status:", r1.status);
    console.log("Data:", await r1.json());

    console.log("\nTesting POST /dashboard/content...");
    const r2 = await fetch(API + "/dashboard/content", {
      method: "POST",
      headers: { 
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ type: "next_examination", value: "New Exam Message" })
    });
    console.log("Status:", r2.status);
    console.log("Data:", await r2.json());
  } catch (e) {
    console.error("Test error:", e);
  }
}

test();
