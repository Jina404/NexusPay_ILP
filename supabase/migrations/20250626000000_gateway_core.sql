-- NexusPay Payment Gateway core schema
-- Renames legacy ILP payments table; adds merchants, ledger, wallets, gateway payments

-- Rename legacy ILP-centric payments (marketplace / Rafiki bridge)
ALTER TABLE payments RENAME TO ilp_payments;
ALTER INDEX payments_outgoing_payment_id_idx RENAME TO ilp_payments_outgoing_payment_id_idx;
ALTER INDEX payments_mpesa_checkout_request_id_idx RENAME TO ilp_payments_mpesa_checkout_request_id_idx;
ALTER INDEX payments_status_idx RENAME TO ilp_payments_status_idx;

DROP POLICY IF EXISTS payments_select_own ON ilp_payments;
CREATE POLICY ilp_payments_select_own ON ilp_payments
  FOR SELECT USING (
    auth.uid() IN (
      SELECT user_id FROM accounts WHERE id = ilp_payments.buyer_account_id
      UNION
      SELECT user_id FROM accounts WHERE id = ilp_payments.seller_account_id
    )
  );

DROP TRIGGER IF EXISTS payments_updated_at ON ilp_payments;
CREATE TRIGGER ilp_payments_updated_at BEFORE UPDATE ON ilp_payments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Fix mpesa_callbacks FK
ALTER TABLE mpesa_callbacks DROP CONSTRAINT IF EXISTS mpesa_callbacks_payment_id_fkey;
ALTER TABLE mpesa_callbacks
  ADD CONSTRAINT mpesa_callbacks_payment_id_fkey
  FOREIGN KEY (payment_id) REFERENCES ilp_payments(id);

-- Link marketplace profiles to gateway merchants
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS merchant_id UUID;

-- Enums
CREATE TYPE merchant_status AS ENUM ('pending', 'active', 'suspended', 'closed');
CREATE TYPE wallet_owner_type AS ENUM ('merchant', 'customer', 'platform', 'escrow', 'settlement');
CREATE TYPE wallet_status AS ENUM ('active', 'frozen', 'closed');
CREATE TYPE gateway_payment_status AS ENUM (
  'pending', 'processing', 'completed', 'failed', 'expired', 'refunded', 'partially_refunded'
);
CREATE TYPE payment_method AS ENUM ('mpesa', 'airtel', 'card', 'bank');
CREATE TYPE payment_attempt_status AS ENUM ('pending', 'success', 'failed');
CREATE TYPE payout_status AS ENUM ('pending', 'processing', 'completed', 'failed', 'cancelled');
CREATE TYPE payout_destination_type AS ENUM ('bank', 'mpesa', 'airtel_wallet');
CREATE TYPE refund_status AS ENUM ('pending', 'processing', 'completed', 'failed');
CREATE TYPE settlement_status AS ENUM ('pending', 'processing', 'completed', 'failed');
CREATE TYPE settlement_method AS ENUM ('local', 'cross_border_ilp', 'manual');
CREATE TYPE ledger_account_type AS ENUM (
  'asset', 'liability', 'revenue', 'expense', 'equity'
);
CREATE TYPE escrow_status AS ENUM ('held', 'released', 'refunded', 'disputed');
CREATE TYPE fraud_decision AS ENUM ('allow', 'review', 'block');

-- Merchants
CREATE TABLE merchants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  status merchant_status NOT NULL DEFAULT 'pending',
  country TEXT NOT NULL DEFAULT 'KE',
  settlement_currency TEXT NOT NULL DEFAULT 'KES',
  fee_rate_bps INTEGER NOT NULL DEFAULT 300,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX merchants_email_idx ON merchants(lower(email));

CREATE TABLE merchant_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'owner',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (merchant_id, user_id)
);

CREATE TABLE merchant_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  key_prefix TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT 'default',
  last_used_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX merchant_api_keys_merchant_id_idx ON merchant_api_keys(merchant_id);

ALTER TABLE profiles
  ADD CONSTRAINT profiles_merchant_id_fkey
  FOREIGN KEY (merchant_id) REFERENCES merchants(id) ON DELETE SET NULL;

-- Customers
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  phone TEXT,
  email TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX customers_merchant_phone_idx ON customers(merchant_id, phone);

-- Currencies (Phase 16 prep)
CREATE TABLE currencies (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  scale SMALLINT NOT NULL DEFAULT 2,
  rafiki_asset_id TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO currencies (code, name, scale) VALUES
  ('KES', 'Kenyan Shilling', 2),
  ('UGX', 'Ugandan Shilling', 0),
  ('TZS', 'Tanzanian Shilling', 2),
  ('USD', 'US Dollar', 2),
  ('EUR', 'Euro', 2),
  ('SSP', 'South Sudanese Pound', 2)
ON CONFLICT (code) DO NOTHING;

CREATE TABLE exchange_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  base_currency TEXT NOT NULL REFERENCES currencies(code),
  quote_currency TEXT NOT NULL REFERENCES currencies(code),
  rate NUMERIC(20, 10) NOT NULL,
  source TEXT NOT NULL DEFAULT 'manual',
  effective_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX exchange_rates_pair_idx ON exchange_rates(base_currency, quote_currency, effective_at DESC);

CREATE TABLE fx_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID REFERENCES merchants(id),
  from_currency TEXT NOT NULL REFERENCES currencies(code),
  to_currency TEXT NOT NULL REFERENCES currencies(code),
  from_amount BIGINT NOT NULL,
  to_amount BIGINT NOT NULL,
  rate NUMERIC(20, 10) NOT NULL,
  settlement_id UUID,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Accounting wallets (per owner per currency)
CREATE TABLE wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_type wallet_owner_type NOT NULL,
  owner_id UUID NOT NULL,
  currency TEXT NOT NULL REFERENCES currencies(code),
  balance BIGINT NOT NULL DEFAULT 0,
  status wallet_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (owner_type, owner_id, currency)
);

CREATE INDEX wallets_owner_idx ON wallets(owner_type, owner_id);

-- Double-entry ledger
CREATE TABLE ledger_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_type ledger_account_type NOT NULL,
  account_code TEXT NOT NULL UNIQUE,
  account_name TEXT NOT NULL,
  currency TEXT NOT NULL REFERENCES currencies(code),
  wallet_id UUID REFERENCES wallets(id),
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE ledger_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference TEXT NOT NULL,
  description TEXT,
  currency TEXT NOT NULL REFERENCES currencies(code),
  metadata JSONB NOT NULL DEFAULT '{}',
  reversed_by UUID REFERENCES ledger_transactions(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ledger_transactions_reference_idx ON ledger_transactions(reference);

CREATE TABLE ledger_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES ledger_transactions(id) ON DELETE CASCADE,
  ledger_account_id UUID NOT NULL REFERENCES ledger_accounts(id),
  entry_type TEXT NOT NULL CHECK (entry_type IN ('debit', 'credit')),
  amount BIGINT NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL REFERENCES currencies(code),
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ledger_entries_transaction_idx ON ledger_entries(transaction_id);
CREATE INDEX ledger_entries_account_idx ON ledger_entries(ledger_account_id);

-- Gateway payments
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES merchants(id),
  customer_id UUID REFERENCES customers(id),
  amount BIGINT NOT NULL,
  currency TEXT NOT NULL REFERENCES currencies(code),
  fee_amount BIGINT NOT NULL DEFAULT 0,
  net_amount BIGINT NOT NULL DEFAULT 0,
  status gateway_payment_status NOT NULL DEFAULT 'pending',
  payment_method payment_method NOT NULL,
  checkout_reference TEXT NOT NULL UNIQUE,
  external_reference TEXT,
  customer_phone TEXT,
  customer_email TEXT,
  idempotency_key TEXT UNIQUE,
  metadata JSONB NOT NULL DEFAULT '{}',
  ilp_payment_id UUID REFERENCES ilp_payments(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX payments_merchant_id_idx ON payments(merchant_id);
CREATE INDEX payments_status_idx ON payments(status);
CREATE INDEX payments_checkout_reference_idx ON payments(checkout_reference);

CREATE TABLE payment_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  provider_reference TEXT,
  status payment_attempt_status NOT NULL DEFAULT 'pending',
  raw_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX payment_attempts_payment_id_idx ON payment_attempts(payment_id);
CREATE INDEX payment_attempts_provider_ref_idx ON payment_attempts(provider, provider_reference);

-- Payouts, refunds, settlements
CREATE TABLE payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES merchants(id),
  amount BIGINT NOT NULL,
  currency TEXT NOT NULL REFERENCES currencies(code),
  destination_type payout_destination_type NOT NULL,
  destination_reference TEXT NOT NULL,
  status payout_status NOT NULL DEFAULT 'pending',
  idempotency_key TEXT UNIQUE,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES payments(id),
  amount BIGINT NOT NULL,
  currency TEXT NOT NULL REFERENCES currencies(code),
  status refund_status NOT NULL DEFAULT 'pending',
  reason TEXT,
  idempotency_key TEXT UNIQUE,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES merchants(id),
  amount BIGINT NOT NULL,
  currency TEXT NOT NULL REFERENCES currencies(code),
  settlement_method settlement_method NOT NULL DEFAULT 'local',
  status settlement_status NOT NULL DEFAULT 'pending',
  destination_currency TEXT REFERENCES currencies(code),
  fx_transaction_id UUID REFERENCES fx_transactions(id),
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Escrow
CREATE TABLE escrows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES payments(id) UNIQUE,
  merchant_id UUID NOT NULL REFERENCES merchants(id),
  amount BIGINT NOT NULL,
  currency TEXT NOT NULL REFERENCES currencies(code),
  status escrow_status NOT NULL DEFAULT 'held',
  release_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Fraud
CREATE TABLE fraud_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID REFERENCES payments(id),
  merchant_id UUID REFERENCES merchants(id),
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
  decision fraud_decision NOT NULL,
  rules_triggered JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE fraud_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  flag_type TEXT NOT NULL,
  reason TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Audit
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  payload JSONB NOT NULL DEFAULT '{}',
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX audit_logs_actor_idx ON audit_logs(actor, created_at DESC);
CREATE INDEX audit_logs_entity_idx ON audit_logs(entity_type, entity_id);

-- Marketplace bridge
ALTER TABLE orders ADD COLUMN IF NOT EXISTS gateway_payment_id UUID REFERENCES payments(id);

-- Chart of accounts seed (platform KES)
INSERT INTO ledger_accounts (account_type, account_code, account_name, currency) VALUES
  ('asset', 'cash_mpesa', 'M-Pesa Cash', 'KES'),
  ('asset', 'cash_airtel', 'Airtel Money Cash', 'KES'),
  ('asset', 'cash_card', 'Card Acquirer Cash', 'KES'),
  ('asset', 'cash_bank', 'Bank Cash', 'KES'),
  ('liability', 'merchant_payable', 'Merchant Payable', 'KES'),
  ('liability', 'escrow_liability', 'Escrow Liability', 'KES'),
  ('liability', 'settlement_clearing', 'Settlement Clearing', 'KES'),
  ('revenue', 'platform_revenue', 'Platform Revenue', 'KES'),
  ('expense', 'payout_fees', 'Payout Fees', 'KES')
ON CONFLICT (account_code) DO NOTHING;

-- Platform wallets
INSERT INTO wallets (owner_type, owner_id, currency, balance)
SELECT 'platform', '00000000-0000-0000-0000-000000000001'::uuid, 'KES', 0
WHERE NOT EXISTS (
  SELECT 1 FROM wallets WHERE owner_type = 'platform' AND currency = 'KES'
);

-- RLS
ALTER TABLE merchants ENABLE ROW LEVEL SECURITY;
ALTER TABLE merchant_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE merchant_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE escrows ENABLE ROW LEVEL SECURITY;
ALTER TABLE currencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE exchange_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY merchants_member_select ON merchants FOR SELECT USING (
  id IN (SELECT merchant_id FROM merchant_users WHERE user_id = auth.uid())
);

CREATE POLICY merchant_users_own ON merchant_users FOR SELECT USING (user_id = auth.uid());

CREATE POLICY customers_merchant_select ON customers FOR SELECT USING (
  merchant_id IN (SELECT merchant_id FROM merchant_users WHERE user_id = auth.uid())
);

CREATE POLICY wallets_merchant_select ON wallets FOR SELECT USING (
  owner_type = 'merchant' AND owner_id IN (
    SELECT merchant_id FROM merchant_users WHERE user_id = auth.uid()
  )
);

CREATE POLICY payments_merchant_select ON payments FOR SELECT USING (
  merchant_id IN (SELECT merchant_id FROM merchant_users WHERE user_id = auth.uid())
);

CREATE POLICY payouts_merchant_select ON payouts FOR SELECT USING (
  merchant_id IN (SELECT merchant_id FROM merchant_users WHERE user_id = auth.uid())
);

CREATE POLICY settlements_merchant_select ON settlements FOR SELECT USING (
  merchant_id IN (SELECT merchant_id FROM merchant_users WHERE user_id = auth.uid())
);

CREATE POLICY refunds_merchant_select ON refunds FOR SELECT USING (
  payment_id IN (
    SELECT id FROM payments WHERE merchant_id IN (
      SELECT merchant_id FROM merchant_users WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY currencies_read_all ON currencies FOR SELECT USING (true);
CREATE POLICY exchange_rates_read_all ON exchange_rates FOR SELECT USING (true);

-- Triggers
CREATE TRIGGER merchants_updated_at BEFORE UPDATE ON merchants
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER customers_updated_at BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER wallets_updated_at BEFORE UPDATE ON wallets
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER gateway_payments_updated_at BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER payment_attempts_updated_at BEFORE UPDATE ON payment_attempts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER payouts_updated_at BEFORE UPDATE ON payouts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER refunds_updated_at BEFORE UPDATE ON refunds
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER settlements_updated_at BEFORE UPDATE ON settlements
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER escrows_updated_at BEFORE UPDATE ON escrows
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
