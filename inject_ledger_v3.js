const fs = require('fs');
let code = fs.readFileSync('c:/Users/ADMIN/Desktop/bingtan/student-system/src/App.js', 'utf8');

const ledgerModalComponent = `
function LedgerModal({ studentId, students, assignedSubjects, token, onClose }) {
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState([]);
  const [ledger, setLedger] = useState({
    petition_class: "", tuition_fee: 0, misc_fee: 0, internship_fee: 0,
    computer_lab_fee: 0, chem_lab_fee: 0, aircon_fee: 0, shop_fee: 0, other_fees: 0,
    id_fee: 0, subscription_fee: 0, discount: 0, bank_account: "", bill_of_payment: "", notes: ""
  });
  
  const student = students?.find(s => s.id === studentId);
  const regularUnits = assignedSubjects?.reduce((acc, s) => acc + (s.units || 0), 0) || 0;

  useEffect(() => {
    let mounted = true;
    const fetchLedger = async () => {
      try {
        const [led, pays] = await Promise.all([
          api(\`/ledgers/\${encodeURIComponent(studentId)}\`, {}, token),
          api(\`/payments?student_id=\${encodeURIComponent(studentId)}\`, {}, token)
        ]);
        if (mounted) {
          setLedger(led || {});
          setPayments(pays || []);
          setLoading(false);
        }
      } catch (err) {
        console.error(err);
        if (mounted) setLoading(false);
      }
    };
    fetchLedger();
    return () => { mounted = false; };
  }, [studentId, token]);

  const handleSave = async () => {
    try {
      await api(\`/ledgers/\${encodeURIComponent(studentId)}\`, { method: 'PUT', body: ledger }, token);
      alert("Ledger updated perfectly!");
    } catch (e) {
      alert("Failed to save ledger: " + e.message);
    }
  };

  const handlePrint = () => window.print();

  const totalFees = 
    Number(ledger.tuition_fee||0) + Number(ledger.misc_fee||0) + 
    Number(ledger.internship_fee||0) + Number(ledger.computer_lab_fee||0) + 
    Number(ledger.chem_lab_fee||0) + Number(ledger.aircon_fee||0) + 
    Number(ledger.shop_fee||0) + Number(ledger.other_fees||0) + 
    Number(ledger.id_fee||0) + Number(ledger.subscription_fee||0);
  const totalCharges = totalFees - Number(ledger.discount||0) + Number(ledger.bank_account||0);

  if (loading) return <Modal show title="Student Ledger" width={800} onClose={onClose}><div style={{padding:40, textAlign:"center"}}>Loading ledger...</div></Modal>;

  return (
    <Modal show title="📓 Student Ledger" width={850} onClose={onClose}>
      <div className="ledger-modal-content">
        <style>{\`
          @media print {
            body * { visibility: hidden; }
            .ledger-printable, .ledger-printable * { visibility: visible; }
            .ledger-printable { position: absolute; left: 0; top: 0; width: 100%; color: black !important; background: white !important; }
            .no-print { display: none !important; }
            .ledger-printable input, .ledger-printable textarea { border: none !important; background: transparent !important; color: black !important; resize: none; overflow: hidden; appearance: none; }
          }
          .ledger-btn { background: #374151; color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; }
          .ledger-btn.active { background: #3b82f6; }
          .ledger-table th, .ledger-table td { border: 1px solid var(--border-color); padding: 8px; text-align: left; }
          .ledger-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
          .fee-row { display: flex; justify-content: space-between; margin-bottom: 8px; align-items: center; }
          .fee-row input { width: 120px; padding: 4px; border-radius: 4px; border: 1px solid var(--border-color); background: rgba(0,0,0,0.2); color: white; text-align: right; }
        \`}</style>

        <div className="no-print" style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
          <button className={\`ledger-btn \${page === 1 ? 'active' : ''}\`} onClick={() => setPage(1)}>Page 1 (Configuration)</button>
          <button className={\`ledger-btn \${page === 2 ? 'active' : ''}\`} onClick={() => setPage(2)}>Page 2 (Payments)</button>
          <button className="ledger-btn" style={{ marginLeft: 'auto', background: "#10b981" }} onClick={handleSave}>💾 Save Ledger</button>
          <button className="ledger-btn" style={{ background: "#8b5cf6" }} onClick={handlePrint}>🖨️ Print Page</button>
        </div>

        <div className="ledger-printable" style={{ padding: "20px", background: "var(--card-bg)" }}>
          {page === 1 && (
            <div>
              <h2 style={{ textAlign: "center", marginBottom: 20, marginTop: 0 }}>STUDENT LEDGER</h2>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
                <div>
                  <div style={{ marginBottom: 5 }}><strong>regular units enrolled:</strong> {regularUnits}</div>
                  <div style={{ marginBottom: 5, display: "flex", alignItems: "center", gap: 8 }}>
                    <strong>Petition Class:</strong> 
                    <input className="no-print" value={ledger.petition_class||""} onChange={e => setLedger({...ledger, petition_class: e.target.value})} style={{ padding: 4, width: 200, background: "rgba(0,0,0,0.2)", color: "white", border: "1px solid var(--border-color)", borderRadius: 4 }} />
                    <span style={{ display: "none" }} className="print-only">{ledger.petition_class}</span>
                  </div>
                  <div style={{ marginBottom: 5 }}><strong>total Units Enrolled:</strong> {regularUnits + (ledger.petition_class ? 1 : 0)}</div>
                </div>
              </div>

              <div className="ledger-form-grid" style={{ marginTop: 30 }}>
                <div>
                  {[
                    { label: "Tuition Fee", key: "tuition_fee" },
                    { label: "Misscellaneous Fee", key: "misc_fee" },
                    { label: "Internship Fee", key: "internship_fee" },
                    { label: "Computer Lab Fee", key: "computer_lab_fee" },
                    { label: "Chem. Lab Fee", key: "chem_lab_fee" },
                    { label: "Aircon Fee", key: "aircon_fee" },
                    { label: "Shop Fee", key: "shop_fee" },
                    { label: "Other & New Fees", key: "other_fees" },
                    { label: "I.D Fee", key: "id_fee" },
                    { label: "Subscription Fee", key: "subscription_fee" }
                  ].map(f => (
                    <div className="fee-row" key={f.key}>
                      <span style={{ fontSize: 13 }}>{f.label}:</span>
                      <input type="number" value={ledger[f.key]||0} onChange={e => setLedger({...ledger, [f.key]: e.target.value})} />
                    </div>
                  ))}
                </div>

                <div style={{ paddingLeft: 30, borderLeft: "1px solid var(--border-color)" }}>
                  <div className="fee-row" style={{ marginTop: 40 }}><strong style={{ color: "var(--neon-blue)" }}>Current Account:</strong> <span>{totalFees.toFixed(2)}</span></div>
                  <div className="fee-row"><strong>Discount:</strong> <input type="number" value={ledger.discount||0} onChange={e => setLedger({...ledger, discount: e.target.value})} /></div>
                  <div className="fee-row"><strong>Bank Account:</strong> <input type="number" value={ledger.bank_account||0} onChange={e => setLedger({...ledger, bank_account: e.target.value})} /></div>
                  <div className="fee-row" style={{ marginTop: 20, borderTop: "2px solid var(--border-color)", paddingTop: 10 }}>
                    <strong style={{ fontSize: 16, color: "var(--neon-pink)" }}>Total Charges:</strong> 
                    <strong style={{ fontSize: 16 }}>{totalCharges.toFixed(2)}</strong>
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', marginTop: 50, gap: 40 }}>
                <div>
                  <div style={{ marginBottom: 20 }}><strong>Assessed By:</strong></div>
                  <div style={{ textAlign: "center", borderBottom: "1px solid var(--border-color)", paddingBottom: 5, marginBottom: 5 }}><strong>Manrey C. Almario Jr.</strong></div>
                  <div style={{ textAlign: "center", fontSize: 12 }}>Student Account Officer</div>
                </div>
                <div>
                  <div style={{ marginBottom: 20 }}><strong>Checked By:</strong></div>
                  <div style={{ textAlign: "center", borderBottom: "1px solid var(--border-color)", paddingBottom: 5, marginBottom: 5 }}><strong>Sherwin D. Maghuyop</strong></div>
                  <div style={{ textAlign: "center", fontSize: 12 }}>Student Account Chief</div>
                </div>
              </div>
            </div>
          )}

          {page === 2 && (
            <div>
              <h3 style={{ textTransform: "uppercase", marginBottom: 20 }}>{student?.name || "Unknown Student"}</h3>
              
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20, fontWeight: "bold" }}>
                BILL OF PAYMENT PER EXAM:
                <input value={ledger.bill_of_payment||""} onChange={e => setLedger({...ledger, bill_of_payment: e.target.value})} style={{ flex: 1, padding: 6, background: "rgba(0,0,0,0.2)", color: "white", border: "1px solid var(--border-color)", borderRadius: 4 }} />
              </div>

              <h4 style={{ textAlign: "center", letterSpacing: 2, marginBottom: 10 }}>PAYMENTS</h4>
              <table className="ledger-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, marginBottom: 30 }}>
                <thead>
                  <tr style={{ background: "rgba(68, 215, 255, 0.1)" }}>
                    <th>DATES</th>
                    <th>RECEIPT NO.</th>
                    <th style={{ textAlign: "right" }}>ACCOUNT PAID</th>
                    <th style={{ textAlign: "right" }}>BALANCE</th>
                    <th>CASHIER'S INITIAL</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    let runBal = totalCharges;
                    const rows = payments.map(p => {
                      runBal -= parseFloat(p.amount||0);
                      return (
                        <tr key={p.id}>
                          <td>{new Date(p.created_at).toLocaleDateString()}</td>
                          <td>{p.reference || "-"}</td>
                          <td style={{ textAlign: "right", color: "#10b981", fontWeight: "bold" }}>{parseFloat(p.amount).toFixed(2)}</td>
                          <td style={{ textAlign: "right", fontWeight: "bold" }}>{runBal.toFixed(2)}</td>
                          <td>SYSTEM</td>
                        </tr>
                      );
                    });
                    if (rows.length === 0) return <tr><td colSpan="5" style={{ textAlign: "center", padding: 20 }}>No payments recorded.</td></tr>;
                    return rows;
                  })()}
                </tbody>
              </table>

              <div style={{ border: "1px solid var(--border-color)", borderRadius: 8, padding: "10px 14px", background: "rgba(0,0,0,0.1)" }}>
                <strong>NOTES:</strong>
                <textarea 
                  value={ledger.notes||""} 
                  onChange={e => setLedger({...ledger, notes: e.target.value})}
                  style={{ width: "100%", height: 150, background: "transparent", color: "white", border: "none", outline: "none", marginTop: 10, resize: "vertical" }} 
                  placeholder="Enter notes here..."
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
`;

// Insert LedgerModal component just before Students definition
code = code.replace(/function Students\(/g, ledgerModalComponent + "\nfunction Students(");

// VERY SPECIFICALLY Add ledgerStudent state strictly inside Students
code = code.replace(
  /function Students\(\{[^}]+\}\) \{\s*const \[search, setSearch\] = useState\(""\);\s*const \[modal, setModal\] = useState\(null\);/m,
  match => match + '\n  const [ledgerStudent, setLedgerStudent] = useState(null);'
);

// Insert the modal into the Students return block (right before the last </Modal>)
// To be safe we will append it right before the </div>); ending the Students component
code = code.replace(
  /(\s*<\/Modal>\s*)(<\/div>\s*);\s*\}\s*function Subjects/m,
  `$1\n      {ledgerStudent && <LedgerModal studentId={ledgerStudent} students={students} assignedSubjects={[]} token={token} onClose={() => setLedgerStudent(null)} />}\n$2; } \nfunction Subjects`
);

// Inject Ledger Button next to the Balance SET button inside Students table loop
const setButtonRow = /(<Btn variant="outline" onClick=\{async \(\) => \{(?:.|\n)*?\}\} style={{ fontSize: 11, padding: "3px 8px" }}\s*>Set<\/Btn>\n\s*)\)}/g;
code = code.replace(setButtonRow, `$1)}\n                            <Btn variant="success" onClick={() => setLedgerStudent(s.id)} style={{ fontSize: 11, padding: "3px 8px", background: "#3b82f6", borderColor: "#3b82f6", marginLeft: 4 }}>📓 Ledger</Btn>`);

fs.writeFileSync('c:/Users/ADMIN/Desktop/bingtan/student-system/src/App.js', code);
console.log("LedgerModal safely injected into Students component.");
