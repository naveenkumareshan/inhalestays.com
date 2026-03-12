
import { supabase } from '@/integrations/supabase/client';
import { format, getDaysInMonth } from 'date-fns';

export interface CreateHostelBookingData {
  hostel_id: string;
  room_id: string;
  bed_id: string;
  sharing_option_id: string;
  start_date: string;
  end_date: string;
  booking_duration: 'daily' | 'weekly' | 'monthly';
  duration_count: number;
  total_price: number;
  advance_amount?: number;
  remaining_amount?: number;
  security_deposit?: number;
  payment_method?: string;
  razorpay_order_id?: string;
  razorpay_payment_id?: string;
  razorpay_signature?: string;
  transaction_id?: string;
  food_opted?: boolean;
  food_amount?: number;
  food_policy_type?: string;
  food_price_snapshot?: number;
  total_amount_snapshot?: number;
}

export const hostelBookingService = {
  createBooking: async (bookingData: CreateHostelBookingData) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Check bed availability
    const { data: bed } = await supabase
      .from('hostel_beds')
      .select('is_available, is_blocked')
      .eq('id', bookingData.bed_id)
      .single();

    if (!bed?.is_available || bed?.is_blocked) {
      throw new Error('The selected bed is not available');
    }


    const paymentStatus = bookingData.advance_amount && bookingData.advance_amount > 0 && bookingData.advance_amount < bookingData.total_price
      ? 'advance_paid'
      : bookingData.razorpay_payment_id ? 'completed' : 'pending';

    const { data: booking, error } = await supabase
      .from('hostel_bookings')
      .insert({
        ...bookingData,
        user_id: user.id,
        payment_status: paymentStatus,
        status: paymentStatus === 'pending' ? 'pending' : 'confirmed',
      })
      .select()
      .single();
    if (error) throw error;

    // Bed availability is now handled by database trigger (trg_sync_hostel_bed_availability)

    // Create receipt if payment was made
    if (paymentStatus !== 'pending') {
      const receiptAmount = bookingData.advance_amount || bookingData.total_price;
      await supabase.from('hostel_receipts').insert({
        booking_id: booking.id,
        user_id: user.id,
        hostel_id: bookingData.hostel_id,
        amount: receiptAmount,
        payment_method: bookingData.payment_method || 'online',
        transaction_id: bookingData.transaction_id || bookingData.razorpay_payment_id || '',
        receipt_type: 'booking_payment',
        collected_by_name: 'InhaleStays.com',
      });
    }

    // Create hostel_dues entry when advance_paid
    if (paymentStatus === 'advance_paid') {
      const dueDate = new Date(bookingData.end_date);
      dueDate.setDate(dueDate.getDate() - 3); // Due 3 days before end
      const dueAmount = bookingData.total_price - (bookingData.advance_amount || 0);
      await supabase.from('hostel_dues').insert({
        user_id: user.id,
        hostel_id: bookingData.hostel_id,
        room_id: bookingData.room_id,
        bed_id: bookingData.bed_id,
        booking_id: booking.id,
        total_fee: bookingData.total_price,
        advance_paid: bookingData.advance_amount || 0,
        due_amount: dueAmount,
        due_date: format(dueDate, 'yyyy-MM-dd'),
        status: 'pending',
      } as any);
    }

    // Monthly cycle billing: create pro-rated first month due
    const { data: hostelInfo } = await supabase
      .from('hostels')
      .select('billing_type, payment_window_days')
      .eq('id', bookingData.hostel_id)
      .single();

    if (hostelInfo?.billing_type === 'monthly_cycle') {
      // Get monthly rent from sharing option
      const { data: sharingOption } = await supabase
        .from('hostel_sharing_options')
        .select('price_monthly')
        .eq('id', bookingData.sharing_option_id)
        .single();

      const monthlyRent = Number(sharingOption?.price_monthly || 0);
      const foodAmount = bookingData.food_opted ? Number(bookingData.food_amount || 0) : 0;
      const totalMonthly = monthlyRent + foodAmount;

      const startDate = new Date(bookingData.start_date);
      const daysInMonth = getDaysInMonth(startDate);
      const dayOfMonth = startDate.getDate();
      const daysRemaining = daysInMonth - dayOfMonth + 1;
      const proratedAmount = Math.round((totalMonthly * daysRemaining) / daysInMonth);

      const firstOfMonth = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
      const billingMonthStr = format(firstOfMonth, 'yyyy-MM-dd');

      await supabase.from('hostel_dues').insert({
        user_id: user.id,
        hostel_id: bookingData.hostel_id,
        room_id: bookingData.room_id,
        bed_id: bookingData.bed_id,
        booking_id: booking.id,
        total_fee: proratedAmount,
        advance_paid: 0,
        due_amount: proratedAmount,
        due_date: bookingData.start_date,
        status: 'pending',
        billing_month: billingMonthStr,
        is_prorated: true,
        auto_generated: false,
        food_amount: bookingData.food_opted ? Math.round((foodAmount * daysRemaining) / daysInMonth) : 0,
      } as any);
    }

    return booking;
  },

  getUserBookings: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from('hostel_bookings')
      .select('*, hostels(name, location, logo_image), hostel_rooms(room_number), hostel_beds(bed_number), hostel_sharing_options(type)')
      .eq('user_id', user?.id ?? '')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  getBookingById: async (bookingId: string) => {
    const { data, error } = await supabase
      .from('hostel_bookings')
      .select('*, hostels(name, location, contact_phone, logo_image), hostel_rooms(room_number, floor, category), hostel_beds(bed_number), hostel_sharing_options(type, capacity, price_monthly, price_daily), profiles:user_id(name, email, phone)')
      .eq('id', bookingId)
      .single();
    if (error) throw error;
    return data;
  },

  cancelBooking: async (bookingId: string, reason?: string) => {
    const { data: booking } = await supabase
      .from('hostel_bookings')
      .select('bed_id')
      .eq('id', bookingId)
      .single();

    // Bed availability is now handled by database trigger (trg_sync_hostel_bed_availability)

    const { data, error } = await supabase
      .from('hostel_bookings')
      .update({
        status: 'cancelled',
        cancellation_reason: reason || '',
        cancelled_at: new Date().toISOString(),
      })
      .eq('id', bookingId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // Get available beds for a room on specific dates
  getAvailableBeds: async (roomId: string, startDate: string, endDate: string) => {
    // Get all beds for this room
    const { data: beds, error: bedsError } = await supabase
      .from('hostel_beds')
      .select('*, hostel_sharing_options(type, capacity, price_monthly, price_daily)')
      .eq('room_id', roomId)
      .eq('is_blocked', false);
    if (bedsError) throw bedsError;

    // Get active bookings that overlap with the requested dates
    const { data: overlappingBookings, error: bookingsError } = await supabase
      .from('hostel_bookings')
      .select('bed_id, payment_status')
      .eq('room_id', roomId)
      .in('status', ['confirmed', 'pending'])
      .lte('start_date', endDate)
      .gte('end_date', startDate);
    if (bookingsError) throw bookingsError;

    // Get hostel_dues with proportional_end_date for advance_paid bookings
    const advancePaidBedIds = (overlappingBookings || [])
      .filter(b => b.payment_status === 'advance_paid')
      .map(b => b.bed_id);

    let duesMap = new Map<string, string>();
    if (advancePaidBedIds.length > 0) {
      const { data: duesData } = await supabase
        .from('hostel_dues')
        .select('bed_id, proportional_end_date')
        .in('bed_id', advancePaidBedIds)
        .eq('status', 'pending')
        .not('proportional_end_date', 'is', null);

      duesData?.forEach((d: any) => {
        if (d.bed_id && d.proportional_end_date) {
          duesMap.set(d.bed_id, d.proportional_end_date);
        }
      });
    }

    const bookedBedIds = new Set(
      (overlappingBookings || [])
        .filter(b => {
          // For advance_paid, check if proportional_end_date is before requested startDate
          if (b.payment_status === 'advance_paid') {
            const propEnd = duesMap.get(b.bed_id);
            if (propEnd && propEnd < startDate) {
              return false; // Bed is available after proportional_end_date
            }
          }
          return true;
        })
        .map(b => b.bed_id)
    );

    return beds?.map(bed => ({
      ...bed,
      is_available: !bookedBedIds.has(bed.id) && bed.is_available,
    })) || [];
  },

  // Get booking receipts
  getBookingReceipts: async (bookingId: string) => {
    const { data, error } = await supabase
      .from('hostel_receipts')
      .select('*')
      .eq('booking_id', bookingId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  // Admin: get all bookings with filters
  getAllBookings: async (params?: { hostel_id?: string; status?: string; payment_status?: string }) => {
    let query = supabase
      .from('hostel_bookings')
      .select('*, hostels(name), hostel_rooms(room_number), hostel_beds(bed_number), hostel_sharing_options(type), profiles:user_id(name, email, phone)')
      .order('created_at', { ascending: false });

    if (params?.hostel_id) query = query.eq('hostel_id', params.hostel_id);
    if (params?.status) query = query.eq('status', params.status);
    if (params?.payment_status) query = query.eq('payment_status', params.payment_status);

    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  // Get bookings by room (for occupancy view)
  getBookingsByRoom: async (roomId: string) => {
    const { data, error } = await supabase
      .from('hostel_bookings')
      .select('*, hostel_beds(bed_number), profiles:user_id(name, phone)')
      .eq('room_id', roomId)
      .in('status', ['confirmed', 'pending'])
      .order('start_date', { ascending: true });
    if (error) throw error;
    return data;
  },
};
