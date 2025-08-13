const fs = require('fs');
const path = require('path');
const { query } = require('../connection');

async function runMigration() {
  try {
    console.log('🚀 Starting migration: 001_populate_transactions.sql');
    
    // Read the migration file
    const migrationPath = path.join(__dirname, '001_populate_transactions.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Split the SQL into individual statements
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    // Execute each statement
    for (const statement of statements) {
      if (statement.trim()) {
        console.log(`📝 Executing: ${statement.substring(0, 50)}...`);
        await query(statement);
      }
    }
    
    console.log('✅ Migration completed successfully!');
    console.log('📊 Database has been populated with your transaction data.');
    
    // Verify the data was inserted
    const result = await query('SELECT COUNT(*) as count FROM recurring_transactions');
    console.log(`📈 Total recurring transactions: ${result.rows[0].count}`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration if this file is executed directly
if (require.main === module) {
  runMigration()
    .then(() => {
      console.log('🎉 Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Migration script failed:', error);
      process.exit(1);
    });
}

module.exports = { runMigration };



