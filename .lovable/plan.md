

# Remove Timings from Booking Cards

## What's Changing

Strip all time-of-day text (9:00 AM, 6:00 PM) from the `formatBookingPeriod` function in `src/utils/currency.ts`. This applies to both Hostel and Reading Room booking cards since they all use this same utility function.

## Before vs After

| Scenario | Current | New |
|----------|---------|-----|
| Date range | 28 Feb 2026 9:00 AM to 27 Aug 2026 6:00 PM | 28 Feb 2026 to 27 Aug 2026 |
| Same day | 28 Feb 2026 (9:00 AM - 6:00 PM) | 28 Feb 2026 |
| Start only | 28 Feb 2026 9:00 AM onwards | From 28 Feb 2026 |
| End only | Till 27 Aug 2026 6:00 PM | Till 27 Aug 2026 |

## File to Modify

**`src/utils/currency.ts`** -- update `formatBookingPeriod` function only (lines 23-45). Remove all time strings from the return values. No other files need changes since all booking cards (hostel + reading room) already use this shared utility.

