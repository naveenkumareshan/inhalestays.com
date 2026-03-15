
-- 1. Add FK: ticket_messages.sender_id → profiles.id (fixes chat 400 error)
ALTER TABLE public.ticket_messages
  ADD CONSTRAINT ticket_messages_sender_id_fkey
  FOREIGN KEY (sender_id) REFERENCES public.profiles(id);

-- 2. Add FK: complaints.hostel_id → hostels.id (enables hostel name joins)
ALTER TABLE public.complaints
  ADD CONSTRAINT complaints_hostel_id_fkey
  FOREIGN KEY (hostel_id) REFERENCES public.hostels(id) ON DELETE SET NULL;
