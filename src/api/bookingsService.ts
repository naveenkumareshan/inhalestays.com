import { supabase } from '@/integrations/supabase/client';

interface BookingFilters {
  status?: string;
  startDate?: string;
  endDate?: string;
}

interface BookingData {
  cabin_id?: string;
  seat_id?: string;
  seat_number?: number;
  start_date: string;
  end_date: string;
  total_price?: number;
  payment_status?: string;
  booking_duration?: string;
  duration_count?: string;
  slot_id?: string;
  customer_name?: string;
}

interface RenewalBookingData {
  cabin_id: string;
  seat_id: string;
  seat_number: number;
  start_date: string;
  end_date: string;
  total_price: number;
  payment_status: string;
  payment_method: string;
  booking_duration: string;
  duration_count: string;
  locker_included: boolean;
  locker_price: number;
  razorpay_order_id?: string;
  razorpay_payment_id?: string;
  razorpay_signature?: string;
  discount_amount?: number;
  discount_reason?: string;
}

export const bookingsService = {
  createBooking: async (data: BookingData) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { success: false, error: 'Not authenticated' };

      const { data: booking, error } = await supabase
        .from('bookings')
        .insert({ ...data, user_id: user.id })
        .select()
        .single();

      return { success: !error, data: booking };
    } catch (error: any) {
      console.error('Error creating booking:', error);
      return { success: false, error: error.message };
    }
  },

  getUserBookings: async (filters?: BookingFilters) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { success: false, data: [] };

      let query = supabase
        .from('bookings')
        .select('*, cabins(name, category, image_url, city, area, full_address, locker_available, locker_price)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (filters?.status) query = query.eq('payment_status', filters.status);
      if (filters?.startDate) query = query.gte('start_date', filters.startDate);
      if (filters?.endDate) query = query.lte('end_date', filters.endDate);

      const { data, error } = await query;
      return { success: !error, data: data || [] };
    } catch (error: any) {
      console.error('Error fetching user bookings:', error);
      return { success: false, error: error.message, data: [] };
    }
  },

  getCurrentBookings: async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { success: false, data: [] };

      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('bookings')
        .select('*, cabins(name, category, image_url, city, area, full_address, locker_available, locker_price)')
        .eq('user_id', user.id)
        .gte('end_date', today)
        .in('payment_status', ['completed', 'advance_paid'])
        .order('created_at', { ascending: false });

      return { success: !error, data: data || [] };
    } catch (error: any) {
      console.error('Error fetching current bookings:', error);
      return { success: false, error: error.message, data: [] };
    }
  },

  getBookingById: async (id: string) => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('*, cabins(name, category, image_url, city, area, description, full_address, locker_available, locker_price), seats:seat_id(price, number, category), cabin_slots:slot_id(name, start_time, end_time, price)')
        .eq('id', id)
        .single();
      return { success: !error, data };
    } catch (error: any) {
      console.error('Error fetching booking:', error);
      return { success: false, error: error.message };
    }
  },

  updateBookingStatus: async (id: string, status: string) => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .update({ payment_status: status })
        .eq('id', id)
        .select()
        .single();
      return { success: !error, data };
    } catch (error: any) {
      console.error('Error updating booking status:', error);
      return { success: false, error: error.message };
    }
  },

  cancelBooking: async (id: string) => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .update({ payment_status: 'cancelled' })
        .eq('id', id)
        .select()
        .single();
      return { success: !error, data };
    } catch (error: any) {
      console.error('Error cancelling booking:', error);
      return { success: false, error: error.message };
    }
  },

  extendBooking: async (id: string, newEndDate: string) => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .update({ end_date: newEndDate })
        .eq('id', id)
        .select()
        .single();
      return { success: !error, data };
    } catch (error: any) {
      console.error('Error extending booking:', error);
      return { success: false, error: error.message };
    }
  },

  getBookingHistory: async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { success: false, data: [] };

      const { data, error } = await supabase
        .from('bookings')
        .select('*, cabins(name, category, image_url, full_address, locker_available, locker_price)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      return { success: !error, data: data || [] };
    } catch (error: any) {
      console.error('Error fetching booking history:', error);
      return { success: false, error: error.message, data: [] };
    }
  },

  getCabinBookings: async (cabinId: string) => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('cabin_id', cabinId);
      return { success: !error, data: data || [] };
    } catch (error: any) {
      console.error('Error fetching cabin bookings:', error);
      return { success: false, error: error.message, data: [] };
    }
  },

  renewBooking: async (renewalData: RenewalBookingData) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('bookings')
      .insert({
        cabin_id: renewalData.cabin_id,
        seat_id: renewalData.seat_id,
        seat_number: renewalData.seat_number,
        start_date: renewalData.start_date,
        end_date: renewalData.end_date,
        total_price: renewalData.total_price,
        payment_status: renewalData.payment_status,
        payment_method: renewalData.payment_method,
        booking_duration: renewalData.booking_duration,
        duration_count: renewalData.duration_count,
        locker_included: false,
        locker_price: 0,
        razorpay_order_id: renewalData.razorpay_order_id || '',
        razorpay_payment_id: renewalData.razorpay_payment_id || '',
        razorpay_signature: renewalData.razorpay_signature || '',
        discount_amount: renewalData.discount_amount || 0,
        discount_reason: renewalData.discount_reason || '',
        user_id: user.id,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },
};
