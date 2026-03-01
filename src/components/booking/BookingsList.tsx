
import React, { lazy, Suspense } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { bookingsService } from '@/api/bookingsService';
import { format } from 'date-fns';
import { Calendar, X, Eye, TicketPercent } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { BookingRenewal } from './BookingRenewal';

const PaymentTimer = lazy(() =>
  import("@/components/booking/PaymentTimer").then((m) => ({
    default: m.PaymentTimer,
  }))
);
import { RazorpayCheckout } from '@/components/payment/RazorpayCheckout';
import { formatBookingPeriod } from '@/utils/currency';

interface BookingDisplay {
  id: string;
  cabinId: any;
  cabinCode: string;
  startDate: string;
  createdAt: string;
  endDate: string;
  originalPrice?: number;
  totalPrice: number;
  appliedCoupon?: {
    couponCode: string;
    discountAmount: number;
    couponType: string;
    couponValue: number;
  };
  paymentStatus: 'pending' | 'completed' | 'failed';
  bookingType: 'cabin' | 'hostel' | 'laundry';
  itemName: string;
  itemNumber: number;
  itemImage?: string;
  durationCount?: number;
  bookingId?: string;
  status?: string;
  transferredHistory?: any;
  bookingStatus?: string;
  keyDeposit?: number;
  seatPrice?: number;
  lockerPrice?: number;
  cabinAddress?: string;
  bookingDuration?: 'daily' | 'monthly' | 'weekly';
  dueAmount?: number;
  userId?: string | { name: string; email: string };
  seatId?: string | { _id: string; number: number; price: number };
}

interface BookingsListProps {
  bookings: BookingDisplay[];
  isLoading?: boolean;
  showRenewalOption?: boolean;
  onBookingCancelled?: () => void;
  onBookingRenewed?: () => void;
}

export const BookingsList = ({
  bookings,
  isLoading = false,
  showRenewalOption = true,
  onBookingCancelled,
  onBookingRenewed,
}: BookingsListProps) => {
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleCancelBooking = async (bookingId: string) => {
    try {
      const response = await bookingsService.cancelBooking(bookingId);
      if (response.success) {
        toast({ title: "Booking cancelled", description: "Your booking has been cancelled successfully" });
        if (onBookingCancelled) onBookingCancelled();
      } else {
        throw new Error(response.error || "Failed to cancel booking");
      }
    } catch (error) {
      toast({ title: "Cancel failed", description: error.message || "Something went wrong.", variant: "destructive" });
    }
  };

  const canRenew = (booking: BookingDisplay) => {
    const isNotExpired = new Date(booking.endDate) > new Date();
    return isNotExpired && booking.bookingType === 'cabin' && booking.status !== 'cancelled';
  };

  const handlePaymentExpiry = async (bookingId: string) => {
    try {
      await bookingsService.cancelBooking(bookingId);
    } catch (e) {
      console.error('Failed to cancel expired booking:', e);
    }
    toast({ title: "Payment Expired", description: "The payment window has expired. Booking has been cancelled.", variant: "destructive" });
    if (onBookingCancelled) onBookingCancelled();
  };

  const handleRetryPayment = (booking: BookingDisplay) => {
    toast({ title: "Retrying Payment", description: "Please complete your payment below." });
  };

  const handlePaymentSuccess = (bookingId: string) => {
    toast({ title: "Payment Successful", description: "Your booking has been confirmed!" });
    if (onBookingCancelled) onBookingCancelled();
  };

  const handlePaymentError = (error: any) => {
    toast({ title: "Payment Failed", description: "There was an issue with your payment.", variant: "destructive" });
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return <Badge className="bg-green-500 text-[10px] px-1.5 py-0.5">Paid</Badge>;
      case 'pending':
        return <Badge variant="outline" className="border-amber-500 text-amber-500 text-[10px] px-1.5 py-0.5">Pending</Badge>;
      case 'failed':
        return <Badge variant="outline" className="border-destructive text-destructive text-[10px] px-1.5 py-0.5">Failed</Badge>;
      case 'cancelled':
        return <Badge variant="outline" className="border-destructive text-destructive text-[10px] px-1.5 py-0.5">Cancelled</Badge>;
      default:
        return <Badge variant="outline" className="text-[10px] px-1.5 py-0.5">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-10">
        <div className="animate-spin h-7 w-7 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (bookings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-14 text-center">
        <Calendar className="h-10 w-10 text-muted-foreground mb-3" />
        <h3 className="text-[14px] font-semibold mb-1">No bookings found</h3>
        <p className="text-[12px] text-muted-foreground">When you make a booking, it will appear here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {bookings.map((booking) => (
        <Card key={booking.id} className="rounded-2xl overflow-hidden">
          <CardContent className="p-3">
            {/* Top row: thumbnail + title + status */}
            <div className="flex gap-2.5 mb-2">
              {/* Thumbnail */}
              <div className="w-14 h-14 rounded-xl bg-muted flex-shrink-0 overflow-hidden">
                {booking.itemImage ? (
                  <img src={booking.itemImage} alt={booking.itemName} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-secondary/20">
                    <Calendar className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
              </div>

              {/* Title & meta */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-1">
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-foreground leading-tight truncate">
                      {booking.bookingId || booking.cabinCode || booking.itemName}
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate">{booking.itemName}</p>
                    {booking.bookingType === 'cabin' && (
                      <>
                        <p className="text-[10px] text-muted-foreground truncate">
                          Seat #{booking.itemNumber}
                        </p>
                        {booking.cabinAddress && (
                          <p className="text-[10px] text-muted-foreground truncate">
                            {booking.cabinAddress.split(/\s+/).slice(0, 15).join(' ')}
                          </p>
                        )}
                      </>
                    )}
                    {booking.bookingType === 'hostel' && (
                      <p className="text-[10px] text-muted-foreground">Bed #{booking.itemNumber}</p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    {booking.bookingStatus === 'transferred' && (
                      <Badge variant="outline" className="border-amber-500 text-amber-500 text-[10px] px-1.5 py-0.5">Transferred</Badge>
                    )}
                    {(booking.dueAmount ?? 0) > 0 ? (
                      <Badge variant="outline" className="border-red-500 text-red-600 text-[10px] px-1.5 py-0.5">Due: ₹{booking.dueAmount?.toLocaleString()}</Badge>
                    ) : booking.paymentStatus === 'completed' ? (
                      <Badge className="bg-green-100 text-green-700 border-green-200 text-[10px] px-1.5 py-0.5">Fully Paid</Badge>
                    ) : (booking.paymentStatus as string) === 'advance_paid' ? (
                      <Badge variant="outline" className="border-amber-500 text-amber-600 text-[10px] px-1.5 py-0.5">Advance Paid</Badge>
                    ) : booking.paymentStatus === 'pending' ? (
                      <Badge variant="outline" className="border-amber-500 text-amber-500 text-[10px] px-1.5 py-0.5">Pending</Badge>
                    ) : booking.paymentStatus === 'failed' || booking.paymentStatus === 'cancelled' ? (
                      <Badge variant="outline" className="border-destructive text-destructive text-[10px] px-1.5 py-0.5">{booking.paymentStatus === 'failed' ? 'Failed' : 'Cancelled'}</Badge>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Timer */}
            {booking.paymentStatus === 'pending' && booking.createdAt && (
              <div className="mb-2">
                <Suspense fallback={<div className="p-2 text-[12px] text-muted-foreground">Loading timer...</div>}>
                  <PaymentTimer
                    createdAt={booking.createdAt}
                    onExpiry={() => handlePaymentExpiry(booking.id)}
                    onRetryPayment={() => handleRetryPayment(booking)}
                    variant="compact"
                    showRetryButton={false}
                  />
                </Suspense>
              </div>
            )}

            {/* Coupon */}
            {booking.appliedCoupon && (
              <div className="mb-2 p-2 bg-green-50 border border-green-200 rounded-xl">
                <div className="flex items-center gap-1.5 mb-1">
                  <TicketPercent className="h-3.5 w-3.5 text-green-600" />
                  <span className="text-[11px] font-semibold text-green-700">Coupon: {booking.appliedCoupon.couponCode}</span>
                  <span className="text-[11px] text-green-600 ml-auto">-₹{booking.appliedCoupon.discountAmount}</span>
                </div>
              </div>
            )}

            {/* Date range + amount — single line */}
            <div className="flex items-center justify-between mb-1.5 px-1">
              <p className="text-[11px] text-muted-foreground">
                {formatBookingPeriod(booking.startDate, null)} — {formatBookingPeriod(null, booking?.endDate)}
              </p>
              <div className="text-right">
                {booking.originalPrice && booking.appliedCoupon ? (
                  <span className="text-[10px] text-muted-foreground line-through mr-1">₹{booking.originalPrice.toLocaleString()}</span>
                ) : null}
                <div className="text-[12px] font-bold text-primary">Price: ₹{((booking.totalPrice || 0) - (booking.lockerPrice || 0)).toLocaleString()}</div>
                {(booking.lockerPrice || 0) > 0 && (
                  <div className="text-[10px] text-muted-foreground">Locker: ₹{booking.lockerPrice.toLocaleString()}</div>
                )}
              </div>
            </div>

            {/* Compact validity indicator */}
            {['completed', 'advance_paid'].includes(booking.paymentStatus) && (() => {
              const now = new Date();
              const end = new Date(booking.endDate);
              const start = new Date(booking.startDate);
              const daysLeft = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
              const isActive = daysLeft > 0 && now >= start;
              const isUpcoming = now < start;
              const label = isUpcoming ? 'Upcoming' : isActive ? 'Active' : 'Expired';
              const color = isUpcoming ? 'bg-blue-100 text-blue-700' : isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700';
              return (
                <div className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-[11px] font-medium mb-1.5 ${color}`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-current flex-shrink-0" />
                  <span>{label}</span>
                  {isActive && <span className="ml-auto text-[10px] opacity-80">{daysLeft} day{daysLeft !== 1 ? 's' : ''} left</span>}
                  {isUpcoming && <span className="ml-auto text-[10px] opacity-80">Starts {format(start, 'dd MMM')}</span>}
                </div>
              );
            })()}

            {/* Extra info chips */}
            {(booking.seatPrice > 0 || booking.lockerPrice > 0 || booking.keyDeposit > 0) && (
              <div className="flex gap-2 mb-1.5 px-1 flex-wrap">
                {booking.seatPrice > 0 && (
                  <span className="text-[10px] text-muted-foreground">Price: ₹{booking.seatPrice?.toLocaleString()}</span>
                )}
                {booking.lockerPrice > 0 && (
                  <span className="text-[10px] text-muted-foreground">Locker: ₹{booking.lockerPrice?.toLocaleString()}</span>
                )}
                {booking.keyDeposit > 0 && (
                  <span className="text-[10px] text-muted-foreground">Deposit: ₹{booking.keyDeposit?.toLocaleString()}</span>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 mt-1.5">
              {booking.paymentStatus === 'pending' && (
                <div className="w-full p-2 bg-amber-50 border border-amber-200 rounded-xl">
                  <p className="text-[11px] text-amber-700 mb-2">Complete payment to confirm booking</p>
                  <div className="flex gap-2">
                    <RazorpayCheckout
                      amount={booking.totalPrice}
                      bookingId={booking.id}
                      bookingType={booking.bookingType}
                      endDate={new Date(booking.endDate)}
                      bookingDuration={booking.bookingDuration || 'monthly'}
                      durationCount={booking.durationCount || 1}
                      onSuccess={() => handlePaymentSuccess(booking.id)}
                      onError={handlePaymentError}
                      buttonText="Pay Now"
                      buttonVariant="default"
                      className="flex-1"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-[12px] rounded-xl text-destructive border-destructive/30 hover:bg-destructive/5 gap-1"
                      onClick={() => handleCancelBooking(booking.id)}
                    >
                      <X className="h-3.5 w-3.5" /> Cancel
                    </Button>
                  </div>
                </div>
              )}

              {['completed', 'advance_paid'].includes(booking.paymentStatus) && (
                <>
                  <Link to={`/student/bookings/${booking.id}`} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full h-8 text-[12px] rounded-xl gap-1">
                      <Eye className="h-3.5 w-3.5" /> View Details
                    </Button>
                  </Link>
                  {showRenewalOption && canRenew(booking) && (
                    <div className="flex-1">
                      <BookingRenewal
                        booking={booking as any}
                        onRenewalComplete={onBookingRenewed || (() => {})}
                      />
                    </div>
                  )}
                </>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
