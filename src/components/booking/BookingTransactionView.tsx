
import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { vendorSeatsService } from '@/api/vendorSeatsService';
import { DuePaymentHistory } from '@/components/booking/DuePaymentHistory';
import { format, differenceInDays } from 'date-fns';
import { CreditCard, Calendar, RefreshCw, IndianRupee, Clock, TicketPercent, Wallet, Receipt, ImageIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { resolvePaymentMethodLabels, getMethodLabel } from '@/utils/paymentMethodLabels';

interface ReceiptRow {
  id: string;
  serial_number: string | null;
  amount: number;
  payment_method: string;
  receipt_type: string;
  collected_by_name: string;
  notes: string;
  created_at: string;
  transaction_id: string;
  payment_proof_url?: string;
}

interface BookingTransactionViewProps {
  bookingId: string;
  booking: any;
  bookingType: 'cabin' | 'hostel';
}

export const BookingTransactionView = ({ bookingId, bookingType, booking }: BookingTransactionViewProps) => {
  const [receipts, setReceipts] = useState<ReceiptRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [validityInfo, setValidityInfo] = useState<{
    currentEndDate: string;
    daysRemaining: number;
    totalMonths: number;
  } | null>(null);
  const [dueData, setDueData] = useState<any>(null);
  const [paymentLabels, setPaymentLabels] = useState<Record<string, string>>({});
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Calculate validity information
      if (booking?.endDate) {
        try {
          const endDate = new Date(booking.endDate);
          const today = new Date();
          const daysRemaining = differenceInDays(endDate, today);
          setValidityInfo({
            currentEndDate: booking.endDate,
            daysRemaining: Math.max(0, daysRemaining),
            totalMonths: booking.months || booking.durationCount || 1
          });
        } catch (e) {
          console.error('Error parsing endDate:', e);
        }
      }

      // Fetch receipts from receipts table
      const { data: rcpts } = await supabase
        .from('receipts')
        .select('*')
        .eq('booking_id', bookingId)
        .order('created_at', { ascending: false });
      const receiptData = (rcpts || []) as ReceiptRow[];
      setReceipts(receiptData);

      // Resolve custom payment method labels
      const customLabels = await resolvePaymentMethodLabels(receiptData.map(r => r.payment_method));
      setPaymentLabels(customLabels);

      // Fetch due for this booking
      const dueRes = await vendorSeatsService.getDueForBooking(bookingId);
      if (dueRes.success && dueRes.data) setDueData(dueRes.data);
    } catch (error) {
      console.error('Error fetching booking data:', error);
      toast({ title: "Error", description: "Failed to load transaction history", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed': return <Badge className="bg-green-500">Completed</Badge>;
      case 'pending': return <Badge variant="outline" className="border-amber-500 text-amber-500">Pending</Badge>;
      case 'advance_paid': return <Badge variant="outline" className="border-blue-500 text-blue-500">Advance Paid</Badge>;
      case 'failed': return <Badge variant="destructive">Failed</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const totalPaid = receipts.reduce((s, r) => s + Number(r.amount), 0);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Booking Summary */}
      {booking && (
        <div className="bg-card rounded-lg border p-3">
          <h3 className="text-[13px] font-semibold flex items-center gap-1.5 mb-2">
            <Calendar className="h-3.5 w-3.5" />
            Booking Summary
          </h3>
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="text-[11px] text-muted-foreground">Booking ID</span>
              <span className="text-[12px] font-medium">{booking.serial_number || `#${(booking.id || booking._id)?.slice(0, 8)}`}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[11px] text-muted-foreground">
                {bookingType === 'cabin' ? 'Cabin & Seat' : 'Hostel & Bed'}
              </span>
              <span className="text-[12px] font-medium text-right">
                {booking.cabinId?.name || booking.cabinName || booking.hostelId?.name || 'N/A'}
                {' · '}
                {bookingType === 'cabin'
                  ? `Seat #${booking.seatId?.number || booking.seatNumber || 'N/A'}`
                  : `Bed #${booking.bedId?.number || 'N/A'}`}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[11px] text-muted-foreground">Total Price</span>
              <span className="text-[12px] font-medium">₹{(booking.totalPrice || 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[11px] text-muted-foreground">Total Paid</span>
              <span className="text-[12px] font-medium text-green-600">₹{totalPaid.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[11px] text-muted-foreground">Payment Status</span>
              {getStatusBadge(booking.paymentStatus)}
            </div>
          </div>

          {booking?.appliedCoupon && (
            <div className="mt-2 p-2 bg-accent/50 border rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <TicketPercent className="h-3 w-3 text-primary" />
                  <span className="text-[11px] font-medium">{booking.appliedCoupon.couponCode}</span>
                </div>
                <span className="text-[11px] font-medium text-primary">-₹{booking.appliedCoupon.discountAmount}</span>
              </div>
            </div>
          )}

          {booking?.transferredHistory?.map((data: any, index: number) => (
            <div key={index} className="mt-2 p-2 bg-muted/50 border rounded-lg space-y-0.5">
              <p className="text-[11px] font-medium">Transferred From: {data.cabinId?.name || data.hostelId?.name}</p>
              <p className="text-[10px] text-muted-foreground">
                {bookingType === 'cabin' ? `Seat #${data.seatId?.number}` : `Bed #${data.bedId?.number}`}
                {' · '}{data.transferredBy?.name}
                {' · '}{format(new Date(data.transferredAt), 'dd MMM yyyy')}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Validity Information */}
      {validityInfo && (
        <div className="bg-card rounded-lg border p-3">
          <h3 className="text-[13px] font-semibold flex items-center gap-1.5 mb-2">
            <Clock className="h-3.5 w-3.5" />
            Validity
          </h3>
          <div className="flex justify-between text-[12px]">
            <div>
              <p className="text-[11px] text-muted-foreground">End Date</p>
              <p className="font-medium">{format(new Date(validityInfo.currentEndDate), 'dd MMM yyyy')}</p>
            </div>
            <div className="text-center">
              <p className="text-[11px] text-muted-foreground">Days Left</p>
              <p className={`font-medium ${
                validityInfo.daysRemaining > 30 ? 'text-green-600' :
                validityInfo.daysRemaining > 7 ? 'text-amber-600' : 'text-destructive'
              }`}>
                {validityInfo.daysRemaining}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[11px] text-muted-foreground">Duration</p>
              <p className="font-medium">{validityInfo.totalMonths} {validityInfo.totalMonths === 1 ? 'mo' : 'mos'}</p>
            </div>
          </div>
        </div>
      )}

      {/* Payment Receipts */}
      <div className="bg-card rounded-lg border p-3">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-[13px] font-semibold flex items-center gap-1.5">
            <Receipt className="h-3.5 w-3.5" />
            Payment Receipts
          </h3>
          <Button variant="ghost" size="sm" className="h-6 px-2 text-[11px]" onClick={fetchData}>
            <RefreshCw className="h-3 w-3" />
          </Button>
        </div>
        {receipts.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground">
            <CreditCard className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-[12px]">No receipts found</p>
          </div>
        ) : (
          <div className="space-y-2">
            {receipts.map((r) => (
              <div key={r.id} className="border rounded-lg p-2 space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-medium text-primary">{r.serial_number || '-'}</span>
                    {r.payment_proof_url && (
                      <a href={r.payment_proof_url} target="_blank" rel="noopener noreferrer" title="View Payment Proof">
                        <ImageIcon className="h-3.5 w-3.5 text-primary hover:text-primary/80" />
                      </a>
                    )}
                  </div>
                  <Badge variant="outline" className="text-[9px]">
                    {r.receipt_type === 'due_collection' ? 'Due Collection' : 'Booking Payment'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-medium">₹{Number(r.amount).toLocaleString()}</span>
                  <span className="text-[10px] text-muted-foreground capitalize">{getMethodLabel(r.payment_method, paymentLabels)}</span>
                </div>
                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>{format(new Date(r.created_at), 'dd MMM yyyy, HH:mm')}</span>
                  {r.collected_by_name && <span>by {r.collected_by_name}</span>}
                </div>
                {r.transaction_id && <div className="text-[10px] text-muted-foreground">ID: {r.transaction_id}</div>}
                {r.notes && <div className="text-[10px] text-muted-foreground italic">{r.notes}</div>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Payment Summary */}
      <div className="bg-card rounded-lg border p-3">
        <h3 className="text-[13px] font-semibold flex items-center gap-1.5 mb-2">
          <IndianRupee className="h-3.5 w-3.5" />
          Payment Summary
        </h3>
        <div className="space-y-1">
          {receipts.map((r, index) => (
            <div key={r.id} className="flex justify-between items-center text-[12px]">
              <span className="text-muted-foreground">
                {r.receipt_type === 'booking_payment' ? 'Initial Payment' : `Due Collection ${index}`}
              </span>
              <span className="font-medium">₹{Number(r.amount).toLocaleString()}</span>
            </div>
          ))}
          <Separator className="my-1" />
          <div className="flex justify-between items-center text-[13px] font-semibold">
            <span>Total Paid</span>
            <span>₹{totalPaid.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Due Payments Section */}
      {dueData && (
        <div className="bg-card rounded-lg border p-3">
          <DuePaymentHistory
            dueId={dueData.id}
            dueInfo={{
              totalFee: Number(dueData.total_fee),
              advancePaid: Number(dueData.advance_paid),
              paidAmount: Number(dueData.paid_amount),
              dueAmount: Number(dueData.due_amount),
              status: dueData.status,
            }}
            defaultOpen
          />
        </div>
      )}
    </div>
  );
};
