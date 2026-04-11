import dotenv from 'dotenv';
import pg from 'pg';
dotenv.config();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  const finalUser = { role: 'saps', id: 3 }; // just mocking
  
  const authRecords = await pool.query("SELECT module, can_read, can_write, can_delete FROM \"authorization\" WHERE role=$1", [finalUser.role]).then(r => r.rows);
  const userPerms = await pool.query("SELECT module, can_read, can_write, can_delete FROM user_permissions WHERE user_id=$1", [finalUser.id]).then(r => r.rows);
  
  const permissions = {};
  if (authRecords) {
    for (const p of authRecords) {
      permissions[p.module] = { 
        can_read: !!p.can_read, 
        can_write: !!p.can_write, 
        can_delete: !!p.can_delete 
      };
    }
  }
  if (userPerms) {
    for (const p of userPerms) {
      if (!permissions[p.module]) permissions[p.module] = { can_read: false, can_write: false, can_delete: false };
      if (p.can_read !== null) permissions[p.module].can_read = !!p.can_read;
      if (p.can_write !== null) permissions[p.module].can_write = !!p.can_write;
      if (p.can_delete !== null) permissions[p.module].can_delete = !!p.can_delete;
    }
  }

  console.log("FINAL permissions object:", JSON.stringify(permissions, null, 2));
  process.exit(0);
}
run();
