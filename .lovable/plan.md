
# Fix Share Button, URL, and Bottom Navigation

## 1. Update Share URL to `inhalestays.com`

**File: `src/utils/appUrl.ts`**
Change `"https://bookmynook.com"` to `"https://inhalestays.com"`. This single change fixes all share links, credential links, and partner links across the entire app.

## 2. Move Share Button Below Image (beside photo counter)

Currently the ShareButton sits in the top-right image overlay. Move it to the property info section below the image, next to the property name, making it more visible and accessible.

**File: `src/pages/BookSeat.tsx`** (lines 256-266)
- Remove `ShareButton` from the `absolute top-3 right-3` overlay div
- Add it in the info section (line ~274) next to the property name, as a small inline icon button

**File: `src/pages/HostelRoomDetails.tsx`** (lines 486-498)
- Same change: remove from overlay, place next to hostel name below the image

**File: `src/components/CabinImageSlider.tsx`**
- No changes needed -- the photo counter stays inside the carousel as-is

### Layout after change (BookSeat example):
```text
[  Image Carousel with photo counter "1/5"  ]
PropertyName                    [Share icon]
Star 4.5 (12 reviews)
Pin Location address
```

## 3. Clean Up Share Text

**File: `src/utils/shareUtils.ts`**
- Make the share text cleaner and more readable
- Put property name prominently first
- Keep emojis but format better with line breaks

## 4. Bigger Bottom Navigation Icons with Theme Color

**File: `src/components/student/MobileBottomNav.tsx`**
- Increase icon size: `w-5 h-5` (20px) to `w-6 h-6` (24px)
- Increase text: `text-[10px]` to `text-[11px]`
- Increase nav height: `min-h-[56px]` to `min-h-[64px]`
- Active tab: add light primary background (`bg-primary/10 rounded-xl px-3 py-1`)
- Widen active indicator bar: `w-8` to `w-10`
- Increase active scale: `scale-110` to `scale-[1.15]`

### Visual result:
```text
Before: tiny icons, no color distinction
After:  larger icons, active tab has soft primary-tinted background pill
```

---

## Summary

| File | Change |
|------|--------|
| `src/utils/appUrl.ts` | URL to `https://inhalestays.com` |
| `src/utils/shareUtils.ts` | Cleaner share text formatting |
| `src/pages/BookSeat.tsx` | Move ShareButton below image beside name |
| `src/pages/HostelRoomDetails.tsx` | Move ShareButton below image beside name |
| `src/components/student/MobileBottomNav.tsx` | Larger icons, themed active state |
