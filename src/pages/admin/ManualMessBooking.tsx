import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { addDays, addMonths, subDays, format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { getEffectiveOwnerId } from '@/utils/getEffectiveOwnerId';
import { vendorSeatsService } from '@/api/vendorSeatsService';
import { getMessPackages, createMessReceipt } from '@/api/messService';
import { formatCurrency } from '@/utils/currency';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, UserPlus, Loader2, Check } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { PaymentProofUpload } from '@/components/payment/PaymentProofUpload';

type Step = 'student' | 'mess' | 'package' | 'dates' | 'payment' | 'review';

const allSteps: Step[] = ['student', 'mess', 'package', 'dates', 'payment', 'review'];
const stepLabels = ['Select Student', 'Select Mess', 'Select Package', 'Select Dates', 'Payment Details', 'Review & Create'];

export default function ManualMessBooking() {
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'admin';
  const routePrefix = isAdmin ? '/admin' : '/partner';
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
    const start = new Date(startDate);
    const count = pkg.duration_count || 1;
    let end: Date;
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

  const currentIdx = allSteps.indexOf(step);

  // ─── Render: Student Selection ────────────────────────────
  const renderStudentSelection = () => (
    <Card>
      <CardHeader>
        <CardTitle>Select Student</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative" ref={studentSearchRef}>
          <Label className="text-sm mb-1 block">Search by Name, Phone or Email</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Type to search students..."
              value={studentQuery}
              onChange={(e) => { setStudentQuery(e.target.value); setShowResults(true); if (!e.target.value) { setSelectedUserId(''); setSelectedStudentName(''); } }}
              className="pl-9"
            />
            {studentSearching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />}
          </div>

          {showResults && studentResults.length > 0 && (
            <div className="absolute z-50 w-full mt-1 bg-card border rounded-md shadow-lg max-h-60 overflow-y-auto">
              {studentResults.map((s) => (
                <button key={s.id} className="w-full text-left px-3 py-2 hover:bg-muted/50 border-b last:border-0 transition-colors" onClick={() => handleStudentSelect(s)}>
                  <p className="text-sm font-medium">{s.name}</p>
                  <p className="text-xs text-muted-foreground">{s.email} {s.phone ? `• ${s.phone}` : ''}</p>
                </button>
              ))}
            </div>
          )}

          {showResults && studentQuery.length >= 2 && !studentSearching && studentResults.length === 0 && (
            <div className="absolute z-50 w-full mt-1 bg-card border rounded-md shadow-lg p-3">
              <p className="text-sm text-muted-foreground">No students found. Create a new one below.</p>
            </div>
          )}
        </div>

        {selectedStudentName && (
          <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-md">
            <Badge variant="outline" className="text-xs">Selected</Badge>
            <span className="text-sm font-medium">{selectedStudentName}</span>
          </div>
        )}

        <Collapsible open={showNewStudent} onOpenChange={setShowNewStudent}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" size="sm" className="w-full gap-2">
              <UserPlus className="h-4 w-4" />
              {showNewStudent ? 'Hide' : 'Create New Student'}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3 space-y-3 border rounded-md p-3">
            <div>
              <Label className="text-sm">Name *</Label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Student name" />
            </div>
            <div>
              <Label className="text-sm">Email *</Label>
              <Input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="student@email.com" />
            </div>
            <div>
              <Label className="text-sm">Phone</Label>
              <Input value={newPhone} onChange={(e) => setNewPhone(e.target.value)} placeholder="Phone number" />
            </div>
            <Button size="sm" onClick={handleCreateStudent} disabled={creatingStudent} className="w-full">
              {creatingStudent ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Creating...</> : 'Create & Select Student'}
            </Button>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );

  // ─── Render: Mess Selection ───────────────────────────────
  const renderMessSelection = () => (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Select a Mess</h2>
        <Button variant="outline" size="sm" onClick={() => setStep('student')}>← Back</Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {messes.map((m) => (
          <Card
            key={m.id}
            className={`cursor-pointer transition-all ${selectedMess?.id === m.id ? 'border-primary' : 'hover:shadow-md'}`}
            onClick={() => handleMessSelect(m)}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">{m.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground capitalize">{m.food_type}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      {messes.length === 0 && <p className="text-center py-12 text-muted-foreground">No mess found.</p>}
    </div>
  );

  // ─── Render: Package Selection ────────────────────────────
  const renderPackageSelection = () => (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Select a Package — {selectedMess?.name}</h2>
        <Button variant="outline" size="sm" onClick={() => setStep('mess')}>← Back</Button>
      </div>
      {packages.length === 0 ? (
        <p className="text-center py-12 text-muted-foreground">No packages found for this mess.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {packages.map((p) => (
            <Card
              key={p.id}
              className={`cursor-pointer transition-all ${selectedPackage?.id === p.id ? 'border-primary' : 'hover:shadow-md'}`}
              onClick={() => handlePackageSelect(p)}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">{p.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{(p.meal_types as string[])?.join(', ')} · {p.duration_count} {p.duration_type}</p>
                <p className="font-semibold mt-2 text-primary">{formatCurrency(p.price)}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  // ─── Render: Date Selection ───────────────────────────────
  const renderDateSelection = () => (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Select Dates for {selectedPackage?.name}</h2>
        <Button variant="outline" onClick={() => setStep('package')}>Back to Package Selection</Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Select Booking Period</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startDate">Start Date</Label>
              <Input type="date" id="startDate" value={startDate} onChange={(e) => handleStartDateChange(e.target.value)} />
            </div>
            <div>
              <Label>Duration</Label>
              <Input value={`${selectedPackage?.duration_count || 1} ${selectedPackage?.duration_type || 'month'}`} disabled />
            </div>
            <div>
              <Label htmlFor="endDate">End Date</Label>
              <Input type="date" id="endDate" value={endDate} disabled />
            </div>
            <div>
              <Label>Package Price</Label>
              <Input value={formatCurrency(selectedPackage?.price || 0)} disabled />
            </div>
          </div>
          <Button onClick={() => setStep('payment')} className="mt-4" disabled={!startDate || !endDate}>
            Continue to Payment Details
          </Button>
        </CardContent>
      </Card>
    </div>
  );

  // ─── Render: Payment Details ──────────────────────────────
  const renderPaymentDetails = () => (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Payment Details</h2>
        <Button variant="outline" onClick={() => setStep('dates')}>Back to Dates</Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Payment Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Package Price</Label>
              <Input type="number" value={pricePaid} onChange={(e) => setPricePaid(Number(e.target.value))} />
            </div>
            <div>
              <Label>Discount</Label>
              <Input type="number" value={discountAmount} onChange={(e) => setDiscountAmount(Number(e.target.value))} />
            </div>
            <div>
              <Label>Amount Collecting Now</Label>
              <Input type="number" value={advanceAmount} onChange={(e) => setAdvanceAmount(Number(e.target.value))} />
            </div>
            <div>
              <Label>Payment Method</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="upi">UPI</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Transaction ID</Label>
              <Input value={transactionId} onChange={(e) => setTransactionId(e.target.value)} />
            </div>
            <div>
              <Label>Collected By</Label>
              <Input value={collectedByName} onChange={(e) => setCollectedByName(e.target.value)} placeholder={user?.name || ''} />
            </div>
          </div>

          {paymentMethod !== 'cash' && (
            <PaymentProofUpload value={paymentProofUrl} onChange={setPaymentProofUrl} />
          )}

          <div>
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>

          {/* Payment Summary */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
            <div className="flex justify-between"><span>Package Price</span><span>{formatCurrency(pricePaid)}</span></div>
            {discountAmount > 0 && <div className="flex justify-between text-destructive"><span>Discount</span><span>-{formatCurrency(discountAmount)}</span></div>}
            <div className="flex justify-between font-semibold border-t pt-2"><span>Total</span><span>{formatCurrency(totalAfterDiscount)}</span></div>
            <div className="flex justify-between"><span>Collecting Now</span><span>{formatCurrency(advanceAmount)}</span></div>
            {dueAmount > 0 && <div className="flex justify-between text-destructive font-medium"><span>Due</span><span>{formatCurrency(dueAmount)}</span></div>}
          </div>

          <Button onClick={() => setStep('review')} className="mt-2">
            Review Booking →
          </Button>
        </CardContent>
      </Card>
    </div>
  );

  // ─── Render: Review & Create ──────────────────────────────
  const renderReview = () => (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Review & Create</h2>
        <Button variant="outline" onClick={() => setStep('payment')}>Back to Payment</Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Booking Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div><span className="text-muted-foreground">Student:</span> <span className="font-medium ml-1">{selectedStudentName}</span></div>
            <div><span className="text-muted-foreground">Mess:</span> <span className="font-medium ml-1">{selectedMess?.name}</span></div>
            <div><span className="text-muted-foreground">Package:</span> <span className="font-medium ml-1">{selectedPackage?.name}</span></div>
            <div><span className="text-muted-foreground">Dates:</span> <span className="ml-1">{startDate} → {endDate}</span></div>
            <div><span className="text-muted-foreground">Total:</span> <span className="font-semibold ml-1">{formatCurrency(totalAfterDiscount)}</span></div>
            <div><span className="text-muted-foreground">Paid Now:</span> <span className="ml-1">{formatCurrency(advanceAmount)}</span></div>
            {dueAmount > 0 && <div><span className="text-destructive">Due:</span> <span className="text-destructive font-medium ml-1">{formatCurrency(dueAmount)}</span></div>}
            <div><span className="text-muted-foreground">Payment:</span> <span className="capitalize ml-1">{paymentMethod.replace('_', ' ')}</span></div>
          </div>

          <Button onClick={handleSubmit} disabled={submitting} className="mt-4 gap-2">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Create Subscription
          </Button>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Page Header */}
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Manual Mess Booking</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Create an offline mess subscription for a student.</p>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center gap-2">
        {allSteps.map((s, idx) => (
          <React.Fragment key={s}>
            <div className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold transition-colors ${idx <= currentIdx ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
              {idx + 1}
            </div>
            <span className={`text-xs hidden sm:inline ${idx === currentIdx ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>{stepLabels[idx]}</span>
            {idx < allSteps.length - 1 && <div className={`flex-1 h-px ${idx < currentIdx ? 'bg-primary' : 'bg-border'}`} />}
          </React.Fragment>
        ))}
      </div>

      {/* Step Content */}
      <div className="space-y-4 mt-0">
        {step === 'student' && renderStudentSelection()}
        {step === 'mess' && renderMessSelection()}
        {step === 'package' && renderPackageSelection()}
        {step === 'dates' && renderDateSelection()}
        {step === 'payment' && renderPaymentDetails()}
        {step === 'review' && renderReview()}
      </div>
    </div>
  );
}
