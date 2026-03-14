

# Revamp Mess Attendance Page

Yes — the QR code is the same branded property QR for the mess (using `generateBrandedQrPng` with the mess property ID, type `mess`, and mess name). No new QR logic needed.

## Sections (top to bottom)

### 1. Mess Property QR Code
- Generate using existing `generateBrandedQrPng(mess.id, 'mess', mess.name)`
- Display the branded card image
- Three actions: **Fullscreen** (Dialog), **Download** (anchor), **Print** (new window)
- Teal-branded action buttons

### 2. Meal Attendance Cards (3-column)
- Breakfast / Lunch / Dinner
- Each: Present count, Total subscribers, % progress bar
- Current meal highlighted with badge

### 3. Subscriber Status Summary
- Total | Present Today | Absent Today — teal stat cards

### 4. Live Attendance Feed
- Today's entries, auto-refresh every 30s
- Each row: Student name, Time, Meal badge
- Empty state message

### 5. Manual Attendance Correction
- Search input to filter active subscribers
- Date picker + meal buttons per student (mark / already marked)

### 6. Remove
- Camera scanner section
- Revenue stats & chart

## File
- **EDIT**: `src/pages/admin/MessAttendance.tsx` — full rewrite

