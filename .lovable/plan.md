
Goal: Fix the `/admin/mess` crash first, then ensure linked hostel/mess rows are visible as intended.

1) Root-cause fix (blocking issue)
- File: `src/components/ui/badge.tsx`
- Problem observed: runtime crash `TypeError: Component is not a function` with stack pointing to `<Badge>` in `MessManagement` header.
- Plan:
  - Replace the current `Badge` implementation with the stable function-component pattern (same API: `variant`, `className`, children).
  - Keep exports unchanged (`export { Badge }`) so all existing imports continue to work.
  - Avoid ref-forwarding for this component unless absolutely needed, because this change introduced the hard crash.

2) Safety check on affected screens
- Files:
  - `src/pages/admin/MessManagement.tsx`
  - `src/pages/hotelManager/HostelManagement.tsx`
- Plan:
  - Keep the count chips and linked-entity sections, but verify they render after the badge fix.
  - If any residual badge rendering issue appears, temporarily switch only the count chip in these two screens to a plain `<span>` fallback to prevent page-level failure while preserving functionality.

3) Preserve and verify linked mapping features
- Files:
  - `src/components/admin/MessItem.tsx`
  - `src/components/admin/HostelItem.tsx`
  - `src/pages/admin/MessManagement.tsx`
  - `src/pages/hotelManager/HostelManagement.tsx`
- Plan:
  - Re-validate existing linked rows (`Hostels:` in Mess cards, `Mess:` in Hostel cards).
  - Ensure fallback labels (`No hostel linked` / `No mess linked`) still show when no links exist.

4) Verification checklist (post-fix)
- `/admin/mess` loads without ErrorBoundary crash.
- Console no longer shows `Component is not a function` for `Badge`.
- Mess cards display linked hostel names.
- `/admin/hostels` displays linked mess names.
- Try Again button is no longer needed for this issue.

Technical details
- This is a frontend runtime/component regression, not a backend data issue.
- No database migration or backend function changes are required.
- The immediate blocker is the shared `Badge` component contract used by management page headers.
