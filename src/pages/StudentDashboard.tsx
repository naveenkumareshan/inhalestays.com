
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Navigation } from '@/components/Navigation';
import { Footer } from '@/components/Footer';
import { bookingsService } from '@/api/bookingsService';
import { vendorSeatsService } from '@/api/vendorSeatsService';
import { reviewsService } from '@/api/reviewsService';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { format, differenceInDays, isPast } from 'date-fns';
import { Building, Calendar, Check, ArrowUp, ArrowDown, MapPin, Clock, Receipt, CheckCircle2, XCircle, AlertCircle, Wallet, Star, MessageSquare } from 'lucide-react';
import ErrorBoundary from '@/components/ErrorBoundary';
import { useNavigate } from 'react-router-dom';
import { BookingExpiryDetails } from '@/pages/students/BookingExpiryDetails';
import { formatBookingPeriod } from '@/utils/currency';
import { ReviewForm } from '@/components/reviews/ReviewForm';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

/* ─── Receipt Card for Booking History ─────────────────────────────── */
interface ReceiptCardProps {
  booking: BookingData;
  formatDate: (d: string) => string;
  isReviewed?: boolean;
  onReview?: (booking: BookingData) => void;
}

const BookingReceiptCard: React.FC<ReceiptCardProps> = ({ booking, formatDate, isReviewed, onReview }) => {
  const isExpired = booking.end_date ? isPast(new Date(booking.end_date)) : false;
  const daysAgo = booking.end_date ? Math.abs(differenceInDays(new Date(), new Date(booking.end_date))) : 0;

  const borderColor = (() => {
    if (booking.payment_status === 'failed') return 'border-l-red-500';
    if (booking.payment_status === 'pending') return 'border-l-yellow-500';
    if (booking.payment_status === 'completed' && !isExpired) return 'border-l-green-500';
    return 'border-l-muted-foreground/40';
  })();

  const StatusIcon = (() => {
    if (booking.payment_status === 'failed') return XCircle;
    if (booking.payment_status === 'pending') return AlertCircle;
    if (booking.payment_status === 'completed' && !isExpired) return CheckCircle2;
    return Receipt;
  })();

  const iconColor = (() => {
    if (booking.payment_status === 'failed') return 'text-red-500';
    if (booking.payment_status === 'pending') return 'text-yellow-500';
    if (booking.payment_status === 'completed' && !isExpired) return 'text-green-500';
    return 'text-muted-foreground';
  })();

  const statusLabel = (() => {
    if (booking.payment_status === 'failed') return 'Failed';
    if (booking.payment_status === 'pending') return 'Pending';
    if (isExpired) return `Expired ${daysAgo}d ago`;
    return 'Completed';
  })();

  return (
    <div className={`rounded-xl border border-l-4 ${borderColor} bg-card shadow-sm overflow-hidden`}>
      {/* Header */}
      <div className="flex items-start justify-between p-4 pb-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className={`mt-0.5 flex-shrink-0 ${iconColor}`}>
            <StatusIcon className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-[14px] text-foreground truncate">
              {booking.cabins?.name || 'Reading Room'}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              {booking.cabins?.city && (
                <span className="flex items-center gap-0.5 text-[11px] text-muted-foreground">
                  <MapPin className="w-2.5 h-2.5" />{booking.cabins.city}
                </span>
              )}
              {booking.seat_number && (
                <span className="text-[11px] text-muted-foreground">· Seat #{booking.seat_number}</span>
              )}
              {booking.cabins?.category && (
                <span className="text-[11px] text-muted-foreground capitalize">· {booking.cabins.category}</span>
              )}
            </div>
          </div>
        </div>
        <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full flex-shrink-0 ml-2 ${
          booking.payment_status === 'failed' ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400' :
          booking.payment_status === 'pending' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400' :
          !isExpired ? 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400' :
          'bg-muted text-muted-foreground'
        }`}>{statusLabel}</span>
      </div>

      {/* Divider */}
      <div className="border-t border-dashed mx-4" />

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x px-0">
        <div className="px-4 py-3">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">Period</p>
          <p className="text-[12px] font-medium text-foreground">
            {booking.start_date ? format(new Date(booking.start_date), 'dd MMM') : '—'}
            {' → '}
            {booking.end_date ? format(new Date(booking.end_date), 'dd MMM yy') : '—'}
          </p>
        </div>
        <div className="px-4 py-3">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">Duration</p>
          <p className="text-[12px] font-medium text-foreground">
            {booking.duration_count} {booking.booking_duration}
          </p>
        </div>
        <div className="px-4 py-3">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">Amount</p>
          <p className="text-[12px] font-semibold text-foreground">Bed: ₹{(booking.total_price || 0).toLocaleString()}</p>
          {((booking as any).security_deposit || 0) > 0 && (
            <p className="text-[10px] text-muted-foreground">Deposit: ₹{((booking as any).security_deposit || 0).toLocaleString()}</p>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t bg-muted/30 px-4 py-2 flex items-center justify-between">
        <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
          <Clock className="w-3 h-3" />
          Booked {booking.created_at ? format(new Date(booking.created_at), 'd MMM yyyy') : '—'}
        </span>
        {isExpired && booking.payment_status === 'completed' && (
          <span className="text-[10px] text-muted-foreground italic">Expired</span>
        )}
      </div>

      {/* Review button for history cards */}
      {booking.payment_status === 'completed' && (
        <div className="border-t bg-muted/30 px-4 py-2">
          {isReviewed ? (
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Review Submitted
            </span>
          ) : (
            <button
              onClick={() => onReview?.(booking)}
              className="text-[10px] text-primary font-medium flex items-center gap-1 hover:underline"
            >
              <Star className="w-3 h-3" /> Review Reading Room
            </button>
          )}
        </div>
      )}
    </div>
  );
};

interface BookingData {
  id: string;
  _id?: string;
  duration_count: string;
  booking_duration: string;
  cabin_id: string | null;
  cabins?: {
    name: string;
    category: string;
    image_url?: string;
    city?: string;
    area?: string;
  } | null;
  seat_number: number | null;
  start_date: string;
  end_date: string;
  total_price: number;
  payment_status: 'pending' | 'completed' | 'failed';
  created_at?: string;
}

interface LaundryOrder {
  _id: string;
  items: {
    name: string;
    quantity: number;
    price: number;
  }[];
  status: 'pending' | 'processing' | 'completed' | 'cancelled';
  totalAmount: number;
  createdAt: string;
}

const StudentDashboard: React.FC = () => {
  const [currentBookings, setCurrentBookings] = useState<BookingData[]>([]);
  const [bookingHistory, setBookingHistory] = useState<BookingData[]>([]);
  const [laundryOrders, setLaundryOrders] = useState<LaundryOrder[]>([]);
  const [studentDues, setStudentDues] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingLaundry, setLoadingLaundry] = useState<boolean>(true);
  const [reviewedBookingIds, setReviewedBookingIds] = useState<Set<string>>(new Set());
  const [reviewDialogBooking, setReviewDialogBooking] = useState<BookingData | null>(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchBookingData();
    fetchLaundryOrders();
    fetchStudentDues();
  }, []);

  const fetchStudentDues = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;
      const { data } = await supabase
        .from('dues')
        .select('*, cabins:cabin_id(name), seats:seat_id(number)')
        .eq('user_id', authUser.id)
        .order('created_at', { ascending: false });
      setStudentDues(data || []);
    } catch (e) {
      console.error('Error fetching student dues:', e);
    }
  };

  const fetchBookingData = async () => {
    try {
      setLoading(true);
      
      const currentResponse = await bookingsService.getCurrentBookings();
      let allBookings: BookingData[] = [];
      if (currentResponse.success && Array.isArray(currentResponse.data)) {
        setCurrentBookings(currentResponse.data as any);
        allBookings = [...(currentResponse.data as any)];
      }
      
      const historyResponse = await bookingsService.getBookingHistory();
      if (historyResponse.success && Array.isArray(historyResponse.data)) {
        setBookingHistory(historyResponse.data as any);
        allBookings = [...allBookings, ...(historyResponse.data as any)];
      }

      // Check which completed bookings already have reviews
      const completedIds = allBookings
        .filter(b => b.payment_status === 'completed')
        .map(b => b.id);
      if (completedIds.length > 0) {
        try {
          const existingReviews = await reviewsService.getUserReviewsForBookings(completedIds);
          setReviewedBookingIds(new Set(existingReviews.map(r => r.booking_id)));
        } catch (e) {
          console.error('Error checking reviews:', e);
        }
      }
    } catch (error) {
      console.error('Error fetching booking data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLaundryOrders = async () => {
    try {
      setLoadingLaundry(true);
      
      // Using mock data since we don't have this endpoint yet
      // In a real app, this would be laundryService.getUserOrders()
      const mockLaundryOrders: LaundryOrder[] = [
        {
          _id: '1',
          items: [
            { name: 'T-Shirts', quantity: 3, price: 45 },
            { name: 'Pants', quantity: 2, price: 60 }
          ],
          status: 'completed',
          totalAmount: 255,
          createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() // 2 days ago
        },
        {
          _id: '2',
          items: [
            { name: 'Bed Sheets', quantity: 1, price: 90 },
            { name: 'Towels', quantity: 2, price: 40 }
          ],
          status: 'processing',
          totalAmount: 170,
          createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString() // 12 hours ago
        }
      ];
      
      setLaundryOrders(mockLaundryOrders);
    } catch (error) {
      console.error('Error fetching laundry orders:', error);
    } finally {
      setLoadingLaundry(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-500">Completed</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-500">Pending</Badge>;
      case 'failed':
        return <Badge className="bg-red-500">Failed</Badge>;
      case 'processing':
        return <Badge className="bg-blue-500">Processing</Badge>;
      case 'cancelled':
        return <Badge className="bg-gray-500">Cancelled</Badge>;
      default:
        return <Badge className="bg-gray-500">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'PP');
  };

  let totalSpent = 0;

  if (Array.isArray(currentBookings) && Array.isArray(bookingHistory)) {
    totalSpent = [...currentBookings, ...bookingHistory]
      .filter(booking => booking.payment_status === 'completed')
      .reduce((sum, booking) => sum + (booking.total_price || 0), 0);
  }
  // Calculate total spent on laundry
  const totalLaundrySpent = laundryOrders
    .filter(order => order.status === 'completed')
    .reduce((sum, order) => sum + order.totalAmount, 0);

  const pendingDues = studentDues.filter(d => d.status !== 'paid' && d.status !== 'cancelled');
  const totalDueAmount = pendingDues.reduce((s, d) => s + Number(d.due_amount) - Number(d.paid_amount), 0);
  const hasOverdue = pendingDues.some(d => d.due_date < new Date().toISOString().split('T')[0]);

  return (
    <ErrorBoundary>
      <div className="min-h-screen flex flex-col">
        <div className="container mx-auto px-4 py-6 flex-grow">
          <div className="grid grid-cols-1 gap-6">
            <Card>
              <CardHeader>
                <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                  <div>
                    <CardTitle className="text-3xl font-bold">Student Dashboard</CardTitle>
                    <CardDescription>Welcome back, {user?.name}</CardDescription>
                  </div>
                  <Button onClick={() => navigate('/cabins')}>Book New Reading Room</Button>
                </div>
              </CardHeader>
              
              <CardContent>
                {/* Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Active Bookings</p>
                         <h3 className="text-2xl font-bold mt-1">
                            {Array.isArray(currentBookings)
                              ? currentBookings.filter(b => b.payment_status === 'completed').length
                              : 0}
                          </h3>
                        </div>
                        <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                          <Building className="h-6 w-6 text-blue-600 dark:text-blue-300" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Next Payment</p>
                          <h3 className="text-2xl font-bold mt-1">
                            {currentBookings.length > 0 ? (
                              formatDate(currentBookings[0].end_date || '')
                            ) : (
                              'N/A'
                            )}
                          </h3>
                        </div>
                        <div className="h-12 w-12 rounded-full bg-amber-100 dark:bg-amber-900 flex items-center justify-center">
                          <Calendar className="h-6 w-6 text-amber-600 dark:text-amber-300" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {pendingDues.length > 0 && (
                    <Card className={hasOverdue ? 'border-red-300 dark:border-red-800' : ''}>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-muted-foreground">Pending Dues</p>
                            <h3 className={`text-2xl font-bold mt-1 ${hasOverdue ? 'text-red-600' : ''}`}>
                              ₹{totalDueAmount.toLocaleString()}
                            </h3>
                          </div>
                          <div className={`h-12 w-12 rounded-full flex items-center justify-center ${hasOverdue ? 'bg-red-100 dark:bg-red-900' : 'bg-orange-100 dark:bg-orange-900'}`}>
                            <Wallet className={`h-6 w-6 ${hasOverdue ? 'text-red-600 dark:text-red-300' : 'text-orange-600 dark:text-orange-300'}`} />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
                
                <Tabs defaultValue="bookings" className="w-full">
                <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3">
                  <TabsTrigger value="bookings">Current Bookings</TabsTrigger>
                  <TabsTrigger value="history">Booking History</TabsTrigger>
                  {pendingDues.length > 0 && <TabsTrigger value="dues">My Dues</TabsTrigger>}
                </TabsList>
                  
                  <TabsContent value="bookings" className="mt-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Current Bookings</CardTitle>
                        <CardDescription>Your active and upcoming bookings</CardDescription>
                      </CardHeader>
                      <CardContent>
                        {loading ? (
                          <div className="space-y-3 py-4">
                            {[...Array(2)].map((_, i) => (
                              <div key={i} className="rounded-2xl border p-5 space-y-3">
                                <div className="flex justify-between">
                                  <div className="space-y-2">
                                    <Skeleton className="h-5 w-40" />
                                    <Skeleton className="h-3 w-24" />
                                  </div>
                                  <Skeleton className="h-6 w-20 rounded-full" />
                                </div>
                                <div className="grid grid-cols-4 gap-4">
                                  {[...Array(4)].map((_, j) => (
                                    <div key={j} className="space-y-1">
                                      <Skeleton className="h-3 w-12" />
                                      <Skeleton className="h-4 w-20" />
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : currentBookings.length === 0 ? (
                          <div className="text-center py-8">
                            <p className="text-muted-foreground">You don't have any current bookings.</p>
                            <Button onClick={() => navigate('/cabins')} className="mt-4">
                              Browse Reading Rooms
                            </Button>
                          </div>
                        ) : (
                          <div className="space-y-6">
                            {currentBookings.map((booking) => (
                              <div key={booking.id} onClick={() => navigate(`/student/bookings/${(booking as any).serial_number || booking.id}`)} className="cursor-pointer hover:bg-muted/50 transition rounded-2xl border p-5 shadow-md space-y-4">
                              {/* Top: Title & Status */}
                              <div className="flex flex-col md:flex-row md:justify-between md:items-center">
                                <div>
                                  <h3 className="text-lg font-semibold">{booking.cabins?.name || 'Reading Room'}</h3>
                                  <p className="text-sm text-muted-foreground">
                                    Seat #{booking.seat_number} • {booking.cabins?.category}
                                  </p>
                                </div>
                                <div className="mt-2 md:mt-0">
                                  {getStatusBadge(booking.payment_status)}
                                </div>
                              </div>

                              {/* Grid Info */}
                              <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Period</p>
                              <p>{formatDate(booking.start_date || '')} → {formatDate(booking.end_date || '')}</p>
                            </div>
                          
                            <div className="flex justify-between items-center sm:block sm:space-y-1 text-sm">
                              <p className="text-xs text-muted-foreground uppercase tracking-wide">Duration</p>
                              <p>{booking.duration_count}</p>
                            </div>
                            <div className="flex justify-between items-center sm:block sm:space-y-1 text-sm">
                              <p className="text-xs text-muted-foreground uppercase tracking-wide">Type</p>
                              <p>{booking.booking_duration}</p>
                            </div>

                            <div className="flex justify-between items-center sm:block sm:space-y-1 text-sm">
                              <p className="text-xs text-muted-foreground uppercase tracking-wide">Price</p>
                              <p className="font-medium text-green-700">Seat: ₹{((booking.total_price || 0) + ((booking as any).discount_amount || 0) - ((booking as any).locker_price || 0)).toLocaleString()}</p>
                              {((booking as any).locker_price || 0) > 0 && (
                                <p className="text-xs text-muted-foreground">Locker: ₹{((booking as any).locker_price || 0).toLocaleString()}</p>
                              )}
                              {((booking as any).discount_amount || 0) > 0 && (
                                <p className="text-xs text-destructive">Discount: -₹{((booking as any).discount_amount || 0).toLocaleString()}</p>
                              )}
                            </div>
                            
                          </div>
                            {booking.payment_status === 'completed' &&
                              <BookingExpiryDetails
                                startDate={booking.start_date || ''}
                                endDate={booking.end_date || ''}
                                status={booking.payment_status}
                                paymentStatus={booking.payment_status}
                              />
                             }
                             {/* Review Button */}
                             {booking.payment_status === 'completed' && (
                               <div className="mt-3 pt-3 border-t">
                                 {reviewedBookingIds.has(booking.id) ? (
                                   <Badge variant="outline" className="text-xs">
                                     <CheckCircle2 className="h-3 w-3 mr-1" /> Review Submitted
                                   </Badge>
                                 ) : (
                                   <Button
                                     size="sm"
                                     variant="outline"
                                     onClick={(e) => { e.stopPropagation(); setReviewDialogBooking(booking); }}
                                   >
                                     <Star className="h-3.5 w-3.5 mr-1" /> Review Reading Room
                                   </Button>
                                 )}
                               </div>
                             )}
                            </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>
                  
                  <TabsContent value="history" className="mt-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Booking History</CardTitle>
                        <CardDescription>Your past bookings</CardDescription>
                      </CardHeader>
                      <CardContent>
                        {loading ? (
                          <div className="flex justify-center py-8">
                            <div className="animate-spin h-8 w-8 border-4 border-cabin-wood border-t-transparent rounded-full"></div>
                          </div>
                        ) : bookingHistory.length === 0 ? (
                          <div className="text-center py-8">
                            <p className="text-muted-foreground">You don't have any past bookings.</p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {bookingHistory.map((booking) => (
                              <BookingReceiptCard
                                key={booking.id}
                                booking={booking}
                                formatDate={formatDate}
                                isReviewed={reviewedBookingIds.has(booking.id)}
                                onReview={(b) => setReviewDialogBooking(b)}
                              />
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="dues" className="mt-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>My Dues</CardTitle>
                        <CardDescription>Pending payments for advance bookings</CardDescription>
                      </CardHeader>
                      <CardContent>
                        {pendingDues.length === 0 ? (
                          <div className="text-center py-8 text-muted-foreground">No pending dues</div>
                        ) : (
                          <div className="space-y-3">
                            {pendingDues.map((due: any) => {
                              const remaining = Number(due.due_amount) - Number(due.paid_amount);
                              const isOverdue = due.due_date < new Date().toISOString().split('T')[0];
                              const daysOverdue = isOverdue ? Math.abs(differenceInDays(new Date(due.due_date), new Date())) : 0;
                              return (
                                <div key={due.id} className={`rounded-xl border p-4 space-y-2 ${isOverdue ? 'border-red-300 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20' : ''}`}>
                                  <div className="flex justify-between items-start">
                                    <div>
                                      <p className="font-semibold text-sm">{(due.cabins as any)?.name || 'Reading Room'}</p>
                                      <p className="text-xs text-muted-foreground">Seat #{(due.seats as any)?.number || '-'}</p>
                                    </div>
                                    {isOverdue ? (
                                      <Badge className="bg-red-500 text-white text-[10px]">{daysOverdue}d Overdue</Badge>
                                    ) : (
                                      <Badge className="bg-amber-500 text-white text-[10px]">Pending</Badge>
                                    )}
                                  </div>
                                  <div className="grid grid-cols-3 gap-2 text-xs">
                                    <div>
                                      <p className="text-muted-foreground text-[10px]">Total Fee</p>
                                      <p className="font-medium">₹{Number(due.total_fee).toLocaleString()}</p>
                                    </div>
                                    <div>
                                      <p className="text-muted-foreground text-[10px]">Paid</p>
                                      <p className="font-medium text-emerald-600">₹{(Number(due.advance_paid) + Number(due.paid_amount)).toLocaleString()}</p>
                                    </div>
                                    <div>
                                      <p className="text-muted-foreground text-[10px]">Due Amount</p>
                                      <p className="font-semibold text-red-600">₹{Math.max(0, remaining).toLocaleString()}</p>
                                    </div>
                                  </div>
                                  <div className="flex justify-between text-xs text-muted-foreground">
                                    <span>Due Date: {due.due_date ? format(new Date(due.due_date), 'dd MMM yyyy') : '-'}</span>
                                    <span>Seat Valid: {due.proportional_end_date ? format(new Date(due.proportional_end_date), 'dd MMM yyyy') : '-'}</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>
{/*                   
                  <TabsContent value="laundry" className="mt-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Laundry Orders</CardTitle>
                        <CardDescription>Your laundry service orders</CardDescription>
                      </CardHeader>
                      <CardContent>
                        {loadingLaundry ? (
                          <div className="flex justify-center py-8">
                            <div className="animate-spin h-8 w-8 border-4 border-cabin-wood border-t-transparent rounded-full"></div>
                          </div>
                        ) : laundryOrders.length === 0 ? (
                          <div className="text-center py-8">
                            <p className="text-muted-foreground">You don't have any laundry orders.</p>
                            <Button onClick={() => navigate('/laundry')} className="mt-4">
                              Order Laundry Service
                            </Button>
                          </div>
                        ) : (
                          <div className="space-y-6">
                            {laundryOrders.map((order) => (
                              <div key={order._id} className="border rounded-lg p-4">
                                <div className="flex flex-col md:flex-row justify-between">
                                  <div>
                                    <h3 className="font-medium">Order #{order._id}</h3>
                                    <p className="text-sm text-muted-foreground">
                                      {formatDate(order.createdAt)}
                                    </p>
                                  </div>
                                  <div className="mt-2 md:mt-0">
                                    {getStatusBadge(order.status)}
                                  </div>
                                </div>
                                <div className="mt-4">
                                  <p className="text-xs text-muted-foreground mb-2">Items</p>
                                  <div className="space-y-1">
                                    {order.items.map((item, idx) => (
                                      <div key={idx} className="flex justify-between text-sm">
                                        <span>{item.name} x {item.quantity}</span>
                                        <span>₹{item.price * item.quantity}</span>
                                      </div>
                                    ))}
                                    <div className="border-t pt-1 mt-2 flex justify-between font-medium">
                                      <span>Total</span>
                                      <span>₹{order.totalAmount}</span>
                                    </div>
                                  </div>
                                </div>
                                <div className="mt-4 flex justify-end">
                                  <Button variant="outline" size="sm">
                                    View Details
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent> */}
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      {/* Review Dialog */}
      {reviewDialogBooking && (
        <Dialog open={!!reviewDialogBooking} onOpenChange={() => setReviewDialogBooking(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Review {reviewDialogBooking.cabins?.name || 'Reading Room'}</DialogTitle>
            </DialogHeader>
            <ReviewForm
              bookingId={reviewDialogBooking.id}
              cabinId={reviewDialogBooking.cabin_id || ''}
              onReviewSubmitted={() => {
                setReviewDialogBooking(null);
                setReviewedBookingIds(prev => new Set([...prev, reviewDialogBooking.id]));
              }}
            />
          </DialogContent>
        </Dialog>
      )}
    </ErrorBoundary>
  );
};

export default StudentDashboard;
