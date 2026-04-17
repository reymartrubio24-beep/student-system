async function test() {
  try {
    const { all } = require('./server/src/db.js');
    console.log('DB connected');
    const query = `
    SELECT s.*, 
      ROUND((
        COALESCE(l.tuition_fee::numeric,0) + COALESCE(l.misc_fee::numeric,0) + COALESCE(l.internship_fee::numeric,0) + 
        COALESCE(l.computer_lab_fee::numeric,0) + COALESCE(l.chem_lab_fee::numeric,0) + COALESCE(l.aircon_fee::numeric,0) + 
        COALESCE(l.shop_fee::numeric,0) + COALESCE(l.other_fees::numeric,0) + COALESCE(l.id_fee::numeric,0) + COALESCE(l.subscription_fee::numeric,0) - 
        COALESCE(l.discount::numeric,0) + COALESCE(l.bank_account::numeric,0)
      ) - COALESCE(p.total_paid, 0), 2) as computed_balance
    FROM students s
    LEFT JOIN student_ledgers l ON l.student_id = s.id
    LEFT JOIN (SELECT student_id, SUM(amount) as total_paid FROM payments WHERE payment_type = 'Tuition' OR payment_type IS NULL GROUP BY student_id) p ON p.student_id = s.id
    WHERE s.deleted_at IS NULL
    LIMIT 2
    `;
    const rows = await all(query);
    console.log('Success, rows:', rows.length);
    process.exit(0);
  } catch(e) {
    console.log('Error in SQL:', e.message);
    process.exit(1);
  }
}
test();
