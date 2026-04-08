import 'dotenv/config';

const payload = {
  token: process.env.OWNER_BOOTSTRAP_TOKEN || 'init-owner-allow',
  username: process.env.OWNER_USERNAME || 'owner2',
  password: process.env.OWNER_PASSWORD || 'owner123'
};

async function main() {
  try {
    const res = await fetch('http://localhost:4000/auth/bootstrap-owner', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const text = await res.text();
    console.log(res.status, text);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}
main();
