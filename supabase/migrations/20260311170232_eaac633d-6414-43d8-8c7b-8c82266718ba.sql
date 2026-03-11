ALTER TABLE cabins ADD COLUMN IF NOT EXISTS whatsapp_number text;
ALTER TABLE hostels ADD COLUMN IF NOT EXISTS whatsapp_number text;
ALTER TABLE mess_partners ADD COLUMN IF NOT EXISTS whatsapp_number text;

UPDATE cabins SET whatsapp_number = p.whatsapp_number FROM partners p WHERE cabins.created_by = p.user_id AND p.whatsapp_number IS NOT NULL AND cabins.whatsapp_number IS NULL;
UPDATE hostels SET whatsapp_number = p.whatsapp_number FROM partners p WHERE hostels.created_by = p.user_id AND p.whatsapp_number IS NOT NULL AND hostels.whatsapp_number IS NULL;
UPDATE mess_partners SET whatsapp_number = p.whatsapp_number FROM partners p WHERE mess_partners.user_id = p.user_id AND p.whatsapp_number IS NOT NULL AND mess_partners.whatsapp_number IS NULL;