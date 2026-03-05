
import { supabase } from '@/integrations/supabase/client';
import { getEffectiveOwnerId } from '@/utils/getEffectiveOwnerId';

export const hostelManagerService = {
  // Get cabins managed by the logged-in user (or their employer for employees)
  getManagedCabins: async (filters = {}) => {
    try {
      const { ownerId } = await getEffectiveOwnerId();

      const { data, error } = await supabase
        .from('cabins')
        .select('*')
        .eq('created_by', ownerId)
        .order('name');

      if (error) throw error;
      return { success: true, data: data || [] };
    } catch (error: any) {
      console.error('Error fetching managed cabins:', error);
      return { success: false, error: error.message || 'Failed to fetch cabins' };
    }
  },

  // Get revenue statistics for cabins managed by the logged-in user
  getCabinRevenueStats: async (period = 'month') => {
    try {
      const { ownerId } = await getEffectiveOwnerId();

      // Get owned cabin IDs
      const { data: cabins } = await supabase
        .from('cabins')
        .select('id')
        .eq('created_by', ownerId);

      const cabinIds = (cabins || []).map(c => c.id);
      if (cabinIds.length === 0) return { success: true, data: { totalRevenue: 0, bookingCount: 0 } };

      // Get completed bookings for these cabins
      let startDate = new Date();
      if (period === 'month') startDate.setMonth(startDate.getMonth() - 1);
      else if (period === 'week') startDate.setDate(startDate.getDate() - 7);
      else if (period === 'year') startDate.setFullYear(startDate.getFullYear() - 1);

      const { data: bookings } = await supabase
        .from('bookings')
        .select('total_price')
        .in('cabin_id', cabinIds)
        .eq('payment_status', 'completed')
        .gte('created_at', startDate.toISOString());

      const totalRevenue = (bookings || []).reduce((sum, b) => sum + Number(b.total_price || 0), 0);
      return { success: true, data: { totalRevenue, bookingCount: (bookings || []).length } };
    } catch (error: any) {
      console.error('Error fetching cabin revenue stats:', error);
      return { success: false, error: error.message || 'Failed' };
    }
  },

  // Get booking statistics for cabins managed by the logged-in user
  getCabinBookingStats: async (period = 'month') => {
    try {
      const { ownerId } = await getEffectiveOwnerId();

      const { data: cabins } = await supabase
        .from('cabins')
        .select('id')
        .eq('created_by', ownerId);

      const cabinIds = (cabins || []).map(c => c.id);
      if (cabinIds.length === 0) return { success: true, data: { active: 0, completed: 0, total: 0 } };

      const { data: bookings } = await supabase
        .from('bookings')
        .select('payment_status')
        .in('cabin_id', cabinIds)
        .in('payment_status', ['completed', 'advance_paid', 'pending']);

      const active = (bookings || []).filter(b => b.payment_status === 'completed' || b.payment_status === 'advance_paid').length;
      return { success: true, data: { active, total: (bookings || []).length } };
    } catch (error: any) {
      console.error('Error fetching cabin booking stats:', error);
      return { success: false, error: error.message || 'Failed' };
    }
  },

  // Get seat statistics for cabins managed by the logged-in user
  getCabinSeatsStats: async () => {
    try {
      const { ownerId } = await getEffectiveOwnerId();

      const { data: cabins } = await supabase
        .from('cabins')
        .select('id')
        .eq('created_by', ownerId);

      const cabinIds = (cabins || []).map(c => c.id);
      if (cabinIds.length === 0) return { success: true, data: { total: 0, available: 0, occupied: 0 } };

      const { data: seats } = await supabase
        .from('seats')
        .select('is_available')
        .in('cabin_id', cabinIds);

      const total = (seats || []).length;
      const available = (seats || []).filter(s => s.is_available).length;
      return { success: true, data: { total, available, occupied: total - available } };
    } catch (error: any) {
      console.error('Error fetching cabin seats stats:', error);
      return { success: false, error: error.message || 'Failed' };
    }
  }
};
