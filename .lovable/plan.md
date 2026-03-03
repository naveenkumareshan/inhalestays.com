

# Remove Image Upload Limit for Reading Rooms and Hostels

## Problem
The `ImageUpload` component has a hard default of `maxCount = 5`, restricting partners to only 5 images per property.

## Solution
Make `maxCount` default to `undefined` (no limit). When `maxCount` is not set, the upload button is always enabled and no counter is shown.

## File to Modify

**`src/components/ImageUpload.tsx`**

1. Change `maxCount` default from `5` to `undefined`
2. Update the max count validation: only check if `maxCount` is defined
3. Update the upload button disabled logic: only apply limit if `maxCount` is defined
4. Update the counter display: only show "X / Y images" if `maxCount` is defined; otherwise show just "X images uploaded"

No changes needed in `CabinEditor.tsx`, `HostelEditor.tsx`, or other consumers -- they don't pass `maxCount`, so they'll automatically get unlimited uploads. Any caller that explicitly passes `maxCount` (like single-image fields) will still respect that limit.

