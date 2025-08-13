-- Insert monthly recurring transactions (due on specific day of month)
INSERT INTO transactions (description, amount, category_id, date, type, frequency, monthly_options, is_recurring) VALUES
('Rent Part 1', 1650.00, NULL, '2025-01-27', 'expense', 'monthly', '{"dayOfMonth": 1}', true),
('Renter''s Insurance', 19.00, NULL, '2025-01-27', 'expense', 'monthly', '{"dayOfMonth": 12}', true),
('Car Payment (Jon)', 793.00, NULL, '2025-01-27', 'expense', 'monthly', '{"dayOfMonth": 10}', true),
('Electricity', 150.00, NULL, '2025-01-27', 'expense', 'monthly', '{"dayOfMonth": 17}', true),
('Internet', 81.00, NULL, '2025-01-27', 'expense', 'monthly', '{"dayOfMonth": 23}', true),
('Spotify (Jon)', 373.00, NULL, '2025-01-27', 'expense', 'monthly', '{"dayOfMonth": 24}', true),
('Shelby''s Bank Charge', 120.00, NULL, '2025-01-27', 'expense', 'monthly', '{"dayOfMonth": 16}', true),
('Flex Monthly Payment', 15.00, NULL, '2025-01-27', 'expense', 'monthly', '{"dayOfMonth": 14}', true),
('Rue bear pet insurance', 83.00, NULL, '2025-01-27', 'expense', 'monthly', '{"dayOfMonth": 12}', true),
('Rent Part 2', 1065.00, NULL, '2025-08-18', 'expense', 'monthly', '{"dayOfMonth": 18}', true),
('Disney+', 11.00, NULL, '2025-01-27', 'expense', 'monthly', '{"dayOfMonth": 26}', true),
('Netflix', 18.00, NULL, '2025-01-27', 'expense', 'monthly', '{"dayOfMonth": 15}', true),
('Amazon Prime (Shelby)', 16.00, NULL, '2025-01-27', 'expense', 'monthly', '{"dayOfMonth": 2}', true),
('Peloton Membership', 45.00, NULL, '2025-01-27', 'expense', 'monthly', '{"dayOfMonth": 30}', true),
('Food', 200.00, NULL, '2025-01-27', 'expense', 'weekly', '{"dayOfMonth": 15}', true),
('BLUE APRON', 120.00, NULL, '2025-01-27', 'expense', 'weekly', '{"dayOfMonth": 25}', true),
('Gas', 35.00, NULL, '2025-01-27', 'expense', 'weekly', '{"dayOfMonth": 16}', true),
('Desmond Medical', 50.00, NULL, '2025-01-27', 'expense', 'monthly', '{"dayOfMonth": 30}', true),
('JetBrains', 32.00, NULL, '2025-01-27', 'expense', 'monthly', '{"dayOfMonth": 21}', true),
('Portfolio Recovery', 32.00, NULL, '2025-01-27', 'expense', 'monthly', '{"dayOfMonth": 21}', true),
('Cursor', 20.00, NULL, '2025-08-21', 'expense', 'monthly', '{"dayOfMonth": 21}', true),

-- Credit Card Payments
('Chase', 32.00, NULL, '2025-01-27', 'expense', 'monthly', '{"dayOfMonth": 21}', true),
('Affirm', 32.00, NULL, '2025-01-27', 'expense', 'monthly', '{"dayOfMonth": 21}', true),
('Capital One', 32.00, NULL, '2025-01-27', 'expense', 'monthly', '{"dayOfMonth": 21}', true),
('Discover', 32.00, NULL, '2025-01-27', 'expense', 'monthly', '{"dayOfMonth": 21}', true),
('IRS', 32.00, NULL, '2025-01-27', 'expense', 'monthly', '{"dayOfMonth": 21}', true);

