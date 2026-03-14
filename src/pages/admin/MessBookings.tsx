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
import { Search, Filter, BookOpen, Plus, XCircle, RefreshCw, IndianRupee } from 'lucide-react';
import { formatCurrency } from '@/utils/currency';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { addDays, addMonths, subDays, format } from 'date-fns';
import { updateMessSubscription, createMessReceipt } from '@/api/messService';
import { PaymentProofUpload } from '@/components/payment/PaymentProofUpload';

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
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const routePrefix = isAdmin ? '/admin' : '/partner';

  // Cancel dialog
  const [cancelSub, setCancelSub] = useState<any>(null);
  // Renew dialog
  const [renewSub, setRenewSub] = useState<any>(null);
  const [renewMonths, setRenewMonths] = useState(1);
  const [renewPrice, setRenewPrice] = useState(0);
  const [renewPaymentMethod, setRenewPaymentMethod] = useState('cash');
  const [renewTxnId, setRenewTxnId] = useState('');
  const [renewProofUrl, setRenewProofUrl] = useState('');
  const [renewNotes, setRenewNotes] = useState('');
  const [renewSubmitting, setRenewSubmitting] = useState(false);

  // Collect due dialog
  const [collectSub, setCollectSub] = useState<any>(null);
  const [collectAmount, setCollectAmount] = useState(0);
  const [collectPaymentMethod, setCollectPaymentMethod] = useState('cash');
  const [collectTxnId, setCollectTxnId] = useState('');
  const [collectProofUrl, setCollectProofUrl] = useState('');
  const [collectNotes, setCollectNotes] = useState('');
  const [collectSubmitting, setCollectSubmitting] = useState(false);
  const [duesMap, setDuesMap] = useState<Record<string, any>>({});

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

      // Fetch dues for these subs
      const subIds = filtered.map((s: any) => s.id);
      if (subIds.length > 0) {
        const { data: dues } = await supabase.from('mess_dues' as any).select('*').in('subscription_id', subIds).eq('status', 'pending');
        const map: Record<string, any> = {};
        (dues || []).forEach((d: any) => { map[d.subscription_id] = d; });
        setDuesMap(map);
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }) : '-';

  // Cancel
  const handleCancel = async () => {
    if (!cancelSub) return;
    try {
      await updateMessSubscription(cancelSub.id, { status: 'cancelled' });
      toast({ title: 'Subscription cancelled' });
      setCancelSub(null);
      fetchSubs();
    } catch (err: any) { toast({ title: 'Error', description: err.message, variant: 'destructive' }); }
  };

  // Renew
  const openRenew = (sub: any) => {
    setRenewSub(sub);
    setRenewMonths(1);
    setRenewPrice(sub.price_paid || 0);
    setRenewPaymentMethod('cash');
    setRenewTxnId('');
    setRenewProofUrl('');
    setRenewNotes('');
  };

  const handleRenew = async () => {
    if (!renewSub) return;
    setRenewSubmitting(true);
    try {
      const currentEnd = new Date(renewSub.end_date);
      const newStart = addDays(currentEnd, 1);
      const newEnd = subDays(addMonths(newStart, renewMonths), 1);
      await updateMessSubscription(renewSub.id, {
        end_date: format(newEnd, 'yyyy-MM-dd'),
        status: 'active',
        price_paid: (renewSub.price_paid || 0) + renewPrice,
      });
      await createMessReceipt({
        subscription_id: renewSub.id,
        user_id: renewSub.user_id,
        mess_id: renewSub.mess_id,
        amount: renewPrice,
        payment_method: renewPaymentMethod,
        transaction_id: renewTxnId,
        collected_by: user?.id,
        collected_by_name: user?.name || '',
        payment_proof_url: renewProofUrl || null,
        notes: renewNotes || `Renewal: ${renewMonths} month(s)`,
      });
      toast({ title: 'Subscription renewed successfully' });
      setRenewSub(null);
      fetchSubs();
    } catch (err: any) { toast({ title: 'Error', description: err.message, variant: 'destructive' }); }
    setRenewSubmitting(false);
  };

  // Collect due
  const openCollect = (sub: any) => {
    const due = duesMap[sub.id];
    setCollectSub(sub);
    setCollectAmount(due ? Math.max(0, due.due_amount - due.paid_amount) : 0);
    setCollectPaymentMethod('cash');
    setCollectTxnId('');
    setCollectProofUrl('');
    setCollectNotes('');
  };

  const handleCollect = async () => {
    if (!collectSub) return;
    const due = duesMap[collectSub.id];
    if (!due) return;
    setCollectSubmitting(true);
    try {
      // Insert due payment
      await supabase.from('mess_due_payments' as any).insert({
        due_id: due.id,
        amount: collectAmount,
        payment_method: collectPaymentMethod,
        transaction_id: collectTxnId,
        payment_proof_url: collectProofUrl || null,
        collected_by: user?.id,
        collected_by_name: user?.name || '',
        notes: collectNotes,
      });
      // Update due
      const newPaid = (due.paid_amount || 0) + collectAmount;
      const remaining = Math.max(0, due.due_amount - newPaid);
      await supabase.from('mess_dues' as any).update({
        paid_amount: newPaid,
        status: remaining <= 0 ? 'paid' : 'pending',
      }).eq('id', due.id);
      // Create receipt
      await createMessReceipt({
        subscription_id: collectSub.id,
        user_id: collectSub.user_id,
        mess_id: collectSub.mess_id,
        amount: collectAmount,
        payment_method: collectPaymentMethod,
        transaction_id: collectTxnId,
        collected_by: user?.id,
        collected_by_name: user?.name || '',
        payment_proof_url: collectProofUrl || null,
        notes: collectNotes || 'Due collection',
      });
      toast({ title: 'Due collected successfully' });
      setCollectSub(null);
      fetchSubs();
    } catch (err: any) { toast({ title: 'Error', description: err.message, variant: 'destructive' }); }
    setCollectSubmitting(false);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Mess Subscriptions</h1>
          <p className="text-muted-foreground text-xs mt-0.5">View and manage all mess meal subscriptions.</p>
        </div>
        <Button size="sm" className="gap-1 text-xs" onClick={() => navigate(`${routePrefix}/mess-manual-booking`)}>
          <Plus className="h-3.5 w-3.5" /> Manual Booking
        </Button>
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
                      {['S.No.', 'ID', 'Student', 'Mess', 'Package', 'Start', 'End', 'Amount', 'Status', 'Actions'].map(h => (
                        <TableHead key={h} className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider py-2 px-2">{h}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {subs.map((s: any, idx: number) => {
                      const hasDue = !!duesMap[s.id];
                      const dueRemaining = hasDue ? Math.max(0, duesMap[s.id].due_amount - duesMap[s.id].paid_amount) : 0;
                      return (
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
                          <TableCell className="py-1 px-2 text-[11px] font-semibold">
                            {formatCurrency(s.price_paid || 0)}
                            {dueRemaining > 0 && <span className="text-red-600 text-[10px] ml-1">(Due: {formatCurrency(dueRemaining)})</span>}
                          </TableCell>
                          <TableCell className="py-1 px-2">
                            <span className={`inline-flex items-center rounded-full px-1.5 py-0 text-[10px] font-medium capitalize ${badgeCls(s.status || 'pending')}`}>{s.status || 'pending'}</span>
                          </TableCell>
                          <TableCell className="py-1 px-2">
                            <div className="flex items-center gap-1">
                              {s.status === 'active' && (
                                <>
                                  <Button size="sm" variant="ghost" className="h-6 px-1.5 text-[10px] gap-0.5" onClick={() => openRenew(s)} title="Renew">
                                    <RefreshCw className="h-3 w-3" />
                                  </Button>
                                  <Button size="sm" variant="ghost" className="h-6 px-1.5 text-[10px] text-red-600 gap-0.5" onClick={() => setCancelSub(s)} title="Cancel">
                                    <XCircle className="h-3 w-3" />
                                  </Button>
                                </>
                              )}
                              {hasDue && dueRemaining > 0 && (
                                <Button size="sm" variant="outline" className="h-6 px-1.5 text-[10px] gap-0.5" onClick={() => openCollect(s)} title="Collect Due">
                                  <IndianRupee className="h-3 w-3" /> Collect
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
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

      {/* Cancel Dialog */}
      <Dialog open={!!cancelSub} onOpenChange={() => setCancelSub(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle className="text-sm">Cancel Subscription</DialogTitle></DialogHeader>
          <p className="text-xs text-muted-foreground">Are you sure you want to cancel the subscription for <strong>{cancelSub?.profiles?.name}</strong>?</p>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setCancelSub(null)}>No</Button>
            <Button variant="destructive" size="sm" onClick={handleCancel}>Yes, Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Renew Dialog */}
      <Dialog open={!!renewSub} onOpenChange={() => setRenewSub(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle className="text-sm">Renew Subscription</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">Extending from {renewSub?.end_date}</p>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Months</Label><Input type="number" min={1} value={renewMonths} onChange={e => setRenewMonths(Number(e.target.value))} className="h-8 text-xs" /></div>
              <div><Label className="text-xs">Amount</Label><Input type="number" value={renewPrice} onChange={e => setRenewPrice(Number(e.target.value))} className="h-8 text-xs" /></div>
              <div>
                <Label className="text-xs">Payment Method</Label>
                <Select value={renewPaymentMethod} onValueChange={setRenewPaymentMethod}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem><SelectItem value="upi">UPI</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem><SelectItem value="card">Card</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs">Txn ID</Label><Input value={renewTxnId} onChange={e => setRenewTxnId(e.target.value)} className="h-8 text-xs" /></div>
            </div>
            {renewPaymentMethod !== 'cash' && <PaymentProofUpload value={renewProofUrl} onChange={setRenewProofUrl} />}
            <Textarea value={renewNotes} onChange={e => setRenewNotes(e.target.value)} placeholder="Notes..." rows={2} className="text-xs" />
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setRenewSub(null)}>Cancel</Button>
            <Button size="sm" onClick={handleRenew} disabled={renewSubmitting}>{renewSubmitting ? 'Renewing...' : 'Renew'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Collect Due Dialog */}
      <Dialog open={!!collectSub} onOpenChange={() => setCollectSub(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle className="text-sm">Collect Due Payment</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">Outstanding: {formatCurrency(collectSub ? Math.max(0, (duesMap[collectSub?.id]?.due_amount || 0) - (duesMap[collectSub?.id]?.paid_amount || 0)) : 0)}</p>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Amount</Label><Input type="number" value={collectAmount} onChange={e => setCollectAmount(Number(e.target.value))} className="h-8 text-xs" /></div>
              <div>
                <Label className="text-xs">Payment Method</Label>
                <Select value={collectPaymentMethod} onValueChange={setCollectPaymentMethod}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem><SelectItem value="upi">UPI</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem><SelectItem value="card">Card</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs">Txn ID</Label><Input value={collectTxnId} onChange={e => setCollectTxnId(e.target.value)} className="h-8 text-xs" /></div>
            </div>
            {collectPaymentMethod !== 'cash' && <PaymentProofUpload value={collectProofUrl} onChange={setCollectProofUrl} />}
            <Textarea value={collectNotes} onChange={e => setCollectNotes(e.target.value)} placeholder="Notes..." rows={2} className="text-xs" />
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setCollectSub(null)}>Cancel</Button>
            <Button size="sm" onClick={handleCollect} disabled={collectSubmitting}>{collectSubmitting ? 'Collecting...' : 'Collect'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
