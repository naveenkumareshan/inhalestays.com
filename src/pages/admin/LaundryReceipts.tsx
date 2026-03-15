import React, { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Receipt, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/utils/currency';
import { AdminTablePagination, getSerialNumber } from '@/components/admin/AdminTablePagination';
import { DateFilterSelector } from '@/components/common/DateFilterSelector';
import { getDateRangeFromFilter } from '@/utils/dateFilterUtils';
import { getEffectiveOwnerId } from '@/utils/getEffectiveOwnerId';

export default function LaundryReceipts() {
  const { user } = useAuth();
  const [receipts, setReceipts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const { toast } = useToast();

  useEffect(() => { fetchReceipts(); }, [user]);

  const fetchReceipts = async () => {
    setLoading(true);
    try {
      let q = supabase
        .from('laundry_receipts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);

      // Scope to partner's laundry if not admin
      if (user?.role === 'vendor' || user?.role === 'vendor_employee') {
        const { ownerId } = await getEffectiveOwnerId();
        if (ownerId) {
          const { data: partner } = await supabase
            .from('laundry_partners')
            .select('id')
            .eq('user_id', ownerId)
            .maybeSingle();
          if (partner) {
            q = q.eq('partner_id', partner.id);
          }
        }
      }

      const { data, error } = await q;
      if (error) throw error;

      const userIds = [...new Set((data || []).map((r: any) => r.user_id))];
      const partnerIds = [...new Set((data || []).map((r: any) => r.partner_id).filter(Boolean))];

      const [profilesRes, partnersRes] = await Promise.all([
        userIds.length > 0 ? supabase.from('profiles').select('id, name, phone, email').in('id', userIds) : { data: [] },
        partnerIds.length > 0 ? supabase.from('laundry_partners').select('id, business_name').in('id', partnerIds) : { data: [] },
      ]);

      const profileMap = Object.fromEntries((profilesRes.data || []).map((p: any) => [p.id, p]));
      const partnerMap = Object.fromEntries((partnersRes.data || []).map((p: any) => [p.id, p]));

      const mapped = (data || []).map((r: any) => ({
        ...r,
        amount: Number(r.amount),
        studentName: profileMap[r.user_id]?.name || 'N/A',
        studentPhone: profileMap[r.user_id]?.phone || '',
        partnerName: partnerMap[r.partner_id]?.business_name || '',
      }));

      setReceipts(mapped);
    } catch {
      toast({ title: 'Error loading receipts', variant: 'destructive' });
    }
    setLoading(false);
  };

  const filtered = useMemo(() => {
    let result = receipts;
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
        (r.studentName || '').toLowerCase().includes(q) ||
        (r.studentPhone || '').includes(q) ||
        (r.serial_number || '').toLowerCase().includes(q)
      );
    }
    return result;
  }, [receipts, dateFilter, startDate, endDate, searchTerm]);

  const totalAmount = useMemo(() => filtered.reduce((s, r) => s + r.amount, 0), [filtered]);
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Receipt className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-semibold">Laundry Receipts</h1>
          <Badge variant="secondary" className="text-xs">{filtered.length} receipts</Badge>
        </div>
        <Button variant="outline" size="sm" className="h-8 text-xs gap-1" onClick={fetchReceipts}>
          <RefreshCw className="h-3 w-3" /> Refresh
        </Button>
      </div>

      <div className="border rounded-md p-3 bg-card flex flex-wrap items-center gap-4 sm:gap-6">
        <div>
          <div className="text-[10px] uppercase text-muted-foreground">Total</div>
          <div className="text-lg font-bold">{formatCurrency(totalAmount)}</div>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
          <Input className="h-8 pl-7 text-xs w-[200px]" placeholder="Search name, phone, receipt#..." value={searchTerm} onChange={e => { setSearchTerm(e.target.value); setPage(1); }} />
        </div>
        <DateFilterSelector
          dateFilter={dateFilter}
          startDate={startDate}
          endDate={endDate}
          onDateFilterChange={v => { setDateFilter(v); setPage(1); }}
          onStartDateChange={d => { setStartDate(d); setPage(1); }}
          onEndDateChange={d => { setEndDate(d); setPage(1); }}
          compact
        />
        {(dateFilter !== 'all' || searchTerm) && (
          <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => { setDateFilter('all'); setStartDate(undefined); setEndDate(undefined); setSearchTerm(''); setPage(1); }}>
            Clear
          </Button>
        )}
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              {['S.No.', 'Receipt #', 'Student', 'Partner', 'Amount', 'Method', 'Txn ID', 'Date'].map(h => (
                <TableHead key={h} className="text-xs">{h}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground text-xs">Loading...</TableCell></TableRow>
            ) : paginated.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground text-xs">No receipts found</TableCell></TableRow>
            ) : (
              paginated.map((r, index) => (
                <TableRow key={r.id}>
                  <TableCell className="text-xs text-muted-foreground">{getSerialNumber(index, page, pageSize)}</TableCell>
                  <TableCell className="text-xs font-mono">{r.serial_number || '-'}</TableCell>
                  <TableCell className="text-xs">
                    <div className="font-medium">{r.studentName}</div>
                    {r.studentPhone && <div className="text-muted-foreground text-[10px]">{r.studentPhone}</div>}
                  </TableCell>
                  <TableCell className="text-xs">{r.partnerName || '-'}</TableCell>
                  <TableCell className="text-xs font-semibold">{formatCurrency(r.amount)}</TableCell>
                  <TableCell className="text-xs capitalize">{r.payment_method || '-'}</TableCell>
                  <TableCell className="text-xs font-mono max-w-[120px] truncate">{r.transaction_id || '-'}</TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{new Date(r.created_at).toLocaleString('en-IN')}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <AdminTablePagination
        currentPage={page}
        totalItems={filtered.length}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={s => { setPageSize(s); setPage(1); }}
      />
    </div>
  );
}
