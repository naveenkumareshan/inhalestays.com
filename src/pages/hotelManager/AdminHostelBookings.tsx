
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AdminTablePagination, getSerialNumber } from '@/components/admin/AdminTablePagination';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Eye, Search, Filter, BookOpen } from 'lucide-react';

const PAGE_SIZE = 10;

const fmtDate = (d: string) => {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });
};

const fmtDateTime = (d: string) => {
  if (!d) return '-';
  const dt = new Date(d);
  const date = dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });
  const time = dt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' });
  return `${date}, ${time}`;
};

const badgeCls = (s: string) => {
  switch (s) {
    case 'confirmed': case 'completed': case 'paid': return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
    case 'pending': return 'bg-amber-50 text-amber-700 border border-amber-200';
    case 'cancelled': case 'failed': case 'expired': return 'bg-red-50 text-red-700 border border-red-200';
    default: return 'bg-muted text-muted-foreground border border-border';
  }
};

export default function AdminHostelBookings() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [status, setStatus] = useState('');
  const [activeTab, setActiveTab] = useState('bookings');
  const navigate = useNavigate();
  const { toast } = useToast();

  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  useEffect(() => {
    if (activeTab === 'bookings') fetchBookings();
  }, [currentPage, searchQuery, status, activeTab]);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('hostel_bookings')
        .select('*, hostels(name), hostel_rooms(room_number), hostel_beds(bed_number), profiles:user_id(name, email, phone)', { count: 'exact' })
        .order('created_at', { ascending: false });


      if (status) query = query.eq('status', status);

      if (searchQuery) {
        // We'll fetch all and filter client-side for search
      }

      const from = (currentPage - 1) * pageSize;
      query = query.range(from, from + pageSize - 1);

      const { data, error, count } = await query;
      if (error) throw error;

      let filtered = data || [];
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        filtered = filtered.filter(b =>
          b.serial_number?.toLowerCase().includes(q) ||
          b.profiles?.name?.toLowerCase().includes(q) ||
          b.profiles?.email?.toLowerCase().includes(q)
        );
      }

      // Fetch hostel dues for these bookings
      const ids = filtered.map(b => b.id);
      let duesMap: Record<string, any> = {};
      if (ids.length > 0) {
        const { data: duesData } = await supabase
          .from('hostel_dues')
          .select('booking_id, advance_paid, paid_amount, due_amount')
          .in('booking_id', ids);
        if (duesData) {
          for (const d of duesData) {
            if (d.booking_id) duesMap[d.booking_id] = d;
          }
        }
      }

      const enriched = filtered.map(b => {
        const due = duesMap[b.id];
        return {
          ...b,
          totalPaid: due
            ? (Number(due.advance_paid) || 0) + (Number(due.paid_amount) || 0)
            : (b.advance_amount || 0),
          duePending: due
            ? (Number(due.due_amount) || 0) - (Number(due.paid_amount) || 0)
            : (b.remaining_amount || 0),
        };
      });

      setBookings(enriched);
      setTotalCount(count || 0);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to fetch bookings', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); setCurrentPage(1); };
  const handleStatusChange = (v: string) => { setStatus(v === 'all' ? '' : v); setCurrentPage(1); };

  const durationLabel = (b: any) => {
    const count = b.duration_count || 1;
    const type = b.booking_duration || 'monthly';
    const unit = type === 'daily' ? 'day' : type === 'weekly' ? 'week' : 'month';
    return `${count} ${unit}${count !== 1 ? 's' : ''}`;
  };

  const showStart = (currentPage - 1) * pageSize + 1;
  const showEnd = Math.min(currentPage * pageSize, totalCount);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
          <span>Admin Panel</span><span>/</span><span className="text-foreground font-medium">Hostel Bookings</span>
        </div>
        <h1 className="text-lg font-semibold tracking-tight">Hostel Bookings</h1>
        <p className="text-muted-foreground text-xs mt-0.5">View and manage all hostel reservations.</p>
      </div>

      <div>
          <Card className="shadow-sm">
            <CardHeader className="py-3 border-b">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <form onSubmit={handleSearch} className="flex gap-2 flex-1 max-w-sm">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input placeholder="Search by name, email or ID..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9 h-8 text-xs" />
                  </div>
                  <Button type="submit" size="sm" className="h-8 text-xs">Search</Button>
                </form>
                <div className="flex items-center gap-2">
                  <Filter className="h-3.5 w-3.5 text-muted-foreground" />
                  <Select value={status || 'all'} onValueChange={handleStatusChange}>
                    <SelectTrigger className="w-32 h-8 text-xs"><SelectValue placeholder="All Statuses" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="confirmed">Confirmed</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex justify-center py-10">
                  <div className="animate-spin h-7 w-7 border-4 border-primary border-t-transparent rounded-full" />
                </div>
              ) : bookings.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-muted-foreground gap-2">
                  <BookOpen className="h-8 w-8 opacity-30" /><p className="text-xs">No bookings found.</p>
                </div>
              ) : (
                <TooltipProvider delayDuration={200}>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/30">
                          {['S.No.', 'Booking ID', 'Student', 'Hostel', 'Room / Bed', 'Booked On', 'Duration', 'Amount', 'Status', 'Actions'].map(h => (
                            <TableHead key={h} className={`text-[11px] font-medium text-muted-foreground uppercase tracking-wider py-2 px-2 ${h === 'Actions' ? 'text-right' : ''}`}>{h}</TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {bookings.map((b, idx) => (
                          <TableRow key={b.id} className={idx % 2 === 0 ? 'bg-background' : 'bg-muted/20'}>
                            <TableCell className="py-1 px-2 text-[11px] text-muted-foreground">{getSerialNumber(idx, currentPage, pageSize)}</TableCell>
                            <TableCell className="py-1 px-2 font-mono text-[10px]">{b.serial_number || '-'}</TableCell>
                            <TableCell className="py-1 px-2 text-[11px] whitespace-nowrap">
                              <div className="font-medium">{b.profiles?.name || 'N/A'}</div>
                              {b.profiles?.email && <div className="text-[10px] text-muted-foreground truncate max-w-[160px]">{b.profiles.email}</div>}
                              {b.profiles?.phone && <div className="text-[10px] text-muted-foreground">{b.profiles.phone}</div>}
                            </TableCell>
                            <TableCell className="py-1 px-2 text-[11px]">{b.hostels?.name || '-'}</TableCell>
                            <TableCell className="py-1 px-2 text-[10px] whitespace-nowrap">
                              Room {b.hostel_rooms?.room_number || '-'} / Bed #{b.hostel_beds?.bed_number || '-'}
                            </TableCell>
                            <TableCell className="py-1 px-2 text-[11px] whitespace-nowrap">
                              {fmtDateTime(b.created_at)}
                              {b.collected_by_name && <div className="text-[10px] text-muted-foreground">By: {b.collected_by_name}</div>}
                            </TableCell>
                            <TableCell className="py-1 px-2 text-[11px] whitespace-nowrap">
                              <div>{fmtDate(b.start_date)} – {fmtDate(b.end_date)}</div>
                              <div className="text-[10px] text-muted-foreground capitalize">{durationLabel(b)}</div>
                            </TableCell>
                            <TableCell className="py-1 px-2 text-[11px]">
                              <div className="grid grid-cols-2 gap-x-4 gap-y-0 min-w-[140px]">
                                <div className="font-semibold whitespace-nowrap">Bed: ₹{(b.total_price - (b.food_amount || 0)).toLocaleString()}</div>
                                <div className="text-[10px] text-muted-foreground whitespace-nowrap">Deposit: {(b.security_deposit || 0) > 0 ? `₹${(b.security_deposit || 0).toLocaleString()}` : '-'}</div>
                                {(b.food_amount || 0) > 0 && <div className="text-[10px] text-orange-600 whitespace-nowrap">Food: ₹{(b.food_amount || 0).toLocaleString()}</div>}
                                <div className="text-[10px] text-emerald-600 whitespace-nowrap">Paid: ₹{(b.totalPaid || 0).toLocaleString()}</div>
                                <div className="text-[10px] text-amber-600 whitespace-nowrap">Due: ₹{(b.duePending || 0).toLocaleString()}</div>
                              </div>
                            </TableCell>
                            <TableCell className="py-1 px-2">
                              <span className={`inline-flex items-center rounded-full px-1.5 py-0 text-[10px] font-medium capitalize ${badgeCls(b.status || 'pending')}`}>{b.status || 'pending'}</span>
                            </TableCell>
                            <TableCell className="py-1 px-2 text-right">
                              <Tooltip><TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => navigate(`/admin/bookings/${b.serial_number || b.id}/hostel`)}>
                                  <Eye className="h-3.5 w-3.5" />
                                </Button>
                              </TooltipTrigger><TooltipContent>Details</TooltipContent></Tooltip>
                            </TableCell>
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
                </TooltipProvider>
              )}
            </CardContent>
          </Card>
      </div>
    </div>
  );
}
