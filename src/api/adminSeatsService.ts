import { supabase } from '@/integrations/supabase/client';

interface SeatPosition {
  x: number;
  y: number;
}

export interface SeatData {
  _id?: string;
  id?: string;
  number: number;
  floor: number;
  cabinId: string;
  price: number;
  position: SeatPosition;
  isAvailable: boolean;
  isHotSelling?: boolean;
  unavailableUntil?: string;
  sharingType?: string;
  sharingCapacity?: number;
  sectionId?: string;
  rowIndex?: number;
  colIndex?: number;
  category?: string;
}

const mapRow = (row: any): any => ({
  _id: row.id,
  id: row.id,
  number: row.number,
  floor: row.floor,
  cabinId: row.cabin_id,
  price: row.price,
  position: { x: row.position_x, y: row.position_y },
  isAvailable: row.is_available,
  isHotSelling: row.is_hot_selling,
  unavailableUntil: row.unavailable_until,
  sharingType: row.sharing_type,
  sharingCapacity: row.sharing_capacity,
  category: row.category || 'Non-AC',
});

export const adminSeatsService = {
  getAllSeats: async (filters: any = {}) => {
    try {
      let query = supabase.from('seats').select('*');
      if (filters.cabinId) query = query.eq('cabin_id', filters.cabinId);
      const { data, error } = await query;
      if (error) throw error;
      return { success: true, data: (data || []).map(mapRow) };
    } catch (e) {
      console.error('Error fetching seats:', e);
      return { success: false, data: [] };
    }
  },

  getAdminAllSeats: async (filters: any = {}) => {
    return adminSeatsService.getAllSeats(filters);
  },

  getActiveSeatsCountSeats: async (filters: any = {}) => {
    try {
      let query = supabase.from('seats').select('id', { count: 'exact' }).eq('is_available', true);
      if (filters.cabinId) query = query.eq('cabin_id', filters.cabinId);
      const { count, error } = await query;
      if (error) throw error;
      return { success: true, count: count || 0 };
    } catch (e) {
      return { success: false, count: 0 };
    }
  },

  getSeatsByCabin: async (cabinId: string, selectedFloor: string) => {
    try {
      const { data, error } = await supabase
        .from('seats')
        .select('*')
        .eq('cabin_id', cabinId)
        .eq('floor', parseInt(selectedFloor) || 1)
        .order('number');
      if (error) throw error;
      return { success: true, data: (data || []).map(mapRow) };
    } catch (e) {
      console.error('Error fetching seats by cabin:', e);
      return { success: false, data: [] };
    }
  },

  getSeatById: async (id: string) => {
    try {
      const { data, error } = await supabase.from('seats').select('*').eq('id', id).single();
      if (error) throw error;
      return { success: true, data: mapRow(data) };
    } catch (e) {
      return { success: false, data: null };
    }
  },

  createSeat: async (seatData: SeatData) => {
    try {
      const { data, error } = await supabase.from('seats').insert({
        number: seatData.number,
        floor: seatData.floor,
        cabin_id: seatData.cabinId,
        price: seatData.price,
        position_x: seatData.position.x,
        position_y: seatData.position.y,
        is_available: seatData.isAvailable,
        is_hot_selling: seatData.isHotSelling || false,
        sharing_type: seatData.sharingType || 'private',
        sharing_capacity: seatData.sharingCapacity || 4,
        category: seatData.category || 'Non-AC',
      }).select().single();
      if (error) throw error;
      return { success: true, data: mapRow(data) };
    } catch (e) {
      console.error('Error creating seat:', e);
      return { success: false, data: null, message: String(e) };
    }
  },

  updateSeat: async (id: string, updates: Partial<SeatData>) => {
    try {
      const updateData: any = {};
      if (updates.number !== undefined) updateData.number = updates.number;
      if (updates.floor !== undefined) updateData.floor = updates.floor;
      if (updates.price !== undefined) updateData.price = updates.price;
      if (updates.isAvailable !== undefined) updateData.is_available = updates.isAvailable;
      if (updates.isHotSelling !== undefined) updateData.is_hot_selling = updates.isHotSelling;
      if (updates.position) {
        updateData.position_x = updates.position.x;
        updateData.position_y = updates.position.y;
      }
      if (updates.sharingType !== undefined) updateData.sharing_type = updates.sharingType;
      if (updates.sharingCapacity !== undefined) updateData.sharing_capacity = updates.sharingCapacity;
      if (updates.category !== undefined) updateData.category = updates.category;

      const { data, error } = await supabase.from('seats').update(updateData).eq('id', id).select().single();
      if (error) throw error;
      return { success: true, data: mapRow(data) };
    } catch (e) {
      console.error('Error updating seat:', e);
      return { success: false, data: null, message: String(e) };
    }
  },

  deleteSeat: async (id: string) => {
    try {
      const { error } = await supabase.from('seats').delete().eq('id', id);
      if (error) throw error;
      return { success: true };
    } catch (e) {
      return { success: false, message: String(e) };
    }
  },

  bulkCreateSeats: async (seats: SeatData[]) => {
    try {
      const records = seats.map(s => ({
        number: s.number,
        floor: s.floor,
        cabin_id: s.cabinId,
        price: s.price,
        position_x: s.position.x,
        position_y: s.position.y,
        is_available: s.isAvailable,
        is_hot_selling: s.isHotSelling || false,
        sharing_type: s.sharingType || 'private',
        sharing_capacity: s.sharingCapacity || 4,
        row_index: s.rowIndex || 0,
        col_index: s.colIndex || 0,
        category: s.category || 'Non-AC',
      }));
      const { data, error } = await supabase.from('seats').insert(records).select();
      if (error) throw error;
      return { success: true, data: (data || []).map(mapRow) };
    } catch (e) {
      console.error('Error bulk creating seats:', e);
      return { success: false, data: [], message: String(e) };
    }
  },

  bulkUpdateSeats: async (seats: { _id: string; updates: Partial<SeatData> }[]) => {
    try {
      for (const seat of seats) {
        await adminSeatsService.updateSeat(seat._id, seat.updates);
      }
      return { success: true };
    } catch (e) {
      return { success: false, message: String(e) };
    }
  },

  updateSeatPositions: async (seats: { _id: string; position: SeatPosition }[]) => {
    try {
      for (const seat of seats) {
        await supabase.from('seats').update({
          position_x: seat.position.x,
          position_y: seat.position.y,
        }).eq('id', seat._id);
      }
      return { success: true };
    } catch (e) {
      return { success: false, message: String(e) };
    }
  },

  deleteAllSeatsByCabin: async (cabinId: string, floor: number) => {
    try {
      const { error } = await supabase.from('seats').delete().eq('cabin_id', cabinId).eq('floor', floor);
      if (error) throw error;
      return { success: true };
    } catch (e) {
      console.error('Error deleting all seats:', e);
      return { success: false, message: String(e) };
    }
  },
};
