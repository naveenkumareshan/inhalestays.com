
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import { format, addMonths, isAfter, addDays, subDays } from 'date-fns';
import { CalendarIcon, Tag, CheckCircle, XCircle } from 'lucide-react';
import { adminManualBookingService } from '@/api/adminManualBookingService';
import { couponService } from '@/api/couponService';
import { seatsService } from '@/api/seatsService';
import { cn } from '@/lib/utils';
import { transactionService } from '@/api/transactionService';
import { PaymentProofUpload } from '@/components/payment/PaymentProofUpload';

interface BookingExtensionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookingId: string;
  booking:any,
  bookingType: 'cabin' | 'hostel';
  currentEndDate: Date;
  onExtensionComplete: () => void;
}

export const BookingExtensionDialog = ({
  open,
  onOpenChange,
  bookingId,
  booking,
  bookingType,
  currentEndDate,
  onExtensionComplete
}: BookingExtensionDialogProps) => {
  const [newEndDate, setNewEndDate] = useState<Date | undefined>(addMonths(currentEndDate, 1));
  const [additionalAmount, setAdditionalAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const [selectedDuration, setSelectedDuration] = useState(1);
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [couponValidating, setCouponValidating] = useState(false);
  const [seatAvailable, setSeatAvailable] = useState<boolean | null>(null);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [paymentProofUrl, setPaymentProofUrl] = useState('');


  const calculateNewEndDate = () => {
    const currentEndDate = new Date(booking.endDate);
    return subDays(addMonths(currentEndDate, selectedDuration), 1);
  };
  
  const calculateAdditionalAmount = () => {
    const monthlyRate = booking.seatId?.price || 1000;
    const originalAmount = monthlyRate * selectedDuration;
    
    if (appliedCoupon) {
      const discountAmount = appliedCoupon.type === 'percentage' 
        ? Math.min((originalAmount * appliedCoupon.value) / 100, appliedCoupon.maxDiscountAmount || Infinity)
        : Math.min(appliedCoupon.value, originalAmount);
      return Math.max(0, originalAmount - discountAmount);
    }
    
    return originalAmount;
  };

  const getOriginalAmount = () => {
    const monthlyRate = booking.seatId?.price || 1000;
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

      const response = await seatsService.checkSeatAvailability(
        booking.seatId._id || booking.seatId,
        format(nextStartDate, 'yyyy-MM-dd'),
        format(newEndDate, 'yyyy-MM-dd')
      );
      
      setSeatAvailable(response.data.isAvailable);
      
      if (!response.data.isAvailable) {
        toast({
          title: "Seat Not Available",
          description: "This seat is not available for the selected extension period",
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
      
      const response = await couponService.validateCoupon(
        couponCode,
        'cabin',
        originalAmount,
        booking.cabinId._id || booking.cabinId
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
      description: "Coupon has been removed from extension",
    });
  };

  const handleExtendBooking = async () => {
    // Check seat availability first
    if (seatAvailable === null) {
      await checkSeatAvailability();
      return;
    }
    
    if (!seatAvailable) {
      toast({
        title: "Seat Not Available",
        description: "Cannot proceed with extension. Seat is not available for the selected period.",
        variant: "destructive"
      });
      return;
    }
    
    if (!paymentMethod) {
      toast({
        title: "Missing information", 
        description: "Please select a payment method",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsLoading(true);
      
      const extensionData = {
        newEndDate: format(newEndDate, 'yyyy-MM-dd'),
        additionalAmount: calculateAdditionalAmount(),
        paymentMethod,
        paymentProofUrl: paymentProofUrl || undefined,
        notes: appliedCoupon ? `${notes}\nCoupon Applied: ${appliedCoupon.code} (₹${getDiscountAmount()} discount)` : notes
      };

        // Create transaction first
      const transactionData = {
        bookingId: bookingId,
        bookingType: 'cabin' as const,
        transactionType: 'renewal' as const,
        amount: calculateAdditionalAmount(),
        currency: 'INR',
        paymentMethod: paymentMethod,
        paymentProofUrl: paymentProofUrl || undefined,
        additionalMonths: selectedDuration,
        newEndDate: format(newEndDate, 'yyyy-MM-dd'),
        appliedCoupon: appliedCoupon ? {
          couponId: appliedCoupon._id,
          couponCode: appliedCoupon.code,
          discountAmount: getDiscountAmount(),
          couponType: appliedCoupon.type,
          couponValue: appliedCoupon.value,
          appliedAt: new Date()
        } : null
      };

      const transactionResponse = await transactionService.createTransactionByAdmin(transactionData);
      
      const response = await adminManualBookingService.extendBooking(
        bookingId, 
        extensionData, 
        bookingType
      );
           // Update transaction with Razorpay order ID
        await transactionService.updateTransactionStatus(transactionResponse.data.data._id, 'completed', {
          razorpay_payment_id: '',
          razorpay_signature: '',
          paymentResponse: notes,
          paymentMethod,
          bookingId : booking._id, 
          transactionId : transactionResponse.data.data._id, 
        });

      if (response.success) {
        toast({
          title: "Booking extended successfully",
          description: `Booking has been extended until ${format(newEndDate, 'PPP')}`,
        });
        
        onExtensionComplete();
        onOpenChange(false);
        
        // Reset form
        setNewEndDate(addMonths(currentEndDate, 1));
        setAdditionalAmount('');
        setPaymentMethod('');
        setNotes('');
      } else {
        throw new Error(response.message || "Failed to extend booking");
      }
    } catch (error) {
      console.error("Extension error:", error);
      toast({
        title: "Extension failed",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Extend Booking</DialogTitle>
          <DialogDescription>
            Extend the booking and record additional payment
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label>Current End Date</Label>
            <div className="text-sm text-muted-foreground">
              {format(currentEndDate, 'PPP')}
            </div>
          </div>
          
          <div className="grid gap-2">
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
                    <span className="text-green-700 text-sm">Seat is available for extension</span>
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
          <div className="flex justify-between">
            <span>Extension Period:</span>
            <span>{format(new Date(booking.endDate), 'MMM dd yyyy')} - {format(calculateNewEndDate(), 'MMM dd, yyyy')}</span>
          </div>
          
          {appliedCoupon && (
            <>
              <div className="flex justify-between">
                <span>Original Amount:</span>
                <span>₹{getOriginalAmount().toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Discount ({appliedCoupon.code}):</span>
                <span className="text-green-600">-₹{getDiscountAmount().toLocaleString()}</span>
              </div>
            </>
          )}
          
          <div className="grid gap-2">
            <div className="flex justify-between font-bold text-base">
              <span>Final Amount:</span>
              <span>₹{calculateAdditionalAmount().toLocaleString()}</span>
            </div>
            {appliedCoupon && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">You Save:</span>
                <span className="text-green-600 font-medium">₹{getDiscountAmount().toLocaleString()}</span>
              </div>
            )}
          </div>
          
          
          <div className="grid gap-2">
            <Label htmlFor="paymentMethod">Payment Method</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger>
                <SelectValue placeholder="Select payment method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="card">Card</SelectItem>
                <SelectItem value="upi">UPI</SelectItem>
                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                <SelectItem value="cheque">Cheque</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {paymentMethod && paymentMethod !== 'cash' && (
            <PaymentProofUpload value={paymentProofUrl} onChange={setPaymentProofUrl} />
          )}

          <div className="grid gap-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Add any notes about this extension..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleExtendBooking} 
            disabled={isLoading || (seatAvailable !== null && !seatAvailable)}
          >
            {isLoading ? "Processing..." : 
             seatAvailable === null ? "Check Availability & Continue" : "Extend & Record Payment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
