
# Fix: Subscription Coupons in Coupon Management + Layout Alignment

## 1. Add "Subscription" Option to Coupon Management

Currently, the "Applicable For" dropdown in the coupon form only has: All, Reading Room, Hostel. There is no option to create coupons specifically for partner subscriptions.

**Changes to `src/components/admin/CouponManagement.tsx`:**

- Add a new tab "Subscription" in the TabsList (alongside All, Reading Room, Hostel)
- Add a new SelectItem `subscription` in the "Applicable For" dropdown: `<SelectItem value="subscription">Subscription</SelectItem>`
- This option should only appear when the user is an admin (partners should not see or create subscription coupons)
- In the table's "For" column badge, add a case for `subscription` to display "Subscription"

No backend changes needed -- the `applicable_for` column is a text array and already accepts any string value. The edge function `subscription-create-order` already validates against `applicable_for` containing `'subscription'` or `'all'`.

## 2. Fix Layout Misalignment (Double Scrollbars)

The image shows the sidebar is narrow on the left and the content area has two scrollbars -- one for the page and one for the inner content. This is caused by nested scroll containers.

**Root cause in `src/components/AdminLayout.tsx`:**

- The outer `div` has `min-h-screen flex flex-col`
- Inside, `SidebarInset` (which is a `<main>` element) has `min-h-svh` from the sidebar UI component
- Then the inner `<main>` tag (line 100) also exists, creating a nested main-inside-main situation
- The `SidebarInset` already IS a `<main>` tag, so wrapping content in another `<main>` is incorrect and creates double scrolling

**Fix in `src/components/AdminLayout.tsx`:**

- Change the outer wrapper from `min-h-screen flex flex-col` to just `min-h-screen`
- On the inner flex container (`div.flex.flex-1.w-full`), remove `overflow-x-hidden` and ensure it uses `min-h-screen` properly
- Change the inner `<main>` to a `<div>` since `SidebarInset` already renders as `<main>`
- Add `overflow-hidden` to the outer container to prevent double scrollbars
- Ensure `SidebarInset` has `overflow-y-auto` so only the content area scrolls, not the whole page alongside the sidebar

**Specific changes:**

```text
Line 82: Change to: <div className="min-h-screen">
Line 84: Change to: <div className="flex min-h-screen w-full">
Line 86: Add overflow-y-auto to SidebarInset
Line 100: Change <main> to <div>
```

This ensures only one scrollbar exists for the content area, and the sidebar stays fixed alongside it.

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/admin/CouponManagement.tsx` | Add "Subscription" tab and dropdown option (admin-only) |
| `src/components/AdminLayout.tsx` | Fix nested main/scroll structure to eliminate double scrollbars |
