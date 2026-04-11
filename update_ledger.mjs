import fs from 'fs';

const appJsPath = 'c:/Users/ADMIN/Desktop/bingtan/student-system/src/App.js';
let code = fs.readFileSync(appJsPath, 'utf8');

const regex = /function LedgerModal\(\{[^}]+\}\) \{([\s\S]*?)return \(\s*<Modal show title="📓 Student Ledger"[^>]*>([\s\S]*?)<\/Modal>\s*\);\s*\}/;

const newLedgerModal = `function LedgerModal({ studentId, students, assignedSubjects, token, onClose }) {
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState([]);
  const [ledger, setLedger] = useState({
    petition_class: "", regular_units: "", total_units: "", tuition_fee: 0, misc_fee: 0, internship_fee: 0,
    computer_lab_fee: 0, chem_lab_fee: 0, aircon_fee: 0, shop_fee: 0, other_fees: 0,
    id_fee: 0, subscription_fee: 0, discount: 0, bank_account: "", bill_of_payment: "", notes: ""
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
      alert("Ledger updated perfectly!");
    } catch (e) {
      alert("Failed to save ledger: " + e.message);
    }
  };

  const handlePrint = () => {
    setPage(3);
    setTimeout(() => {
      window.print();
    }, 500);
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
    <Modal show title="📓 Student Ledger" width={1000} onClose={onClose}>
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
            .ledger-modal-content { overflow: visible !important; }
            .booklet-page { padding: 15mm !important; border: none !important; height: 100%; border-right: 1px dashed #ccc !important; }
            .right-page { border-right: none !important; }
          }
          .ledger-btn { background: #374151; color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; }
          .ledger-btn.active { background: #3b82f6; }
          .ledger-table th, .ledger-table td { border: 1px solid var(--border-color); padding: 8px; text-align: left; }
          .ledger-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
          .fee-row { display: flex; justify-content: space-between; margin-bottom: 8px; align-items: center; }
          .fee-row input { width: 120px; padding: 4px; border-radius: 4px; border: 1px solid var(--border-color); background: rgba(0,0,0,0.2); color: white; text-align: right; }
          
          /* BOOKLET CSS */
          .booklet-spread { display: flex; max-width: 1100px; margin: 0 auto; background: white; color: black; box-shadow: 0 5px 20px rgba(0,0,0,0.3); font-family: 'Times New Roman', serif; position: relative; margin-bottom: 30px; }
          .booklet-page { flex: 1; min-height: 650px; padding: 30px; box-sizing: border-box; }
          .left-page { border-right: 1px solid #ddd; position: relative; }
          .right-page { position: relative; }
          .fold-line { position: absolute; left: 50%; top: 0; bottom: 0; width: 1px; border-left: 1px dashed #ccc; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
          .booklet-table { width: 100%; border-collapse: collapse; font-size: 13px; }
          .booklet-table th, .booklet-table td { border: 1px solid #000; padding: 5px; text-align: center; }
          .align-right { text-align: right !important; }
          .align-left { text-align: left !important; }
          
          .bold-val { font-weight: bold; }
          .red-val { color: darkred; font-weight: bold; }
          
          /* Proverb text running vertically down the middle */
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
          
          /* Front cover stylings */
          .cover-logo { width: 100px; height: 100px; border-radius: 50%; background: #eee; border: 2px solid #ccc; display: block; margin: 15px auto; }
          .exam-boxes { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 20px; }
          .exam-box { border: 1px solid #aaa; height: 50px; display: flex; align-items: center; justify-content: center; font-style: italic; color: #888; font-size: 18px; }
          .exam-box.centered { grid-column: 1 / -1; width: 50%; margin: 0 auto; }
        \`}</style>

        <div className="no-print" style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
          <button className={\`ledger-btn \${page === 1 ? 'active' : ''}\`} onClick={() => setPage(1)}>Page 1 (Configuration)</button>
          <button className={\`ledger-btn \${page === 2 ? 'active' : ''}\`} onClick={() => setPage(2)}>Page 2 (Payments)</button>
          <button className={\`ledger-btn \${page === 3 ? 'active' : ''}\`} style={{ marginLeft: 'auto', background: "#f59e0b" }} onClick={() => setPage(3)}>👁️ Preview Booklet</button>
          <button className="ledger-btn" style={{ background: "#10b981" }} onClick={handleSave}>💾 Save Ledger</button>
          <button className="ledger-btn" style={{ background: "#8b5cf6" }} onClick={handlePrint}>🖨️ Print Booklet</button>
        </div>

        <div className={page === 3 ? "ledger-printable" : ""} style={{ position: "relative", minHeight: 400 }}>
          {page === 1 && (
            <div style={{ background: "var(--card-bg)", padding: 20 }}>
              <h2 style={{ textAlign: "center", marginBottom: 20, marginTop: 0 }}>LEDGER CONFIGURATION</h2>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
                <div>
                  <div style={{ marginBottom: 5, display: "flex", alignItems: "center", gap: 8 }}>
                    <strong>Regular Units Enrolled:</strong> 
                    <input value={ledger.regular_units || ""} placeholder={String(regularUnits)} onChange={e => setLedger({...ledger, regular_units: e.target.value})} style={{ padding: 4, width: 80, background: "rgba(0,0,0,0.2)", color: "white", border: "1px solid var(--border-color)", borderRadius: 4 }} />
                  </div>
                  <div style={{ marginBottom: 5, display: "flex", alignItems: "center", gap: 8 }}>
                    <strong>Petition Class Units:</strong> 
                    <input value={ledger.petition_class||""} onChange={e => setLedger({...ledger, petition_class: e.target.value})} style={{ padding: 4, width: 80, background: "rgba(0,0,0,0.2)", color: "white", border: "1px solid var(--border-color)", borderRadius: 4 }} />
                  </div>
                </div>
              </div>

              <div className="ledger-form-grid" style={{ marginTop: 30 }}>
                <div>
                  {[
                    { label: "Tuition Fee", key: "tuition_fee" },
                    { label: "Miscellaneous Fee", key: "misc_fee" },
                    { label: "Internship Fee", key: "internship_fee" },
                    { label: "Computer Lab. Fee", key: "computer_lab_fee" },
                    { label: "Chem. Lab. Fee", key: "chem_lab_fee" },
                    { label: "Aircon Fee", key: "aircon_fee" },
                    { label: "Shop Fee", key: "shop_fee" },
                    { label: "Other & New Fees", key: "other_fees" },
                    { label: "I.D. Fee", key: "id_fee" },
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
                  <div className="fee-row"><strong>Back Account:</strong> <input type="number" value={ledger.bank_account||0} onChange={e => setLedger({...ledger, bank_account: e.target.value})} /></div>
                  <div className="fee-row" style={{ marginTop: 20, borderTop: "2px solid var(--border-color)", paddingTop: 10 }}>
                    <strong style={{ fontSize: 16, color: "var(--neon-pink)" }}>Total Charges:</strong> 
                    <strong style={{ fontSize: 16 }}>{totalCharges.toFixed(2)}</strong>
                  </div>
                </div>
              </div>
            </div>
          )}

          {page === 2 && (
            <div style={{ background: "var(--card-bg)", padding: 20 }}>
              <h3 style={{ textTransform: "uppercase", marginBottom: 20 }}>{student?.name || "Unknown Student"}</h3>
              
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20, fontWeight: "bold" }}>
                BILL OF PAYMENT PER EXAM:
                <input value={ledger.bill_of_payment||""} onChange={e => setLedger({...ledger, bill_of_payment: e.target.value})} style={{ flex: 1, padding: 6, background: "rgba(0,0,0,0.2)", color: "white", border: "1px solid var(--border-color)", borderRadius: 4 }} />
              </div>

              <h4 style={{ textAlign: "center", letterSpacing: 2, marginBottom: 10 }}>RECORDED SYSTEM PAYMENTS</h4>
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
            </div>
          )}

          {page === 3 && (
            <div style={{ padding: "0 20px" }}>
              {/* Booklet 1: Cover and Permit */}
              <div className="booklet-spread" style={{ display: 'none' /* We can show this if required, but user explicitly asked about details input. Let's show both just in case, or maybe only the ledger. I'll render it to be complete. */ }}>
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
                       <i>Date Printed: {new Date().toLocaleDateString()}</i>
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

              {/* Booklet 2: Ledger Data (The true focus) */}
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
                         <td style={{ textAlign: 'center' }} className="bold-val">{ledger.regular_units || regularUnits || "-"}</td>
                         <td></td>
                       </tr>
                       <tr>
                         <td>Petition Class :</td>
                         <td style={{ textAlign: 'center' }} className="bold-val">{ledger.petition_class ? "1" : "0"}</td>
                         <td style={{ textAlign: 'right' }}>-</td>
                       </tr>
                       <tr><td colSpan="3">&nbsp;</td></tr>
                       <tr>
                         <td style={{ fontWeight: 'bold' }}>Total Units Enrolled:</td>
                         <td style={{ textAlign: 'center' }} className="bold-val">{(parseInt(ledger.regular_units || regularUnits) || 0) + (ledger.petition_class ? 1 : 0) || "-"}</td>
                         <td></td>
                       </tr>
                       <tr><td colSpan="3">&nbsp;</td></tr>
                       {[
                         { label: "Tuition Fee:", val: ledger.tuition_fee },
                         { label: "Miscellaneous Fee:", val: ledger.misc_fee },
                         { label: "Internship Fee:", val: ledger.internship_fee },
                         { label: "Computer Lab. Fee:", val: ledger.computer_lab_fee },
                         { label: "Chem. Lab. Fee:", val: ledger.chem_lab_fee },
                         { label: "Aircon Fee:", val: ledger.aircon_fee },
                         { label: "Shop Fee:", val: ledger.shop_fee },
                         { label: "Other & New Fees:", val: ledger.other_fees },
                         { label: "I.D. Fee:", val: ledger.id_fee },
                         { label: "Subscription fee:", val: ledger.subscription_fee }
                       ].map((r, i) => (
                         <tr key={i}>
                           <td>{r.label}</td>
                           <td></td>
                           <td style={{ textAlign: 'right' }} className={r.val ? "bold-val" : ""}>
                              {r.val ? Number(r.val).toLocaleString('en-US', {minimumFractionDigits:2}) : "-"}
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
                         <td style={{ textAlign: 'right' }}>{ledger.discount > 0 ? Number(ledger.discount).toLocaleString('en-US', {minimumFractionDigits:2}) : "-"}</td>
                       </tr>
                       <tr>
                         <td style={{ fontWeight: 'bold' }}>Back Account:</td>
                         <td></td>
                         <td style={{ textAlign: 'right' }}>{ledger.bank_account > 0 ? Number(ledger.bank_account).toLocaleString('en-US', {minimumFractionDigits:2}) : "-"}</td>
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
                       {ledger.bill_of_payment || "-"}
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
                   
                   <div style={{ marginTop: 20, fontSize: 13, border: '1px solid #ccc', minHeight: 80, padding: 5 }}>
                     <strong>Notes:</strong><br/>
                     <div style={{ whiteSpace: 'pre-wrap', marginTop: 5 }}>{ledger.notes}</div>
                   </div>
                   
                   <div style={{ position: 'absolute', bottom: 30, right: 30, fontSize: 9, color: '#aaa' }}>
                     Powered by sdmags
                   </div>
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
console.log("Updated LedgerModal successfully.");
