import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format, subMonths, subDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek, startOfYear, endOfYear, differenceInDays } from 'date-fns';

export interface PerformanceFilters {
  dateFilter: string; // today, yesterday, 7days, this_week, this_month, last_month, this_year, last_year, custom, all
  startDate?: Date;
  endDate?: Date;
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

export interface CollectionsByMethod {
  [key: string]: number;
}

export interface PerformanceData {
  totalSeats: number;
  occupiedSeats: number;
  occupancyPercent: number;
  totalCollections: number;
  feesCollected: number;
  depositsCollected: number;
  pendingDues: number;
  pendingRefunds: number;
  netEarnings: number;
  prevCollections: number;
  prevOccupancy: number;
  prevNetEarnings: number;
  prevDues: number;
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
  totalStudentsWithDues: number;
  totalDuesAmount: number;
  overdueGt7: number;
  overdueGt30: number;
  refundsPending: number;
  refundsProcessed: number;
  monthlyTrends: MonthlyTrend[];
  floorPerformance: FloorPerformance[];
  bestFloor: string;
  worstFloor: string;
  grossCollection: number;
  platformCommission: number;
  paidSettlements: number;
  pendingSettlement: number;
  activeStudents: number;
  newAdmissions: number;
  renewals: number;
  dropouts: number;
  avgStayDuration: number;
  hasReadingRooms: boolean;
  readingRoomActiveMembers: number;
  readingRoomDueMembers: number;
  properties: { id: string; name: string; type: 'reading_room' | 'hostel' }[];
  collectionsByMethod: CollectionsByMethod;
  prevCollectionsByMethod: CollectionsByMethod;
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
  collectionsByMethod: {},
  prevCollectionsByMethod: {},
};

function getDateRange(filter: string, startDate?: Date, endDate?: Date): { start: Date; end: Date } {
  const today = new Date();
  switch (filter) {
    case 'today':
      return { start: today, end: today };
    case 'yesterday': {
      const y = subDays(today, 1);
      return { start: y, end: y };
    }
    case '7days':
      return { start: subDays(today, 6), end: today };
    case 'this_week':
      return { start: startOfWeek(today, { weekStartsOn: 1 }), end: endOfWeek(today, { weekStartsOn: 1 }) };
    case 'this_month':
      return { start: startOfMonth(today), end: endOfMonth(today) };
    case 'last_month': {
      const lm = subMonths(today, 1);
      return { start: startOfMonth(lm), end: endOfMonth(lm) };
    }
    case 'this_year':
      return { start: startOfYear(today), end: endOfYear(today) };
    case 'last_year': {
      const ly = new Date(today.getFullYear() - 1, 0, 1);
      return { start: startOfYear(ly), end: endOfYear(ly) };
    }
    case 'custom':
      return { start: startDate || startOfMonth(today), end: endDate || endOfMonth(today) };
    default: // 'all'
      return { start: new Date(2020, 0, 1), end: today };
  }
}

function getPreviousRange(start: Date, end: Date): { start: Date; end: Date } {
  const days = differenceInDays(end, start) + 1;
  return { start: subDays(start, days), end: subDays(start, 1) };
}

export function usePartnerPerformance(filters: PerformanceFilters) {
  const { user } = useAuth();
  const today = new Date();
  const { start: currentStart, end: currentEnd } = getDateRange(filters.dateFilter, filters.startDate, filters.endDate);
  const { start: prevStart, end: prevEnd } = getPreviousRange(currentStart, currentEnd);
  const todayStr = format(today, 'yyyy-MM-dd');
  const currentStartStr = format(currentStart, 'yyyy-MM-dd');
  const currentEndStr = format(currentEnd, 'yyyy-MM-dd');
  const prevStartStr = format(prevStart, 'yyyy-MM-dd');
  const prevEndStr = format(prevEnd, 'yyyy-MM-dd');
  const trend12Start = format(subMonths(currentStart, 11), 'yyyy-MM-dd');

  return useQuery({
    queryKey: ['partner-performance', filters.dateFilter, currentStartStr, currentEndStr, filters.propertyId, filters.propertyType, user?.id],
    queryFn: async (): Promise<PerformanceData> => {
      if (!user?.id) return defaultData;

      const { data: partner } = await supabase
        .from('partners')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

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

      const filteredCabinIds = filters.propertyId
        ? cabinIds.filter(id => id === filters.propertyId)
        : (filters.propertyType === 'hostel' ? [] : cabinIds);
      const filteredHostelIds = filters.propertyId
        ? hostelIds.filter(id => id === filters.propertyId)
        : (filters.propertyType === 'reading_room' ? [] : hostelIds);

      const queries = await Promise.all([
        // 0: Seats count
        filteredCabinIds.length > 0
          ? supabase.from('seats').select('id, cabin_id, is_available').in('cabin_id', filteredCabinIds)
          : Promise.resolve({ data: [] }),
        // 1: Active reading room bookings (occupied today)
        filteredCabinIds.length > 0
          ? supabase.from('bookings').select('id, seat_id, cabin_id, start_date, end_date, total_price, created_at, user_id')
            .in('cabin_id', filteredCabinIds).eq('payment_status', 'completed')
            .lte('start_date', todayStr).gte('end_date', todayStr)
          : Promise.resolve({ data: [] }),
        // 2: Hostel beds
        filteredHostelIds.length > 0
          ? supabase.from('hostel_beds').select('id, room_id').in('room_id',
            (await supabase.from('hostel_rooms').select('id').in('hostel_id', filteredHostelIds)).data?.map(r => r.id) || [])
          : Promise.resolve({ data: [] }),
        // 3: Active hostel bookings
        filteredHostelIds.length > 0
          ? supabase.from('hostel_bookings').select('id, bed_id, hostel_id, start_date, end_date, total_price, food_amount, security_deposit, created_at, user_id, status')
            .in('hostel_id', filteredHostelIds).in('status', ['confirmed', 'checked_in'])
            .lte('start_date', todayStr).gte('end_date', todayStr)
          : Promise.resolve({ data: [] }),
        // 4: RR receipts current period (with payment_method)
        filteredCabinIds.length > 0
          ? supabase.from('receipts').select('amount, receipt_type, created_at, payment_method')
            .in('cabin_id', filteredCabinIds)
            .gte('created_at', currentStartStr).lte('created_at', currentEndStr + 'T23:59:59')
          : Promise.resolve({ data: [] }),
        // 5: RR receipts prev period
        filteredCabinIds.length > 0
          ? supabase.from('receipts').select('amount, receipt_type, created_at, payment_method')
            .in('cabin_id', filteredCabinIds)
            .gte('created_at', prevStartStr).lte('created_at', prevEndStr + 'T23:59:59')
          : Promise.resolve({ data: [] }),
        // 6: Hostel receipts current period
        filteredHostelIds.length > 0
          ? supabase.from('hostel_receipts').select('amount, receipt_type, created_at, payment_method')
            .in('hostel_id', filteredHostelIds)
            .gte('created_at', currentStartStr).lte('created_at', currentEndStr + 'T23:59:59')
          : Promise.resolve({ data: [] }),
        // 7: Hostel receipts prev period
        filteredHostelIds.length > 0
          ? supabase.from('hostel_receipts').select('amount, receipt_type, created_at, payment_method')
            .in('hostel_id', filteredHostelIds)
            .gte('created_at', prevStartStr).lte('created_at', prevEndStr + 'T23:59:59')
          : Promise.resolve({ data: [] }),
        // 8: Dues (RR)
        filteredCabinIds.length > 0
          ? supabase.from('dues').select('id, due_amount, paid_amount, due_date, status, user_id')
            .in('cabin_id', filteredCabinIds).in('status', ['pending', 'partial'])
          : Promise.resolve({ data: [] }),
        // 9: Hostel dues
        filteredHostelIds.length > 0
          ? supabase.from('hostel_dues').select('id, due_amount, paid_amount, due_date, status, user_id')
            .in('hostel_id', filteredHostelIds).in('status', ['pending', 'partial'])
          : Promise.resolve({ data: [] }),
        // 10: Settlements
        partner?.id
          ? supabase.from('partner_settlements').select('total_collected, commission_amount, net_payable, status')
            .eq('partner_id', partner.id)
          : Promise.resolve({ data: [] }),
        // 11: RR receipts 12 months
        filteredCabinIds.length > 0
          ? supabase.from('receipts').select('amount, receipt_type, created_at')
            .in('cabin_id', filteredCabinIds)
            .gte('created_at', trend12Start)
          : Promise.resolve({ data: [] }),
        // 12: Hostel receipts 12 months
        filteredHostelIds.length > 0
          ? supabase.from('hostel_receipts').select('amount, receipt_type, created_at')
            .in('hostel_id', filteredHostelIds)
            .gte('created_at', trend12Start)
          : Promise.resolve({ data: [] }),
        // 13: RR bookings this period
        filteredCabinIds.length > 0
          ? supabase.from('bookings').select('id, user_id, start_date, end_date, created_at')
            .in('cabin_id', filteredCabinIds).eq('payment_status', 'completed')
            .gte('created_at', currentStartStr).lte('created_at', currentEndStr + 'T23:59:59')
          : Promise.resolve({ data: [] }),
        // 14: Hostel bookings this period
        filteredHostelIds.length > 0
          ? supabase.from('hostel_bookings').select('id, user_id, start_date, end_date, created_at, status')
            .in('hostel_id', filteredHostelIds).in('status', ['confirmed', 'checked_in'])
            .gte('created_at', currentStartStr).lte('created_at', currentEndStr + 'T23:59:59')
          : Promise.resolve({ data: [] }),
        // 15: Hostel rooms
        filteredHostelIds.length > 0
          ? supabase.from('hostel_rooms').select('id, room_number, floor, hostel_id, floor_id')
            .in('hostel_id', filteredHostelIds)
          : Promise.resolve({ data: [] }),
        // 16: Hostel floors
        filteredHostelIds.length > 0
          ? supabase.from('hostel_floors').select('id, name, hostel_id')
            .in('hostel_id', filteredHostelIds)
          : Promise.resolve({ data: [] }),
        // 17: Prev period RR bookings occupancy
        filteredCabinIds.length > 0
          ? supabase.from('bookings').select('id, seat_id')
            .in('cabin_id', filteredCabinIds).eq('payment_status', 'completed')
            .lte('start_date', prevEndStr).gte('end_date', prevStartStr)
          : Promise.resolve({ data: [] }),
        // 18: Prev period hostel bookings occupancy
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

      const totalSeats = seats.length + hostelBeds.length;
      const occupiedRR = new Set(activeBookings.map((b: any) => b.seat_id)).size;
      const occupiedHostel = new Set(activeHostelBookings.map((b: any) => b.bed_id)).size;
      const occupiedSeats = occupiedRR + occupiedHostel;
      const occupancyPercent = totalSeats > 0 ? Math.round((occupiedSeats / totalSeats) * 100) : 0;

      const prevOccupiedRR = new Set(((prevRRBookingsRes as any).data || []).map((b: any) => b.seat_id)).size;
      const prevOccupiedHostel = new Set(((prevHBookingsRes as any).data || []).map((b: any) => b.bed_id)).size;
      const prevOccupancy = totalSeats > 0 ? Math.round(((prevOccupiedRR + prevOccupiedHostel) / totalSeats) * 100) : 0;

      const sumReceipts = (data: any[], type?: string) =>
        (data || []).filter(r => !type || r.receipt_type === type).reduce((s, r) => s + (r.amount || 0), 0);

      // Aggregate by payment method
      const aggregateByMethod = (data: any[]): CollectionsByMethod => {
        const result: CollectionsByMethod = {};
        (data || []).forEach(r => {
          const method = r.payment_method || 'cash';
          result[method] = (result[method] || 0) + (r.amount || 0);
        });
        return result;
      };

      const rrCurrent = (rrReceiptsCurrentRes as any).data || [];
      const rrPrev = (rrReceiptsPrevRes as any).data || [];
      const hCurrent = (hReceiptsCurrentRes as any).data || [];
      const hPrev = (hReceiptsPrevRes as any).data || [];

      // Payment method collections
      const rrMethodCurrent = aggregateByMethod(rrCurrent);
      const hMethodCurrent = aggregateByMethod(hCurrent);
      const collectionsByMethod: CollectionsByMethod = {};
      for (const [k, v] of Object.entries(rrMethodCurrent)) collectionsByMethod[k] = (collectionsByMethod[k] || 0) + v;
      for (const [k, v] of Object.entries(hMethodCurrent)) collectionsByMethod[k] = (collectionsByMethod[k] || 0) + v;

      const rrMethodPrev = aggregateByMethod(rrPrev);
      const hMethodPrev = aggregateByMethod(hPrev);
      const prevCollectionsByMethod: CollectionsByMethod = {};
      for (const [k, v] of Object.entries(rrMethodPrev)) prevCollectionsByMethod[k] = (prevCollectionsByMethod[k] || 0) + v;
      for (const [k, v] of Object.entries(hMethodPrev)) prevCollectionsByMethod[k] = (prevCollectionsByMethod[k] || 0) + v;

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

      const allDues = [...((rrDuesRes as any).data || []), ...((hDuesRes as any).data || [])];
      const totalStudentsWithDues = new Set(allDues.map(d => d.user_id)).size;
      const totalDuesAmount = allDues.reduce((s, d) => s + ((d.due_amount || 0) - (d.paid_amount || 0)), 0);
      const pendingDues = totalDuesAmount;
      const now = new Date();
      const overdueGt7 = allDues.filter(d => differenceInDays(now, new Date(d.due_date)) > 7).length;
      const overdueGt30 = allDues.filter(d => differenceInDays(now, new Date(d.due_date)) > 30).length;

      const refundsPending = 0;
      const refundsProcessed = 0;

      const settlements = (settlementsRes as any).data || [];
      const grossCollection = settlements.reduce((s: number, st: any) => s + (st.total_collected || 0), 0);
      const platformCommission = settlements.reduce((s: number, st: any) => s + (st.commission_amount || 0), 0);
      const netEarnings = settlements.reduce((s: number, st: any) => s + (st.net_payable || 0), 0);
      const paidSettlements = settlements.filter((s: any) => s.status === 'paid').reduce((sum: number, s: any) => sum + (s.net_payable || 0), 0);
      const pendingSettlement = settlements.filter((s: any) => s.status !== 'paid').reduce((sum: number, s: any) => sum + (s.net_payable || 0), 0);

      const prevNetEarnings = 0;
      const prevDues = 0;

      // Monthly trends
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
        collectionsByMethod,
        prevCollectionsByMethod,
      };
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });
}
