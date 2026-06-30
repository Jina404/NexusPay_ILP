-- Run in Supabase SQL Editor to see which NexusPay migrations are already applied.
-- https://supabase.com/dashboard/project/psqjqxsxjeiduuyhkcgt/sql/new

-- Custom types (migration 1 + 2 + 4)
SELECT typname AS type_name,
  CASE typname
    WHEN 'user_role' THEN 'migration 1 — initial_schema'
    WHEN 'payment_status' THEN 'migration 1 — initial_schema'
    WHEN 'product_status' THEN 'migration 2 — marketplace'
    WHEN 'order_status' THEN 'migration 2 — marketplace'
    WHEN 'merchant_status' THEN 'migration 4 — gateway_core'
    ELSE 'other'
  END AS likely_from
FROM pg_type
WHERE typname IN (
  'user_role', 'payment_status', 'product_status', 'order_status',
  'merchant_status', 'gateway_payment_status'
)
ORDER BY typname;

-- Core tables
SELECT table_name,
  CASE table_name
    WHEN 'profiles' THEN 'migration 1'
    WHEN 'accounts' THEN 'migration 1'
    WHEN 'payments' THEN 'migration 1 only (run migration 4 to rename → ilp_payments)'
    WHEN 'ilp_payments' THEN 'migration 4 applied'
    WHEN 'categories' THEN 'migration 2'
    WHEN 'products' THEN 'migration 2'
    WHEN 'orders' THEN 'migration 2'
    WHEN 'merchants' THEN 'migration 4'
    ELSE '—'
  END AS likely_from
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'profiles', 'accounts', 'payments', 'ilp_payments',
    'categories', 'products', 'carts', 'orders',
    'merchants', 'gateway_payments'
  )
ORDER BY table_name;

-- Auth signup trigger (migration 3)
SELECT trigger_name, event_object_schema, event_object_table
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';

-- Storage bucket (migration 5)
SELECT id, name, public
FROM storage.buckets
WHERE id IN ('brand-assets', 'product-images');
