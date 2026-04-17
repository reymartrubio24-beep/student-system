const fs = require('fs');
let src = fs.readFileSync('src/App.js', 'utf8');
const origLen = src.length;

// 1) Add semesters/selectedSemId state after pmts state line
const STATE_TARGET = `  const [pmts, setPmts] = useState([]);\r\n  const [loading, setLoading] = useState(true);\r\n  const [error, setError] = useState('');`;
const STATE_REPLACEMENT = `  const [pmts, setPmts] = useState([]);\r\n  const [semesters, setSemesters] = useState([]);\r\n  const [selectedSemId, setSelectedSemId] = useState('');\r\n  const [loading, setLoading] = useState(true);\r\n  const [error, setError] = useState('');`;

if (!src.includes(STATE_TARGET)) { console.error('STEP 1 TARGET NOT FOUND'); process.exit(1); }
src = src.replace(STATE_TARGET, STATE_REPLACEMENT);
console.log('Step 1 done');

// 2) Replace single useEffect with two useEffects
const EFFECT_TARGET = `  useEffect(() => {\r\n    if (!studentId) {\r\n      setError('No student ID linked to your account. Contact admin.');\r\n      setLoading(false);\r\n      return;\r\n    }\r\n    let mounted = true;\r\n    const load = async () => {\r\n      try {\r\n        const [ledgerData, pmtData] = await Promise.all([\r\n          api(\`/ledgers/\${encodeURIComponent(studentId)}\`, {}, token),\r\n          api(\`/payments/\${encodeURIComponent(studentId)}\`, {}, token).catch(() => []),\r\n        ]);\r\n        if (mounted) {\r\n          setLedger(ledgerData);\r\n          setPmts(Array.isArray(pmtData) ? pmtData : []);\r\n          setLoading(false);\r\n        }\r\n      } catch (e) {\r\n        if (mounted) { setError(e.message); setLoading(false); }\r\n      }\r\n    };\r\n    load();\r\n    return () => { mounted = false; };\r\n  }, [studentId, token]);`;

const EFFECT_REPLACEMENT = `  useEffect(() => {\r\n    api('/semesters', {}, token).then(r => {\r\n      const list = Array.isArray(r) ? r : [];\r\n      setSemesters(list);\r\n      if (list.length > 0) setSelectedSemId(String(list[0].id));\r\n    }).catch(() => {});\r\n  }, [token]);\r\n\r\n  useEffect(() => {\r\n    if (!studentId) {\r\n      setError('No student ID linked to your account. Contact admin.');\r\n      setLoading(false);\r\n      return;\r\n    }\r\n    if (!selectedSemId) return;\r\n    let mounted = true;\r\n    setLoading(true);\r\n    const load = async () => {\r\n      try {\r\n        const [ledgerData, pmtData] = await Promise.all([\r\n          api(\`/ledgers/\${encodeURIComponent(studentId)}?semester_id=\${selectedSemId}\`, {}, token),\r\n          api(\`/payments/\${encodeURIComponent(studentId)}?semester_id=\${selectedSemId}\`, {}, token).catch(() => []),\r\n        ]);\r\n        if (mounted) {\r\n          setLedger(ledgerData);\r\n          setPmts(Array.isArray(pmtData) ? pmtData.filter(p => !p.payment_type || p.payment_type === 'Tuition') : []);\r\n          setLoading(false);\r\n        }\r\n      } catch (e) {\r\n        if (mounted) { setError(e.message); setLoading(false); }\r\n      }\r\n    };\r\n    load();\r\n    return () => { mounted = false; };\r\n  }, [studentId, token, selectedSemId]);`;

if (!src.includes(EFFECT_TARGET)) { console.error('STEP 2 TARGET NOT FOUND'); process.exit(1); }
src = src.replace(EFFECT_TARGET, EFFECT_REPLACEMENT);
console.log('Step 2 done');

// 3) Replace header + opening of student info card
const HEADER_TARGET = `      <PageHeader title="My Ledger" sub="Your current semester billing and payment record" />\r\n      <div className="glass-card" style={{ padding: '20px 28px', marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>`;
const HEADER_REPLACEMENT = `      <PageHeader title="My Ledger" sub="Your historic billing and payment record" />\r\n\r\n      <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>\r\n        <span style={{ fontSize: 13, color: 'var(--text-dim)', fontWeight: 700 }}>School Year / Semester:</span>\r\n        <select\r\n          value={selectedSemId}\r\n          onChange={e => setSelectedSemId(e.target.value)}\r\n          style={{ padding: '8px 14px', borderRadius: 8, border: '1.5px solid var(--border-color)', background: '#0f172a', color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}\r\n        >\r\n          {semesters.length === 0 && <option value="">No semesters active</option>}\r\n          {semesters.map(s => (\r\n            <option key={s.id} value={String(s.id)} style={{ background: '#1e293b' }}>\r\n              {s.school_year} - {s.term}\r\n            </option>\r\n          ))}\r\n        </select>\r\n      </div>\r\n\r\n      <div className="glass-card" style={{ padding: '20px 28px', marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>`;

if (!src.includes(HEADER_TARGET)) { console.error('STEP 3 TARGET NOT FOUND'); process.exit(1); }
src = src.replace(HEADER_TARGET, HEADER_REPLACEMENT);
console.log('Step 3 done');

// 4) Replace static semester label with dynamic
const LABEL_TARGET = `          <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 4 }}>Second Semester \uFFFD SY 2025-2026</div>`;
// Try alternate encoding
const LABEL_TARGET2 = src.match(/<div style=\{\{ fontSize: 11, color: 'var\(--text-dim\)', marginTop: 4 \}\}>Second Semester.*?SY 2025-2026<\/div>/);
const LABEL_REPLACEMENT = `          {(() => { const sem = semesters.find(s => String(s.id) === String(selectedSemId)); return sem ? <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 4 }}>{sem.term} ({sem.school_year})</div> : null; })()}`;

if (LABEL_TARGET2) {
  src = src.replace(LABEL_TARGET2[0], LABEL_REPLACEMENT);
  console.log('Step 4 done (regex match)');
} else if (src.includes(LABEL_TARGET)) {
  src = src.replace(LABEL_TARGET, LABEL_REPLACEMENT);
  console.log('Step 4 done (exact match)');
} else {
  console.error('STEP 4 TARGET NOT FOUND - searching for partial match...');
  const partial = src.indexOf('Second Semester');
  if (partial !== -1) {
    console.log('Found "Second Semester" at index', partial, ':', JSON.stringify(src.slice(partial - 50, partial + 80)));
  }
}

fs.writeFileSync('src/App.js', src);
console.log('All done. File size:', src.length, '(was', origLen, ')');
