
import { supabase } from '@/integrations/supabase/client';

export interface HostelData {
  id?: string;
  serial_number?: string;
  name: string;
  description?: string;
  location?: string;
  locality?: string;
  state_id?: string;
  city_id?: string;
  area_id?: string;
  gender: 'Male' | 'Female' | 'Co-ed';
  stay_type: 'Short-term' | 'Long-term' | 'Both';
  logo_image?: string;
  images?: string[];
  amenities?: string[];
  contact_email?: string;
  contact_phone?: string;
  coordinates_lat?: number;
  coordinates_lng?: number;
  is_active?: boolean;
  is_approved?: boolean;
  created_by?: string;
  vendor_id?: string;
  average_rating?: number;
  review_count?: number;
  commission_percentage?: number;
  security_deposit?: number;
  food_enabled?: boolean;
  food_policy_type?: 'not_available' | 'mandatory' | 'optional';
  food_price_monthly?: number;
  food_menu_image?: string;
  advance_booking_enabled?: boolean;
  advance_percentage?: number;
  advance_flat_amount?: number;
  advance_use_flat?: boolean;
  refund_policy?: string;
  cancellation_window_hours?: number;
  created_at?: string;
  updated_at?: string;
}

export interface HostelFilters {
  city_id?: string;
  state_id?: string;
  area_id?: string;
  gender?: string;
  is_approved?: boolean;
  search?: string;
}

const UUID_FIELDS = ['state_id', 'city_id', 'area_id', 'created_by', 'vendor_id'];

function sanitizeUUIDs(data: Record<string, any>) {
  const cleaned = { ...data };
  for (const field of UUID_FIELDS) {
    if (cleaned[field] === '' || cleaned[field] === undefined) {
      cleaned[field] = null;
    }
  }
  return cleaned;
}

export const hostelService = {
  getAllHostels: async (filters?: HostelFilters) => {
    let query = supabase
      .from('hostels')
      .select('*, states(name), cities(name), areas(name), hostel_rooms(hostel_sharing_options(price_monthly))')
      .order('created_at', { ascending: false });

    if (filters?.city_id) query = query.eq('city_id', filters.city_id);
    if (filters?.state_id) query = query.eq('state_id', filters.state_id);
    if (filters?.area_id) query = query.eq('area_id', filters.area_id);
    if (filters?.gender) query = query.eq('gender', filters.gender);
    if (filters?.is_approved !== undefined) query = query.eq('is_approved', filters.is_approved);
    if (filters?.search) query = query.ilike('name', `%${filters.search}%`);

    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  getHostelById: async (hostelId: string) => {
    const { data, error } = await supabase
      .from('hostels')
      .select('*, states(name), cities(name), areas(name)')
      .eq('id', hostelId)
      .single();
    if (error) throw error;
    return data;
  },

  createHostel: async (hostelData: Partial<HostelData>) => {
    const { data: { user } } = await supabase.auth.getUser();
    const { id, ...rest } = hostelData;
    const sanitized = sanitizeUUIDs({ ...rest, created_by: user?.id });
    const { data, error } = await supabase
      .from('hostels')
      .insert(sanitized as any)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  updateHostel: async (hostelId: string, hostelData: Partial<HostelData>) => {
    const sanitized = sanitizeUUIDs(hostelData);
    const { data, error } = await supabase
      .from('hostels')
      .update(sanitized as any)
      .eq('id', hostelId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  deleteHostel: async (hostelId: string) => {
    const { error } = await supabase
      .from('hostels')
      .delete()
      .eq('id', hostelId);
    if (error) throw error;
  },

  getUserHostels: async () => {
    const { getEffectiveOwnerId } = await import('@/utils/getEffectiveOwnerId');
    const { ownerId } = await getEffectiveOwnerId();
    const { data, error } = await supabase
      .from('hostels')
      .select('*, states(name), cities(name), areas(name)')
      .eq('created_by', ownerId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  getNearbyHostels: async (lat: number, lng: number, radius: number = 10) => {
    // Simple bounding box approximation (~0.009 degrees per km)
    const delta = radius * 0.009;
    const { data, error } = await supabase
      .from('hostels')
      .select('*, states(name), cities(name), areas(name)')
      .gte('coordinates_lat', lat - delta)
      .lte('coordinates_lat', lat + delta)
      .gte('coordinates_lng', lng - delta)
      .lte('coordinates_lng', lng + delta)
      .eq('is_active', true)
      .eq('is_approved', true);
    if (error) throw error;
    return data;
  },

  uploadLogo: async (hostelId: string, logoFile: File) => {
    const fileExt = logoFile.name.split('.').pop();
    const filePath = `logos/${hostelId}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('hostel-images')
      .upload(filePath, logoFile, { upsert: true });
    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('hostel-images')
      .getPublicUrl(filePath);

    await supabase.from('hostels').update({ logo_image: publicUrl }).eq('id', hostelId);
    return { logoUrl: publicUrl };
  },

  uploadImages: async (hostelId: string, files: File[]) => {
    const urls: string[] = [];
    for (const file of files) {
      const fileExt = file.name.split('.').pop();
      const filePath = `gallery/${hostelId}/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
      
      const { error } = await supabase.storage
        .from('hostel-images')
        .upload(filePath, file);
      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('hostel-images')
        .getPublicUrl(filePath);
      urls.push(publicUrl);
    }
    return urls;
  },

  // Admin: approve/reject hostel
  approveHostel: async (hostelId: string, approved: boolean) => {
    const { data, error } = await supabase
      .from('hostels')
      .update({ is_approved: approved })
      .eq('id', hostelId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // Admin: set commission
  setCommission: async (hostelId: string, percentage: number) => {
    const { data, error } = await supabase
      .from('hostels')
      .update({ commission_percentage: percentage })
      .eq('id', hostelId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // Get all bookings for admin/partner
  getAllBookings: async (params?: { hostel_id?: string; status?: string }) => {
    let query = supabase
      .from('hostel_bookings')
      .select('*, hostels(name), hostel_rooms(room_number), hostel_beds(bed_number), profiles:user_id(name, email, phone)')
      .order('created_at', { ascending: false });

    if (params?.hostel_id) query = query.eq('hostel_id', params.hostel_id);
    if (params?.status) query = query.eq('status', params.status);

    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  getBookingById: async (bookingId: string) => {
    const { data, error } = await supabase
      .from('hostel_bookings')
      .select('*, hostels(name, location, contact_phone), hostel_rooms(room_number, floor, category), hostel_beds(bed_number), hostel_sharing_options(type, capacity, price_monthly, price_daily), profiles:user_id(name, email, phone)')
      .eq('id', bookingId)
      .single();
    if (error) throw error;
    return data;
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

  cancelBooking: async (bookingId: string, reason?: string) => {
    // Release bed
    const { data: booking } = await supabase
      .from('hostel_bookings')
      .select('bed_id')
      .eq('id', bookingId)
      .single();

    if (booking?.bed_id) {
      await supabase.from('hostel_beds').update({ is_available: true }).eq('id', booking.bed_id);
    }

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

  toggleHostelActive: async (hostelId: string, isActive: boolean) => {
    const updateData: any = { is_active: isActive };
    if (!isActive) updateData.is_booking_active = false;
    const { data, error } = await supabase
      .from('hostels')
      .update(updateData)
      .eq('id', hostelId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  toggleHostelBooking: async (hostelId: string, isBookingActive: boolean) => {
    const { data, error } = await supabase
      .from('hostels')
      .update({ is_booking_active: isBookingActive })
      .eq('id', hostelId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  getHostelBySerialNumber: async (serialNumber: string) => {
    const { data, error } = await supabase
      .from('hostels')
      .select('*, states(name), cities(name), areas(name)')
      .eq('serial_number', serialNumber)
      .single();
    if (error) throw error;
    return data;
  },
};
