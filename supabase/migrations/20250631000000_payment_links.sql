-- Payment Links module

DO $$ BEGIN
  CREATE TYPE payment_link_type AS ENUM ('fixed', 'open');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE payment_link_status AS ENUM ('active', 'disabled', 'expired');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS payment_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  public_id TEXT NOT NULL UNIQUE,
  merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  link_type payment_link_type NOT NULL DEFAULT 'fixed',
  amount BIGINT,
  currency TEXT NOT NULL REFERENCES currencies(code),
  status payment_link_status NOT NULL DEFAULT 'active',
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT payment_links_fixed_amount CHECK (
    link_type = 'open' OR amount IS NOT NULL
  ),
  CONSTRAINT payment_links_open_amount CHECK (
    link_type = 'fixed' OR amount IS NULL
  )
);

CREATE INDEX IF NOT EXISTS payment_links_merchant_created_idx
  ON payment_links(merchant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS payment_links_public_id_idx ON payment_links(public_id);
CREATE INDEX IF NOT EXISTS payment_links_status_idx ON payment_links(status);

CREATE TABLE IF NOT EXISTS payment_link_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_link_id UUID NOT NULL REFERENCES payment_links(id) ON DELETE CASCADE,
  payment_id UUID NOT NULL UNIQUE REFERENCES payments(id) ON DELETE CASCADE,
  amount BIGINT NOT NULL,
  currency TEXT NOT NULL REFERENCES currencies(code),
  payer_phone TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS payment_link_payments_link_id_idx
  ON payment_link_payments(payment_link_id, created_at DESC);

ALTER TABLE payment_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_link_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS payment_links_merchant_select ON payment_links;
CREATE POLICY payment_links_merchant_select ON payment_links FOR SELECT USING (
  merchant_id IN (SELECT merchant_id FROM merchant_users WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS payment_links_merchant_insert ON payment_links;
CREATE POLICY payment_links_merchant_insert ON payment_links FOR INSERT WITH CHECK (
  merchant_id IN (SELECT merchant_id FROM merchant_users WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS payment_links_merchant_update ON payment_links;
CREATE POLICY payment_links_merchant_update ON payment_links FOR UPDATE USING (
  merchant_id IN (SELECT merchant_id FROM merchant_users WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS payment_link_payments_merchant_select ON payment_link_payments;
CREATE POLICY payment_link_payments_merchant_select ON payment_link_payments FOR SELECT USING (
  payment_link_id IN (
    SELECT id FROM payment_links WHERE merchant_id IN (
      SELECT merchant_id FROM merchant_users WHERE user_id = auth.uid()
    )
  )
);
