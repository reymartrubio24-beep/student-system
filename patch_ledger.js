const fs = require('fs');
let src = fs.readFileSync('server/src/index.js', 'utf8');

const targetLedger = `app.get("/ledgers/:id", authRequired, async (req, res) => {
  const id = String(req.params.id);
  if (req.user.role === "student" && id !== req.user.student_id) return res.status(403).json({ error: "Forbidden" });
  const semester_id = req.query.semester_id ? Number(req.query.semester_id) : null;
  let ledger;
  if (semester_id) {
    ledger = await get("SELECT * FROM student_ledgers WHERE student_id = ? AND semester_id = ?", [id, semester_id]);
  } else {
    // Fallback: get most recently updated ledger for this student
    ledger = await get("SELECT * FROM student_ledgers WHERE student_id = ? ORDER BY semester_id DESC LIMIT 1", [id]);
  }
  if (!ledger) {
    ledger = {
      student_id: id, semester_id: semester_id, petition_class: "", regular_units: "", total_units: "",
      regular_unit_price: 204, petition_unit_price: 0,
      tuition_fee: 0, misc_fee: 0, internship_fee: 0,
      computer_lab_fee: 0, chem_lab_fee: 0, aircon_fee: 0, shop_fee: 0, other_fees: 0,
      id_fee: 0, subscription_fee: 0, discount: 0, bank_account: "", bill_of_payment: "", notes: ""
    };
  }
  res.json(ledger);
});`;

const replacementLedger = `app.get("/ledgers/:id", authRequired, async (req, res) => {
  const id = String(req.params.id);
  if (req.user.role === "student" && id !== req.user.student_id) return res.status(403).json({ error: "Forbidden" });
  const semester_id = req.query.semester_id ? Number(req.query.semester_id) : null;
  let ledger;
  if (semester_id) {
    ledger = await get("SELECT * FROM student_ledgers WHERE student_id = ? AND semester_id = ?", [id, semester_id]);
  } else {
    ledger = await get("SELECT * FROM student_ledgers WHERE student_id = ? ORDER BY semester_id DESC LIMIT 1", [id]);
  }
  if (!ledger) {
    ledger = {
      student_id: id, semester_id: semester_id, petition_class: "", regular_units: "", total_units: "",
      regular_unit_price: 204, petition_unit_price: 0,
      tuition_fee: 0, misc_fee: 0, internship_fee: 0,
      computer_lab_fee: 0, chem_lab_fee: 0, aircon_fee: 0, shop_fee: 0, other_fees: 0,
      id_fee: 0, subscription_fee: 0, discount: 0, bank_account: "", bill_of_payment: "", notes: ""
    };
  }
  
  // Apply auto-calculated units from grades/enrollments for this semester!
  const targetSem = ledger.semester_id || semester_id;
  if (targetSem) {
      const unitsRow = await get("SELECT SUM(CAST(s.units AS INTEGER)) as total_units FROM subjects s JOIN grades g ON g.subject_id = s.id WHERE g.student_id = ? AND g.deleted_at IS NULL AND g.semester_id = ?", [id, targetSem]);
      if (unitsRow && unitsRow.total_units > 0) {
          // Force UI to use the auto-calculation
          ledger.regular_units = String(unitsRow.total_units);
          
          // Recalculate tuition dynamically based on price
          const rPrice = Number(ledger.regular_unit_price || 204);
          const pPrice = Number(ledger.petition_unit_price || 0);
          
          // Parse petition units if any (extract numbers from string)
          const pMatch = String(ledger.petition_class || '').match(/\\d+/);
          const pUnits = pMatch ? Number(pMatch[0]) : 0;
          
          ledger.tuition_fee = (unitsRow.total_units * rPrice) + (pUnits * pPrice);
      }
  }

  res.json(ledger);
});`;

if(src.includes(targetLedger)) {
  src = src.replace(targetLedger, replacementLedger);
  fs.writeFileSync('server/src/index.js', src);
  console.log('Ledger auto-calc injected successfully!');
} else {
  console.log('Ledger auto-calc target not found!');
  process.exit(1);
}
