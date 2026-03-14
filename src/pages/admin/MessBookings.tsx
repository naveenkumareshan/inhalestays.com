import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { AdminTablePagination, getSerialNumber } from '@/components/admin/AdminTablePagination';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Search, Filter, BookOpen, Plus, XCircle, RefreshCw, IndianRupee, UserPlus, Loader2, Check, CalendarIcon } from 'lucide-react';
import { formatCurrency } from '@/utils/currency';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { addDays, addMonths, subDays, format } from 'date-fns';
import { updateMessSubscription, createMessReceipt, getMessPackages } from '@/api/messService';
import { PaymentProofUpload } from '@/components/payment/PaymentProofUpload';
import { PaymentMethodSelector, requiresTransactionId } from '@/components/vendor/PaymentMethodSelector';
import { getEffectiveOwnerId } from '@/utils/getEffectiveOwnerId';
import { vendorSeatsService } from '@/api/vendorSeatsService';
import { cn } from '@/lib/utils';

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
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

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

  // ──── Booking Sheet state ────
  const [bookingSheetOpen, setBookingSheetOpen] = useState(false);
  const [bookingStep, setBookingStep] = useState<'form' | 'success'>('form');
  const studentSearchRef = useRef<HTMLDivElement>(null);

  // Student
  const [studentQuery, setStudentQuery] = useState('');
  const [studentResults, setStudentResults] = useState<any[]>([]);
  const [studentSearching, setStudentSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedStudentName, setSelectedStudentName] = useState('');
  const [showNewStudent, setShowNewStudent] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [creatingStudent, setCreatingStudent] = useState(false);

  // Mess
  const [messes, setMesses] = useState<any[]>([]);
  const [selectedMess, setSelectedMess] = useState<any>(null);

  // Package
  const [packages, setPackages] = useState<any[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<any>(null);

  // Duration
  const [durationType, setDurationType] = useState<'daily' | 'weekly' | 'monthly'>('monthly');
  const [durationCount, setDurationCount] = useState(1);

  // Dates
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState('');
  const [startDateOpen, setStartDateOpen] = useState(false);

  // Payment
  const [paymentMethod, setPaymentMethod] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [pricePaid, setPricePaid] = useState(0);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [advanceAmount, setAdvanceAmount] = useState(0);
  const [paymentProofUrl, setPaymentProofUrl] = useState('');
  const [collectedByName, setCollectedByName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [partnerId, setPartnerId] = useState('');

  useEffect(() => { fetchSubs(); }, [page, searchQuery, status]);

  // Fetch messes when sheet opens
  useEffect(() => {
    if (!bookingSheetOpen) return;
    (async () => {
      const { ownerId } = await getEffectiveOwnerId();
      setPartnerId(ownerId || '');
      let q = supabase.from('mess_partners' as any).select('id, name, food_type, user_id').eq('is_active', true);
      if (!isAdmin) q = q.eq('user_id', ownerId);
      const { data } = await q.order('name');
      setMesses(data || []);
    })();
  }, [bookingSheetOpen]);

  // Student search
  useEffect(() => {
    if (studentQuery.length < 2) { setStudentResults([]); return; }
    const timer = setTimeout(async () => {
      setStudentSearching(true);
      const res = await vendorSeatsService.searchStudents(studentQuery);
      if (res.success && res.data) { setStudentResults(res.data); setShowResults(true); }
      setStudentSearching(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [studentQuery]);

  const fetchSubs = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('mess_subscriptions' as any)
        .select('*, profiles:user_id(name, email, phone), mess_partners:mess_id(name), mess_packages:package_id(name, meal_types, duration_type), hostel_bookings:hostel_booking_id(hostel_id, hostels:hostel_id(name))', { count: 'exact' })
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
      const newPaid = (due.paid_amount || 0) + collectAmount;
      const remaining = Math.max(0, due.due_amount - newPaid);
      await supabase.from('mess_dues' as any).update({
        paid_amount: newPaid,
        status: remaining <= 0 ? 'paid' : 'pending',
      }).eq('id', due.id);
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

  // ──── Booking Sheet helpers ────
  const resetBookingSheet = () => {
    setBookingStep('form');
    setStudentQuery(''); setStudentResults([]); setShowResults(false);
    setSelectedUserId(''); setSelectedStudentName('');
    setShowNewStudent(false); setNewName(''); setNewEmail(''); setNewPhone('');
    setSelectedMess(null); setPackages([]); setSelectedPackage(null);
    setDurationType('monthly'); setDurationCount(1);
    setStartDate(new Date()); setEndDate('');
    setPaymentMethod(''); setTransactionId('');
    setPricePaid(0); setDiscountAmount(0); setAdvanceAmount(0);
    setPaymentProofUrl(''); setCollectedByName(user?.name || '');
  };

  const openBookingSheet = () => {
    resetBookingSheet();
    setBookingSheetOpen(true);
  };

  const handleStudentSelect = (s: any) => {
    setSelectedUserId(s.id);
    setSelectedStudentName(s.name);
    setStudentQuery(s.name);
    setShowResults(false);
  };

  const handleCreateStudent = async () => {
    if (!newName || !newEmail) { toast({ title: 'Name & email required', variant: 'destructive' }); return; }
    setCreatingStudent(true);
    const res = await vendorSeatsService.createStudent(newName, newEmail, newPhone);
    if (res.success && res.userId) {
      setSelectedUserId(res.userId);
      setSelectedStudentName(newName);
      setShowNewStudent(false);
      toast({ title: res.existing ? 'Existing student selected' : 'Student created' });
    } else { toast({ title: 'Error', description: res.error, variant: 'destructive' }); }
    setCreatingStudent(false);
  };

  const handleMessSelect = async (mess: any) => {
    setSelectedMess(mess);
    setSelectedPackage(null);
    setPartnerId(mess.user_id || partnerId);
    const pkgs = await getMessPackages(mess.id);
    setPackages(pkgs);
  };

  const handlePackageSelect = (pkg: any) => {
    setSelectedPackage(pkg);
    setPricePaid(pkg.price * durationCount);
    setAdvanceAmount(pkg.price * durationCount);
    recalcEndDate(startDate, durationType, durationCount);
  };

  const recalcEndDate = (start: Date, type: string, count: number) => {
    let end: Date;
    if (type === 'daily') end = addDays(start, count - 1);
    else if (type === 'weekly') end = addDays(start, count * 7 - 1);
    else end = subDays(addMonths(start, count), 1);
    setEndDate(format(end, 'yyyy-MM-dd'));
  };

  const handleStartDateChange = (d: Date) => {
    setStartDate(d);
    setStartDateOpen(false);
    recalcEndDate(d, durationType, durationCount);
  };

  const handleDurationTypeChange = (type: 'daily' | 'weekly' | 'monthly') => {
    setDurationType(type);
    setDurationCount(1);
    if (selectedPackage) {
      setPricePaid(selectedPackage.price * 1);
      setAdvanceAmount(selectedPackage.price * 1);
    }
    recalcEndDate(startDate, type, 1);
  };

  const handleDurationCountChange = (count: number) => {
    setDurationCount(count);
    if (selectedPackage) {
      setPricePaid(selectedPackage.price * count);
      setAdvanceAmount(selectedPackage.price * count);
    }
    recalcEndDate(startDate, durationType, count);
  };

  const totalAfterDiscount = Math.max(0, pricePaid - discountAmount);
  const dueAmount = Math.max(0, totalAfterDiscount - advanceAmount);

  const handleBookingSubmit = async () => {
    if (!selectedUserId || !selectedMess || !selectedPackage) return;
    setSubmitting(true);
    try {
      const isPartial = dueAmount > 0;
      const { data: sub, error: subErr } = await supabase.from('mess_subscriptions' as any).insert({
        user_id: selectedUserId,
        mess_id: selectedMess.id,
        package_id: selectedPackage.id,
        start_date: format(startDate, 'yyyy-MM-dd'),
        end_date: endDate,
        price_paid: totalAfterDiscount,
        payment_method: paymentMethod,
        payment_status: isPartial ? 'advance_paid' : 'completed',
        status: 'active',
        transaction_id: transactionId,
        advance_amount: advanceAmount,
        discount_amount: discountAmount,
        notes: '',
        created_by: user?.id,
        collected_by_name: collectedByName || user?.name || '',
        payment_proof_url: paymentProofUrl || null,
      }).select().single();
      if (subErr) throw subErr;

      await createMessReceipt({
        subscription_id: (sub as any).id,
        user_id: selectedUserId,
        mess_id: selectedMess.id,
        amount: advanceAmount,
        payment_method: paymentMethod,
        transaction_id: transactionId,
        collected_by: user?.id,
        collected_by_name: collectedByName || user?.name || '',
        payment_proof_url: paymentProofUrl || null,
        notes: '',
      });

      if (isPartial) {
        await supabase.from('mess_dues' as any).insert({
          subscription_id: (sub as any).id,
          user_id: selectedUserId,
          mess_id: selectedMess.id,
          total_fee: totalAfterDiscount,
          advance_paid: advanceAmount,
          paid_amount: 0,
          due_amount: dueAmount,
          status: 'pending',
          due_date: endDate,
        });
      }

      setBookingStep('success');
      fetchSubs();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
    setSubmitting(false);
  };


  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Mess Subscriptions</h1>
          <p className="text-muted-foreground text-xs mt-0.5">View and manage all mess meal subscriptions.</p>
        </div>
        <Button size="sm" className="gap-1 text-xs" onClick={openBookingSheet}>
          <Plus className="h-3.5 w-3.5" /> Manual Booking
        </Button>
      </div>

      {/* Source-Based Analytics */}
      {subs.length > 0 && (() => {
        const sourceStats = subs.reduce((acc: Record<string, { count: number; revenue: number; hostels: Record<string, number> }>, s: any) => {
          const src = s.source_type || 'manual';
          if (!acc[src]) acc[src] = { count: 0, revenue: 0, hostels: {} };
          acc[src].count++;
          acc[src].revenue += s.price_paid || 0;
          if (src !== 'manual' && s.hostel_bookings?.hostels?.name) {
            const hName = s.hostel_bookings.hostels.name;
            acc[src].hostels[hName] = (acc[src].hostels[hName] || 0) + 1;
          }
          return acc;
        }, {});
        const entries = Object.entries(sourceStats);
        if (entries.length <= 1 && entries[0]?.[0] === 'manual') return null;
        const sourceLabels: Record<string, string> = { manual: 'Manual', hostel_inclusive: 'Hostel Package', addon_purchase: 'Addon' };
        const sourceBg: Record<string, string> = { manual: 'bg-muted', hostel_inclusive: 'bg-blue-50', addon_purchase: 'bg-purple-50' };
        const sourceText: Record<string, string> = { manual: 'text-muted-foreground', hostel_inclusive: 'text-blue-700', addon_purchase: 'text-purple-700' };
        return (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {entries.map(([src, stats]) => (
              <Card key={src} className="overflow-hidden">
                <CardContent className="p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className={`inline-flex items-center rounded-full px-1.5 py-0 text-[10px] font-medium ${sourceBg[src] || 'bg-muted'} ${sourceText[src] || 'text-muted-foreground'} border`}>
                      {sourceLabels[src] || src}
                    </span>
                  </div>
                  <p className="text-lg font-bold">{(stats as any).count} <span className="text-xs font-normal text-muted-foreground">subs</span></p>
                  <p className="text-xs text-muted-foreground">{formatCurrency((stats as any).revenue)}</p>
                  {Object.entries((stats as any).hostels).length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {Object.entries((stats as any).hostels).map(([name, cnt]) => (
                        <Badge key={name} variant="outline" className="text-[9px]">🏨 {name}: {cnt as number}</Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        );
      })()}

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
                    {['S.No.', 'ID', 'Student', 'Mess', 'Package', 'Source', 'Start', 'End', 'Amount', 'Status', 'Actions'].map(h => (
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
                          <TableCell className="py-1 px-2 text-[11px]">
                            {s.source_type === 'hostel_inclusive' ? (
                              <span className="inline-flex items-center rounded-full px-1.5 py-0 text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                                Hostel Package{s.hostel_bookings?.hostels?.name ? ` · ${s.hostel_bookings.hostels.name}` : ''}
                              </span>
                            ) : s.source_type === 'addon_purchase' ? (
                              <span className="inline-flex items-center rounded-full px-1.5 py-0 text-[10px] font-medium bg-purple-50 text-purple-700 border border-purple-200">
                                Addon{s.hostel_bookings?.hostels?.name ? ` · ${s.hostel_bookings.hostels.name}` : ''}
                              </span>
                            ) : (
                              <span className="inline-flex items-center rounded-full px-1.5 py-0 text-[10px] font-medium bg-muted text-muted-foreground border border-border">
                                Manual
                              </span>
                            )}
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

      {/* ════════════ BOOKING SHEET ════════════ */}
      <Sheet open={bookingSheetOpen} onOpenChange={(open) => { if (!open) resetBookingSheet(); setBookingSheetOpen(open); }}>
        <SheetContent className="w-[400px] sm:w-[440px] overflow-y-auto p-0 flex flex-col" side="right">
          <SheetHeader className="p-4 pb-2">
            <SheetTitle className="text-sm font-bold">New Mess Subscription</SheetTitle>
          </SheetHeader>
          <Separator />

          {bookingStep === 'success' ? (
            /* ──── Success View ──── */
            <div className="flex-1 flex flex-col items-center justify-center p-6 gap-4">
              <div className="h-16 w-16 rounded-full bg-emerald-100 flex items-center justify-center">
                <Check className="h-8 w-8 text-emerald-600" />
              </div>
              <h3 className="text-sm font-semibold">Subscription Created!</h3>
              <div className="bg-muted/30 rounded-lg border p-3 w-full text-xs space-y-1">
                <div className="flex justify-between"><span className="text-muted-foreground">Student</span><span className="font-medium">{selectedStudentName}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Mess</span><span className="font-medium">{selectedMess?.name}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Package</span><span className="font-medium">{selectedPackage?.name}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Period</span><span className="font-medium">{format(startDate, 'dd MMM yyyy')} – {endDate ? fmtDate(endDate) : '—'}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Total</span><span className="font-semibold">{formatCurrency(totalAfterDiscount)}</span></div>
                {dueAmount > 0 && <div className="flex justify-between text-red-600"><span>Due</span><span className="font-medium">{formatCurrency(dueAmount)}</span></div>}
              </div>
              <Button className="w-full" onClick={() => { setBookingSheetOpen(false); resetBookingSheet(); }}>Close</Button>
            </div>
          ) : (
            /* ──── Single Form ──── */
            <div className="flex-1 p-3 space-y-3 overflow-y-auto">

              {/* 1. Mess pills */}
              <div>
                <Label className="text-[11px] font-semibold uppercase tracking-wide text-primary">Select Mess</Label>
                <div className="flex gap-1.5 overflow-x-auto pb-1 mt-1 no-scrollbar">
                  {messes.length === 0 ? (
                    <p className="text-[11px] text-muted-foreground">No mess found.</p>
                  ) : messes.map(m => (
                    <button key={m.id} onClick={() => handleMessSelect(m)}
                      className={cn("px-3 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap border transition-all",
                        selectedMess?.id === m.id ? 'bg-primary text-primary-foreground border-primary shadow-sm' : 'bg-muted/50 text-muted-foreground border-border hover:border-primary/50'
                      )}>
                      {m.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Student search */}
              {selectedMess && (
                <div>
                  <Label className="text-[11px] font-semibold uppercase tracking-wide text-primary">Student</Label>
                  <div className="relative mt-1" ref={studentSearchRef}>
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input placeholder="Search by name, phone or email..." value={studentQuery}
                      onChange={e => { setStudentQuery(e.target.value); setShowResults(true); if (!e.target.value) { setSelectedUserId(''); setSelectedStudentName(''); } }}
                      className="pl-8 h-8 text-xs" />
                    {studentSearching && <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-muted-foreground" />}

                    {showResults && studentResults.length > 0 && (
                      <div className="absolute z-50 w-full mt-1 bg-card border rounded-md shadow-lg max-h-48 overflow-y-auto">
                        {studentResults.map(s => (
                          <button key={s.id} className="w-full text-left px-3 py-2 hover:bg-muted/50 border-b last:border-0 text-xs" onClick={() => handleStudentSelect(s)}>
                            <p className="font-medium">{s.name}</p>
                            <p className="text-[10px] text-muted-foreground">{s.email} {s.phone ? `· ${s.phone}` : ''}</p>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {selectedStudentName && (
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-emerald-50 text-emerald-700 rounded-full px-2.5 py-0.5">
                        <Check className="h-3 w-3" /> {selectedStudentName}
                      </span>
                    </div>
                  )}

                  <Collapsible open={showNewStudent} onOpenChange={setShowNewStudent}>
                    <CollapsibleTrigger asChild>
                      <button className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-muted/50 text-muted-foreground border hover:bg-muted transition-colors">
                        <UserPlus className="h-3 w-3" /> {showNewStudent ? 'Hide' : 'Create New'}
                      </button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-1.5 space-y-1.5 bg-muted/20 rounded-lg p-2.5 border">
                      <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Student name *" className="h-7 text-[11px]" />
                      <Input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="Email *" className="h-7 text-[11px]" />
                      <Input value={newPhone} onChange={e => setNewPhone(e.target.value)} placeholder="Phone" className="h-7 text-[11px]" />
                      <Button size="sm" onClick={handleCreateStudent} disabled={creatingStudent} className="w-full h-7 text-[11px]">
                        {creatingStudent ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null} Create & Select
                      </Button>
                    </CollapsibleContent>
                  </Collapsible>
                </div>
              )}

              {/* 3. Duration type, count & dates */}
              {selectedMess && selectedUserId && (
                <div>
                  <Label className="text-[11px] font-semibold uppercase tracking-wide text-primary">Duration</Label>
                  <div className="flex gap-1.5 mt-1">
                    {(['daily', 'weekly', 'monthly'] as const).map(type => (
                      <button key={type} onClick={() => handleDurationTypeChange(type)}
                        className={cn("px-3 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap border transition-all",
                          durationType === type ? 'bg-accent text-accent-foreground border-primary shadow-sm' : 'bg-muted/50 text-muted-foreground border-border hover:border-primary/50'
                        )}>
                        {type === 'daily' ? 'Daily' : type === 'weekly' ? 'Weekly' : 'Monthly'}
                      </button>
                    ))}
                  </div>
                  <div className="mt-1.5">
                    <Label className="text-[10px] text-muted-foreground">
                      {durationType === 'daily' ? 'Days' : durationType === 'weekly' ? 'Weeks' : 'Months'}
                    </Label>
                    <Input type="number" min={1} value={durationCount} onChange={e => handleDurationCountChange(Math.max(1, Number(e.target.value)))} className="h-8 text-xs w-24" />
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-1.5">
                    <div>
                      <Label className="text-[10px] text-muted-foreground">Start Date</Label>
                      <Popover open={startDateOpen} onOpenChange={setStartDateOpen}>
                        <PopoverTrigger asChild>
                          <Button variant="outline" size="sm" className="w-full h-8 text-xs justify-start gap-1">
                            <CalendarIcon className="h-3 w-3" /> {format(startDate, 'dd MMM yyyy')}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar mode="single" selected={startDate} onSelect={d => { if (d) handleStartDateChange(d); }} className="p-3 pointer-events-auto" />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div>
                      <Label className="text-[10px] text-muted-foreground">End Date</Label>
                      <div className="h-8 flex items-center px-2 bg-muted/30 border rounded-md text-xs font-medium">
                        {endDate ? fmtDate(endDate) : '—'}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 4. Package pills */}
              {selectedMess && selectedUserId && (
                <div>
                  <Label className="text-[11px] font-semibold uppercase tracking-wide text-primary">Select Package</Label>
                  {packages.length === 0 ? (
                    <p className="text-[11px] text-muted-foreground mt-1">No packages found.</p>
                  ) : (
                    <div className="flex gap-1.5 flex-wrap mt-1">
                      {packages.map(p => (
                        <button key={p.id} onClick={() => handlePackageSelect(p)}
                          className={cn("px-3 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap border transition-all",
                            selectedPackage?.id === p.id ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm' : 'bg-muted/50 text-muted-foreground border-border hover:border-emerald-400'
                          )}>
                          {p.name} · {formatCurrency(p.price)}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* 5. Pricing & Dues */}
              {selectedPackage && selectedUserId && endDate && (
                <div className="bg-primary/5 rounded-lg border border-primary/20 p-3 space-y-2">
                  <Label className="text-[11px] font-semibold uppercase tracking-wide text-primary">Pricing</Label>
                  <div className="text-xs flex justify-between"><span className="text-muted-foreground">Package Price ({durationCount} {durationType === 'daily' ? 'day' : durationType === 'weekly' ? 'week' : 'month'}(s))</span><span className="font-medium">{formatCurrency(pricePaid)}</span></div>
                  <div>
                    <Label className="text-[10px] text-muted-foreground">Discount</Label>
                    <Input type="number" min={0} value={discountAmount} onChange={e => {
                      const d = Math.max(0, Number(e.target.value));
                      setDiscountAmount(d);
                      const newTotal = Math.max(0, pricePaid - d);
                      if (advanceAmount > newTotal) setAdvanceAmount(newTotal);
                    }} className="h-8 text-xs" />
                  </div>
                  <div className="text-xs flex justify-between font-semibold"><span>Total</span><span>{formatCurrency(totalAfterDiscount)}</span></div>
                  <Separator className="opacity-50" />
                  <div>
                    <Label className="text-[10px] text-muted-foreground">Collecting Now</Label>
                    <Input type="number" min={0} max={totalAfterDiscount} value={advanceAmount} onChange={e => setAdvanceAmount(Math.min(totalAfterDiscount, Math.max(0, Number(e.target.value))))} className="h-8 text-xs" />
                  </div>
                  {dueAmount > 0 && (
                    <div className="text-xs flex justify-between text-destructive font-medium"><span>Due Remaining</span><span>{formatCurrency(dueAmount)}</span></div>
                  )}
                </div>
              )}

              {/* 6. Review Summary */}
              {selectedPackage && selectedUserId && endDate && (
                <div className="rounded-lg border p-3 space-y-1.5 bg-muted/30">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-primary">Booking Summary</p>
                  <div className="text-xs flex justify-between"><span className="text-muted-foreground">Student</span><span className="font-medium">{selectedStudentName}</span></div>
                  <Separator className="opacity-30" />
                  <div className="text-xs flex justify-between"><span className="text-muted-foreground">Mess</span><span className="font-medium">{selectedMess?.name}</span></div>
                  <div className="text-xs flex justify-between"><span className="text-muted-foreground">Package</span><span className="font-medium">{selectedPackage?.name}</span></div>
                  <div className="text-xs flex justify-between"><span className="text-muted-foreground">Period</span><span className="font-medium">{format(startDate, 'dd MMM yyyy')} → {endDate ? fmtDate(endDate) : '—'}</span></div>
                  <Separator className="opacity-30" />
                  <div className="text-xs flex justify-between"><span className="text-muted-foreground">Package Price</span><span className="font-medium">{formatCurrency(pricePaid)}</span></div>
                  {discountAmount > 0 && <div className="text-xs flex justify-between text-destructive"><span>Discount</span><span>-{formatCurrency(discountAmount)}</span></div>}
                  <Separator className="opacity-30" />
                  <div className="text-xs flex justify-between font-bold"><span>Total</span><span>{formatCurrency(totalAfterDiscount)}</span></div>
                  <div className="text-xs flex justify-between text-amber-600 font-medium"><span>Collecting Now</span><span>{formatCurrency(advanceAmount)}</span></div>
                  {dueAmount > 0 && <div className="text-xs flex justify-between text-destructive font-medium"><span>Due Balance</span><span>{formatCurrency(dueAmount)}</span></div>}
                </div>
              )}

              {/* 7. Payment Method */}
              {selectedPackage && selectedUserId && endDate && (
                <div>
                  <Label className="text-[11px] font-semibold uppercase tracking-wide text-primary">Payment Method</Label>
                  <div className="mt-1">
                    <PaymentMethodSelector value={paymentMethod} onValueChange={setPaymentMethod} partnerId={partnerId} columns={3} compact />
                  </div>
                </div>
              )}

              {/* 8. Transaction ID & Proof */}
              {paymentMethod && requiresTransactionId(paymentMethod) && (
                <div className="space-y-2">
                  <div>
                    <Label className="text-[10px] text-muted-foreground">Transaction ID</Label>
                    <Input value={transactionId} onChange={e => setTransactionId(e.target.value)} className="h-8 text-xs" placeholder="Enter txn ID" />
                  </div>
                  <PaymentProofUpload value={paymentProofUrl} onChange={setPaymentProofUrl} />
                </div>
              )}

              {/* 9. Collected By (static) */}
              {selectedPackage && selectedUserId && endDate && (
                <p className="text-[11px] text-muted-foreground">Collected by: <span className="font-semibold text-foreground">{user?.name || 'Partner'}</span></p>
              )}

              {/* 10. Submit */}
              {selectedUserId && selectedMess && selectedPackage && endDate && paymentMethod && (
                <Button className="w-full text-xs gap-1" onClick={handleBookingSubmit}
                  disabled={submitting || (requiresTransactionId(paymentMethod) && !transactionId)}>
                  {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                  Confirm Booking · {formatCurrency(advanceAmount)}
                </Button>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
