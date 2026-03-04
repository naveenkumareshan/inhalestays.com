
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { hostelBookingService } from '@/api/hostelBookingService';
import { razorpayService } from '@/api/razorpayService';
import { useAuth } from '@/hooks/use-auth';
import ErrorBoundary from '@/components/ErrorBoundary';
import { Bed, Building, CreditCard, ChevronLeft, AlertCircle } from 'lucide-react';
import { format, addMonths, addDays, subDays } from 'date-fns';
import { getImageUrl } from '@/lib/utils';
import { formatCurrency } from '@/utils/currency';

interface BookingPeriod {
  type: 'daily' | 'weekly' | 'monthly';
  duration: number;
  label: string;
}

const HostelBooking = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, authChecked, isAuthenticated } = useAuth();

  const { room, hostel, sharingOption, stayPackage, selectedBed: preSelectedBed, durationType: navDurationType, durationCount: navDurationCount } = location.state || {};

  const [bookingPeriod, setBookingPeriod] = useState<BookingPeriod>({
    type: navDurationType || 'monthly',
    duration: navDurationCount || 1,
    label: (() => {
      const t = navDurationType || 'monthly';
      const c = navDurationCount || 1;
      if (t === 'daily') return `${c} ${c === 1 ? 'Day' : 'Days'}`;
      if (t === 'weekly') return `${c} ${c === 1 ? 'Week' : 'Weeks'}`;
      return `${c} ${c === 1 ? 'Month' : 'Months'}`;
    })()
  });
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [startDate] = useState<Date>(new Date());
  const [availableBed, setAvailableBed] = useState<any>(preSelectedBed || null);
  const [loadingBeds, setLoadingBeds] = useState(false);

  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if ((window as any).Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  // Redirect if no room or sharing option
  useEffect(() => {
    if (!room || !sharingOption) {
      toast({
        title: "Missing Information",
        description: "Room or sharing option details are missing",
        variant: "destructive"
      });
      navigate('/hostels');
    }
  }, [room, sharingOption]);
  
  // Redirect if not logged in
  useEffect(() => {
    if (!isAuthenticated && authChecked) {
      toast({
        title: "Login Required",
        description: "Please log in to book a room",
        variant: "destructive"
      });
      navigate('/student/login', { state: { from: location.pathname } });
    }
  }, [isAuthenticated, authChecked]);

  // Fetch available beds (skip if pre-selected bed exists)
  useEffect(() => {
    const fetchBeds = async () => {
      if (!room?.id || !sharingOption?.id) return;
      if (preSelectedBed) return; // Already have a bed from the details page
      setLoadingBeds(true);
      try {
        const endDate = calculateEndDate();
        const beds = await hostelBookingService.getAvailableBeds(
          room.id,
          startDate.toISOString().split('T')[0],
          endDate.toISOString().split('T')[0]
        );
        const bed = beds?.find(
          (b: any) => b.sharing_option_id === sharingOption.id && b.is_available && !b.is_blocked
        );
        setAvailableBed(bed || null);
      } catch (error) {
        console.error('Error fetching beds:', error);
      } finally {
        setLoadingBeds(false);
      }
    };
    fetchBeds();
  }, [room?.id, sharingOption?.id, bookingPeriod]);
  
  const calculateEndDate = () => {
    if (bookingPeriod.type === 'daily') return addDays(startDate, Math.max(0, bookingPeriod.duration - 1));
    if (bookingPeriod.type === 'weekly') return addDays(startDate, bookingPeriod.duration * 7 - 1);
    return subDays(addMonths(startDate, bookingPeriod.duration), 1);
  };

  const calculateTotalPrice = () => {
    const discountMultiplier = stayPackage?.discount_percentage
      ? (1 - stayPackage.discount_percentage / 100)
      : 1;
    if (bookingPeriod.type === 'daily') {
      return Math.round((sharingOption?.price_daily || 0) * bookingPeriod.duration);
    }
    if (bookingPeriod.type === 'weekly') {
      return Math.round((sharingOption?.price_daily || 0) * 7 * bookingPeriod.duration);
    }
    return Math.round((sharingOption?.price_monthly || 0) * discountMultiplier * bookingPeriod.duration);
  };

  const calculateAdvanceAmount = () => {
    if (!hostel?.advance_booking_enabled) return null;
    const totalPrice = calculateTotalPrice();
    if (hostel.advance_use_flat && hostel.advance_flat_amount) {
      return Math.min(hostel.advance_flat_amount, totalPrice);
    }
    return Math.round(totalPrice * (hostel.advance_percentage / 100));
  };

  const getPayableAmount = () => {
    const advance = calculateAdvanceAmount();
    return advance !== null ? advance : calculateTotalPrice();
  };

  const handleBookingPeriodChange = (type: 'daily' | 'weekly' | 'monthly', duration: number) => {
    let label = '';
    if (type === 'daily') label = `${duration} ${duration === 1 ? 'Day' : 'Days'}`;
    else if (type === 'weekly') label = `${duration} ${duration === 1 ? 'Week' : 'Weeks'}`;
    else label = `${duration} ${duration === 1 ? 'Month' : 'Months'}`;
    setBookingPeriod({ type, duration, label });
  };

  const handleProceedToPayment = async () => {
    if (!isAuthenticated || !user) {
      toast({ title: "Login Required", description: "Please log in to complete the booking", variant: "destructive" });
      return;
    }

    if (!availableBed) {
      toast({ title: "No Beds Available", description: "No beds are available for the selected option and dates", variant: "destructive" });
      return;
    }

    try {
      const isScriptLoaded = await loadRazorpayScript();
      if (!isScriptLoaded) {
        toast({ title: "Payment Failed", description: "Unable to load payment SDK. Please try again.", variant: "destructive" });
        return;
      }
      setIsProcessing(true);
      
      const totalPrice = calculateTotalPrice();
      const advanceAmount = calculateAdvanceAmount();
      const payableAmount = getPayableAmount();
      const endDate = calculateEndDate();
      
      // Create booking
      const bookingData = {
        hostel_id: hostel.id,
        room_id: room.id,
        bed_id: availableBed.id,
        sharing_option_id: sharingOption.id,
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
        booking_duration: bookingPeriod.type as 'daily' | 'weekly' | 'monthly',
        duration_count: bookingPeriod.duration,
        total_price: totalPrice,
        advance_amount: advanceAmount || 0,
        remaining_amount: advanceAmount ? totalPrice - advanceAmount : 0,
        security_deposit: hostel.security_deposit || 0,
        payment_method: 'online',
      };
      
      const booking = await hostelBookingService.createBooking(bookingData);

      // Create Razorpay order
      const orderResponse = await razorpayService.createOrder({
        amount: payableAmount,
        currency: 'INR',
        bookingId: booking.id,
        bookingType: 'hostel',
        bookingDuration: bookingPeriod.type,
        durationCount: bookingPeriod.duration,
        notes: {
          hostelId: hostel.id,
          roomId: room.id,
          sharingType: sharingOption.type,
        }
      });

      if (!orderResponse.success || !orderResponse.data) {
        throw new Error(orderResponse.error?.message || 'Failed to create order');
      }
      
      const order = orderResponse.data;

      if (order.testMode) {
        // Test mode - directly verify
        const verifyResponse = await razorpayService.verifyPayment({
          razorpay_payment_id: `test_pay_${Date.now()}`,
          razorpay_order_id: order.id,
          razorpay_signature: 'test_signature',
          bookingId: booking.id,
          bookingType: 'hostel',
        });
        
        if (verifyResponse.success) {
          toast({ title: "Booking Confirmed!", description: "Your hostel booking has been confirmed (Test Mode)" });
          navigate(`/hostel-confirmation/${booking.id}`);
        } else {
          throw new Error('Test payment verification failed');
        }
        return;
      }

      // Real Razorpay checkout
      const razorpayOptions = {
        key: order.KEY_ID,
        amount: payableAmount * 100,
        currency: 'INR',
        name: hostel.name,
        description: `Room ${room.room_number} - ${sharingOption.type}`,
        order_id: order.id,
        prefill: {
          name: user.name,
          email: user.email,
          contact: user.phone || '',
        },
        handler: async (response: any) => {
          try {
            const verifyResponse = await razorpayService.verifyPayment({
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature,
              bookingId: booking.id,
              bookingType: 'hostel',
            });
            
            if (verifyResponse.success) {
              toast({ title: "Payment Successful", description: "Your booking has been confirmed!" });
              navigate(`/hostel-confirmation/${booking.id}`);
            } else {
              throw new Error('Payment verification failed');
            }
          } catch (err) {
            console.error('Payment verification error:', err);
            toast({ title: "Payment Verification Failed", description: "Please contact support", variant: "destructive" });
          }
        },
      };
      
      const rzp = new (window as any).Razorpay(razorpayOptions);
      rzp.open();
    } catch (error: any) {
      console.error('Error processing booking:', error);
      toast({
        title: "Booking Failed",
        description: error.message || 'An error occurred during booking',
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (!room || !hostel || !sharingOption) {
    return (
      <div className="container mx-auto p-6 flex items-center justify-center">
        <Card>
          <CardHeader>
            <CardTitle>Missing Information</CardTitle>
            <CardDescription>Room or sharing option details are missing</CardDescription>
          </CardHeader>
          <CardFooter>
            <Button onClick={() => navigate('/hostels')}>Browse Hostels</Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  const totalPrice = calculateTotalPrice();
  const advanceAmount = calculateAdvanceAmount();
  const payableAmount = getPayableAmount();

  return (
    <ErrorBoundary>
      <div>
        <div className="container mx-auto p-6">
          <div className="mb-6">
            <Button variant="ghost" onClick={() => navigate(-1)} className="flex items-center">
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back to Room Details
            </Button>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left column - Room Summary */}
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl">Booking Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="h-20 w-20 rounded overflow-hidden bg-muted flex-shrink-0">
                      {room.image_url ? (
                        <img src={getImageUrl(room.image_url)} alt={`Room ${room.room_number}`} className="h-full w-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Bed className="h-10 w-10 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div>
                      <h3 className="font-medium">Room {room.room_number}</h3>
                      <p className="text-muted-foreground text-sm">Floor {room.floor}, {room.category}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Building className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{hostel.name}, {hostel.location}</span>
                      </div>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label>Sharing Type</Label>
                      <div className="mt-1 font-medium">{sharingOption.type}</div>
                      <div className="text-sm text-muted-foreground mt-1">{sharingOption.capacity} persons per unit</div>
                    </div>
                    <div>
                      <Label>Price</Label>
                      <div className="mt-1 font-medium">{formatCurrency(sharingOption.price_monthly)} per month</div>
                      {sharingOption.price_daily > 0 && (
                        <div className="text-sm text-muted-foreground mt-1">{formatCurrency(sharingOption.price_daily)} per day</div>
                      )}
                    </div>
                  </div>

                  {/* Bed assignment */}
                  <div className="p-3 rounded-md border">
                    <Label>Assigned Bed</Label>
                    {loadingBeds ? (
                      <p className="text-sm text-muted-foreground mt-1">Finding available bed...</p>
                    ) : availableBed ? (
                      <p className="mt-1 font-medium">Bed #{availableBed.bed_number}</p>
                    ) : (
                      <div className="flex items-center gap-2 mt-1 text-destructive">
                        <AlertCircle className="h-4 w-4" />
                        <span className="text-sm">No beds available for selected dates</span>
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <Label className="mb-2 block">Booking Duration</Label>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <Label className="text-sm">Daily</Label>
                        <div className="grid grid-cols-2 gap-2 mt-1">
                          {[1, 3, 5, 7, 10, 15].map(days => (
                            <Button
                              key={`daily-${days}`}
                              type="button"
                              variant={bookingPeriod.type === 'daily' && bookingPeriod.duration === days ? 'default' : 'outline'}
                              size="sm"
                              className="w-full"
                              onClick={() => handleBookingPeriodChange('daily', days)}
                            >
                              {days} {days === 1 ? 'day' : 'days'}
                            </Button>
                          ))}
                        </div>
                      </div>
                      
                      <div>
                        <Label className="text-sm">Weekly</Label>
                        <div className="grid grid-cols-2 gap-2 mt-1">
                          {[1, 2, 3, 4].map(weeks => (
                            <Button
                              key={`weekly-${weeks}`}
                              type="button"
                              variant={bookingPeriod.type === 'weekly' && bookingPeriod.duration === weeks ? 'default' : 'outline'}
                              size="sm"
                              className="w-full"
                              onClick={() => handleBookingPeriodChange('weekly', weeks)}
                            >
                              {weeks} {weeks === 1 ? 'week' : 'weeks'}
                            </Button>
                          ))}
                        </div>
                      </div>
                      
                      <div>
                        <Label className="text-sm">Monthly</Label>
                        <div className="grid grid-cols-2 gap-2 mt-1">
                          {[1, 3, 6, 12].map(months => (
                            <Button
                              key={`monthly-${months}`}
                              type="button"
                              variant={bookingPeriod.type === 'monthly' && bookingPeriod.duration === months ? 'default' : 'outline'}
                              size="sm"
                              className="w-full"
                              onClick={() => handleBookingPeriodChange('monthly', months)}
                            >
                              {months} {months === 1 ? 'month' : 'months'}
                            </Button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label>Check-in Date</Label>
                      <div className="mt-1 font-medium">{format(startDate, 'PPP')}</div>
                    </div>
                    <div>
                      <Label>Check-out Date</Label>
                      <div className="mt-1 font-medium">{format(calculateEndDate(), 'PPP')}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl">Booking Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {user && (
                      <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="name">Name</Label>
                            <Input id="name" value={user.name} disabled className="mt-1" />
                          </div>
                          <div>
                            <Label htmlFor="email">Email</Label>
                            <Input id="email" value={user.email} disabled className="mt-1" />
                          </div>
                        </div>
                        <div>
                          <Label htmlFor="phone">Phone Number</Label>
                          <Input id="phone" value={user.phone || ''} disabled className="mt-1" />
                        </div>
                      </>
                    )}
                    <div>
                      <Label htmlFor="notes">Special Requests (Optional)</Label>
                      <textarea
                        id="notes"
                        className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background min-h-[80px]"
                        placeholder="Any special requirements or requests..."
                      ></textarea>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* Right column - Payment Summary */}
            <div className="space-y-6">
              <Card className="sticky top-6">
                <CardHeader>
                  <CardTitle className="text-xl">Payment Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Room Charges</span>
                      <span>
                        {bookingPeriod.type === 'daily' && `${formatCurrency(sharingOption.price_daily)} × ${bookingPeriod.duration} days`}
                        {bookingPeriod.type === 'weekly' && `${formatCurrency(sharingOption.price_daily)} × ${bookingPeriod.duration * 7} days`}
                        {bookingPeriod.type === 'monthly' && `${formatCurrency(sharingOption.price_monthly)} × ${bookingPeriod.duration} months`}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tax & Service Fee</span>
                      <span>Included</span>
                    </div>
                    {stayPackage && stayPackage.discount_percentage > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-green-600 font-medium">Package Discount ({stayPackage.name})</span>
                        <span className="text-green-600 font-medium">-{stayPackage.discount_percentage}%</span>
                      </div>
                    )}
                  </div>
                  
                  <Separator />
                  
                  <div className="flex justify-between items-center font-medium">
                    <span>Total Amount</span>
                    <span className="text-xl font-bold">{formatCurrency(totalPrice)}</span>
                  </div>

                  {/* Security Deposit */}
                  {hostel.security_deposit > 0 && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Security Deposit (at check-in)</span>
                      <span>{formatCurrency(hostel.security_deposit)}</span>
                    </div>
                  )}

                  {/* Advance Payment Breakdown */}
                  {advanceAmount !== null && (
                    <>
                      <Separator />
                      <div className="space-y-2 p-3 bg-primary/5 rounded-md">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">Advance Payment</span>
                          <span className="font-bold text-primary">{formatCurrency(advanceAmount)}</span>
                        </div>
                        <div className="flex justify-between text-sm text-muted-foreground">
                          <span>Remaining (pay later)</span>
                          <span>{formatCurrency(totalPrice - advanceAmount)}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {hostel.advance_use_flat
                            ? `Flat advance of ${formatCurrency(hostel.advance_flat_amount)}`
                            : `${hostel.advance_percentage}% advance payment`}
                        </p>
                      </div>
                    </>
                  )}

                  <Separator />

                  <div className="flex justify-between items-center font-medium">
                    <span>Pay Now</span>
                    <span className="text-xl font-bold text-primary">{formatCurrency(payableAmount)}</span>
                  </div>
                  
                  <Button 
                    className="w-full" 
                    disabled={isProcessing || !availableBed || loadingBeds}
                    onClick={handleProceedToPayment}
                  >
                    <CreditCard className="mr-2 h-5 w-5" />
                    {isProcessing ? 'Processing...' : `Pay ${formatCurrency(payableAmount)}`}
                  </Button>
                  
                  <div className="text-xs text-center text-muted-foreground">
                    By proceeding, you agree to our terms and conditions.
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default HostelBooking;
