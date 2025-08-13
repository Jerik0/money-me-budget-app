const fs = require('fs');
const path = require('path');
const { query } = require('./src/database/connection');

async function runMigration() {
  try {
    console.log('🚀 Starting migration...');
    
    // Step 1: Clear the transactions table
    console.log('🗑️  Clearing transactions table...');
    await query('DELETE FROM transactions');
    console.log('✅ Transactions table cleared');
    
    // Step 2: Read and execute the insert-transactions.sql file
    console.log('📝 Reading insert-transactions.sql...');
    const migrationPath = path.join(__dirname, 'insert-transactions.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('⚡ Executing migration...');
    await query(migrationSQL);
    console.log('✅ Migration completed successfully!');
    
    // Step 3: Verify the migration
    console.log('🔍 Verifying migration...');
    const result = await query('SELECT COUNT(*) as count FROM transactions');
    console.log(`📊 Total transactions inserted: ${result.rows[0].count}`);
    
    console.log('🎉 Migration completed successfully!');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
runMigration();
