import { initializePool, closePool, query } from './src/utils/database';
import dotenv from 'dotenv';

dotenv.config();

async function testConnection() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    console.error('❌ DATABASE_URL is not set in .env file');
    process.exit(1);
  }

  console.log('🔍 Testing database connection...');
  console.log(`📍 Connection string: ${connectionString.split('@')[1] || 'hidden'}`);

  try {
    // Initialize the pool
    const pool = initializePool(connectionString);
    console.log('✅ Pool initialized');

    // Test a simple query
    const result = await query('SELECT NOW() as current_time, version() as db_version');
    console.log('\n✅ Connection successful!');
    console.log('\n📊 Database Info:');
    console.log(`   Current Time: ${result.rows[0].current_time}`);
    console.log(`   PostgreSQL Version: ${result.rows[0].db_version}`);

    // Test if excel_import database exists and has tables
    const dbResult = await query(`
      SELECT datname FROM pg_database
      WHERE datname = 'excel_import'
    `);

    if (dbResult.rows.length > 0) {
      console.log('\n✅ excel_import database exists');

      // List all tables
      const tablesResult = await query(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        ORDER BY table_name
      `);

      if (tablesResult.rows.length > 0) {
        console.log('\n📋 Existing tables:');
        tablesResult.rows.forEach((row: any) => {
          console.log(`   - ${row.table_name}`);
        });
      } else {
        console.log('\n📋 No tables found in excel_import database');
      }
    } else {
      console.log('\n⚠️  excel_import database not found');
    }

    await closePool();
    console.log('\n✅ Connection closed successfully');
  } catch (error: any) {
    console.error('\n❌ Connection failed!');
    console.error(`Error: ${error.message}`);
    if (error.code === 'ECONNREFUSED') {
      console.error('\n💡 Tip: Make sure PostgreSQL is running on localhost:5432');
    } else if (error.code === '3D000') {
      console.error('\n💡 Tip: Database "excel_import" does not exist. Create it first.');
    }
    process.exit(1);
  }
}

testConnection();
