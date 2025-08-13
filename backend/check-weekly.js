const { query } = require('./src/database/connection');

async function checkWeeklyTransactions() {
  try {
    console.log('🔍 Checking weekly transactions in database...');
    
    const result = await query(`
      SELECT description, date, frequency 
      FROM transactions 
      WHERE frequency = 'weekly' 
      ORDER BY date
    `);
    
    console.log('📊 Weekly transactions found:');
    result.rows.forEach(row => {
      console.log(`  - ${row.description}: ${row.date} (${row.frequency})`);
    });
    
    console.log(`\nTotal weekly transactions: ${result.rows.length}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error checking weekly transactions:', error);
    process.exit(1);
  }
}

checkWeeklyTransactions();
