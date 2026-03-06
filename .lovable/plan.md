

# Plan: Booking Activity Log + Remove Hostel Calendar/Occupancy Tab

## What We're Building

1. **Booking Activity Log Page** — A new page accessible from the sidebar (under both Reading Rooms and Hostels sections) that shows all booking lifecycle activities: cancellations, releases (terminations), seat/bed transfers, and date changes. Filterable by activity type via buttons. Serves as an audit trail for partners and admins.

2. **Remove Hostel Calendar & Occupancy tab** — Remove the "Calendar & Occupancy" tab from the Hostel Bookings page (`AdminHostelBookings.tsx`), leaving only the "All Bookings" list.

---

## Technical Design

### New Database Table: `booking_activity_log`

We need a table to record every activity. Currently, cancellations/releases/transfers/date changes happen without logging.

```sql
CREATE TABLE public.booking_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL,
  booking_type text NOT NULL DEFAULT 'cabin',  -- 'cabin' or 'hostel'
  activity_type text NOT NULL,  -- 'cancelled', 'released', 'transferred', 'date_changed'
  performed_by uuid,
  details jsonb DEFAULT '{}'::jsonb,  -- old/new seat, old/new dates, reason, etc.
  serial_number text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.booking_activity_log ENABLE ROW LEVEL SECURITY;
```

RLS policies: Admins full access, vendors/employees can view logs for their own properties, students can view their own booking logs.

### Logging Integration

Insert a row into `booking_activity_log` in each of these service functions:

- **`vendorSeatsService.releaseSeat`** — log `activity_type: 'released'`
- **`vendorSeatsService.cancelBooking`** — log `activity_type: 'cancelled'`
- **`vendorSeatsService.transferBooking`** — log `activity_type: 'transferred'` with old/new seat details
- **`BookingUpdateDatesDialog`** (submit handler) — log `activity_type: 'date_changed'` with old/new dates
- **`HostelBedMap.handleReleaseBed`** — log `activity_type: 'released'` with `booking_type: 'hostel'`
- **`HostelBedMap.handleCancelHostelBooking`** — log `activity_type: 'cancelled'`
- **`HostelBedMap.handleTransferBed`** — log `activity_type: 'transferred'`

### New Page: `BookingActivityLog.tsx`

- Route: `${routePrefix}/booking-activity-log`
- Filter buttons at top: **All | Cancellations | Releases | Transfers | Date Changes**
- Table columns: S.No, Booking ID (serial_number), Type (Cabin/Hostel), Activity, Details, Performed By, Date
- Paginated, searchable
- Shows both reading room and hostel activities in one unified view

### Sidebar Addition

Add "Activity Log" link under both Reading Rooms and Hostels sections, or as a top-level item under Operations.

### Remove Hostel Calendar Tab

In `AdminHostelBookings.tsx`: remove the Tabs wrapper, the "Calendar & Occupancy" TabsTrigger and TabsContent, and the `HostelBookingCalendarDashboard` import. Keep only the bookings list.

---

## Files Changed

| File | Change |
|------|--------|
| **New migration** | Create `booking_activity_log` table with RLS |
| `src/api/vendorSeatsService.ts` | Add logging in `releaseSeat`, `cancelBooking`, `transferBooking` |
| `src/components/admin/BookingUpdateDatesDialog.tsx` | Add logging after date update |
| `src/pages/admin/HostelBedMap.tsx` | Add logging in release, cancel, transfer handlers |
| **New** `src/pages/admin/BookingActivityLog.tsx` | Activity log page with filter buttons and table |
| `src/pages/hotelManager/AdminHostelBookings.tsx` | Remove calendar/occupancy tab |
| `src/components/admin/AdminSidebar.tsx` | Add "Activity Log" menu item |
| `src/App.tsx` | Add route for activity log page |

