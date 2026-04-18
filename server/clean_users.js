import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function cleanUsers() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const rolesToKeep = ['owner', 'admin', 'registrar', 'saps', 'teacher', 'cashier'];
    
    console.log(`Keeping roles: ${rolesToKeep.join(', ')}`);
    
    // Find the IDs of the users we want to delete (i.e. roles NOT in the keep list)
    // Be careful, maybe there are 'student' roles we are deleting.
    const res = await client.query(`
      SELECT id, username, role FROM users 
      WHERE role NOT IN ($1, $2, $3, $4, $5, $6)
    `, rolesToKeep);
    
    const usersToDelete = res.rows;
    if (usersToDelete.length === 0) {
      console.log("No users found to delete that don't match the required roles.");
      await client.query('ROLLBACK');
      return;
    }

    const idsToDelete = usersToDelete.map(u => u.id);
    console.log(`Found ${idsToDelete.length} users to delete.`);
    
    // We need to delete from dependent tables first.
    console.log("Deleting dependent records in audit_log...");
    await client.query(`DELETE FROM audit_log WHERE user_id = ANY($1::int[])`, [idsToDelete]);
    
    console.log("Deleting dependent records in user_permissions...");
    await client.query(`DELETE FROM user_permissions WHERE user_id = ANY($1::int[])`, [idsToDelete]);
    
    // Assuming students might be linked to users
    // First, let's check if 'students' table has 'user_id'
    const studentCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='students' AND column_name='user_id'
    `);
    
    if (studentCheck.rows.length > 0) {
      // Find students linked to these users
      const studentRes = await client.query(`SELECT id FROM students WHERE user_id = ANY($1::int[])`, [idsToDelete]);
      const studentIds = studentRes.rows.map(s => s.id);
      
      if (studentIds.length > 0) {
        console.log(`Found ${studentIds.length} students linked to these users. Deleting dependent student records...`);
        // Delete dependent records of students
        await client.query(`DELETE FROM attendance_enrollments WHERE student_id = ANY($1::int[])`, [studentIds]).catch(e => console.log('No attendance_enrollments to delete or table missing.'));
        await client.query(`DELETE FROM attendance_records WHERE student_id = ANY($1::int[])`, [studentIds]).catch(e => console.log('No attendance_records to delete or table missing.'));
        await client.query(`DELETE FROM student_ledgers WHERE student_id = ANY($1::int[])`, [studentIds]).catch(e => console.log('No student_ledgers to delete or table missing.'));
        await client.query(`DELETE FROM grades WHERE student_id = ANY($1::int[])`, [studentIds]).catch(e => console.log('No grades to delete or table missing.'));
        await client.query(`DELETE FROM payments WHERE student_id = ANY($1::int[])`, [studentIds]).catch(e => console.log('No payments to delete or table missing.'));
        
        console.log("Deleting students...");
        await client.query(`DELETE FROM students WHERE user_id = ANY($1::int[])`, [idsToDelete]);
      }
    }
    
    console.log("Deleting users...");
    const deleteRes = await client.query(`DELETE FROM users WHERE id = ANY($1::int[])`, [idsToDelete]);
    
    console.log(`Successfully deleted ${deleteRes.rowCount} users.`);
    
    await client.query('COMMIT');
    console.log("Cleanup complete!");

  } catch (e) {
    await client.query('ROLLBACK');
    console.error("Error during cleanup:", e);
  } finally {
    client.release();
    pool.end();
  }
}

cleanUsers();
