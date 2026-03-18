
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
        if (status === 200) {
            console.log('Login successful for', data.username);
            console.log('Token received');
            // Test grades endpoint
            const gradesRes = await fetch('http://localhost:4000/grades', {
                headers: { 'Authorization': `Bearer ${data.token}` }
            });
            console.log('Grades status:', gradesRes.status);
            const grades = await gradesRes.json();
            console.log('Grades count:', grades.length);
            
            // Test payments endpoint
            const paymentsRes = await fetch('http://localhost:4000/payments/' + data.student_id, {
                headers: { 'Authorization': `Bearer ${data.token}` }
            });
            console.log('Payments status:', paymentsRes.status);
            const payments = await paymentsRes.json();
            console.log('Payments count:', payments.length);
        } else {
            console.log('Error:', data.error);
        }
    } catch (e) {
        console.error('Error:', e.message);
    }
};

test('belen', 'password');
