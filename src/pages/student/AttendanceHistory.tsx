import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { UserCheck, CalendarIcon, ArrowLeft } from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { AdminTablePagination, getSerialNumber } from '@/components/admin/AdminTablePagination';

interface AttendanceRecord {
  id: string;
  property_id: string;
  property_type: string;
  seat_or_bed_id: string | null;
  check_in_time: string;
  date: string;
  property_name?: string;
  seat_label?: string;
}

const AttendanceHistory: React.FC = () => {
  const navigate = useNavigate();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const [dateOpen, setDateOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    fetchRecords();
  }, [selectedMonth]);

  const fetchRecords = async () => {
    setLoading(true);
    const from = format(startOfMonth(selectedMonth), 'yyyy-MM-dd');
    const to = format(endOfMonth(selectedMonth), 'yyyy-MM-dd');

    const { data } = await supabase
      .from('property_attendance')
      .select('*')
      .gte('date', from)
      .lte('date', to)
      .order('date', { ascending: false });

    const rows = (data || []) as unknown as AttendanceRecord[];

    // Enrich with property names
    const cabinIds = [...new Set(rows.filter(r => r.property_type === 'reading_room').map(r => r.property_id))];
    const hostelIds = [...new Set(rows.filter(r => r.property_type === 'hostel').map(r => r.property_id))];
    const nameMap = new Map<string, string>();

    if (cabinIds.length > 0) {
      const { data: cabins } = await supabase.from('cabins').select('id, name').in('id', cabinIds);
      (cabins || []).forEach((c: any) => nameMap.set(c.id, c.name));
    }
    if (hostelIds.length > 0) {
      const { data: hostels } = await supabase.from('hostels').select('id, name').in('id', hostelIds);
      (hostels || []).forEach((h: any) => nameMap.set(h.id, h.name));
    }

    // Enrich with seat/bed labels
    const seatIds = rows.filter(r => r.seat_or_bed_id).map(r => r.seat_or_bed_id!);
    const labelMap = new Map<string, string>();
    if (seatIds.length > 0) {
      const { data: seats } = await supabase.from('seats').select('id, number').in('id', seatIds);
      (seats || []).forEach((s: any) => labelMap.set(s.id, `Seat ${s.number}`));
      const { data: beds } = await supabase.from('hostel_beds').select('id, bed_number, room_id').in('id', seatIds);
      const roomIds = (beds || []).map((b: any) => b.room_id);
      let roomMap = new Map<string, string>();
      if (roomIds.length > 0) {
        const { data: rooms } = await supabase.from('hostel_rooms').select('id, room_number').in('id', roomIds);
        roomMap = new Map((rooms || []).map((r: any) => [r.id, r.room_number]));
      }
      (beds || []).forEach((b: any) => labelMap.set(b.id, `${roomMap.get(b.room_id) || '?'}-B${b.bed_number}`));
    }

    rows.forEach(r => {
      r.property_name = nameMap.get(r.property_id) || '-';
      r.seat_label = r.seat_or_bed_id ? (labelMap.get(r.seat_or_bed_id) || '-') : '-';
    });

    setRecords(rows);
    setCurrentPage(1);
    setLoading(false);
  };

  return (
    <div className="container mx-auto px-4 py-6 space-y-4 max-w-2xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-2">
          <UserCheck className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-semibold">Attendance History</h1>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Popover open={dateOpen} onOpenChange={setDateOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1">
              <CalendarIcon className="h-3 w-3" />
              {format(selectedMonth, 'MMMM yyyy')}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={selectedMonth}
              onSelect={(d) => { if (d) setSelectedMonth(d); setDateOpen(false); }}
              className="p-3 pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
        <Badge variant="secondary" className="text-xs">{records.length} entries</Badge>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin h-6 w-6 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      ) : records.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <UserCheck className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No attendance records for this month</p>
          </CardContent>
        </Card>
      ) : (
        <div className="border rounded-md overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs w-[40px]">S.No.</TableHead>
                <TableHead className="text-xs">Date</TableHead>
                <TableHead className="text-xs">Time</TableHead>
                <TableHead className="text-xs">Property</TableHead>
                <TableHead className="text-xs">Seat / Bed</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((r, i) => (
                <TableRow key={r.id}>
                  <TableCell className="text-xs text-muted-foreground">{getSerialNumber(i, currentPage, pageSize)}</TableCell>
                  <TableCell className="text-xs font-medium">
                    {format(new Date(r.date), 'dd MMM yyyy')}
                  </TableCell>
                  <TableCell className="text-xs">
                    {r.check_in_time ? format(new Date(r.check_in_time), 'hh:mm a') : '-'}
                  </TableCell>
                  <TableCell className="text-xs">
                    <div className="flex items-center gap-1">
                      {r.property_name}
                      <Badge variant="outline" className="text-[9px]">
                        {r.property_type === 'reading_room' ? 'Room' : 'Hostel'}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs">
                    {r.seat_label !== '-' ? <Badge variant="outline" className="text-[10px]">{r.seat_label}</Badge> : '-'}
                  </TableCell>
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

export default AttendanceHistory;
