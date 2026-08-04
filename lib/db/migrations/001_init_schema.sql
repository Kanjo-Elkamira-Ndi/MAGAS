-- 001_init_schema.sql
-- Phase 0 base schema for MAGAS.
-- Creates all core + dormant tables per context/database-schema.md so the
-- agent portal and any later features can ship without a schema migration.
-- Additive only — no destructive changes; safe to re-run if it fails
-- partway (each CREATE uses IF NOT EXISTS where cheap, but enums are
-- created unconditionally and will error on retry — that is intentional
-- to surface partial-failure state; drop and recreate the DB if needed).

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
CREATE TYPE user_role AS ENUM ('customer', 'retailer', 'agent', 'admin');

CREATE TYPE order_status AS ENUM (
  'placed',
  'confirmed',
  'assigned',
  'out_for_delivery',
  'delivered',
  'cancelled',
  'failed'
);

-- ---------------------------------------------------------------------------
-- Shared updated_at trigger
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------------
-- users
-- ---------------------------------------------------------------------------
CREATE TABLE users (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role           user_role NOT NULL,
  email          text UNIQUE,
  phone          text UNIQUE,
  password_hash  text NOT NULL,
  status         text NOT NULL DEFAULT 'active'
                 CHECK (status IN ('active', 'suspended', 'banned')),
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT users_email_or_phone CHECK (email IS NOT NULL OR phone IS NOT NULL)
);

CREATE TRIGGER users_touch_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE INDEX users_email_idx ON users (email) WHERE email IS NOT NULL;
CREATE INDEX users_phone_idx ON users (phone) WHERE phone IS NOT NULL;

-- ---------------------------------------------------------------------------
-- customers (1:1 with users where role = 'customer')
-- ---------------------------------------------------------------------------
CREATE TABLE customers (
  user_id             uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  full_name           text NOT NULL,
  default_address_id  uuid,  -- forward ref, FK added after addresses
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER customers_touch_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- ---------------------------------------------------------------------------
-- addresses (N:1 customer)
-- ---------------------------------------------------------------------------
CREATE TABLE addresses (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id  uuid NOT NULL REFERENCES customers(user_id) ON DELETE CASCADE,
  label        text,
  line1        text NOT NULL,
  city         text NOT NULL,
  notes        text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX addresses_customer_idx ON addresses (customer_id);

-- Backfill the customers.default_address_id FK now that addresses exists.
ALTER TABLE customers
  ADD CONSTRAINT customers_default_address_fk
  FOREIGN KEY (default_address_id) REFERENCES addresses(id) ON DELETE SET NULL;

-- ---------------------------------------------------------------------------
-- retailers (1:1 with users where role = 'retailer')
-- ---------------------------------------------------------------------------
CREATE TABLE retailers (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  business_name  text NOT NULL,
  location       text NOT NULL,
  status         text NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending', 'approved', 'suspended')),
  approved_by    uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER retailers_touch_updated_at
  BEFORE UPDATE ON retailers
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- ---------------------------------------------------------------------------
-- products (N:1 retailer)
-- ---------------------------------------------------------------------------
CREATE TABLE products (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  retailer_id    uuid NOT NULL REFERENCES retailers(id) ON DELETE CASCADE,
  brand          text NOT NULL,
  cylinder_size  text NOT NULL,
  price          integer NOT NULL CHECK (price >= 0),
  availability   boolean NOT NULL DEFAULT true,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER products_touch_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE INDEX products_retailer_idx ON products (retailer_id);

-- ---------------------------------------------------------------------------
-- orders
-- ---------------------------------------------------------------------------
CREATE TABLE orders (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id      uuid NOT NULL REFERENCES customers(user_id),
  retailer_id      uuid NOT NULL REFERENCES retailers(id),
  status           order_status NOT NULL DEFAULT 'placed',
  payment_method   text NOT NULL
                   CHECK (payment_method IN ('cod', 'momo', 'orange')),
  delivery_address text NOT NULL,
  total_amount     integer NOT NULL CHECK (total_amount >= 0),
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER orders_touch_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE INDEX orders_customer_idx ON orders (customer_id);
CREATE INDEX orders_retailer_idx ON orders (retailer_id);
CREATE INDEX orders_status_idx   ON orders (status);
CREATE INDEX orders_created_idx  ON orders (created_at DESC);

-- ---------------------------------------------------------------------------
-- order_items (N:1 order, N:1 product)
-- ---------------------------------------------------------------------------
CREATE TABLE order_items (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id       uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id     uuid NOT NULL REFERENCES products(id),
  quantity       integer NOT NULL CHECK (quantity > 0),
  price_at_order integer NOT NULL CHECK (price_at_order >= 0)
);

CREATE INDEX order_items_order_idx   ON order_items (order_id);
CREATE INDEX order_items_product_idx ON order_items (product_id);

-- ---------------------------------------------------------------------------
-- payments
-- ---------------------------------------------------------------------------
CREATE TABLE payments (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id     uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  method       text NOT NULL CHECK (method IN ('cod', 'momo', 'orange')),
  status       text NOT NULL DEFAULT 'pending'
               CHECK (status IN ('pending', 'success', 'failed')),
  provider_ref text,
  amount       integer NOT NULL CHECK (amount >= 0),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER payments_touch_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE INDEX payments_order_idx ON payments (order_id);

-- ---------------------------------------------------------------------------
-- delivery_agents (dormant — contact-only records for now)
-- user_id is deliberately nullable so admin can create agent contact
-- records today without giving that agent login access.
-- ---------------------------------------------------------------------------
CREATE TABLE delivery_agents (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid UNIQUE REFERENCES users(id) ON DELETE SET NULL,
  name       text NOT NULL,
  phone      text NOT NULL,
  status     text NOT NULL DEFAULT 'active'
             CHECK (status IN ('active', 'inactive')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX delivery_agents_user_idx ON delivery_agents (user_id) WHERE user_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- order_assignments (dormant — populated by admin, not by agent self-service)
-- ---------------------------------------------------------------------------
CREATE TABLE order_assignments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  agent_id    uuid NOT NULL REFERENCES delivery_agents(id),
  assigned_at timestamptz NOT NULL DEFAULT now(),
  status      text NOT NULL DEFAULT 'assigned'
              CHECK (status IN ('assigned', 'delivered', 'failed'))
);

CREATE INDEX order_assignments_order_idx ON order_assignments (order_id);
CREATE INDEX order_assignments_agent_idx ON order_assignments (agent_id);

-- ---------------------------------------------------------------------------
-- sessions (used by NextAuth database strategy)
-- ---------------------------------------------------------------------------
CREATE TABLE sessions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_token text UNIQUE NOT NULL,
  user_id       uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires       timestamptz NOT NULL
);

CREATE INDEX sessions_user_idx   ON sessions (user_id);
CREATE INDEX sessions_expires_idx ON sessions (expires);

-- ---------------------------------------------------------------------------
-- verification_tokens
-- ---------------------------------------------------------------------------
CREATE TABLE verification_tokens (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid REFERENCES users(id) ON DELETE CASCADE,
  token      text UNIQUE NOT NULL,
  purpose    text NOT NULL
             CHECK (purpose IN ('email_verify', 'phone_verify', 'password_reset')),
  expires_at timestamptz NOT NULL,
  used_at    timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX verification_tokens_user_idx  ON verification_tokens (user_id);
CREATE INDEX verification_tokens_token_idx ON verification_tokens (token);
