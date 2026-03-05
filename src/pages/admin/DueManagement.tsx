import React, { useState, useEffect, useMemo } from 'react';
import { format, differenceInDays, isPast } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Wallet, AlertTriangle, IndianRupee, Calendar, Search, Receipt, Pencil } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { vendorSeatsService, VendorCabin } from '@/api/vendorSeatsService';
import { Textarea } from '@/components/ui/textarea';
import { DuePaymentHistory } from '@/components/booking/DuePaymentHistory';
import { PaymentMethodSelector } from '@/components/vendor/PaymentMethodSelector';
import { getEffectiveOwnerId } from '@/utils/getEffectiveOwnerId';
import { resolvePaymentMethodLabels, getMethodLabel } from '@/utils/paymentMethodLabels';

const DueManagement: React.FC = () => {
  const [dues, setDues] = useState<any[]>([]);
  const [cabins, setCabins] = useState<VendorCabin[]>([]);
  const [summary, setSummary] = useState({ totalDue: 0, overdue: 0, dueToday: 0, collectedThisMonth: 0 });
  const [loading, setLoading] = useState(true);
  const [filterCabin, setFilterCabin] = useState('all');
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

  // Date editing state
  const [editingField, setEditingField] = useState<'due_date' | 'seat_valid' | null>(null);
  const [editDueId, setEditDueId] = useState<string>('');
  const [editDateValue, setEditDateValue] = useState<string>('');
  const [editMaxDate, setEditMaxDate] = useState<string>('');
  const [savingDate, setSavingDate] = useState(false);
  const [dateDialogOpen, setDateDialogOpen] = useState(false);
  const [partnerId, setPartnerId] = useState<string>('');
  const [customLabels, setCustomLabels] = useState<Record<string, string>>({});

  const { toast } = useToast();
  const isMobile = useIsMobile();

  const fetchData = async () => {
    setLoading(true);
    const [duesRes, summaryRes, cabinsRes] = await Promise.all([
      vendorSeatsService.getAllDues({ cabinId: filterCabin, status: filterStatus, search: searchTerm }),
      vendorSeatsService.getDueSummary(),
      vendorSeatsService.getVendorCabins(),
    ]);
    if (duesRes.success) setDues(duesRes.data);
    if (summaryRes.success) setSummary(summaryRes.data);
    if (cabinsRes.success && cabinsRes.data) setCabins(cabinsRes.data.data as any);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [filterCabin, filterStatus]);

  // Resolve partner ID and custom labels for payment methods
  useEffect(() => {
    (async () => {
      try {
        const { ownerId } = await getEffectiveOwnerId();
        setPartnerId(ownerId);
      } catch { /* ignore */ }
    })();
  }, []);

  const handleSearch = () => fetchData();

  const getStatusBadge = (due: any) => {
    const today = new Date().toISOString().split('T')[0];
    const remaining = Number(due.due_amount) - Number(due.paid_amount);
    if (due.status === 'paid' || remaining <= 0) return <Badge className="bg-emerald-500 text-white text-[10px]">Paid</Badge>;
    if (due.status === 'partially_paid') return <Badge className="bg-orange-500 text-white text-[10px]">Partial</Badge>;
    if (due.due_date < today) return <Badge className="bg-red-500 text-white text-[10px]">Overdue</Badge>;
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
      .from('receipts')
      .select('*')
      .eq('booking_id', due.booking_id)
      .order('created_at', { ascending: false });
    setReceipts(data || []);
    // Resolve custom payment method labels
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
    setCollecting(true);
    const res = await vendorSeatsService.collectDuePayment(selectedDue.id, amt, collectMethod, collectTxnId, collectNotes);
    if (res.success) {
      toast({ title: 'Payment collected successfully' });
      setCollectOpen(false);
      fetchData();
    } else {
      toast({ title: 'Error', description: res.error, variant: 'destructive' });
    }
    setCollecting(false);
  };

  const openDateEdit = (due: any, field: 'due_date' | 'seat_valid') => {
    setEditingField(field);
    setEditDueId(due.id);
    if (field === 'due_date') {
      setEditDateValue(due.due_date || '');
      setEditMaxDate('');
    } else {
      setEditDateValue(due.proportional_end_date || '');
      setEditMaxDate((due.bookings as any)?.end_date || '');
    }
    setDateDialogOpen(true);
  };

  const handleSaveDate = async () => {
    if (!editDueId || !editDateValue) return;
    if (editingField === 'seat_valid' && editMaxDate && editDateValue > editMaxDate) {
      toast({ title: 'Seat validity cannot exceed booking end date', variant: 'destructive' });
      return;
    }
    setSavingDate(true);
    const updateField = editingField === 'due_date' ? 'due_date' : 'proportional_end_date';
    const { error } = await supabase.from('dues').update({ [updateField]: editDateValue }).eq('id', editDueId);
    if (error) {
      toast({ title: 'Error updating date', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Date updated successfully' });
      setDateDialogOpen(false);
      setEditingField(null);
      fetchData();
    }
    setSavingDate(false);
  };

  return (
    <div className="space-y-3">
      <h1 className="text-lg font-semibold">Due Management</h1>

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
          <Calendar className="h-4 w-4 text-amber-500" />
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
          <Select value={filterCabin} onValueChange={setFilterCabin}>
            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Reading Room" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All Rooms</SelectItem>
              {cabins.map(c => <SelectItem key={c._id} value={c._id} className="text-xs">{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="w-36">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All Status</SelectItem>
              <SelectItem value="pending" className="text-xs">Pending</SelectItem>
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
              {isMobile ? (
                <div className="space-y-3 p-3">
                  {dues.map((due: any) => {
                    const remaining = Number(due.due_amount) - Number(due.paid_amount);
                    return (
                      <div key={due.id} className="border rounded-lg p-3 bg-card space-y-2">
                        <div className="flex items-start justify-between">
                          <div className="min-w-0">
                            <p className="font-medium text-xs">{(due.profiles as any)?.name || 'N/A'}</p>
                            <p className="text-[10px] text-muted-foreground">{(due.profiles as any)?.phone}</p>
                          </div>
                          {getStatusBadge(due)}
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-[11px]">
                          <div><span className="text-muted-foreground">Room: </span>{(due.cabins as any)?.name || ''} #{(due.seats as any)?.number || ''}</div>
                          <div><span className="text-muted-foreground">Total: </span>₹{Number(due.total_fee).toLocaleString()}</div>
                          <div className="text-emerald-600">Paid: ₹{(Number(due.advance_paid) + Number(due.paid_amount)).toLocaleString()}</div>
                          <div className="text-red-600 font-medium">Due: ₹{Math.max(0, remaining).toLocaleString()}</div>
                        </div>
                        <div className="flex items-center justify-between pt-1 border-t text-[11px]">
                          <div>{getDaysInfo(due)}</div>
                          <div className="flex gap-1">
                            {remaining > 0 && (
                              <Button size="sm" variant="outline" className="h-7 text-[10px] px-2" onClick={() => openCollect(due)}>Collect</Button>
                            )}
                            <Button size="sm" variant="ghost" className="h-7 text-[10px] px-2 gap-1" onClick={() => openReceipts(due)}>
                              <Receipt className="h-3 w-3" /> Receipts
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
              <Table>
                <TableHeader>
                  <TableRow className="text-[10px]">
                    <TableHead className="text-[10px]">Booking Date</TableHead>
                    <TableHead className="text-[10px]">Student</TableHead>
                    <TableHead className="text-[10px]">Room / Seat</TableHead>
                    <TableHead className="text-[10px]">Booking</TableHead>
                    <TableHead className="text-[10px] text-right">Total</TableHead>
                    <TableHead className="text-[10px] text-right">Paid</TableHead>
                    <TableHead className="text-[10px] text-right">Due</TableHead>
                    <TableHead className="text-[10px]">Due Date</TableHead>
                    <TableHead className="text-[10px]">Seat Valid</TableHead>
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
                          {(due.bookings as any)?.start_date ? format(new Date((due.bookings as any).start_date), 'dd MMM yy') : '-'}
                        </TableCell>
                        <TableCell className="py-2">
                          <div className="font-medium text-[11px]">{(due.profiles as any)?.name || 'N/A'}</div>
                          {(due.profiles as any)?.phone && <div className="text-[10px] text-muted-foreground">{(due.profiles as any)?.phone}</div>}
                          {(due.profiles as any)?.email && <div className="text-[10px] text-muted-foreground">{(due.profiles as any)?.email}</div>}
                        </TableCell>
                        <TableCell className="py-2">
                          <div className="text-[11px]">{(due.cabins as any)?.name || ''}</div>
                          <div className="text-[10px] text-muted-foreground">Seat #{(due.seats as any)?.number || ''}</div>
                        </TableCell>
                        <TableCell className="py-2">
                          <div className="text-[10px] text-muted-foreground">{(due.bookings as any)?.serial_number || '-'}</div>
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
                            <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => openDateEdit(due, 'due_date')}>
                              <Pencil className="h-3 w-3 text-muted-foreground" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell className="py-2">
                          <div className="flex items-center gap-1">
                            <span className="text-[11px]">{due.proportional_end_date ? format(new Date(due.proportional_end_date), 'dd MMM yy') : '-'}</span>
                            <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => openDateEdit(due, 'seat_valid')}>
                              <Pencil className="h-3 w-3 text-muted-foreground" />
                            </Button>
                          </div>
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
              )}
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
                  partnerId={partnerId}
                  idPrefix="dc"
                  columns={2}
                />
              </div>

              {(collectMethod === 'upi' || collectMethod === 'bank_transfer' || collectMethod.startsWith('custom_')) && (
                <div>
                  <Label className="text-xs">Transaction ID</Label>
                  <Input className="h-8 text-xs" value={collectTxnId} onChange={e => setCollectTxnId(e.target.value)} />
                </div>
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
              <DuePaymentHistory dueId={selectedDue.id} defaultOpen />
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
              {(receiptsDue.profiles as any)?.name} · {(receiptsDue.bookings as any)?.serial_number || 'N/A'}
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
      <Dialog open={dateDialogOpen} onOpenChange={(open) => { if (!open) { setDateDialogOpen(false); setEditingField(null); } }}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle className="text-sm">
              {editingField === 'due_date' ? 'Edit Due Date' : 'Edit Seat Validity'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">
                {editingField === 'due_date' ? 'Due Date' : 'Seat Valid Until'}
              </Label>
              <Input
                type="date"
                className="h-9 text-sm"
                value={editDateValue}
                max={editingField === 'seat_valid' && editMaxDate ? editMaxDate : undefined}
                onChange={(e) => setEditDateValue(e.target.value)}
              />
              {editingField === 'seat_valid' && editMaxDate && (
                <p className="text-[10px] text-muted-foreground mt-1">
                  Max: {format(new Date(editMaxDate), 'dd MMM yyyy')} (booking end)
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 h-8 text-xs" onClick={() => { setDateDialogOpen(false); setEditingField(null); }}>
                Cancel
              </Button>
              <Button className="flex-1 h-8 text-xs" onClick={handleSaveDate} disabled={savingDate || !editDateValue}>
                {savingDate ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DueManagement;
