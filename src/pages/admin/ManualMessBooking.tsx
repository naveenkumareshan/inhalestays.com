import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { addDays, addMonths, addWeeks, subDays, format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { getEffectiveOwnerId } from '@/utils/getEffectiveOwnerId';
import { vendorSeatsService } from '@/api/vendorSeatsService';
import { getMessPackages, createMessSubscription, createMessReceipt } from '@/api/messService';
import { formatCurrency } from '@/utils/currency';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, UserPlus, Loader2, ArrowLeft, Check } from 'lucide-react';
import { PaymentProofUpload } from '@/components/payment/PaymentProofUpload';

type Step = 'student' | 'mess' | 'package' | 'dates' | 'payment' | 'review';

export default function ManualMessBooking() {
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'admin';
  const routePrefix = isAdmin ? '/admin' : '/partner';

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

  // Dates
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState('');

  // Payment
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [transactionId, setTransactionId] = useState('');
  const [pricePaid, setPricePaid] = useState(0);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [advanceAmount, setAdvanceAmount] = useState(0);
  const [paymentProofUrl, setPaymentProofUrl] = useState('');
  const [collectedByName, setCollectedByName] = useState('');
  const [notes, setNotes] = useState('');

  const [step, setStep] = useState<Step>('student');
  const [submitting, setSubmitting] = useState(false);

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

  // Fetch messes
  useEffect(() => {
    (async () => {
      const { ownerId } = await getEffectiveOwnerId();
      let q = supabase.from('mess_partners' as any).select('id, name, food_type').eq('is_active', true);
      if (!isAdmin) q = q.eq('user_id', ownerId);
      const { data } = await q.order('name');
      setMesses(data || []);
    })();
  }, []);

  const handleStudentSelect = (s: any) => {
    setSelectedUserId(s.id);
    setSelectedStudentName(`${s.name} (${s.email})`);
    setStudentQuery(s.name);
    setShowResults(false);
    setStep('mess');
  };

  const handleCreateStudent = async () => {
    if (!newName || !newEmail) { toast({ title: 'Name & email required', variant: 'destructive' }); return; }
    setCreatingStudent(true);
    const res = await vendorSeatsService.createStudent(newName, newEmail, newPhone);
    if (res.success && res.userId) {
      setSelectedUserId(res.userId);
      setSelectedStudentName(`${newName} (${newEmail})`);
      setShowNewStudent(false);
      toast({ title: res.existing ? 'Existing student selected' : 'Student created' });
      setStep('mess');
    } else { toast({ title: 'Error', description: res.error, variant: 'destructive' }); }
    setCreatingStudent(false);
  };

  const handleMessSelect = async (mess: any) => {
    setSelectedMess(mess);
    const pkgs = await getMessPackages(mess.id);
    setPackages(pkgs);
    setStep('package');
  };

  const handlePackageSelect = (pkg: any) => {
    setSelectedPackage(pkg);
    setPricePaid(pkg.price);
    setAdvanceAmount(pkg.price);
    // Calculate end date
    const start = new Date(startDate);
    let end: Date;
    const count = pkg.duration_count || 1;
    if (pkg.duration_type === 'daily') end = addDays(start, count - 1);
    else if (pkg.duration_type === 'weekly') end = addDays(start, count * 7 - 1);
    else end = subDays(addMonths(start, count), 1);
    setEndDate(format(end, 'yyyy-MM-dd'));
    setStep('dates');
  };

  const handleStartDateChange = (val: string) => {
    setStartDate(val);
    if (selectedPackage) {
      const start = new Date(val);
      const count = selectedPackage.duration_count || 1;
      let end: Date;
      if (selectedPackage.duration_type === 'daily') end = addDays(start, count - 1);
      else if (selectedPackage.duration_type === 'weekly') end = addDays(start, count * 7 - 1);
      else end = subDays(addMonths(start, count), 1);
      setEndDate(format(end, 'yyyy-MM-dd'));
    }
  };

  const totalAfterDiscount = Math.max(0, pricePaid - discountAmount);
  const dueAmount = Math.max(0, totalAfterDiscount - advanceAmount);
  const isPartialPayment = dueAmount > 0;

  const handleSubmit = async () => {
    if (!selectedUserId || !selectedMess || !selectedPackage) return;
    setSubmitting(true);
    try {
      const { data: sub, error: subErr } = await supabase.from('mess_subscriptions' as any).insert({
        user_id: selectedUserId,
        mess_id: selectedMess.id,
        package_id: selectedPackage.id,
        start_date: startDate,
        end_date: endDate,
        price_paid: totalAfterDiscount,
        payment_method: paymentMethod,
        payment_status: isPartialPayment ? 'advance_paid' : 'completed',
        status: 'active',
        transaction_id: transactionId,
        advance_amount: advanceAmount,
        discount_amount: discountAmount,
        notes,
        created_by: user?.id,
        collected_by_name: collectedByName || user?.name || '',
        payment_proof_url: paymentProofUrl || null,
      }).select().single();
      if (subErr) throw subErr;

      // Create receipt
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
        notes,
      });

      // Create due if partial
      if (isPartialPayment) {
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

      toast({ title: 'Mess subscription created successfully!' });
      navigate(`${routePrefix}/mess-bookings`);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
    setSubmitting(false);
  };

  const stepLabels: Record<Step, string> = {
    student: '1. Select Student', mess: '2. Select Mess', package: '3. Select Package',
    dates: '4. Dates', payment: '5. Payment', review: '6. Review & Create',
  };

  return (
    <div className="flex flex-col gap-4 max-w-2xl">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(`${routePrefix}/mess-bookings`)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-lg font-semibold">Manual Mess Booking</h1>
          <p className="text-xs text-muted-foreground">Create an offline mess subscription for a student.</p>
        </div>
      </div>

      {/* Progress */}
      <div className="flex gap-1 flex-wrap">
        {(Object.keys(stepLabels) as Step[]).map(s => (
          <Badge key={s} variant={step === s ? 'default' : 'secondary'} className="text-[10px]">{stepLabels[s]}</Badge>
        ))}
      </div>

      {/* Step: Student */}
      {step === 'student' && (
        <Card>
          <CardHeader className="py-3"><CardTitle className="text-sm">Select Student</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input placeholder="Search by name, email, phone..." value={studentQuery} onChange={e => { setStudentQuery(e.target.value); setShowResults(true); }} className="pl-8 h-8 text-xs" />
              {studentSearching && <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin" />}
            </div>
            {showResults && studentResults.length > 0 && (
              <div className="border rounded-lg max-h-48 overflow-y-auto">
                {studentResults.map(s => (
                  <button key={s.id} className="w-full text-left px-3 py-2 text-xs hover:bg-muted/50 border-b last:border-0" onClick={() => handleStudentSelect(s)}>
                    <span className="font-medium">{s.name}</span> <span className="text-muted-foreground">({s.email})</span>
                  </button>
                ))}
              </div>
            )}
            <Button variant="outline" size="sm" className="text-xs gap-1" onClick={() => setShowNewStudent(!showNewStudent)}>
              <UserPlus className="h-3 w-3" /> Create New Student
            </Button>
            {showNewStudent && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <Input placeholder="Name *" value={newName} onChange={e => setNewName(e.target.value)} className="h-8 text-xs" />
                <Input placeholder="Email *" value={newEmail} onChange={e => setNewEmail(e.target.value)} className="h-8 text-xs" />
                <Input placeholder="Phone" value={newPhone} onChange={e => setNewPhone(e.target.value)} className="h-8 text-xs" />
                <Button size="sm" onClick={handleCreateStudent} disabled={creatingStudent} className="text-xs h-8">
                  {creatingStudent ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Create & Select'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step: Mess */}
      {step === 'mess' && (
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm">Select Mess <span className="text-xs font-normal text-muted-foreground ml-2">Student: {selectedStudentName}</span></CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {messes.map(m => (
                <Button key={m.id} variant="outline" className="justify-start h-auto py-3" onClick={() => handleMessSelect(m)}>
                  <div className="text-left">
                    <p className="text-xs font-medium">{m.name}</p>
                    <p className="text-[10px] text-muted-foreground capitalize">{m.food_type}</p>
                  </div>
                </Button>
              ))}
            </div>
            <Button variant="ghost" size="sm" className="mt-3 text-xs" onClick={() => setStep('student')}>← Back</Button>
          </CardContent>
        </Card>
      )}

      {/* Step: Package */}
      {step === 'package' && (
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm">Select Package <span className="text-xs font-normal text-muted-foreground ml-2">{selectedMess?.name}</span></CardTitle>
          </CardHeader>
          <CardContent>
            {packages.length === 0 ? (
              <p className="text-xs text-muted-foreground">No packages found for this mess.</p>
            ) : (
              <div className="space-y-2">
                {packages.map(p => (
                  <button key={p.id} className="w-full text-left p-3 border rounded-lg hover:bg-muted/50 transition-colors" onClick={() => handlePackageSelect(p)}>
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-xs font-medium">{p.name}</p>
                        <p className="text-[10px] text-muted-foreground">{(p.meal_types as string[])?.join(', ')} · {p.duration_count} {p.duration_type}</p>
                      </div>
                      <span className="text-sm font-bold">{formatCurrency(p.price)}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
            <Button variant="ghost" size="sm" className="mt-3 text-xs" onClick={() => setStep('mess')}>← Back</Button>
          </CardContent>
        </Card>
      )}

      {/* Step: Dates */}
      {step === 'dates' && (
        <Card>
          <CardHeader className="py-3"><CardTitle className="text-sm">Dates</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Start Date</Label><Input type="date" value={startDate} onChange={e => handleStartDateChange(e.target.value)} className="h-8 text-xs" /></div>
              <div><Label className="text-xs">End Date</Label><Input type="date" value={endDate} readOnly className="h-8 text-xs bg-muted" /></div>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Package: {selectedPackage?.name} · {selectedPackage?.duration_count} {selectedPackage?.duration_type} · {formatCurrency(selectedPackage?.price || 0)}
            </p>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" className="text-xs" onClick={() => setStep('package')}>← Back</Button>
              <Button size="sm" className="text-xs" onClick={() => setStep('payment')}>Continue →</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step: Payment */}
      {step === 'payment' && (
        <Card>
          <CardHeader className="py-3"><CardTitle className="text-sm">Payment Details</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Package Price</Label>
                <Input type="number" value={pricePaid} onChange={e => setPricePaid(Number(e.target.value))} className="h-8 text-xs" />
              </div>
              <div>
                <Label className="text-xs">Discount</Label>
                <Input type="number" value={discountAmount} onChange={e => setDiscountAmount(Number(e.target.value))} className="h-8 text-xs" />
              </div>
              <div>
                <Label className="text-xs">Amount Collecting Now</Label>
                <Input type="number" value={advanceAmount} onChange={e => setAdvanceAmount(Number(e.target.value))} className="h-8 text-xs" />
              </div>
              <div>
                <Label className="text-xs">Payment Method</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="upi">UPI</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs">Transaction ID</Label><Input value={transactionId} onChange={e => setTransactionId(e.target.value)} className="h-8 text-xs" /></div>
              <div><Label className="text-xs">Collected By</Label><Input value={collectedByName} onChange={e => setCollectedByName(e.target.value)} placeholder={user?.name || ''} className="h-8 text-xs" /></div>
            </div>
            {paymentMethod !== 'cash' && (
              <PaymentProofUpload value={paymentProofUrl} onChange={setPaymentProofUrl} />
            )}
            <div><Label className="text-xs">Notes</Label><Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className="text-xs" /></div>

            <div className="bg-muted/50 rounded-lg p-3 space-y-1 text-xs">
              <div className="flex justify-between"><span>Package Price</span><span>{formatCurrency(pricePaid)}</span></div>
              {discountAmount > 0 && <div className="flex justify-between text-red-600"><span>Discount</span><span>-{formatCurrency(discountAmount)}</span></div>}
              <div className="flex justify-between font-semibold border-t pt-1"><span>Total</span><span>{formatCurrency(totalAfterDiscount)}</span></div>
              <div className="flex justify-between"><span>Collecting Now</span><span>{formatCurrency(advanceAmount)}</span></div>
              {dueAmount > 0 && <div className="flex justify-between text-red-600 font-medium"><span>Due</span><span>{formatCurrency(dueAmount)}</span></div>}
            </div>

            <div className="flex gap-2">
              <Button variant="ghost" size="sm" className="text-xs" onClick={() => setStep('dates')}>← Back</Button>
              <Button size="sm" className="text-xs" onClick={() => setStep('review')}>Review →</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step: Review */}
      {step === 'review' && (
        <Card>
          <CardHeader className="py-3"><CardTitle className="text-sm">Review & Create</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="text-xs space-y-1.5">
              <div className="flex justify-between"><span className="text-muted-foreground">Student</span><span className="font-medium">{selectedStudentName}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Mess</span><span className="font-medium">{selectedMess?.name}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Package</span><span className="font-medium">{selectedPackage?.name}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Dates</span><span>{startDate} → {endDate}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Total</span><span className="font-semibold">{formatCurrency(totalAfterDiscount)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Paid Now</span><span>{formatCurrency(advanceAmount)}</span></div>
              {dueAmount > 0 && <div className="flex justify-between text-red-600"><span>Due</span><span>{formatCurrency(dueAmount)}</span></div>}
              <div className="flex justify-between"><span className="text-muted-foreground">Payment</span><span className="capitalize">{paymentMethod.replace('_', ' ')}</span></div>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" className="text-xs" onClick={() => setStep('payment')}>← Back</Button>
              <Button size="sm" className="text-xs gap-1" onClick={handleSubmit} disabled={submitting}>
                {submitting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                Create Subscription
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
