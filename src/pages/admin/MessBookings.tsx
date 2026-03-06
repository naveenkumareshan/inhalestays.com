import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AdminTablePagination, getSerialNumber } from '@/components/admin/AdminTablePagination';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Search, Filter, BookOpen } from 'lucide-react';
import { formatCurrency } from '@/utils/currency';

const badgeCls = (s: string) => {
  switch (s) {
    case 'active': case 'completed': return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
    case 'pending': return 'bg-amber-50 text-amber-700 border border-amber-200';
    case 'cancelled': case 'expired': return 'bg-red-50 text-red-700 border border-red-200';
    default: return 'bg-muted text-muted-foreground border border-border';
  }
};

export default function MessBookings() {
  const [subs, setSubs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [status, setStatus] = useState('');
  const { toast } = useToast();

  useEffect(() => { fetchSubs(); }, [page, searchQuery, status]);

  const fetchSubs = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('mess_subscriptions' as any)
        .select('*, profiles:user_id(name, email, phone), mess_partners:mess_id(name), mess_packages:package_id(name, meal_types, duration_type)', { count: 'exact' })
        .order('created_at', { ascending: false });

      if (status) query = query.eq('status', status);

      const from = (page - 1) * pageSize;
      query = query.range(from, from + pageSize - 1);

      const { data, error, count } = await query;
      if (error) throw error;

      let filtered = data || [];
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        filtered = filtered.filter((s: any) =>
          s.serial_number?.toLowerCase().includes(q) ||
          s.profiles?.name?.toLowerCase().includes(q) ||
          s.profiles?.email?.toLowerCase().includes(q)
        );
      }

      setSubs(filtered);
      setTotalCount(count || 0);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }) : '-';

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Mess Subscriptions</h1>
        <p className="text-muted-foreground text-xs mt-0.5">View and manage all mess meal subscriptions.</p>
      </div>

      <Card className="shadow-sm">
        <CardHeader className="py-3 border-b">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <form onSubmit={e => { e.preventDefault(); setPage(1); }} className="flex gap-2 flex-1 max-w-sm">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input placeholder="Search by name, email or ID..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9 h-8 text-xs" />
              </div>
              <Button type="submit" size="sm" className="h-8 text-xs">Search</Button>
            </form>
            <div className="flex items-center gap-2">
              <Filter className="h-3.5 w-3.5 text-muted-foreground" />
              <Select value={status || 'all'} onValueChange={v => { setStatus(v === 'all' ? '' : v); setPage(1); }}>
                <SelectTrigger className="w-32 h-8 text-xs"><SelectValue placeholder="All Statuses" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
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
          ) : subs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-muted-foreground gap-2">
              <BookOpen className="h-8 w-8 opacity-30" /><p className="text-xs">No subscriptions found.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      {['S.No.', 'ID', 'Student', 'Mess', 'Package', 'Start', 'End', 'Amount', 'Status'].map(h => (
                        <TableHead key={h} className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider py-2 px-2">{h}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {subs.map((s: any, idx: number) => (
                      <TableRow key={s.id} className={idx % 2 === 0 ? 'bg-background' : 'bg-muted/20'}>
                        <TableCell className="py-1 px-2 text-[11px] text-muted-foreground">{getSerialNumber(idx, page, pageSize)}</TableCell>
                        <TableCell className="py-1 px-2 font-mono text-[10px]">{s.serial_number || '-'}</TableCell>
                        <TableCell className="py-1 px-2 text-[11px]">
                          <span className="font-medium">{s.profiles?.name || 'N/A'}</span>
                          {s.profiles?.email && <span className="text-muted-foreground ml-1 text-[10px]">({s.profiles.email})</span>}
                        </TableCell>
                        <TableCell className="py-1 px-2 text-[11px]">{s.mess_partners?.name || '-'}</TableCell>
                        <TableCell className="py-1 px-2 text-[11px]">
                          <div>{s.mess_packages?.name || '-'}</div>
                          <div className="text-[10px] text-muted-foreground">{(s.mess_packages?.meal_types as string[])?.join(', ')}</div>
                        </TableCell>
                        <TableCell className="py-1 px-2 text-[11px] whitespace-nowrap">{fmtDate(s.start_date)}</TableCell>
                        <TableCell className="py-1 px-2 text-[11px] whitespace-nowrap">{fmtDate(s.end_date)}</TableCell>
                        <TableCell className="py-1 px-2 text-[11px] font-semibold">{formatCurrency(s.price_paid || 0)}</TableCell>
                        <TableCell className="py-1 px-2">
                          <span className={`inline-flex items-center rounded-full px-1.5 py-0 text-[10px] font-medium capitalize ${badgeCls(s.status || 'pending')}`}>{s.status || 'pending'}</span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="border-t">
                <AdminTablePagination
                  currentPage={page}
                  totalItems={totalCount}
                  pageSize={pageSize}
                  onPageChange={setPage}
                  onPageSizeChange={s => { setPageSize(s); setPage(1); }}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
