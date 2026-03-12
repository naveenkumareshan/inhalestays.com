
import React, { useState, useMemo, useEffect } from 'react';
import { format, addDays, addMonths, subDays } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, CheckCircle, ArrowLeft, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { vendorSeatsService, PartnerBookingData } from '@/api/vendorSeatsService';
import { PaymentMethodSelector } from '@/components/vendor/PaymentMethodSelector';
import { PaymentProofUpload } from '@/components/payment/PaymentProofUpload';
import { downloadInvoice, InvoiceData } from '@/utils/invoiceGenerator';
import { cn } from '@/lib/utils';
import { bookingEmailService } from '@/api/bookingEmailService';

interface RenewalBookingData {
  bookingId: string;
  endDate: string; // current end date
  studentName: string;
  studentEmail: string;
  studentPhone: string;
  studentId: string;
  seatId: string;
  seatNumber: number;
  seatPrice: number;
  cabinId: string;
  cabinName: string;
  allowedDurations?: string[];
}

interface RenewalSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: RenewalBookingData | null;
  onComplete: () => void;
}

export const RenewalSheet: React.FC<RenewalSheetProps> = ({
  open,
  onOpenChange,
  booking,
  onComplete,
}) => {
  const { toast } = useToast();
  const { user } = useAuth();

  // Duration
  const [durationType, setDurationType] = useState<'daily' | 'weekly' | 'monthly'>('monthly');
  const [durationCount, setDurationCount] = useState(1);

  // Price
  const [bookingPrice, setBookingPrice] = useState('');
  const [discountAmount, setDiscountAmount] = useState('');
  const [discountReason, setDiscountReason] = useState('');

  // Partial payment
  const [isAdvanceBooking, setIsAdvanceBooking] = useState(false);
  const [manualAdvanceAmount, setManualAdvanceAmount] = useState('');

  // Payment
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [transactionId, setTransactionId] = useState('');
  const [paymentProofUrl, setPaymentProofUrl] = useState('');

  // Flow
  const [bookingStep, setBookingStep] = useState<'details' | 'confirm'>('details');
  const [creating, setCreating] = useState(false);
  const [success, setSuccess] = useState(false);
  const [lastInvoiceData, setLastInvoiceData] = useState<InvoiceData | null>(null);

  // Reset state when booking changes
  useEffect(() => {
    if (booking) {
      setDurationType('monthly');
      setDurationCount(1);
      setBookingPrice(String(booking.seatPrice));
      setDiscountAmount('');
      setDiscountReason('');
      setIsAdvanceBooking(false);
      setManualAdvanceAmount('');
      setPaymentMethod('cash');
      setTransactionId('');
      setPaymentProofUrl('');
      setBookingStep('details');
      setCreating(false);
      setSuccess(false);
      setLastInvoiceData(null);
    }
  }, [booking]);

  // Recalculate price when duration changes
  useEffect(() => {
    if (!booking) return;
    const basePrice = booking.seatPrice;
    let calculated = basePrice;
    if (durationType === 'daily') {
      calculated = Math.round((basePrice / 30) * durationCount);
    } else if (durationType === 'weekly') {
      calculated = Math.round((basePrice / 4) * durationCount);
    } else {
      calculated = Math.round(basePrice * durationCount);
    }
    setBookingPrice(String(calculated));
  }, [durationType, durationCount, booking]);

  // Renewal start = day after current end
  const startDate = useMemo(() => {
    if (!booking) return new Date();
    return addDays(new Date(booking.endDate), 1);
  }, [booking]);

  // End date
  const endDate = useMemo(() => {
    if (durationType === 'monthly') return subDays(addMonths(startDate, durationCount), 1);
    if (durationType === 'weekly') return addDays(startDate, durationCount * 7 - 1);
    return addDays(startDate, Math.max(0, durationCount - 1));
  }, [durationType, durationCount, startDate]);

  // Total
  const computedTotal = useMemo(() => {
    const base = parseFloat(bookingPrice) || 0;
    const discount = parseFloat(discountAmount) || 0;
    return Math.max(0, base - discount);
  }, [bookingPrice, discountAmount]);

  // Advance computed
  const advanceComputed = useMemo(() => {
    if (!isAdvanceBooking || computedTotal <= 0) return null;
    const defaultAdvance = Math.round(computedTotal * 0.5);
    const advanceAmount = manualAdvanceAmount ? Math.min(parseFloat(manualAdvanceAmount) || 0, computedTotal) : defaultAdvance;
    const remainingDue = computedTotal - advanceAmount;
    return { advanceAmount, remainingDue, proportionalEndDate: endDate };
  }, [isAdvanceBooking, computedTotal, manualAdvanceAmount, endDate]);

  const allowedDurations = booking?.allowedDurations || ['daily', 'weekly', 'monthly'];

  const handleCreateBooking = async () => {
    if (!booking) return;
    if (paymentMethod !== 'cash' && !transactionId.trim()) {
      toast({ title: 'Transaction ID is required for non-cash payments', variant: 'destructive' });
      return;
    }
    setCreating(true);
    const collectedByName = user?.name || user?.email || 'Partner';
    const data: PartnerBookingData = {
      seatId: booking.seatId,
      cabinId: booking.cabinId,
      userId: booking.studentId,
      startDate: format(startDate, 'yyyy-MM-dd'),
      endDate: format(endDate, 'yyyy-MM-dd'),
      totalPrice: computedTotal,
      bookingDuration: durationType,
      durationCount: String(durationCount),
      seatNumber: booking.seatNumber,
      lockerIncluded: false,
      lockerPrice: 0,
      discountAmount: parseFloat(discountAmount) || 0,
      discountReason,
      paymentMethod,
      collectedBy: user?.id,
      collectedByName,
      transactionId,
      paymentProofUrl,
      isAdvanceBooking: isAdvanceBooking && !!advanceComputed,
      advancePaid: isAdvanceBooking && advanceComputed ? advanceComputed.advanceAmount : undefined,
      dueDate: isAdvanceBooking && advanceComputed ? format(advanceComputed.proportionalEndDate, 'yyyy-MM-dd') : undefined,
    };
    const res = await vendorSeatsService.createPartnerBooking(data);
    if (res.success) {
      const invoiceData: InvoiceData = {
        serialNumber: res.serialNumber || 'N/A',
        bookingDate: new Date().toISOString(),
        studentName: booking.studentName,
        studentEmail: booking.studentEmail,
        studentPhone: booking.studentPhone,
        studentSerialNumber: '',
        cabinName: booking.cabinName,
        seatNumber: booking.seatNumber,
        startDate: format(startDate, 'yyyy-MM-dd'),
        endDate: format(endDate, 'yyyy-MM-dd'),
        duration: durationType === 'monthly' ? `${durationCount} Month${durationCount > 1 ? 's' : ''}` : durationType === 'weekly' ? `${durationCount} Week${durationCount > 1 ? 's' : ''}` : `${durationCount} Day${durationCount > 1 ? 's' : ''}`,
        durationCount,
        bookingDuration: durationType,
        seatAmount: parseFloat(bookingPrice) || 0,
        discountAmount: parseFloat(discountAmount) || 0,
        discountReason,
        lockerIncluded: false,
        lockerPrice: 0,
        totalAmount: computedTotal,
        paymentMethod,
        transactionId,
        collectedByName,
      };
      setLastInvoiceData(invoiceData);
      setSuccess(true);
      toast({ title: 'Booking renewed successfully' });

      // Fire-and-forget renewal receipt email
      if (booking.studentEmail) {
        bookingEmailService.sendRenewalReceipt({
          email: booking.studentEmail,
          studentName: booking.studentName,
          serialNumber: res.serialNumber || 'N/A',
          cabinName: booking.cabinName,
          seatNumber: booking.seatNumber,
          startDate: format(startDate, 'yyyy-MM-dd'),
          endDate: format(endDate, 'yyyy-MM-dd'),
          duration: durationType === 'monthly' ? `${durationCount} Month(s)` : durationType === 'weekly' ? `${durationCount} Week(s)` : `${durationCount} Day(s)`,
          seatAmount: parseFloat(bookingPrice) || 0,
          discountAmount: parseFloat(discountAmount) || 0,
          totalAmount: computedTotal,
          paymentMethod,
          transactionId,
          collectedByName,
        }).catch(err => console.error('Renewal receipt email failed:', err));
      }

      onComplete();
      onOpenChange(false);
    } else {
      toast({ title: 'Error', description: res.error || 'Failed to renew booking', variant: 'destructive' });
    }
    setCreating(false);
  };

  if (!booking) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto p-4">
        <SheetHeader className="pb-2">
          <SheetTitle className="text-sm">Renew Booking</SheetTitle>
        </SheetHeader>

        {success && lastInvoiceData ? (
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <CheckCircle className="h-12 w-12 text-emerald-500" />
            <p className="text-sm font-medium">Booking Renewed Successfully!</p>
            <Button variant="outline" size="sm" className="gap-1" onClick={() => downloadInvoice(lastInvoiceData)}>
              <Download className="h-3 w-3" /> Download Invoice
            </Button>
            <Button size="sm" onClick={() => onOpenChange(false)}>Close</Button>
          </div>
        ) : (
          <div className="space-y-3 mt-2">
            {/* Locked Student Info */}
            <div className="border rounded p-2 bg-muted/30 text-[11px]">
              <div className="font-medium">{booking.studentName}</div>
              <div className="text-muted-foreground">{booking.studentPhone} · {booking.studentEmail}</div>
            </div>

            {/* Seat Info */}
            <div className="text-[11px] text-muted-foreground">
              Seat #{booking.seatNumber} · {booking.cabinName}
            </div>

            {/* Duration Type */}
            <div>
              <Label className="text-xs font-medium text-muted-foreground">Duration Type</Label>
              <div className="flex gap-1 mt-1">
                {allowedDurations.map((dur: string) => (
                  <button
                    key={dur}
                    type="button"
                    className={cn(
                      "px-3 py-1.5 rounded-full text-xs font-medium border transition-colors capitalize",
                      durationType === dur
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background text-foreground border-border hover:bg-accent"
                    )}
                    onClick={() => setDurationType(dur as 'daily' | 'weekly' | 'monthly')}
                  >
                    {dur}
                  </button>
                ))}
              </div>
            </div>

            {/* Duration Count */}
            <div>
              <Label className="text-xs font-medium text-muted-foreground">
                {durationType === 'daily' ? 'Days' : durationType === 'weekly' ? 'Weeks' : 'Months'}
              </Label>
              <Input
                className="h-8 text-xs mt-1"
                type="number"
                min={1}
                value={durationCount}
                onChange={e => setDurationCount(Math.max(1, parseInt(e.target.value) || 1))}
              />
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[10px] uppercase text-muted-foreground">Start</Label>
                <div className="h-8 border rounded-md flex items-center px-2 text-xs bg-muted/50">
                  {format(startDate, 'dd MMM yyyy')}
                </div>
              </div>
              <div>
                <Label className="text-[10px] uppercase text-muted-foreground">End</Label>
                <div className="h-8 border rounded-md flex items-center px-2 text-xs bg-muted/50">
                  {format(endDate, 'dd MMM yyyy')}
                </div>
              </div>
            </div>

            {/* Pricing Summary */}
            <div className="border rounded p-3 text-[11px] space-y-2 bg-muted/30">
              <div className="flex justify-between"><span>Seat Amount</span><span>₹{parseFloat(bookingPrice) || 0}</span></div>
              <div className="space-y-0.5">
                <span className="text-muted-foreground text-[10px]">Discount</span>
                <div className="grid grid-cols-2 gap-1">
                  <Input className="h-5 text-[9px] px-1.5 border-muted" type="number" placeholder="₹ Amt" value={discountAmount} onChange={e => setDiscountAmount(e.target.value)} />
                  <Input className="h-5 text-[9px] px-1.5 border-muted" placeholder="Reason" value={discountReason} onChange={e => setDiscountReason(e.target.value)} />
                </div>
                {parseFloat(discountAmount) > 0 && (
                  <div className="flex justify-between text-[9px] text-emerald-600"><span>{discountReason ? `(${discountReason})` : ''}</span><span>-₹{parseFloat(discountAmount)}</span></div>
                )}
              </div>
              <Separator />
              <div className="flex justify-between font-semibold text-xs"><span>Total</span><span>₹{computedTotal}</span></div>
            </div>

            {/* Partial Payment */}
            <div className="flex items-center gap-2 border rounded p-2 bg-amber-50/50 dark:bg-amber-950/20">
              <Checkbox
                id="renewAdvance"
                checked={isAdvanceBooking}
                onCheckedChange={(v) => {
                  setIsAdvanceBooking(v === true);
                  if (!v) setManualAdvanceAmount('');
                }}
              />
              <Label htmlFor="renewAdvance" className="text-xs cursor-pointer flex-1">
                Partial Payment (Collect Less)
              </Label>
            </div>

            {isAdvanceBooking && advanceComputed && (
              <div className="border rounded p-2 text-[11px] space-y-1.5 bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase text-muted-foreground">Amount to Collect</Label>
                  <Input
                    className="h-7 text-xs"
                    type="number"
                    placeholder={`₹ ${advanceComputed.advanceAmount}`}
                    value={manualAdvanceAmount}
                    max={computedTotal}
                    onChange={e => {
                      const val = parseFloat(e.target.value);
                      if (e.target.value === '' || isNaN(val)) {
                        setManualAdvanceAmount(e.target.value);
                      } else if (val > computedTotal) {
                        setManualAdvanceAmount(String(computedTotal));
                      } else {
                        setManualAdvanceAmount(e.target.value);
                      }
                    }}
                  />
                </div>
                <Separator />
                <div className="flex justify-between text-amber-700 dark:text-amber-400 font-medium"><span>Collecting Now</span><span>₹{advanceComputed.advanceAmount}</span></div>
                <div className="flex justify-between text-destructive"><span>Due Balance</span><span>₹{advanceComputed.remainingDue}</span></div>
              </div>
            )}

            {/* Step 1: Continue */}
            {bookingStep === 'details' && (
              <Button className="w-full h-9 text-xs" onClick={() => setBookingStep('confirm')}>
                Continue to Payment
              </Button>
            )}

            {/* Step 2: Confirmation + Payment */}
            {bookingStep === 'confirm' && (
              <div className="space-y-3 border-t pt-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" /> Confirm Renewal
                </h4>

                {/* Summary */}
                <div className="border rounded p-3 text-[11px] space-y-1.5 bg-muted/30">
                  <div className="flex justify-between"><span className="text-muted-foreground">Student</span><span className="font-medium">{booking.studentName}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Phone</span><span>{booking.studentPhone || '-'}</span></div>
                  <Separator />
                  <div className="flex justify-between"><span className="text-muted-foreground">Seat</span><span>#{booking.seatNumber} · {booking.cabinName}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Period</span><span>{format(startDate, 'dd MMM')} → {format(endDate, 'dd MMM yyyy')}</span></div>
                  <Separator />
                  <div className="flex justify-between"><span>Seat Amount</span><span>₹{parseFloat(bookingPrice) || 0}</span></div>
                  {parseFloat(discountAmount) > 0 && (
                    <div className="flex justify-between text-emerald-600"><span>Discount{discountReason ? ` (${discountReason})` : ''}</span><span>-₹{parseFloat(discountAmount)}</span></div>
                  )}
                  <Separator />
                  <div className="flex justify-between font-semibold text-xs"><span>Total</span><span>₹{computedTotal}</span></div>
                  {isAdvanceBooking && advanceComputed && (
                    <>
                      <Separator />
                      <div className="flex justify-between text-amber-700 dark:text-amber-400 font-medium"><span>Advance</span><span>₹{advanceComputed.advanceAmount}</span></div>
                      <div className="flex justify-between text-destructive"><span>Due Balance</span><span>₹{advanceComputed.remainingDue}</span></div>
                    </>
                  )}
                </div>

                {/* Payment Method */}
                <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase text-muted-foreground">Payment Method</Label>
                  <PaymentMethodSelector
                    value={paymentMethod}
                    onValueChange={setPaymentMethod}
                    partnerId={user?.vendorId || user?.id}
                    idPrefix="renew-pm"
                    columns={3}
                  />
                </div>

                {/* Transaction ID */}
                {paymentMethod !== 'cash' && (
                  <div>
                    <Label className="text-[10px] uppercase text-muted-foreground">Transaction ID *</Label>
                    <Input className="h-8 text-xs" placeholder="Enter transaction reference ID" value={transactionId} onChange={e => setTransactionId(e.target.value)} />
                  </div>
                )}

                {/* Payment Proof */}
                {paymentMethod !== 'cash' && (
                  <PaymentProofUpload value={paymentProofUrl} onChange={setPaymentProofUrl} />
                )}

                {/* Collected by */}
                <div className="text-muted-foreground text-[10px] px-1">
                  Collected by: {user?.name || user?.email || 'Partner'}
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1 h-9 text-xs" onClick={() => setBookingStep('details')}>
                    <ArrowLeft className="h-3 w-3 mr-1" /> Back
                  </Button>
                  <Button
                    className="flex-1 h-9 text-xs"
                    disabled={creating || (paymentMethod !== 'cash' && !transactionId.trim())}
                    onClick={handleCreateBooking}
                  >
                    {creating ? 'Creating...' : `Confirm · ₹${isAdvanceBooking && advanceComputed ? advanceComputed.advanceAmount : computedTotal}`}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};
