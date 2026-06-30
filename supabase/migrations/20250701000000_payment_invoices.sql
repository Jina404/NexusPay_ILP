-- Payment invoices / receipts + gateway M-Pesa callback audit

CREATE TABLE payment_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL UNIQUE REFERENCES payments(id) ON DELETE CASCADE,
  merchant_id UUID NOT NULL REFERENCES merchants(id),
  invoice_number TEXT NOT NULL UNIQUE,
  payer_phone TEXT,
  amount BIGINT NOT NULL,
  currency TEXT NOT NULL REFERENCES currencies(code),
  mpesa_receipt TEXT,
  line_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  pdf_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX payment_invoices_merchant_id_idx ON payment_invoices(merchant_id);
CREATE INDEX payment_invoices_created_at_idx ON payment_invoices(created_at DESC);

ALTER TABLE payment_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY payment_invoices_merchant_select ON payment_invoices FOR SELECT USING (
  merchant_id IN (SELECT merchant_id FROM merchant_users WHERE user_id = auth.uid())
);

-- Extend mpesa_callbacks for gateway payments and async Daraja products
ALTER TABLE mpesa_callbacks ADD COLUMN IF NOT EXISTS gateway_payment_id UUID REFERENCES payments(id);
ALTER TABLE mpesa_callbacks ADD COLUMN IF NOT EXISTS callback_type TEXT NOT NULL DEFAULT 'stk';

CREATE INDEX IF NOT EXISTS mpesa_callbacks_gateway_payment_id_idx ON mpesa_callbacks(gateway_payment_id);
