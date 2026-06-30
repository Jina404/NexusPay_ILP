-- Hackathon demo: configure Uganda merchant for cross-border pitch narrative
-- Replace placeholders before running in Supabase SQL Editor.

-- 1. Find your merchant by email
-- SELECT id, business_name, email, country FROM merchants WHERE email = 'your@email.com';

-- 2. Update merchant profile for demo
UPDATE merchants
SET
  business_name = 'Savana Traders Uganda',
  country = 'UG',
  settlement_currency = 'UGX',
  status = 'active'
WHERE email = 'YOUR_MERCHANT_EMAIL@example.com';

-- 3. Verify user link
-- SELECT m.*, mu.user_id
-- FROM merchants m
-- JOIN merchant_users mu ON mu.merchant_id = m.id
-- WHERE m.email = 'YOUR_MERCHANT_EMAIL@example.com';
