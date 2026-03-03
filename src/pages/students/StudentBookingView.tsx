import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { format, differenceInDays } from "date-fns";
import {
  ArrowLeft,
  MapPin,
  CreditCard,
  Loader2,
  ChevronDown,
  ChevronUp,
  Receipt,
  Clock,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { razorpayService } from "@/api/razorpayService";
import { getTimingDisplay, getClosedDaysDisplay, formatTime } from "@/utils/timingUtils";

interface ReceiptItem {
  id: string;
  amount: number;
  payment_method: string;
  created_at: string;
  serial_number: string | null;
  receipt_type: string;
  notes: string;
  transaction_id: string;
}

interface DueRecord {
  id: string;
  due_amount: number;
  paid_amount: number;
  status: string;
}

const safeFmt = (dateStr: string | null, fmt: string) => {
  if (!dateStr) return "N/A";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "N/A";
    return format(d, fmt);
  } catch {
    return "N/A";
  }
};

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

function CollapsibleSection({
  title,
  icon: Icon,
  defaultOpen = true,
  children,
}: {
  title: string;
  icon: React.ElementType;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="bg-card rounded-2xl border shadow-sm overflow-hidden">
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center justify-between p-3.5 text-left">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                <Icon className="h-3.5 w-3.5 text-primary" />
              </div>
              <span className="text-[13px] font-semibold text-foreground">{title}</span>
            </div>
            {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-3.5 pb-3.5 pt-0">{children}</div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between items-center py-1.5 border-b border-border/50 last:border-0">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <span className="text-[12px] font-medium text-foreground text-right">{value}</span>
    </div>
  );
}

export default function StudentBookingView() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [booking, setBooking] = useState<any>(null);
  const [receipts, setReceipts] = useState<ReceiptItem[]>([]);
  const [dueRecord, setDueRecord] = useState<DueRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [paymentProcessing, setPaymentProcessing] = useState(false);

  const fetchData = async () => {
    if (!bookingId) return;
    try {
      setLoading(true);
      const [bookingRes, receiptsRes, duesRes] = await Promise.all([
        supabase
          .from("bookings")
          .select("*, cabins(name, opening_time, closing_time, working_days, is_24_hours, slots_enabled), seats:seat_id(price, number, category), cabin_slots:slot_id(name, start_time, end_time, price)")
          .eq("id", bookingId)
          .single(),
        supabase
          .from("receipts")
          .select("*")
          .eq("booking_id", bookingId)
          .order("created_at", { ascending: false }),
        supabase
          .from("dues")
          .select("id, due_amount, paid_amount, status")
          .eq("booking_id", bookingId)
          .in("status", ["pending", "partial"])
          .maybeSingle(),
      ]);

      if (bookingRes.error || !bookingRes.data) throw new Error("Not found");
      setBooking(bookingRes.data);
      setReceipts((receiptsRes.data as ReceiptItem[]) || []);
      setDueRecord(duesRes.data as DueRecord | null);
    } catch {
      toast({ title: "Error", description: "Failed to load booking", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [bookingId]);

  const handlePayDue = async () => {
    if (!booking || dueRemaining <= 0) return;

    try {
      setPaymentProcessing(true);

      const isScriptLoaded = await loadRazorpayScript();
      if (!isScriptLoaded) {
        toast({ title: "Error", description: "Unable to load payment SDK", variant: "destructive" });
        setPaymentProcessing(false);
        return;
      }

      // Create Razorpay order
      const orderRes = await razorpayService.createOrder({
        amount: dueRemaining,
        currency: "INR",
        bookingId: booking.id,
        bookingType: "cabin",
        notes: { paymentFor: "due_payment", dueId: dueRecord?.id },
      });

      if (!orderRes.success || !orderRes.data) {
        throw new Error(orderRes.error?.message || "Failed to create order");
      }

      const order = orderRes.data;

      // Test mode handling
      if (order.testMode) {
        await processPaymentSuccess({
          razorpay_payment_id: `test_pay_${Date.now()}`,
          razorpay_order_id: order.id,
          razorpay_signature: "test_signature",
          testMode: true,
        });
        return;
      }

      const options = {
        key: order.KEY_ID,
        amount: order.amount,
        currency: order.currency,
        name: "Due Payment",
        description: `Pay due for booking ${booking.serial_number || booking.id.slice(0, 8)}`,
        order_id: order.id,
        handler: async (response: any) => {
          await processPaymentSuccess(response);
        },
        modal: {
          ondismiss: () => {
            toast({ title: "Payment Cancelled", variant: "destructive" });
            setPaymentProcessing(false);
          },
        },
        theme: { color: "#3B82F6" },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (error: any) {
      console.error("Due payment error:", error);
      toast({ title: "Payment Failed", description: error.message, variant: "destructive" });
      setPaymentProcessing(false);
    }
  };

  const processPaymentSuccess = async (paymentResponse: any) => {
    try {
      // Verify payment (skip in test mode)
      if (!paymentResponse.testMode) {
        const verifyRes = await razorpayService.verifyPayment({
          razorpay_payment_id: paymentResponse.razorpay_payment_id,
          razorpay_order_id: paymentResponse.razorpay_order_id,
          razorpay_signature: paymentResponse.razorpay_signature,
          bookingId: booking.id,
          bookingType: "cabin",
        });
        if (!verifyRes.success) throw new Error("Payment verification failed");
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Insert receipt
      await supabase.from("receipts").insert({
        booking_id: booking.id,
        user_id: user.id,
        cabin_id: booking.cabin_id,
        seat_id: booking.seat_id,
        due_id: dueRecord?.id || null,
        amount: dueRemaining,
        payment_method: "online",
        receipt_type: "due_payment",
        transaction_id: paymentResponse.razorpay_payment_id || "",
        collected_by: user.id,
        collected_by_name: "Online Payment",
        notes: "Due payment by student",
      });

      // Update dues record if exists
      if (dueRecord) {
        const newPaid = Number(dueRecord.paid_amount) + dueRemaining;
        const newDueAmount = Math.max(0, Number(dueRecord.due_amount) - dueRemaining);
        await supabase
          .from("dues")
          .update({
            paid_amount: newPaid,
            due_amount: newDueAmount,
            status: newDueAmount <= 0 ? "paid" : "partial",
          })
          .eq("id", dueRecord.id);
      }

      toast({ title: "Payment Successful", description: `₹${dueRemaining.toFixed(2)} paid successfully` });

      // Refresh data
      await fetchData();
    } catch (error: any) {
      console.error("Payment processing error:", error);
      toast({ title: "Error", description: error.message || "Failed to process payment", variant: "destructive" });
    } finally {
      setPaymentProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-60">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="px-4 py-8 text-center">
        <p className="text-muted-foreground text-[13px] mb-3">Booking not found.</p>
        <button onClick={() => navigate("/student/bookings")} className="text-primary text-[13px] underline">
          ← Back to Bookings
        </button>
      </div>
    );
  }

  // Derived values
  const cabinName = booking.cabins?.name || "Reading Room";
  const seatNumber = booking.seats?.number || booking.seat_number || 0;
  const seatPrice = booking.seats?.price ?? (booking.total_price - (booking.locker_included ? booking.locker_price : 0));
  const totalPrice = booking.total_price || 0;
  const lockerIncluded = booking.locker_included || false;
  const lockerPrice = booking.locker_price || 0;
  const discountAmount = booking.discount_amount || 0;

  const totalPaid = receipts.reduce((s, r) => s + Number(r.amount), 0);
  const dueRemaining = Math.max(0, totalPrice - totalPaid);

  const endDate = booking.end_date ? new Date(booking.end_date) : null;
  const daysLeft = endDate ? differenceInDays(endDate, new Date()) : 0;

  const paymentStatus = (() => {
    // If booking was never paid (still pending/failed/cancelled), don't show Overdue
    if (booking.payment_status === 'pending' && receipts.length === 0) return "Payment Pending";
    if (booking.payment_status === 'cancelled') return "Cancelled";
    if (booking.payment_status === 'failed') return "Failed";
    if (dueRemaining === 0) return "Completed";
    if (daysLeft <= 0) return "Overdue";
    return "Partial";
  })();

  const paymentBadgeVariant =
    paymentStatus === "Completed" ? "success" 
    : (paymentStatus === "Overdue" || paymentStatus === "Cancelled" || paymentStatus === "Failed") ? "destructive" 
    : "outline";

  const durationLabel =
    booking.booking_duration === "daily"
      ? `${booking.duration_count || 1} day(s)`
      : booking.booking_duration === "weekly"
      ? `${booking.duration_count || 1} week(s)`
      : `${booking.duration_count || 1} month(s)`;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary to-primary/80 text-white px-4 pt-3 pb-5">
        <div className="max-w-lg mx-auto">
          <button
            onClick={() => navigate("/student/bookings")}
            className="flex items-center gap-1 text-white/80 text-[12px] mb-2"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-[16px] font-bold">Booking Details</h1>
              {booking.serial_number && (
                <p className="text-[11px] text-white/70 mt-0.5">{booking.serial_number}</p>
              )}
            </div>
            <Badge variant={paymentBadgeVariant} className="text-[10px] capitalize">
              {paymentStatus}
            </Badge>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-lg mx-auto px-3 -mt-2 pb-6 space-y-3">
        {/* Booking Info */}
        <CollapsibleSection title="Booking Info" icon={MapPin}>
          <InfoRow label="Reading Room" value={cabinName} />
          <InfoRow label="Seat Number" value={`#${seatNumber}`} />
          <InfoRow label="Booking ID" value={booking.serial_number || `#${booking.id?.slice(0, 8)}`} />
          <InfoRow label="Check-in" value={safeFmt(booking.start_date, "dd MMM yyyy")} />
          <InfoRow label="Check-out" value={safeFmt(booking.end_date, "dd MMM yyyy")} />
          <InfoRow label="Duration" value={durationLabel} />
          {booking.cabin_slots ? (
            <InfoRow
              label="Time Slot"
              value={
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {booking.cabin_slots.name} ({formatTime(booking.cabin_slots.start_time)} – {formatTime(booking.cabin_slots.end_time)})
                </span>
              }
            />
          ) : booking.cabins?.slots_enabled ? (
            <InfoRow label="Booking Type" value="Full Day" />
          ) : null}
          {booking.customer_name && <InfoRow label="Booked By" value={booking.customer_name} />}
          <InfoRow label="Booked On" value={safeFmt(booking.created_at, "dd MMM yyyy")} />
          {booking.cabins?.opening_time && booking.cabins?.closing_time && (
            <InfoRow
              label="Timings"
              value={
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {getTimingDisplay(booking.cabins.opening_time, booking.cabins.closing_time)}
                </span>
              }
            />
          )}
          {booking.cabins?.working_days && getClosedDaysDisplay(booking.cabins.working_days) && (
            <InfoRow label="Closed Days" value={<span className="text-destructive text-[11px]">{getClosedDaysDisplay(booking.cabins.working_days)}</span>} />
          )}
        </CollapsibleSection>

        {/* Payment Summary */}
        <CollapsibleSection title="Payment Summary" icon={CreditCard}>
          <InfoRow label="Seat Price" value={`₹${Number(seatPrice).toFixed(2)}`} />
          {lockerIncluded && <InfoRow label="Locker" value={`₹${Number(lockerPrice).toFixed(2)}`} />}
          {discountAmount > 0 && (
            <InfoRow label="Discount" value={<span className="text-green-600">-₹{Number(discountAmount).toFixed(2)}</span>} />
          )}
          <InfoRow label="Total Price" value={<span className="font-bold">₹{Number(totalPrice).toFixed(2)}</span>} />
          <InfoRow label="Total Paid" value={<span className="text-green-600">₹{totalPaid.toFixed(2)}</span>} />
          <InfoRow
            label="Due Remaining"
            value={
              <span className={dueRemaining > 0 ? "text-destructive font-bold" : "text-green-600"}>
                ₹{dueRemaining.toFixed(2)}
              </span>
            }
          />
          <InfoRow
            label="Payment Status"
            value={
              <Badge variant={paymentBadgeVariant} className="text-[10px]">
                {paymentStatus}
              </Badge>
            }
          />
          {dueRemaining > 0 && (
            <div className="mt-3">
              <Button
                size="sm"
                className="w-full text-[12px]"
                onClick={handlePayDue}
                disabled={paymentProcessing}
              >
                {paymentProcessing ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                    Processing...
                  </>
                ) : (
                  `Pay Due ₹${dueRemaining.toFixed(2)}`
                )}
              </Button>
            </div>
          )}
        </CollapsibleSection>

        {/* Payment Receipts */}
        <CollapsibleSection title={`Payment Receipts (${receipts.length})`} icon={Receipt} defaultOpen={false}>
          {receipts.length === 0 ? (
            <p className="text-[11px] text-muted-foreground py-2">No receipts found.</p>
          ) : (
            <div className="space-y-2">
              {receipts.map((r) => (
                <div key={r.id} className="border rounded-xl p-2.5 bg-muted/30">
                  <div className="flex justify-between items-center">
                    <span className="text-[12px] font-semibold text-foreground">₹{Number(r.amount).toFixed(2)}</span>
                    <span className="text-[10px] text-muted-foreground">{safeFmt(r.created_at, "dd MMM yyyy")}</span>
                  </div>
                  <div className="flex gap-2 mt-1">
                    <span className="text-[10px] text-muted-foreground capitalize">{r.payment_method}</span>
                    {r.serial_number && (
                      <span className="text-[10px] text-muted-foreground">• {r.serial_number}</span>
                    )}
                  </div>
                  {r.notes && <p className="text-[10px] text-muted-foreground mt-1">{r.notes}</p>}
                </div>
              ))}
            </div>
          )}
        </CollapsibleSection>
      </div>
    </div>
  );
}
