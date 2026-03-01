import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format, subMonths, startOfMonth, endOfMonth, differenceInDays } from 'date-fns';

export interface PerformanceFilters {
  month: number;
  year: number;
  propertyId?: string;
  propertyType?: 'all' | 'reading_room' | 'hostel';
}

export interface MonthlyTrend {
  month: string;
  label: string;
  revenue: number;
  occupancy: number;
  deposits: number;
  dues: number;
}

export interface FloorPerformance {
  floorName: string;
  occupancy: number;
  revenue: number;
  totalBeds: number;
  occupiedBeds: number;
}

export interface PerformanceData {
  // Summary
  totalSeats: number;
  occupiedSeats: number;
  occupancyPercent: number;
  totalCollections: number;
  feesCollected: number;
  depositsCollected: number;
  pendingDues: number;
  pendingRefunds: number;
  netEarnings: number;
  // Previous month comparison
  prevCollections: number;
  prevOccupancy: number;
  prevNetEarnings: number;
  prevDues: number;
  // Revenue breakdown
  roomFees: number;
  foodCollection: number;
  depositCollection: number;
  otherCharges: number;
  totalRevenue: number;
  prevRoomFees: number;
  prevFoodCollection: number;
  prevDepositCollection: number;
  prevOtherCharges: number;
  prevTotalRevenue: number;
  // Dues
  totalStudentsWithDues: number;
  totalDuesAmount: number;
  overdueGt7: number;
  overdueGt30: number;
  refundsPending: number;
  refundsProcessed: number;
  // Trends
  monthlyTrends: MonthlyTrend[];
  // Floor performance
  floorPerformance: FloorPerformance[];
  bestFloor: string;
  worstFloor: string;
  // Settlement
  grossCollection: number;
  platformCommission: number;
  paidSettlements: number;
  pendingSettlement: number;
  // Students
  activeStudents: number;
  newAdmissions: number;
  renewals: number;
  dropouts: number;
  avgStayDuration: number;
  // Reading room specific
  hasReadingRooms: boolean;
  readingRoomActiveMembers: number;
  readingRoomDueMembers: number;
  // Properties
  properties: { id: string; name: string; type: 'reading_room' | 'hostel' }[];
}

const defaultData: PerformanceData = {
  totalSeats: 0, occupiedSeats: 0, occupancyPercent: 0,
  totalCollections: 0, feesCollected: 0, depositsCollected: 0,
  pendingDues: 0, pendingRefunds: 0, netEarnings: 0,
  prevCollections: 0, prevOccupancy: 0, prevNetEarnings: 0, prevDues: 0,
  roomFees: 0, foodCollection: 0, depositCollection: 0, otherCharges: 0, totalRevenue: 0,
  prevRoomFees: 0, prevFoodCollection: 0, prevDepositCollection: 0, prevOtherCharges: 0, prevTotalRevenue: 0,
  totalStudentsWithDues: 0, totalDuesAmount: 0, overdueGt7: 0, overdueGt30: 0,
  refundsPending: 0, refundsProcessed: 0,
  monthlyTrends: [],
  floorPerformance: [], bestFloor: '-', worstFloor: '-',
  grossCollection: 0, platformCommission: 0, paidSettlements: 0, pendingSettlement: 0,
  activeStudents: 0, newAdmissions: 0, renewals: 0, dropouts: 0, avgStayDuration: 0,
  hasReadingRooms: false, readingRoomActiveMembers: 0, readingRoomDueMembers: 0,
  properties: [],
};

export function usePartnerPerformance(filters: PerformanceFilters) {
  const { user } = useAuth();
  const today = new Date();
  const currentStart = startOfMonth(new Date(filters.year, filters.month));
  const currentEnd = endOfMonth(currentStart);
  const prevStart = startOfMonth(subMonths(currentStart, 1));
  const prevEnd = endOfMonth(prevStart);
  const todayStr = format(today, 'yyyy-MM-dd');
  const currentStartStr = format(currentStart, 'yyyy-MM-dd');
  const currentEndStr = format(currentEnd, 'yyyy-MM-dd');
  const prevStartStr = format(prevStart, 'yyyy-MM-dd');
  const prevEndStr = format(prevEnd, 'yyyy-MM-dd');
  const trend12Start = format(subMonths(currentStart, 11), 'yyyy-MM-dd');

  return useQuery({
    queryKey: ['partner-performance', filters.month, filters.year, filters.propertyId, filters.propertyType, user?.id],
    queryFn: async (): Promise<PerformanceData> => {
      if (!user?.id) return defaultData;

      // 1. Get partner
      const { data: partner } = await supabase
        .from('partners')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      // 2. Get partner's properties
      const [cabinsRes, hostelsRes] = await Promise.all([
        supabase.from('cabins').select('id, name').eq('created_by', user.id),
        supabase.from('hostels').select('id, name').eq('created_by', user.id),
      ]);

      const cabins = cabinsRes.data || [];
      const hostels = hostelsRes.data || [];
      const cabinIds = cabins.map(c => c.id);
      const hostelIds = hostels.map(h => h.id);
      const properties = [
        ...cabins.map(c => ({ id: c.id, name: c.name, type: 'reading_room' as const })),
        ...hostels.map(h => ({ id: h.id, name: h.name, type: 'hostel' as const })),
      ];

      if (cabinIds.length === 0 && hostelIds.length === 0) {
        return { ...defaultData, properties };
      }

      // Apply property filter
      const filteredCabinIds = filters.propertyId
        ? cabinIds.filter(id => id === filters.propertyId)
        : (filters.propertyType === 'hostel' ? [] : cabinIds);
      const filteredHostelIds = filters.propertyId
        ? hostelIds.filter(id => id === filters.propertyId)
        : (filters.propertyType === 'reading_room' ? [] : hostelIds);

      // 3. Run all queries in parallel
      const queries = await Promise.all([
        // Seats count for reading rooms
        filteredCabinIds.length > 0
          ? supabase.from('seats').select('id, cabin_id, is_available').in('cabin_id', filteredCabinIds)
          : Promise.resolve({ data: [] }),
        // Active reading room bookings (occupied seats today)
        filteredCabinIds.length > 0
          ? supabase.from('bookings').select('id, seat_id, cabin_id, start_date, end_date, total_price, created_at, user_id')
            .in('cabin_id', filteredCabinIds).eq('payment_status', 'completed')
            .lte('start_date', todayStr).gte('end_date', todayStr)
          : Promise.resolve({ data: [] }),
        // Hostel beds
        filteredHostelIds.length > 0
          ? supabase.from('hostel_beds').select('id, room_id').in('room_id',
            (await supabase.from('hostel_rooms').select('id').in('hostel_id', filteredHostelIds)).data?.map(r => r.id) || [])
          : Promise.resolve({ data: [] }),
        // Active hostel bookings
        filteredHostelIds.length > 0
          ? supabase.from('hostel_bookings').select('id, bed_id, hostel_id, start_date, end_date, total_price, food_amount, security_deposit, created_at, user_id, status')
            .in('hostel_id', filteredHostelIds).in('status', ['confirmed', 'checked_in'])
            .lte('start_date', todayStr).gte('end_date', todayStr)
          : Promise.resolve({ data: [] }),
        // Reading room receipts current month
        filteredCabinIds.length > 0
          ? supabase.from('receipts').select('amount, receipt_type, created_at')
            .in('cabin_id', filteredCabinIds)
            .gte('created_at', currentStartStr).lte('created_at', currentEndStr + 'T23:59:59')
          : Promise.resolve({ data: [] }),
        // Reading room receipts prev month
        filteredCabinIds.length > 0
          ? supabase.from('receipts').select('amount, receipt_type, created_at')
            .in('cabin_id', filteredCabinIds)
            .gte('created_at', prevStartStr).lte('created_at', prevEndStr + 'T23:59:59')
          : Promise.resolve({ data: [] }),
        // Hostel receipts current month
        filteredHostelIds.length > 0
          ? supabase.from('hostel_receipts').select('amount, receipt_type, created_at')
            .in('hostel_id', filteredHostelIds)
            .gte('created_at', currentStartStr).lte('created_at', currentEndStr + 'T23:59:59')
          : Promise.resolve({ data: [] }),
        // Hostel receipts prev month
        filteredHostelIds.length > 0
          ? supabase.from('hostel_receipts').select('amount, receipt_type, created_at')
            .in('hostel_id', filteredHostelIds)
            .gte('created_at', prevStartStr).lte('created_at', prevEndStr + 'T23:59:59')
          : Promise.resolve({ data: [] }),
        // Dues (reading room)
        filteredCabinIds.length > 0
          ? supabase.from('dues').select('id, due_amount, paid_amount, due_date, status, user_id')
            .in('cabin_id', filteredCabinIds).in('status', ['pending', 'partial'])
          : Promise.resolve({ data: [] }),
        // Hostel dues
        filteredHostelIds.length > 0
          ? supabase.from('hostel_dues').select('id, due_amount, paid_amount, due_date, status, user_id')
            .in('hostel_id', filteredHostelIds).in('status', ['pending', 'partial'])
          : Promise.resolve({ data: [] }),
        // Settlements
        partner?.id
          ? supabase.from('partner_settlements').select('total_collected, commission_amount, net_payable, status')
            .eq('partner_id', partner.id)
          : Promise.resolve({ data: [] }),
        // Reading room receipts last 12 months (for trends)
        filteredCabinIds.length > 0
          ? supabase.from('receipts').select('amount, receipt_type, created_at')
            .in('cabin_id', filteredCabinIds)
            .gte('created_at', trend12Start)
          : Promise.resolve({ data: [] }),
        // Hostel receipts last 12 months
        filteredHostelIds.length > 0
          ? supabase.from('hostel_receipts').select('amount, receipt_type, created_at')
            .in('hostel_id', filteredHostelIds)
            .gte('created_at', trend12Start)
          : Promise.resolve({ data: [] }),
        // All bookings this month (reading room) - for new admissions
        filteredCabinIds.length > 0
          ? supabase.from('bookings').select('id, user_id, start_date, end_date, created_at')
            .in('cabin_id', filteredCabinIds).eq('payment_status', 'completed')
            .gte('created_at', currentStartStr).lte('created_at', currentEndStr + 'T23:59:59')
          : Promise.resolve({ data: [] }),
        // All hostel bookings this month
        filteredHostelIds.length > 0
          ? supabase.from('hostel_bookings').select('id, user_id, start_date, end_date, created_at, status')
            .in('hostel_id', filteredHostelIds).in('status', ['confirmed', 'checked_in'])
            .gte('created_at', currentStartStr).lte('created_at', currentEndStr + 'T23:59:59')
          : Promise.resolve({ data: [] }),
        // Hostel rooms for floor performance
        filteredHostelIds.length > 0
          ? supabase.from('hostel_rooms').select('id, room_number, floor, hostel_id, floor_id')
            .in('hostel_id', filteredHostelIds)
          : Promise.resolve({ data: [] }),
        // Hostel floors
        filteredHostelIds.length > 0
          ? supabase.from('hostel_floors').select('id, name, hostel_id')
            .in('hostel_id', filteredHostelIds)
          : Promise.resolve({ data: [] }),
        // Previous month bookings occupancy (reading room)
        filteredCabinIds.length > 0
          ? supabase.from('bookings').select('id, seat_id')
            .in('cabin_id', filteredCabinIds).eq('payment_status', 'completed')
            .lte('start_date', prevEndStr).gte('end_date', prevStartStr)
          : Promise.resolve({ data: [] }),
        // Previous month hostel bookings occupancy
        filteredHostelIds.length > 0
          ? supabase.from('hostel_bookings').select('id, bed_id')
            .in('hostel_id', filteredHostelIds).in('status', ['confirmed', 'checked_in'])
            .lte('start_date', prevEndStr).gte('end_date', prevStartStr)
          : Promise.resolve({ data: [] }),
      ]);

      const [
        seatsRes, activeBookingsRes, hostelBedsRes, activeHostelBookingsRes,
        rrReceiptsCurrentRes, rrReceiptsPrevRes, hReceiptsCurrentRes, hReceiptsPrevRes,
        rrDuesRes, hDuesRes, settlementsRes,
        rrReceipts12Res, hReceipts12Res,
        rrNewBookingsRes, hNewBookingsRes,
        hostelRoomsRes, hostelFloorsRes,
        prevRRBookingsRes, prevHBookingsRes,
      ] = queries;

      const seats = (seatsRes as any).data || [];
      const activeBookings = (activeBookingsRes as any).data || [];
      const hostelBeds = (hostelBedsRes as any).data || [];
      const activeHostelBookings = (activeHostelBookingsRes as any).data || [];

      // Summary
      const totalSeats = seats.length + hostelBeds.length;
      const occupiedRR = new Set(activeBookings.map((b: any) => b.seat_id)).size;
      const occupiedHostel = new Set(activeHostelBookings.map((b: any) => b.bed_id)).size;
      const occupiedSeats = occupiedRR + occupiedHostel;
      const occupancyPercent = totalSeats > 0 ? Math.round((occupiedSeats / totalSeats) * 100) : 0;

      // Previous occupancy
      const prevOccupiedRR = new Set(((prevRRBookingsRes as any).data || []).map((b: any) => b.seat_id)).size;
      const prevOccupiedHostel = new Set(((prevHBookingsRes as any).data || []).map((b: any) => b.bed_id)).size;
      const prevOccupancy = totalSeats > 0 ? Math.round(((prevOccupiedRR + prevOccupiedHostel) / totalSeats) * 100) : 0;

      // Revenue aggregation helper
      const sumReceipts = (data: any[], type?: string) =>
        (data || []).filter(r => !type || r.receipt_type === type).reduce((s, r) => s + (r.amount || 0), 0);

      const rrCurrent = (rrReceiptsCurrentRes as any).data || [];
      const rrPrev = (rrReceiptsPrevRes as any).data || [];
      const hCurrent = (hReceiptsCurrentRes as any).data || [];
      const hPrev = (hReceiptsPrevRes as any).data || [];

      const roomFees = sumReceipts(rrCurrent, 'booking_payment') + sumReceipts(hCurrent, 'booking_payment');
      const foodCollection = sumReceipts(hCurrent, 'food_payment');
      const depositCollection = sumReceipts(rrCurrent, 'deposit') + sumReceipts(hCurrent, 'deposit') +
        sumReceipts(rrCurrent, 'security_deposit') + sumReceipts(hCurrent, 'security_deposit');
      const otherCharges = sumReceipts(rrCurrent, 'due_payment') + sumReceipts(hCurrent, 'due_payment');
      const totalRevenue = sumReceipts(rrCurrent) + sumReceipts(hCurrent);
      const feesCollected = roomFees;
      const depositsCollected = depositCollection;
      const totalCollections = totalRevenue;

      const prevRoomFees = sumReceipts(rrPrev, 'booking_payment') + sumReceipts(hPrev, 'booking_payment');
      const prevFoodCollection = sumReceipts(hPrev, 'food_payment');
      const prevDepositCollection = sumReceipts(rrPrev, 'deposit') + sumReceipts(hPrev, 'deposit') +
        sumReceipts(rrPrev, 'security_deposit') + sumReceipts(hPrev, 'security_deposit');
      const prevOtherCharges = sumReceipts(rrPrev, 'due_payment') + sumReceipts(hPrev, 'due_payment');
      const prevTotalRevenue = sumReceipts(rrPrev) + sumReceipts(hPrev);
      const prevCollections = prevTotalRevenue;

      // Dues
      const allDues = [...((rrDuesRes as any).data || []), ...((hDuesRes as any).data || [])];
      const totalStudentsWithDues = new Set(allDues.map(d => d.user_id)).size;
      const totalDuesAmount = allDues.reduce((s, d) => s + ((d.due_amount || 0) - (d.paid_amount || 0)), 0);
      const pendingDues = totalDuesAmount;
      const now = new Date();
      const overdueGt7 = allDues.filter(d => differenceInDays(now, new Date(d.due_date)) > 7).length;
      const overdueGt30 = allDues.filter(d => differenceInDays(now, new Date(d.due_date)) > 30).length;

      // Refunds (from bookings with locker refund data)
      const refundsPending = 0; // Would need locker_refunded=false checks
      const refundsProcessed = 0;

      // Settlements
      const settlements = (settlementsRes as any).data || [];
      const grossCollection = settlements.reduce((s: number, st: any) => s + (st.total_collected || 0), 0);
      const platformCommission = settlements.reduce((s: number, st: any) => s + (st.commission_amount || 0), 0);
      const netEarnings = settlements.reduce((s: number, st: any) => s + (st.net_payable || 0), 0);
      const paidSettlements = settlements.filter((s: any) => s.status === 'paid').reduce((sum: number, s: any) => sum + (s.net_payable || 0), 0);
      const pendingSettlement = settlements.filter((s: any) => s.status !== 'paid').reduce((sum: number, s: any) => sum + (s.net_payable || 0), 0);

      const prevNetEarnings = 0; // Simplified
      const prevDues = 0;

      // Monthly trends (12 months)
      const allReceipts12 = [...((rrReceipts12Res as any).data || []), ...((hReceipts12Res as any).data || [])];
      const trendMap = new Map<string, MonthlyTrend>();
      for (let i = 11; i >= 0; i--) {
        const m = subMonths(currentStart, i);
        const key = format(m, 'yyyy-MM');
        trendMap.set(key, { month: key, label: format(m, 'MMM yy'), revenue: 0, occupancy: 0, deposits: 0, dues: 0 });
      }
      allReceipts12.forEach((r: any) => {
        const key = format(new Date(r.created_at), 'yyyy-MM');
        const entry = trendMap.get(key);
        if (entry) {
          entry.revenue += r.amount || 0;
          if (r.receipt_type === 'deposit' || r.receipt_type === 'security_deposit') {
            entry.deposits += r.amount || 0;
          }
        }
      });
      const monthlyTrends = Array.from(trendMap.values());

      // Floor performance
      const hostelRooms = (hostelRoomsRes as any).data || [];
      const hostelFloors = (hostelFloorsRes as any).data || [];
      const floorMap = new Map<string, FloorPerformance>();
      hostelFloors.forEach((f: any) => {
        floorMap.set(f.id, { floorName: f.name, occupancy: 0, revenue: 0, totalBeds: 0, occupiedBeds: 0 });
      });
      // Count beds per floor
      const roomFloorMap = new Map<string, string>();
      hostelRooms.forEach((r: any) => { if (r.floor_id) roomFloorMap.set(r.id, r.floor_id); });
      hostelBeds.forEach((b: any) => {
        const floorId = roomFloorMap.get(b.room_id);
        if (floorId && floorMap.has(floorId)) {
          floorMap.get(floorId)!.totalBeds++;
        }
      });
      activeHostelBookings.forEach((bk: any) => {
        const bed = hostelBeds.find((b: any) => b.id === bk.bed_id);
        if (bed) {
          const floorId = roomFloorMap.get(bed.room_id);
          if (floorId && floorMap.has(floorId)) {
            floorMap.get(floorId)!.occupiedBeds++;
          }
        }
      });
      const floorPerformance = Array.from(floorMap.values()).map(fp => ({
        ...fp,
        occupancy: fp.totalBeds > 0 ? Math.round((fp.occupiedBeds / fp.totalBeds) * 100) : 0,
      }));
      const bestFloor = floorPerformance.length > 0
        ? floorPerformance.reduce((a, b) => a.occupancy > b.occupancy ? a : b).floorName : '-';
      const worstFloor = floorPerformance.length > 0
        ? floorPerformance.reduce((a, b) => a.occupancy < b.occupancy ? a : b).floorName : '-';

      // Student insights
      const newRRBookings = (rrNewBookingsRes as any).data || [];
      const newHBookings = (hNewBookingsRes as any).data || [];
      const newAdmissions = newRRBookings.length + newHBookings.length;
      const activeStudents = occupiedSeats;
      const allActiveBookings = [...activeBookings, ...activeHostelBookings];
      const avgStayDuration = allActiveBookings.length > 0
        ? Math.round(allActiveBookings.reduce((s: number, b: any) =>
          s + differenceInDays(new Date(b.end_date), new Date(b.start_date)), 0) / allActiveBookings.length)
        : 0;

      return {
        totalSeats, occupiedSeats, occupancyPercent,
        totalCollections, feesCollected, depositsCollected,
        pendingDues, pendingRefunds: refundsPending, netEarnings,
        prevCollections, prevOccupancy, prevNetEarnings, prevDues,
        roomFees, foodCollection, depositCollection, otherCharges, totalRevenue,
        prevRoomFees, prevFoodCollection, prevDepositCollection, prevOtherCharges, prevTotalRevenue,
        totalStudentsWithDues, totalDuesAmount, overdueGt7, overdueGt30,
        refundsPending, refundsProcessed,
        monthlyTrends, floorPerformance, bestFloor, worstFloor,
        grossCollection, platformCommission, paidSettlements, pendingSettlement,
        activeStudents, newAdmissions, renewals: 0, dropouts: 0, avgStayDuration,
        hasReadingRooms: cabinIds.length > 0,
        readingRoomActiveMembers: occupiedRR,
        readingRoomDueMembers: ((rrDuesRes as any).data || []).length,
        properties,
      };
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });
}
