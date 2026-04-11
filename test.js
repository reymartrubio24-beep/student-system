const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('server/student_system.db');

const sql = 
    SELECT s.id, 
      (
        IFNULL(l.tuition_fee,0) + IFNULL(l.misc_fee,0) + IFNULL(l.internship_fee,0) + 
        IFNULL(l.computer_lab_fee,0) + IFNULL(l.chem_lab_fee,0) + IFNULL(l.aircon_fee,0) + 
        IFNULL(l.shop_fee,0) + IFNULL(l.other_fees,0) + IFNULL(l.id_fee,0) + IFNULL(l.subscription_fee,0) - 
        IFNULL(l.discount,0) + IFNULL(l.bank_account,0)
      ) - IFNULL(p.total_paid, 0) as calculated_balance
    FROM students s
    LEFT JOIN student_ledgers l ON l.student_id = s.id
    LEFT JOIN (SELECT student_id, SUM(amount) as total_paid FROM payments GROUP BY student_id) p ON p.student_id = s.id
    WHERE s.deleted_at IS NULL LIMIT 5
;
db.all(sql, [], (err, rows) => {
    if(err) console.error(err);
    console.log(rows);
});
