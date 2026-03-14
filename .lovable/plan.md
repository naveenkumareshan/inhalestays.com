

# Add Scan QR & Attendance History to Student Profile Page

## Change

**File: `src/components/profile/ProfileManagement.tsx`**

In the "Quick Links" grid section (lines 578-603), expand from a 2-item grid to include two new items:

1. **Scan QR** — links to `/student/scan-attendance`, with a QrCode icon and green background
2. **Attendance** — links to `/student/attendance-history`, with a History icon and purple background

Change the grid from `grid-cols-2` to accommodate 4 items (2 rows of 2).

Add imports: `QrCode` and `History` from `lucide-react`.

