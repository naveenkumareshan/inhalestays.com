

# Fix PGRST201 FK Ambiguity Across All Files

## Problem
Four files still use `subscription_plans(...)` without specifying the foreign key, causing a 300 error (PGRST201) because `property_subscriptions` has two FKs to `subscription_plans` (`plan_id` and `previous_plan_id`).

The network logs confirm the error is happening right now on the subscription plans page.

## Fix
Add `!property_subscriptions_plan_id_fkey` to every ambiguous join:

### 1. `src/hooks/useSubscriptionAccess.ts` (2 occurrences)
- Line 38: `subscription_plans(*)` → `subscription_plans!property_subscriptions_plan_id_fkey(*)`
- Line 72: `subscription_plans(*)` → `subscription_plans!property_subscriptions_plan_id_fkey(*)`

### 2. `src/pages/admin/SubscriptionPlans.tsx` (1 occurrence)
- Line 76: `subscription_plans(name)` → `subscription_plans!property_subscriptions_plan_id_fkey(name)`

### 3. `src/components/admin/PropertySubscribeDialog.tsx` (1 occurrence)
- Line 70: `subscription_plans(display_order)` → `subscription_plans!property_subscriptions_plan_id_fkey(display_order)`

### 4. `supabase/functions/subscription-create-order/index.ts` (1 occurrence)
- Line 104: `subscription_plans(display_order)` → `subscription_plans!property_subscriptions_plan_id_fkey(display_order)`

All are single-line fixes replacing the join hint. No logic changes needed.

