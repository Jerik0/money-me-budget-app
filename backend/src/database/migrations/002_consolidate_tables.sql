-- Migration: 002_consolidate_tables.sql
-- Description: Consolidate recurring_transactions and transactions tables into a single transactions table
-- Date: 2025-01-27

-- Step 1: Add frequency-related columns to transactions table
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS frequency VARCHAR(20) CHECK (frequency IN ('once', 'daily', 'weekly', 'bi-weekly', 'monthly', 'yearly')),
ADD COLUMN IF NOT EXISTS monthly_options JSONB,
ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT FALSE;

-- Step 2: Migrate data from recurring_transactions to transactions
INSERT INTO transactions (description, amount, category_id, date, type, frequency, monthly_options, is_recurring)
SELECT 
    description,
    amount,
    category_id,
    start_date as date,
    'expense' as type, -- All recurring transactions are expenses
    frequency,
    monthly_options,
    TRUE as is_recurring
FROM recurring_transactions;

-- Step 3: Drop the recurring_transactions table
DROP TABLE IF EXISTS recurring_transactions CASCADE;

-- Step 4: Update the transactions table to make frequency required for recurring transactions
ALTER TABLE transactions 
ALTER COLUMN frequency SET NOT NULL,
ALTER COLUMN is_recurring SET NOT NULL;

-- Step 5: Create new indexes for the consolidated table
CREATE INDEX IF NOT EXISTS idx_transactions_frequency ON transactions(frequency);
CREATE INDEX IF NOT EXISTS idx_transactions_is_recurring ON transactions(is_recurring);

-- Step 6: Drop old indexes that are no longer needed
DROP INDEX IF EXISTS idx_recurring_transactions_start_date;
DROP INDEX IF EXISTS idx_recurring_transactions_frequency;

COMMIT;
