ALTER TABLE laundry_partners
  ADD CONSTRAINT laundry_partners_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES profiles(id);

ALTER TABLE laundry_orders
  ADD CONSTRAINT laundry_orders_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES profiles(id);

ALTER TABLE laundry_receipts
  ADD CONSTRAINT laundry_receipts_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES profiles(id);