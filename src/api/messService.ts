import { supabase } from '@/integrations/supabase/client';

// ── Mess Partners ──
export const getMessPartners = async (filters?: { approved?: boolean; active?: boolean }) => {
  let q = supabase.from('mess_partners' as any).select('*, profiles:user_id(name, email, phone)');
  if (filters?.approved !== undefined) q = q.eq('is_approved', filters.approved);
  if (filters?.active !== undefined) q = q.eq('is_active', filters.active);
  const { data, error } = await q.order('created_at', { ascending: false });
  if (error) throw error;
  return data as any[];
};

export const getMyMessPartner = async (userId: string) => {
  const { data, error } = await supabase
    .from('mess_partners' as any)
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data as any;
};

export const upsertMessPartner = async (mess: any) => {
  const { data, error } = await supabase
    .from('mess_partners' as any)
    .upsert(mess, { onConflict: 'id' })
    .select()
    .single();
  if (error) throw error;
  return data;
};

// ── Meal Timings ──
export const getMealTimings = async (messId: string) => {
  const { data, error } = await supabase
    .from('mess_meal_timings' as any)
    .select('*')
    .eq('mess_id', messId)
    .order('meal_type');
  if (error) throw error;
  return data as any[];
};

export const upsertMealTiming = async (timing: any) => {
  const { data, error } = await supabase
    .from('mess_meal_timings' as any)
    .upsert(timing, { onConflict: 'id' })
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const deleteMealTiming = async (id: string) => {
  const { error } = await supabase.from('mess_meal_timings' as any).delete().eq('id', id);
  if (error) throw error;
};

// ── Packages ──
export const getMessPackages = async (messId: string) => {
  const { data, error } = await supabase
    .from('mess_packages' as any)
    .select('*')
    .eq('mess_id', messId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as any[];
};

export const upsertMessPackage = async (pkg: any) => {
  const { data, error } = await supabase
    .from('mess_packages' as any)
    .upsert(pkg, { onConflict: 'id' })
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const deleteMessPackage = async (id: string) => {
  const { error } = await supabase.from('mess_packages' as any).delete().eq('id', id);
  if (error) throw error;
};

// ── Weekly Menu ──
export const getWeeklyMenu = async (messId: string) => {
  const { data, error } = await supabase
    .from('mess_weekly_menu' as any)
    .select('*')
    .eq('mess_id', messId);
  if (error) throw error;
  return data as any[];
};

export const upsertWeeklyMenu = async (items: any[]) => {
  const { error } = await supabase.from('mess_weekly_menu' as any).upsert(items, { onConflict: 'id' });
  if (error) throw error;
};

export const deleteWeeklyMenuItem = async (id: string) => {
  const { error } = await supabase.from('mess_weekly_menu' as any).delete().eq('id', id);
  if (error) throw error;
};

// ── Subscriptions ──
export const getMessSubscriptions = async (messId: string) => {
  const { data, error } = await supabase
    .from('mess_subscriptions' as any)
    .select('*, profiles:user_id(name, email, phone), mess_packages:package_id(name, meal_types, duration_type)')
    .eq('mess_id', messId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as any[];
};

export const getMyMessSubscriptions = async (userId: string) => {
  const { data, error } = await supabase
    .from('mess_subscriptions' as any)
    .select('*, mess_partners:mess_id(name, location, food_type), mess_packages:package_id(name, meal_types, duration_type, price)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as any[];
};

export const createMessSubscription = async (sub: any) => {
  const { data, error } = await supabase
    .from('mess_subscriptions' as any)
    .insert(sub)
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const updateMessSubscription = async (id: string, updates: any) => {
  const { data, error } = await supabase
    .from('mess_subscriptions' as any)
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
};

// ── Attendance ──
export const getMessAttendance = async (messId: string, date?: string) => {
  let q = supabase
    .from('mess_attendance' as any)
    .select('*, profiles:user_id(name, email)')
    .eq('mess_id', messId);
  if (date) q = q.eq('date', date);
  const { data, error } = await q.order('marked_at', { ascending: false });
  if (error) throw error;
  return data as any[];
};

export const getMyAttendance = async (userId: string, subscriptionId?: string) => {
  let q = supabase
    .from('mess_attendance' as any)
    .select('*')
    .eq('user_id', userId);
  if (subscriptionId) q = q.eq('subscription_id', subscriptionId);
  const { data, error } = await q.order('date', { ascending: false });
  if (error) throw error;
  return data as any[];
};

export const markAttendance = async (record: any) => {
  const { data, error } = await supabase
    .from('mess_attendance' as any)
    .insert(record)
    .select()
    .single();
  if (error) throw error;
  return data;
};

// ── Receipts ──
export const getMessReceipts = async (messId: string) => {
  const { data, error } = await supabase
    .from('mess_receipts' as any)
    .select('*, profiles:user_id(name, email)')
    .eq('mess_id', messId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as any[];
};

export const createMessReceipt = async (receipt: any) => {
  const { data, error } = await supabase
    .from('mess_receipts' as any)
    .insert(receipt)
    .select()
    .single();
  if (error) throw error;
  return data;
};

// ── Lookup by serial number or UUID ──
export const getMessPartnerById = async (id: string) => {
  const { data, error } = await supabase
    .from('mess_partners' as any)
    .select('*, profiles:user_id(name, email, phone)')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data as any;
};

export const getMessPartnerBySerialNumber = async (serialNumber: string) => {
  const { data, error } = await supabase
    .from('mess_partners' as any)
    .select('*, profiles:user_id(name, email, phone)')
    .eq('serial_number', serialNumber)
    .single();
  if (error) throw error;
  return data as any;
};
