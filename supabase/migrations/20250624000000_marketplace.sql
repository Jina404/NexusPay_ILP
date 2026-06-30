-- Marketplace schema for NexusPay wholesaler SaaS

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS business_registration_number TEXT,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT;

CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO categories (name, slug) VALUES
  ('Agriculture', 'agriculture'),
  ('Textiles', 'textiles'),
  ('Electronics', 'electronics'),
  ('Food & Beverage', 'food-beverage'),
  ('Construction', 'construction'),
  ('General', 'general')
ON CONFLICT (slug) DO NOTHING;

CREATE TYPE product_status AS ENUM ('draft', 'active', 'archived');

CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id),
  title TEXT NOT NULL,
  description TEXT,
  price_per_unit BIGINT NOT NULL,
  unit TEXT NOT NULL DEFAULT 'unit',
  min_order_qty INTEGER NOT NULL DEFAULT 1,
  origin_country TEXT NOT NULL DEFAULT 'KE',
  ships_to TEXT[] NOT NULL DEFAULT ARRAY['KE'],
  image_url TEXT,
  status product_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX products_seller_id_idx ON products(seller_id);
CREATE INDEX products_status_idx ON products(status);

CREATE TABLE carts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id UUID NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (cart_id, product_id)
);

CREATE TYPE order_status AS ENUM (
  'placed',
  'payment_pending',
  'payment_received',
  'shipped',
  'delivered',
  'escrow_released',
  'cancelled'
);

CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id UUID NOT NULL REFERENCES profiles(id),
  seller_id UUID NOT NULL REFERENCES profiles(id),
  payment_id UUID REFERENCES payments(id),
  status order_status NOT NULL DEFAULT 'placed',
  subtotal BIGINT NOT NULL,
  platform_fee BIGINT NOT NULL,
  total BIGINT NOT NULL,
  delivery_address TEXT,
  delivery_city TEXT,
  delivery_country TEXT NOT NULL DEFAULT 'KE',
  buyer_phone TEXT,
  reference TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  title TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price BIGINT NOT NULL,
  unit TEXT NOT NULL,
  origin_country TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE order_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX orders_buyer_id_idx ON orders(buyer_id);
CREATE INDEX orders_seller_id_idx ON orders(seller_id);
CREATE INDEX orders_payment_id_idx ON orders(payment_id);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY categories_read_all ON categories FOR SELECT USING (true);

CREATE POLICY products_read_active ON products
  FOR SELECT USING (status = 'active' OR seller_id = auth.uid());

CREATE POLICY products_seller_insert ON products
  FOR INSERT WITH CHECK (seller_id = auth.uid());

CREATE POLICY products_seller_update ON products
  FOR UPDATE USING (seller_id = auth.uid());

CREATE POLICY products_seller_delete ON products
  FOR DELETE USING (seller_id = auth.uid());

CREATE POLICY carts_own ON carts
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY cart_items_own ON cart_items
  FOR ALL USING (
    cart_id IN (SELECT id FROM carts WHERE user_id = auth.uid())
  );

CREATE POLICY orders_read_own ON orders
  FOR SELECT USING (buyer_id = auth.uid() OR seller_id = auth.uid());

CREATE POLICY order_items_read_own ON order_items
  FOR SELECT USING (
    order_id IN (
      SELECT id FROM orders WHERE buyer_id = auth.uid() OR seller_id = auth.uid()
    )
  );

CREATE POLICY order_events_read_own ON order_events
  FOR SELECT USING (
    order_id IN (
      SELECT id FROM orders WHERE buyer_id = auth.uid() OR seller_id = auth.uid()
    )
  );

CREATE POLICY profiles_insert_own ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE TRIGGER products_updated_at BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER carts_updated_at BEFORE UPDATE ON carts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER orders_updated_at BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Storage bucket for product images (apply via Supabase dashboard or storage API)
-- bucket: product-images, public read, authenticated upload
