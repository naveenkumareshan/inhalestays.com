import { supabase } from '@/integrations/supabase/client';

export interface CabinFilters {
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  search?: string;
  page?: number;
  limit?: number;
  city?: string;
  sortBy?: 'price' | 'rating' | 'name';
}

export const cabinsService = {
  getAllCabins: async (filters?: CabinFilters) => {
    try {
      let query = supabase.from('cabins').select('*', { count: 'exact' }).eq('is_active', true).eq('is_student_visible', true);

      if (filters?.category) query = query.eq('category', filters.category);
      if (filters?.search) query = query.ilike('name', `%${filters.search}%`);
      if (filters?.minPrice) query = query.gte('price', filters.minPrice);
      if (filters?.maxPrice) query = query.lte('price', filters.maxPrice);
      if (filters?.city) query = query.ilike('city', `%${filters.city}%`);

      const limit = filters?.limit || 20;
      const from = ((filters?.page || 1) - 1) * limit;
      query = query.range(from, from + limit - 1);

      if (filters?.sortBy === 'price') query = query.order('price');
      else if (filters?.sortBy === 'name') query = query.order('name');
      else query = query.order('created_at', { ascending: false });

      const { data, error, count } = await query;
      return {
        success: !error,
        data: data || [],
        count: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      };
    } catch (error) {
      console.error('Error fetching cabins:', error);
      return { success: false, error, data: [], count: 0, totalPages: 1 };
    }
  },

  getAllCabinsWithOutFilter: async (filters?: CabinFilters) => {
    try {
      const { data, error, count } = await supabase
        .from('cabins')
        .select('*', { count: 'exact' })
        .eq('is_active', true)
        .eq('is_student_visible', true);
      return {
        success: !error,
        data: data || [],
        count: count || 0,
        totalPages: 1,
      };
    } catch (error) {
      console.error('Error fetching cabins:', error);
      return { success: false, error, data: [], count: 0, totalPages: 1 };
    }
  },

  getFeaturedCabins: async () => {
    try {
      const { data, error } = await supabase
        .from('cabins')
        .select('*')
        .eq('is_active', true)
        .eq('is_student_visible', true)
        .order('created_at', { ascending: false })
        .limit(6);
      return { success: !error, data: data || [] };
    } catch (error) {
      console.error('Error fetching featured cabins:', error);
      return { success: false, error, data: [] };
    }
  },

  getCabinById: async (id: string) => {
    try {
      const { data, error } = await supabase
        .from('cabins')
        .select('*')
        .eq('id', id)
        .single();
      return { success: !error, data };
    } catch (error) {
      console.error(`Error fetching cabin with id ${id}:`, error);
      return { success: false, error };
    }
  },

  getCabinsByCategory: async (category: string) => {
    try {
      const { data, error } = await supabase
        .from('cabins')
        .select('*')
        .eq('is_active', true)
        .eq('is_student_visible', true)
        .eq('category', category);
      return { success: !error, data: data || [] };
    } catch (error) {
      console.error(`Error fetching cabins in category ${category}:`, error);
      return { success: false, error, data: [] };
    }
  },

  getCabinBySerialNumber: async (serialNumber: string) => {
    try {
      const { data, error } = await supabase
        .from('cabins')
        .select('*')
        .eq('serial_number', serialNumber)
        .single();
      return { success: !error, data };
    } catch (error) {
      console.error(`Error fetching cabin with serial number ${serialNumber}:`, error);
      return { success: false, error };
    }
  },
};
