
const test = async (uname, pass) => {
    try {
        console.log(`Testing with: ${uname} / ${pass}`);
        const res = await fetch('http://localhost:4000/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: uname, password: pass })
        });
        const status = res.status;
        const data = await res.json();
        console.log('Status:', status);
        console.log('User:', data.username || 'N/A');
        console.log('Error:', data.error || 'N/A');
    } catch (e) {
        console.error('Error:', e.message);
    }
};
(async() => {
    await test('belen', 'password');
    await test('owner', '123123');
})();
