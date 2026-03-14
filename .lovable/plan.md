

# Improve Property Card Button Layout & Add Property View Tracking

## 1. Better Button Layout with Spacing & QR Repositioned

**Problem**: All action buttons are crammed together in a single `flex-wrap gap-1` row, making it confusing to distinguish between different button groups.

**Solution**: Reorganize the actions area into two visual rows with logical groupings:
- **Row 1**: Primary actions (Edit, Seats/Beds) on the left, QR button pushed to the far right using `ml-auto`
- **Row 2**: Toggle buttons (Activate, Online, Employee Visibility) grouped together with `gap-2` between logical groups, WhatsApp at the end

**Files**: `CabinItem.tsx`, `HostelItem.tsx`, `MessItem.tsx`

## 2. Track Student Property Page Views & Show Count Badge

**Problem**: Partners have no visibility into how many students are viewing their property pages.

**Solution**: Create a `property_views` table to log each student visit to a property detail page, then display the view count as a badge on the property card image (top-right area, similar to the WhatsApp click badge).

### Database Migration
```sql
CREATE TABLE public.property_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL,
  property_type text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_property_views_property ON property_views(property_id);
ALTER TABLE property_views ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can insert (students viewing pages)
CREATE POLICY "Authenticated users can insert views"
  ON property_views FOR INSERT TO authenticated
  WITH CHECK (true);

-- Partners/admins can read view counts
CREATE POLICY "Authenticated users can read views"
  ON property_views FOR SELECT TO authenticated
  USING (true);
```

### Track Views on Student Pages
- **`BookSeat.tsx`** — insert into `property_views` on page load (once per session per property)
- **`HostelRoomDetails.tsx`** — same pattern
- **`MessDetail.tsx`** — same pattern

Use `sessionStorage` to avoid duplicate inserts within the same browser session.

### Show View Count Badge on Property Cards
- **`CabinItem.tsx`** — fetch count from `property_views` where `property_id = cabin._id`, show as a small badge (e.g., eye icon with count) on the card image top-right corner
- **`HostelItem.tsx`** — same pattern
- **`MessItem.tsx`** — same pattern

Badge style: Small pill with eye icon + count, positioned on the property card image overlay area, only shown if count > 0.

## Files Modified
- `CabinItem.tsx` — button layout + view count badge
- `HostelItem.tsx` — button layout + view count badge
- `MessItem.tsx` — button layout + view count badge
- `BookSeat.tsx` — track property view
- `HostelRoomDetails.tsx` — track property view
- `MessDetail.tsx` — track property view
- New migration for `property_views` table

