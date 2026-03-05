import React, { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { CalendarIcon, Search, Receipt, Download, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/utils/currency';
import { AdminTablePagination, getSerialNumber } from '@/components/admin/AdminTablePagination';
import { useIsMobile } from '@/hooks/use-mobile';
import { resolvePaymentMethodLabels, getMethodLabel } from '@/utils/paymentMethodLabels';

interface ReceiptRow {
  id: string;
  serial_number: string;
  booking_id: string | null;
  due_id: string | null;
  user_id: string;
  cabin_id: string | null;
  seat_id: string | null;
  amount: number;
  payment_method: string;
  transaction_id: string;
  collected_by: string | null;
  collected_by_name: string;
  receipt_type: string;
  notes: string;
  created_at: string;
  studentName?: string;
  studentPhone?: string;
  cabinName?: string;
  seatNumber?: number;
  bookingSerial?: string;
}

const Receipts: React.FC = () => {
  const [receipts, setReceipts] = useState<ReceiptRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [cabins, setCabins] = useState<{ id: string; name: string }[]>([]);
  const [paymentLabels, setPaymentLabels] = useState<Record<string, string>>({});
  const [filterCabin, setFilterCabin] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [fromDate, setFromDate] = useState<Date | undefined>(undefined);
  const [toDate, setToDate] = useState<Date | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const { toast } = useToast();
  const isMobile = useIsMobile();

  useEffect(() => {
    fetchCabins();
    fetchReceipts();
  }, []);

  const fetchCabins = async () => {
    const { data } = await supabase.from('cabins').select('id, name').order('name');
    setCabins(data || []);
  };

  const fetchReceipts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('receipts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) throw error;

      // Fetch related data
      const userIds = [...new Set((data || []).map(r => r.user_id))];
      const cabinIds = [...new Set((data || []).filter(r => r.cabin_id).map(r => r.cabin_id!))];
      const seatIds = [...new Set((data || []).filter(r => r.seat_id).map(r => r.seat_id!))];
      const bookingIds = [...new Set((data || []).filter(r => r.booking_id).map(r => r.booking_id!))];

      const [profilesRes, cabinsRes, seatsRes, bookingsRes] = await Promise.all([
        userIds.length > 0 ? supabase.from('profiles').select('id, name, phone, email').in('id', userIds) : { data: [] },
        cabinIds.length > 0 ? supabase.from('cabins').select('id, name').in('id', cabinIds) : { data: [] },
        seatIds.length > 0 ? supabase.from('seats').select('id, number').in('id', seatIds) : { data: [] },
        bookingIds.length > 0 ? supabase.from('bookings').select('id, serial_number').in('id', bookingIds) : { data: [] },
      ]);

      const profileMap = Object.fromEntries((profilesRes.data || []).map(p => [p.id, p]));
      const cabinMap = Object.fromEntries((cabinsRes.data || []).map(c => [c.id, c]));
      const seatMap = Object.fromEntries((seatsRes.data || []).map(s => [s.id, s]));
      const bookingMap = Object.fromEntries((bookingsRes.data || []).map(b => [b.id, b]));

      const mapped: ReceiptRow[] = (data || []).map(r => ({
        ...r,
        amount: Number(r.amount),
        studentName: profileMap[r.user_id]?.name || 'N/A',
        studentPhone: profileMap[r.user_id]?.phone || '',
        studentEmail: profileMap[r.user_id]?.email || '',
        cabinName: r.cabin_id ? cabinMap[r.cabin_id]?.name || '' : '',
        seatNumber: r.seat_id ? seatMap[r.seat_id]?.number : undefined,
        bookingSerial: r.booking_id ? bookingMap[r.booking_id]?.serial_number || '' : '',
      }));

      // Resolve custom payment method labels
      const customLabels = await resolvePaymentMethodLabels(mapped.map(r => r.payment_method));
      setPaymentLabels(customLabels);

      setReceipts(mapped);
    } catch (err) {
      toast({ title: 'Error loading receipts', variant: 'destructive' });
    }
    setLoading(false);
  };

  const filtered = useMemo(() => {
    let result = receipts;
    if (filterCabin !== 'all') result = result.filter(r => r.cabin_id === filterCabin);
    if (filterType !== 'all') result = result.filter(r => r.receipt_type === filterType);
    if (fromDate) {
      const from = format(fromDate, 'yyyy-MM-dd');
      result = result.filter(r => r.created_at.slice(0, 10) >= from);
    }
    if (toDate) {
      const to = format(toDate, 'yyyy-MM-dd');
      result = result.filter(r => r.created_at.slice(0, 10) <= to);
    }
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      result = result.filter(r =>
        (r.studentName || '').toLowerCase().includes(q) ||
        (r.studentPhone || '').includes(q) ||
        (r.serial_number || '').toLowerCase().includes(q) ||
        (r.bookingSerial || '').toLowerCase().includes(q)
      );
    }
    return result;
  }, [receipts, filterCabin, filterType, fromDate, toDate, searchTerm]);

  const totalAmount = useMemo(() => filtered.reduce((s, r) => s + r.amount, 0), [filtered]);
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const methodLabel = (m: string) => getMethodLabel(m, paymentLabels);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Receipt className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-semibold">Receipts</h1>
          <Badge variant="secondary" className="text-xs">{filtered.length} receipts</Badge>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1" onClick={() => {
            const headers = ['S.No,Receipt #,Student,Phone,Room / Seat,Amount,Method,Type,Booking ID,Collected By,Txn ID,Date'];
            const rows = filtered.map((r, i) => [
              i + 1,
              r.serial_number || '',
              `"${(r.studentName || '').replace(/"/g, '""')}"`,
              r.studentPhone || '',
              `"${r.cabinName || ''}${r.seatNumber !== undefined ? ` / #${r.seatNumber}` : ''}"`,
              r.amount,
              methodLabel(r.payment_method),
              r.receipt_type === 'booking_payment' ? 'Booking' : 'Due',
              r.bookingSerial || '',
              `"${(r.collected_by_name || '').replace(/"/g, '""')}"`,
              r.transaction_id || '',
              new Date(r.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
            ].join(','));
            const csv = [headers, ...rows].join('\n');
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = `receipts_${format(new Date(), 'yyyy-MM-dd')}.csv`; a.click();
            URL.revokeObjectURL(url);
          }}>
            <Download className="h-3 w-3" /> Export CSV
          </Button>
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1" onClick={fetchReceipts}>
            <RefreshCw className="h-3 w-3" /> Refresh
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="border rounded-md p-3 bg-card flex flex-wrap items-center gap-4 sm:gap-6">
        <div>
          <div className="text-[10px] uppercase text-muted-foreground">Total</div>
          <div className="text-lg font-bold">{formatCurrency(totalAmount)}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase text-muted-foreground">Booking Payments</div>
          <div className="text-sm font-semibold">{formatCurrency(filtered.filter(r => r.receipt_type === 'booking_payment').reduce((s, r) => s + r.amount, 0))}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase text-muted-foreground">Due Collections</div>
          <div className="text-sm font-semibold">{formatCurrency(filtered.filter(r => r.receipt_type === 'due_collection').reduce((s, r) => s + r.amount, 0))}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
          <Input className="h-8 pl-7 text-xs w-[200px]" placeholder="Search name, phone, receipt#..." value={searchTerm} onChange={e => { setSearchTerm(e.target.value); setPage(1); }} />
        </div>
        <Select value={filterCabin} onValueChange={(v) => { setFilterCabin(v); setPage(1); }}>
          <SelectTrigger className="h-8 w-[160px] text-xs"><SelectValue placeholder="Room" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">All Rooms</SelectItem>
            {cabins.map(c => <SelectItem key={c.id} value={c.id} className="text-xs">{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterType} onValueChange={(v) => { setFilterType(v); setPage(1); }}>
          <SelectTrigger className="h-8 w-[140px] text-xs"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">All Types</SelectItem>
            <SelectItem value="booking_payment" className="text-xs">Booking Payment</SelectItem>
            <SelectItem value="due_collection" className="text-xs">Due Collection</SelectItem>
          </SelectContent>
        </Select>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1">
              <CalendarIcon className="h-3 w-3" /> {fromDate ? format(fromDate, 'dd MMM') : 'From'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={fromDate} onSelect={(d) => { setFromDate(d); setPage(1); }} /></PopoverContent>
        </Popover>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1">
              <CalendarIcon className="h-3 w-3" /> {toDate ? format(toDate, 'dd MMM') : 'To'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={toDate} onSelect={(d) => { setToDate(d); setPage(1); }} /></PopoverContent>
        </Popover>
        {(fromDate || toDate || filterCabin !== 'all' || filterType !== 'all' || searchTerm) && (
          <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => { setFromDate(undefined); setToDate(undefined); setFilterCabin('all'); setFilterType('all'); setSearchTerm(''); setPage(1); }}>
            Clear
          </Button>
        )}
      </div>

      {/* Table / Cards */}
      <div className="border rounded-md">
        {loading ? (
          <div className="text-center py-8 text-muted-foreground text-xs">Loading...</div>
        ) : paginated.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-xs">No receipts found</div>
        ) : isMobile ? (
          <div className="space-y-3 p-3">
            {paginated.map((r) => (
              <div key={r.id} className="border rounded-lg p-3 bg-card space-y-2">
                <div className="flex items-start justify-between">
                  <div className="min-w-0">
                    <p className="font-medium text-xs">{r.studentName}</p>
                    <p className="text-[10px] text-muted-foreground">{r.studentPhone}</p>
                  </div>
                  <Badge variant={r.receipt_type === 'booking_payment' ? 'default' : 'secondary'} className="text-[10px]">
                    {r.receipt_type === 'booking_payment' ? 'Booking' : 'Due'}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div><span className="text-muted-foreground">Receipt: </span><span className="font-mono">{r.serial_number}</span></div>
                  <div><span className="text-muted-foreground">Amount: </span><span className="font-semibold">{formatCurrency(r.amount)}</span></div>
                  <div><span className="text-muted-foreground">Method: </span>{methodLabel(r.payment_method)}</div>
                  <div><span className="text-muted-foreground">Date: </span>{new Date(r.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                </div>
                {r.cabinName && <p className="text-[10px] text-muted-foreground">Room: {r.cabinName}{r.seatNumber !== undefined ? ` / #${r.seatNumber}` : ''}</p>}
              </div>
            ))}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">S.No.</TableHead>
                <TableHead className="text-xs">Receipt #</TableHead>
                <TableHead className="text-xs">Student</TableHead>
                <TableHead className="text-xs">Room / Seat</TableHead>
                <TableHead className="text-xs">Amount</TableHead>
                <TableHead className="text-xs">Method</TableHead>
                <TableHead className="text-xs">Type</TableHead>
                <TableHead className="text-xs">Booking ID</TableHead>
                <TableHead className="text-xs">Collected By</TableHead>
                <TableHead className="text-xs">Txn ID / Notes</TableHead>
                <TableHead className="text-xs">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginated.map((r, index) => (
                <TableRow key={r.id}>
                  <TableCell className="text-xs text-muted-foreground">{getSerialNumber(index, page, pageSize)}</TableCell>
                  <TableCell className="text-xs font-mono">{r.serial_number}</TableCell>
                  <TableCell className="text-xs">
                    <div className="font-medium">{r.studentName}</div>
                    {r.studentPhone && <div className="text-muted-foreground text-[10px]">{r.studentPhone}</div>}
                    {(r as any).studentEmail && <div className="text-muted-foreground text-[10px]">{(r as any).studentEmail}</div>}
                  </TableCell>
                  <TableCell className="text-xs">
                    {r.cabinName}{r.seatNumber !== undefined ? ` / #${r.seatNumber}` : ''}
                  </TableCell>
                  <TableCell className="text-xs font-semibold">{formatCurrency(r.amount)}</TableCell>
                  <TableCell className="text-xs">{methodLabel(r.payment_method)}</TableCell>
                  <TableCell className="text-xs">
                    <Badge variant={r.receipt_type === 'booking_payment' ? 'default' : 'secondary'} className="text-[10px]">
                      {r.receipt_type === 'booking_payment' ? 'Booking' : 'Due'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs font-mono text-muted-foreground">{r.bookingSerial || '-'}</TableCell>
                  <TableCell className="text-xs">{r.collected_by_name || '-'}</TableCell>
                  <TableCell className="text-xs max-w-[150px]">
                    {r.transaction_id ? <div className="font-mono truncate">{r.transaction_id}</div> : null}
                    {r.notes ? <div className="text-muted-foreground text-[10px] italic truncate">{r.notes}</div> : null}
                    {!r.transaction_id && !r.notes ? '-' : null}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Pagination */}
      <AdminTablePagination
        currentPage={page}
        totalItems={filtered.length}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
      />
    </div>
  );
};

export default Receipts;
