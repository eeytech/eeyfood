
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import path from 'path';

// Try to load .env from root or packages/db
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), 'packages/db/.env') });

async function checkDb() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('❌ DATABASE_URL not found in environment');
    process.exit(1);
  }

  console.log('🔗 Connecting to:', connectionString.replace(/:[^:@]+@/, ':****@'));
  
  const pool = new Pool({ connectionString });
  
  try {
    const res = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'Order' AND column_name = 'couponDiscountAmount';
    `);

    if (res.rows.length > 0) {
      console.log('✅ Column "couponDiscountAmount" EXISTS in table "Order"');
    } else {
      console.error('❌ Column "couponDiscountAmount" DOES NOT EXIST in table "Order"');
      
      const tables = await pool.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public';
      `);
      console.log('Existing tables:', tables.rows.map(r => r.table_name).join(', '));
    }
  } catch (err) {
    console.error('❌ Error querying database:', err.message);
  } finally {
    await pool.end();
  }
}

checkDb();
