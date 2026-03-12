import React, { useState, useEffect } from 'react';
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
import { Wallet, AlertTriangle, IndianRupee, Calendar as CalendarIcon, Search, Receipt, Pencil } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Textarea } from '@/components/ui/textarea';
import { HostelDuePaymentHistory } from '@/components/booking/HostelDuePaymentHistory';
import { PaymentProofUpload } from '@/components/payment/PaymentProofUpload';
import { PaymentMethodSelector } from '@/components/vendor/PaymentMethodSelector';
import { resolvePaymentMethodLabels, getMethodLabel } from '@/utils/paymentMethodLabels';

const HostelDueManagement: React.FC = () => {
  const [dues, setDues] = useState<any[]>([]);
  const [hostels, setHostels] = useState<any[]>([]);
  const [summary, setSummary] = useState({ totalDue: 0, overdue: 0, dueToday: 0, collectedThisMonth: 0 });
  const [loading, setLoading] = useState(true);
  const [filterHostel, setFilterHostel] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

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
  const [collectProofUrl, setCollectProofUrl] = useState('');

  // Date editing state
  const [editingField, setEditingField] = useState<'due_date' | null>(null);
  const [editDueId, setEditDueId] = useState<string | null>(null);
  const [editDateValue, setEditDateValue] = useState<string>('');
  const [editMaxDate, setEditMaxDate] = useState<string>('');
  const [savingDate, setSavingDate] = useState(false);
  const [customLabels, setCustomLabels] = useState<Record<string, string>>({});

  const { toast } = useToast();
  const { user } = useAuth();

  const fetchData = async () => {
    setLoading(true);

    // Fetch hostels (filtered by ownership for partners)
    let hostelsQuery = supabase
      .from('hostels')
      .select('id, name')
      .eq('is_active', true)
      .order('name');

    if (user?.role && user.role !== 'admin' && user.role !== 'super_admin' && user.id) {
      try {
        const { ownerId } = await getEffectiveOwnerId();
        hostelsQuery = hostelsQuery.eq('created_by', ownerId);
      } catch {
        hostelsQuery = hostelsQuery.eq('created_by', user.id);
      }
    }

    const { data: hostelsData } = await hostelsQuery;
    if (hostelsData) setHostels(hostelsData);

    // Fetch dues with joins
    let duesQuery = supabase
      .from('hostel_dues')
      .select('*, profiles:user_id(name, email, phone), hostels:hostel_id(name), hostel_beds:bed_id(bed_number), hostel_bookings:booking_id(serial_number, start_date, end_date)')
      .order('created_at', { ascending: false });

    if (filterHostel !== 'all') duesQuery = duesQuery.eq('hostel_id', filterHostel);
    if (filterStatus !== 'all') duesQuery = duesQuery.eq('status', filterStatus);

    const { data: duesData } = await duesQuery;

    let filteredDues = duesData || [];

    // Client-side search filter
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      filteredDues = filteredDues.filter((d: any) => {
        const name = (d.profiles as any)?.name?.toLowerCase() || '';
        const phone = (d.profiles as any)?.phone?.toLowerCase() || '';
        return name.includes(q) || phone.includes(q);
      });
    }

    setDues(filteredDues);

    // Compute summary from all dues (not filtered)
    const { data: allDues } = await supabase
      .from('hostel_dues')
      .select('due_amount, paid_amount, due_date, status');

    const today = new Date().toISOString().split('T')[0];
    let totalDue = 0, overdue = 0, dueToday = 0;
    (allDues || []).forEach((d: any) => {
      const remaining = Math.max(0, Number(d.due_amount) - Number(d.paid_amount));
      if (d.status !== 'paid' && remaining > 0) {
        totalDue += remaining;
        if (d.due_date < today) overdue += remaining;
        if (d.due_date === today) dueToday += remaining;
      }
    });

    // Collected this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const { data: monthPayments } = await supabase
      .from('hostel_due_payments')
      .select('amount')
      .gte('created_at', startOfMonth.toISOString());

    const collectedThisMonth = (monthPayments || []).reduce((s: number, p: any) => s + Number(p.amount), 0);

    setSummary({ totalDue, overdue, dueToday, collectedThisMonth });
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [filterHostel, filterStatus]);

  const handleSearch = () => fetchData();

  const getStatusBadge = (due: any) => {
    const today = new Date().toISOString().split('T')[0];
    const remaining = Number(due.due_amount) - Number(due.paid_amount);
    if (due.status === 'paid' || remaining <= 0) return <Badge className="bg-emerald-500 text-white text-[10px]">Paid</Badge>;
    if (due.status === 'partially_paid') return <Badge className="bg-orange-500 text-white text-[10px]">Partial</Badge>;
    if (due.status === 'overdue' || due.due_date < today) return <Badge className="bg-red-500 text-white text-[10px]">Overdue</Badge>;
    return <Badge className="bg-amber-500 text-white text-[10px]">Pending</Badge>;
  };

  const getDaysInfo = (due: any) => {
    const today = new Date();
    const dueDate = new Date(due.due_date);
    const diff = differenceInDays(dueDate, today);
    if (due.status === 'paid') return <span className="text-emerald-600 text-[11px]">Paid</span>;
    if (diff < 0) return <span className="text-red-600 font-semibold text-[11px]">{Math.abs(diff)}d overdue</span>;
    if (diff === 0) return <span className="text-amber-600 font-semibold text-[11px]">Due today</span>;
    return <span className="text-muted-foreground text-[11px]">{diff}d left</span>;
  };

  const openReceipts = async (due: any) => {
    setReceiptsDue(due);
    setReceiptsOpen(true);
    setReceiptsLoading(true);
    const { data } = await supabase
      .from('hostel_receipts')
      .select('*')
      .eq('booking_id', due.booking_id)
      .order('created_at', { ascending: false });
    setReceipts(data || []);
    const methods = (data || []).map((r: any) => r.payment_method);
    const labels = await resolvePaymentMethodLabels(methods);
    setCustomLabels(prev => ({ ...prev, ...labels }));
    setReceiptsLoading(false);
  };

  const openCollect = (due: any) => {
    setSelectedDue(due);
    const remaining = Number(due.due_amount) - Number(due.paid_amount);
    setCollectAmount(String(remaining > 0 ? remaining : 0));
    setCollectMethod('cash');
    setCollectTxnId('');
    setCollectNotes('');
    setCollectOpen(true);
  };

  const handleCollect = async () => {
    if (!selectedDue || !collectAmount) return;
    const amt = parseFloat(collectAmount);
    if (amt <= 0) { toast({ title: 'Enter a valid amount', variant: 'destructive' }); return; }
    if (collectMethod !== 'cash' && !collectTxnId.trim()) {
      toast({ title: 'Transaction ID is required for non-cash payments', variant: 'destructive' });
      return;
    }
    setCollecting(true);

    const collectedByName = user?.name || user?.email || 'Admin';
    const currentPaid = Number(selectedDue.paid_amount);
    const newPaid = currentPaid + amt;
    const dueAmount = Number(selectedDue.due_amount);
    const newStatus = newPaid >= dueAmount ? 'paid' : 'partially_paid';

    // Validity always spans the full booking period
    const booking = selectedDue.hostel_bookings;
    const proportionalEndDate: string | null = booking?.end_date || null;

    // Insert due payment
    const { error: paymentError } = await supabase.from('hostel_due_payments').insert({
      due_id: selectedDue.id,
      amount: amt,
      payment_method: collectMethod,
      transaction_id: collectTxnId,
      collected_by: user?.id,
      collected_by_name: collectedByName,
      notes: collectNotes,
    });

    if (paymentError) {
      toast({ title: 'Error', description: paymentError.message, variant: 'destructive' });
      setCollecting(false);
      return;
    }

    // Update hostel_dues
    await supabase.from('hostel_dues').update({
      paid_amount: newPaid,
      status: newStatus,
      proportional_end_date: proportionalEndDate,
    }).eq('id', selectedDue.id);

    // Create hostel receipt
    await supabase.from('hostel_receipts').insert({
      hostel_id: selectedDue.hostel_id,
      booking_id: selectedDue.booking_id,
      user_id: selectedDue.user_id,
      amount: amt,
      payment_method: collectMethod,
      transaction_id: collectTxnId,
      receipt_type: 'due_collection',
      collected_by: user?.id,
      collected_by_name: collectedByName,
      notes: collectNotes,
    });

    // Update hostel_bookings payment_status if fully paid
    if (newStatus === 'paid' && selectedDue.booking_id) {
      await supabase.from('hostel_bookings').update({
        payment_status: 'completed',
        remaining_amount: 0,
      }).eq('id', selectedDue.booking_id);
    }

    toast({ title: 'Payment collected successfully' });
    setCollectOpen(false);
    fetchData();
    setCollecting(false);
  };

  return (
    <div className="space-y-3">
      <h1 className="text-lg font-semibold">Hostel Due Management</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <Card><CardContent className="p-3 flex items-center gap-2">
          <Wallet className="h-4 w-4 text-red-500" />
          <div><p className="text-[10px] text-muted-foreground uppercase">Total Due</p><p className="text-sm font-bold">₹{summary.totalDue.toLocaleString()}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-3 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <div><p className="text-[10px] text-muted-foreground uppercase">Overdue</p><p className="text-sm font-bold text-red-600">₹{summary.overdue.toLocaleString()}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-3 flex items-center gap-2">
          <CalendarIcon className="h-4 w-4 text-amber-500" />
          <div><p className="text-[10px] text-muted-foreground uppercase">Due Today</p><p className="text-sm font-bold">₹{summary.dueToday.toLocaleString()}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-3 flex items-center gap-2">
          <IndianRupee className="h-4 w-4 text-emerald-500" />
          <div><p className="text-[10px] text-muted-foreground uppercase">Collected (Month)</p><p className="text-sm font-bold text-emerald-600">₹{summary.collectedThisMonth.toLocaleString()}</p></div>
        </CardContent></Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-end">
        <div className="w-40">
          <Select value={filterHostel} onValueChange={setFilterHostel}>
            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Hostel" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All Hostels</SelectItem>
              {hostels.map(h => <SelectItem key={h.id} value={h.id} className="text-xs">{h.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="w-36">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All Status</SelectItem>
              <SelectItem value="pending" className="text-xs">Pending</SelectItem>
              <SelectItem value="overdue" className="text-xs">Overdue</SelectItem>
              <SelectItem value="partially_paid" className="text-xs">Partially Paid</SelectItem>
              <SelectItem value="paid" className="text-xs">Paid</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1 min-w-[160px]">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input className="h-8 text-xs pl-7" placeholder="Search student name/phone..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearch()} />
          </div>
        </div>
        <Button size="sm" className="h-8 text-xs" onClick={handleSearch}>Search</Button>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-12"><div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" /></div>
          ) : dues.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">No dues found</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="text-[10px]">
                    <TableHead className="text-[10px]">Booking Date</TableHead>
                    <TableHead className="text-[10px]">Student</TableHead>
                    <TableHead className="text-[10px]">Hostel / Bed</TableHead>
                     <TableHead className="text-[10px]">Booking</TableHead>
                     <TableHead className="text-[10px]">Billing Month</TableHead>
                     <TableHead className="text-[10px] text-right">Total</TableHead>
                     <TableHead className="text-[10px] text-right">Paid</TableHead>
                     <TableHead className="text-[10px] text-right">Due</TableHead>
                     <TableHead className="text-[10px]">Due Date</TableHead>
                     <TableHead className="text-[10px]">Bed Valid</TableHead>
                     <TableHead className="text-[10px]">Status</TableHead>
                     <TableHead className="text-[10px]">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dues.map((due: any) => {
                    const remaining = Number(due.due_amount) - Number(due.paid_amount);
                    return (
                      <TableRow key={due.id} className="text-[11px]">
                        <TableCell className="py-2 text-[11px]">
                          {(due.hostel_bookings as any)?.start_date
                            ? format(new Date((due.hostel_bookings as any).start_date), 'dd MMM yy')
                            : '-'}
                        </TableCell>
                        <TableCell className="py-2">
                          <div className="font-medium text-[11px]">{(due.profiles as any)?.name || 'N/A'}</div>
                          {(due.profiles as any)?.phone && <div className="text-[10px] text-muted-foreground">{(due.profiles as any)?.phone}</div>}
                          {(due.profiles as any)?.email && <div className="text-[10px] text-muted-foreground">{(due.profiles as any)?.email}</div>}
                        </TableCell>
                        <TableCell className="py-2">
                          <div className="text-[11px]">{(due.hostels as any)?.name || ''}</div>
                          <div className="text-[10px] text-muted-foreground">Bed #{(due.hostel_beds as any)?.bed_number || ''}</div>
                        </TableCell>
                         <TableCell className="py-2">
                          <div className="text-[10px] text-muted-foreground">{(due.hostel_bookings as any)?.serial_number || '-'}</div>
                         </TableCell>
                         <TableCell className="py-2">
                          {due.billing_month ? (
                            <div className="flex flex-col gap-0.5">
                              <span className="text-[11px]">{format(new Date(due.billing_month), 'MMM yyyy')}</span>
                              <div className="flex gap-0.5">
                                {due.auto_generated && <Badge variant="outline" className="text-[8px] h-4 px-1">Auto</Badge>}
                                {due.is_prorated && <Badge variant="outline" className="text-[8px] h-4 px-1 border-amber-400 text-amber-600">Prorated</Badge>}
                              </div>
                            </div>
                          ) : (
                            <span className="text-[10px] text-muted-foreground">-</span>
                          )}
                         </TableCell>
                         <TableCell className="py-2 text-right font-medium">₹{Number(due.total_fee).toLocaleString()}</TableCell>
                        <TableCell className="py-2 text-right text-emerald-600">₹{(Number(due.advance_paid) + Number(due.paid_amount)).toLocaleString()}</TableCell>
                        <TableCell className="py-2 text-right text-red-600 font-medium">₹{Math.max(0, remaining).toLocaleString()}</TableCell>
                        <TableCell className="py-2">
                          <div className="flex items-center gap-1">
                            <div>
                              <div className="text-[11px]">{due.due_date ? format(new Date(due.due_date), 'dd MMM yy') : '-'}</div>
                              {getDaysInfo(due)}
                            </div>
                            <button
                              className="p-0.5 rounded hover:bg-muted"
                              onClick={() => {
                                setEditingField('due_date');
                                setEditDueId(due.id);
                                setEditDateValue(due.due_date || '');
                                setEditMaxDate('');
                              }}
                            >
                              <Pencil className="h-3 w-3 text-muted-foreground" />
                            </button>
                          </div>
                        </TableCell>
                        <TableCell className="py-2">
                          <span className="text-[11px]">
                            {due.proportional_end_date ? format(new Date(due.proportional_end_date), 'dd MMM yy') : '-'}
                          </span>
                        </TableCell>
                        <TableCell className="py-2">{getStatusBadge(due)}</TableCell>
                        <TableCell className="py-2">
                          <div className="flex gap-1">
                            {remaining > 0 && (
                              <Button size="sm" variant="outline" className="h-6 text-[10px] px-2" onClick={() => openCollect(due)}>
                                Collect
                              </Button>
                            )}
                            <Button size="sm" variant="ghost" className="h-6 text-[10px] px-2 gap-1" onClick={() => openReceipts(due)}>
                              <Receipt className="h-3 w-3" /> Receipts
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
        </CardContent>
      </Card>

      {/* Collect Payment Drawer */}
      <Sheet open={collectOpen} onOpenChange={setCollectOpen}>
        <SheetContent className="w-[380px] sm:w-[420px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-sm">Collect Due Payment</SheetTitle>
          </SheetHeader>
          {selectedDue && (
            <div className="space-y-4 mt-4">
              <div className="bg-muted/50 rounded p-3 space-y-1 text-[11px]">
                <div className="font-semibold text-sm">{(selectedDue.profiles as any)?.name}</div>
                <div className="text-muted-foreground">{(selectedDue.profiles as any)?.phone}</div>
                <Separator className="my-2" />
                <div className="flex justify-between"><span>Total Fee</span><span className="font-medium">₹{Number(selectedDue.total_fee).toLocaleString()}</span></div>
                <div className="flex justify-between"><span>Advance Paid</span><span>₹{Number(selectedDue.advance_paid).toLocaleString()}</span></div>
                <div className="flex justify-between"><span>Collected So Far</span><span className="text-emerald-600">₹{Number(selectedDue.paid_amount).toLocaleString()}</span></div>
                <div className="flex justify-between font-semibold text-red-600"><span>Remaining Due</span><span>₹{Math.max(0, Number(selectedDue.due_amount) - Number(selectedDue.paid_amount)).toLocaleString()}</span></div>
              </div>

              <div>
                <Label className="text-xs">Amount to Collect (₹)</Label>
                <Input type="number" className="h-8 text-xs" value={collectAmount} onChange={e => setCollectAmount(e.target.value)} />
              </div>

              <div>
                <Label className="text-xs">Payment Method</Label>
                <PaymentMethodSelector
                  value={collectMethod}
                  onValueChange={setCollectMethod}
                  partnerId={user?.vendorId || user?.id}
                  idPrefix="hdc"
                  columns={2}
                />
              </div>

              {collectMethod !== 'cash' && (
                <div>
                  <Label className="text-xs">Transaction ID *</Label>
                  <Input className="h-8 text-xs" value={collectTxnId} onChange={e => setCollectTxnId(e.target.value)} />
                </div>
              )}

              {collectMethod !== 'cash' && (
                <PaymentProofUpload value={collectProofUrl} onChange={setCollectProofUrl} />
              )}

              <div>
                <Label className="text-xs">Notes (optional)</Label>
                <Textarea className="text-xs h-16" value={collectNotes} onChange={e => setCollectNotes(e.target.value)} />
              </div>

              <Button className="w-full h-9 text-xs" onClick={handleCollect} disabled={collecting || !collectAmount}>
                {collecting ? 'Processing...' : `Confirm Collection · ₹${collectAmount}`}
              </Button>

              {/* Payment History */}
              <Separator className="my-3" />
              <HostelDuePaymentHistory dueId={selectedDue.id} defaultOpen />
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Receipts Dialog */}
      <Dialog open={receiptsOpen} onOpenChange={setReceiptsOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm">Booking Receipts</DialogTitle>
          </DialogHeader>
          {receiptsDue && (
            <div className="text-[11px] text-muted-foreground mb-2">
              {(receiptsDue.profiles as any)?.name} · {(receiptsDue.hostel_bookings as any)?.serial_number || 'N/A'}
            </div>
          )}
          {receiptsLoading ? (
            <div className="flex justify-center py-8"><div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full" /></div>
          ) : receipts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-xs">No receipts found</div>
          ) : (
            <div className="space-y-2">
              {receipts.map((r, i) => (
                <div key={r.id} className="border rounded p-3 space-y-1 text-[11px]">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-xs">{r.serial_number || `#${i + 1}`}</span>
                    <Badge variant="outline" className="text-[9px] h-5">
                      {r.receipt_type === 'booking_payment' ? 'Booking' : 'Due Collection'}
                    </Badge>
                  </div>
                  <Separator className="my-1" />
                  <div className="grid grid-cols-2 gap-1">
                    <div><span className="text-muted-foreground">Amount:</span> <span className="font-medium">₹{Number(r.amount).toLocaleString()}</span></div>
                    <div><span className="text-muted-foreground">Method:</span> {getMethodLabel(r.payment_method, customLabels)}</div>
                    <div><span className="text-muted-foreground">Date:</span> {format(new Date(r.created_at), 'dd MMM yy, hh:mm a')}</div>
                    <div><span className="text-muted-foreground">By:</span> {r.collected_by_name || '-'}</div>
                    {r.transaction_id && <div className="col-span-2"><span className="text-muted-foreground">Txn ID:</span> {r.transaction_id}</div>}
                    {r.notes && <div className="col-span-2"><span className="text-muted-foreground">Notes:</span> {r.notes}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Date Edit Dialog */}
      <Dialog open={!!editingField} onOpenChange={(open) => { if (!open) { setEditingField(null); setEditDueId(null); } }}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle className="text-sm">Edit Due Date</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              type="date"
              className="h-9 text-sm"
              value={editDateValue}
              onChange={(e) => setEditDateValue(e.target.value)}
            />
            <Button
              className="w-full h-8 text-xs"
              disabled={!editDateValue || savingDate}
              onClick={async () => {
                if (!editDueId || !editDateValue) return;
                setSavingDate(true);
                const { error } = await supabase
                  .from('hostel_dues')
                  .update({ due_date: editDateValue })
                  .eq('id', editDueId);
                if (error) {
                  toast({ title: 'Error', description: error.message, variant: 'destructive' });
                } else {
                  toast({ title: 'Due date updated' });
                  setEditingField(null);
                  setEditDueId(null);
                  fetchData();
                }
                setSavingDate(false);
              }}
            >
              {savingDate ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default HostelDueManagement;
