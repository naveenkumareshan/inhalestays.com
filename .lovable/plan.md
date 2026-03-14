

# Fix Mess Attendance Logic & UI Issues

## Problems Identified

1. **Subscriptions not date-filtered**: `activeSubsForAttendance` only filters by `status === 'active'` but ignores `start_date` and `end_date`. A subscription active in January shouldn't count for a March date. The meal cards and subscriber counts are inflated.

2. **Progress bar always 100%**: Because all subscriptions (regardless of date range) are counted as "total", but attendance data is date-specific, the ratio is wrong. When there are 0 subscribers with dates matching the selected date, division produces incorrect percentages.

3. **Manual correction available for future dates**: The manual correction section allows selecting future dates and marking attendance, which shouldn't be possible.

## Changes — `src/pages/admin/MessAttendance.tsx`

### 1. Filter subscriptions by selected date
Replace the simple `status === 'active'` filter with date-aware filtering:
```typescript
const activeSubsForDate = useMemo(() => {
  return subscriptions.filter(s =>
    s.status === 'active' &&
    s.start_date <= selectedDateStr &&
    s.end_date >= selectedDateStr
  );
}, [subscriptions, selectedDateStr]);
```
Use `activeSubsForDate` everywhere instead of `activeSubsForAttendance` for meal cards and subscriber summary.

### 2. Fix meal stats calculation
Use the date-filtered subscriptions so totals match reality for the selected date. This fixes the progress bar showing incorrect percentages.

### 3. Freeze manual correction for future dates
- Restrict the manual date input's `max` attribute to today's date
- Disable the mark attendance buttons if `manualDate` is in the future
- Show a note if a future date is somehow selected

### 4. Manual correction subscriber list also date-filtered
Filter the manual correction subscriber list using `manualDate` so only subscribers whose subscription covers that date appear.

## File
**EDIT**: `src/pages/admin/MessAttendance.tsx` — fix subscription date filtering, progress calculation, freeze future manual corrections

