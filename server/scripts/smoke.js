import 'dotenv/config';

const base = 'http://localhost:4000';

async function j(res) { const t = await res.text(); try { return JSON.parse(t); } catch { return t; } }
async function post(path, body, token) {
  const r = await fetch(base + path, { method:'POST', headers: { 'Content-Type':'application/json', ...(token?{Authorization:`Bearer ${token}`}:{}) }, body: JSON.stringify(body||{}) });
  const data = await j(r);
  return { status: r.status, data };
}
async function get(path, token) {
  const r = await fetch(base + path, { headers: { ...(token?{Authorization:`Bearer ${token}`}:{}) } });
  const data = await j(r);
  return { status: r.status, data };
}

async function main() {
  const ownerLogin = await post('/auth/login', { username:'owner', password:'owner123' });
  if (ownerLogin.status !== 200) throw new Error('owner login failed ' + JSON.stringify(ownerLogin));
  const ownerToken = ownerLogin.data.token;
  console.log('Owner login OK');

  const semesters = await get('/semesters', ownerToken);
  if (semesters.status !== 200) throw new Error('list semesters failed');
  const semId = semesters.data[0]?.id;
  const periods = semId ? await get(`/semesters/${semId}/periods`, ownerToken) : { data: [] };
  const periodId = periods.data[0]?.id;

  const stud = await post('/students', { name:'Smoke Test', course:'BSCS', year:'1st Year', email:'smoke@example.com', status:'Active', birth_year:'2006' }, ownerToken);
  if (stud.status !== 201) throw new Error('create student failed ' + JSON.stringify(stud));
  const studentId = stud.data.id;
  const studentUser = stud.data.username;
  console.log('Student created', studentId, studentUser);

  const subj = await post('/subjects', { id:'SMK101', name:'Smoke Subject', units:3, professor:'Tester', schedule:'MWF', room:'R1', ...(semId?{semester_id: semId}:{}) }, ownerToken);
  if (subj.status !== 201 && subj.status !== 409) throw new Error('create subject failed ' + JSON.stringify(subj));
  console.log('Subject ensured');

  const gr = await post('/grades', { student_id: studentId, subject_id:'SMK101', prelim:90, midterm:90, prefinal:90, final:90 }, ownerToken);
  if (gr.status !== 201 && gr.status !== 409 && gr.status !== 200) throw new Error('grade upsert failed ' + JSON.stringify(gr));
  console.log('Grade upsert OK');

  const pay = await post('/payments', { student_id: studentId, amount: 123.45, method: 'Cash', reference: 'SMK' }, ownerToken);
  if (pay.status !== 201) throw new Error('payment failed ' + JSON.stringify(pay));
  console.log('Payment recorded');

  if (periodId) {
    const perm = await post(`/students/${encodeURIComponent(studentId)}/permits`, { permit_period_id: periodId, status: 'active' }, ownerToken);
    if (perm.status !== 201) {
      console.log('Permit assign skipped (non-201)', perm.status);
    } else {
      console.log('Permit assigned');
    }
  } else {
    console.log('No period found; skipping permit assign');
  }

  const studLogin = await post('/auth/login', { username: studentUser, password: studentId });
  if (studLogin.status !== 200) throw new Error('student login failed ' + JSON.stringify(studLogin));
  const studToken = studLogin.data.token;
  console.log('Student login OK');

  const gSelf = await get('/grades', studToken);
  console.log('grades self', gSelf.status, Array.isArray(gSelf.data) ? gSelf.data.length : gSelf.data);

  const pays = await get(`/payments/${encodeURIComponent(studentId)}?from=2000-01-01&method=Cash`, studToken);
  console.log('payments self', pays.status, Array.isArray(pays.data) ? pays.data.length : pays.data);

  const myp = await get('/my-permits', studToken);
  console.log('my-permits', myp.status, Array.isArray(myp.data) ? myp.data.length : myp.data);
}

main().catch(e => { console.error(e); process.exit(1); });
