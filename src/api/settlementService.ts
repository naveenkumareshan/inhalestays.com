
import { supabase } from '@/integrations/supabase/client';

export interface PartnerPayoutSettings {
  id?: string;
  partner_id: string;
  settlement_cycle: string;
  custom_cycle_days?: number | null;
  commission_type: string;
  commission_percentage: number;
  commission_fixed: number;
  commission_on: string;
  gateway_charge_mode: string;
  gateway_split_percentage: number;
  tds_enabled: boolean;
  tds_percentage: number;
  security_hold_enabled: boolean;
  security_hold_percentage: number;
  security_hold_days: number;
  minimum_payout_amount: number;
}

export interface SettlementFilters {
  status?: string;
  partner_id?: string;
  period_start?: string;
  period_end?: string;
  payment_mode?: string;
  page?: number;
  limit?: number;
}

export interface PaymentData {
  utr_number: string;
  payment_reference: string;
  payment_mode: string;
  payment_date: string;
  notes?: string;
}

export interface AdjustmentData {
  partner_id: string;
  type: string;
  amount: number;
  description: string;
}

export const settlementService = {
  // ── Payout Settings ──
  getPartnerPayoutSettings: async (partnerId: string) => {
    const { data, error } = await supabase
      .from('partner_payout_settings')
      .select('*')
      .eq('partner_id', partnerId)
      .maybeSingle();
    return { data, error };
  },

  updatePartnerPayoutSettings: async (partnerId: string, settings: Partial<PartnerPayoutSettings>) => {
    const { data: existing } = await supabase
      .from('partner_payout_settings')
      .select('id')
      .eq('partner_id', partnerId)
      .maybeSingle();

    if (existing) {
      const { data, error } = await supabase
        .from('partner_payout_settings')
        .update({ ...settings, updated_at: new Date().toISOString() })
        .eq('partner_id', partnerId)
        .select()
        .single();
      return { data, error };
    } else {
      const { data, error } = await supabase
        .from('partner_payout_settings')
        .insert({ partner_id: partnerId, ...settings })
        .select()
        .single();
      return { data, error };
    }
  },

  // ── Settlements ──
  getSettlements: async (filters?: SettlementFilters) => {
    let query = supabase
      .from('partner_settlements')
      .select('*, partners!inner(business_name, contact_person, email, bank_details)')
      .order('created_at', { ascending: false });

    if (filters?.status && filters.status !== 'all') {
      query = query.eq('status', filters.status);
    }
    if (filters?.partner_id) {
      query = query.eq('partner_id', filters.partner_id);
    }
    if (filters?.period_start) {
      query = query.gte('period_start', filters.period_start);
    }
    if (filters?.period_end) {
      query = query.lte('period_end', filters.period_end);
    }
    if (filters?.payment_mode) {
      query = query.eq('payment_mode', filters.payment_mode);
    }

    const limit = filters?.limit || 50;
    const page = filters?.page || 0;
    query = query.range(page * limit, (page + 1) * limit - 1);

    const { data, error, count } = await query;
    return { data, error, count };
  },

  getSettlementDetail: async (settlementId: string) => {
    const [settlementRes, itemsRes, adjustmentsRes] = await Promise.all([
      supabase
        .from('partner_settlements')
        .select('*, partners!inner(business_name, contact_person, email, bank_details)')
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
      error: settlementRes.error || itemsRes.error || adjustmentsRes.error,
    };
  },

  generateSettlement: async (partnerId: string, periodStart: string, periodEnd: string) => {
    // 1. Get partner settings
    const { data: settings } = await supabase
      .from('partner_payout_settings')
      .select('*')
      .eq('partner_id', partnerId)
      .maybeSingle();

    const commPct = settings?.commission_percentage ?? 10;
    const commFixed = settings?.commission_fixed ?? 0;
    const commType = settings?.commission_type ?? 'percentage';
    const commOn = settings?.commission_on ?? 'room_rent';
    const gatewayMode = settings?.gateway_charge_mode ?? 'absorb_platform';
    const gatewaySplit = settings?.gateway_split_percentage ?? 50;
    const tdsEnabled = settings?.tds_enabled ?? false;
    const tdsPct = settings?.tds_percentage ?? 0;
    const securityEnabled = settings?.security_hold_enabled ?? false;
    const securityPct = settings?.security_hold_percentage ?? 0;

    // 2. Get partner info
    const { data: partner } = await supabase
      .from('partners')
      .select('user_id, business_name')
      .eq('id', partnerId)
      .single();

    if (!partner) return { data: null, error: { message: 'Partner not found' } };

    // 3. Get partner's cabins and hostels
    const [cabinsRes, hostelsRes] = await Promise.all([
      supabase.from('cabins').select('id, name').eq('created_by', partner.user_id),
      supabase.from('hostels').select('id, name').eq('created_by', partner.user_id),
    ]);

    const cabinIds = cabinsRes.data?.map(c => c.id) || [];
    const cabinMap = Object.fromEntries((cabinsRes.data || []).map(c => [c.id, c.name]));
    const hostelIds = hostelsRes.data?.map(h => h.id) || [];
    const hostelMap = Object.fromEntries((hostelsRes.data || []).map(h => [h.id, h.name]));

    // 4. Query ONLINE receipts only (Reading Room)
    let rrReceipts: any[] = [];
    if (cabinIds.length > 0) {
      const { data } = await supabase
        .from('receipts')
        .select('id, serial_number, user_id, cabin_id, amount, payment_method, receipt_type, transaction_id, created_at, booking_id')
        .in('cabin_id', cabinIds)
        .eq('payment_method', 'online')
        .eq('settlement_status', 'unsettled')
        .gte('created_at', periodStart)
        .lte('created_at', periodEnd + 'T23:59:59');
      rrReceipts = data || [];
    }

    // 5. Query ONLINE hostel receipts only
    let hostelReceipts: any[] = [];
    if (hostelIds.length > 0) {
      const { data } = await supabase
        .from('hostel_receipts')
        .select('id, serial_number, user_id, hostel_id, amount, payment_method, receipt_type, transaction_id, created_at, booking_id')
        .in('hostel_id', hostelIds)
        .eq('payment_method', 'online')
        .eq('settlement_status', 'unsettled')
        .gte('created_at', periodStart)
        .lte('created_at', periodEnd + 'T23:59:59');
      hostelReceipts = data || [];
    }

    if (rrReceipts.length === 0 && hostelReceipts.length === 0) {
      return { data: null, error: { message: 'No unsettled online receipts found for this period' } };
    }

    // 6. Get student names
    const allUserIds = [...new Set([...rrReceipts.map(r => r.user_id), ...hostelReceipts.map(r => r.user_id)])];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, name')
      .in('id', allUserIds);
    const profileMap = Object.fromEntries((profiles || []).map(p => [p.id, p.name || 'Unknown']));

    // 7. Build settlement items from receipts
    const items: any[] = [];
    let totalCollected = 0;
    let totalCommission = 0;
    let totalGateway = 0;

    const calcCommission = (amount: number) => {
      if (commType === 'percentage') return (amount * commPct) / 100;
      if (commType === 'fixed') return commFixed;
      return (amount * commPct) / 100 + commFixed; // hybrid
    };

    for (const r of rrReceipts) {
      const receiptAmount = r.amount || 0;
      const commission = calcCommission(receiptAmount);
      const gatewayFee = gatewayMode === 'pass_to_partner' ? receiptAmount * 0.02 :
        gatewayMode === 'split' ? receiptAmount * 0.02 * (gatewaySplit / 100) : 0;
      const netAmount = receiptAmount - commission - gatewayFee;

      items.push({
        booking_type: 'reading_room',
        booking_id: r.booking_id,
        receipt_id: r.id,
        receipt_serial: r.serial_number || '',
        receipt_type: r.receipt_type || 'booking_payment',
        payment_date: r.created_at,
        student_name: profileMap[r.user_id] || 'Unknown',
        property_name: cabinMap[r.cabin_id] || 'Reading Room',
        room_rent: receiptAmount,
        food_amount: 0,
        total_amount: receiptAmount,
        commission_amount: commission,
        gateway_fee: gatewayFee,
        net_amount: netAmount,
      });
      totalCollected += receiptAmount;
      totalCommission += commission;
      totalGateway += gatewayFee;
    }

    for (const r of hostelReceipts) {
      const receiptAmount = r.amount || 0;
      const commission = calcCommission(receiptAmount);
      const gatewayFee = gatewayMode === 'pass_to_partner' ? receiptAmount * 0.02 :
        gatewayMode === 'split' ? receiptAmount * 0.02 * (gatewaySplit / 100) : 0;
      const netAmount = receiptAmount - commission - gatewayFee;

      items.push({
        booking_type: 'hostel',
        hostel_booking_id: r.booking_id,
        hostel_receipt_id: r.id,
        receipt_serial: r.serial_number || '',
        receipt_type: r.receipt_type || 'booking_payment',
        payment_date: r.created_at,
        student_name: profileMap[r.user_id] || 'Unknown',
        property_name: hostelMap[r.hostel_id] || 'Hostel',
        room_rent: receiptAmount,
        food_amount: 0,
        total_amount: receiptAmount,
        commission_amount: commission,
        gateway_fee: gatewayFee,
        net_amount: netAmount,
      });
      totalCollected += receiptAmount;
      totalCommission += commission;
      totalGateway += gatewayFee;
    }

    // 8. Get pending adjustments
    const { data: adjustments } = await supabase
      .from('adjustment_entries')
      .select('*')
      .eq('partner_id', partnerId)
      .eq('status', 'pending');

    const adjustmentTotal = (adjustments || []).reduce((sum, a) => sum + (a.amount || 0), 0);

    // 9. TDS & Security Hold
    const tdsAmount = tdsEnabled ? (totalCollected - totalCommission) * (tdsPct / 100) : 0;
    const securityHold = securityEnabled ? (totalCollected - totalCommission) * (securityPct / 100) : 0;

    const netPayable = totalCollected - totalCommission - totalGateway - adjustmentTotal - tdsAmount - securityHold;

    // 10. Create settlement
    const { data: settlement, error: settError } = await supabase
      .from('partner_settlements')
      .insert({
        partner_id: partnerId,
        period_start: periodStart,
        period_end: periodEnd,
        total_bookings: items.length,
        total_collected: totalCollected,
        commission_amount: totalCommission,
        gateway_fees: totalGateway,
        refund_amount: 0,
        adjustment_amount: adjustmentTotal,
        tds_amount: tdsAmount,
        security_hold_amount: securityHold,
        net_payable: netPayable,
        status: 'generated',
      })
      .select()
      .single();

    if (settError || !settlement) return { data: null, error: settError };

    // 11. Insert settlement items
    const itemsWithSettlement = items.map(i => ({ ...i, settlement_id: settlement.id }));
    await supabase.from('settlement_items').insert(itemsWithSettlement);

    // 12. Mark receipts as included
    const rrReceiptIds = rrReceipts.map(r => r.id);
    const hostelReceiptIds = hostelReceipts.map(r => r.id);
    if (rrReceiptIds.length > 0) {
      await supabase.from('receipts').update({ settlement_status: 'included', settlement_id: settlement.id }).in('id', rrReceiptIds);
    }
    if (hostelReceiptIds.length > 0) {
      await supabase.from('hostel_receipts').update({ settlement_status: 'included', settlement_id: settlement.id }).in('id', hostelReceiptIds);
    }

    // 13. Apply adjustments
    if (adjustments && adjustments.length > 0) {
      const adjIds = adjustments.map(a => a.id);
      await supabase.from('adjustment_entries').update({ status: 'applied', settlement_id: settlement.id, applied_at: new Date().toISOString() }).in('id', adjIds);
    }

    return { data: settlement, error: null };
  },

  approveSettlement: async (settlementId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from('partner_settlements')
      .update({ status: 'approved', approved_by: user?.id, approved_at: new Date().toISOString() })
      .eq('id', settlementId)
      .select()
      .single();
    return { data, error };
  },

  lockSettlement: async (settlementId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from('partner_settlements')
      .update({ status: 'locked', locked_by: user?.id, locked_at: new Date().toISOString() })
      .eq('id', settlementId)
      .select()
      .single();
    return { data, error };
  },

  markSettlementPaid: async (settlementId: string, paymentData: PaymentData) => {
    const { data: { user } } = await supabase.auth.getUser();

    // Get settlement for partner_id and amount
    const { data: settlement } = await supabase
      .from('partner_settlements')
      .select('partner_id, net_payable')
      .eq('id', settlementId)
      .single();

    if (!settlement) return { data: null, error: { message: 'Settlement not found' } };

    // Update settlement
    const { data, error } = await supabase
      .from('partner_settlements')
      .update({
        status: 'paid',
        utr_number: paymentData.utr_number,
        payment_reference: paymentData.payment_reference,
        payment_mode: paymentData.payment_mode,
        payment_date: paymentData.payment_date,
        notes: paymentData.notes || '',
      })
      .eq('id', settlementId)
      .select()
      .single();

    if (error) return { data: null, error };

    // Create payout transaction
    await supabase.from('payout_transactions').insert({
      settlement_id: settlementId,
      partner_id: settlement.partner_id,
      amount: settlement.net_payable,
      payment_mode: paymentData.payment_mode,
      utr_number: paymentData.utr_number,
      payment_reference: paymentData.payment_reference,
      payment_date: paymentData.payment_date,
      status: 'completed',
      processed_by: user?.id,
      notes: paymentData.notes || '',
    });

    // Mark receipts as settled
    await supabase.from('receipts').update({ settlement_status: 'settled' }).eq('settlement_id', settlementId);
    await supabase.from('hostel_receipts').update({ settlement_status: 'settled' }).eq('settlement_id', settlementId);

    // Create ledger entries
    await supabase.from('partner_ledger').insert([
      {
        partner_id: settlement.partner_id,
        entry_type: 'debit',
        category: 'payout',
        amount: settlement.net_payable,
        running_balance: 0,
        reference_type: 'settlement',
        reference_id: settlementId,
        description: `Payout for settlement - UTR: ${paymentData.utr_number}`,
        property_type: 'reading_room',
      },
    ]);

    return { data, error: null };
  },

  // ── Adjustments ──
  addAdjustment: async (adjustmentData: AdjustmentData) => {
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from('adjustment_entries')
      .insert({
        ...adjustmentData,
        created_by: user?.id,
        status: 'pending',
      })
      .select()
      .single();
    return { data, error };
  },

  getAdjustments: async (partnerId: string) => {
    const { data, error } = await supabase
      .from('adjustment_entries')
      .select('*')
      .eq('partner_id', partnerId)
      .order('created_at', { ascending: false });
    return { data, error };
  },

  reverseAdjustment: async (adjustmentId: string) => {
    const { data, error } = await supabase
      .from('adjustment_entries')
      .update({ status: 'reversed' })
      .eq('id', adjustmentId)
      .select()
      .single();
    return { data, error };
  },

  // ── Ledger ──
  getPartnerLedger: async (partnerId: string, filters?: { startDate?: string; endDate?: string; category?: string }) => {
    let query = supabase
      .from('partner_ledger')
      .select('*')
      .eq('partner_id', partnerId)
      .order('created_at', { ascending: false });

    if (filters?.startDate) query = query.gte('created_at', filters.startDate);
    if (filters?.endDate) query = query.lte('created_at', filters.endDate + 'T23:59:59');
    if (filters?.category && filters.category !== 'all') query = query.eq('category', filters.category);

    const { data, error } = await query;
    return { data, error };
  },

  // ── Dashboard Stats ──
  getDashboardStats: async () => {
    const [partnersRes, settlementsRes, pendingRes, paidRes] = await Promise.all([
      supabase.from('partners').select('id', { count: 'exact', head: true }).eq('status', 'approved'),
      supabase.from('partner_settlements').select('id, net_payable', { count: 'exact' }),
      supabase.from('partner_settlements').select('id, net_payable').in('status', ['generated', 'approved', 'locked']),
      supabase.from('partner_settlements').select('id, net_payable').eq('status', 'paid'),
    ]);

    const totalPaid = (paidRes.data || []).reduce((sum, s) => sum + (s.net_payable || 0), 0);
    const totalPending = (pendingRes.data || []).reduce((sum, s) => sum + (s.net_payable || 0), 0);

    return {
      totalPartners: partnersRes.count || 0,
      totalSettlements: settlementsRes.count || 0,
      pendingSettlements: pendingRes.data?.length || 0,
      pendingAmount: totalPending,
      paidSettlements: paidRes.data?.length || 0,
      totalPaid,
    };
  },

  // ── Get all partners for dropdown ──
  getAllPartners: async () => {
    const { data, error } = await supabase
      .from('partners')
      .select('id, business_name, contact_person')
      .eq('status', 'approved')
      .order('business_name');
    return { data, error };
  },
};
