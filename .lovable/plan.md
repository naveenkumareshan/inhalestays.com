

# Send Booking Confirmation Email When Partner Creates a Booking

## Problem
The `bookingEmailService` exists with `triggerBookingConfirmation` but is **never called** from the actual booking creation flow in `ManualBookingManagement.tsx`. When a partner creates a booking, no email is sent to the student.

## Changes

### 1. `src/pages/admin/ManualBookingManagement.tsx`
- Add a new state variable `selectedStudentEmail` to store the student's email separately (currently only stored embedded in `selectedStudentName` as `"name (email)"`)
- In `handleStudentSelect`: also set `selectedStudentEmail = student.email`
- In `handleCreateNewStudent`: also set `selectedStudentEmail = newStudentEmail`
- In `resetForm`: clear `selectedStudentEmail`
- After successful `createManualCabinBooking` (line ~495), call `bookingEmailService.triggerBookingConfirmation` with all booking details:
  - Student email and name
  - Booking ID from response
  - Cabin name, seat number
  - Start/end dates, total price, payment method
  - Location (from selected cabin)
- Import `bookingEmailService` at the top
- Email sending is fire-and-forget (don't block navigation on email failure — just log errors)

### 2. Files modified
- `src/pages/admin/ManualBookingManagement.tsx` — wire up email after booking success

