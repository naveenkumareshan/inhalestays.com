
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { AdminTablePagination, getSerialNumber } from '@/components/admin/AdminTablePagination';
import { supabase } from '@/integrations/supabase/client';
import { getEffectiveOwnerId } from '@/utils/getEffectiveOwnerId';
import { Search, Activity, XCircle, LogOut, ArrowRightLeft, CalendarIcon } from 'lucide-react';

const PAGE_SIZE = 15;

const ACTIVITY_FILTERS = [
  { key: 'all', label: 'All', icon: Activity },
  { key: 'cancelled', label: 'Cancellations', icon: XCircle },
  { key: 'released', label: 'Releases', icon: LogOut },
  { key: 'transferred', label: 'Transfers', icon: ArrowRightLeft },
  { key: 'date_changed', label: 'Date Changes', icon: CalendarIcon },
] as const;

const activityBadge = (type: string) => {
  switch (type) {
    case 'cancelled': return 'bg-red-50 text-red-700 border-red-200';
    case 'released': return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'transferred': return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'date_changed': return 'bg-purple-50 text-purple-700 border-purple-200';
    default: return 'bg-muted text-muted-foreground border-border';
  }
};

const typeBadge = (type: string) => {
  return type === 'hostel'
    ? 'bg-teal-50 text-teal-700 border-teal-200'
    : 'bg-indigo-50 text-indigo-700 border-indigo-200';
};

const fmtDateTime = (d: string) => {
  if (!d) return '-';
  const dt = new Date(d);
  const date = dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const time = dt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  return `${date}, ${time}`;
};

const formatDetails = (details: any) => {
  if (!details || Object.keys(details).length === 0) return '-';
  const parts: string[] = [];
  if (details.reason) parts.push(`Reason: ${details.reason}`);
  if (details.old_start_date && details.new_start_date) {
    parts.push(`Dates: ${details.old_start_date} → ${details.new_start_date}`);
  }
  if (details.old_end_date && details.new_end_date) {
    parts.push(`End: ${details.old_end_date} → ${details.new_end_date}`);
  }
  if (details.old_seat_number && details.new_seat_number) {
    parts.push(`Seat: #${details.old_seat_number} → #${details.new_seat_number}`);
  }
  if (details.old_bed_number && details.new_bed_number) {
    parts.push(`Bed: #${details.old_bed_number} → #${details.new_bed_number}`);
  }
  if (details.old_room && details.new_room) {
    parts.push(`Room: ${details.old_room} → ${details.new_room}`);
  }
  if (parts.length === 0) return JSON.stringify(details);
  return parts.join(' | ');
};

export default function BookingActivityLog() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const [totalCount, setTotalCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [activityFilter, setActivityFilter] = useState('all');
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    fetchLogs();
  }, [currentPage, activityFilter, searchQuery]);

  const fetchLogs = async () => {
    try {
      setLoading(true);

      // Determine role and scoping
      const { userId, ownerId } = await getEffectiveOwnerId();
      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);
      const adminUser = roles?.some(r => r.role === 'admin' || r.role === 'super_admin') || false;
      setIsAdmin(adminUser);

      let query = supabase
        .from('booking_activity_log' as any)
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });

      // Partner scoping — RLS handles it but we also filter explicitly
      if (!adminUser) {
        query = query.eq('property_owner_id', ownerId);
      }

      if (activityFilter !== 'all') {
        query = query.eq('activity_type', activityFilter);
      }

      if (searchQuery) {
        query = query.ilike('serial_number', `%${searchQuery}%`);
      }

      const from = (currentPage - 1) * pageSize;
      query = query.range(from, from + pageSize - 1);

      const { data, error, count } = await query;
      if (error) throw error;

      // Enrich logs with student, property, seat/bed details
      const enriched = await enrichLogs(data || []);

      setLogs(enriched);
      setTotalCount(count || 0);
    } catch (err: any) {
      console.error('Error fetching activity logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const enrichLogs = async (rawLogs: any[]) => {
    if (rawLogs.length === 0) return [];

    // Separate by booking type
    const cabinBookingIds = rawLogs.filter(l => l.booking_type === 'cabin').map(l => l.booking_id);
    const hostelBookingIds = rawLogs.filter(l => l.booking_type === 'hostel').map(l => l.booking_id);

    // Fetch cabin booking details
    let cabinMap: Record<string, any> = {};
    if (cabinBookingIds.length > 0) {
      const { data: cabinBookings } = await supabase
        .from('bookings')
        .select('id, user_id, cabin_id, seat_id, seat_number')
        .in('id', cabinBookingIds);
      
      const cabinIds = [...new Set((cabinBookings || []).map(b => b.cabin_id).filter(Boolean))];
      const userIds = [...new Set((cabinBookings || []).map(b => b.user_id).filter(Boolean))];
      const seatIds = [...new Set((cabinBookings || []).map(b => b.seat_id).filter(Boolean))];

      const [cabinsRes, profilesRes, seatsRes] = await Promise.all([
        cabinIds.length > 0 ? supabase.from('cabins').select('id, name').in('id', cabinIds) : { data: [] },
        userIds.length > 0 ? supabase.from('profiles').select('id, name, email, phone').in('id', userIds) : { data: [] },
        seatIds.length > 0 ? supabase.from('seats').select('id, number, floor').in('id', seatIds) : { data: [] },
      ]);

      const cabinsById = Object.fromEntries((cabinsRes.data || []).map(c => [c.id, c]));
      const profilesById = Object.fromEntries((profilesRes.data || []).map(p => [p.id, p]));
      const seatsById = Object.fromEntries((seatsRes.data || []).map(s => [s.id, s]));

      (cabinBookings || []).forEach(b => {
        const profile = profilesById[b.user_id] || {};
        const cabin = cabinsById[b.cabin_id] || {};
        const seat = seatsById[b.seat_id] || {};
        cabinMap[b.id] = {
          studentName: profile.name || '-',
          studentPhone: profile.phone || '-',
          studentEmail: profile.email || '-',
          propertyName: cabin.name || '-',
          floor: seat.floor ?? '-',
          seatBed: b.seat_number || seat.number || '-',
        };
      });
    }

    // Fetch hostel booking details
    let hostelMap: Record<string, any> = {};
    if (hostelBookingIds.length > 0) {
      const { data: hostelBookings } = await supabase
        .from('hostel_bookings')
        .select('id, user_id, hostel_id, bed_id, room_id')
        .in('id', hostelBookingIds);

      const hostelIds = [...new Set((hostelBookings || []).map(b => b.hostel_id).filter(Boolean))];
      const userIds = [...new Set((hostelBookings || []).map(b => b.user_id).filter(Boolean))];
      const bedIds = [...new Set((hostelBookings || []).map(b => b.bed_id).filter(Boolean))];
      const roomIds = [...new Set((hostelBookings || []).map(b => b.room_id).filter(Boolean))];

      const [hostelsRes, profilesRes, bedsRes, roomsRes] = await Promise.all([
        hostelIds.length > 0 ? supabase.from('hostels').select('id, name').in('id', hostelIds) : { data: [] },
        userIds.length > 0 ? supabase.from('profiles').select('id, name, email, phone').in('id', userIds) : { data: [] },
        bedIds.length > 0 ? supabase.from('hostel_beds').select('id, bed_number, room_id').in('id', bedIds) : { data: [] },
        roomIds.length > 0 ? supabase.from('hostel_rooms').select('id, room_number, floor_id').in('id', roomIds) : { data: [] },
      ]);

      const hostelsById = Object.fromEntries((hostelsRes.data || []).map(h => [h.id, h]));
      const profilesById = Object.fromEntries((profilesRes.data || []).map(p => [p.id, p]));
      const bedsById = Object.fromEntries((bedsRes.data || []).map(b => [b.id, b]));
      const roomsById = Object.fromEntries((roomsRes.data || []).map(r => [r.id, r]));

      // Fetch floor names if needed
      const floorIds = [...new Set((roomsRes.data || []).map((r: any) => r.floor_id).filter(Boolean))];
      let floorsById: Record<string, any> = {};
      if (floorIds.length > 0) {
        const { data: floors } = await supabase.from('hostel_floors').select('id, name').in('id', floorIds);
        floorsById = Object.fromEntries((floors || []).map(f => [f.id, f]));
      }

      (hostelBookings || []).forEach(b => {
        const profile = profilesById[b.user_id] || {};
        const hostel = hostelsById[b.hostel_id] || {};
        const bed = bedsById[b.bed_id] || {};
        const room = roomsById[b.room_id] || {};
        const floor = floorsById[(room as any).floor_id] || {};
        hostelMap[b.id] = {
          studentName: profile.name || '-',
          studentPhone: profile.phone || '-',
          studentEmail: profile.email || '-',
          propertyName: hostel.name || '-',
          floor: floor.name || '-',
          seatBed: `Bed #${bed.bed_number || '-'}` + (room.room_number ? ` (Room ${room.room_number})` : ''),
        };
      });
    }

    // Fetch performer names
    const performerIds = [...new Set(rawLogs.map(l => l.performed_by).filter(Boolean))];
    let performerMap: Record<string, string> = {};
    if (performerIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name, email')
        .in('id', performerIds);
      (profiles || []).forEach((p: any) => {
        performerMap[p.id] = p.name || p.email || 'Unknown';
      });
    }

    return rawLogs.map(l => {
      const info = l.booking_type === 'cabin' ? cabinMap[l.booking_id] : hostelMap[l.booking_id];
      return {
        ...l,
        performerName: l.performed_by ? (performerMap[l.performed_by] || 'Unknown') : 'System',
        studentName: info?.studentName || '-',
        studentPhone: info?.studentPhone || '-',
        studentEmail: info?.studentEmail || '-',
        propertyName: info?.propertyName || '-',
        floor: info?.floor || '-',
        seatBed: info?.seatBed || '-',
      };
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
          <span>Admin Panel</span><span>/</span><span className="text-foreground font-medium">Activity Log</span>
        </div>
        <h1 className="text-lg font-semibold tracking-tight">Booking Activity Log</h1>
        <p className="text-muted-foreground text-xs mt-0.5">Audit trail of all booking lifecycle events — cancellations, releases, transfers, and date changes.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {ACTIVITY_FILTERS.map(f => (
          <Button
            key={f.key}
            variant={activityFilter === f.key ? 'default' : 'outline'}
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={() => { setActivityFilter(f.key); setCurrentPage(1); }}
          >
            <f.icon className="h-3.5 w-3.5" />
            {f.label}
          </Button>
        ))}
      </div>

      <Card className="shadow-sm">
        <CardHeader className="py-3 border-b">
          <form onSubmit={e => { e.preventDefault(); setCurrentPage(1); }} className="flex gap-2 max-w-sm">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search by booking ID..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9 h-8 text-xs"
              />
            </div>
            <Button type="submit" size="sm" className="h-8 text-xs">Search</Button>
          </form>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-10">
              <div className="animate-spin h-7 w-7 border-4 border-primary border-t-transparent rounded-full" />
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-muted-foreground gap-2">
              <Activity className="h-8 w-8 opacity-30" />
              <p className="text-xs">No activity logs found.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      {['S.No.', 'Booking ID', 'Student Name', 'Phone', 'Email', 'Property', 'Floor / Seat', 'Type', 'Activity', 'Details', 'Performed By', 'Date'].map(h => (
                        <TableHead key={h} className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider py-2 px-3 whitespace-nowrap">{h}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log, idx) => (
                      <TableRow key={log.id} className={idx % 2 === 0 ? 'bg-background' : 'bg-muted/20'}>
                        <TableCell className="py-1.5 px-3 text-[11px] text-muted-foreground">{getSerialNumber(idx, currentPage, pageSize)}</TableCell>
                        <TableCell className="py-1.5 px-3 font-mono text-[10px]">{log.serial_number || '-'}</TableCell>
                        <TableCell className="py-1.5 px-3 text-[11px] font-medium whitespace-nowrap">{log.studentName}</TableCell>
                        <TableCell className="py-1.5 px-3 text-[11px] whitespace-nowrap">{log.studentPhone}</TableCell>
                        <TableCell className="py-1.5 px-3 text-[11px] max-w-[160px] truncate">{log.studentEmail}</TableCell>
                        <TableCell className="py-1.5 px-3 text-[11px] whitespace-nowrap">{log.propertyName}</TableCell>
                        <TableCell className="py-1.5 px-3 text-[11px] whitespace-nowrap">{log.floor !== '-' ? `${log.floor} / ` : ''}{log.seatBed}</TableCell>
                        <TableCell className="py-1.5 px-3">
                          <span className={`inline-flex items-center rounded-full px-1.5 py-0 text-[10px] font-medium capitalize border ${typeBadge(log.booking_type)}`}>
                            {log.booking_type === 'cabin' ? 'Reading Room' : 'Hostel'}
                          </span>
                        </TableCell>
                        <TableCell className="py-1.5 px-3">
                          <span className={`inline-flex items-center rounded-full px-1.5 py-0 text-[10px] font-medium capitalize border ${activityBadge(log.activity_type)}`}>
                            {log.activity_type?.replace('_', ' ')}
                          </span>
                        </TableCell>
                        <TableCell className="py-1.5 px-3 text-[11px] max-w-[300px] truncate">{formatDetails(log.details)}</TableCell>
                        <TableCell className="py-1.5 px-3 text-[11px]">{log.performerName}</TableCell>
                        <TableCell className="py-1.5 px-3 text-[11px] whitespace-nowrap">{fmtDateTime(log.created_at)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="border-t">
                <AdminTablePagination
                  currentPage={currentPage}
                  totalItems={totalCount}
                  pageSize={pageSize}
                  onPageChange={setCurrentPage}
                  onPageSizeChange={(s) => { setPageSize(s); setCurrentPage(1); }}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
