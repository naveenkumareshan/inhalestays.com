
ALTER TABLE subscription_plans ADD COLUMN is_universal boolean NOT NULL DEFAULT false;
ALTER TABLE property_subscriptions ALTER COLUMN property_id DROP NOT NULL;
