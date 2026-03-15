import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { BookingsList } from '@/components/booking/BookingsList';
import { useToast } from '@/hooks/use-toast';
import { bookingsService } from '@/api/bookingsService';
import { hostelBookingService } from '@/api/hostelBookingService';
import { getMyMessSubscriptions } from '@/api/messService';
import { format } from 'date-fns';
import { Calendar, Building, BookOpen, CreditCard, CheckCircle, Hotel, UtensilsCrossed, Shirt, LayoutGrid } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

interface DueInfo {
  booking_id: string | null;
  due_amount: number;
  paid_amount: number;
  status: string;
  due_date: string;
}

interface Booking {
  id: string;
  cabinId: string;
  cabinCode: string;
  startDate: string;
  createdAt: string;
  endDate: string;
  originalPrice?: number;
  totalPrice: number;
  appliedCoupon?: { couponCode: string; discountAmount: number; couponType: string; couponValue: number };
  seatPrice: number;
  status: 'pending' | 'completed' | 'failed';
  paymentStatus: 'pending' | 'completed' | 'failed';
  bookingType: 'cabin' | 'hostel' | 'laundry' | 'mess';
  itemName: string;
  itemNumber: number;
  itemImage?: string;
  transferredHistory: any;
  keyDeposit?: number;
  bookingStatus: string;
}

type TypeFilter = 'all' | 'cabin' | 'hostel' | 'mess' | 'laundry';

const FILTER_OPTIONS: { value: TypeFilter; label: string; icon: React.ReactNode }[] = [
  { value: 'all', label: 'All', icon: <LayoutGrid className="h-3.5 w-3.5" /> },
  { value: 'cabin', label: 'Reading Room', icon: <BookOpen className="h-3.5 w-3.5" /> },
  { value: 'hostel', label: 'Hostel', icon: <Hotel className="h-3.5 w-3.5" /> },
  { value: 'mess', label: 'Mess', icon: <UtensilsCrossed className="h-3.5 w-3.5" /> },
  { value: 'laundry', label: 'Laundry', icon: <Shirt className="h-3.5 w-3.5" /> },
];

const StudentBookings = () => {
  const { isAuthenticated, user } = useAuth();
  const { toast } = useToast();
  const [currentBookings, setCurrentBookings] = useState<Booking[]>([]);
  const [pastBookings, setPastBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [duesMap, setDuesMap] = useState<Map<string, number>>(new Map());
  const [firstDueInfo, setFirstDueInfo] = useState<DueInfo | null>(null);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchBookings();
    fetchDues();
  }, [isAuthenticated]);

  const fetchDues = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      const [cabinDuesRes, hostelDuesRes] = await Promise.all([
        supabase
          .from('dues')
          .select('booking_id, due_amount, paid_amount, status, due_date')
          .eq('user_id', authUser.id)
          .in('status', ['pending', 'overdue', 'partial']),
        supabase
          .from('hostel_dues')
          .select('booking_id, due_amount, paid_amount, status, due_date')
          .eq('user_id', authUser.id)
          .in('status', ['pending', 'overdue', 'partial']),
      ]);

      const allDues = [...(cabinDuesRes.data || []), ...(hostelDuesRes.data || [])] as DueInfo[];
      const map = new Map<string, number>();
      allDues.forEach((d) => {
        if (d.booking_id) {
          map.set(d.booking_id, Number(d.due_amount) - Number(d.paid_amount));
        }
      });
      setDuesMap(map);

      const firstDue = allDues.find(d => (Number(d.due_amount) - Number(d.paid_amount)) > 0);
      setFirstDueInfo(firstDue || null);
    } catch (e) {
      console.error('Error fetching dues:', e);
    }
  };

  const fetchBookings = async () => {
    try {
      setIsLoading(true);

      const { data: { user: authUser } } = await supabase.auth.getUser();
      const [currentRes, historyRes, hostelBookingsRes, messSubscriptions, laundryOrdersRes] = await Promise.all([
        bookingsService.getCurrentBookings(),
        bookingsService.getBookingHistory(),
        hostelBookingService.getUserBookings(),
        authUser ? getMyMessSubscriptions(authUser.id) : [],
        authUser ? supabase
          .from('laundry_orders')
          .select('*, laundry_partners:partner_id(name, logo_image, business_name)')
          .eq('user_id', authUser.id)
          .order('created_at', { ascending: false }) : { data: [] },
      ]);

      const allCurrentRaw = currentRes.success ? currentRes.data : [];
      const allHistoryRaw = historyRes.success ? historyRes.data : [];

      // Collect all unique cabin_id + seat_number pairs to look up seat UUIDs & prices
      const seatLookupKeys = new Set<string>();
      [...allCurrentRaw, ...allHistoryRaw].forEach((b: any) => {
        if (b.cabin_id && b.seat_number) {
          seatLookupKeys.add(`${b.cabin_id}|${b.seat_number}`);
        }
      });

      const seatMap = new Map<string, { id: string; price: number; number: number }>();
      if (seatLookupKeys.size > 0) {
        const cabinIds = [...new Set([...seatLookupKeys].map(k => k.split('|')[0]))];
        const { data: seatsData } = await supabase
          .from('seats')
          .select('id, cabin_id, number, price')
          .in('cabin_id', cabinIds);
        (seatsData || []).forEach((s: any) => {
          seatMap.set(`${s.cabin_id}|${s.number}`, { id: s.id, price: s.price, number: s.number });
        });
      }

      const mapBooking = (booking: any) => {
        const seatInfo = seatMap.get(`${booking.cabin_id}|${booking.seat_number}`);
        return {
          id: booking.id,
          bookingId: booking.serial_number || booking.id?.substring(0, 8),
          startDate: booking.start_date,
          endDate: booking.end_date,
          status: booking.payment_status,
          createdAt: booking.created_at,
          totalPrice: booking.total_price,
          originalPrice: booking.total_price,
          appliedCoupon: undefined,
          seatPrice: seatInfo?.price || booking.total_price,
          cabinId: booking.cabin_id,
          seatId: seatInfo ? { _id: seatInfo.id, number: seatInfo.number, price: seatInfo.price } : null,
          paymentStatus: booking.payment_status,
          bookingType: 'cabin' as const,
          itemName: booking.cabins?.name || 'Reading Room',
          itemNumber: booking.seat_number || 0,
          itemImage: booking.cabins?.image_url,
          bookingStatus: booking.payment_status,
          location: booking.cabins?.city,
          cabinAddress: booking.cabins?.full_address || '',
          lockerPrice: booking.cabins?.locker_available ? (booking.cabins?.locker_price || 0) : 0,
          keyDeposit: undefined,
          cabinCode: booking.cabin_id || '',
          transferredHistory: null,
        };
      };

      const mapHostelBooking = (hb: any) => ({
        id: hb.id,
        bookingId: hb.serial_number || hb.id?.substring(0, 8),
        startDate: hb.start_date,
        endDate: hb.end_date,
        status: hb.payment_status,
        createdAt: hb.created_at,
        totalPrice: hb.total_price,
        originalPrice: hb.total_price,
        appliedCoupon: undefined,
        seatPrice: hb.total_price,
        cabinId: hb.hostel_id,
        paymentStatus: hb.payment_status,
        bookingType: 'hostel' as const,
        itemName: hb.hostels?.name || 'Hostel',
        itemNumber: hb.hostel_beds?.bed_number || 0,
        itemImage: hb.hostels?.logo_image,
        bookingStatus: hb.status,
        location: hb.hostels?.location,
        cabinAddress: '',
        lockerPrice: 0,
        keyDeposit: undefined,
        cabinCode: hb.hostel_id || '',
        transferredHistory: null,
      });

      const mapMessSubscription = (sub: any) => ({
        id: sub.id,
        bookingId: sub.serial_number || sub.id?.substring(0, 8),
        startDate: sub.start_date,
        endDate: sub.end_date,
        status: sub.payment_status,
        createdAt: sub.created_at,
        totalPrice: Number(sub.price_paid) || 0,
        originalPrice: Number(sub.price_paid) || 0,
        appliedCoupon: undefined,
        seatPrice: Number(sub.price_paid) || 0,
        cabinId: sub.mess_id,
        paymentStatus: sub.payment_status || 'completed',
        bookingType: 'mess' as const,
        itemName: sub.mess_partners?.name || 'Mess',
        itemNumber: 0,
        itemImage: sub.mess_partners?.logo_image,
        bookingStatus: sub.status,
        location: sub.mess_partners?.location,
        cabinAddress: '',
        lockerPrice: 0,
        keyDeposit: undefined,
        cabinCode: sub.mess_id || '',
        transferredHistory: null,
        serial_number: sub.serial_number,
        messPackageName: sub.mess_packages?.name,
      });

      const mapLaundryOrder = (order: any) => ({
        id: order.id,
        bookingId: order.serial_number || order.id?.substring(0, 8),
        startDate: order.pickup_date || order.created_at?.split('T')[0],
        endDate: order.delivery_date || order.pickup_date || order.created_at?.split('T')[0],
        status: order.payment_status,
        createdAt: order.created_at,
        totalPrice: Number(order.total_amount) || 0,
        originalPrice: Number(order.total_amount) || 0,
        appliedCoupon: undefined,
        seatPrice: Number(order.total_amount) || 0,
        cabinId: order.partner_id,
        paymentStatus: order.payment_status || 'pending',
        bookingType: 'laundry' as const,
        itemName: order.laundry_partners?.business_name || order.laundry_partners?.name || 'Laundry',
        itemNumber: 0,
        itemImage: order.laundry_partners?.logo_image,
        bookingStatus: order.status,
        location: '',
        cabinAddress: '',
        lockerPrice: 0,
        keyDeposit: undefined,
        cabinCode: order.partner_id || '',
        transferredHistory: null,
      });

      const hostelBookings = (hostelBookingsRes || []).map(mapHostelBooking);
      const messBookings = (messSubscriptions || []).map(mapMessSubscription);
      const laundryOrders = ((laundryOrdersRes as any)?.data || []).map(mapLaundryOrder);

      const today = new Date().toISOString().split('T')[0];
      const ONE_HOUR = 60 * 60 * 1000;

      const isNotStalePending = (b: any) => {
        if (b.paymentStatus === 'pending' && b.createdAt) {
          const age = Date.now() - new Date(b.createdAt).getTime();
          if (age > ONE_HOUR) return false;
        }
        return true;
      };

      const mappedCurrent = allCurrentRaw.map(mapBooking);
      const hostelCurrent = hostelBookings.filter((b: any) =>
        b.endDate >= today && !['failed', 'cancelled'].includes(b.bookingStatus)
      );
      const messCurrent = messBookings.filter((b: any) =>
        b.endDate >= today && !['cancelled', 'paused'].includes(b.bookingStatus)
      );
      const laundryCurrent = laundryOrders.filter((b: any) =>
        !['delivered', 'cancelled'].includes(b.bookingStatus)
      );

      const allCurrent = [...mappedCurrent, ...hostelCurrent, ...messCurrent, ...laundryCurrent]
        .filter(isNotStalePending)
        .map((b: any) => ({ ...b, dueAmount: duesMap.get(b.id) || 0 }))
        .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setCurrentBookings(allCurrent);

      const allHistory = allHistoryRaw.map(mapBooking);
      const hostelPast = hostelBookings.filter((b: any) =>
        b.endDate < today || ['failed', 'cancelled'].includes(b.bookingStatus)
      );
      const messPast = messBookings.filter((b: any) =>
        b.endDate < today || ['cancelled', 'paused'].includes(b.bookingStatus)
      );
      const laundryPast = laundryOrders.filter((b: any) =>
        ['delivered', 'cancelled'].includes(b.bookingStatus)
      );

      const allPast = [...allHistory, ...hostelPast, ...messPast, ...laundryPast]
        .map((b: any) => ({ ...b, dueAmount: duesMap.get(b.id) || 0 }))
        .filter((b: Booking) =>
          (b.endDate < today && !['pending'].includes(b.paymentStatus)) ||
          ['failed', 'cancelled'].includes(b.paymentStatus) ||
          b.bookingType === 'laundry'
        )
        .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setPastBookings(allPast);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const activeCount = Array.isArray(currentBookings)
    ? currentBookings.filter(b => ['completed', 'advance_paid'].includes(b.paymentStatus)).length
    : 0;

  const totalDueAmount = firstDueInfo ? Number(firstDueInfo.due_amount) - Number(firstDueInfo.paid_amount) : 0;
  const dueDate = firstDueInfo?.due_date ? format(new Date(firstDueInfo.due_date), 'dd MMM') : null;

  const filteredCurrent = typeFilter === 'all'
    ? currentBookings
    : currentBookings.filter(b => b.bookingType === typeFilter);

  const filteredPast = typeFilter === 'all'
    ? pastBookings
    : pastBookings.filter(b => b.bookingType === typeFilter);

  return (
    <div className="min-h-screen bg-background">
      {/* Compact gradient header */}
      <div className="bg-gradient-to-br from-primary to-primary/80 text-white px-3 pt-4 pb-7">
        <div className="max-w-lg mx-auto">
          <p className="text-white/70 text-[11px] mb-0.5">Welcome back</p>
          <h1 className="text-[17px] font-bold mb-4">{user?.name || 'Student'}</h1>

          <div className="grid grid-cols-2 gap-2.5">
            <Card className="bg-white/10 border-0 shadow-none">
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center">
                    <Building className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <p className="text-white/70 text-[10px]">Active Bookings</p>
                    <p className="text-white font-bold text-[15px]">{activeCount}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card
              className="bg-white/10 border-0 shadow-none cursor-pointer"
              onClick={() => {
                if (firstDueInfo?.booking_id) navigate(`/student/bookings/${(firstDueInfo as any).serial_number || firstDueInfo.booking_id}`);
              }}
            >
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center">
                    {totalDueAmount > 0 ? (
                      <CreditCard className="h-4 w-4 text-white" />
                    ) : (
                      <CheckCircle className="h-4 w-4 text-white" />
                    )}
                  </div>
                  <div>
                    <p className="text-white/70 text-[10px]">Due Amount</p>
                    {totalDueAmount > 0 ? (
                      <>
                        <p className="text-white font-bold text-[13px]">₹{totalDueAmount.toLocaleString()}</p>
                        {dueDate && <p className="text-white/60 text-[9px]">Due: {dueDate}</p>}
                      </>
                    ) : (
                      <p className="text-white font-bold text-[12px]">No Dues ✓</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-lg mx-auto px-3 -mt-3">
        {/* Filter pills */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1 scrollbar-hide">
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setTypeFilter(opt.value)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-2xl text-[12px] font-medium whitespace-nowrap border transition-colors ${
                typeFilter === opt.value
                  ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                  : 'bg-card text-muted-foreground border-border hover:bg-accent/50'
              }`}
            >
              {opt.icon}
              {opt.label}
            </button>
          ))}
        </div>

        <h2 className="text-[15px] font-semibold text-foreground mb-3">My Bookings</h2>

        <Tabs defaultValue="current" className="w-full">
          <TabsList className="w-full mb-3 rounded-xl">
            <TabsTrigger value="current" className="flex-1 rounded-xl text-[12px]">
              <BookOpen className="h-3.5 w-3.5 mr-1" />
              Active
            </TabsTrigger>
            <TabsTrigger value="past" className="flex-1 rounded-xl text-[12px]">
              <Calendar className="h-3.5 w-3.5 mr-1" />
              Expired
            </TabsTrigger>
          </TabsList>

          <TabsContent value="current" className="mt-0">
            <BookingsList bookings={filteredCurrent} isLoading={isLoading} onBookingCancelled={fetchBookings} />
          </TabsContent>
          <TabsContent value="past" className="mt-0">
            <BookingsList bookings={filteredPast} isLoading={isLoading} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default StudentBookings;
