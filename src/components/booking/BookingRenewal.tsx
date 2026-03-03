import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { format, addMonths, addDays } from 'date-fns';
import { Clock, CreditCard, Tag, CheckCircle, XCircle } from 'lucide-react';
import { transactionService } from '@/api/transactionService';
import { razorpayService } from '@/api/razorpayService';
import { couponService } from '@/api/couponService';
import { seatsService } from '@/api/seatsService';
import { bookingsService } from '@/api/bookingsService';
import { supabase } from '@/integrations/supabase/client';
import { Booking } from '@/types/BookingTypes';

interface BookingRenewalProps {
  booking: Booking;
  onRenewalComplete: () => void;
}

declare global {
  interface Window {
    Razorpay: any;
  }
}

const loadRazorpayScript = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if (typeof window !== "undefined" && (window as any).Razorpay) {
      return resolve(true);
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

export const BookingRenewal = React.forwardRef<HTMLDivElement, BookingRenewalProps>(({ booking, onRenewalComplete }, ref) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState(1);
  const [showPaymentStep, setShowPaymentStep] = useState(false);
  const [currentTransaction, setCurrentTransaction] = useState<any>(null);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [couponValidating, setCouponValidating] = useState(false);
  const [seatAvailable, setSeatAvailable] = useState<boolean | null>(null);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [resolvedSeatId, setResolvedSeatId] = useState<string | null>(null);
  const [resolvedSeatPrice, setResolvedSeatPrice] = useState<number>(0);
  const [outstandingDue, setOutstandingDue] = useState<number>(0);
  const [outstandingDueId, setOutstandingDueId] = useState<string | null>(null);

  const { toast } = useToast();

  // On dialog open, resolve the actual seat UUID and price from DB, and fetch outstanding dues
  useEffect(() => {
    if (!isDialogOpen) return;
    const resolve = async () => {
      const seatObj = booking.seatId as any;
      // If seatId is already an object with _id and price, use it directly
      if (typeof seatObj === 'object' && seatObj?._id && seatObj?.price) {
        setResolvedSeatId(seatObj._id);
        setResolvedSeatPrice(Number(seatObj.price));
      } else if (typeof seatObj === 'string' && seatObj) {
        const res = await seatsService.getSeatById(seatObj);
        if (res.success && res.data) {
          setResolvedSeatId(res.data._id);
          setResolvedSeatPrice(Number(res.data.price) || 0);
        }
      } else {
        // Fallback: look up by cabin_id + seat_number
        const cabinId = typeof booking.cabinId === 'object' ? (booking.cabinId as any)?._id : booking.cabinId;
        const seatNumber = (booking as any).itemNumber || (typeof seatObj === 'object' ? seatObj?.number : undefined);
        if (cabinId && seatNumber) {
          const { data } = await supabase
            .from('seats')
            .select('id, price')
            .eq('cabin_id', cabinId)
            .eq('number', seatNumber)
            .single();
          if (data) {
            setResolvedSeatId(data.id);
            setResolvedSeatPrice(Number(data.price) || 0);
          }
        }
      }

      // Fetch outstanding dues for this booking
      const bookingIdVal = booking.id || booking._id;
      if (bookingIdVal) {
        const { data: dueData } = await supabase
          .from('dues')
          .select('id, due_amount, status')
          .eq('booking_id', bookingIdVal)
          .in('status', ['pending', 'partial'])
          .maybeSingle();
        if (dueData && Number(dueData.due_amount) > 0) {
          setOutstandingDue(Number(dueData.due_amount));
          setOutstandingDueId(dueData.id);
        } else {
          setOutstandingDue(0);
          setOutstandingDueId(null);
        }
      }
    };
    resolve();
  }, [isDialogOpen, booking]);

  const calculateNewEndDate = () => {
    const currentEndDate = new Date(booking.endDate);
    return addMonths(currentEndDate, selectedDuration);
  };

  const calculateAdditionalAmount = () => {
    const monthlyRate = resolvedSeatPrice || 1000;
    const originalAmount = monthlyRate * selectedDuration;
    
    let finalAmount = originalAmount;
    if (appliedCoupon) {
      const discountAmount = appliedCoupon.type === 'percentage' 
        ? Math.min((originalAmount * appliedCoupon.value) / 100, appliedCoupon.maxDiscountAmount || Infinity)
        : Math.min(appliedCoupon.value, originalAmount);
      finalAmount = Math.max(0, originalAmount - discountAmount);
    }
    
    // Add outstanding dues from previous booking
    return finalAmount + outstandingDue;
  };

  const getOriginalAmount = () => {
    const monthlyRate = resolvedSeatPrice || 1000;
    return monthlyRate * selectedDuration;
  };

  const getDiscountAmount = () => {
    if (!appliedCoupon) return 0;
    const originalAmount = getOriginalAmount();
    
    if (appliedCoupon.type === 'percentage') {
      return Math.min((originalAmount * appliedCoupon.value) / 100, appliedCoupon.maxDiscountAmount || Infinity);
    }
    return Math.min(appliedCoupon.value, originalAmount);
  };

  const checkSeatAvailability = async () => {
    try {
      setCheckingAvailability(true);
      const newEndDate = calculateNewEndDate();
      const currentEndDate = new Date(booking.endDate);
      const nextStartDate = addDays(currentEndDate, 1);

      if (!resolvedSeatId) {
        toast({ title: "Error", description: "Could not identify seat for availability check", variant: "destructive" });
        setSeatAvailable(false);
        setCheckingAvailability(false);
        return;
      }
      const response = await seatsService.checkSeatAvailability(
        resolvedSeatId,
        format(nextStartDate, 'yyyy-MM-dd'),
        format(newEndDate, 'yyyy-MM-dd')
      );
      
      setSeatAvailable(response.data.isAvailable);
      
      if (!response.data.isAvailable) {
        toast({
          title: "Seat Not Available",
          description: "This seat is not available for the selected renewal period",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Seat availability check error:", error);
      toast({
        title: "Availability Check Failed",
        description: "Could not verify seat availability",
        variant: "destructive"
      });
      setSeatAvailable(false);
    } finally {
      setCheckingAvailability(false);
    }
  };

  const validateCoupon = async () => {
    if (!couponCode.trim()) return;
    
    try {
      setCouponValidating(true);
      const originalAmount = getOriginalAmount();
      
      const cabinObj = booking.cabinId as any;
      const response = await couponService.validateCoupon(
        couponCode,
        'cabin',
        originalAmount,
        (typeof cabinObj === 'object' ? cabinObj?._id : cabinObj) || cabinObj
      );
      
      if (response.success && response.data) {
        setAppliedCoupon(response.data.coupon);
        toast({
          title: "Coupon Applied",
          description: `Saved ₹${response.data.savings.toLocaleString()}`,
          variant: "default"
        });
      } else {
        setAppliedCoupon(null);
        toast({
          title: "Invalid Coupon",
          description: response.message || "This coupon is not valid",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Coupon validation error:", error);
      setAppliedCoupon(null);
      toast({
        title: "Coupon Validation Failed",
        description: error.message || "Could not validate coupon",
        variant: "destructive"
      });
    } finally {
      setCouponValidating(false);
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
    toast({
      title: "Coupon Removed",
      description: "Coupon has been removed from renewal",
    });
  };

  const handleProceedToPayment = async () => {
    // Check seat availability first
    if (seatAvailable === null) {
      await checkSeatAvailability();
      return;
    }
    
    if (!seatAvailable) {
      toast({
        title: "Seat Not Available",
        description: "Cannot proceed with renewal. Seat is not available for the selected period.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      setIsLoading(true);
      
      // Create transaction first
      const transactionData = {
        bookingId: booking.id || booking._id,
        bookingType: 'cabin' as const,
        transactionType: 'renewal' as const,
        amount: calculateAdditionalAmount(),
        currency: 'INR',
        additionalMonths: selectedDuration,
        newEndDate: format(calculateNewEndDate(), 'yyyy-MM-dd'),
        appliedCoupon: appliedCoupon ? {
          couponId: appliedCoupon._id,
          couponCode: appliedCoupon.code,
          discountAmount: getDiscountAmount(),
          couponType: appliedCoupon.type,
          couponValue: appliedCoupon.value,
          appliedAt: new Date()
        } : null
      };

      const transactionResponse = await transactionService.createTransaction(transactionData);
      
      if (!transactionResponse.success) {
        throw new Error(transactionResponse.error?.message || 'Failed to create transaction');
      }

      setCurrentTransaction(transactionResponse.data.data);
      setShowPaymentStep(true);
      
      toast({
        title: "Make Payment",
        description: "Proceed with payment to complete the renewal",
        variant: "default"
      });
    } catch (error) {
      console.error("Transaction creation error:", error);
      toast({
        title: "Transaction Failed",
        description: error.message || "Failed to create transaction",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePayment = async () => {
    try {
      setPaymentProcessing(true);
      
      const isScriptLoaded = await loadRazorpayScript();
      if (!isScriptLoaded) {
        toast({
          title: "Payment Failed",
          description: "Unable to load Razorpay SDK. Please try again later.",
          variant: "destructive"
        });
        return;
      }

      // Create Razorpay order
      const orderParams = {
        amount: calculateAdditionalAmount(),
        currency: 'INR',
        bookingId: currentTransaction.transactionId,
        bookingType: 'cabin' as const,
        notes: {
          transactionId: currentTransaction._id,
          renewalMonths: selectedDuration
        }
      };
      
      const response = await razorpayService.createOrder(orderParams);
      
      if (!response.success || !response.data) {
        throw new Error(response.error?.message || 'Failed to create order');
      }
      
      const order = response.data;

      // Update transaction with Razorpay order ID
      await transactionService.updateTransactionStatus(currentTransaction._id, 'pending', {
        razorpay_order_id: order.id,
        bookingId : currentTransaction.transactionId, 
        transactionId : currentTransaction._id, 
      });

      const options = {
        key: order.KEY_ID,
        amount: order.amount,
        currency: order.currency,
        name: 'Booking Renewal',
        description: `Extend booking for ${selectedDuration} month${selectedDuration > 1 ? 's' : ''}`,
        order_id: order.id,
        handler: async (response: any) => {
          await handlePaymentSuccess(response);
        },
        modal: {
          ondismiss: () => {
            toast({
              title: "Payment Cancelled",
              description: "Payment was cancelled by user",
              variant: "destructive"
            });
            setPaymentProcessing(false);
          }
        },
        theme: {
          color: '#3B82F6'
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (error) {
      console.error("Payment error:", error);
      toast({
        title: "Payment Failed",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive"
      });
      setPaymentProcessing(false);
    }
  };

  const handlePaymentSuccess = async (paymentResponse: any) => {
    try {
      // First verify payment with Razorpay
      const verifyParams = {
        razorpay_payment_id: paymentResponse.razorpay_payment_id,
        razorpay_order_id: paymentResponse.razorpay_order_id,
        razorpay_signature: paymentResponse.razorpay_signature,
        bookingId: currentTransaction.transactionId,
        bookingType: 'cabin'
      };
      
      const verifyResponse = await razorpayService.verifyTransactionPayment(verifyParams);
      
      if (!verifyResponse.success) {
        throw new Error('Payment verification failed');
      }

      // Update transaction status to completed
      await transactionService.updateTransactionStatus(currentTransaction._id, 'completed', {
        razorpay_payment_id: paymentResponse.razorpay_payment_id,
        razorpay_signature: paymentResponse.razorpay_signature,
        paymentResponse: paymentResponse,
        bookingId: booking._id,
        transactionId: currentTransaction._id,
      });

      // Create a NEW booking record for the renewal (locker not charged)
      const cabinId = typeof booking.cabinId === 'object' ? (booking.cabinId as any)?._id : booking.cabinId;
      const currentEndDate = new Date(booking.endDate);
      const newStartDate = addDays(currentEndDate, 1);
      const newEndDate = calculateNewEndDate();

      const newBooking = await bookingsService.renewBooking({
        cabin_id: cabinId || '',
        seat_id: resolvedSeatId || '',
        seat_number: (booking as any).itemNumber || (typeof booking.seatId === 'object' ? (booking.seatId as any)?.number : 0),
        start_date: format(newStartDate, 'yyyy-MM-dd'),
        end_date: format(newEndDate, 'yyyy-MM-dd'),
        total_price: calculateAdditionalAmount(),
        payment_status: 'completed',
        payment_method: 'online',
        booking_duration: 'monthly',
        duration_count: String(selectedDuration),
        locker_included: false,
        locker_price: 0,
        razorpay_order_id: paymentResponse.razorpay_order_id,
        razorpay_payment_id: paymentResponse.razorpay_payment_id,
        razorpay_signature: paymentResponse.razorpay_signature,
        discount_amount: getDiscountAmount(),
        discount_reason: appliedCoupon ? `Coupon: ${appliedCoupon.code}` : '',
      });

      // Create a receipt for the renewal payment
      const { data: { user } } = await supabase.auth.getUser();
      if (user && newBooking) {
        // Renewal receipt (amount minus outstanding due portion)
        const renewalAmount = calculateAdditionalAmount() - outstandingDue;
        await supabase.from('receipts').insert({
          booking_id: newBooking.id,
          user_id: user.id,
          cabin_id: cabinId,
          seat_id: resolvedSeatId,
          amount: renewalAmount,
          payment_method: 'online',
          receipt_type: 'booking_payment',
          transaction_id: paymentResponse.razorpay_payment_id || '',
          collected_by: user.id,
           collected_by_name: 'InhaleStays.com',
          notes: `Renewal for ${selectedDuration} month(s)`,
        });

        // If there was an outstanding due, create a separate receipt for the due portion and mark dues as paid
        if (outstandingDue > 0 && outstandingDueId) {
          const oldBookingId = booking.id || booking._id;
          await supabase.from('receipts').insert({
            booking_id: oldBookingId,
            user_id: user.id,
            cabin_id: cabinId,
            seat_id: resolvedSeatId,
            due_id: outstandingDueId,
            amount: outstandingDue,
            payment_method: 'online',
            receipt_type: 'due_payment',
            transaction_id: paymentResponse.razorpay_payment_id || '',
            collected_by: user.id,
            collected_by_name: 'InhaleStays.com',
            notes: 'Previous due cleared via renewal payment',
          });

          // Mark the due as paid
          await supabase
            .from('dues')
            .update({ paid_amount: outstandingDue, due_amount: 0, status: 'paid' })
            .eq('id', outstandingDueId);
        }
      }

      toast({
        title: "Booking Renewed Successfully",
        description: `A new booking has been created until ${format(newEndDate, 'PPP')}`,
        variant: "default"
      });
      setIsDialogOpen(false);
      setShowPaymentStep(false);
      setCurrentTransaction(null);
      onRenewalComplete();
    } catch (error: any) {
      console.error("Renewal processing error:", error);
      toast({
        title: "Renewal Failed",
        description: error.message || "Failed to process renewal. Contact support.",
        variant: "destructive"
      });
    } finally {
      setPaymentProcessing(false);
    }
  };

  const isNearExpiry = () => {
    const endDate = new Date(booking.endDate);
    const currentDate = new Date();
    const daysLeft = Math.ceil((endDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
    return daysLeft <= 7 && daysLeft > 0;
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button 
          variant={isNearExpiry() ? "destructive" : "outline"} 
          size="sm" 
          className="w-full h-8 text-[12px] rounded-xl gap-1"
        >
          <Clock className="h-3.5 w-3.5" />
          {isNearExpiry() ? 'Renew Now' : 'Renew Booking'}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto">
        {!showPaymentStep ? (
          <>
            <DialogHeader>
              <DialogTitle>Renew Your Booking</DialogTitle>
              <DialogDescription>
                Extend your current booking that ends on {format(new Date(booking.endDate), 'PPP')}
              </DialogDescription>
            </DialogHeader>
            
              <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <h3 className="font-medium">Select renewal duration</h3>
                <div className="flex flex-wrap gap-2">
                  {[1, 3, 6, 12].map((months) => (
                    <Button 
                      key={months} 
                      variant={selectedDuration === months ? "default" : "outline"}
                      onClick={() => {
                        setSelectedDuration(months);
                        setSeatAvailable(null); // Reset availability check when duration changes
                        setAppliedCoupon(null); // Reset coupon when duration changes
                        setCouponCode('');
                      }}
                    >
                      {months} {months === 1 ? 'month' : 'months'}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Seat Availability Check */}
              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <Label>Seat Availability</Label>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={checkSeatAvailability}
                    disabled={checkingAvailability}
                  >
                    {checkingAvailability ? "Checking..." : "Check Availability"}
                  </Button>
                </div>
                {seatAvailable !== null && (
                  <div className={`flex items-center gap-2 p-2 rounded border ${
                    seatAvailable ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                  }`}>
                    {seatAvailable ? (
                      <>
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-green-700 text-sm">Seat is available for renewal</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="h-4 w-4 text-red-600" />
                        <span className="text-red-700 text-sm">Seat is not available for this period</span>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Coupon Section */}
              <div className="grid gap-2">
                <Label>Apply Coupon (Optional)</Label>
                {!appliedCoupon ? (
                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter coupon code"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      onKeyPress={(e) => e.key === 'Enter' && validateCoupon()}
                    />
                    <Button 
                      variant="outline" 
                      onClick={validateCoupon}
                      disabled={!couponCode.trim() || couponValidating}
                    >
                      <Tag className="h-4 w-4 mr-1" />
                      {couponValidating ? "Validating..." : "Apply"}
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-2 border border-green-200 bg-green-50 rounded">
                    <div className="flex items-center gap-2">
                      <Tag className="h-4 w-4 text-green-600" />
                      <span className="text-green-700 font-medium">{appliedCoupon.code}</span>
                      <span className="text-green-600 text-sm">(-₹{getDiscountAmount().toLocaleString()})</span>
                    </div>
                    <Button variant="ghost" size="sm" onClick={removeCoupon}>
                      Remove
                    </Button>
                  </div>
                )}
              </div>
              
              <Card>
                <CardHeader className="pb-2">
                   <CardTitle className="text-sm font-medium">Extension Summary</CardTitle>
                </CardHeader>
                 <CardContent>
                  <div className="grid gap-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Current End Date:</span>
                      <span>{format(new Date(booking.endDate), 'PPP')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">New End Date:</span>
                      <span className="font-medium">{format(calculateNewEndDate(), 'PPP')}</span>
                    </div>
                    {appliedCoupon && (
                      <>
                        <div className="flex justify-between mt-2">
                          <span className="text-muted-foreground">Original Amount:</span>
                          <span>₹{getOriginalAmount().toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Discount ({appliedCoupon.code}):</span>
                          <span className="text-green-600">-₹{getDiscountAmount().toLocaleString()}</span>
                        </div>
                      </>
                    )}
                    {outstandingDue > 0 && (
                      <div className="flex justify-between mt-1">
                        <span className="text-muted-foreground">Previous Due Carried Forward:</span>
                        <span className="text-destructive font-medium">+₹{outstandingDue.toLocaleString()}</span>
                      </div>
                    )}
                    <div className="flex justify-between mt-2 text-base">
                      <span className="font-medium">Final Amount:</span>
                      <span className="font-bold">₹{calculateAdditionalAmount().toLocaleString()}</span>
                    </div>
                    {appliedCoupon && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">You Save:</span>
                        <span className="text-green-600 font-medium">₹{getDiscountAmount().toLocaleString()}</span>
                      </div>
                    )}
                    {(booking as any).lockerIncluded && (
                      <div className="flex justify-between text-xs mt-1">
                        <span className="text-muted-foreground italic">Locker deposit already paid on original booking</span>
                      </div>
                    )}
                    <div className="flex justify-between mt-2 text-base">
                      <p>Note: Booking Non Refundable and Non Transferrable</p>
                    </div>
                  </div>
                </CardContent>
                
              </Card>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              <Button 
                onClick={handleProceedToPayment} 
                disabled={isLoading || (seatAvailable !== null && !seatAvailable)}
              >
                {isLoading ? "Creating Transaction..." : 
                 seatAvailable === null ? "Check Availability & Continue" : "Next"}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Complete Payment</DialogTitle>
              <DialogDescription>
                Pay ₹{calculateAdditionalAmount().toLocaleString()} to extend your booking
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-4 py-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Payment Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-2 text-sm">
                    <div className="flex justify-between">
                      <span>Transaction ID:</span>
                      <span className="font-mono text-xs">{currentTransaction?.transactionId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Validity:</span>
                      <span>{selectedDuration} Months</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Extension Period:</span>
                      <span>{format(new Date(booking.endDate), 'MMM dd yyyy')} - {format(calculateNewEndDate(), 'MMM dd, yyyy')}</span>
                    </div>
                    <div className="flex justify-between font-bold text-base">
                      <span>Total Amount:</span>
                      <span>₹{calculateAdditionalAmount().toLocaleString()}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <div className="text-center text-sm text-muted-foreground">
                <p>Your booking will be extended only after successful payment</p>
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowPaymentStep(false)}>
                Back
              </Button>
              <Button 
                onClick={handlePayment} 
                disabled={paymentProcessing}
                className="flex items-center gap-2"
              >
                <CreditCard className="h-4 w-4" />
                {paymentProcessing ? "Processing Payment..." : "Pay Now"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
});

BookingRenewal.displayName = "BookingRenewal";
