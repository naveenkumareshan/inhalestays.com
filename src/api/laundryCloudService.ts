import { supabase } from '@/integrations/supabase/client';

export const laundryCloudService = {
  // ── Items (public) ──
  getItems: async () => {
    const { data, error } = await supabase
      .from('laundry_items')
      .select('*')
      .eq('is_active', true)
      .order('display_order');
    if (error) throw error;
    return data;
  },

  // ── Pickup Slots (public) ──
  getPickupSlots: async () => {
    const { data, error } = await supabase
      .from('laundry_pickup_slots')
      .select('*')
      .eq('is_active', true)
      .order('start_time');
    if (error) throw error;
    return data;
  },

  // ── Orders ──
  createOrder: async (orderData: {
    user_id: string;
    pickup_address: any;
    pickup_date: string;
    pickup_time_slot: string;
    total_amount: number;
    payment_method: string;
    notes?: string;
    items: { item_id: string; item_name: string; item_price: number; quantity: number; subtotal: number }[];
  }) => {
    const { items, ...order } = orderData;
    const { data: newOrder, error } = await supabase
      .from('laundry_orders')
      .insert(order)
      .select()
      .single();
    if (error) throw error;

    // Insert order items
    const orderItems = items.map(i => ({ ...i, order_id: newOrder.id }));
    const { error: itemsError } = await supabase
      .from('laundry_order_items')
      .insert(orderItems);
    if (itemsError) throw itemsError;

    return newOrder;
  },

  getUserOrders: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    const { data, error } = await supabase
      .from('laundry_orders')
      .select('*, laundry_order_items(*), laundry_partners(business_name)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  getOrderById: async (id: string) => {
    const { data, error } = await supabase
      .from('laundry_orders')
      .select('*, laundry_order_items(*), laundry_partners(business_name, phone)')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },

  // ── Admin ──
  adminGetAllOrders: async (filters?: { status?: string }) => {
    let q = supabase
      .from('laundry_orders')
      .select('*, laundry_order_items(*), laundry_partners(business_name), profiles:user_id(name, phone, email)')
      .order('created_at', { ascending: false });
    if (filters?.status && filters.status !== 'all') q = q.eq('status', filters.status);
    const { data, error } = await q;
    if (error) throw error;
    return data;
  },

  adminUpdateOrder: async (id: string, updates: Record<string, any>) => {
    const { data, error } = await supabase
      .from('laundry_orders')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // ── Items CRUD (admin) ──
  adminGetAllItems: async () => {
    const { data, error } = await supabase
      .from('laundry_items')
      .select('*')
      .order('display_order');
    if (error) throw error;
    return data;
  },

  adminCreateItem: async (item: { name: string; icon: string; price: number; category: string }) => {
    const { data, error } = await supabase
      .from('laundry_items')
      .insert(item)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  adminUpdateItem: async (id: string, updates: Record<string, any>) => {
    const { data, error } = await supabase
      .from('laundry_items')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  adminDeleteItem: async (id: string) => {
    const { error } = await supabase.from('laundry_items').update({ is_active: false }).eq('id', id);
    if (error) throw error;
  },

  // ── Partners CRUD (admin) ──
  adminGetPartners: async () => {
    const { data, error } = await supabase
      .from('laundry_partners')
      .select('*, profiles:user_id(name, email, phone)')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  adminCreatePartner: async (partner: {
    user_id: string;
    business_name: string;
    contact_person: string;
    phone: string;
    email: string;
    service_area: string;
    commission_percentage?: number;
    status?: string;
  }) => {
    const { data, error } = await supabase
      .from('laundry_partners')
      .insert([partner])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  adminUpdatePartner: async (id: string, updates: Record<string, any>) => {
    const { data, error } = await supabase
      .from('laundry_partners')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // ── Pickup Slots CRUD (admin) ──
  adminGetAllSlots: async () => {
    const { data, error } = await supabase
      .from('laundry_pickup_slots')
      .select('*')
      .order('start_time');
    if (error) throw error;
    return data;
  },

  adminCreateSlot: async (slot: { slot_name: string; start_time: string; end_time: string; max_orders: number }) => {
    const { data, error } = await supabase
      .from('laundry_pickup_slots')
      .insert(slot)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  adminUpdateSlot: async (id: string, updates: Record<string, any>) => {
    const { data, error } = await supabase
      .from('laundry_pickup_slots')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // ── Complaints ──
  createComplaint: async (complaint: { order_id: string; user_id: string; subject: string; description: string }) => {
    const { data, error } = await supabase
      .from('laundry_complaints')
      .insert(complaint)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  getUserComplaints: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    const { data, error } = await supabase
      .from('laundry_complaints')
      .select('*, laundry_orders(serial_number)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  // ── Receipts ──
  adminGetReceipts: async () => {
    const { data, error } = await supabase
      .from('laundry_receipts')
      .select('*, laundry_orders(serial_number), laundry_partners(business_name), profiles:user_id(name)')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  // ── Partner dashboard ──
  partnerGetOrders: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    // Get partner record
    const { data: partner } = await supabase
      .from('laundry_partners')
      .select('id')
      .eq('user_id', user.id)
      .single();
    if (!partner) throw new Error('Not a laundry partner');
    const { data, error } = await supabase
      .from('laundry_orders')
      .select('*, laundry_order_items(*), profiles:user_id(name, phone)')
      .eq('partner_id', partner.id)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  partnerVerifyOtp: async (orderId: string, otp: string, type: 'pickup' | 'delivery') => {
    const otpField = type === 'pickup' ? 'pickup_otp' : 'delivery_otp';
    const verifiedField = type === 'pickup' ? 'pickup_otp_verified' : 'delivery_otp_verified';
    const newStatus = type === 'pickup' ? 'picked_up' : 'delivered';

    const { data: order } = await supabase
      .from('laundry_orders')
      .select(otpField)
      .eq('id', orderId)
      .single();

    if (!order || (order as any)[otpField] !== otp) {
      throw new Error('Invalid OTP');
    }

    const { data, error } = await supabase
      .from('laundry_orders')
      .update({ [verifiedField]: true, status: newStatus })
      .eq('id', orderId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
};
