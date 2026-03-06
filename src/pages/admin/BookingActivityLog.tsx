
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { AdminTablePagination, getSerialNumber } from '@/components/admin/AdminTablePagination';
import { supabase } from '@/integrations/supabase/client';
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

  useEffect(() => {
    fetchLogs();
  }, [currentPage, activityFilter, searchQuery]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('booking_activity_log' as any)
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });

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

      // Fetch performer names
      const performerIds = [...new Set((data || []).map((l: any) => l.performed_by).filter(Boolean))];
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

      const enriched = (data || []).map((l: any) => ({
        ...l,
        performerName: l.performed_by ? (performerMap[l.performed_by] || 'Unknown') : 'System',
      }));

      setLogs(enriched);
      setTotalCount(count || 0);
    } catch (err: any) {
      console.error('Error fetching activity logs:', err);
    } finally {
      setLoading(false);
    }
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
                      {['S.No.', 'Booking ID', 'Type', 'Activity', 'Details', 'Performed By', 'Date'].map(h => (
                        <TableHead key={h} className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider py-2 px-3">{h}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log, idx) => (
                      <TableRow key={log.id} className={idx % 2 === 0 ? 'bg-background' : 'bg-muted/20'}>
                        <TableCell className="py-1.5 px-3 text-[11px] text-muted-foreground">{getSerialNumber(idx, currentPage, pageSize)}</TableCell>
                        <TableCell className="py-1.5 px-3 font-mono text-[10px]">{log.serial_number || '-'}</TableCell>
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
