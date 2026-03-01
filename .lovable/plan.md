

# Add Share Button -- Hostel & Reading Room Detail Pages

## Overview

Add a universal share feature to both the Hostel Detail page (`HostelRoomDetails.tsx`) and Reading Room Detail page (`BookSeat.tsx`). On mobile, it uses the native share sheet; on web, it shows a share popup with Copy Link, WhatsApp, Telegram, and Email options. Shared links include a `?ref=userId` parameter for referral tracking.

---

## 1. Create Reusable ShareButton Component

**New file**: `src/components/ShareButton.tsx`

A single reusable component that handles both mobile and web sharing:

- **Props**: `title`, `description`, `url`, `shareText` (pre-formatted message)
- **Mobile detection**: Uses `navigator.share` API availability
- **Mobile**: Calls `navigator.share({ title, text, url })` to open the native share sheet (WhatsApp, Instagram, Telegram, SMS, etc.)
- **Web fallback**: Opens a Dialog/Popover with buttons for:
  - **Copy Link** -- copies URL to clipboard with toast confirmation
  - **WhatsApp** -- opens `https://wa.me/?text={encodedMessage}`
  - **Telegram** -- opens `https://t.me/share/url?url={url}&text={text}`
  - **Email** -- opens `mailto:?subject={title}&body={message}`
- **Icon**: Uses `Share2` from lucide-react, styled as a round semi-transparent button (matching the existing back button style on detail pages)

## 2. Share Message Generators

**New file**: `src/utils/shareUtils.ts`

Two helper functions that build the share text:

- `generateCabinShareText(cabin)` -- produces:
  ```
  Check out this Reading Room on InhaleStays!
  [Cabin Name]
  Location: [fullAddress or area]
  Price: [price]/month
  Rating: [X.X] (if > 0)
  Book here: [link]
  ```

- `generateHostelShareText(hostel, lowestPrice)` -- produces:
  ```
  Check out this Hostel on InhaleStays!
  [Hostel Name]
  [Gender] | [Stay Type]
  Food Available (if food_enabled)
  Starting from [lowestPrice]
  View details: [link]
  ```

Both functions accept an optional `userId` to append `?ref={userId}` to the link. The base URL uses `getPublicAppUrl()`.

## 3. Add Share Button to Hostel Detail Page

**File**: `src/pages/HostelRoomDetails.tsx`

- Import `ShareButton` component
- Place the share button in the hero image overlay area, next to the existing gender badge (top-right). Move badge slightly left to make room, or place share button just below it.
- Pass hostel data + user ID for referral link generation

## 4. Add Share Button to Reading Room Detail Page

**File**: `src/pages/BookSeat.tsx`

- Import `ShareButton` component
- Place the share button in the hero image overlay area, next to the existing category badge (top-right). Same positioning pattern as hostel page.
- Pass cabin data + user ID for referral link generation

## 5. Referral Tracking Database

**Database migration**: Create a `referral_clicks` table to track shared link usage:

| Column | Type | Notes |
|--------|------|-------|
| id | uuid, PK | |
| referrer_user_id | uuid | User who shared the link |
| referred_user_id | uuid, nullable | User who signed up via the link |
| property_type | text | 'hostel' or 'cabin' |
| property_id | uuid | The hostel/cabin ID |
| clicked_at | timestamptz | When the link was clicked |
| signed_up | boolean, default false | Whether the click led to a signup |
| booking_id | uuid, nullable | If a booking resulted |

RLS: Admins full access, users can view their own referral data.

## 6. Referral Capture Logic

**File**: `src/App.tsx` or a new `src/hooks/useReferralCapture.ts`

- On app load, check URL for `?ref=` parameter
- Store the referrer user ID in `localStorage` (key: `inhale_referrer`)
- On successful signup (in the auth flow), insert a row into `referral_clicks` with the referrer ID
- On successful booking, update the `referral_clicks` row with the `booking_id`

---

## Technical Details

- The `navigator.share` API is the standard Web Share API -- works on all modern mobile browsers (iOS Safari, Chrome Android). Falls back to the dialog on desktop.
- Share button is a `Share2` icon from lucide-react in a rounded semi-transparent button matching the existing back button style (`bg-black/40 backdrop-blur-md text-white`).
- The referral parameter uses the user's auth ID (UUID). If the user is not logged in, the share link is generated without `?ref=`.

## Files Summary

| File | Action |
|------|--------|
| `src/components/ShareButton.tsx` | Create -- reusable share component |
| `src/utils/shareUtils.ts` | Create -- message generators |
| `src/pages/HostelRoomDetails.tsx` | Edit -- add ShareButton to hero |
| `src/pages/BookSeat.tsx` | Edit -- add ShareButton to hero |
| `src/hooks/useReferralCapture.ts` | Create -- capture ref param |
| Migration SQL | Create -- `referral_clicks` table |

## Implementation Order

1. Create `shareUtils.ts` and `ShareButton.tsx`
2. Add ShareButton to both detail pages
3. Database migration for `referral_clicks`
4. Create referral capture hook and integrate into app

