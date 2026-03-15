

## Fix Plan: 4 Issues — Quick Actions, Nav Size, Mess Razorpay, Mess Dashboard

### Issue 1: Quick Actions on Home Page
**File:** `src/pages/Index.tsx` (lines 94-99)

Current quick actions: "Book Room", "Hostels", "My Bookings", "Laundry"
Change to: "Reading Rooms", "Hostels", "Mess", "Laundry" with proper routes and icons.

| Label | Route | Icon |
|-------|-------|------|
| Reading Rooms | /cabins | BookOpen |
| Hostels | /hostels | Hotel |
| Mess | /mess | UtensilsCrossed |
| Laundry | /laundry | Shirt |

### Issue 2: Navigation Bar Text Too Small
**File:** `src/components/Navigation.tsx`

- Increase nav height from `h-16` to `h-18`
- Increase nav link text from `text-sm` to `text-base`
- Increase logo from `h-10` to `h-12`
- Increase site name from `text-lg` to `text-xl`

### Issue 3: Mess Pay Button Not Triggering Razorpay
**File:** `src/pages/MessDetail.tsx`

The `RazorpayCheckout` component's `createOrder` callback creates the pending subscription, then calls `razorpayService.createOrder`. However, `bookingId` is passed as `pendingSubId || ''` — on first click, `pendingSubId` is still null (state hasn't updated yet from `handleCreatePendingSub`). The `createOrder` callback does handle this with `pendingSubId || await handleCreatePendingSub()`, but the **outer** `bookingId` prop is `''` on first render, which is what `RazorpayCheckout` uses for the `verifyPayment` call.

**Fix:** Store the subscription ID in a ref so it's available immediately. Also ensure the `bookingId` used for verification comes from the `createOrder` flow, not the stale prop. Refactor to pass `bookingId` dynamically through the createOrder return, and update the RazorpayCheckout to use the bookingId from createOrder context.

Actually, looking more carefully: the `RazorpayCheckout` component uses `bookingId` prop for the `verifyPayment` call in the handler. Since `pendingSubId` state may not have updated by the time the handler runs, the verify call uses `''` as bookingId — causing it to fail silently or update the wrong record.

**Fix approach:** Use a ref to track the created subscription ID and pass it properly. Restructure so `handleCreatePendingSub` stores to both state and ref, and the `createOrder` callback returns order data including the correct bookingId for verification.

### Issue 4: MessDashboard Shows All Subscriptions + Scan Button Inside
**File:** `src/pages/students/MessDashboard.tsx`

Complete redesign:
- When a subscription is clicked from bookings page (via `/student/mess`), show **only** that specific subscription's details (detect via URL query param `?id=xxx`)
- If no specific ID, show list of all subscriptions
- When viewing a single subscription: show subscription details card (mess name, package, validity, status, amount paid), meal history tab, pause/leave tab
- **Remove** the "Scan Attendance QR" tab/button from inside subscription view — scanning is done from the general scan page, not from within a subscription

### Files Changed

| File | Changes |
|------|---------|
| `src/pages/Index.tsx` | Update quick actions: Reading Rooms, Hostels, Mess, Laundry |
| `src/components/Navigation.tsx` | Increase nav height, text sizes, logo size |
| `src/pages/MessDetail.tsx` | Fix bookingId passing to RazorpayCheckout using ref |
| `src/pages/students/MessDashboard.tsx` | Redesign: support `?id=` param for single sub view, remove QR tab |
| `src/components/booking/BookingsList.tsx` | Update mess "View Subscription" link to include subscription ID |

