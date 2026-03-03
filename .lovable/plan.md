

# Fix Plan: 5 Issues in InhaleStays Mobile App

## Issue 1: Google Auth 404 in Android App

**Root Cause**: Google OAuth via `lovable.auth.signInWithOAuth("google")` redirects the user to an external URL. In a Capacitor native app loading from local `dist/` files, the OAuth redirect back to `window.location.origin` resolves to `capacitor://localhost`, which the OAuth flow cannot redirect to. The redirect fails with a 404.

**Fix**: In `SocialLoginButtons.tsx`, detect if the app is running inside Capacitor and use an alternative flow. For Capacitor, use Supabase's `signInWithOAuth` with a custom redirect URL pointing to the published web app URL, then use Capacitor's App URL listener to capture the redirect and set the session.

Alternatively, a simpler fix: when running in Capacitor, set `redirect_uri` to the published app URL (`https://inhalestays-com.lovable.app`) instead of `window.location.origin`. Then add a deep link handler in the app.

**Changes**:
- `src/components/auth/SocialLoginButtons.tsx`: Detect Capacitor environment (`window.Capacitor`) and use the published URL as redirect_uri. Also handle the case where the user returns to the app after OAuth.

---

## Issue 2: 404 Page After Booking Payment

**Root Cause**: After payment success in `SeatBookingForm.tsx`, `handlePaymentSuccess` calls `onBookingComplete(bookingId)` which navigates to `/book-confirmation/{bookingId}`. The route exists in `App.tsx` (line 303). However, the `BookConfirmation` component (`Confirmation.tsx`) uses `useParams` to get `bookingId` and then calls `bookingsService.getBookingById()`. If that service call fails or returns an error structure, the page shows an error — but the 404 is likely because the navigation happens before the booking record is fully committed in the database.

Actually, looking more carefully: The `handlePaymentSuccess` in `SeatBookingForm.tsx` (line 567-573) calls `onBookingComplete(bookingId)`. In `BookSeat.tsx` (line 200-203), `handleBookingComplete` navigates to `/book-confirmation/` + bookingId. This route exists. The 404 is likely happening because `bookingId` is empty at the time of navigation — the `bookingId` state is set on line 541, but `handlePaymentSuccess` on line 572 uses `bookingId` which is a state variable. If the Razorpay handler callback fires before React re-renders with the new bookingId, `bookingId` could still be the old empty value.

**Fix**: Use a ref to track the bookingId or pass it through the payment response. The `onSuccess` callback in `RazorpayCheckout` receives `paymentResponse` or `{ testMode: true, bookingId }`, so we can extract bookingId from there.

**Changes**:
- `src/components/seats/SeatBookingForm.tsx`: Update `handlePaymentSuccess` to accept the response object and extract `bookingId` from it, or use a ref.
- `src/pages/BookSeat.tsx`: Update `handleBookingComplete` to handle the case where bookingId might be passed differently.

---

## Issue 3: Duplicate Payment Receipts

**Root Cause**: In `razorpay-verify-payment/index.ts`, the receipt is created on every successful verification call. If the Razorpay `handler` callback fires, it calls `verifyPayment`. But the `RazorpayCheckout` component also shows a success toast and calls `onSuccess`. If the edge function is called twice (e.g., retry on network timeout, or Razorpay SDK fires the handler twice), two receipts are generated. Additionally, a cancelled payment still creates a booking record (payment_status: "pending"), and if the user retries with a new order, the old booking might also get verified somehow.

**Fix**: Add a uniqueness check before inserting receipts — check if a receipt with the same `booking_id` and `transaction_id` already exists. Use `upsert` or a pre-check query.

**Changes**:
- `supabase/functions/razorpay-verify-payment/index.ts`: Before inserting any receipt (reading room, hostel, or laundry), check if a receipt with the same `booking_id` (or `order_id` for laundry) and `transaction_id` already exists. Skip insertion if it does. Also add `razorpay_order_id` matching to the update query to prevent updating the wrong booking.

---

## Issue 4: App Running Very Slow

**Fix**: This is a performance optimization task. Key improvements:
- Reduce bundle size by ensuring code splitting is working (already done via lazy loading)
- Add `loading="lazy"` to images if not already present
- Reduce the number of re-renders in heavy components
- Add `React.memo` to frequently rendered list items
- Consider reducing the staleTime/gcTime if too many queries are cached

This is a broad issue. Specific quick wins:
- Ensure the Vite build is optimized (already has chunk warning limit set)
- The app loads maplibre-gl which is very heavy — ensure it's only loaded when needed

**Changes**: Minor optimizations, but this is largely a native app performance issue related to WebView rendering. Recommend testing with `--release` build rather than debug.

---

## Issue 5: Razorpay QR Not Showing / Overlapping with Status Bar

**Root Cause**: The Razorpay checkout modal opens inside the WebView. In a Capacitor app with `viewport-fit=cover` and safe area padding, the Razorpay modal may be positioned behind the status bar/notch area. The QR option may not appear due to Razorpay configuration or the modal being clipped.

**Fix**: 
- In `index.html`, ensure proper viewport meta tag with `viewport-fit=cover`
- In `RazorpayCheckout.tsx`, add `modal.animation: false` and potentially use Razorpay's `external` option for UPI/QR
- The overlapping issue needs CSS fix: when Razorpay modal is open, remove the safe area padding or ensure the Razorpay iframe gets proper z-index

**Changes**:
- `src/components/payment/RazorpayCheckout.tsx`: Add Razorpay config options for better mobile compatibility (e.g., `config.display.preferences` to show UPI/QR options)

---

## Summary of File Changes

1. **`src/components/auth/SocialLoginButtons.tsx`** — Detect Capacitor and use published URL for OAuth redirect
2. **`src/components/seats/SeatBookingForm.tsx`** — Fix bookingId closure issue in payment success handler using a ref
3. **`supabase/functions/razorpay-verify-payment/index.ts`** — Add duplicate receipt prevention check before insert
4. **`src/components/payment/RazorpayCheckout.tsx`** — Add Razorpay modal config for mobile compatibility (safe area, QR/UPI display)
5. **Performance** — Recommend building in release mode; minor code-level optimizations

