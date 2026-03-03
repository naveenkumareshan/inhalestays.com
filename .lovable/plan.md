

# Show Property Owner Details in Student Booking View

## What Changes
After a booking is confirmed, the student's booking detail page will show the property owner's contact information (name, phone, email) in a new collapsible section at the bottom, with a "Call Property" button.

## How It Works

### 1. Update data fetch in `StudentBookingView.tsx`

Currently the booking query fetches:
```
cabins(name, opening_time, closing_time, working_days, is_24_hours, slots_enabled)
```

This will be updated to also fetch `created_by` from the cabin, and then a second query will fetch the partner's contact details from the `partners` table using `user_id = cabins.created_by`.

### 2. Add "Property Contact" collapsible section

A new `CollapsibleSection` will be added after the "Payment Receipts" section (at the bottom of the page) showing:
- **Property Name** (from `partners.business_name`)
- **Contact Person** (from `partners.contact_person`)
- **Phone** (from `partners.phone`) -- with a clickable "Call Property" button
- **Email** (from `partners.email`)

The "Call Property" button will use `tel:` link so it works natively on mobile.

### 3. Only show for confirmed bookings

The property contact section will only appear when the booking has at least one receipt (i.e., payment has been made), so that contact info isn't exposed for unpaid/pending bookings.

## File to Modify

| File | Change |
|------|--------|
| `src/pages/students/StudentBookingView.tsx` | Fetch partner info via `created_by`, add Property Contact section with Call button |

## Technical Details

- After fetching the booking, extract `cabins.created_by` and run a second query: `supabase.from('partners').select('business_name, contact_person, phone, email').eq('user_id', createdBy).single()`
- Add a `Phone` icon import from lucide-react
- New section uses the existing `CollapsibleSection` and `InfoRow` components already in the file
- The "Call Property" action is a simple `<a href="tel:...">`-wrapped button
- Section defaults to collapsed (`defaultOpen={false}`) to keep the page clean
