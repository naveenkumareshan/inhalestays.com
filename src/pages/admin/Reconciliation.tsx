
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { getEffectiveOwnerId } from '@/utils/getEffectiveOwnerId';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Search, Download, RefreshCw, CheckCircle2, XCircle, Landmark, Eye, CalendarIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/utils/currency';
import { AdminTablePagination, getSerialNumber } from '@/components/admin/AdminTablePagination';
import { useIsMobile } from '@/hooks/use-mobile';
import { DateFilterSelector } from '@/components/common/DateFilterSelector';
import { getDateRangeFromFilter } from '@/utils/dateFilterUtils';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

interface ReconciliationRow {
  id: string;
  source: 'reading_room' | 'hostel' | 'mess' | 'laundry';
  serial_number: string;
  amount: number;
  payment_method: string;
  transaction_id: string;
  payment_proof_url?: string;
  student_name: string;
  student_phone: string;
  property_name: string;
  property_owner_id?: string;
  booking_serial: string;
  reconciliation_status: 'pending' | 'approved' | 'rejected';
  rejection_reason?: string;
  created_at: string;
  reconciled_at?: string;
  credit_date?: string;
  reconciled_bank_name?: string;
}

const SOURCE_LABELS: Record<string, string> = {
  reading_room: 'Reading Room',
  hostel: 'Hostel',
  mess: 'Mess',
  laundry: 'Laundry',
};

const SOURCE_COLORS: Record<string, string> = {
  reading_room: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  hostel: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  mess: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  laundry: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300',
};

const Reconciliation: React.FC = () => {
  const [rows, setRows] = useState<ReconciliationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<ReconciliationRow | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Approve dialog state
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [approveTarget, setApproveTarget] = useState<ReconciliationRow | null>(null);
  const [creditDate, setCreditDate] = useState<Date>(new Date());
  const [bankName, setBankName] = useState('');
  const [bankOptions, setBankOptions] = useState<{ id: string; label: string }[]>([]);
  const [bankLoading, setBankLoading] = useState(false);

  const { toast } = useToast();
  const isMobile = useIsMobile();
  const { user } = useAuth();

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const { ownerId, userId } = await getEffectiveOwnerId();
      const { data: roles } = await supabase.from('user_roles').select('role').eq('user_id', userId);
      const isAdmin = roles?.some(r => r.role === 'admin' || r.role === 'super_admin');

      const [rrRes, hRes, mRes, lRes] = await Promise.all([
        supabase.from('receipts').select('id, serial_number, booking_id, user_id, cabin_id, amount, payment_method, transaction_id, payment_proof_url, reconciliation_status, rejection_reason, reconciled_at, credit_date, reconciled_bank_name, created_at').order('created_at', { ascending: false }).limit(500),
        supabase.from('hostel_receipts').select('id, serial_number, booking_id, user_id, hostel_id, amount, payment_method, transaction_id, payment_proof_url, reconciliation_status, rejection_reason, reconciled_at, credit_date, reconciled_bank_name, created_at').order('created_at', { ascending: false }).limit(500),
        supabase.from('mess_receipts').select('id, serial_number, subscription_id, user_id, mess_id, amount, payment_method, transaction_id, reconciliation_status, rejection_reason, reconciled_at, credit_date, reconciled_bank_name, created_at').order('created_at', { ascending: false }).limit(500),
        supabase.from('laundry_receipts').select('id, serial_number, order_id, user_id, partner_id, amount, payment_method, transaction_id, reconciliation_status, rejection_reason, reconciled_at, credit_date, reconciled_bank_name, created_at').order('created_at', { ascending: false }).limit(500),
      ]);

      const allData = [
        ...(rrRes.data || []).map(r => ({ ...r, _source: 'reading_room' as const, _propId: r.cabin_id })),
        ...(hRes.data || []).map(r => ({ ...r, _source: 'hostel' as const, _propId: r.hostel_id })),
        ...(mRes.data || []).map(r => ({ ...r, _source: 'mess' as const, _propId: r.mess_id })),
        ...(lRes.data || []).map(r => ({ ...r, _source: 'laundry' as const, _propId: r.partner_id })),
      ];

      const userIds = [...new Set(allData.map(r => r.user_id).filter(Boolean))];
      const cabinIds = [...new Set((rrRes.data || []).filter(r => r.cabin_id).map(r => r.cabin_id!))];
      const hostelIds = [...new Set((hRes.data || []).filter(r => r.hostel_id).map(r => r.hostel_id!))];
      const messIds = [...new Set((mRes.data || []).filter(r => r.mess_id).map(r => r.mess_id!))];
      const laundryPartnerIds = [...new Set((lRes.data || []).filter(r => r.partner_id).map(r => r.partner_id!))];
      const bookingIds = [...new Set((rrRes.data || []).filter(r => r.booking_id).map(r => r.booking_id!))];
      const hostelBookingIds = [...new Set((hRes.data || []).filter(r => r.booking_id).map(r => r.booking_id!))];

      const [profilesRes, cabinsRes, hostelsRes, messRes2, laundryRes2, bookingsRes, hBookingsRes] = await Promise.all([
        userIds.length > 0 ? supabase.from('profiles').select('id, name, phone').in('id', userIds) : { data: [] },
        cabinIds.length > 0 ? supabase.from('cabins').select('id, name, created_by').in('id', cabinIds) : { data: [] },
        hostelIds.length > 0 ? supabase.from('hostels').select('id, name, created_by').in('id', hostelIds) : { data: [] },
        messIds.length > 0 ? supabase.from('mess_partners').select('id, name, partner_user_id').in('id', messIds) : { data: [] },
        laundryPartnerIds.length > 0 ? supabase.from('laundry_partners').select('id, name, partner_user_id').in('id', laundryPartnerIds) : { data: [] },
        bookingIds.length > 0 ? supabase.from('bookings').select('id, serial_number').in('id', bookingIds) : { data: [] },
        hostelBookingIds.length > 0 ? supabase.from('hostel_bookings').select('id, serial_number').in('id', hostelBookingIds) : { data: [] },
      ]);

      const profileMap = Object.fromEntries((profilesRes.data || []).map(p => [p.id, p]));
      const propMap: Record<string, { name: string; ownerId?: string }> = {};
      (cabinsRes.data || []).forEach(c => { propMap[c.id] = { name: c.name, ownerId: c.created_by || undefined }; });
      (hostelsRes.data || []).forEach(h => { propMap[h.id] = { name: h.name, ownerId: h.created_by || undefined }; });
      (messRes2.data || []).forEach(m => { propMap[m.id] = { name: m.name, ownerId: m.partner_user_id || undefined }; });
      (laundryRes2.data || []).forEach(l => { propMap[l.id] = { name: l.name, ownerId: l.partner_user_id || undefined }; });
      const bookingMap: Record<string, string> = {};
      (bookingsRes.data || []).forEach(b => { bookingMap[b.id] = b.serial_number || ''; });
      (hBookingsRes.data || []).forEach(b => { bookingMap[b.id] = b.serial_number || ''; });

      const mapped: ReconciliationRow[] = allData.map(r => {
        const bId = (r as any).booking_id || (r as any).subscription_id || (r as any).order_id;
        const prop = r._propId ? propMap[r._propId] : undefined;
        return {
          id: r.id,
          source: r._source,
          serial_number: r.serial_number || '',
          amount: Number(r.amount),
          payment_method: r.payment_method || '',
          transaction_id: r.transaction_id || '',
          payment_proof_url: (r as any).payment_proof_url || undefined,
          student_name: profileMap[r.user_id]?.name || 'N/A',
          student_phone: profileMap[r.user_id]?.phone || '',
          property_name: prop?.name || '',
          property_owner_id: prop?.ownerId,
          booking_serial: bId ? (bookingMap[bId] || bId.slice(0, 8)) : '',
          reconciliation_status: (r.reconciliation_status || 'pending') as any,
          rejection_reason: r.rejection_reason || undefined,
          created_at: r.created_at,
          reconciled_at: r.reconciled_at || undefined,
          credit_date: (r as any).credit_date || undefined,
          reconciled_bank_name: (r as any).reconciled_bank_name || undefined,
        };
      });

      setRows(mapped);
    } catch (err) {
      toast({ title: 'Error loading reconciliation data', variant: 'destructive' });
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const getTableForSource = (source: string) => {
    switch (source) {
      case 'reading_room': return 'receipts';
      case 'hostel': return 'hostel_receipts';
      case 'mess': return 'mess_receipts';
      case 'laundry': return 'laundry_receipts';
      default: return 'receipts';
    }
  };

  // Open approve dialog - fetch bank names for this property's partner
  const openApproveDialog = async (row: ReconciliationRow) => {
    setApproveTarget(row);
    setCreditDate(new Date());
    setBankName('');
    setApproveDialogOpen(true);
    setBankLoading(true);

    if (row.property_owner_id) {
      const { data } = await supabase
        .from('partner_payment_modes')
        .select('id, label')
        .eq('partner_user_id', row.property_owner_id)
        .eq('is_active', true)
        .order('display_order');
      setBankOptions(data || []);
    } else {
      setBankOptions([]);
    }
    setBankLoading(false);
  };

  const handleApproveConfirm = async () => {
    if (!approveTarget) return;
    setActionLoading(true);
    const table = getTableForSource(approveTarget.source);
    const { error } = await (supabase.from(table as any) as any).update({
      reconciliation_status: 'approved',
      reconciled_at: new Date().toISOString(),
      reconciled_by: user?.id,
      credit_date: format(creditDate, 'yyyy-MM-dd'),
      reconciled_bank_name: bankName || null,
      rejection_reason: null,
    }).eq('id', approveTarget.id);
    if (error) {
      toast({ title: 'Failed to approve', variant: 'destructive' });
    } else {
      setRows(prev => prev.map(r => r.id === approveTarget.id ? {
        ...r,
        reconciliation_status: 'approved' as const,
        reconciled_at: new Date().toISOString(),
        credit_date: format(creditDate, 'yyyy-MM-dd'),
        reconciled_bank_name: bankName || undefined,
        rejection_reason: undefined,
      } : r));
      toast({ title: 'Receipt approved' });
    }
    setApproveDialogOpen(false);
    setApproveTarget(null);
    setActionLoading(false);
  };

  const handleBulkApprove = async () => {
    setActionLoading(true);
    const toApprove = rows.filter(r => selected.has(`${r.source}-${r.id}`) && r.reconciliation_status === 'pending');
    const grouped: Record<string, string[]> = {};
    toApprove.forEach(r => {
      const table = getTableForSource(r.source);
      if (!grouped[table]) grouped[table] = [];
      grouped[table].push(r.id);
    });

    const now = new Date().toISOString();
    const today = format(new Date(), 'yyyy-MM-dd');
    for (const [table, ids] of Object.entries(grouped)) {
      await (supabase.from(table as any) as any).update({
        reconciliation_status: 'approved',
        reconciled_at: now,
        reconciled_by: user?.id,
        credit_date: today,
      }).in('id', ids);
    }

    setRows(prev => prev.map(r => selected.has(`${r.source}-${r.id}`) && r.reconciliation_status === 'pending'
      ? { ...r, reconciliation_status: 'approved' as const, reconciled_at: now, credit_date: today }
      : r
    ));
    setSelected(new Set());
    toast({ title: `${toApprove.length} receipts approved` });
    setActionLoading(false);
  };

  const handleReject = async () => {
    if (!rejectTarget) return;
    setActionLoading(true);
    const table = getTableForSource(rejectTarget.source);
    const { error } = await (supabase.from(table as any) as any).update({
      reconciliation_status: 'rejected',
      reconciled_at: new Date().toISOString(),
      reconciled_by: user?.id,
      rejection_reason: rejectReason || null,
    }).eq('id', rejectTarget.id);
    if (error) {
      toast({ title: 'Failed to reject', variant: 'destructive' });
    } else {
      setRows(prev => prev.map(r => r.id === rejectTarget.id ? { ...r, reconciliation_status: 'rejected' as const, rejection_reason: rejectReason, reconciled_at: new Date().toISOString() } : r));
      toast({ title: 'Receipt rejected' });
    }
    setRejectDialogOpen(false);
    setRejectTarget(null);
    setRejectReason('');
    setActionLoading(false);
  };

  const filtered = useMemo(() => {
    let result = rows.filter(r => r.reconciliation_status === tab);
    if (sourceFilter !== 'all') result = result.filter(r => r.source === sourceFilter);
    const { from, to } = getDateRangeFromFilter(dateFilter, startDate, endDate);
    if (from) {
      const fromStr = format(from, 'yyyy-MM-dd');
      result = result.filter(r => r.created_at.slice(0, 10) >= fromStr);
    }
    if (to) {
      const toStr = format(to, 'yyyy-MM-dd');
      result = result.filter(r => r.created_at.slice(0, 10) <= toStr);
    }
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      result = result.filter(r =>
        r.student_name.toLowerCase().includes(q) ||
        r.student_phone.includes(q) ||
        r.serial_number.toLowerCase().includes(q) ||
        r.transaction_id.toLowerCase().includes(q) ||
        r.booking_serial.toLowerCase().includes(q)
      );
    }
    return result;
  }, [rows, tab, sourceFilter, dateFilter, startDate, endDate, searchTerm]);

  const totalAmount = useMemo(() => filtered.reduce((s, r) => s + r.amount, 0), [filtered]);
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const counts = useMemo(() => ({
    pending: rows.filter(r => r.reconciliation_status === 'pending').length,
    approved: rows.filter(r => r.reconciliation_status === 'approved').length,
    rejected: rows.filter(r => r.reconciliation_status === 'rejected').length,
  }), [rows]);

  const allPageSelected = paginated.length > 0 && paginated.every(r => selected.has(`${r.source}-${r.id}`));
  const toggleSelectAll = () => {
    if (allPageSelected) {
      const next = new Set(selected);
      paginated.forEach(r => next.delete(`${r.source}-${r.id}`));
      setSelected(next);
    } else {
      const next = new Set(selected);
      paginated.forEach(r => next.add(`${r.source}-${r.id}`));
      setSelected(next);
    }
  };

  const exportCsv = () => {
    const isApproved = tab === 'approved';
    const headers = ['S.No', 'Receipt #', 'Source', 'Student', 'Phone', 'Property', 'Amount', 'Method', 'Txn ID', 'Booking ID', 'Status', 'Date', ...(isApproved ? ['Credit Date', 'Bank Name'] : [])].join(',');
    const csvRows = filtered.map((r, i) => [
      i + 1,
      r.serial_number,
      SOURCE_LABELS[r.source],
      `"${r.student_name.replace(/"/g, '""')}"`,
      r.student_phone,
      `"${r.property_name.replace(/"/g, '""')}"`,
      r.amount,
      r.payment_method,
      r.transaction_id,
      r.booking_serial,
      r.reconciliation_status,
      new Date(r.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      ...(isApproved ? [r.credit_date || '', r.reconciled_bank_name || ''] : []),
    ].join(','));
    const csv = [headers, ...csvRows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `reconciliation_${tab}_${format(new Date(), 'yyyy-MM-dd')}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const renderActions = (r: ReconciliationRow) => {
    if (tab === 'pending') {
      return (
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-green-600 hover:text-green-700 hover:bg-green-50" onClick={() => openApproveDialog(r)} disabled={actionLoading}>
            <CheckCircle2 className="h-3.5 w-3.5" /> Approve
          </Button>
          <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-destructive hover:bg-destructive/10" onClick={() => { setRejectTarget(r); setRejectDialogOpen(true); }} disabled={actionLoading}>
            <XCircle className="h-3.5 w-3.5" /> Reject
          </Button>
        </div>
      );
    }
    if (tab === 'approved') {
      return (
        <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-destructive hover:bg-destructive/10" onClick={() => { setRejectTarget(r); setRejectDialogOpen(true); }} disabled={actionLoading}>
          <XCircle className="h-3.5 w-3.5" /> Reject
        </Button>
      );
    }
    if (tab === 'rejected') {
      return (
        <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-green-600 hover:text-green-700 hover:bg-green-50" onClick={() => openApproveDialog(r)} disabled={actionLoading}>
          <CheckCircle2 className="h-3.5 w-3.5" /> Approve
        </Button>
      );
    }
    return null;
  };

  const renderMobileActions = (r: ReconciliationRow) => {
    if (tab === 'pending') {
      return (
        <div className="flex gap-2 pt-1">
          <Button size="sm" className="h-7 text-xs gap-1 flex-1" onClick={() => openApproveDialog(r)} disabled={actionLoading}>
            <CheckCircle2 className="h-3 w-3" /> Approve
          </Button>
          <Button variant="destructive" size="sm" className="h-7 text-xs gap-1 flex-1" onClick={() => { setRejectTarget(r); setRejectDialogOpen(true); }} disabled={actionLoading}>
            <XCircle className="h-3 w-3" /> Reject
          </Button>
        </div>
      );
    }
    if (tab === 'approved') {
      return (
        <Button variant="destructive" size="sm" className="h-7 text-xs gap-1 w-full" onClick={() => { setRejectTarget(r); setRejectDialogOpen(true); }} disabled={actionLoading}>
          <XCircle className="h-3 w-3" /> Move to Rejected
        </Button>
      );
    }
    if (tab === 'rejected') {
      return (
        <Button size="sm" className="h-7 text-xs gap-1 w-full" onClick={() => openApproveDialog(r)} disabled={actionLoading}>
          <CheckCircle2 className="h-3 w-3" /> Approve
        </Button>
      );
    }
    return null;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Landmark className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-semibold">Bank Reconciliation</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1" onClick={exportCsv}>
            <Download className="h-3 w-3" /> Export CSV
          </Button>
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1" onClick={fetchAll}>
            <RefreshCw className="h-3 w-3" /> Refresh
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="border rounded-md p-3 bg-card flex flex-wrap items-center gap-4 sm:gap-6">
        <div>
          <div className="text-[10px] uppercase text-muted-foreground">Filtered Total</div>
          <div className="text-lg font-bold">{formatCurrency(totalAmount)}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase text-muted-foreground">Receipts</div>
          <div className="text-sm font-semibold">{filtered.length}</div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={v => { setTab(v); setPage(1); setSelected(new Set()); }}>
        <TabsList className="h-9">
          <TabsTrigger value="pending" className="text-xs gap-1.5">
            Pending <Badge variant="secondary" className="text-[10px] h-5 px-1.5">{counts.pending}</Badge>
          </TabsTrigger>
          <TabsTrigger value="approved" className="text-xs gap-1.5">
            Approved <Badge variant="secondary" className="text-[10px] h-5 px-1.5">{counts.approved}</Badge>
          </TabsTrigger>
          <TabsTrigger value="rejected" className="text-xs gap-1.5">
            Rejected <Badge variant="secondary" className="text-[10px] h-5 px-1.5">{counts.rejected}</Badge>
          </TabsTrigger>
        </TabsList>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap mt-3">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
            <Input className="h-8 pl-7 text-xs w-[200px]" placeholder="Name, phone, txn ID, receipt#..." value={searchTerm} onChange={e => { setSearchTerm(e.target.value); setPage(1); }} />
          </div>
          <Select value={sourceFilter} onValueChange={v => { setSourceFilter(v); setPage(1); }}>
            <SelectTrigger className="h-8 w-[150px] text-xs"><SelectValue placeholder="Module" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All Modules</SelectItem>
              <SelectItem value="reading_room" className="text-xs">Reading Room</SelectItem>
              <SelectItem value="hostel" className="text-xs">Hostel</SelectItem>
              <SelectItem value="mess" className="text-xs">Mess</SelectItem>
              <SelectItem value="laundry" className="text-xs">Laundry</SelectItem>
            </SelectContent>
          </Select>
          <DateFilterSelector
            dateFilter={dateFilter}
            startDate={startDate}
            endDate={endDate}
            onDateFilterChange={v => { setDateFilter(v); setPage(1); }}
            onStartDateChange={d => { setStartDate(d); setPage(1); }}
            onEndDateChange={d => { setEndDate(d); setPage(1); }}
            compact
          />
          {(dateFilter !== 'all' || sourceFilter !== 'all' || searchTerm) && (
            <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => { setDateFilter('all'); setStartDate(undefined); setEndDate(undefined); setSourceFilter('all'); setSearchTerm(''); setPage(1); }}>Clear</Button>
          )}
        </div>

        {/* Bulk actions */}
        {tab === 'pending' && selected.size > 0 && (
          <div className="flex items-center gap-2 mt-2 p-2 bg-primary/5 border rounded-md">
            <span className="text-xs font-medium">{selected.size} selected</span>
            <Button size="sm" className="h-7 text-xs gap-1" onClick={handleBulkApprove} disabled={actionLoading}>
              <CheckCircle2 className="h-3 w-3" /> Approve Selected
            </Button>
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setSelected(new Set())}>Clear</Button>
          </div>
        )}

        <TabsContent value={tab} className="mt-3">
          <div className="border rounded-md">
            {loading ? (
              <div className="text-center py-8 text-muted-foreground text-xs">Loading...</div>
            ) : paginated.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-xs">No {tab} receipts found</div>
            ) : isMobile ? (
              <div className="space-y-3 p-3">
                {paginated.map(r => (
                  <div key={`${r.source}-${r.id}`} className="border rounded-lg p-3 bg-card space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="min-w-0">
                        <p className="font-medium text-xs">{r.student_name}</p>
                        <p className="text-[10px] text-muted-foreground">{r.student_phone}</p>
                      </div>
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${SOURCE_COLORS[r.source]}`}>
                        {SOURCE_LABELS[r.source]}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div><span className="text-muted-foreground">Receipt: </span><span className="font-mono">{r.serial_number}</span></div>
                      <div><span className="text-muted-foreground">Amount: </span><span className="font-semibold">{formatCurrency(r.amount)}</span></div>
                      <div><span className="text-muted-foreground">Method: </span>{r.payment_method}</div>
                      <div><span className="text-muted-foreground">Txn ID: </span><span className="font-mono">{r.transaction_id || '-'}</span></div>
                      <div><span className="text-muted-foreground">Property: </span>{r.property_name || '-'}</div>
                      <div><span className="text-muted-foreground">Date: </span>{new Date(r.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                      {tab === 'approved' && r.credit_date && (
                        <div><span className="text-muted-foreground">Credit Date: </span>{format(new Date(r.credit_date), 'dd MMM yyyy')}</div>
                      )}
                      {tab === 'approved' && r.reconciled_bank_name && (
                        <div><span className="text-muted-foreground">Bank: </span>{r.reconciled_bank_name}</div>
                      )}
                    </div>
                    {r.payment_proof_url && (
                      <a href={r.payment_proof_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline">
                        <Eye className="h-3 w-3" /> View Proof
                      </a>
                    )}
                    {tab === 'rejected' && r.rejection_reason && (
                      <p className="text-[10px] text-destructive italic">Reason: {r.rejection_reason}</p>
                    )}
                    {renderMobileActions(r)}
                  </div>
                ))}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    {tab === 'pending' && (
                      <TableHead className="w-8">
                        <Checkbox checked={allPageSelected} onCheckedChange={toggleSelectAll} />
                      </TableHead>
                    )}
                    <TableHead className="text-xs">S.No</TableHead>
                    <TableHead className="text-xs">Receipt #</TableHead>
                    <TableHead className="text-xs">Source</TableHead>
                    <TableHead className="text-xs">Student</TableHead>
                    <TableHead className="text-xs">Property</TableHead>
                    <TableHead className="text-xs">Amount</TableHead>
                    <TableHead className="text-xs">Method</TableHead>
                    <TableHead className="text-xs">Txn ID</TableHead>
                    <TableHead className="text-xs">Booking ID</TableHead>
                    <TableHead className="text-xs">Proof</TableHead>
                    <TableHead className="text-xs">Payment Date</TableHead>
                    {tab === 'approved' && <TableHead className="text-xs">Credit Date</TableHead>}
                    {tab === 'approved' && <TableHead className="text-xs">Bank</TableHead>}
                    {tab === 'rejected' && <TableHead className="text-xs">Reason</TableHead>}
                    <TableHead className="text-xs">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginated.map((r, index) => {
                    const key = `${r.source}-${r.id}`;
                    return (
                      <TableRow key={key}>
                        {tab === 'pending' && (
                          <TableCell>
                            <Checkbox checked={selected.has(key)} onCheckedChange={() => {
                              const next = new Set(selected);
                              next.has(key) ? next.delete(key) : next.add(key);
                              setSelected(next);
                            }} />
                          </TableCell>
                        )}
                        <TableCell className="text-xs text-muted-foreground">{getSerialNumber(index, page, pageSize)}</TableCell>
                        <TableCell className="text-xs font-mono">{r.serial_number}</TableCell>
                        <TableCell>
                          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${SOURCE_COLORS[r.source]}`}>
                            {SOURCE_LABELS[r.source]}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs">
                          <div className="font-medium">{r.student_name}</div>
                          {r.student_phone && <div className="text-[10px] text-muted-foreground">{r.student_phone}</div>}
                        </TableCell>
                        <TableCell className="text-xs">{r.property_name || '-'}</TableCell>
                        <TableCell className="text-xs font-semibold">{formatCurrency(r.amount)}</TableCell>
                        <TableCell className="text-xs">{r.payment_method}</TableCell>
                        <TableCell className="text-xs font-mono max-w-[120px] truncate">{r.transaction_id || '-'}</TableCell>
                        <TableCell className="text-xs font-mono text-muted-foreground">{r.booking_serial || '-'}</TableCell>
                        <TableCell className="text-xs">
                          {r.payment_proof_url ? (
                            <a href={r.payment_proof_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-[10px] flex items-center gap-0.5">
                              <Eye className="h-3 w-3" /> View
                            </a>
                          ) : '-'}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</TableCell>
                        {tab === 'approved' && <TableCell className="text-xs">{r.credit_date ? format(new Date(r.credit_date), 'dd MMM yyyy') : '-'}</TableCell>}
                        {tab === 'approved' && <TableCell className="text-xs">{r.reconciled_bank_name || '-'}</TableCell>}
                        {tab === 'rejected' && (
                          <TableCell className="text-xs text-destructive italic max-w-[150px] truncate">{r.rejection_reason || '-'}</TableCell>
                        )}
                        <TableCell>{renderActions(r)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <AdminTablePagination
        currentPage={page}
        totalItems={filtered.length}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={s => { setPageSize(s); setPage(1); }}
      />

      {/* Approve dialog */}
      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm">Approve Receipt</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">
              Approving receipt <span className="font-mono font-medium">{approveTarget?.serial_number}</span> — {formatCurrency(approveTarget?.amount || 0)}
            </p>

            <div className="space-y-2">
              <Label className="text-xs">Credit Date <span className="text-destructive">*</span></Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal h-9 text-xs", !creditDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                    {creditDate ? format(creditDate, 'dd MMM yyyy') : 'Select date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={creditDate}
                    onSelect={(d) => d && setCreditDate(d)}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Bank Name</Label>
              {bankLoading ? (
                <p className="text-xs text-muted-foreground">Loading banks...</p>
              ) : bankOptions.length > 0 ? (
                <Select value={bankName} onValueChange={setBankName}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select bank" /></SelectTrigger>
                  <SelectContent>
                    {bankOptions.map(b => (
                      <SelectItem key={b.id} value={b.label} className="text-xs">{b.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input className="h-9 text-xs" placeholder="Enter bank name" value={bankName} onChange={e => setBankName(e.target.value)} />
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" size="sm" className="text-xs" onClick={() => setApproveDialogOpen(false)}>Cancel</Button>
            <Button size="sm" className="text-xs gap-1" onClick={handleApproveConfirm} disabled={actionLoading || !creditDate}>
              <CheckCircle2 className="h-3.5 w-3.5" /> Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm">Reject Receipt</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Rejecting receipt <span className="font-mono font-medium">{rejectTarget?.serial_number}</span> — {formatCurrency(rejectTarget?.amount || 0)}
            </p>
            <Textarea
              placeholder="Reason for rejection (optional)..."
              className="text-xs"
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" size="sm" className="text-xs" onClick={() => setRejectDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" size="sm" className="text-xs" onClick={handleReject} disabled={actionLoading}>Reject</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Reconciliation;
