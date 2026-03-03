
import { supabase } from '@/integrations/supabase/client';

export const partnerEarningsService = {
  getMyPartner: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: { message: 'Not authenticated' } };

    const { data, error } = await supabase
      .from('partners')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();
    return { data, error };
  },

  getMyEarningsSummary: async (partnerId: string) => {
    const [paidRes, pendingRes, settingsRes] = await Promise.all([
      supabase.from('partner_settlements').select('net_payable, commission_amount, total_collected').eq('partner_id', partnerId).eq('status', 'paid'),
      supabase.from('partner_settlements').select('net_payable, commission_amount, total_collected').eq('partner_id', partnerId).in('status', ['generated', 'approved', 'locked']),
      supabase.from('partner_payout_settings').select('*').eq('partner_id', partnerId).maybeSingle(),
    ]);

    const totalEarnings = (paidRes.data || []).reduce((sum, s) => sum + (s.total_collected || 0), 0);
    const totalCommission = (paidRes.data || []).reduce((sum, s) => sum + (s.commission_amount || 0), 0);
    const netReceived = (paidRes.data || []).reduce((sum, s) => sum + (s.net_payable || 0), 0);
    const pendingAmount = (pendingRes.data || []).reduce((sum, s) => sum + (s.net_payable || 0), 0);

    return {
      totalEarnings,
      totalCommission,
      netReceived,
      pendingAmount,
      settings: settingsRes.data,
    };
  },

  getMySettlements: async (partnerId: string, filters?: { status?: string }) => {
    let query = supabase
      .from('partner_settlements')
      .select('*')
      .eq('partner_id', partnerId)
      .order('created_at', { ascending: false });

    if (filters?.status && filters.status !== 'all') {
      query = query.eq('status', filters.status);
    }

    const { data, error } = await query;
    return { data, error };
  },

  getMySettlementItems: async (settlementId: string) => {
    const { data, error } = await supabase
      .from('settlement_items')
      .select('*')
      .eq('settlement_id', settlementId)
      .order('created_at', { ascending: true });
    return { data, error };
  },

  getMySettlementDetail: async (settlementId: string) => {
    const [settlementRes, itemsRes, adjustmentsRes] = await Promise.all([
      supabase
        .from('partner_settlements')
        .select('*')
        .eq('id', settlementId)
        .single(),
      supabase
        .from('settlement_items')
        .select('*')
        .eq('settlement_id', settlementId)
        .order('created_at', { ascending: true }),
      supabase
        .from('adjustment_entries')
        .select('*')
        .eq('settlement_id', settlementId)
        .order('created_at', { ascending: true }),
    ]);
    return {
      settlement: settlementRes.data,
      items: itemsRes.data || [],
      adjustments: adjustmentsRes.data || [],
    };
  },

  getMyLedger: async (partnerId: string, filters?: { startDate?: string; endDate?: string }) => {
    let query = supabase
      .from('partner_ledger')
      .select('*')
      .eq('partner_id', partnerId)
      .order('created_at', { ascending: false });

    if (filters?.startDate) query = query.gte('created_at', filters.startDate);
    if (filters?.endDate) query = query.lte('created_at', filters.endDate + 'T23:59:59');

    const { data, error } = await query;
    return { data, error };
  },

  getMyPayoutSettings: async (partnerId: string) => {
    const { data, error } = await supabase
      .from('partner_payout_settings')
      .select('*')
      .eq('partner_id', partnerId)
      .maybeSingle();
    return { data, error };
  },
};
