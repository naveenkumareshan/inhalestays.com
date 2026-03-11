
import { supabase } from '@/integrations/supabase/client';

interface BookingFilters {
  page?: number;
  limit?: number;
  status?: string;
  paymentStatus?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
  cabinId?: string;
  userId?: string;
  sortBy?: string;
  order?: 'asc' | 'desc';
}

export const adminBookingsService = {
  getAllBookings: async (filters?: BookingFilters, partnerUserId?: string) => {
    try {
      const page = filters?.page || 1;
      const limit = filters?.limit || 10;
      const offset = (page - 1) * limit;

      let query = supabase
        .from('bookings')
        .select('*, profiles!bookings_user_id_fkey(name, email, phone, profile_picture, serial_number), cabins:cabin_id(name, serial_number), seats:seat_id(number, category, floor), cabin_slots:slot_id(name), dues!dues_booking_id_fkey(advance_paid, paid_amount, due_amount)', { count: 'exact' });

      // Apply partner scoping
      if (partnerUserId) {
        const { data: pCabins } = await supabase.from('cabins').select('id').eq('created_by', partnerUserId);
        const cabinIds = (pCabins || []).map(c => c.id);
        if (cabinIds.length === 0) {
          return { success: true, data: [], count: 0, totalDocs: 0, totalPages: 0 };
        }
        query = query.in('cabin_id', cabinIds);
      }

      // Apply filters
      if (filters?.status && filters.status !== 'all') {
        query = query.eq('payment_status', filters.status);
      }
      if (filters?.search) {
        const { data: matchedProfiles } = await supabase
          .from('profiles')
          .select('id')
          .or(`name.ilike.%${filters.search}%,email.ilike.%${filters.search}%,phone.ilike.%${filters.search}%`);
        const matchedIds = (matchedProfiles || []).map(p => p.id);
        if (matchedIds.length > 0) {
          query = query.or(`serial_number.ilike.%${filters.search}%,user_id.in.(${matchedIds.join(',')})`);
        } else {
          query = query.or(`serial_number.ilike.%${filters.search}%`);
        }
      }
      if (filters?.startDate) {
        query = query.gte('start_date', filters.startDate);
      }
      if (filters?.endDate) {
        query = query.lte('end_date', filters.endDate);
      }
      if (filters?.cabinId) {
        query = query.eq('cabin_id', filters.cabinId);
      }
      if (filters?.userId) {
        query = query.eq('user_id', filters.userId);
      }

      const sortCol = filters?.sortBy === 'startDate' ? 'start_date' 
        : filters?.sortBy === 'endDate' ? 'end_date'
        : filters?.sortBy === 'totalPrice' ? 'total_price'
        : 'created_at';
      query = query.order(sortCol, { ascending: filters?.order === 'asc' });
      query = query.range(offset, offset + limit - 1);

      const { data, error, count } = await query;
      if (error) throw error;

      const bookingIds = (data || []).map(b => b.id);
      let receiptsMap: Record<string, number> = {};
      if (bookingIds.length > 0) {
        const { data: receiptsData } = await supabase
          .from('receipts')
          .select('booking_id, amount')
          .in('booking_id', bookingIds);
        if (receiptsData) {
          for (const r of receiptsData) {
            if (r.booking_id) {
              receiptsMap[r.booking_id] = (receiptsMap[r.booking_id] || 0) + (Number(r.amount) || 0);
            }
          }
        }
      }

      const mapped = (data || []).map(b => {
        const profile = b.profiles as any;
        const cabin = b.cabins as any;
        const seat = b.seats as any;
        const slot = (b as any).cabin_slots as any;
        const duesArr = (b as any).dues as any[] | null;
        const due = Array.isArray(duesArr) ? duesArr[0] : duesArr;
        const receiptTotal = receiptsMap[b.id] || 0;
        const totalPrice = Number(b.total_price) || 0;

        let totalPaid = 0;
        let duePending = 0;
        if (due) {
          totalPaid = (Number(due.advance_paid) || 0) + (Number(due.paid_amount) || 0);
          duePending = (Number(due.due_amount) || 0) - (Number(due.paid_amount) || 0);
        } else if (receiptTotal > 0) {
          totalPaid = receiptTotal;
          duePending = totalPrice - receiptTotal;
        } else if (b.payment_status === 'completed') {
          totalPaid = totalPrice;
          duePending = 0;
        } else {
          totalPaid = 0;
          duePending = totalPrice;
        }

        return {
          _id: b.id,
          bookingId: b.serial_number || b.id.substring(0, 8),
          userId: {
            name: profile?.name || 'N/A',
            email: profile?.email || 'N/A',
            phone: profile?.phone || '',
            userId: profile?.serial_number || '',
            profilePicture: profile?.profile_picture || '',
          },
          cabinId: cabin ? { name: cabin.name, cabinCode: cabin.serial_number || '' } : undefined,
          seatId: seat ? { number: seat.number, floor: seat.floor } : undefined,
          startDate: b.start_date,
          endDate: b.end_date,
          totalPrice,
          seatPrice: totalPrice + (Number(b.discount_amount) || 0) - (Number(b.locker_price) || 0),
          discountAmount: Number(b.discount_amount) || 0,
          lockerPrice: Number(b.locker_price) || 0,
          paymentStatus: b.payment_status || 'pending',
          status: b.payment_status || 'pending',
          paymentMethod: b.payment_method || '',
          transactionId: b.transaction_id || '',
          durationCount: b.duration_count ? parseInt(b.duration_count) : undefined,
          createdAt: b.created_at,
          payoutStatus: 'pending',
          originalPrice: undefined,
          appliedCoupon: undefined,
          seatCategory: seat?.category || '',
          slotName: slot?.name || (b.slot_id ? '' : 'Full Day'),
          bookingDuration: b.booking_duration || '',
          totalPaid,
          duePending: Math.max(duePending, 0),
        };
      });

      const totalDocs = count || 0;
      const totalPages = Math.ceil(totalDocs / limit);

      return {
        success: true,
        data: mapped,
        count: totalDocs,
        totalDocs,
        totalPages,
      };
    } catch (error) {
      console.error("Error fetching bookings:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed',
        message: error instanceof Error ? error.message : 'Failed',
      };
    }
  },

  getAllTransactions: async (filters?: BookingFilters) => {
    return adminBookingsService.getAllBookings(filters);
  },

  getBookingById: async (id: string) => {
    try {
      const selectQuery = '*, profiles!bookings_user_id_fkey(name, email, phone, profile_picture, serial_number), cabins:cabin_id(name, serial_number), seats:seat_id(number, price, floor)';

      let { data } = await supabase
        .from('bookings')
        .select(selectQuery)
        .eq('serial_number', id)
        .maybeSingle();

      if (!data) {
        const res = await supabase
          .from('bookings')
          .select(selectQuery)
          .eq('id', id)
          .single();
        if (res.error) throw res.error;
        data = res.data;
      }

      if (!data) throw new Error('Booking not found');

      const profile = data.profiles as any;
      const cabin = data.cabins as any;
      const seat = data.seats as any;

      return {
        success: true,
        data: {
          _id: data.id,
          bookingId: data.serial_number || data.id,
          userId: {
            name: profile?.name || 'N/A',
            email: profile?.email || 'N/A',
            userId: profile?.serial_number || '',
            profilePicture: profile?.profile_picture || '',
          },
          cabinId: cabin ? { name: cabin.name, cabinCode: cabin.serial_number || '' } : undefined,
          seatId: seat ? { number: seat.number } : undefined,
          seatPrice: seat ? Number(seat.price) || 0 : 0,
          startDate: data.start_date,
          endDate: data.end_date,
          totalPrice: Number(data.total_price) || 0,
          paymentStatus: data.payment_status || 'pending',
          status: data.payment_status || 'pending',
          createdAt: data.created_at,
          razorpayPaymentId: data.razorpay_payment_id,
          razorpayOrderId: data.razorpay_order_id,
          paymentMethod: data.payment_method || '',
          transactionId: data.transaction_id || '',
          collectedByName: data.collected_by_name || '',
          lockerIncluded: data.locker_included,
          lockerPrice: Number(data.locker_price) || 0,
          discountAmount: Number(data.discount_amount) || 0,
          discountReason: data.discount_reason || '',
          bookingDuration: data.booking_duration,
          durationCount: data.duration_count,
        },
      };
    } catch (error) {
      console.error(`Error fetching booking ${id}:`, error);
      return { success: false, error: error instanceof Error ? error.message : 'Failed' };
    }
  },

  updateBookingStatus: async (id: string, status: 'pending' | 'completed' | 'failed') => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .update({ payment_status: status })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed' };
    }
  },

  updateBooking: async (id: string, bookingData: any) => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .update(bookingData)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed' };
    }
  },

  updateTransferBooking: async (id: string, bookingData: any) => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .update(bookingData)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed' };
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
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed' };
    }
  },

  getDashboardStats: async (partnerUserId?: string) => {
    try {
      let data, error;
      if (partnerUserId) {
        ({ data, error } = await supabase.rpc('get_partner_dashboard_stats', { p_user_id: partnerUserId }));
      } else {
        ({ data, error } = await supabase.rpc('get_dashboard_stats'));
      }
      if (error) throw error;
      return { success: true, data: data as Record<string, number> };
    } catch (error) {
      return { success: false, data: null };
    }
  },

  getBookingStats: async (period: 'day' | 'week' | 'month' | 'year' = 'month') => {
    try {
      const result = await adminBookingsService.getDashboardStats();
      if (!result.success || !result.data) throw new Error('Failed');
      const d = result.data;
      return { success: true, data: { total: d.total_bookings, completed: d.completed_bookings, pending: d.pending_bookings, cancelled: d.cancelled_bookings } };
    } catch (error) {
      return { success: false, data: { total: 0, completed: 0, pending: 0, cancelled: 0 } };
    }
  },

  getRevenueByTransaction: async () => {
    try {
      const result = await adminBookingsService.getDashboardStats();
      if (!result.success || !result.data) throw new Error('Failed');
      const d = result.data;
      return { success: true, data: { totalRevenue: d.total_revenue, todayRevenue: d.today_revenue, currentYear: d.current_year, count: d.completed_bookings } };
    } catch (error) {
      return { success: false, data: { totalRevenue: 0, todayRevenue: 0, currentYear: 0, count: 0 } };
    }
  },

  getRevenueReport: async (filters?: BookingFilters, partnerUserId?: string) => {
    try {
      let partnerCabinIds: string[] | null = null;
      if (partnerUserId) {
        const { data: pCabins } = await supabase.from('cabins').select('id').eq('created_by', partnerUserId);
        partnerCabinIds = (pCabins || []).map(c => c.id);
        if (partnerCabinIds.length === 0) return { success: true, data: { totalRevenue: 0, bookingCount: 0, count: 0, todayRevenue: 0, currentYear: new Date().getFullYear() } };
      }

      let query = supabase
        .from('bookings')
        .select('total_price, created_at')
        .eq('payment_status', 'completed');

      if (partnerCabinIds) {
        query = query.in('cabin_id', partnerCabinIds);
      }
      if (filters?.startDate) {
        query = query.gte('created_at', filters.startDate);
      }
      if (filters?.endDate) {
        query = query.lte('created_at', filters.endDate + 'T23:59:59');
      }

      const { data, error } = await query;
      if (error) throw error;

      const totalRevenue = (data || []).reduce((sum, b) => sum + (Number(b.total_price) || 0), 0);
      const bookingCount = (data || []).length;

      return {
        success: true,
        data: {
          totalRevenue,
          bookingCount,
          count: bookingCount,
          todayRevenue: 0,
          currentYear: new Date().getFullYear(),
        }
      };
    } catch (error) {
      return { success: false, data: { totalRevenue: 0, todayRevenue: 0, currentYear: 0, count: 0 } };
    }
  },

  getFiltersData: async () => {
    try {
      const { data: cabins } = await supabase.from('cabins').select('id, name').eq('is_active', true);
      return { success: true, data: { cabins: cabins || [] } };
    } catch (error) {
      return { success: false, data: { cabins: [] } };
    }
  },

  getOccupancyReports: async (params: {
    startDate?: string;
    endDate?: string;
    timeframe?: 'daily' | 'weekly' | 'monthly' | 'yearly';
    cabinId?: string;
    partnerUserId?: string;
  }) => {
    try {
      // Get all active cabins with their seats
      let cabinQuery = supabase
        .from('cabins')
        .select('id, name, category')
        .eq('is_active', true);
      if (params.partnerUserId) {
        cabinQuery = cabinQuery.eq('created_by', params.partnerUserId);
      }
      const { data: cabins, error: cabinsError } = await cabinQuery;
      if (cabinsError) throw cabinsError;

      if (!cabins || cabins.length === 0) {
        return { success: true, data: { cabins: [], overall: { totalSeats: 0, occupiedSeats: 0, availableSeats: 0, occupancyRate: 0 } } };
      }

      const cabinIds = cabins.map(c => c.id);

      // Get seat counts per cabin
      const { data: seats, error: seatsError } = await supabase
        .from('seats')
        .select('id, cabin_id, is_available')
        .in('cabin_id', cabinIds);
      if (seatsError) throw seatsError;

      const today = new Date().toISOString().split('T')[0];

      // Get active bookings (completed, overlapping today)
      const { data: activeBookings, error: bookingsError } = await supabase
        .from('bookings')
        .select('seat_id, cabin_id, payment_status')
        .in('cabin_id', cabinIds)
        .in('payment_status', ['completed'])
        .lte('start_date', today)
        .gte('end_date', today);
      if (bookingsError) throw bookingsError;

      // Get pending bookings
      const { data: pendingBookings } = await supabase
        .from('bookings')
        .select('cabin_id')
        .in('cabin_id', cabinIds)
        .eq('payment_status', 'pending')
        .lte('start_date', today)
        .gte('end_date', today);

      // Build per-cabin stats
      const seatsByCabin: Record<string, number> = {};
      (seats || []).forEach(s => {
        seatsByCabin[s.cabin_id] = (seatsByCabin[s.cabin_id] || 0) + 1;
      });

      const occupiedByCabin: Record<string, Set<string>> = {};
      (activeBookings || []).forEach(b => {
        if (b.cabin_id && b.seat_id) {
          if (!occupiedByCabin[b.cabin_id]) occupiedByCabin[b.cabin_id] = new Set();
          occupiedByCabin[b.cabin_id].add(b.seat_id);
        }
      });

      const pendingByCabin: Record<string, number> = {};
      (pendingBookings || []).forEach(b => {
        if (b.cabin_id) {
          pendingByCabin[b.cabin_id] = (pendingByCabin[b.cabin_id] || 0) + 1;
        }
      });

      const cabinData = cabins.map(c => {
        const totalSeats = seatsByCabin[c.id] || 0;
        const occupiedSeats = occupiedByCabin[c.id]?.size || 0;
        const availableSeats = totalSeats - occupiedSeats;
        const occupancyRate = totalSeats > 0 ? (occupiedSeats / totalSeats) * 100 : 0;
        return {
          cabinId: c.id,
          cabinName: c.name,
          totalSeats,
          occupiedSeats,
          availableSeats,
          occupancyRate: Math.round(occupancyRate * 10) / 10,
          pendingBookings: pendingByCabin[c.id] || 0,
          category: c.category || '',
        };
      });

      const totalSeats = cabinData.reduce((s, c) => s + c.totalSeats, 0);
      const occupiedSeats = cabinData.reduce((s, c) => s + c.occupiedSeats, 0);

      return {
        success: true,
        data: {
          cabins: cabinData,
          overall: {
            totalSeats,
            occupiedSeats,
            availableSeats: totalSeats - occupiedSeats,
            occupancyRate: totalSeats > 0 ? Math.round((occupiedSeats / totalSeats) * 1000) / 10 : 0,
          }
        }
      };
    } catch (error) {
      console.error('Error fetching occupancy reports:', error);
      return { success: false, data: [] };
    }
  },

  getExpiringBookings: async (daysThreshold: number = 7, partnerUserId?: string) => {
    try {
      const today = new Date();
      const futureDate = new Date();
      futureDate.setDate(today.getDate() + daysThreshold);

      let partnerCabinIds: string[] | null = null;
      if (partnerUserId) {
        const { data: pCabins } = await supabase.from('cabins').select('id').eq('created_by', partnerUserId);
        partnerCabinIds = (pCabins || []).map(c => c.id);
        if (partnerCabinIds.length === 0) return { success: true, data: [] };
      }

      let query = supabase
        .from('bookings')
        .select('*, profiles!bookings_user_id_fkey(name, email, phone), cabins:cabin_id(name), seats:seat_id(number, floor)')
        .eq('payment_status', 'completed')
        .gte('end_date', today.toISOString().split('T')[0])
        .lte('end_date', futureDate.toISOString().split('T')[0])
        .order('end_date');

      if (partnerCabinIds) {
        query = query.in('cabin_id', partnerCabinIds);
      }

      const { data, error } = await query;

      if (error) throw error;
      return { success: true, data: data || [] };
    } catch (error) {
      return { success: false, data: [] };
    }
  },

  getExpiringHostelBookings: async (daysThreshold: number = 7, partnerUserId?: string) => {
    try {
      const today = new Date();
      const futureDate = new Date();
      futureDate.setDate(today.getDate() + daysThreshold);

      let partnerHostelIds: string[] | null = null;
      if (partnerUserId) {
        const { data: pHostels } = await supabase.from('hostels').select('id').eq('created_by', partnerUserId);
        partnerHostelIds = (pHostels || []).map(h => h.id);
        if (partnerHostelIds.length === 0) return { success: true, data: [] };
      }

      let query = supabase
        .from('hostel_bookings')
        .select('*, profiles!hostel_bookings_user_id_fkey(name, email, phone), hostels:hostel_id(name), hostel_beds:bed_id(bed_number), hostel_rooms:room_id(room_number, floor_id)')
        .eq('status', 'confirmed')
        .gte('end_date', today.toISOString().split('T')[0])
        .lte('end_date', futureDate.toISOString().split('T')[0])
        .order('end_date');

      if (partnerHostelIds) {
        query = query.in('hostel_id', partnerHostelIds);
      }

      const { data, error } = await query;
      if (error) throw error;
      return { success: true, data: data || [] };
    } catch (error) {
      return { success: false, data: [] };
    }
  },

  getTopFillingRooms: async (limit: number = 10, partnerUserId?: string) => {
    try {
      let cabinQuery = supabase
        .from('cabins')
        .select('id, name, category')
        .eq('is_active', true);
      if (partnerUserId) cabinQuery = cabinQuery.eq('created_by', partnerUserId);
      const { data: cabins } = await cabinQuery;
      if (!cabins || cabins.length === 0) return { success: true, data: [] };

      const cabinIds = cabins.map(c => c.id);
      const { data: seats } = await supabase
        .from('seats')
        .select('id, cabin_id')
        .in('cabin_id', cabinIds);

      const today = new Date().toISOString().split('T')[0];
      const { data: activeBookings } = await supabase
        .from('bookings')
        .select('seat_id, cabin_id')
        .in('cabin_id', cabinIds)
        .eq('payment_status', 'completed')
        .lte('start_date', today)
        .gte('end_date', today);

      const seatsByCabin: Record<string, number> = {};
      (seats || []).forEach(s => { seatsByCabin[s.cabin_id] = (seatsByCabin[s.cabin_id] || 0) + 1; });

      const occupiedByCabin: Record<string, Set<string>> = {};
      (activeBookings || []).forEach(b => {
        if (b.cabin_id && b.seat_id) {
          if (!occupiedByCabin[b.cabin_id]) occupiedByCabin[b.cabin_id] = new Set();
          occupiedByCabin[b.cabin_id].add(b.seat_id);
        }
      });

      const result = cabins.map(c => {
        const total = seatsByCabin[c.id] || 0;
        const occupied = occupiedByCabin[c.id]?.size || 0;
        return {
          id: c.id,
          name: c.name,
          cabinName: c.name,
          category: c.category || '',
          totalSeats: total,
          occupiedSeats: occupied,
          bookedSeats: occupied,
          occupancyRate: total > 0 ? Math.round((occupied / total) * 1000) / 10 : 0,
        };
      }).sort((a, b) => b.occupancyRate - a.occupancyRate).slice(0, limit);

      return { success: true, data: result };
    } catch (error) {
      return { success: true, data: [] };
    }
  },

  getMonthlyRevenue: async (year: number = new Date().getFullYear(), partnerUserId?: string) => {
    try {
      const startOfYear = `${year}-01-01`;
      const endOfYear = `${year}-12-31T23:59:59`;

      let partnerCabinIds: string[] | null = null;
      if (partnerUserId) {
        const { data: pCabins } = await supabase.from('cabins').select('id').eq('created_by', partnerUserId);
        partnerCabinIds = (pCabins || []).map(c => c.id);
        if (partnerCabinIds.length === 0) return { success: true, data: [] };
      }

      let query = supabase
        .from('bookings')
        .select('total_price, created_at, cabin_id')
        .eq('payment_status', 'completed')
        .gte('created_at', startOfYear)
        .lte('created_at', endOfYear);
      if (partnerCabinIds) query = query.in('cabin_id', partnerCabinIds);
      const { data, error } = await query;

      if (error) throw error;

      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      const monthlyData: Record<number, number> = {};
      for (let i = 0; i < 12; i++) monthlyData[i] = 0;

      (data || []).forEach(b => {
        const month = new Date(b.created_at!).getMonth();
        monthlyData[month] += Number(b.total_price) || 0;
      });

      const result = Object.entries(monthlyData).map(([m, revenue]) => ({
        month: parseInt(m) + 1,
        monthName: monthNames[parseInt(m)],
        revenue: Math.round(revenue),
      }));

      return { success: true, data: result };
    } catch (error) {
      console.error('Error fetching monthly revenue:', error);
      return { success: true, data: [] };
    }
  },

  getMonthlyOccupancy: async (year: number = new Date().getFullYear(), partnerUserId?: string) => {
    try {
      // Get total seat capacity
      let cabinQuery = supabase.from('cabins').select('id').eq('is_active', true);
      if (partnerUserId) cabinQuery = cabinQuery.eq('created_by', partnerUserId);
      const cabinIds = (await cabinQuery).data?.map(c => c.id) || [];
      if (cabinIds.length === 0) return { success: true, data: [] };

      const { data: seats } = await supabase
        .from('seats')
        .select('id, cabin_id')
        .in('cabin_id', cabinIds);

      const totalSeats = (seats || []).length;
      if (totalSeats === 0) return { success: true, data: [] };

      // Get all completed bookings for the year
      const { data: bookings, error } = await supabase
        .from('bookings')
        .select('start_date, end_date, seat_id')
        .eq('payment_status', 'completed')
        .gte('end_date', `${year}-01-01`)
        .lte('start_date', `${year}-12-31`);

      if (error) throw error;

      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      
      const result = monthNames.map((name, idx) => {
        // For each month, check mid-month occupancy as a sample
        const midMonth = new Date(year, idx, 15);
        const midStr = midMonth.toISOString().split('T')[0];
        
        const occupiedSeats = new Set<string>();
        (bookings || []).forEach(b => {
          if (b.start_date && b.end_date && b.seat_id) {
            if (b.start_date <= midStr && b.end_date >= midStr) {
              occupiedSeats.add(b.seat_id);
            }
          }
        });

        const rate = totalSeats > 0 ? Math.round((occupiedSeats.size / totalSeats) * 1000) / 10 : 0;
        return {
          month: idx + 1,
          monthName: name,
          occupancyRate: rate,
          occupiedSeats: occupiedSeats.size,
          totalSeats,
        };
      });

      return { success: true, data: result };
    } catch (error) {
      console.error('Error fetching monthly occupancy:', error);
      return { success: true, data: [] };
    }
  },

  getActiveResidents: async (partnerUserId?: string) => {
    try {
      const result = await adminBookingsService.getDashboardStats(partnerUserId);
      if (!result.success || !result.data) throw new Error('Failed');
      const d = result.data;
      const activeResidents = d.active_residents || 0;
      const totalCapacity = d.total_capacity || 0;
      const occupancyPercentage = totalCapacity > 0 ? Math.round((activeResidents / totalCapacity) * 100) : 0;
      return { success: true, data: { activeResidents, totalCapacity, occupancyPercentage } };
    } catch (error) {
      return { success: false, data: { activeResidents: 0, totalCapacity: 0, occupancyPercentage: 0 } };
    }
  }
};
