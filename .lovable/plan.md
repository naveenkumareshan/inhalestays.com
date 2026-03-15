

## Add WhatsApp Button to Complaint Detail Header

### Current State
The WhatsApp button already exists inside the `TicketChat` component as a green banner at the top of the chat area. However, it's not very prominent — the user wants it more visible in the header.

### Change
Add a small green WhatsApp icon button in the **sticky header bar** of the complaint detail view (the bar with the back arrow, subject, and status). This button will be visible only when `partnerWhatsapp` is available (i.e., the complaint is linked to a property). Clicking opens WhatsApp with a pre-filled message including the complaint subject and ticket ID.

### File
- `src/components/profile/ComplaintsPage.tsx` — Add a WhatsApp icon button in the complaint detail header (lines 153-163), using `FaWhatsapp` from `react-icons/fa`. Uses the existing `partnerWhatsapp` state.

