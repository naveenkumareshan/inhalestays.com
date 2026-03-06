

# Plan: Compact SaaS-Style Stats Bar for Partner Management

## Problem
The stats cards are displayed in a 2-row grid with large numbers and padding — takes too much vertical space. User wants them in a **single compact row** with small icons, where the **data (numbers) is the hero**, not the icons.

## Changes

### `src/components/admin/VendorStatsCards.tsx` — Redesign to inline single-row

Replace the 6-card grid with a **single compact bar** — a single `Card` containing all 6 stats in one horizontal row, each stat as a tight inline group:

```
[ 👥 3 Partners  |  ⏱ 0 Pending  |  ✓ 3 Approved  |  ✕ 0 Rejected  |  ⚠ 0 Suspended  |  🏢 11 Properties ]
```

- Single `Card` with `flex items-center divide-x` layout
- Each stat: icon (`h-3 w-3`) + value (`text-sm font-bold`) + label (`text-[10px] text-muted-foreground`) — all inline
- Value is prominent (bold, colored), icon and label are subdued
- Responsive: on mobile, wrap to 2 rows of 3 using `flex-wrap`
- Remove individual card borders/shadows — just one container
- Loading state: single skeleton bar

