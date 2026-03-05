async function main() {
  try {
    const res = await fetch('http://localhost:4000/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'owner', password: 'owner123' })
    });
    const json = await res.json();
    console.log(res.status, json);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}
main();
