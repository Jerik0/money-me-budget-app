-- Migration: 001_populate_transactions.sql
-- Description: Populate database with initial transaction data using consolidated table structure
-- Date: 2025-01-27

-- Clear existing recurring transactions
DELETE FROM transactions WHERE is_recurring = TRUE;

-- Reset sequence for transactions
ALTER SEQUENCE transactions_id_seq RESTART WITH 1;

-- Insert monthly recurring transactions (due on specific day of month)
INSERT INTO transactions (description, amount, category_id, date, type, frequency, monthly_options, is_recurring) VALUES
('Rent', 2620.00, NULL, '2025-01-27', 'expense', 'monthly', '{"dayOfMonth": 1}', TRUE),
('Renter''s Insurance', 20.00, NULL, '2025-01-27', 'expense', 'monthly', '{"dayOfMonth": 12}', TRUE),
('Car Payment (Jon)', 40.00, NULL, '2025-01-27', 'expense', 'monthly', '{"dayOfMonth": 10}', TRUE),
('Electricity', 793.00, NULL, '2025-01-27', 'expense', 'monthly', '{"dayOfMonth": 17}', TRUE),
('Internet', 379.00, NULL, '2025-01-27', 'expense', 'monthly', '{"dayOfMonth": 23}', TRUE),
('Spotify (Jon)', 373.00, NULL, '2025-01-27', 'expense', 'monthly', '{"dayOfMonth": 24}', TRUE),
('Cutie''s Bank Charge', 120.00, NULL, '2025-01-27', 'expense', 'monthly', '{"dayOfMonth": 16}', TRUE),
('Flex Monthly Payment', 100.00, NULL, '2025-01-27', 'expense', 'monthly', '{"dayOfMonth": 14}', TRUE),
('Rue bear pet insurance', 80.00, NULL, '2025-01-27', 'expense', 'monthly', '{"dayOfMonth": 27}', TRUE),
('Disney+', 11.00, NULL, '2025-01-27', 'expense', 'monthly', '{"dayOfMonth": 26}', TRUE),
('Netflix (Shelby)', 11.00, NULL, '2025-01-27', 'expense', 'monthly', '{"dayOfMonth": 15}', TRUE),
('Amazon Prime (Shelby)', 12.00, NULL, '2025-01-27', 'expense', 'monthly', '{"dayOfMonth": 2}', TRUE),
('Peloton Membership', 200.00, NULL, '2025-01-27', 'expense', 'monthly', '{"dayOfMonth": 30}', TRUE),
('Food', 73.00, NULL, '2025-01-27', 'expense', 'monthly', '{"dayOfMonth": 15}', TRUE),
('BLUE APRON', 22.00, NULL, '2025-01-27', 'expense', 'monthly', '{"dayOfMonth": 25}', TRUE),
('Gas', 16.00, NULL, '2025-01-27', 'expense', 'monthly', '{"dayOfMonth": 16}', TRUE),
('Desmond Medical', 50.00, NULL, '2025-01-27', 'expense', 'monthly', '{"dayOfMonth": 30}', TRUE),
('JetBrains', 32.00, NULL, '2025-01-27', 'expense', 'monthly', '{"dayOfMonth": 21}', TRUE);

-- Insert weekly recurring transactions
INSERT INTO transactions (description, amount, category_id, date, type, frequency, monthly_options, is_recurring) VALUES
('Food', 73.00, NULL, '2025-01-27', 'expense', 'weekly', NULL, TRUE),
('BLUE APRON', 22.00, NULL, '2025-01-27', 'expense', 'weekly', NULL, TRUE),
('Gas', 16.00, NULL, '2025-01-27', 'expense', 'weekly', NULL, TRUE),
('Roth IRA Weekly', 0.00, NULL, '2025-01-27', 'expense', 'weekly', NULL, TRUE);

-- Note: Storage Unit was excluded as requested
-- Note: Priority column was ignored as requested
-- Note: Categories are set to NULL as requested

COMMIT;
