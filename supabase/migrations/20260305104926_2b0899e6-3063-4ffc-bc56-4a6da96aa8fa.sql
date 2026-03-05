
ALTER TABLE cabins ADD COLUMN free_trial_days integer NOT NULL DEFAULT 0;
ALTER TABLE hostels ADD COLUMN free_trial_days integer NOT NULL DEFAULT 0;
ALTER TABLE hostels ADD COLUMN starting_price numeric NOT NULL DEFAULT 0;
