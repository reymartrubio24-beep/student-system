
const testRole = async (uname, pass, role) => {
    try {
        console.log(`\n--- Testing ${role} (${uname}) ---`);
        const res = await fetch('http://localhost:4000/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: uname, password: pass })
        });
        const status = res.status;
        const data = await res.json();
        console.log('Login Status:', status);
        if (status === 200) {
            const token = data.token;
            const checks = {
                teacher: ['/students', '/subjects', '/grades', '/attendance'],
                cashier: ['/students', '/payments', '/permits/stats'],
                register: ['/students', '/subjects', '/grades', '/payments']
            };
            for (const path of (checks[role] || [])) {
                const r = await fetch('http://localhost:4000' + path, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                console.log(`GET ${path}: ${r.status}`);
            }
        } else {
            console.log('Login Error:', (data.error || 'Unknown error'));
        }
    } catch (e) {
        console.error('Error:', e.message);
    }
};

(async() => {
    await testRole('register1', 'password', 'register');
    await testRole('cashier1', 'password', 'cashier');
})();
