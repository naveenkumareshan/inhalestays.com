import { supabase } from '@/integrations/supabase/client';

interface UserFilters {
  status?: string;
  role?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  order?: 'asc' | 'desc';
  search?: string;
  includeInactive?: boolean;
}

interface BookingFilters {
  status?: string;
  endDate?: string;
  cabinId?: string;
  userId?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  order?: 'asc' | 'desc';
}

interface UserUpdateData {
  name?: string;
  email?: string;
  phone?: string;
  gender?: string;
  isActive?: boolean;
  address?: string;
  bio?: string;
  courseStudying?: string;
  collegeStudied?: string;
  parentMobileNumber?: string;
  alternatePhone?: string;
  city?: string;
  state?: string;
  pincode?: string;
  dateOfBirth?: string;
  coursePreparingFor?: string;
}

export const adminUsersService = {
  getUsers: async (filters?: UserFilters) => {
    try {
      const page = filters?.page || 1;
      const limit = filters?.limit || 10;
      const from = (page - 1) * limit;
      const role = filters?.role;

      // Check if current user is a partner (non-admin) — filter students by property bookings
      const { data: { user: authUser } } = await supabase.auth.getUser();
      let isPartner = false;
      if (authUser) {
        const { data: userRoles } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', authUser.id);
        const roles = (userRoles || []).map(r => r.role);
        isPartner = !roles.includes('admin') && !roles.includes('super_admin');
      }

      let roleUserIds: string[] | null = null;
      if (role) {
        const { data: roleRows, error: roleError } = await supabase
          .from('user_roles')
          .select('user_id')
          .eq('role', role as any);
        if (roleError) throw roleError;
        roleUserIds = (roleRows || []).map(r => r.user_id);
        if (roleUserIds.length === 0) {
          return { success: true, data: [], count: 0, totalCount: 0, pagination: { totalPages: 1, currentPage: page } };
        }
      }

      // For partners viewing students, restrict to students who have bookings at partner's properties
      if (isPartner && authUser && role === 'student') {
        const { getEffectiveOwnerId } = await import('@/utils/getEffectiveOwnerId');
        const { ownerId } = await getEffectiveOwnerId();
        const [cabinsRes, hostelsRes] = await Promise.all([
          supabase.from('cabins').select('id').eq('created_by', ownerId),
          supabase.from('hostels').select('id').eq('created_by', ownerId),
        ]);
        const cabinIds = (cabinsRes.data || []).map(c => c.id);
        const hostelIds = (hostelsRes.data || []).map(h => h.id);

        const studentIdSet = new Set<string>();

        if (cabinIds.length > 0) {
          const { data: rrBookings } = await supabase
            .from('bookings')
            .select('user_id')
            .in('cabin_id', cabinIds);
          (rrBookings || []).forEach(b => studentIdSet.add(b.user_id));
        }
        if (hostelIds.length > 0) {
          const { data: hostelBookings } = await supabase
            .from('hostel_bookings')
            .select('user_id')
            .in('hostel_id', hostelIds);
          (hostelBookings || []).forEach(b => studentIdSet.add(b.user_id));
        }

        const partnerStudentIds = Array.from(studentIdSet);
        if (partnerStudentIds.length === 0) {
          return { success: true, data: [], count: 0, totalCount: 0, pagination: { totalPages: 1, currentPage: page } };
        }
        // Intersect with roleUserIds
        if (roleUserIds) {
          roleUserIds = roleUserIds.filter(id => partnerStudentIds.includes(id));
        } else {
          roleUserIds = partnerStudentIds;
        }
        if (roleUserIds.length === 0) {
          return { success: true, data: [], count: 0, totalCount: 0, pagination: { totalPages: 1, currentPage: page } };
        }
      }

      // For partners viewing employees, restrict to their own employees
      if (isPartner && authUser && role === 'vendor_employee') {
        const { getEffectiveOwnerId } = await import('@/utils/getEffectiveOwnerId');
        const { ownerId: empOwnerId } = await getEffectiveOwnerId();
        const { data: empRows } = await supabase
          .from('vendor_employees')
          .select('user_id')
          .eq('partner_user_id', empOwnerId);
        const empIds = (empRows || []).map((e: any) => e.user_id).filter(Boolean);
        if (empIds.length === 0) {
          return { success: true, data: [], count: 0, totalCount: 0, pagination: { totalPages: 1, currentPage: page } };
        }
        if (roleUserIds) {
          roleUserIds = roleUserIds.filter(id => empIds.includes(id));
        } else {
          roleUserIds = empIds;
        }
        if (roleUserIds.length === 0) {
          return { success: true, data: [], count: 0, totalCount: 0, pagination: { totalPages: 1, currentPage: page } };
        }
      }

      let query = supabase.from('profiles').select('*', { count: 'exact' });
      if (roleUserIds) query = query.in('id', roleUserIds);
      if (filters?.search) {
        query = query.or(`name.ilike.%${filters.search}%,email.ilike.%${filters.search}%,phone.ilike.%${filters.search}%`);
      }
      query = query.range(from, from + limit - 1).order('created_at', { ascending: false });

      const { data: profiles, error, count } = await query;
      if (error) throw error;

      const userIds = (profiles || []).map(p => p.id);
      const { data: roles } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('user_id', userIds.length > 0 ? userIds : ['none']);

      const roleMap: Record<string, string> = {};
      (roles || []).forEach(r => { roleMap[r.user_id] = r.role; });

      const mappedProfiles = (profiles || []).map(p => ({
        _id: p.id,
        id: p.id,
        userId: p.id?.slice(0, 8),
        name: p.name || 'Unknown',
        email: p.email || '',
        phone: p.phone || '',
        gender: p.gender || '',
        role: roleMap[p.id] || 'student',
        bookingsCount: 0,
        activeBookings: 0,
        joinedAt: p.created_at || '',
        isActive: p.is_active !== false,
        collegeStudied: p.college_studied || '',
        courseStudying: p.course_studying || '',
        parentMobileNumber: p.parent_mobile_number || '',
        address: p.address || '',
        bio: p.bio || '',
        profilePicture: p.profile_picture || '',
        alternatePhone: p.alternate_phone || '',
        city: p.city || '',
        state: p.state || '',
        pincode: p.pincode || '',
        dateOfBirth: p.date_of_birth || '',
        coursePreparingFor: p.course_preparing_for || '',
        serialNumber: p.serial_number || '',
      }));

      return {
        success: true,
        data: mappedProfiles,
        count: count || 0,
        totalCount: count || 0,
        pagination: { totalPages: Math.ceil((count || 0) / limit), currentPage: page },
      };
    } catch (e) {
      console.error('Error fetching users:', e);
      return { success: false, data: [], count: 0, totalCount: 0, pagination: { totalPages: 1, currentPage: 1 } };
    }
  },

  getUserById: async (userId: string) => {
    try {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
      if (error) throw error;
      return { success: true, data };
    } catch (e) {
      return { success: false, data: null };
    }
  },

  updateUser: async (userId: string, userData: UserUpdateData) => {
    try {
      const updateData: any = {};
      if (userData.name !== undefined) updateData.name = userData.name;
      if (userData.email !== undefined) updateData.email = userData.email;
      if (userData.phone !== undefined) updateData.phone = userData.phone;
      if (userData.gender !== undefined) updateData.gender = userData.gender;
      if (userData.address !== undefined) updateData.address = userData.address;
      if (userData.bio !== undefined) updateData.bio = userData.bio;
      if (userData.courseStudying !== undefined) updateData.course_studying = userData.courseStudying;
      if (userData.collegeStudied !== undefined) updateData.college_studied = userData.collegeStudied;
      if (userData.parentMobileNumber !== undefined) updateData.parent_mobile_number = userData.parentMobileNumber;
      if (userData.alternatePhone !== undefined) updateData.alternate_phone = userData.alternatePhone;
      if (userData.city !== undefined) updateData.city = userData.city;
      if (userData.state !== undefined) updateData.state = userData.state;
      if (userData.pincode !== undefined) updateData.pincode = userData.pincode;
      if (userData.dateOfBirth !== undefined) updateData.date_of_birth = userData.dateOfBirth || null;
      if (userData.coursePreparingFor !== undefined) updateData.course_preparing_for = userData.coursePreparingFor;

      const { data, error } = await supabase.from('profiles').update(updateData).eq('id', userId).select().single();
      if (error) throw error;
      return { success: true, data };
    } catch (e) {
      return { success: false, data: null };
    }
  },

  // ── Partner Property Linking ──

  getPartnerProperties: async (userId: string) => {
    try {
      const [cabinsRes, hostelsRes] = await Promise.all([
        supabase.from('cabins').select('id, name, city, is_active').eq('created_by', userId),
        supabase.from('hostels').select('id, name, location, is_active').eq('created_by', userId),
      ]);
      return {
        success: true,
        cabins: cabinsRes.data || [],
        hostels: hostelsRes.data || [],
      };
    } catch (e) {
      return { success: false, cabins: [], hostels: [] };
    }
  },

  getAllCabins: async () => {
    try {
      const { data, error } = await supabase.from('cabins').select('id, name, city, created_by, is_active').order('name');
      if (error) throw error;
      return { success: true, data: data || [] };
    } catch (e) {
      return { success: false, data: [] };
    }
  },

  getAllHostels: async () => {
    try {
      const { data, error } = await supabase.from('hostels').select('id, name, location, created_by, is_active').order('name');
      if (error) throw error;
      return { success: true, data: data || [] };
    } catch (e) {
      return { success: false, data: [] };
    }
  },

  linkCabinToPartner: async (cabinId: string, partnerId: string) => {
    try {
      const { error } = await supabase.from('cabins').update({ created_by: partnerId }).eq('id', cabinId);
      if (error) throw error;
      return { success: true };
    } catch (e) {
      return { success: false };
    }
  },

  linkHostelToPartner: async (hostelId: string, partnerId: string) => {
    try {
      const { error } = await supabase.from('hostels').update({ created_by: partnerId }).eq('id', hostelId);
      if (error) throw error;
      return { success: true };
    } catch (e) {
      return { success: false };
    }
  },

  unlinkProperty: async (type: 'cabin' | 'hostel', propertyId: string) => {
    try {
      const table = type === 'cabin' ? 'cabins' : 'hostels';
      const { error } = await supabase.from(table).update({ created_by: null }).eq('id', propertyId);
      if (error) throw error;
      return { success: true };
    } catch (e) {
      return { success: false };
    }
  },

  // ── Bookings ──

  getBookingsByUserId: async (filters?: BookingFilters) => {
    try {
      let query = supabase.from('bookings').select('*');
      if (filters?.userId) query = query.eq('user_id', filters.userId);
      if (filters?.status) query = query.eq('payment_status', filters.status);
      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;
      if (error) throw error;

      const mapped = (data || []).map(b => ({
        _id: b.id,
        id: b.id,
        cabinId: { name: 'Reading Room' },
        seatId: { number: b.seat_number },
        startDate: b.start_date,
        endDate: b.end_date,
        totalPrice: b.total_price,
        paymentStatus: b.payment_status,
        months: b.duration_count,
      }));

      return { success: true, data: mapped };
    } catch (e) {
      return { success: false, data: [] };
    }
  },

  getBookingById: async (id: string) => {
    try {
      const { data, error } = await supabase.from('bookings').select('*').eq('id', id).single();
      if (error) throw error;
      return { success: true, data };
    } catch (e) {
      return { success: false, data: null };
    }
  },

  updateBooking: async (id: string, updateData: any) => {
    try {
      const { data, error } = await supabase.from('bookings').update(updateData).eq('id', id).select().single();
      if (error) throw error;
      return { success: true, data };
    } catch (e) {
      return { success: false, data: null };
    }
  },

  cancelBooking: async (id: string) => {
    try {
      const { error } = await supabase.from('bookings').update({ payment_status: 'cancelled' }).eq('id', id);
      if (error) throw error;
      return { success: true };
    } catch (e) {
      return { success: false };
    }
  },

  toggleUserActive: async (userId: string, isActive: boolean) => {
    try {
      const { data, error } = await supabase.functions.invoke('toggle-user-status', {
        body: { userId, isActive },
      });
      if (error) throw error;
      return { success: true };
    } catch (e) {
      console.error('Error toggling user status:', e);
      return { success: false };
    }
  },

  getBookingReports: async (filters?: BookingFilters) => {
    return { success: true, data: {} };
  },

  getBookingStatistics: async (timeRange?: string) => {
    return { success: true, data: {} };
  },

  getOccupancyRates: async (timeRange?: string) => {
    return { success: true, data: {} };
  },

  getRevenueReports: async (filters?: BookingFilters) => {
    return { success: true, data: {} };
  },
};
