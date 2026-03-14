import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { UserCheck, CalendarIcon, Users, Building, Hotel, RefreshCw, Download } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { getEffectiveOwnerId } from '@/utils/getEffectiveOwnerId';
import { useSearchParams } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { AdminTablePagination, getSerialNumber } from '@/components/admin/AdminTablePagination';

interface AttendanceRow {
  id: string;
  student_id: string;
  property_id: string;
  property_type: string;
  seat_or_bed_id: string | null;
  check_in_time: string;
  date: string;
  serial_number: string | null;
  student_name?: string;
  student_phone?: string;
  seat_label?: string;
}

interface PropertyOption {
  id: string;
  name: string;
  type: 'reading_room' | 'hostel';
}

const PropertyAttendance: React.FC = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const typeFilter = searchParams.get('type') || 'all';

  const [properties, setProperties] = useState<PropertyOption[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState('all');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [dateOpen, setDateOpen] = useState(false);
  const [records, setRecords] = useState<AttendanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Fetch properties
  useEffect(() => {
    const fetchProperties = async () => {
      const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
      let ownerId: string | undefined;
      if (!isAdmin && user?.id) {
        try {
          const res = await getEffectiveOwnerId();
          ownerId = res.ownerId;
        } catch {
          ownerId = user.id;
        }
      }

      const props: PropertyOption[] = [];

      // Fetch reading rooms
      if (typeFilter === 'all' || typeFilter === 'reading_room') {
        let q = supabase.from('cabins').select('id, name').eq('is_active', true);
        if (ownerId) q = q.eq('created_by', ownerId);
        const { data } = await q;
        (data || []).forEach((c: any) => props.push({ id: c.id, name: c.name, type: 'reading_room' }));
      }

      // Fetch hostels
      if (typeFilter === 'all' || typeFilter === 'hostel') {
        let q = supabase.from('hostels').select('id, name').eq('is_active', true);
        if (ownerId) q = q.eq('created_by', ownerId);
        const { data } = await q;
        (data || []).forEach((h: any) => props.push({ id: h.id, name: h.name, type: 'hostel' }));
      }

      setProperties(props);
    };
    fetchProperties();
  }, [user, typeFilter]);

  // Fetch attendance records
  const fetchRecords = async () => {
    setRefreshing(true);
    const dateStr = format(selectedDate, 'yyyy-MM-dd');

    let q = supabase
      .from('property_attendance')
      .select('*')
      .eq('date', dateStr)
      .order('check_in_time', { ascending: false });

    if (selectedPropertyId !== 'all') {
      q = q.eq('property_id', selectedPropertyId);
    } else if (properties.length > 0) {
      q = q.in('property_id', properties.map(p => p.id));
    }

    const { data } = await q;
    const rows = (data || []) as unknown as AttendanceRow[];

    // Enrich with student names
    const studentIds = [...new Set(rows.map(r => r.student_id))];
    if (studentIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name, phone')
        .in('id', studentIds);
      const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));
      rows.forEach(r => {
        const p = profileMap.get(r.student_id);
        if (p) {
          r.student_name = p.name;
          r.student_phone = p.phone;
        }
      });
    }

    // Enrich with seat/bed labels
    const seatIds = rows.filter(r => r.seat_or_bed_id).map(r => r.seat_or_bed_id!);
    if (seatIds.length > 0) {
      // Try seats
      const { data: seats } = await supabase.from('seats').select('id, number').in('id', seatIds);
      const seatMap = new Map((seats || []).map((s: any) => [s.id, `Seat ${s.number}`]));
      // Try beds
      const { data: beds } = await supabase.from('hostel_beds').select('id, bed_number, room_id').in('id', seatIds);
      const bedRoomIds = (beds || []).map((b: any) => b.room_id);
      let roomMap = new Map();
      if (bedRoomIds.length > 0) {
        const { data: rooms } = await supabase.from('hostel_rooms').select('id, room_number').in('id', bedRoomIds);
        roomMap = new Map((rooms || []).map((r: any) => [r.id, r.room_number]));
      }
      const bedMap = new Map((beds || []).map((b: any) => [b.id, `${roomMap.get(b.room_id) || '?'}-B${b.bed_number}`]));

      rows.forEach(r => {
        if (r.seat_or_bed_id) {
          r.seat_label = seatMap.get(r.seat_or_bed_id) || bedMap.get(r.seat_or_bed_id) || '-';
        }
      });
    }

    setRecords(rows);
    setCurrentPage(1);
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    if (properties.length > 0 || selectedPropertyId !== 'all') {
      fetchRecords();
    } else {
      setLoading(false);
    }
  }, [selectedPropertyId, selectedDate, properties]);

  const readingRoomCount = useMemo(() => records.filter(r => r.property_type === 'reading_room').length, [records]);
  const hostelCount = useMemo(() => records.filter(r => r.property_type === 'hostel').length, [records]);

  const handleExport = () => {
    const csv = [
      'Serial,Student,Phone,Seat/Bed,Check-in Time,Type',
      ...records.map(r => `${r.serial_number || ''},${r.student_name || ''},${r.student_phone || ''},${r.seat_label || ''},${r.check_in_time ? format(new Date(r.check_in_time), 'hh:mm a') : ''},${r.property_type}`)
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance-${format(selectedDate, 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <UserCheck className="h-5 w-5 text-primary" />
          <h1 className="text-base font-semibold">Property Attendance</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1" onClick={handleExport} disabled={records.length === 0}>
            <Download className="h-3 w-3" /> Export
          </Button>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={fetchRecords} disabled={refreshing}>
            <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className={`grid gap-2 ${typeFilter === 'all' ? 'grid-cols-3' : 'grid-cols-2'}`}>
        <Card>
          <CardContent className="p-3 flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Users className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">Total Present</p>
              <p className="text-lg font-bold">{records.length}</p>
            </div>
          </CardContent>
        </Card>
        {(typeFilter === 'all' || typeFilter === 'reading_room') && (
          <Card>
            <CardContent className="p-3 flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                <Building className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Reading Room</p>
                <p className="text-lg font-bold">{readingRoomCount}</p>
              </div>
            </CardContent>
          </Card>
        )}
        {(typeFilter === 'all' || typeFilter === 'hostel') && (
          <Card>
            <CardContent className="p-3 flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-violet-100 dark:bg-violet-900 flex items-center justify-center">
                <Hotel className="h-4 w-4 text-violet-600 dark:text-violet-400" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Hostel</p>
                <p className="text-lg font-bold">{hostelCount}</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <Select value={selectedPropertyId} onValueChange={setSelectedPropertyId}>
          <SelectTrigger className="h-8 w-[200px] text-xs">
            <SelectValue placeholder="All Properties" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">All Properties</SelectItem>
            {properties.map(p => (
              <SelectItem key={p.id} value={p.id} className="text-xs">
                {p.name} ({p.type === 'reading_room' ? 'Room' : 'Hostel'})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Popover open={dateOpen} onOpenChange={setDateOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1">
              <CalendarIcon className="h-3 w-3" />
              {format(selectedDate, 'dd MMM yyyy')}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={selectedDate} onSelect={(d) => { if (d) setSelectedDate(d); setDateOpen(false); }} className="p-3 pointer-events-auto" />
          </PopoverContent>
        </Popover>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin h-6 w-6 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      ) : records.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <UserCheck className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No attendance records for this date</p>
          </CardContent>
        </Card>
      ) : (
        <div className="border rounded-md overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs w-[40px]">S.No.</TableHead>
                <TableHead className="text-xs">Student</TableHead>
                <TableHead className="text-xs">Phone</TableHead>
                <TableHead className="text-xs">Seat / Bed</TableHead>
                <TableHead className="text-xs">Check-in</TableHead>
                {typeFilter === 'all' && <TableHead className="text-xs">Type</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((r, i) => (
                <TableRow key={r.id}>
                  <TableCell className="text-xs text-muted-foreground">{getSerialNumber(i, currentPage, pageSize)}</TableCell>
                  <TableCell className="text-xs font-medium">{r.student_name || '-'}</TableCell>
                  <TableCell className="text-xs">{r.student_phone || '-'}</TableCell>
                  <TableCell className="text-xs">
                    {r.seat_label ? <Badge variant="outline" className="text-[10px]">{r.seat_label}</Badge> : '-'}
                  </TableCell>
                  <TableCell className="text-xs">
                    {r.check_in_time ? format(new Date(r.check_in_time), 'hh:mm a') : '-'}
                  </TableCell>
                  {typeFilter === 'all' && (
                    <TableCell>
                      <Badge variant="secondary" className="text-[9px]">
                        {r.property_type === 'reading_room' ? 'Room' : 'Hostel'}
                      </Badge>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <AdminTablePagination
            currentPage={currentPage}
            totalItems={records.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={(s) => { setPageSize(s); setCurrentPage(1); }}
          />
        </div>
      )}
    </div>
  );
};

export default PropertyAttendance;
