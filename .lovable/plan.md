
# Partner Business Performance Dashboard

## Overview
Create a dedicated, premium Business Intelligence dashboard page for partners at `/partner/business-performance`. This page will aggregate data from all existing tables (bookings, receipts, dues, settlements, seats, beds, hostels, cabins) into a single comprehensive analytics view that demonstrates clear platform value.

## Architecture

The dashboard will be a single new page component with a dedicated data-fetching hook. All data comes from existing database tables -- no new tables needed. The hook will run aggregated queries against existing Supabase tables using the partner's properties.

```text
src/pages/partner/BusinessPerformance.tsx  (new page)
src/hooks/usePartnerPerformance.ts         (new data hook)
src/components/admin/AdminSidebar.tsx       (add menu item)
src/App.tsx                                 (add route)
```

---

## 1. Data Hook (`usePartnerPerformance.ts`)

A single hook that fetches all metrics for the logged-in partner's properties. Queries existing tables:

**Reading Room metrics** (from `cabins`, `seats`, `bookings`, `receipts`, `dues`):
- Total seats, occupied seats, occupancy %
- Collections (fees, deposits, total)
- Pending dues, overdue counts
- Monthly revenue trends (last 12 months from receipts)

**Hostel metrics** (from `hostels`, `hostel_rooms`, `hostel_beds`, `hostel_bookings`, `hostel_receipts`, `hostel_dues`):
- Total beds, occupied beds, occupancy %
- Room/floor-wise occupancy breakdown
- Collections and dues
- Monthly trends

**Settlement metrics** (from `partner_settlements`, `partner_ledger`):
- Gross collection, commission, net earnings
- Paid vs pending settlements

**Student metrics** (from bookings + hostel_bookings):
- Active students, new this month, renewals, dropouts
- Average stay duration

**Filters**: Month, Year, Custom Date Range, Property selector (if partner has multiple properties). Default: current month.

---

## 2. Page Layout (`BusinessPerformance.tsx`)

### Header
- Title: "Business Performance"
- Filters row: Month/Year picker, Property selector, Date range

### Section A: Top Summary Cards (3 rows of cards)
Row 1: Total Seats/Beds | Occupied | Occupancy % | Net Earnings
Row 2: Total Collections | Fees Collected | Deposits Collected | Pending Dues
Row 3: Pending Refunds | New Admissions | Renewals | Dropouts

Each card shows the value + comparison with previous month (green/red arrow + % change).

### Section B: Revenue Breakdown
Table/card showing:
- Room Fees, Food Collection, Deposits, Other Charges, Total
- Columns: This Month | Last Month | % Growth
- Green/red color coding for growth indicators

### Section C: Dues and Refund Overview
Card grid: Total Students with Dues | Total Dues Amount | Overdue >7 days | Overdue >30 days | Refunds Pending | Refunds Processed

### Section D: Trend Charts (using Recharts -- already installed)
- Monthly Occupancy line chart (12 months)
- Monthly Revenue bar chart (12 months)
- Deposit Collection trend line
- Dues trend line
- Highlight badges: "Highest Revenue Month: March 2026", "Best Occupancy Month: Feb 2026"

### Section E: Room/Floor Performance
- Table: Floor name | Occupancy % | Revenue | Performance bar
- Highlight: Most profitable room, Lowest performing room

### Section F: Reading Room Specific (conditional, only if partner has reading rooms)
- Active members, slot-wise occupancy, peak time usage %, advance bookings count, due members

### Section G: Settlement and Earnings Overview
- Card grid: Gross Collection | Platform Commission | Net Earnings | Paid Settlements | Pending Amount

### Section H: Student Insights
- Active students | New admissions this month | Renewals | Dropouts | Average stay duration

### Section I: Insight Cards (Psychological Value)
Smart auto-generated text insights:
- "Your occupancy improved by X% compared to last month."
- "You earned Rs X more than last month."
- "Room Y generates highest income."
- Displayed as gradient cards with relevant icons.

---

## 3. Sidebar and Routing

**AdminSidebar.tsx**: Add "Business Performance" menu item with `BarChart2` icon under partner-visible items, positioned near Dashboard.

**App.tsx**: Add route `<Route path="business-performance" element={<BusinessPerformance />} />` under both `/admin` and `/partner` route groups.

---

## 4. UI Design Approach

- Uses existing Card, Badge, Table, Tabs components
- Recharts for all charts (already installed: `recharts ^2.12.7`)
- Responsive: cards stack on mobile (grid-cols-2 -> grid-cols-4)
- Green/red indicators via Tailwind classes (text-emerald-600, text-red-500)
- Compact density matching existing admin panel style (text-xs, text-[11px])
- No new dependencies needed

---

## 5. Query Strategy

All queries use the existing Supabase client with RLS. Partners automatically only see their own data due to existing RLS policies on cabins, hostels, bookings, etc. Key queries:

- Occupancy: count bookings where `start_date <= today AND end_date >= today` grouped by property
- Revenue: aggregate receipts by month with `created_at` filtering
- Dues: count/sum from dues and hostel_dues tables filtered by status
- Settlements: aggregate from partner_settlements
- Trends: 12-month lookback using `created_at >= 12 months ago` with month grouping in JS

No database migrations required -- all data already exists in current tables.
