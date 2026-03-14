
import { supabase } from '@/integrations/supabase/client';

export interface SeatBookingDetail {
  bookingId: string;
  serialNumber: string;
  startDate: string;
  endDate: string;
  totalPrice: number;
  paymentStatus: string;
  bookingDuration: string;
  durationCount: string;
  studentName: string;
  studentEmail: string;
  studentPhone: string;
  studentSerialNumber: string;
  profilePicture: string;
  course: string;
  college: string;
  address: string;
  city: string;
  state: string;
  gender: string;
  dob: string;
  userId: string;
  lockerIncluded?: boolean;
  lockerPrice?: number;
  discountAmount?: number;
  discountReason?: string;
  paymentMethod?: string;
  collectedByName?: string;
  transactionId?: string;
  slotId?: string | null;
  slotName?: string;
  seatCategory?: string;
}

export interface VendorSeat {
  _id: string;
  number: number;
  cabinId: string;
  cabinName: string;
  position: { x: number; y: number };
  isAvailable: boolean;
  price: number;
  category: string;
  floor: number;
  unavailableUntil?: string;
  dateStatus?: 'available' | 'booked' | 'expiring_soon' | 'blocked';
  currentBooking?: {
    startDate: string;
    endDate: string;
    studentName: string;
    studentEmail: string;
    studentPhone: string;
    profilePicture: string;
    userId: string;
    slotId: string | null;
    slotName: string | null;
  };
  allBookings: SeatBookingDetail[];
}

export interface VendorCabin {
  _id: string;
  name: string;
  location: string;
  totalSeats: number;
  availableSeats: number;
  occupiedSeats: number;
  floors?: any[];
  isActive: boolean;
  lockerAvailable: boolean;
  lockerPrice: number;
  lockerMandatory: boolean;
  lockerMandatoryDurations: string[];
  advanceBookingEnabled: boolean;
  advancePercentage: number;
  advanceFlatAmount: number | null;
  advanceUseFlat: boolean;
  advanceValidityDays: number;
  slotsEnabled: boolean;
  slotsApplicableDurations: string[];
}

export interface SeatFilters {
  cabinId?: string;
  status?: 'available' | 'occupied' | 'expiring_soon' | 'blocked';
  search?: string;
  date?: string;
}

export interface StudentProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  serialNumber: string;
  profilePicture: string;
  linked?: boolean;
}

export interface PartnerBookingData {
  seatId: string;
  cabinId: string;
  userId: string;
  startDate: string;
  endDate: string;
  totalPrice: number;
  bookingDuration: string;
  durationCount: string;
  seatNumber: number;
  lockerIncluded?: boolean;
  lockerPrice?: number;
  discountAmount?: number;
  discountReason?: string;
  paymentMethod?: string;
  collectedBy?: string;
  collectedByName?: string;
  transactionId?: string;
  isAdvanceBooking?: boolean;
  advancePaid?: number;
  dueDate?: string;
  slotId?: string;
  paymentProofUrl?: string;
}

export interface BlockHistoryEntry {
  id: string;
  action: string;
  reason: string;
  performedBy: string;
  createdAt: string;
  blockFrom?: string;
  blockTo?: string;
}

function computeDateStatus(
  seat: { is_available: boolean; id: string },
  bookingsForDate: any[],
  selectedDate: string,
  dateBlocks?: any[],
  duesMap?: Record<string, string>
): 'available' | 'booked' | 'expiring_soon' | 'blocked' {
  if (!seat.is_available) return 'blocked';

  // Check date-range blocks
  if (dateBlocks && dateBlocks.length > 0) {
    const hasActiveBlock = dateBlocks.some(
      (b) => b.seat_id === seat.id && b.action === 'blocked' && b.block_from && b.block_to && b.block_from <= selectedDate && b.block_to >= selectedDate
    );
    if (hasActiveBlock) return 'blocked';
  }

  const activeBooking = bookingsForDate.find(
    (b) => b.seat_id === seat.id && b.start_date <= selectedDate && b.end_date >= selectedDate
  );

  if (activeBooking) {
    const endDate = new Date(activeBooking.end_date);
    const selected = new Date(selectedDate);
    const diffDays = Math.ceil((endDate.getTime() - selected.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays <= 7) return 'expiring_soon';
    return 'booked';
  }

  return 'available';
}

function mapBookingToDetail(b: any, slotNameMap?: Record<string, string>, seatCategory?: string): SeatBookingDetail {
  const profile = b.profiles as any;
  return {
    bookingId: b.id,
    serialNumber: b.serial_number || '',
    startDate: b.start_date || '',
    endDate: b.end_date || '',
    totalPrice: Number(b.total_price) || 0,
    paymentStatus: b.payment_status || '',
    bookingDuration: b.booking_duration || '',
    durationCount: b.duration_count || '',
    studentName: profile?.name || 'N/A',
    studentEmail: profile?.email || 'N/A',
    studentPhone: profile?.phone || 'N/A',
    studentSerialNumber: profile?.serial_number || '',
    profilePicture: profile?.profile_picture || '',
    course: profile?.course_studying || '',
    college: profile?.college_studied || '',
    address: profile?.address || '',
    city: profile?.city || '',
    state: profile?.state || '',
    gender: profile?.gender || '',
    dob: profile?.date_of_birth || '',
    userId: profile?.id || '',
    lockerIncluded: b.locker_included || false,
    lockerPrice: Number(b.locker_price) || 0,
    discountAmount: Number(b.discount_amount) || 0,
    discountReason: b.discount_reason || '',
    paymentMethod: b.payment_method || 'online',
    collectedByName: b.collected_by_name || '',
    transactionId: b.transaction_id || '',
    slotId: b.slot_id || null,
    slotName: b.slot_id && slotNameMap ? (slotNameMap[b.slot_id] || '') : '',
    seatCategory: seatCategory || '',
  };
}

export const vendorSeatsService = {
  getVendorCabins: async () => {
    try {
      // Use getSession (local) instead of getUser (network) for reliability
      const { data: { session } } = await supabase.auth.getSession();
      const authUser = session?.user;
      if (!authUser) {
        console.warn('getVendorCabins: No authenticated user yet');
        return { success: false, data: { data: [] } };
      }
      let cabinsQuery = supabase.from('cabins').select('*').order('name');
      
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', authUser.id);
      const isAdmin = roleData?.some(r => r.role === 'admin' || r.role === 'super_admin');
      const isEmployee = roleData?.some(r => r.role === 'vendor_employee');
      if (!isAdmin) {
        try {
          const { getEffectiveOwnerId } = await import('@/utils/getEffectiveOwnerId');
          const { ownerId } = await getEffectiveOwnerId();
          cabinsQuery = cabinsQuery.eq('created_by', ownerId);
        } catch (e) {
          console.warn('getVendorCabins: getEffectiveOwnerId failed, skipping filter', e);
        }
      }

      const { data: cabinsRaw, error } = await cabinsQuery;
      if (error) throw error;

      // Filter by allowed_properties for employees
      let cabins = cabinsRaw || [];
      if (isEmployee) {
        const { data: empRecord } = await supabase
          .from('vendor_employees')
          .select('allowed_properties')
          .eq('employee_user_id', authUser.id)
          .maybeSingle();
        const allowed = (empRecord as any)?.allowed_properties as string[] | null;
        if (allowed && allowed.length > 0) {
          cabins = cabins.filter(c => allowed.includes(c.id));
        }
      }
      if (error) throw error;

      const { data: seats, error: seatsError } = await supabase
        .from('seats')
        .select('cabin_id, is_available');
      if (seatsError) throw seatsError;

      const cabinData = (cabins || []).map(cabin => {
        const cabinSeats = (seats || []).filter(s => s.cabin_id === cabin.id);
        return {
          _id: cabin.id,
          name: cabin.name,
          location: cabin.full_address || '',
          totalSeats: cabinSeats.length,
          availableSeats: cabinSeats.filter(s => s.is_available).length,
          occupiedSeats: cabinSeats.filter(s => !s.is_available).length,
          floors: cabin.floors || [],
          isActive: cabin.is_active !== false,
          lockerAvailable: cabin.locker_available,
          lockerPrice: Number(cabin.locker_price),
          lockerMandatory: cabin.locker_mandatory,
          lockerMandatoryDurations: Array.isArray((cabin as any).locker_mandatory_durations) ? (cabin as any).locker_mandatory_durations : ['daily','weekly','monthly'],
          advanceBookingEnabled: (cabin as any).advance_booking_enabled ?? false,
          advancePercentage: Number((cabin as any).advance_percentage) || 50,
          advanceFlatAmount: (cabin as any).advance_flat_amount ? Number((cabin as any).advance_flat_amount) : null,
          advanceUseFlat: (cabin as any).advance_use_flat ?? false,
          advanceValidityDays: Number((cabin as any).advance_validity_days) || 3,
          slotsEnabled: cabin.slots_enabled ?? false,
          slotsApplicableDurations: (cabin.slots_applicable_durations as string[]) || [],
        };
      });

      return { success: true, data: { data: cabinData } };
    } catch (error) {
      console.error('Error fetching vendor cabins:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Failed' };
    }
  },

  // Date-aware seat fetcher - supports 'all' for all cabins
  // When cabinId is 'all', partnerCabinIds restricts to partner-owned cabins only
  getSeatsForDate: async (cabinId: string, date: string, partnerCabinIds?: string[]) => {
    try {
      let query = supabase
        .from('seats')
        .select('*, cabins!inner(id, name)')
        .order('number');

      if (cabinId !== 'all') {
        query = query.eq('cabin_id', cabinId);
      } else if (partnerCabinIds && partnerCabinIds.length > 0) {
        // Partner isolation: only show seats from partner's own cabins
        query = query.in('cabin_id', partnerCabinIds);
      }

      const { data: seatsData, error } = await query.limit(10000);
      if (error) throw error;

      const seatIds = (seatsData || []).map(s => s.id);
      let allBookings: any[] = [];
      let dateBlocks: any[] = [];

      if (seatIds.length > 0) {
        // Use cabin_id instead of seat_id for bookings query to avoid URL length limits
        // (401 seat UUIDs = ~15KB URL which exceeds PostgREST's ~8KB limit)
        const cabinIds = [...new Set((seatsData || []).map(s => s.cabin_id).filter(Boolean))];

        // Batch seat_block_history queries in chunks of 50 to avoid URL limits
        const BATCH_SIZE = 200;
        const seatIdBatches: string[][] = [];
        for (let i = 0; i < seatIds.length; i += BATCH_SIZE) {
          seatIdBatches.push(seatIds.slice(i, i + BATCH_SIZE));
        }

        const [bookingsRes, ...blocksResults] = await Promise.all([
          supabase
            .from('bookings')
            .select('*, profiles!bookings_user_id_fkey(id, name, email, phone, profile_picture, serial_number, course_studying, college_studied, address, city, state, date_of_birth, gender)')
            .in('cabin_id', cabinIds)
            .in('payment_status', ['completed', 'advance_paid'])
            .gte('end_date', date)
            .order('start_date', { ascending: true })
            .limit(10000),
          ...seatIdBatches.map(batch =>
            supabase
              .from('seat_block_history')
              .select('*')
              .in('seat_id', batch)
              .eq('action', 'blocked')
              .not('block_from', 'is', null)
              .not('block_to', 'is', null)
              .gte('block_to', date)
          ),
        ]);

        if (bookingsRes.error) {
          console.error('Error fetching bookings in getSeatsForDate:', bookingsRes.error);
        }
        allBookings = bookingsRes.data || [];

        // Merge all batched block results
        dateBlocks = [];
        for (const blocksRes of blocksResults) {
          if (blocksRes.error) {
            console.error('Error fetching seat_block_history batch:', blocksRes.error);
          }
          dateBlocks.push(...(blocksRes.data || []));
        }
      }

      // Build dues map for advance_paid bookings (booking_id -> proportional_end_date)
      let duesMap: Record<string, string> = {};
      const advancePaidIds = allBookings
        .filter(b => b.payment_status === 'advance_paid')
        .map(b => b.id);

      if (advancePaidIds.length > 0) {
        // Batch dues query to avoid URL length limits with many booking IDs
        const DUES_BATCH = 200;
        const duesBatches: string[][] = [];
        for (let i = 0; i < advancePaidIds.length; i += DUES_BATCH) {
          duesBatches.push(advancePaidIds.slice(i, i + DUES_BATCH));
        }
        const duesResults = await Promise.all(
          duesBatches.map(batch =>
            supabase.from('dues').select('booking_id, proportional_end_date').in('booking_id', batch)
          )
        );
        for (const res of duesResults) {
          if (res.error) console.error('Error fetching dues batch:', res.error);
          (res.data || []).forEach((d: any) => {
            if (d.booking_id && d.proportional_end_date) {
              duesMap[d.booking_id] = d.proportional_end_date;
            }
          });
        }
      }

      // Fetch slot names for bookings that have slot_id
      const slotIds = [...new Set(allBookings.filter(b => b.slot_id).map(b => b.slot_id))];
      let slotNameMap: Record<string, string> = {};
      if (slotIds.length > 0) {
        const { data: slotsData } = await supabase
          .from('cabin_slots')
          .select('id, name')
          .in('id', slotIds);
        (slotsData || []).forEach((s: any) => {
          slotNameMap[s.id] = s.name;
        });
      }

      const mappedSeats: VendorSeat[] = (seatsData || []).map(seat => {
        const seatBookings = allBookings.filter(b => b.seat_id === seat.id);
        const dateStatus = computeDateStatus(seat, allBookings, date, dateBlocks, duesMap);

        const currentBookingRaw = seatBookings.find(b => {
          if (b.start_date > date || b.end_date < date) return false;
          return true;
        });

        const currentBooking = currentBookingRaw ? {
          startDate: currentBookingRaw.start_date,
          endDate: currentBookingRaw.end_date,
          studentName: (currentBookingRaw.profiles as any)?.name || 'N/A',
          studentEmail: (currentBookingRaw.profiles as any)?.email || 'N/A',
          studentPhone: (currentBookingRaw.profiles as any)?.phone || 'N/A',
          profilePicture: (currentBookingRaw.profiles as any)?.profile_picture || '',
          userId: (currentBookingRaw.profiles as any)?.id || '',
          slotId: currentBookingRaw.slot_id || null,
          slotName: currentBookingRaw.slot_id ? (slotNameMap[currentBookingRaw.slot_id] || null) : null,
        } : undefined;

        const mappedBookings: SeatBookingDetail[] = seatBookings.map(b => mapBookingToDetail(b, slotNameMap, seat.category));

        return {
          _id: seat.id,
          number: seat.number,
          cabinId: seat.cabin_id,
          cabinName: (seat.cabins as any)?.name || '',
          position: { x: Number(seat.position_x), y: Number(seat.position_y) },
          isAvailable: seat.is_available,
          price: Number(seat.price),
          category: seat.category,
          floor: seat.floor,
          unavailableUntil: seat.unavailable_until || undefined,
          dateStatus,
          currentBooking,
          allBookings: mappedBookings,
        };
      });

      return { success: true, data: mappedSeats };
    } catch (error) {
      console.error('Error fetching seats for date:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Failed' };
    }
  },

  searchStudents: async (query: string, partnerId?: string): Promise<{ success: boolean; data?: StudentProfile[]; error?: string }> => {
    try {
      const searchTerm = `%${query}%`;
      const results: StudentProfile[] = [];
      const foundIds = new Set<string>();

      // Step 1: If partnerId provided, search linked students first
      if (partnerId) {
        const { data: links } = await supabase
          .from('student_property_links')
          .select('student_user_id')
          .eq('partner_user_id', partnerId);

        const linkedIds = (links || []).map((l: any) => l.student_user_id);

        if (linkedIds.length > 0) {
          const { data: linkedProfiles } = await supabase
            .from('profiles')
            .select('id, name, email, phone, serial_number, profile_picture')
            .in('id', linkedIds)
            .or(`name.ilike.${searchTerm},phone.ilike.${searchTerm},email.ilike.${searchTerm}`)
            .limit(10);

          (linkedProfiles || []).forEach(p => {
            foundIds.add(p.id);
            results.push({
              id: p.id,
              name: p.name || '',
              email: p.email || '',
              phone: p.phone || '',
              serialNumber: p.serial_number || '',
              profilePicture: p.profile_picture || '',
              linked: true,
            });
          });
        }
      }

      // Step 2: Global search if results < 5 (or no partnerId = admin mode)
      if (results.length < 5) {
        let globalQuery = supabase
          .from('profiles')
          .select('id, name, email, phone, serial_number, profile_picture')
          .or(`name.ilike.${searchTerm},phone.ilike.${searchTerm},email.ilike.${searchTerm}`)
          .limit(10);

        const { data: globalData } = await globalQuery;

        (globalData || []).forEach(p => {
          if (!foundIds.has(p.id)) {
            foundIds.add(p.id);
            results.push({
              id: p.id,
              name: p.name || '',
              email: p.email || '',
              phone: p.phone || '',
              serialNumber: p.serial_number || '',
              profilePicture: p.profile_picture || '',
              linked: !partnerId, // admin = no distinction
            });
          }
        });
      }

      return { success: true, data: results.slice(0, 20) };
    } catch (error) {
      console.error('Error searching students:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Failed' };
    }
  },

  createPartnerBooking: async (data: PartnerBookingData) => {
    try {
      // Overlap check: include pending bookings and handle slot-aware conflicts
      const { data: existing, error: checkError } = await supabase
        .from('bookings')
        .select('id, slot_id')
        .eq('seat_id', data.seatId)
        .in('payment_status', ['completed', 'advance_paid', 'pending'])
        .lte('start_date', data.endDate)
        .gte('end_date', data.startDate);

      if (checkError) throw checkError;

      if (existing && existing.length > 0) {
        const slotId = data.slotId === 'full_day' ? null : (data.slotId || null);
        const hasConflict = existing.some(b => {
          // New booking is full-day (no slot) -> conflicts with everything
          if (!slotId) return true;
          // Existing booking is full-day (no slot) -> conflicts with everything
          if (!b.slot_id) return true;
          // Same slot = conflict
          return b.slot_id === slotId;
        });
        if (hasConflict) {
          return { success: false, error: 'Seat already has a booking for the selected dates/slot' };
        }
      }

      // Duplicate transaction ID check for non-cash methods
      if (data.paymentMethod && data.paymentMethod !== 'cash' && data.transactionId && data.transactionId.trim()) {
        const { data: isDuplicate } = await supabase.rpc('check_duplicate_transaction_id', { p_txn_id: data.transactionId.trim() });
        if (isDuplicate) {
          return { success: false, error: 'This Transaction ID has already been used. Please enter a unique Transaction ID.' };
        }
      }

      const { data: serialData } = await supabase.rpc('generate_serial_number', { p_entity_type: 'BOOK' });

      let paymentStatus = 'completed';
      if (data.isAdvanceBooking) {
        paymentStatus = 'advance_paid';
      }

      const { error, data: insertedData } = await supabase
        .from('bookings')
        .insert({
          seat_id: data.seatId,
          cabin_id: data.cabinId,
          user_id: data.userId,
          start_date: data.startDate,
          end_date: data.endDate,
          total_price: data.totalPrice,
          booking_duration: data.bookingDuration,
          duration_count: data.durationCount,
          seat_number: data.seatNumber,
          payment_status: paymentStatus,
          serial_number: serialData || undefined,
          locker_included: data.lockerIncluded || false,
          locker_price: data.lockerPrice || 0,
          discount_amount: data.discountAmount || 0,
          discount_reason: data.discountReason || '',
          payment_method: data.paymentMethod || 'online',
          collected_by: data.collectedBy || null,
          collected_by_name: data.collectedByName || '',
          transaction_id: data.transactionId || '',
          slot_id: data.slotId || null,
          payment_proof_url: data.paymentProofUrl || null,
        })
        .select('id, serial_number')
        .single();

      if (error) throw error;

      // Create due entry if advance booking
      if (data.isAdvanceBooking && insertedData && data.advancePaid !== undefined) {
        let proportionalEndDateStr: string;
        let dueDateStr: string;

        if (data.dueDate) {
          // Use manual due date as both proportional_end_date and due_date
          proportionalEndDateStr = data.dueDate;
          dueDateStr = data.dueDate;
        } else {
          // Fallback: auto-calculate
          const totalDays = Math.ceil((new Date(data.endDate).getTime() - new Date(data.startDate).getTime()) / (1000 * 60 * 60 * 24));
          const proportionalDays = Math.floor((data.advancePaid / data.totalPrice) * totalDays);
          const proportionalEndDate = new Date(data.startDate);
          proportionalEndDate.setDate(proportionalEndDate.getDate() + proportionalDays);
          proportionalEndDateStr = proportionalEndDate.toISOString().split('T')[0];

          const dueDate = new Date(data.startDate);
          const { data: cabinInfo } = await supabase
            .from('cabins')
            .select('advance_validity_days')
            .eq('id', data.cabinId)
            .single();
          const validityDays = (cabinInfo as any)?.advance_validity_days || 3;
          dueDate.setDate(dueDate.getDate() + validityDays);
          dueDateStr = dueDate.toISOString().split('T')[0];
        }

        await supabase.from('dues').insert({
          booking_id: insertedData.id,
          user_id: data.userId,
          cabin_id: data.cabinId,
          seat_id: data.seatId,
          total_fee: data.totalPrice,
          advance_paid: data.advancePaid,
          due_amount: data.totalPrice - data.advancePaid,
          due_date: dueDateStr,
          paid_amount: 0,
          status: 'pending',
          proportional_end_date: proportionalEndDateStr,
        } as any);
      }

      // Create receipt for this booking payment
      try {
        await supabase.from('receipts').insert({
          booking_id: insertedData?.id,
          user_id: data.userId,
          cabin_id: data.cabinId,
          seat_id: data.seatId,
          amount: data.isAdvanceBooking && data.advancePaid ? data.advancePaid : data.totalPrice,
          payment_method: data.paymentMethod || 'cash',
          transaction_id: data.transactionId || '',
          collected_by: data.collectedBy || null,
          collected_by_name: data.collectedByName || '',
          receipt_type: 'booking_payment',
          notes: data.isAdvanceBooking ? 'Advance payment' : '',
          payment_proof_url: data.paymentProofUrl || null,
        } as any);
      } catch (e) {
        console.error('Receipt creation failed:', e);
      }

      // Auto-link student to partner
      try {
        const { getEffectiveOwnerId } = await import('@/utils/getEffectiveOwnerId');
        const { ownerId } = await getEffectiveOwnerId();
        await supabase.from('student_property_links').upsert(
          { student_user_id: data.userId, partner_user_id: ownerId },
          { onConflict: 'student_user_id,partner_user_id' }
        );
      } catch (e) {
        console.error('Auto-link student failed:', e);
      }

      return { success: true, serialNumber: insertedData?.serial_number || serialData || '' };
    } catch (error) {
      console.error('Error creating partner booking:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Failed' };
    }
  },

  // Block/unblock with reason and history
  toggleSeatAvailability: async (seatId: string, isAvailable: boolean, reason?: string, blockFrom?: string, blockTo?: string) => {
    try {
      // Only set is_available = false for permanent blocks (no date range)
      if (!isAvailable && blockFrom && blockTo) {
        // Date-range block: don't change is_available
      } else {
        const { error } = await supabase.from('seats').update({ is_available: isAvailable }).eq('id', seatId);
        if (error) throw error;
      }

      // Log to block history
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('seat_block_history').insert({
        seat_id: seatId,
        action: isAvailable ? 'unblocked' : 'blocked',
        reason: reason || '',
        performed_by: user?.id || null,
        block_from: blockFrom || null,
        block_to: blockTo || null,
      } as any);

      return { success: true, data: {} };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed' };
    }
  },

  getSeatBlockHistory: async (seatId: string): Promise<{ success: boolean; data?: BlockHistoryEntry[]; error?: string }> => {
    try {
      const { data, error } = await supabase
        .from('seat_block_history')
        .select('*')
        .eq('seat_id', seatId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      const entries: BlockHistoryEntry[] = (data || []).map((d: any) => ({
        id: d.id,
        action: d.action,
        reason: d.reason,
        performedBy: d.performed_by || '',
        createdAt: d.created_at,
        blockFrom: d.block_from || undefined,
        blockTo: d.block_to || undefined,
      }));

      return { success: true, data: entries };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed' };
    }
  },

  // Create student via edge function
  createStudent: async (name: string, email: string, phone: string): Promise<{ success: boolean; userId?: string; existing?: boolean; error?: string }> => {
    try {
      const { data, error } = await supabase.functions.invoke('create-student', {
        body: { name, email, phone },
      });

      if (error) throw error;
      if (data?.error) return { success: false, error: data.error };

      return { success: true, userId: data.userId, existing: data.existing };
    } catch (error) {
      console.error('Error creating student:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Failed' };
    }
  },

  updateSeatPrice: async (seatId: string, price: number) => {
    try {
      const { error } = await supabase.from('seats').update({ price }).eq('id', seatId);
      if (error) throw error;
      return { success: true, data: {} };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed' };
    }
  },

  // Legacy methods kept for compatibility
  getVendorSeats: async (filters?: SeatFilters) => {
    try {
      let query = supabase
        .from('seats')
        .select('*, cabins!inner(id, name)')
        .order('number');

      if (filters?.cabinId) query = query.eq('cabin_id', filters.cabinId);
      if (filters?.status === 'available') query = query.eq('is_available', true);
      else if (filters?.status === 'occupied') query = query.eq('is_available', false);

      const { data: seatsData, error } = await query;
      if (error) throw error;

      const seatIds = (seatsData || []).map(s => s.id);
      const today = new Date().toISOString().split('T')[0];
      let bookingsMap: Record<string, any> = {};
      let allBookingsMap: Record<string, SeatBookingDetail[]> = {};

      if (seatIds.length > 0) {
        const { data: bookings } = await supabase
          .from('bookings')
          .select('*, profiles!bookings_user_id_fkey(id, name, email, phone, profile_picture, serial_number, course_studying, college_studied, address, city, state, date_of_birth, gender)')
          .in('seat_id', seatIds)
          .eq('payment_status', 'completed')
          .gte('end_date', today)
          .order('start_date', { ascending: true });

        (bookings || []).forEach(b => {
          const detail = mapBookingToDetail(b);
          if (!allBookingsMap[b.seat_id!]) allBookingsMap[b.seat_id!] = [];
          allBookingsMap[b.seat_id!].push(detail);
          if (b.start_date && b.start_date <= today && b.end_date && b.end_date >= today) {
            const profile = b.profiles as any;
            bookingsMap[b.seat_id!] = {
              startDate: b.start_date, endDate: b.end_date,
              studentName: profile?.name || 'N/A', studentEmail: profile?.email || 'N/A',
              studentPhone: profile?.phone || 'N/A', profilePicture: profile?.profile_picture || '',
              userId: profile?.id || '',
            };
          }
        });
      }

      const mappedSeats: VendorSeat[] = (seatsData || []).map(seat => ({
        _id: seat.id, number: seat.number, cabinId: seat.cabin_id,
        cabinName: (seat.cabins as any)?.name || '',
        position: { x: Number(seat.position_x), y: Number(seat.position_y) },
        isAvailable: seat.is_available, price: Number(seat.price),
        category: seat.category, floor: seat.floor,
        unavailableUntil: seat.unavailable_until || undefined,
        currentBooking: bookingsMap[seat.id] || undefined,
        allBookings: allBookingsMap[seat.id] || [],
      }));

      return { success: true, data: { data: mappedSeats } };
    } catch (error) {
      console.error('Error fetching vendor seats:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Failed' };
    }
  },

  getCabinSeats: async (cabinId: string) => {
    return vendorSeatsService.getVendorSeats({ cabinId });
  },

  getSeatBookingDetails: async (seatId: string) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('bookings')
        .select('*, profiles!bookings_user_id_fkey(name, email, phone, profile_picture)')
        .eq('seat_id', seatId)
        .eq('payment_status', 'completed')
        .gte('end_date', today)
        .lte('start_date', today)
        .maybeSingle();
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed' };
    }
  },

  // ── Due Management Methods ──

  getAllDues: async (filters?: { cabinId?: string; status?: string; search?: string }) => {
    try {
      let query = supabase
        .from('dues')
        .select('*, profiles:user_id(name, email, phone), cabins:cabin_id(name), seats:seat_id(number, floor), bookings:booking_id(serial_number, start_date, end_date)')
        .order('created_at', { ascending: false });

      if (filters?.cabinId && filters.cabinId !== 'all') {
        query = query.eq('cabin_id', filters.cabinId);
      }
      const { data, error } = await query;
      if (error) throw error;

      let results = data || [];

      // Client-side status filter based on actual remaining amount
      if (filters?.status === 'pending') {
        results = results.filter((d: any) => (Number(d.due_amount) - Number(d.paid_amount)) > 0);
      } else if (filters?.status === 'paid') {
        results = results.filter((d: any) => (Number(d.due_amount) - Number(d.paid_amount)) <= 0 || d.status === 'paid');
      }

      if (filters?.search) {
        const q = filters.search.toLowerCase();
        results = results.filter((d: any) => {
          const name = (d.profiles as any)?.name?.toLowerCase() || '';
          const phone = (d.profiles as any)?.phone?.toLowerCase() || '';
          return name.includes(q) || phone.includes(q);
        });
      }

      return { success: true, data: results };
    } catch (error) {
      console.error('Error fetching dues:', error);
      return { success: false, data: [], error: error instanceof Error ? error.message : 'Failed' };
    }
  },

  getDueSummary: async () => {
    try {
      const { data: dues, error } = await supabase
        .from('dues')
        .select('due_amount, paid_amount, status, due_date');
      if (error) throw error;

      const today = new Date().toISOString().split('T')[0];
      const totalDue = (dues || []).filter(d => d.status !== 'paid' && d.status !== 'cancelled').reduce((s, d) => s + Number(d.due_amount) - Number(d.paid_amount), 0);
      const overdue = (dues || []).filter(d => d.due_date < today && d.status !== 'paid' && d.status !== 'cancelled').reduce((s, d) => s + Number(d.due_amount) - Number(d.paid_amount), 0);
      const dueToday = (dues || []).filter(d => d.due_date === today && d.status !== 'paid' && d.status !== 'cancelled').reduce((s, d) => s + Number(d.due_amount) - Number(d.paid_amount), 0);

      const monthStart = new Date();
      monthStart.setDate(1);
      const { data: payments } = await supabase
        .from('due_payments')
        .select('amount')
        .gte('created_at', monthStart.toISOString());
      const collectedThisMonth = (payments || []).reduce((s, p) => s + Number(p.amount), 0);

      return { success: true, data: { totalDue, overdue, dueToday, collectedThisMonth } };
    } catch (error) {
      return { success: false, data: { totalDue: 0, overdue: 0, dueToday: 0, collectedThisMonth: 0 } };
    }
  },

  collectDuePayment: async (dueId: string, amount: number, paymentMethod: string, txnId: string, notes: string, paymentProofUrl?: string) => {
    try {
      // Duplicate transaction ID check for non-cash methods
      if (paymentMethod !== 'cash' && txnId && txnId.trim()) {
        const { data: isDuplicate } = await supabase.rpc('check_duplicate_transaction_id', { p_txn_id: txnId.trim() });
        if (isDuplicate) {
          return { success: false, error: 'This Transaction ID has already been used. Please enter a unique Transaction ID.' };
        }
      }

      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase.from('profiles').select('name').eq('id', user?.id || '').single();

      await supabase.from('due_payments').insert({
        due_id: dueId,
        amount,
        payment_method: paymentMethod,
        transaction_id: txnId || '',
        collected_by: user?.id || null,
        collected_by_name: profile?.name || '',
        notes: notes || '',
        payment_proof_url: paymentProofUrl || null,
      } as any);

      const { data: due, error: dueError } = await supabase
        .from('dues')
        .select('*, bookings:booking_id(start_date, end_date)')
        .eq('id', dueId)
        .single();
      if (dueError) throw dueError;

      const newPaidAmount = Number(due.paid_amount) + amount;
      const remaining = Number(due.due_amount) - newPaidAmount;
      let newStatus = remaining <= 0 ? 'paid' : 'partially_paid';

      const totalPaid = Number(due.advance_paid) + newPaidAmount;
      const booking = due.bookings as any;
      // Validity always spans the full booking period
      let proportionalEndDate = booking?.end_date || due.proportional_end_date;

      await supabase.from('dues').update({
        paid_amount: newPaidAmount,
        status: newStatus,
        proportional_end_date: proportionalEndDate,
      } as any).eq('id', dueId);

      if (remaining <= 0 && due.booking_id) {
        await supabase.from('bookings').update({ payment_status: 'completed' }).eq('id', due.booking_id);
      }

      // Create receipt for due collection
      try {
        await supabase.from('receipts').insert({
          booking_id: due.booking_id || null,
          due_id: dueId,
          user_id: due.user_id,
          cabin_id: due.cabin_id,
          seat_id: due.seat_id,
          amount,
          payment_method: paymentMethod,
          transaction_id: txnId || '',
          collected_by: user?.id || null,
          collected_by_name: profile?.name || '',
          receipt_type: 'due_collection',
          notes: notes || '',
          payment_proof_url: paymentProofUrl || null,
        } as any);
      } catch (e) {
        console.error('Receipt creation failed:', e);
      }

      return { success: true };
    } catch (error) {
      console.error('Error collecting payment:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Failed' };
    }
  },

  getDuePayments: async (dueId: string) => {
    try {
      const { data, error } = await supabase
        .from('due_payments')
        .select('*')
        .eq('due_id', dueId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return { success: true, data: data || [] };
    } catch (error) {
      return { success: false, data: [] };
    }
  },

  getStudentDues: async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('dues')
        .select('*, cabins:cabin_id(name), seats:seat_id(number, floor)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return { success: true, data: data || [] };
    } catch (error) {
      return { success: false, data: [] };
    }
  },

  getDueForBooking: async (bookingId: string) => {
    try {
      const { data, error } = await supabase
        .from('dues')
        .select('*')
        .eq('booking_id', bookingId)
        .maybeSingle();
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      return { success: false, data: null };
    }
  },

  releaseSeat: async (bookingId: string, serialNumber?: string, reason?: string) => {
    try {
      const { error } = await supabase.from('bookings').update({
        payment_status: 'terminated',
        end_date: new Date().toISOString().split('T')[0],
      }).eq('id', bookingId);
      if (error) throw error;
      // Log activity
      const { logBookingActivity } = await import('@/api/bookingActivityLogService');
      await logBookingActivity({ bookingId, bookingType: 'cabin', activityType: 'released', serialNumber, details: { reason: reason || '' } });
      return { success: true };
    } catch (error) {
      console.error('Error releasing seat:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Failed' };
    }
  },

  cancelBooking: async (bookingId: string, serialNumber?: string, reason?: string) => {
    try {
      const { error } = await supabase.from('bookings').update({
        payment_status: 'cancelled',
      }).eq('id', bookingId);
      if (error) throw error;
      // Cancel pending dues (don't delete)
      await supabase.from('dues').update({
        status: 'cancelled',
      }).eq('booking_id', bookingId).eq('status', 'pending');
      // Log activity
      const { logBookingActivity } = await import('@/api/bookingActivityLogService');
      await logBookingActivity({ bookingId, bookingType: 'cabin', activityType: 'cancelled', serialNumber, details: { reason: reason || '' } });
      return { success: true };
    } catch (error) {
      console.error('Error cancelling booking:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Failed' };
    }
  },

  transferBooking: async (bookingId: string, newSeatId: string, newCabinId: string, newSeatNumber: number, oldSeatNumber?: number, serialNumber?: string) => {
    try {
      // Fetch booking dates first
      const { data: booking, error: bkErr } = await supabase
        .from('bookings')
        .select('start_date, end_date')
        .eq('id', bookingId)
        .single();
      if (bkErr) throw bkErr;

      // Check target seat for overlapping bookings
      const { data: overlap } = await supabase
        .from('bookings')
        .select('id')
        .eq('seat_id', newSeatId)
        .in('payment_status', ['completed', 'advance_paid'])
        .lte('start_date', booking.end_date)
        .gte('end_date', booking.start_date)
        .limit(1);

      if (overlap && overlap.length > 0) {
        return { success: false, error: 'Target seat has an existing booking for those dates' };
      }

      const { error: bookingError } = await supabase
        .from('bookings')
        .update({ seat_id: newSeatId, cabin_id: newCabinId, seat_number: newSeatNumber })
        .eq('id', bookingId);
      if (bookingError) throw bookingError;

      // Update dues record if exists
      await supabase
        .from('dues')
        .update({ seat_id: newSeatId, cabin_id: newCabinId } as any)
        .eq('booking_id', bookingId);

      // Log activity
      const { logBookingActivity } = await import('@/api/bookingActivityLogService');
      await logBookingActivity({
        bookingId, bookingType: 'cabin', activityType: 'transferred', serialNumber,
        details: { old_seat_number: oldSeatNumber, new_seat_number: newSeatNumber },
      });

      return { success: true };
    } catch (error) {
      console.error('Error transferring booking:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Failed' };
    }
  },
};

export const partnerSeatsService = vendorSeatsService;
