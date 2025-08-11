-- Initialize the Money Me App database
-- This script runs when the PostgreSQL container starts for the first time

-- Create categories table
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    description VARCHAR(255) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    date DATE NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('income', 'expense')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create recurring_transactions table
CREATE TABLE IF NOT EXISTS recurring_transactions (
    id SERIAL PRIMARY KEY,
    description VARCHAR(255) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    frequency VARCHAR(20) NOT NULL CHECK (frequency IN ('once', 'daily', 'weekly', 'bi-weekly', 'monthly', 'yearly')),
    monthly_options JSONB, -- For storing "last day" and "last weekday" options
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default categories
INSERT INTO categories (name) VALUES 
    ('Uncategorized'),
    ('Salary'),
    ('Freelance'),
    ('Investment'),
    ('Grocery'),
    ('Dining Out'),
    ('Transportation'),
    ('Housing'),
    ('Utilities'),
    ('Entertainment'),
    ('Shopping'),
    ('Healthcare'),
    ('Insurance'),
    ('Education'),
    ('Travel'),
    ('Gifts'),
    ('Subscriptions'),
    ('Gas'),
    ('Coffee'),
    ('Books')
ON CONFLICT (name) DO NOTHING;

-- Insert sample transaction data
INSERT INTO transactions (description, amount, category_id, date, type) VALUES
    -- Income transactions (last 3 months)
    ('Monthly Salary', 4500.00, (SELECT id FROM categories WHERE name = 'Salary'), CURRENT_DATE - INTERVAL '2 months', 'income'),
    ('Freelance Web Design', 1200.00, (SELECT id FROM categories WHERE name = 'Freelance'), CURRENT_DATE - INTERVAL '1 month', 'income'),
    ('Monthly Salary', 4500.00, (SELECT id FROM categories WHERE name = 'Salary'), CURRENT_DATE - INTERVAL '1 month', 'income'),
    ('Investment Dividends', 150.00, (SELECT id FROM categories WHERE name = 'Investment'), CURRENT_DATE - INTERVAL '2 weeks', 'income'),
    ('Monthly Salary', 4500.00, (SELECT id FROM categories WHERE name = 'Salary'), CURRENT_DATE, 'income'),
    
    -- Expense transactions (last 3 months)
    ('Grocery Shopping', 85.50, (SELECT id FROM categories WHERE name = 'Grocery'), CURRENT_DATE - INTERVAL '2 months', 'expense'),
    ('Rent Payment', 1200.00, (SELECT id FROM categories WHERE name = 'Housing'), CURRENT_DATE - INTERVAL '2 months', 'expense'),
    ('Electric Bill', 75.00, (SELECT id FROM categories WHERE name = 'Utilities'), CURRENT_DATE - INTERVAL '2 months', 'expense'),
    ('Netflix Subscription', 15.99, (SELECT id FROM categories WHERE name = 'Subscriptions'), CURRENT_DATE - INTERVAL '2 months', 'expense'),
    ('Gas Station', 45.00, (SELECT id FROM categories WHERE name = 'Gas'), CURRENT_DATE - INTERVAL '2 months', 'expense'),
    
    ('Lunch at Chipotle', 12.50, (SELECT id FROM categories WHERE name = 'Dining Out'), CURRENT_DATE - INTERVAL '1 month', 'expense'),
    ('Grocery Shopping', 92.30, (SELECT id FROM categories WHERE name = 'Grocery'), CURRENT_DATE - INTERVAL '1 month', 'expense'),
    ('Rent Payment', 1200.00, (SELECT id FROM categories WHERE name = 'Housing'), CURRENT_DATE - INTERVAL '1 month', 'expense'),
    ('Electric Bill', 68.50, (SELECT id FROM categories WHERE name = 'Utilities'), CURRENT_DATE - INTERVAL '1 month', 'expense'),
    ('Coffee at Starbucks', 4.50, (SELECT id FROM categories WHERE name = 'Coffee'), CURRENT_DATE - INTERVAL '1 month', 'expense'),
    ('Movie Tickets', 28.00, (SELECT id FROM categories WHERE name = 'Entertainment'), CURRENT_DATE - INTERVAL '1 month', 'expense'),
    ('Gas Station', 42.00, (SELECT id FROM categories WHERE name = 'Gas'), CURRENT_DATE - INTERVAL '1 month', 'expense'),
    
    ('Grocery Shopping', 78.90, (SELECT id FROM categories WHERE name = 'Grocery'), CURRENT_DATE - INTERVAL '1 week', 'expense'),
    ('Rent Payment', 1200.00, (SELECT id FROM categories WHERE name = 'Housing'), CURRENT_DATE, 'expense'),
    ('Electric Bill', 72.00, (SELECT id FROM categories WHERE name = 'Utilities'), CURRENT_DATE, 'expense'),
    ('Netflix Subscription', 15.99, (SELECT id FROM categories WHERE name = 'Subscriptions'), CURRENT_DATE, 'expense'),
    ('Lunch with Friends', 18.75, (SELECT id FROM categories WHERE name = 'Dining Out'), CURRENT_DATE - INTERVAL '3 days', 'expense'),
    ('Gas Station', 38.50, (SELECT id FROM categories WHERE name = 'Gas'), CURRENT_DATE - INTERVAL '2 days', 'expense'),
    ('Amazon Purchase', 67.25, (SELECT id FROM categories WHERE name = 'Shopping'), CURRENT_DATE - INTERVAL '1 day', 'expense'),
    ('Coffee at Local Shop', 3.75, (SELECT id FROM categories WHERE name = 'Coffee'), CURRENT_DATE, 'expense')
ON CONFLICT DO NOTHING;

-- Insert sample recurring transactions
INSERT INTO recurring_transactions (description, amount, category_id, start_date, frequency) VALUES
    ('Monthly Salary', 4500.00, (SELECT id FROM categories WHERE name = 'Salary'), CURRENT_DATE - INTERVAL '3 months', 'monthly'),
    ('Rent Payment', 1200.00, (SELECT id FROM categories WHERE name = 'Housing'), CURRENT_DATE - INTERVAL '3 months', 'monthly'),
    ('Netflix Subscription', 15.99, (SELECT id FROM categories WHERE name = 'Subscriptions'), CURRENT_DATE - INTERVAL '3 months', 'monthly'),
    ('Electric Bill', 75.00, (SELECT id FROM categories WHERE name = 'Utilities'), CURRENT_DATE - INTERVAL '3 months', 'monthly'),
    ('Grocery Shopping', 85.00, (SELECT id FROM categories WHERE name = 'Grocery'), CURRENT_DATE - INTERVAL '3 months', 'weekly'),
    ('Gas Station', 45.00, (SELECT id FROM categories WHERE name = 'Gas'), CURRENT_DATE - INTERVAL '3 months', 'weekly'),
    ('Coffee', 4.00, (SELECT id FROM categories WHERE name = 'Coffee'), CURRENT_DATE - INTERVAL '3 months', 'daily')
ON CONFLICT DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_category_id ON transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_recurring_transactions_start_date ON recurring_transactions(start_date);
CREATE INDEX IF NOT EXISTS idx_recurring_transactions_frequency ON recurring_transactions(frequency);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically update updated_at
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_recurring_transactions_updated_at BEFORE UPDATE ON recurring_transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
