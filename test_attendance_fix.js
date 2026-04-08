
const testAttendance = async () => {
    try {
        console.log('--- Testing Attendance System ---');
        // 1. Login as teacher
        const loginRes = await fetch('http://localhost:4000/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'teacher1', password: 'password' })
        });
        const loginData = await loginRes.json();
        if (!loginRes.ok) {
            console.error('Login Failed:', loginRes.status, loginData);
            return;
        }
        const { token } = loginData;
        console.log('Token Received:', token ? token.substring(0, 20) + '...' : 'null');
        console.log('Login: OK');

        // 2. Create Attendance Table
        const createRes = await fetch('http://localhost:4000/attendance', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                course_name: 'BSCS',
                block_number: '1A',
                subject_id: 'CS101',
                semester_id: 1,
                time_slot: 'Morning Class',
                term_period: 'midterm'
            })
        });
        console.log('Create Table Status:', createRes.status);
        const createData = await createRes.json();
        console.log('Create Table Data:', createData);

        // 3. List Tables
        const listRes = await fetch('http://localhost:4000/attendance/tables', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (listRes.status !== 200) {
            const err = await listRes.json();
            console.error('List Tables Error:', listRes.status, err);
            return;
        }
        const tables = await listRes.json();
        console.log('Tables Count:', tables.length);
        if (tables.length === 0) throw new Error('No tables found');
        const tableId = tables[0].id;

        // 4. Enroll Student
        const enrollRes = await fetch(`http://localhost:4000/attendance/tables/${tableId}/enroll`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ student_id: '2024-0001' })
        });
        console.log('Enroll Status:', enrollRes.status);
        const enrollData = await enrollRes.json();
        console.log('Enroll Data:', enrollData);

        // 5. Set Attendance Record
        const recordRes = await fetch(`http://localhost:4000/attendance/tables/${tableId}/attendance/2024-0001`, {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ status: 'present', date: '2026-03-13' })
        });
        console.log('Record Status:', recordRes.status);
        const recordData = await recordRes.json();
        console.log('Record Data:', recordData);

        // 6. Verify Student View
        const studLoginRes = await fetch('http://localhost:4000/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'belen', password: 'password' })
        });
        const { token: sToken } = await studLoginRes.json();
        const myRes = await fetch('http://localhost:4000/attendance/my', {
            headers: { 'Authorization': `Bearer ${sToken}` }
        });
        const myAtt = await myRes.json();
        console.log('Student Attendance Records:', myAtt.length);
        console.log('First Record State:', myAtt[0]?.status);

    } catch (e) {
        console.error('Test Failed:', e.message);
    }
};

testAttendance();
