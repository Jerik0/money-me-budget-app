-- Insert monthly recurring transactions (due on specific day of month)
INSERT INTO recurring_transactions (description, amount, category_id, start_date, frequency, monthly_options) VALUES
('Rent', 2620.00, NULL, '2025-01-27', 'monthly', '{"dayOfMonth": 1}'),
('Renter''s Insurance', 20.00, NULL, '2025-01-27', 'monthly', '{"dayOfMonth": 12}'),
('Car Payment (Jon)', 40.00, NULL, '2025-01-27', 'monthly', '{"dayOfMonth": 10}'),
('Electricity', 793.00, NULL, '2025-01-27', 'monthly', '{"dayOfMonth": 17}'),
('Internet', 379.00, NULL, '2025-01-27', 'monthly', '{"dayOfMonth": 23}'),
('Spotify (Jon)', 373.00, NULL, '2025-01-27', 'monthly', '{"dayOfMonth": 24}'),
('Cutie''s Bank Charge', 120.00, NULL, '2025-01-27', 'monthly', '{"dayOfMonth": 16}'),
('Flex Monthly Payment', 100.00, NULL, '2025-01-27', 'monthly', '{"dayOfMonth": 14}'),
('Rue bear pet insurance', 80.00, NULL, '2025-01-27', 'monthly', '{"dayOfMonth": 27}'),
('Disney+', 11.00, NULL, '2025-01-27', 'monthly', '{"dayOfMonth": 26}'),
('Netflix (Shelby)', 11.00, NULL, '2025-01-27', 'monthly', '{"dayOfMonth": 15}'),
('Amazon Prime (Shelby)', 12.00, NULL, '2025-01-27', 'monthly', '{"dayOfMonth": 2}'),
('Peloton Membership', 200.00, NULL, '2025-01-27', 'monthly', '{"dayOfMonth": 30}'),
('Food x4', 73.00, NULL, '2025-01-27', 'monthly', '{"dayOfMonth": 15}'),
('BLUE APRON x4', 22.00, NULL, '2025-01-27', 'monthly', '{"dayOfMonth": 25}'),
('Gas x4', 16.00, NULL, '2025-01-27', 'monthly', '{"dayOfMonth": 16}'),
('Desmond Medical', 50.00, NULL, '2025-01-27', 'monthly', '{"dayOfMonth": 30}'),
('JetBrains', 32.00, NULL, '2025-01-27', 'monthly', '{"dayOfMonth": 21}');

-- Insert weekly recurring transactions (x4 = weekly)
INSERT INTO recurring_transactions (description, amount, category_id, start_date, frequency, monthly_options) VALUES
('Food x4', 73.00, NULL, '2025-01-27', 'weekly', NULL),
('BLUE APRON x4', 22.00, NULL, '2025-01-27', 'weekly', NULL),
('Gas x4', 16.00, NULL, '2025-01-27', 'weekly', NULL),
('Roth IRA Weekly x4', 0.00, NULL, '2025-01-27', 'weekly', NULL);



