
import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { CalendarRange, Eye, Search, X, Download, ArrowUpDown } from 'lucide-react';
import { adminBookingsService } from '@/api/adminBookingsService';
import { format, differenceInDays } from 'date-fns';
import { useNavigate, useLocation } from 'react-router-dom';
import { getEffectiveOwnerId } from '@/utils/getEffectiveOwnerId';
import { useAuth } from '@/contexts/AuthContext';
import { AdminTablePagination, getSerialNumber } from '@/components/admin/AdminTablePagination';

export default function ExpiringBookingsPage() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [daysThreshold, setDaysThreshold] = useState('7');
  const [search, setSearch] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const routePrefix = location.pathname.startsWith('/partner') ? '/partner' : '/admin';

  useEffect(() => { fetchData(); }, [daysThreshold]);

  const fetchData = async () => {
    setLoading(true);
    try {
      let partnerUserId: string | undefined;
      if (user?.role !== 'admin') {
        const { ownerId } = await getEffectiveOwnerId();
        partnerUserId = ownerId;
      }
      const response = await adminBookingsService.getExpiringBookings(parseInt(daysThreshold), partnerUserId);
      setBookings(response.success && Array.isArray(response.data) ? response.data : []);
    } catch { setBookings([]); }
    finally { setLoading(false); }
  };

  const filtered = useMemo(() => {
    let result = bookings.filter((b) => {
      if (!search) return true;
      const s = search.toLowerCase();
      const profile = b.profiles as any;
      const cabin = b.cabins as any;
      return (
        (b.serial_number || '').toLowerCase().includes(s) ||
        (profile?.name || '').toLowerCase().includes(s) ||
        (profile?.email || '').toLowerCase().includes(s) ||
        (profile?.phone || '').toLowerCase().includes(s) ||
        (cabin?.name || '').toLowerCase().includes(s)
      );
    });
    result.sort((a, b) => {
      const da = new Date(a.end_date).getTime();
      const db = new Date(b.end_date).getTime();
      return sortOrder === 'asc' ? da - db : db - da;
    });
    return result;
  }, [bookings, search, sortOrder]);

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => { setCurrentPage(1); }, [search, daysThreshold, pageSize]);

  const getDaysRemaining = (endDate: string) => Math.max(0, differenceInDays(new Date(endDate), new Date()));
  const getStatusColor = (days: number) => { if (days <= 2) return 'destructive'; if (days <= 5) return 'warning'; return 'secondary'; };

  const handleExport = () => {
    const headers = ['S.No', 'Booking ID', 'Customer', 'Email', 'Phone', 'Room', 'Seat', 'Start Date', 'End Date', 'Days Left'];
    const rows = filtered.map((b, i) => {
      const p = b.profiles as any; const c = b.cabins as any; const s = b.seats as any;
      return [i + 1, b.serial_number || b.id.substring(0, 8), p?.name || '', p?.email || '', p?.phone || '', c?.name || '', s?.number || '', format(new Date(b.start_date), 'dd/MM/yyyy'), format(new Date(b.end_date), 'dd/MM/yyyy'), getDaysRemaining(b.end_date)];
    });
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `expiring-bookings-${daysThreshold}d.csv`; a.click();
  };

  const clearFilters = () => { setSearch(''); setDaysThreshold('7'); setSortOrder('asc'); };

  return (
    <div className="p-3 md:p-6 space-y-3">
      <Card className="border-border/50 shadow-sm">
        <CardHeader className="py-3 px-4 bg-muted/30 border-b">
          <div className="flex items-center gap-2">
            <CalendarRange className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm font-semibold text-foreground/90">Expiring Reading Room Bookings</CardTitle>
            <Badge variant="outline" className="ml-auto text-[10px]">{filtered.length} records</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {/* Filter Row */}
          <div className="flex flex-wrap items-center gap-2 px-3 py-2 border-b bg-background">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-8 w-48 pl-7 text-xs" />
            </div>
            <Select value={daysThreshold} onValueChange={setDaysThreshold}>
              <SelectTrigger className="h-8 w-28 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {['1', '2', '3', '7', '14', '30', '60'].map(v => (
                  <SelectItem key={v} value={v} className="text-xs">{v === '1' ? 'Today' : `${v} days`}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1" onClick={() => setSortOrder(o => o === 'asc' ? 'desc' : 'asc')}>
              <ArrowUpDown className="h-3 w-3" />{sortOrder === 'asc' ? 'Earliest' : 'Latest'}
            </Button>
            <Button variant="ghost" size="sm" className="h-8 text-xs gap-1" onClick={clearFilters}><X className="h-3 w-3" />Clear</Button>
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1 ml-auto" onClick={handleExport}><Download className="h-3 w-3" />Export</Button>
          </div>

          {loading ? (
            <div className="p-4 space-y-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : paginated.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead className="text-[11px] font-medium uppercase tracking-wider w-12">S.No</TableHead>
                      <TableHead className="text-[11px] font-medium uppercase tracking-wider">Booking ID</TableHead>
                      <TableHead className="text-[11px] font-medium uppercase tracking-wider">Customer</TableHead>
                      <TableHead className="text-[11px] font-medium uppercase tracking-wider">Room / Seat</TableHead>
                      <TableHead className="text-[11px] font-medium uppercase tracking-wider">Start Date</TableHead>
                      <TableHead className="text-[11px] font-medium uppercase tracking-wider">End Date</TableHead>
                      <TableHead className="text-[11px] font-medium uppercase tracking-wider">Expires In</TableHead>
                      <TableHead className="text-[11px] font-medium uppercase tracking-wider w-20">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginated.map((booking, idx) => {
                      const profile = booking.profiles as any;
                      const cabin = booking.cabins as any;
                      const seat = booking.seats as any;
                      const days = getDaysRemaining(booking.end_date);
                      return (
                        <TableRow key={booking.id} className="text-xs">
                          <TableCell className="text-muted-foreground">{getSerialNumber(idx, currentPage, pageSize)}</TableCell>
                          <TableCell className="font-medium">{booking.serial_number || booking.id.substring(0, 8)}</TableCell>
                          <TableCell>
                            <div className="font-medium text-xs">{profile?.name || 'N/A'}</div>
                            {profile?.email && <div className="text-[10px] text-muted-foreground">{profile.email}</div>}
                            {profile?.phone && <div className="text-[10px] text-muted-foreground">{profile.phone}</div>}
                          </TableCell>
                          <TableCell>
                            <div className="text-xs">{cabin?.name || 'N/A'}</div>
                            <div className="text-[10px] text-muted-foreground">Seat {seat?.number || 'N/A'}</div>
                          </TableCell>
                          <TableCell>{booking.start_date ? format(new Date(booking.start_date), 'dd MMM yyyy') : '-'}</TableCell>
                          <TableCell>{format(new Date(booking.end_date), 'dd MMM yyyy')}</TableCell>
                          <TableCell>
                            <Badge variant={getStatusColor(days) as any} className="text-[10px]">
                              {days} {days === 1 ? 'day' : 'days'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => navigate(`${routePrefix}/bookings/${booking.id}/cabin`)}>
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              <AdminTablePagination currentPage={currentPage} totalItems={filtered.length} pageSize={pageSize} onPageChange={setCurrentPage} onPageSizeChange={setPageSize} />
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground text-sm">
              <CalendarRange className="h-10 w-10 mb-3 opacity-40" />
              No expiring bookings found
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
