

# Plan: Mess / Food Service Module for InhaleStays

This is a very large feature spanning database tables, partner management, student marketplace, subscription system, attendance tracking, and analytics. To ensure quality and avoid breaking existing functionality, I will implement it in **phases across multiple messages**. This plan covers the full scope; implementation will begin with Phase 1.

---

## Phase 1: Database Schema + Core Data Layer

### New Tables (via migration)

**1. `mess_partners`** — Mess profile for partners
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| user_id | uuid FK profiles | Partner who owns the mess |
| name | text | Mess name |
| location | text | |
| description | text | |
| contact_number | text | |
| food_type | text | 'veg', 'non_veg', 'both' |
| opening_days | jsonb | e.g. ['Mon','Tue',...] |
| capacity | int | nullable |
| is_active | boolean | default true |
| is_approved | boolean | default false |
| serial_number | text | auto-generated IS-MESS-... |
| created_at / updated_at | timestamptz | |

**2. `mess_meal_timings`** — Meal timing slots
| Column | Type |
|--------|------|
| id | uuid PK |
| mess_id | uuid FK mess_partners |
| meal_type | text | 'breakfast', 'lunch', 'dinner' |
| start_time | time |
| end_time | time |

**3. `mess_packages`** — Subscription packages
| Column | Type |
|--------|------|
| id | uuid PK |
| mess_id | uuid FK mess_partners |
| name | text |
| meal_types | jsonb | e.g. ['breakfast','lunch','dinner'] |
| duration_type | text | 'daily','weekly','monthly' |
| duration_count | int | default 1 |
| price | numeric |
| is_active | boolean |
| created_at | timestamptz |

**4. `mess_weekly_menu`** — Weekly menu items
| Column | Type |
|--------|------|
| id | uuid PK |
| mess_id | uuid FK mess_partners |
| day_of_week | text | 'monday'...'sunday' |
| meal_type | text | 'breakfast','lunch','dinner' |
| menu_items | text | Comma-separated or free text |

**5. `mess_subscriptions`** — Student subscriptions
| Column | Type |
|--------|------|
| id | uuid PK |
| user_id | uuid FK profiles |
| mess_id | uuid FK mess_partners |
| package_id | uuid FK mess_packages |
| start_date | date |
| end_date | date |
| price_paid | numeric |
| payment_status | text | 'pending','completed','failed' |
| status | text | 'active','expired','cancelled','paused' |
| pause_start | date nullable |
| pause_end | date nullable |
| serial_number | text |
| created_at / updated_at | timestamptz |

**6. `mess_attendance`** — Meal consumption tracking
| Column | Type |
|--------|------|
| id | uuid PK |
| subscription_id | uuid FK mess_subscriptions |
| user_id | uuid FK profiles |
| mess_id | uuid FK mess_partners |
| date | date |
| meal_type | text |
| status | text | 'consumed','skipped' |
| marked_by | text | 'qr','manual' |
| marked_at | timestamptz |

**7. `mess_receipts`** — Payment receipts
| Column | Type |
|--------|------|
| id | uuid PK |
| subscription_id | uuid FK mess_subscriptions |
| user_id | uuid FK profiles |
| mess_id | uuid FK mess_partners |
| amount | numeric |
| payment_method | text |
| transaction_id | text |
| serial_number | text |
| created_at | timestamptz |

### RLS Policies
- Students can read mess_partners (approved+active), read their own subscriptions/attendance/receipts
- Partners can CRUD their own mess data via `is_partner_or_employee_of(user_id)` pattern
- Admins have full access via `has_role(auth.uid(), 'admin')`

### Serial number triggers
- IS-MESS for mess_partners, IS-MSUB for subscriptions, IS-MRCPT for receipts

---

## Phase 2: Partner-Side Mess Management

### Files to create/modify:
- **`src/pages/admin/MessManagement.tsx`** — Full mess management page for partners (create/edit mess profile, packages, timings, weekly menu)
- **`src/api/messService.ts`** — API service layer for all mess CRUD operations
- **`src/components/admin/AdminSidebar.tsx`** — Add "Mess / Food" section with sub-items (Mess Profile, Packages, Menu, Subscriptions, Attendance)
- **`src/hooks/usePartnerPropertyTypes.ts`** — Add `hasMess` check against `mess_partners` table

### Partner capabilities:
- Create/edit mess profile
- CRUD meal packages
- Set meal timings
- Upload weekly menu (day × meal grid)
- View subscriber list
- Manual attendance marking
- Revenue dashboard (today/weekly/monthly stats)

---

## Phase 3: Student Marketplace + Subscription Flow

### Files to create:
- **`src/pages/MessMarketplace.tsx`** — Browse mess partners, view menus/packages/prices
- **`src/pages/MessSubscription.tsx`** — Purchase flow (select package → start date → review → pay)
- **`src/pages/students/MessDashboard.tsx`** — Student's mess view (active subscription, meal history, pause/leave, QR code)

### Navigation changes:
- **`src/components/student/MobileBottomNav.tsx`** — Add "Mess" tab (UtensilsCrossed icon) between Hostels and Profile
- **`src/components/Navigation.tsx`** — Add "Food / Mess" nav link
- **`src/App.tsx`** — Add routes: `/mess`, `/mess/:messId`, `/mess/subscribe/:packageId`, `/student/mess`

---

## Phase 4: Attendance System + QR

- QR code generation per student (subscription ID encoded)
- Partner scan page to mark attendance
- Manual attendance marking interface
- Student meal history view with date-wise consumed/skipped status

---

## Phase 5: Pause/Leave + Revenue Dashboard + Reviews/Complaints

- Pause subscription flow (date range picker, auto-extend end date)
- Revenue analytics for mess partners (today/weekly/monthly, active/expired counts)
- Integrate with existing complaints system (add 'Mess' module type)
- Integrate with existing reviews system (mess_subscriptions as reviewable)

---

## Implementation Order

I will start with **Phase 1 (database) + Phase 2 (partner management) + Phase 3 (student side + navigation)** in this message, as they form the MVP. Phases 4-5 will follow.

### Files to be created:
| File | Purpose |
|------|---------|
| `src/api/messService.ts` | API service for all mess CRUD |
| `src/pages/admin/MessManagement.tsx` | Partner mess management (profile, packages, timings, menu) |
| `src/pages/MessMarketplace.tsx` | Student browse mess partners |
| `src/pages/students/MessDashboard.tsx` | Student mess subscription view + meal history |

### Files to be modified:
| File | Change |
|------|--------|
| `src/components/student/MobileBottomNav.tsx` | Add Mess tab |
| `src/components/Navigation.tsx` | Add Food/Mess nav link |
| `src/components/admin/AdminSidebar.tsx` | Add Mess section |
| `src/hooks/usePartnerPropertyTypes.ts` | Add `hasMess` |
| `src/App.tsx` | Add mess routes |

### Database migration:
- 7 new tables with RLS policies, serial triggers, and foreign keys

