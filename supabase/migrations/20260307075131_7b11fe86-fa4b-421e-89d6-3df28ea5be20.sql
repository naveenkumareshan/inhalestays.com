ALTER TABLE cabins ADD COLUMN whatsapp_chat_enabled boolean NOT NULL DEFAULT false;
ALTER TABLE hostels ADD COLUMN whatsapp_chat_enabled boolean NOT NULL DEFAULT false;
ALTER TABLE mess_partners ADD COLUMN whatsapp_chat_enabled boolean NOT NULL DEFAULT false;