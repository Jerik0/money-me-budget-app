const { query } = require('./connection');

// Database schema initialization
const initSchema = async () => {
  try {
    console.log('🔧 Initializing database schema...');
    
    // Create categories table
    await query(`
      CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Create transactions table
    await query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id SERIAL PRIMARY KEY,
        description VARCHAR(255) NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
        date DATE NOT NULL,
        type VARCHAR(20) NOT NULL CHECK (type IN ('income', 'expense')),
        is_recurring BOOLEAN DEFAULT FALSE,
        frequency VARCHAR(20),
        monthly_options JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Create recurring_transactions table
    await query(`
      CREATE TABLE IF NOT EXISTS recurring_transactions (
        id SERIAL PRIMARY KEY,
        description VARCHAR(255) NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
        start_date DATE NOT NULL,
        end_date DATE,
        frequency VARCHAR(20) NOT NULL CHECK (frequency IN ('once', 'daily', 'weekly', 'bi-weekly', 'monthly', 'yearly')),
        monthly_options JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Insert default categories
    await query(`
      INSERT INTO categories (name) VALUES ('Uncategorized')
      ON CONFLICT (name) DO NOTHING;
    `);
    
    // Create indexes for better performance
    await query(`
      CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
    `);
    
    await query(`
      CREATE INDEX IF NOT EXISTS idx_transactions_category_id ON transactions(category_id);
    `);
    
    await query(`
      CREATE INDEX IF NOT EXISTS idx_recurring_transactions_start_date ON recurring_transactions(start_date);
    `);
    
    await query(`
      CREATE INDEX IF NOT EXISTS idx_recurring_transactions_frequency ON recurring_transactions(frequency);
    `);
    
    // Create function to update updated_at timestamp
    await query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = CURRENT_TIMESTAMP;
          RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);
    
    // Create triggers to automatically update updated_at (with conflict handling)
    try {
      await query(`
        CREATE TRIGGER update_categories_updated_at 
        BEFORE UPDATE ON categories
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
      `);
    } catch (error) {
      if (error.code !== '42710') { // Ignore "trigger already exists" error
        console.warn('⚠️  Warning creating categories trigger:', error.message);
      }
    }
    
    try {
      await query(`
        CREATE TRIGGER update_transactions_updated_at 
        BEFORE UPDATE ON transactions
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
      `);
    } catch (error) {
      if (error.code !== '42710') { // Ignore "trigger already exists" error
        console.warn('⚠️  Warning creating transactions trigger:', error.message);
      }
    }
    
    try {
      await query(`
        CREATE TRIGGER update_recurring_transactions_updated_at 
        BEFORE UPDATE ON recurring_transactions
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
      `);
    } catch (error) {
      if (error.code !== '42710') { // Ignore "trigger already exists" error
        console.warn('⚠️  Warning creating recurring_transactions trigger:', error.message);
      }
    }
    
    console.log('✅ Database schema initialized successfully');
    return true;
    
  } catch (error) {
    console.error('❌ Failed to initialize database schema:', error);
    return false;
  }
};

module.exports = { initSchema };
