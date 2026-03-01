import { supabase } from '@/integrations/supabase/client';

interface CabinData {
  name: string;
  description?: string;
  price?: number;
  capacity?: number;
  amenities?: string[];
  image_url?: string;
  images?: string[];
  category?: 'standard' | 'premium' | 'luxury';
  is_active?: boolean;
  city?: string;
  state?: string;
  area?: string;
}

interface RoomElement {
  id: string;
  type: string;
  position: {
    x: number;
    y: number;
  };
}

export const adminCabinsService = {
  getAllCabins: async (filters: any = {}) => {
    try {
      let query = supabase.from('cabins').select('*');

      // Filter by partner's own cabins if partnerUserId is provided
      if (filters.partnerUserId) {
        query = query.eq('created_by', filters.partnerUserId);
      }

      if (filters.category) {
        query = query.eq('category', filters.category);
      }

      if (filters.search) {
        query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }

      query = query.order('created_at', { ascending: false });

      const { data, error, count } = await query;

      if (error) throw error;

      return {
        success: true,
        data: data || [],
        totalCount: data?.length || 0,
      };
    } catch (error) {
      console.error('Error fetching cabins:', error);
      return { success: false, data: [], totalCount: 0, message: error instanceof Error ? error.message : 'Failed to fetch cabins' };
    }
  },

  getCabinById: async (id: string) => {
    try {
      const { data, error } = await supabase
        .from('cabins')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      return { success: true, data };
    } catch (error) {
      console.error('Error fetching cabin:', error);
      return { success: false, data: null, message: error instanceof Error ? error.message : 'Failed to fetch cabin' };
    }
  },

  createCabin: async (data: any) => {
    try {
      // Map to Supabase snake_case columns
      // Get current user for created_by
      const { data: { user: currentUser } } = await supabase.auth.getUser();

      const cabinRecord: any = {
        name: data.name,
        description: data.description,
        price: data.price,
        capacity: data.capacity,
        amenities: data.amenities || [],
        category: data.category,
        image_url: data.imageSrc || data.image_url || '',
        images: data.images || [],
        is_active: data.isActive !== false,
        city: data.city || null,
        state: data.state || null,
        area: data.area || null,
        locker_available: data.lockerAvailable ?? false,
        locker_price: data.lockerPrice ?? 0,
        locker_mandatory: data.lockerMandatory ?? true,
        full_address: data.fullAddress || '',
        created_by: data.created_by || currentUser?.id || null,
        advance_booking_enabled: data.advanceBookingEnabled ?? false,
        advance_percentage: data.advancePercentage ?? 50,
        advance_flat_amount: data.advanceFlatAmount || null,
        advance_use_flat: data.advanceUseFlat ?? false,
        advance_validity_days: data.advanceValidityDays ?? 3,
        advance_auto_cancel: data.advanceAutoCancel ?? true,
        advance_applicable_durations: data.advanceApplicableDurations || ['daily','weekly','monthly'],
        opening_time: data.openingTime || '06:00',
        closing_time: data.closingTime || '22:00',
        working_days: data.workingDays || ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],
        is_24_hours: data.is24Hours ?? false,
        slots_enabled: data.slotsEnabled ?? false,
        allowed_durations: data.allowedDurations || ['daily','weekly','monthly'],
        slots_applicable_durations: data.slotsApplicableDurations || ['daily','weekly','monthly'],
      };

      const { data: result, error } = await supabase
        .from('cabins')
        .insert(cabinRecord)
        .select()
        .single();

      if (error) throw error;

      return { success: true, data: result };
    } catch (error) {
      console.error('Error creating cabin:', error);
      return { success: false, data: null, message: error instanceof Error ? error.message : 'Failed to create cabin' };
    }
  },

  updateCabin: async (id: string, data: any) => {
    try {
      const updateData: Partial<CabinData> = {};
      
      if (data.name !== undefined) updateData.name = data.name;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.price !== undefined) updateData.price = data.price;
      if (data.capacity !== undefined) updateData.capacity = data.capacity;
      if (data.amenities !== undefined) updateData.amenities = data.amenities;
      if (data.category !== undefined) updateData.category = data.category;
      if (data.imageSrc !== undefined || data.image_url !== undefined) updateData.image_url = data.imageSrc || data.image_url;
      if (data.images !== undefined) updateData.images = data.images;
      if (data.isActive !== undefined || data.is_active !== undefined) updateData.is_active = data.isActive ?? data.is_active;
      if (data.isBookingActive !== undefined || data.is_booking_active !== undefined) (updateData as any).is_booking_active = data.isBookingActive ?? data.is_booking_active;
      if (data.city !== undefined) updateData.city = data.city;
      if (data.state !== undefined) updateData.state = data.state;
      if (data.area !== undefined) updateData.area = data.area;
      if (data.lockerAvailable !== undefined) (updateData as any).locker_available = data.lockerAvailable;
      if (data.lockerPrice !== undefined) (updateData as any).locker_price = data.lockerPrice;
      if (data.lockerMandatory !== undefined) (updateData as any).locker_mandatory = data.lockerMandatory;
      if (data.fullAddress !== undefined) (updateData as any).full_address = data.fullAddress;
      if (data.created_by !== undefined) (updateData as any).created_by = data.created_by;
      if (data.advanceBookingEnabled !== undefined) (updateData as any).advance_booking_enabled = data.advanceBookingEnabled;
      if (data.advancePercentage !== undefined) (updateData as any).advance_percentage = data.advancePercentage;
      if (data.advanceFlatAmount !== undefined) (updateData as any).advance_flat_amount = data.advanceFlatAmount;
      if (data.advanceUseFlat !== undefined) (updateData as any).advance_use_flat = data.advanceUseFlat;
      if (data.advanceValidityDays !== undefined) (updateData as any).advance_validity_days = data.advanceValidityDays;
      if (data.advanceAutoCancel !== undefined) (updateData as any).advance_auto_cancel = data.advanceAutoCancel;
      if (data.advanceApplicableDurations !== undefined) (updateData as any).advance_applicable_durations = data.advanceApplicableDurations;
      if (data.openingTime !== undefined) (updateData as any).opening_time = data.openingTime;
      if (data.closingTime !== undefined) (updateData as any).closing_time = data.closingTime;
      if (data.workingDays !== undefined) (updateData as any).working_days = data.workingDays;
      if (data.is24Hours !== undefined) (updateData as any).is_24_hours = data.is24Hours;
      if (data.slotsEnabled !== undefined) (updateData as any).slots_enabled = data.slotsEnabled;
      if (data.allowedDurations !== undefined) (updateData as any).allowed_durations = data.allowedDurations;
      if (data.slotsApplicableDurations !== undefined) (updateData as any).slots_applicable_durations = data.slotsApplicableDurations;

      const { data: result, error } = await supabase
        .from('cabins')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      return { success: true, data: result };
    } catch (error) {
      console.error('Error updating cabin:', error);
      return { success: false, data: null, message: error instanceof Error ? error.message : 'Failed to update cabin' };
    }
  },

  deleteCabin: async (id: string) => {
    try {
      const { error } = await supabase
        .from('cabins')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;

      return { success: true };
    } catch (error) {
      console.error('Error deleting cabin:', error);
      return { success: false, message: error instanceof Error ? error.message : 'Failed to delete cabin' };
    }
  },

  restoreCabin: async (id: string) => {
    try {
      const { error } = await supabase
        .from('cabins')
        .update({ is_active: true })
        .eq('id', id);

      if (error) throw error;

      return { success: true };
    } catch (error) {
      console.error('Error restoring cabin:', error);
      return { success: false, message: error instanceof Error ? error.message : 'Failed to restore cabin' };
    }
  },

  getCabinStats: async () => {
    try {
      const { data, error } = await supabase.from('cabins').select('*');
      if (error) throw error;

      const total = data?.length || 0;
      const active = data?.filter(c => c.is_active).length || 0;

      return {
        success: true,
        data: { total, active, inactive: total - active },
      };
    } catch (error) {
      return { success: false, data: { total: 0, active: 0, inactive: 0 } };
    }
  },

  bulkUpdateCabins: async (cabins: { id: string; updates: Partial<CabinData> }[]) => {
    try {
      for (const cabin of cabins) {
        await adminCabinsService.updateCabin(cabin.id, cabin.updates);
      }
      return { success: true };
    } catch (error) {
      return { success: false, message: error instanceof Error ? error.message : 'Bulk update failed' };
    }
  },

  approveCabin: async (cabinId: string, approved: boolean) => {
    try {
      const { data, error } = await supabase
        .from('cabins')
        .update({ is_approved: approved })
        .eq('id', cabinId)
        .select()
        .single();
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error approving cabin:', error);
      return { success: false, data: null, message: error instanceof Error ? error.message : 'Failed to approve cabin' };
    }
  },

  uploadCabinImage: async (cabinId: string, file: File) => {
    const { uploadService } = await import('./uploadService');
    return uploadService.uploadCabinImage(cabinId, file);
  },

  uploadCabinImages: async (cabinId: string, files: File[]) => {
    const { uploadService } = await import('./uploadService');
    const urls: string[] = [];
    for (const file of files) {
      const result = await uploadService.uploadCabinImage(cabinId, file);
      if (result.success) urls.push(result.data.url);
    }
    return { success: true, data: { urls } };
  },

  removeCabinImage: async (_cabinId: string, imageUrl: string) => {
    const { uploadService } = await import('./uploadService');
    return uploadService.deleteImage(imageUrl);
  },

  getCabinWithSeats: async (cabinId: string) => {
    return adminCabinsService.getCabinById(cabinId);
  },

  getCabinSeatStats: async (_cabinId: string) => {
    return { success: true, data: {} };
  },

  getCabinBookingStats: async (_cabinId: string, _period: 'day' | 'week' | 'month' | 'year' = 'month') => {
    return { success: true, data: {} };
  },

  updateCabinLayout: async (cabinId: string, roomElements: RoomElement[], roomWidth?: number, roomHeight?: number, gridSize?: number, sections?: any[], layoutImage?: string | null, floors?: any[]) => {
    try {
      const updateData: any = { room_elements: roomElements };
      if (roomWidth !== undefined) updateData.room_width = roomWidth;
      if (roomHeight !== undefined) updateData.room_height = roomHeight;
      if (gridSize !== undefined) updateData.grid_size = gridSize;
      if (sections !== undefined) updateData.sections = sections;
      if (layoutImage !== undefined) updateData.layout_image = layoutImage;
      if (floors !== undefined) updateData.floors = floors;

      const { data, error } = await supabase
        .from('cabins')
        .update(updateData)
        .eq('id', cabinId)
        .select()
        .single();
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error updating cabin layout:', error);
      return { success: false, data: null, error: { message: error instanceof Error ? error.message : 'Failed' } };
    }
  },

  addUpdateCabinFloor: async (id: string, data: { floorId: number | null; number: string }) => {
    try {
      // Get current floors
      const { data: cabin, error: fetchError } = await supabase
        .from('cabins')
        .select('floors')
        .eq('id', id)
        .single();
      if (fetchError) throw fetchError;

      let floors: any[] = Array.isArray(cabin?.floors) ? [...(cabin.floors as any[])] : [];

      if (data.floorId !== null && data.floorId !== undefined) {
        // Update existing floor
        floors = floors.map((f: any) => f.id === data.floorId ? { ...f, number: parseInt(data.number) } : f);
      } else {
        // Add new floor
        const newId = floors.length > 0 ? Math.max(...floors.map((f: any) => f.id)) + 1 : 1;
        floors.push({ id: newId, number: parseInt(data.number) });
      }

      const { data: updated, error } = await supabase
        .from('cabins')
        .update({ floors })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;

      return { success: true, data: { floors: updated.floors || [] } };
    } catch (error) {
      console.error('Error updating floors:', error);
      return { success: false, data: null, message: error instanceof Error ? error.message : 'Failed' };
    }
  },
};
