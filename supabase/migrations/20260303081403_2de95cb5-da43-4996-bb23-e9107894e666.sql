ALTER TABLE property_subscriptions
  ADD COLUMN IF NOT EXISTS coupon_id uuid REFERENCES coupons(id) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS coupon_discount numeric NOT NULL DEFAULT 0;