

# Plan: Move Payouts & Redesign Student Laundry Page

## 1. Move Admin Payouts to Partners Section

**File:** `src/components/admin/AdminSidebar.tsx`

Currently, "Payouts" lives under the "Reports" section (line 327). It will be moved to the "Partners" section as a sub-item below "Settlements" (line 318).

**Changes:**
- Add `{ title: 'Payouts', url: '/admin/payouts', icon: Wallet, roles: ['admin'] }` to the Partners subItems array, after "Settlements"
- Remove the Payouts entry from the Reports subItems array
- The Reports section will then only contain "Booking Reports"

---

## 2. Redesign Student Laundry Page with More Color

**File:** `src/pages/Laundry.tsx`

The current laundry page is functional but visually plain -- white cards with minimal color. The redesign will add vibrancy while keeping the multi-step flow intact.

**Visual Changes:**
- Add a gradient hero header with a colorful background (purple/blue gradient) and white text
- Color-code item categories with distinct background tints (e.g., blue for clothing, green for bedding, orange for special)
- Add colorful category header pills/badges instead of plain text labels
- Style the quantity counter buttons with colored accents
- Add a colorful floating cart summary bar at the bottom with gradient background
- Use colored icons and accent borders on the Address and Schedule step cards
- Make the step indicator use gradient colors instead of flat primary
- Add a celebratory gradient background to the order confirmation step
- Add subtle colored shadows to item cards

**No structural changes** -- the 5-step flow (Items, Address, Schedule, Review, Payment) and all logic remain identical. Only styling classes and a few wrapper elements change.

---

### Files Modified
| File | Change |
|------|--------|
| `src/components/admin/AdminSidebar.tsx` | Move Payouts from Reports to Partners section |
| `src/pages/Laundry.tsx` | Add colorful styling to the student laundry ordering page |

