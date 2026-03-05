import { supabase } from '@/integrations/supabase/client';

let cachedResult: { userId: string; ownerId: string } | null = null;
let cacheUserId: string | null = null;

/**
 * Resolves the effective owner ID for queries.
 * For vendor_employees, returns the partner's user ID so queries
 * filtering by `created_by` return the partner's properties.
 * For partners/admins, returns their own user ID.
 */
export async function getEffectiveOwnerId(): Promise<{ userId: string; ownerId: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Return cached result if same user
  if (cachedResult && cacheUserId === user.id) {
    return cachedResult;
  }

  const { data: roles } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id);

  const isEmployee = roles?.some(r => r.role === 'vendor_employee');

  if (isEmployee) {
    const { data: emp } = await supabase
      .from('vendor_employees')
      .select('partner_user_id')
      .eq('employee_user_id', user.id)
      .eq('status', 'active')
      .maybeSingle();

    if (emp?.partner_user_id) {
      const result = { userId: user.id, ownerId: emp.partner_user_id };
      cachedResult = result;
      cacheUserId = user.id;
      return result;
    }
  }

  const result = { userId: user.id, ownerId: user.id };
  cachedResult = result;
  cacheUserId = user.id;
  return result;
}

/** Clear the cache (e.g. on logout) */
export function clearEffectiveOwnerCache() {
  cachedResult = null;
  cacheUserId = null;
}
