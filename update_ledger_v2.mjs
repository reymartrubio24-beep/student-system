import fs from 'fs';

const appJsPath = 'c:/Users/ADMIN/Desktop/bingtan/student-system/src/App.js';
let code = fs.readFileSync(appJsPath, 'utf8');

const regex = /function LedgerModal\(\{[^}]+\}\) \{([\s\S]*?)return \(\s*<Modal show title="📓 Student Ledger"[^>]*>([\s\S]*?)<\/Modal>\s*\);\s*\}/;

const newLedgerModal = `function LedgerModal({ studentId, students, assignedSubjects, token, onClose }) {
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState([]);
  const [ledger, setLedger] = useState({
    petition_class: "", regular_units: "", total_units: "", tuition_fee: "", misc_fee: "", internship_fee: "",
    computer_lab_fee: "", chem_lab_fee: "", aircon_fee: "", shop_fee: "", other_fees: "",
    id_fee: "", subscription_fee: "", discount: "", bank_account: "", bill_of_payment: "", notes: ""
  });
  
  const student = students?.find(s => s.id === studentId);
  const regularUnits = assignedSubjects?.reduce((acc, s) => acc + (s.units || 0), 0) || 0;
  const parsedYear = parseInt(student?.year) || "";

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
      const payload = { ...ledger };
      [
        "tuition_fee", "misc_fee", "internship_fee", "computer_lab_fee", "chem_lab_fee", 
        "aircon_fee", "shop_fee", "other_fees", "id_fee", "subscription_fee", "discount", "bank_account"
      ].forEach(k => payload[k] = payload[k] === "" || isNaN(payload[k]) ? 0 : Number(payload[k]));
      
      await api(\`/ledgers/\${encodeURIComponent(studentId)}\`, { method: 'PUT', body: payload }, token);
      alert("Ledger saved perfectly!");
    } catch (e) {
      alert("Failed to save ledger: " + e.message);
    }
  };

  const handlePrint = () => {
    setTimeout(() => {
      window.print();
    }, 200);
  };

  const totalFees = 
    Number(ledger.tuition_fee||0) + Number(ledger.misc_fee||0) + 
    Number(ledger.internship_fee||0) + Number(ledger.computer_lab_fee||0) + 
    Number(ledger.chem_lab_fee||0) + Number(ledger.aircon_fee||0) + 
    Number(ledger.shop_fee||0) + Number(ledger.other_fees||0) + 
    Number(ledger.id_fee||0) + Number(ledger.subscription_fee||0);
  const totalCharges = totalFees - Number(ledger.discount||0) + Number(ledger.bank_account||0);

  if (loading) return <Modal show title="Student Ledger" width={800} onClose={onClose}><div style={{padding:40, textAlign:"center"}}>Loading ledger...</div></Modal>;

  return (
    <Modal show title="📓 Student Ledger Booklet" width={1000} onClose={onClose}>
      <div className="ledger-modal-content">
        <style>{\`
          @media print {
            @page { size: landscape; margin: 0mm; }
            body * { visibility: hidden; }
            .ledger-printable, .ledger-printable * { visibility: visible; }
            .ledger-printable { position: absolute; left: 0; top: 0; width: 100vw; height: 100vh; overflow: hidden; background: white !important; }
            .no-print { display: none !important; }
            .ledger-printable input, .ledger-printable textarea { border: none !important; background: transparent !important; color: black !important; resize: none; appearance: none; }
            .booklet-spread { max-width: 100% !important; margin: 0 !important; border: none !important; box-shadow: none !important; margin-top: 5mm !important; }
            .booklet-page { padding: 15mm !important; border: none !important; height: 100%; border-right: 1px dashed #ccc !important; }
            .right-page { border-right: none !important; }
          }
          
          /* BOOKLET CSS */
          .booklet-spread { display: flex; max-width: 1100px; margin: 0 auto; background: white; color: black; box-shadow: 0 5px 20px rgba(0,0,0,0.3); font-family: 'Times New Roman', serif; position: relative; margin-bottom: 30px; border: 1px solid #ddd; }
          .booklet-page { flex: 1; min-height: 650px; padding: 30px; box-sizing: border-box; position: relative; }
          .left-page { border-right: 1px solid #ccc; }
          .booklet-table { width: 100%; border-collapse: collapse; font-size: 13px; }
          .booklet-table th, .booklet-table td { border: 1px solid #000; padding: 5px; text-align: center; }
          
          .bold-val { font-weight: bold; }
          
          .proverb-text {
            position: absolute;
            left: -13px;
            top: 50%;
            transform: translateY(-50%) rotate(-90deg);
            white-space: nowrap;
            font-size: 10px;
            color: #555;
            letter-spacing: 1px;
          }
          
          .cover-logo { width: 100px; height: 100px; border-radius: 50%; background: #eee; border: 2px solid #ccc; display: block; margin: 15px auto; }
          .exam-boxes { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 20px; }
          .exam-box { border: 1px solid #aaa; height: 50px; display: flex; align-items: center; justify-content: center; font-style: italic; color: #888; font-size: 18px; }
          .exam-box.centered { grid-column: 1 / -1; width: 50%; margin: 0 auto; }
          
          /* Transparent Input styling for direct editing */
          .paper-input { width: 100%; border: none !important; background: rgba(0,0,0,0.03); outline: none; font-family: 'Times New Roman', serif; font-size: 13px; text-align: right; padding: 2px 5px; box-sizing: border-box; }
          .paper-input:focus { background: rgba(59, 130, 246, 0.1); border-bottom: 1px solid #3b82f6 !important; }
          .paper-input-center { text-align: center; }
          .paper-input-left { text-align: left; }
        \`}</style>

        <div className="no-print" style={{ display: 'flex', gap: 10, marginBottom: 20, justifyContent: 'center' }}>
          <button style={{ background: page === 1 ? '#3b82f6' : '#374151', color: 'white', padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 'bold' }} onClick={() => setPage(1)}>📖 PAGE 1 (Cover / Permit)</button>
          <button style={{ background: page === 2 ? '#3b82f6' : '#374151', color: 'white', padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 'bold' }} onClick={() => setPage(2)}>📖 PAGE 2 (Ledger / Payments)</button>
          
          <button style={{ background: '#10b981', color: 'white', padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 'bold', marginLeft: 20 }} onClick={handleSave}>💾 Save Booklet</button>
          <button style={{ background: '#8b5cf6', color: 'white', padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 'bold' }} onClick={handlePrint}>🖨️ Print Page</button>
        </div>

        <div className="ledger-printable" style={{ position: "relative" }}>
          
          {page === 1 && (
            <div className="booklet-spread">
              <div className="booklet-page left-page">
                 <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: 14 }}>
                    {(student?.name||"").toUpperCase()} {(student?.course||"").toUpperCase()} {parsedYear}
                 </div>
                 <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: 16, margin: '10px 0' }}>PERMIT</div>
                 <div style={{ textAlign: 'center', fontStyle: 'italic', fontSize: 12 }}>Second Semester; SY: 2025-2026</div>
                 
                 <div className="exam-boxes">
                   <div className="exam-box">1st Prelim</div>
                   <div className="exam-box">2nd Prelim</div>
                   <div className="exam-box">Midterm</div>
                   <div className="exam-box">Semi-Final</div>
                   <div className="exam-box centered">Final</div>
                 </div>

                 <div style={{ marginTop: 30 }}>
                   <div style={{ textAlign: 'center', fontWeight: 'bold', borderBottom: '1px solid #000', display: 'inline-block', width: '100%', paddingBottom: 2 }}>IMPORTANT</div>
                   <ol style={{ fontSize: 11, paddingLeft: 20, marginTop: 10, lineHeight: 1.4 }}>
                     <li>This card is non-transferable and forfeited if alterations are made.</li>
                     <li>Attached your 1x1 picture in the box provided and affix your signature on the space provided.</li>
                     <li>This card is valid for one (1) semester only.</li>
                     <li>Please keep this card away from deteriorated.</li>
                     <li>A duplicate card will be issued only upon due payment of one hundred pesos (Php 100.00).</li>
                   </ol>
                   <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, marginTop: 20 }}>
                     <i>Printed in YBVC, Pagadian City</i>
                     <i>Date Printed: {new Date().toLocaleDateString('en-US', {month:'numeric', day:'numeric', year:'numeric'})}</i>
                   </div>
                 </div>
              </div>
              
              <div className="booklet-page right-page">
                 <div style={{ textAlign: 'center', fontSize: 18, fontFamily: 'serif', fontWeight: 'bold' }}>YLLANA BAY VIEW COLLEGE, INC.</div>
                 <div style={{ textAlign: 'center', fontWeight: 'bold', color: 'darkgreen', fontSize: 14, marginTop: 5 }}>COLLEGE DEPARTMENT</div>
                 <div style={{ textAlign: 'center', fontSize: 12 }}>Enerio St., Balangasan Dist., Pagadian City</div>
                 <div style={{ textAlign: 'center', fontSize: 12 }}>Tel. No. (062) 2154-176</div>
                 <div style={{ textAlign: 'center', fontStyle: 'italic', fontSize: 12 }}>"The Builder of Future Leaders"</div>
                 
                 <div className="cover-logo"></div>
                 
                 <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: 13, marginTop: 10 }}>STUDENT ACCOUNT AND PERMIT SECTION</div>
                 <div style={{ textAlign: 'center', fontWeight: 'bold', color: 'darkgreen', fontSize: 16 }}>STUDENT'S ACCOUNT CARD</div>
                 <div style={{ textAlign: 'center', fontStyle: 'italic', fontSize: 12 }}>Second Semester; SY: 2025-2026</div>
                 
                 <div style={{ width: 100, height: 100, border: '1px solid #000', margin: '20px auto', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', fontSize: 10, padding: 5 }}>
                   Not Valid Without<br/>RECENT 1x1 ID<br/>Picture.<br/>Do Not staple,<br/>Paste it!
                 </div>

                 <div style={{ marginTop: 20, fontSize: 13, fontWeight: 'bold' }}>I'm, <span style={{ textDecoration: 'underline' }}>{(student?.name||"").toUpperCase()} {(student?.course||"").toUpperCase()} {parsedYear}</span></div>
                 <div style={{ fontSize: 12, marginTop: 5, textAlign: 'justify', textIndent: 20 }}>
                   I hereby promise and pledge to abide by and comply with all the rules and regulations of Yllana Bay View College.
                 </div>
                 
                 <div style={{ marginTop: 40, borderTop: '1px solid #000', width: '80%', marginLeft: 'auto', textAlign: 'center', fontSize: 12, paddingTop: 5, fontWeight: 'bold' }}>
                   {(student?.name||"").toUpperCase()} {(student?.course||"").toUpperCase()} {parsedYear}<br/>
                   <span style={{ fontWeight: 'normal', fontSize: 11 }}>Signature Over Printed Name</span>
                 </div>
                 <div style={{ fontSize: 9, marginTop: 20 }}>REV. FORM: SAS 070-2017</div>
              </div>
            </div>
          )}

          {page === 2 && (
            <div className="booklet-spread">
              <div className="booklet-page left-page">
                 <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: 14, letterSpacing: 1, borderBottom: '2px solid #000', paddingBottom: 4, marginBottom: 10 }}>
                   ASSESSMENT INFORMATION
                 </div>
                 
                 <table style={{ width: '100%', fontSize: 13, marginBottom: 10 }}>
                   <thead>
                     <tr style={{ textDecoration: 'underline' }}>
                       <th style={{ textAlign: 'left', width: '55%' }}>DESCRIPTION</th>
                       <th style={{ textAlign: 'center', width: '20%' }}>UNITS</th>
                       <th style={{ textAlign: 'right', width: '25%' }}>AMOUNT</th>
                     </tr>
                   </thead>
                   <tbody>
                     <tr>
                       <td>Regular Units Enrolled:</td>
                       <td style={{ padding: 2 }}><input className="paper-input paper-input-center bold-val" value={ledger.regular_units !== undefined ? ledger.regular_units : regularUnits} onChange={e => setLedger({...ledger, regular_units: e.target.value})} placeholder={String(regularUnits)} /></td>
                       <td></td>
                     </tr>
                     <tr>
                       <td>Petition Class :</td>
                       <td style={{ padding: 2 }}><input className="paper-input paper-input-center bold-val" value={ledger.petition_class||""} onChange={e => setLedger({...ledger, petition_class: e.target.value})} placeholder="0" /></td>
                       <td style={{ textAlign: 'right' }}>-</td>
                     </tr>
                     <tr><td colSpan="3">&nbsp;</td></tr>
                     <tr>
                       <td style={{ fontWeight: 'bold' }}>Total Units Enrolled:</td>
                       <td style={{ textAlign: 'center' }} className="bold-val">{(parseInt(ledger.regular_units || regularUnits) || 0) + parseInt(ledger.petition_class || 0)}</td>
                       <td></td>
                     </tr>
                     <tr><td colSpan="3">&nbsp;</td></tr>
                     {[
                       { label: "Tuition Fee:", key: "tuition_fee" },
                       { label: "Miscellaneous Fee:", key: "misc_fee" },
                       { label: "Internship Fee:", key: "internship_fee" },
                       { label: "Computer Lab. Fee:", key: "computer_lab_fee" },
                       { label: "Chem. Lab. Fee:", key: "chem_lab_fee" },
                       { label: "Aircon Fee:", key: "aircon_fee" },
                       { label: "Shop Fee:", key: "shop_fee" },
                       { label: "Other & New Fees:", key: "other_fees" },
                       { label: "I.D. Fee:", key: "id_fee" },
                       { label: "Subscription fee:", key: "subscription_fee" }
                     ].map((r, i) => (
                       <tr key={i}>
                         <td>{r.label}</td>
                         <td></td>
                         <td style={{ padding: 2 }} className={ledger[r.key] ? "bold-val" : ""}>
                            <input className="paper-input bold-val" value={ledger[r.key]||""} onChange={e => setLedger({...ledger, [r.key]: e.target.value})} placeholder="-" />
                         </td>
                       </tr>
                     ))}
                     <tr>
                       <td style={{ fontWeight: 'bold', color: 'darkred' }}>Current Account:</td>
                       <td></td>
                       <td style={{ textAlign: 'right', color: 'darkred', fontWeight: 'bold' }}>{totalFees > 0 ? totalFees.toLocaleString('en-US', {minimumFractionDigits:2}) : "-"}</td>
                     </tr>
                     <tr>
                       <td style={{ fontWeight: 'bold' }}>Discount:</td>
                       <td></td>
                       <td style={{ padding: 2 }}>
                         <input className="paper-input" value={ledger.discount||""} onChange={e => setLedger({...ledger, discount: e.target.value})} placeholder="-" />
                       </td>
                     </tr>
                     <tr>
                       <td style={{ fontWeight: 'bold' }}>Back Account:</td>
                       <td></td>
                       <td style={{ padding: 2 }}>
                         <input className="paper-input" value={ledger.bank_account||""} onChange={e => setLedger({...ledger, bank_account: e.target.value})} placeholder="-" />
                       </td>
                     </tr>
                     <tr>
                       <td style={{ fontWeight: 'bold', color: 'darkred' }}>Total Charges:</td>
                       <td></td>
                       <td style={{ textAlign: 'right', color: 'darkred', fontWeight: 'bold' }}>{totalCharges > 0 ? totalCharges.toLocaleString('en-US', {minimumFractionDigits:2}) : "-"}</td>
                     </tr>
                   </tbody>
                 </table>
                 
                 <div style={{ marginTop: 20, fontSize: 13 }}>
                   <div style={{ fontWeight: 'bold' }}>Assessed by:</div>
                   <div style={{ textAlign: 'center', width: '80%', margin: '15px 0 0 20px', borderBottom: '1px solid #000', fontWeight: 'bold', paddingBottom: 2 }}>
                     Manrey C. Almario Jr.
                   </div>
                   <div style={{ textAlign: 'center', width: '80%', marginLeft: '20px', fontSize: 11 }}>Student Account Officer III</div>
                 </div>
                 
                 <div style={{ marginTop: 20, fontSize: 13 }}>
                   <div style={{ textAlign: 'center', width: '80%', margin: '15px 0 0 auto', borderBottom: '1px solid #000', fontWeight: 'bold', paddingBottom: 2 }}>
                     Sherwin D. Maghuyop
                   </div>
                   <div style={{ textAlign: 'center', width: '80%', marginLeft: 'auto', fontSize: 11 }}>Student Account Chief</div>
                   <div style={{ display: 'inline-block' }}><strong>Checked by:</strong></div>
                 </div>
              </div>
              
              <div className="booklet-page right-page">
                 <div className="proverb-text">Commit to the LORD whatever you do, and he will establish your plans. Proverbs 16:3</div>
                 
                 <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: 14, letterSpacing: 1, marginBottom: 10 }}>
                   {(student?.name||"").toUpperCase()} {(student?.course||"").toUpperCase()} {parsedYear || ""}
                 </div>
                 
                 <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10, fontSize: 13, marginBottom: 15 }}>
                   <span style={{ color: 'darkred', fontWeight: 'bold' }}>BILL OF PAYMENT PER EXAM:</span>
                   <span style={{ border: '1px solid darkred', borderRadius: '20px', padding: '2px 15px', color: 'darkred', fontWeight: 'bold' }}>
                     <input className="paper-input paper-input-center bold-val" style={{ color: 'darkred', background: 'transparent' }} value={ledger.bill_of_payment||""} onChange={e => setLedger({...ledger, bill_of_payment: e.target.value})} placeholder="0.00" />
                   </span>
                 </div>
                 
                 <table className="booklet-table">
                   <thead>
                     <tr>
                       <th colSpan="5" style={{ background: '#eee', letterSpacing: 1 }}>PAYMENTS</th>
                     </tr>
                     <tr>
                       <th style={{ width: '15%' }}>Dates</th>
                       <th style={{ width: '25%' }}>Receipts No.</th>
                       <th style={{ width: '20%' }}>Amount Paid</th>
                       <th style={{ width: '25%' }}>Balance</th>
                       <th style={{ width: '15%' }}>Cashier's Initial</th>
                     </tr>
                   </thead>
                   <tbody>
                     <tr>
                       <td colSpan="3"></td>
                       <td style={{ fontWeight: 'bold', fontSize: 14 }}>{totalCharges.toLocaleString('en-US', {minimumFractionDigits:2})}</td>
                       <td></td>
                     </tr>
                     {(() => {
                        let rBal = totalCharges;
                        // Show minimum 12 rows to cover the booklet size
                        const emptyRowsCount = Math.max(0, 12 - payments.length);
                        
                        const renderRows = [];
                        payments.forEach((p, index) => {
                          rBal -= parseFloat(p.amount||0);
                          renderRows.push(
                            <tr key={\`p-\${index}\`}>
                              <td>{new Date(p.created_at).toLocaleDateString('en-US', {month:'numeric', day:'numeric', year:'2-digit'})}</td>
                              <td>{p.reference || "-"}</td>
                              <td style={{ fontWeight: 'bold' }}>{parseFloat(p.amount||0).toLocaleString('en-US', {minimumFractionDigits:0})}</td>
                              <td style={{ fontWeight: 'bold' }}>{rBal.toLocaleString('en-US', {minimumFractionDigits:0})}</td>
                              <td style={{ fontStyle: 'italic' }}>sys</td>
                            </tr>
                          );
                        });
                        
                        for (let i = 0; i < emptyRowsCount; i++) {
                          renderRows.push(
                            <tr key={\`e-\${i}\`} style={{height: 25}}>
                              <td></td><td></td><td></td><td></td><td></td>
                            </tr>
                          );
                        }
                        return renderRows;
                     })()}
                   </tbody>
                 </table>
                 
                 <div style={{ marginTop: 20, fontSize: 13, border: '1px solid #ccc', minHeight: 80, padding: 5, position: 'relative' }}>
                   <strong>Notes:</strong><br/>
                   <textarea className="paper-input paper-input-left no-print" value={ledger.notes||""} onChange={e => setLedger({...ledger, notes: e.target.value})} placeholder="Enter any notes here..." style={{ height: 60, resize: 'none' }}></textarea>
                   <div style={{ display: 'none', whiteSpace: 'pre-wrap', marginTop: 5 }} className="print-only">{ledger.notes}</div>
                 </div>
                 
                 <div style={{ position: 'absolute', bottom: 30, right: 30, fontSize: 9, color: '#aaa' }}>
                   Powered by sdmags
                 </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </Modal>
  );
}
`;

code = code.replace(regex, newLedgerModal);
fs.writeFileSync(appJsPath, code);
console.log("Updated LedgerModal successfully to photorealistic inputs.");
