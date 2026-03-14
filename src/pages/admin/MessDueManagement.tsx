import React, { useState, useEffect, useMemo } from 'react';
import { getEffectiveOwnerId } from '@/utils/getEffectiveOwnerId';
import { format, differenceInDays } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Wallet, AlertTriangle, IndianRupee, Calendar as CalendarIcon, Search, Receipt, UtensilsCrossed } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Textarea } from '@/components/ui/textarea';
import { PaymentMethodSelector } from '@/components/vendor/PaymentMethodSelector';
import { resolvePaymentMethodLabels, getMethodLabel } from '@/utils/paymentMethodLabels';
import { AdminTablePagination, getSerialNumber } from '@/components/admin/AdminTablePagination';
import { useIsMobile } from '@/hooks/use-mobile';
import { formatCurrency } from '@/utils/currency';

const MessDueManagement: React.FC = () => {
  const [dues, setDues] = useState<any[]>([]);
  const [messPartners, setMessPartners] = useState<any[]>([]);
  const [summary, setSummary] = useState({ totalDue: 0, overdue: 0, dueToday: 0, collectedThisMonth: 0 });
  const [loading, setLoading] = useState(true);
  const [filterMess, setFilterMess] = useState('all');
  const [filterStatus, setFilterStatus] = useState('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Receipts dialog
  const [receiptsOpen, setReceiptsOpen] = useState(false);
  const [receiptsDue, setReceiptsDue] = useState<any>(null);
  const [receipts, setReceipts] = useState<any[]>([]);
  const [receiptsLoading, setReceiptsLoading] = useState(false);

  // Collect drawer
  const [collectOpen, setCollectOpen] = useState(false);
  const [selectedDue, setSelectedDue] = useState<any>(null);
  const [collectAmount, setCollectAmount] = useState('');
  const [collectMethod, setCollectMethod] = useState('cash');
  const [collectTxnId, setCollectTxnId] = useState('');
  const [collectNotes, setCollectNotes] = useState('');
  const [collecting, setCollecting] = useState(false);
  const [partnerId, setPartnerId] = useState<string>('');
  const [customLabels, setCustomLabels] = useState<Record<string, string>>({});

  const { toast } = useToast();
  const { user } = useAuth();
  const isMobile = useIsMobile();

  const fetchData = async () => {
    setLoading(true);
    try {
      const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
      let ownerId: string | undefined;
      if (!isAdmin && user?.id) {
        try {
          const res = await getEffectiveOwnerId();
          ownerId = res.ownerId;
        } catch { ownerId = user.id; }
      }

      // Fetch mess partners
      let messQ = supabase.from('mess_partners' as any).select('id, name').eq('is_active', true);
      if (ownerId) messQ = messQ.eq('created_by', ownerId);
      const { data: messData } = await messQ;
      setMessPartners(messData || []);

      const messIds = (messData || []).map((m: any) => m.id);
      if (messIds.length === 0) {
        setDues([]);
        setSummary({ totalDue: 0, overdue: 0, dueToday: 0, collectedThisMonth: 0 });
        setLoading(false);
        return;
      }

      // Fetch dues
      let duesQ = supabase.from('mess_dues' as any).select('*').in('mess_id', messIds).order('created_at', { ascending: false });
      if (filterMess !== 'all') duesQ = duesQ.eq('mess_id', filterMess);
      const { data: duesData } = await duesQ;
      let rows = (duesData || []) as any[];

      // Client-side status filter based on actual remaining amount
      if (filterStatus === 'pending') {
        rows = rows.filter(r => (Number(r.due_amount || 0) - Number(r.paid_amount || 0)) > 0);
      } else if (filterStatus === 'paid') {
        rows = rows.filter(r => (Number(r.due_amount || 0) - Number(r.paid_amount || 0)) <= 0 || r.status === 'paid');
      }

      // Enrich with student names
      const userIds = [...new Set(rows.map(r => r.user_id))];
      if (userIds.length > 0) {
        const { data: profiles } = await supabase.from('profiles').select('id, name, phone').in('id', userIds);
        const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));
        rows.forEach(r => {
          const p = profileMap.get(r.user_id);
          if (p) { r.student_name = p.name; r.student_phone = p.phone; }
        });
      }

      // Enrich with mess names
      const messMap = new Map((messData || []).map((m: any) => [m.id, m.name]));
      rows.forEach(r => { r.mess_name = messMap.get(r.mess_id) || '-'; });

      // Search filter
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        rows = rows.filter(r =>
          (r.student_name || '').toLowerCase().includes(term) ||
          (r.student_phone || '').toLowerCase().includes(term) ||
          (r.serial_number || '').toLowerCase().includes(term)
        );
      }

      // Compute summary
      const todayStr = format(new Date(), 'yyyy-MM-dd');
      const monthStart = format(new Date(), 'yyyy-MM-01');
      let totalDue = 0, overdue = 0, dueToday = 0, collectedThisMonth = 0;
      rows.forEach(r => {
        const remaining = (r.due_amount || 0) - (r.paid_amount || 0);
        if (r.status !== 'paid' && remaining > 0) {
          totalDue += remaining;
          if (r.due_date === todayStr) dueToday += remaining;
          if (r.due_date < todayStr) overdue += remaining;
        }
        if (r.status === 'paid' && r.updated_at >= monthStart) collectedThisMonth += (r.paid_amount || 0);
      });
      setSummary({ totalDue, overdue, dueToday, collectedThisMonth });

      setDues(rows);
    } catch (e) {
      console.error('Error fetching mess dues:', e);
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); setCurrentPage(1); }, [filterMess, filterStatus]);

  useEffect(() => {
    const init = async () => {
      try {
        const res = await getEffectiveOwnerId();
        setPartnerId(res.ownerId);
        const labels = await resolvePaymentMethodLabels(res.ownerId as any);
        setCustomLabels(labels);
      } catch {}
    };
    init();
  }, []);

  const handleSearch = () => { fetchData(); setCurrentPage(1); };

  const paginatedDues = useMemo(() => {
    return dues.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  }, [dues, currentPage, pageSize]);

  const openCollect = (due: any) => {
    setSelectedDue(due);
    const remaining = (due.due_amount || 0) - (due.paid_amount || 0);
    setCollectAmount(remaining > 0 ? remaining.toString() : '');
    setCollectMethod('cash');
    setCollectTxnId('');
    setCollectNotes('');
    setCollectOpen(true);
  };

  const handleCollect = async () => {
    if (!selectedDue || !collectAmount) return;
    setCollecting(true);
    try {
      const amount = parseFloat(collectAmount);
      const collectorName = user?.name || user?.email || 'Partner';

      // Insert payment record
      await supabase.from('mess_due_payments' as any).insert({
        due_id: selectedDue.id,
        amount,
        payment_method: collectMethod,
        transaction_id: collectTxnId || `MESS-${Date.now()}`,
        notes: collectNotes,
        collected_by: user?.id,
        collected_by_name: collectorName,
      });

      // Update due
      const newPaid = (selectedDue.paid_amount || 0) + amount;
      const remaining = Math.max(0, (selectedDue.due_amount || 0) - newPaid);
      await supabase.from('mess_dues' as any).update({
        paid_amount: newPaid,
        status: remaining <= 0 ? 'paid' : 'pending',
        updated_at: new Date().toISOString(),
      }).eq('id', selectedDue.id);

      toast({ title: 'Payment collected', description: `₹${amount} collected successfully` });
      setCollectOpen(false);
      fetchData();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
    setCollecting(false);
  };

  const openReceipts = async (due: any) => {
    setReceiptsDue(due);
    setReceiptsOpen(true);
    setReceiptsLoading(true);
    const { data } = await supabase.from('mess_due_payments' as any).select('*').eq('due_id', due.id).order('created_at', { ascending: false });
    setReceipts(data || []);
    setReceiptsLoading(false);
  };

  const getStatusBadge = (due: any) => {
    const remaining = (due.due_amount || 0) - (due.paid_amount || 0);
    if (due.status === 'paid' || remaining <= 0) return <Badge className="bg-emerald-100 text-emerald-800 text-[9px]">Paid</Badge>;
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    if (due.due_date < todayStr) return <Badge variant="destructive" className="text-[9px]">Overdue</Badge>;
    if (due.due_date === todayStr) return <Badge className="bg-amber-100 text-amber-800 text-[9px]">Due Today</Badge>;
    return <Badge variant="secondary" className="text-[9px]">Pending</Badge>;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <UtensilsCrossed className="h-5 w-5 text-primary" />
        <h1 className="text-base font-semibold">Mess Due Management</h1>
        <Badge variant="secondary" className="text-[10px]">{dues.length}</Badge>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-3 flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center"><Wallet className="h-4 w-4 text-primary" /></div>
          <div><p className="text-[10px] text-muted-foreground">Total Due</p><p className="text-lg font-bold">{formatCurrency(summary.totalDue)}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-3 flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-destructive/10 flex items-center justify-center"><AlertTriangle className="h-4 w-4 text-destructive" /></div>
          <div><p className="text-[10px] text-muted-foreground">Overdue</p><p className="text-lg font-bold text-destructive">{formatCurrency(summary.overdue)}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-3 flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-amber-100 flex items-center justify-center"><CalendarIcon className="h-4 w-4 text-amber-600" /></div>
          <div><p className="text-[10px] text-muted-foreground">Due Today</p><p className="text-lg font-bold text-amber-600">{formatCurrency(summary.dueToday)}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-3 flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center"><IndianRupee className="h-4 w-4 text-emerald-600" /></div>
          <div><p className="text-[10px] text-muted-foreground">Collected (Month)</p><p className="text-lg font-bold text-emerald-600">{formatCurrency(summary.collectedThisMonth)}</p></div>
        </CardContent></Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Select value={filterMess} onValueChange={(v) => { setFilterMess(v); }}>
          <SelectTrigger className="h-8 w-[180px] text-xs"><SelectValue placeholder="All Mess" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">All Mess</SelectItem>
            {messPartners.map(m => <SelectItem key={m.id} value={m.id} className="text-xs">{m.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button size="sm" variant={filterStatus === 'pending' ? 'default' : 'outline'} className="h-8 text-xs" onClick={() => setFilterStatus('pending')}>Pending</Button>
        <Button size="sm" variant={filterStatus === 'paid' ? 'default' : 'outline'} className="h-8 text-xs" onClick={() => setFilterStatus('paid')}>Paid</Button>
        <div className="relative flex-1 min-w-[150px]">
          <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Search name, phone, ID..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()} className="h-8 pl-7 text-xs" />
        </div>
        <Button size="sm" variant="outline" className="h-8 text-xs" onClick={handleSearch}>Search</Button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin h-6 w-6 border-4 border-primary border-t-transparent rounded-full" /></div>
      ) : dues.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">
          <Wallet className="h-10 w-10 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No mess dues found</p>
        </CardContent></Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            {isMobile ? (
              <div className="divide-y">
                {paginatedDues.map((due, idx) => {
                  const remaining = (due.due_amount || 0) - (due.paid_amount || 0);
                  return (
                    <div key={due.id} className="p-3 space-y-1.5">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[10px] text-muted-foreground mr-1">#{getSerialNumber(idx, currentPage, pageSize)}</span>
                          <span className="text-xs font-medium">{due.student_name || '-'}</span>
                        </div>
                        {getStatusBadge(due)}
                      </div>
                      <div className="grid grid-cols-2 gap-1 text-[10px] text-muted-foreground">
                        <span>Mess: {due.mess_name}</span>
                        <span>Due: {formatCurrency(due.due_amount || 0)}</span>
                        <span>Paid: {formatCurrency(due.paid_amount || 0)}</span>
                        <span>Remaining: {formatCurrency(Math.max(0, remaining))}</span>
                        <span>Due Date: {due.due_date}</span>
                        {due.serial_number && <span>ID: {due.serial_number}</span>}
                      </div>
                      {remaining > 0 && due.status !== 'paid' && (
                        <div className="flex gap-1 pt-1">
                          <Button size="sm" className="h-6 text-[10px]" onClick={() => openCollect(due)}>Collect</Button>
                          <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={() => openReceipts(due)}>
                            <Receipt className="h-3 w-3 mr-1" /> History
                          </Button>
                        </div>
                      )}
                      {(remaining <= 0 || due.status === 'paid') && (
                        <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={() => openReceipts(due)}>
                          <Receipt className="h-3 w-3 mr-1" /> History
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-[10px] w-[40px]">S.No.</TableHead>
                      <TableHead className="text-[10px]">Due ID</TableHead>
                      <TableHead className="text-[10px]">Student</TableHead>
                      <TableHead className="text-[10px]">Mess</TableHead>
                      <TableHead className="text-[10px] text-right">Due Amount</TableHead>
                      <TableHead className="text-[10px] text-right">Paid</TableHead>
                      <TableHead className="text-[10px] text-right">Remaining</TableHead>
                      <TableHead className="text-[10px]">Due Date</TableHead>
                      <TableHead className="text-[10px]">Status</TableHead>
                      <TableHead className="text-[10px] text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedDues.map((due, idx) => {
                      const remaining = (due.due_amount || 0) - (due.paid_amount || 0);
                      return (
                        <TableRow key={due.id}>
                          <TableCell className="text-[11px] text-muted-foreground">{getSerialNumber(idx, currentPage, pageSize)}</TableCell>
                          <TableCell className="text-[10px] font-mono">{due.serial_number || due.id?.slice(0, 8)}</TableCell>
                          <TableCell className="text-[11px]">
                            <div className="font-medium">{due.student_name || '-'}</div>
                            <div className="text-[10px] text-muted-foreground">{due.student_phone || ''}</div>
                          </TableCell>
                          <TableCell className="text-[11px]">{due.mess_name}</TableCell>
                          <TableCell className="text-[11px] text-right">{formatCurrency(due.due_amount || 0)}</TableCell>
                          <TableCell className="text-[11px] text-right text-emerald-600">{formatCurrency(due.paid_amount || 0)}</TableCell>
                          <TableCell className="text-[11px] text-right font-medium">{formatCurrency(Math.max(0, remaining))}</TableCell>
                          <TableCell className="text-[11px]">{due.due_date}</TableCell>
                          <TableCell>{getStatusBadge(due)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              {remaining > 0 && due.status !== 'paid' && (
                                <Button size="sm" className="h-6 text-[10px]" onClick={() => openCollect(due)}>Collect</Button>
                              )}
                              <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={() => openReceipts(due)}>
                                <Receipt className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
            <AdminTablePagination
              currentPage={currentPage}
              totalItems={dues.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={(s) => { setPageSize(s); setCurrentPage(1); }}
            />
          </CardContent>
        </Card>
      )}

      {/* Collect Sheet */}
      <Sheet open={collectOpen} onOpenChange={setCollectOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="text-sm">Collect Mess Due Payment</SheetTitle>
          </SheetHeader>
          {selectedDue && (
            <div className="space-y-4 mt-4">
              <div className="text-xs space-y-1 p-3 bg-muted/30 rounded-md">
                <p><span className="text-muted-foreground">Student:</span> {selectedDue.student_name}</p>
                <p><span className="text-muted-foreground">Due Amount:</span> {formatCurrency(selectedDue.due_amount || 0)}</p>
                <p><span className="text-muted-foreground">Already Paid:</span> {formatCurrency(selectedDue.paid_amount || 0)}</p>
                <p><span className="text-muted-foreground">Remaining:</span> {formatCurrency(Math.max(0, (selectedDue.due_amount || 0) - (selectedDue.paid_amount || 0)))}</p>
              </div>
              <Separator />
              <div className="space-y-3">
                <div>
                  <Label className="text-xs">Amount</Label>
                  <Input type="number" value={collectAmount} onChange={e => setCollectAmount(e.target.value)} className="h-8 text-xs" />
                </div>
                <PaymentMethodSelector value={collectMethod} onValueChange={setCollectMethod} partnerId={partnerId} />
                <div>
                  <Label className="text-xs">Transaction ID</Label>
                  <Input value={collectTxnId} onChange={e => setCollectTxnId(e.target.value)} className="h-8 text-xs" placeholder="Optional" />
                </div>
                <div>
                  <Label className="text-xs">Notes</Label>
                  <Textarea value={collectNotes} onChange={e => setCollectNotes(e.target.value)} className="text-xs" rows={2} placeholder="Optional" />
                </div>
                <Button className="w-full" onClick={handleCollect} disabled={collecting || !collectAmount}>
                  {collecting ? 'Collecting...' : `Collect ${formatCurrency(parseFloat(collectAmount) || 0)}`}
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Receipts Dialog */}
      <Dialog open={receiptsOpen} onOpenChange={setReceiptsOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-sm">Payment History — {receiptsDue?.student_name}</DialogTitle>
          </DialogHeader>
          {receiptsLoading ? (
            <div className="flex justify-center py-8"><div className="animate-spin h-6 w-6 border-4 border-primary border-t-transparent rounded-full" /></div>
          ) : receipts.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No payments recorded yet</p>
          ) : (
            <div className="border rounded-md overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-[10px]">Date</TableHead>
                    <TableHead className="text-[10px] text-right">Amount</TableHead>
                    <TableHead className="text-[10px]">Method</TableHead>
                    <TableHead className="text-[10px]">Collected By</TableHead>
                    <TableHead className="text-[10px]">Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {receipts.map(r => (
                    <TableRow key={r.id}>
                      <TableCell className="text-[10px]">{r.created_at ? format(new Date(r.created_at), 'dd MMM yyyy') : '-'}</TableCell>
                      <TableCell className="text-[10px] text-right font-medium">{formatCurrency(r.amount || 0)}</TableCell>
                      <TableCell className="text-[10px]">{getMethodLabel(r.payment_method || 'cash', customLabels)}</TableCell>
                      <TableCell className="text-[10px]">{r.collected_by_name || '-'}</TableCell>
                      <TableCell className="text-[10px] max-w-[150px] truncate">{r.notes || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MessDueManagement;
