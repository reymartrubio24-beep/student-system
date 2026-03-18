// Test step by step
console.log("Step 1: importing db.js...");
try {
  const db = await import("./src/db.js");
  console.log("Step 2: db.js imported");
  console.log("Step 3: calling initDB...");
  await db.initDB();
  console.log("Step 4: initDB completed");
} catch (e) {
  console.error("FAILED:", e.message);
  console.error("Stack:", e.stack);
}
console.log("Step 5: script done");
process.exit(0);
