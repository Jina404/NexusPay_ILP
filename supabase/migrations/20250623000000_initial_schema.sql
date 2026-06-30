-- NexusPay core schema

CREATE TYPE user_role AS ENUM ('buyer', 'seller');
CREATE TYPE payment_status AS ENUM (
  'created',
  'awaiting_mpesa',
  'funded',
  'completed',
  'failed',
  'expired'
);

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'buyer',
  country TEXT NOT NULL DEFAULT 'KE',
  phone TEXT,
  business_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  wallet_address_id TEXT,
  wallet_address_url TEXT,
  wallet_path TEXT NOT NULL,
  asset_code TEXT NOT NULL DEFAULT 'KES',
  asset_id TEXT,
  balance BIGINT NOT NULL DEFAULT 0,
  pending_debit BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, asset_code),
  UNIQUE (wallet_path)
);

CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_account_id UUID NOT NULL REFERENCES accounts(id),
  seller_account_id UUID NOT NULL REFERENCES accounts(id),
  amount_value BIGINT NOT NULL,
  amount_asset_code TEXT NOT NULL DEFAULT 'KES',
  amount_asset_scale SMALLINT NOT NULL DEFAULT 2,
  incoming_payment_id TEXT,
  incoming_payment_url TEXT,
  outgoing_payment_id TEXT,
  quote_id TEXT,
  mpesa_checkout_request_id TEXT,
  mpesa_merchant_request_id TEXT,
  mpesa_receipt_number TEXT,
  buyer_phone TEXT,
  status payment_status NOT NULL DEFAULT 'created',
  idempotency_key TEXT UNIQUE,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX payments_outgoing_payment_id_idx ON payments(outgoing_payment_id);
CREATE INDEX payments_mpesa_checkout_request_id_idx ON payments(mpesa_checkout_request_id);
CREATE INDEX payments_status_idx ON payments(status);

CREATE TABLE webhook_events (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  payload_json JSONB NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE mpesa_callbacks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checkout_request_id TEXT NOT NULL,
  merchant_request_id TEXT,
  result_code INTEGER NOT NULL,
  result_desc TEXT,
  mpesa_receipt_number TEXT,
  payment_id UUID REFERENCES payments(id),
  raw_payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX mpesa_callbacks_checkout_request_id_idx ON mpesa_callbacks(checkout_request_id);

CREATE TABLE rafiki_config (
  id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  tenant_id TEXT NOT NULL,
  api_secret TEXT NOT NULL,
  kes_asset_id TEXT,
  wallet_address_prefix TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE mpesa_callbacks ENABLE ROW LEVEL SECURITY;
ALTER TABLE rafiki_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY profiles_select_own ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY profiles_update_own ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY accounts_select_own ON accounts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY payments_select_own ON payments
  FOR SELECT USING (
    auth.uid() IN (
      SELECT user_id FROM accounts WHERE id = payments.buyer_account_id
      UNION
      SELECT user_id FROM accounts WHERE id = payments.seller_account_id
    )
  );

-- Service role bypasses RLS; no policies for webhook_events, mpesa_callbacks, rafiki_config

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER accounts_updated_at BEFORE UPDATE ON accounts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER payments_updated_at BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
