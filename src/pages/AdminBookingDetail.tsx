
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { adminBookingsService } from '@/api/adminBookingsService';
import { hostelService } from '@/api/hostelService';
import { ChevronLeft, CreditCard, IndianRupee, RefreshCw, Receipt, FileDown, ImageIcon } from 'lucide-react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { supabase } from '@/integrations/supabase/client';
import { downloadInvoice, InvoiceData } from '@/utils/invoiceGenerator';

interface ReceiptRow {
  id: string;
  serial_number: string | null;
  amount: number;
  payment_method: string;
  receipt_type: string;
  transaction_id: string;
  collected_by_name: string;
  notes: string;
  created_at: string;
  due_id?: string | null;
}

const AdminBookingDetail = () => {
  const { bookingId, type } = useParams<{ bookingId: string; type: string }>();
  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [receipts, setReceipts] = useState<ReceiptRow[]>([]);
  const [dueData, setDueData] = useState<any>(null);

  const { toast } = useToast();
  const navigate = useNavigate();
  const bookingType = type === 'hostel' ? 'hostel' : 'cabin';

  useEffect(() => {
    if (bookingId && type) fetchBookingDetails();
  }, [bookingId, type]);

  const fetchBookingDetails = async () => {
    try {
      setLoading(true);
      let bookingData: any = null;

      let resolvedId = bookingId!;

      if (bookingType === 'hostel') {
        // Dual-lookup: try serial_number first, then UUID
        let { data: hb } = await supabase
          .from('hostel_bookings')
          .select('*, hostels(name), hostel_rooms(room_number), hostel_beds(bed_number), profiles:user_id(name, email, phone)')
          .eq('serial_number', bookingId!)
          .maybeSingle();
        if (!hb) {
          const res = await supabase
            .from('hostel_bookings')
            .select('*, hostels(name), hostel_rooms(room_number), hostel_beds(bed_number), profiles:user_id(name, email, phone)')
            .eq('id', bookingId!)
            .single();
          hb = res.data;
        }
        bookingData = hb;
        if (bookingData) resolvedId = bookingData.id;
      } else {
        // Dual-lookup for cabin bookings
        const response = await adminBookingsService.getBookingById(bookingId!);
        if (response.success && response.data) {
          bookingData = response.data;
          resolvedId = bookingData._id || bookingData.id || bookingId!;
        }
      }

      if (!bookingData) {
        toast({ title: "Error", description: "Failed to fetch booking details", variant: "destructive" });
        return;
      }

      setBooking(bookingData);

      if (bookingType === 'hostel') {
        // Fetch from hostel_receipts
        const { data: rcpts } = await supabase
          .from('hostel_receipts')
          .select('*')
          .eq('booking_id', resolvedId)
          .order('created_at', { ascending: false });
        setReceipts((rcpts || []).map(r => ({
          ...r,
          transaction_id: r.transaction_id || '',
          collected_by_name: r.collected_by_name || '',
          notes: r.notes || '',
        })) as ReceiptRow[]);
        setDueData(null); // Hostel doesn't use dues table
      } else {
        const { data: rcpts } = await supabase
          .from('receipts')
          .select('*')
          .eq('booking_id', resolvedId)
          .order('created_at', { ascending: false });
        setReceipts((rcpts || []) as ReceiptRow[]);
        const { data: dues } = await supabase
          .from('dues')
          .select('*')
          .eq('booking_id', resolvedId)
          .limit(1)
          .maybeSingle();
        setDueData(dues);
      }
    } catch (error) {
      console.error("Error fetching booking:", error);
      toast({ title: "Error", description: "Failed to fetch booking details", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'confirmed': case 'completed':
        return <Badge className="bg-green-500 text-[10px] px-1.5 py-0">Confirmed</Badge>;
      case 'pending':
        return <Badge variant="outline" className="border-amber-500 text-amber-500 text-[10px] px-1.5 py-0">Pending</Badge>;
      case 'advance_paid':
        return <Badge variant="outline" className="border-blue-500 text-blue-500 text-[10px] px-1.5 py-0">Advance Paid</Badge>;
      case 'cancelled': case 'failed':
        return <Badge variant="outline" className="border-red-500 text-red-500 text-[10px] px-1.5 py-0">Cancelled</Badge>;
      default:
        return <Badge variant="outline" className="text-[10px] px-1.5 py-0">{status}</Badge>;
    }
  };

  // ── Helper to get user/room/hostel fields regardless of booking type ──
  const getUserField = (field: string) => {
    if (bookingType === 'hostel') {
      return booking?.profiles?.[field] || '-';
    }
    const user = typeof booking?.userId === 'object' ? booking.userId : {};
    return user?.[field] || '-';
  };

  const getPropertyName = () => {
    if (bookingType === 'hostel') return booking?.hostels?.name || '-';
    return typeof booking?.cabinId === 'object' ? booking.cabinId?.name : '-';
  };

  const getSeatLabel = () => {
    if (bookingType === 'hostel') {
      return `Room ${booking?.hostel_rooms?.room_number || '-'} / Bed #${booking?.hostel_beds?.bed_number || '-'}`;
    }
    return `#${typeof booking?.seatId === 'object' ? booking.seatId?.number : '-'}`;
  };

  const getBookingId = () => {
    if (bookingType === 'hostel') return booking?.serial_number || booking?.id;
    return booking?.bookingId || booking?._id;
  };

  const getCreatedAt = () => {
    if (bookingType === 'hostel') return booking?.created_at;
    return booking?.createdAt;
  };

  const getStartDate = () => {
    if (bookingType === 'hostel') return booking?.start_date;
    return booking?.startDate;
  };

  const getEndDate = () => {
    if (bookingType === 'hostel') return booking?.end_date;
    return booking?.endDate;
  };

  const handleDownloadInvoice = () => {
    if (!booking) return;

    let invoiceData: InvoiceData;

    if (bookingType === 'hostel') {
      const foodPolicy = booking.food_policy_type || (booking.food_opted ? 'optional' : 'not_available');
      invoiceData = {
        serialNumber: booking.serial_number || booking.id || '',
        bookingDate: booking.created_at || new Date().toISOString(),
        studentName: booking.profiles?.name || '-',
        studentEmail: booking.profiles?.email || '-',
        studentPhone: booking.profiles?.phone || '-',
        studentSerialNumber: '',
        cabinName: `${booking.hostels?.name || '-'} — Room ${booking.hostel_rooms?.room_number || '-'}`,
        seatNumber: booking.hostel_beds?.bed_number || 0,
        startDate: booking.start_date || '',
        endDate: booking.end_date || '',
        duration: booking.booking_duration || '-',
        durationCount: Number(booking.duration_count || 1),
        bookingDuration: booking.booking_duration || 'monthly',
        seatAmount: foodPolicy === 'mandatory'
          ? (booking.total_price || 0)
          : (booking.total_price || 0) - (booking.food_amount || 0),
        discountAmount: 0,
        discountReason: '',
        lockerIncluded: false,
        lockerPrice: 0,
        foodOpted: booking.food_opted || false,
        foodAmount: booking.food_amount || 0,
        foodPolicyType: foodPolicy as any,
        totalAmount: booking.total_price || 0,
        paymentMethod: booking.payment_method || 'cash',
        transactionId: booking.transaction_id || '',
        collectedByName: booking.collected_by_name || '-',
      };
    } else {
      const user = typeof booking.userId === 'object' ? booking.userId : {};
      const cabin = typeof booking.cabinId === 'object' ? booking.cabinId : {};
      const seat = typeof booking.seatId === 'object' ? booking.seatId : {};
      const cabinSeatPrice = (booking.totalPrice || 0) + (booking.discountAmount || 0) - (booking.lockerPrice || 0);
      invoiceData = {
        serialNumber: booking.serialNumber || booking.bookingId || booking._id || '',
        bookingDate: booking.createdAt || new Date().toISOString(),
        studentName: user?.name || '-',
        studentEmail: user?.email || '-',
        studentPhone: user?.phone || '-',
        studentSerialNumber: user?.userId || '',
        cabinName: cabin?.name || '-',
        seatNumber: seat?.number || booking.seatNumber || 0,
        startDate: booking.startDate || '',
        endDate: booking.endDate || '',
        duration: booking.bookingDuration || booking.duration || '-',
        durationCount: Number(booking.durationCount || booking.duration_count || 1),
        bookingDuration: booking.bookingDuration || booking.booking_duration || 'monthly',
        seatAmount: cabinSeatPrice,
        discountAmount: booking.discountAmount || 0,
        discountReason: booking.discountReason || '',
        lockerIncluded: booking.lockerIncluded || false,
        lockerPrice: booking.lockerPrice || 0,
        totalAmount: booking.totalPrice || 0,
        paymentMethod: booking.paymentMethod || 'cash',
        transactionId: booking.transactionId || '',
        collectedByName: booking.collectedByName || '-',
      };
    }
    downloadInvoice(invoiceData);
  };

  if (loading) {
    return (
      <div className="container mx-auto py-4">
        <div className="flex justify-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="container mx-auto py-4">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <h3 className="text-base font-medium mb-2">Booking not found</h3>
            <p className="text-muted-foreground text-sm mb-3">The booking you're looking for doesn't exist.</p>
            <Button size="sm" onClick={() => navigate(-1)}>
              <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Payment calculations ──
  const totalPrice = bookingType === 'hostel' ? (booking.total_price || 0) : (booking.totalPrice || 0);
  const securityDeposit = bookingType === 'hostel' ? (booking.security_deposit || 0) : 0;
  const seatPrice = bookingType === 'hostel' 
    ? (totalPrice - (booking.food_amount || 0)) 
    : ((booking.totalPrice || 0) + (booking.discountAmount || 0) - (booking.lockerPrice || 0));
  const foodAmount = bookingType === 'hostel' ? (booking.food_amount || 0) : 0;
  const lockerAmount = bookingType === 'hostel' ? 0 : (booking.lockerPrice || 0);
  const discountAmount = bookingType === 'hostel' ? 0 : (booking.discountAmount || 0);

  // Duration label
  const rawDurationCount = bookingType === 'hostel' 
    ? (booking.duration_count || 1)
    : (booking.durationCount || booking.duration_count || 1);
  const rawBookingDuration = bookingType === 'hostel'
    ? (booking.booking_duration || 'monthly')
    : (booking.bookingDuration || booking.booking_duration || 'monthly');
  const durationLabel = ` (${rawDurationCount} ${rawBookingDuration === 'daily' ? 'day' : rawBookingDuration === 'weekly' ? 'week' : 'month'}${Number(rawDurationCount) > 1 ? 's' : ''})`;

  const advancePaid = bookingType === 'hostel'
    ? (booking.advance_amount || 0)
    : (dueData?.advance_paid || 0);

  const dueCollected = receipts
    .filter(r => r.receipt_type === 'due_collection')
    .reduce((s, r) => s + Number(r.amount), 0);
  const totalCollected = advancePaid + dueCollected;
  const dueRemaining = Math.max(0, totalPrice - totalCollected);
  const paymentStatus = totalCollected === 0 ? 'unpaid'
    : dueRemaining <= 0 ? 'fully_paid' : 'partial_paid';

  const advancePaymentMethod = bookingType === 'hostel' ? (booking.payment_method || 'cash') : (booking.paymentMethod || 'cash');
  const advanceTransactionId = bookingType === 'hostel' ? (booking.transaction_id || '') : (booking.transactionId || '');
  const advanceCollectedByName = bookingType === 'hostel' ? (booking.collected_by_name || '-') : (booking.collectedByName || '-');

  const allRows = [
    ...(advancePaid > 0 ? [{
      id: 'advance-row',
      serial_number: getBookingId() || '-',
      amount: advancePaid,
      payment_method: advancePaymentMethod,
      receipt_type: 'booking_payment',
      transaction_id: advanceTransactionId,
      collected_by_name: advanceCollectedByName,
      notes: '',
      created_at: getCreatedAt(),
      due_id: null,
      isSynthetic: true,
    }] : []),
    ...receipts.filter(r => r.receipt_type !== 'booking_payment'),
  ];
  const grandTotal = allRows.reduce((s, r) => s + Number(r.amount), 0);

  const propertyLabel = bookingType === 'hostel' ? 'Hostel' : 'Room';
  const seatLabel = bookingType === 'hostel' ? 'Room / Bed' : 'Seat';

  return (
    <div className="container mx-auto py-3">
      {/* Header */}
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => navigate(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-lg font-bold leading-tight">Booking Details</h1>
            <p className="text-xs text-muted-foreground">
              {bookingType === 'hostel' ? 'Hostel' : 'Reading Room'} #{getBookingId()}
            </p>
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={handleDownloadInvoice}>
          <FileDown className="h-3.5 w-3.5 mr-1.5" /> Invoice
        </Button>
      </div>

      {/* Single Card */}
      <Card className="max-w-2xl">
        <CardContent className="p-4 space-y-3">

          {/* Student Details */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">Student Details</p>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <p className="text-[11px] text-muted-foreground">Name</p>
                <p className="text-sm font-medium">{getUserField('name')}</p>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground">Email</p>
                <p className="text-xs">{getUserField('email')}</p>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground">Phone</p>
                <p className="text-xs">{getUserField('phone')}</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Booking Information */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">Booking Information</p>
            <div className="grid grid-cols-3 gap-3 mb-2">
              <div>
                <p className="text-[11px] text-muted-foreground">Booking ID</p>
                <p className="text-xs font-medium">{getBookingId()}</p>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground">Status</p>
                <div>{getStatusBadge(bookingType === 'hostel' ? (booking.status || 'pending') : (booking.paymentStatus || booking.status || 'pending'))}</div>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground">Created</p>
                <p className="text-xs">{getCreatedAt() ? format(new Date(getCreatedAt()), 'dd MMM yyyy') : '-'}</p>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-3">
              <div>
                <p className="text-[11px] text-muted-foreground">Check-in</p>
                <p className="text-xs">{getStartDate() ? format(new Date(getStartDate()), 'dd MMM yyyy') : '-'}</p>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground">Check-out</p>
                <p className="text-xs">{getEndDate() ? format(new Date(getEndDate()), 'dd MMM yyyy') : '-'}</p>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground">{propertyLabel}</p>
                <p className="text-xs">{getPropertyName()}</p>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground">{seatLabel}</p>
                <p className="text-xs">{getSeatLabel()}</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Payment Summary */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 flex items-center gap-1">
              <IndianRupee className="h-3 w-3" /> Payment Summary
            </p>
            <div className="grid grid-cols-3 gap-3 mb-2">
              <div>
                <p className="text-[11px] text-muted-foreground">{bookingType === 'hostel' ? `Room Rent${durationLabel}` : `Seat Price${durationLabel}`}</p>
                <p className="text-sm font-semibold">₹{seatPrice.toLocaleString()}</p>
              </div>
              {bookingType === 'hostel' && foodAmount > 0 && (
                <div>
                  <p className="text-[11px] text-muted-foreground">Food Charges</p>
                  <p className="text-sm font-semibold">₹{foodAmount.toLocaleString()}</p>
                </div>
              )}
              {bookingType === 'hostel' ? (
                <div>
                  <p className="text-[11px] text-muted-foreground">Security Deposit</p>
                  <p className="text-sm font-semibold">₹{securityDeposit.toLocaleString()}</p>
                </div>
              ) : (
                <div>
                  <p className="text-[11px] text-muted-foreground">Locker</p>
                  <p className="text-sm font-semibold">₹{lockerAmount.toLocaleString()}</p>
                </div>
              )}
              <div>
                <p className="text-[11px] text-muted-foreground">Discount</p>
                <p className="text-sm font-semibold text-destructive">{discountAmount > 0 ? '-' : ''}₹{discountAmount.toLocaleString()}</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 mb-2">
              <div>
                <p className="text-[11px] text-muted-foreground">Total Price</p>
                <p className="text-sm font-semibold">₹{totalPrice.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground">Advance Paid</p>
                <p className="text-sm font-semibold">₹{advancePaid.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground">Due Collected</p>
                <p className="text-sm font-semibold">₹{dueCollected.toLocaleString()}</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <p className="text-[11px] text-muted-foreground">Total Collected</p>
                <p className="text-sm font-semibold text-green-600">₹{totalCollected.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground">Due Remaining</p>
                <p className={`text-sm font-semibold ${dueRemaining > 0 ? 'text-destructive' : 'text-green-600'}`}>
                  ₹{dueRemaining.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground">Status</p>
                {paymentStatus === 'fully_paid' ? (
                  <Badge className="bg-green-500 text-[10px] px-1.5 py-0 mt-0.5">Fully Paid</Badge>
                ) : paymentStatus === 'partial_paid' ? (
                  <Badge variant="outline" className="border-amber-500 text-amber-500 text-[10px] px-1.5 py-0 mt-0.5">Partial</Badge>
                ) : (
                  <Badge variant="destructive" className="text-[10px] px-1.5 py-0 mt-0.5">Unpaid</Badge>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Payment Receipts */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1">
                <Receipt className="h-3 w-3" /> Payment Receipts
              </p>
              <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2" onClick={fetchBookingDetails}>
                <RefreshCw className="h-3 w-3 mr-1" /> Refresh
              </Button>
            </div>

            {allRows.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                <CreditCard className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-xs">No receipts found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-[10px] py-1.5">Receipt ID</TableHead>
                      <TableHead className="text-[10px] py-1.5">Type</TableHead>
                      <TableHead className="text-[10px] py-1.5">Amount</TableHead>
                      <TableHead className="text-[10px] py-1.5">Method</TableHead>
                      <TableHead className="text-[10px] py-1.5">Txn ID</TableHead>
                      <TableHead className="text-[10px] py-1.5">Proof</TableHead>
                      <TableHead className="text-[10px] py-1.5">Date</TableHead>
                      <TableHead className="text-[10px] py-1.5">Collected By</TableHead>
                      <TableHead className="text-[10px] py-1.5">Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allRows.map((r: any) => (
                      <TableRow key={r.id}>
                        <TableCell className="text-[11px] py-1.5">{r.serial_number || '-'}</TableCell>
                        <TableCell className="py-1.5">
                          <Badge variant="outline" className="text-[9px] px-1 py-0">
                            {r.receipt_type === 'booking_payment' ? 'Advance'
                              : r.receipt_type === 'due_collection' ? 'Due'
                              : r.receipt_type === 'deposit_refund' ? 'Deposit Refund'
                              : 'Payment'}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-1.5">
                          <span className="text-[11px] font-medium">₹{Number(r.amount).toLocaleString()}</span>
                        </TableCell>
                        <TableCell className="text-[11px] py-1.5 capitalize">{r.payment_method}</TableCell>
                        <TableCell className="text-[11px] py-1.5">{r.transaction_id || '-'}</TableCell>
                        <TableCell className="py-1.5">
                          {r.payment_proof_url ? (
                            <a href={r.payment_proof_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                              <ImageIcon className="h-4 w-4" />
                            </a>
                          ) : '-'}
                        </TableCell>
                        <TableCell className="text-[11px] py-1.5">{r.created_at ? format(new Date(r.created_at), 'dd MMM yy, HH:mm') : '-'}</TableCell>
                        <TableCell className="text-[11px] py-1.5">{r.collected_by_name || '-'}</TableCell>
                        <TableCell className="text-[11px] py-1.5 text-muted-foreground">{r.notes || '-'}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-muted/30 font-semibold">
                      <TableCell colSpan={2} className="text-right text-[11px] py-1.5">Total Collected</TableCell>
                      <TableCell className="py-1.5">
                        <span className="text-[11px] text-green-600 font-semibold">₹{grandTotal.toLocaleString()}</span>
                      </TableCell>
                      <TableCell colSpan={6}></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

        </CardContent>
      </Card>
    </div>
  );
};

export default AdminBookingDetail;
