
import React, { useState } from 'react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { Banknote, Smartphone, Building2, CreditCard, Receipt } from 'lucide-react';
import { PaymentMethodSelector, requiresTransactionId, isNonCashMethod } from '@/components/vendor/PaymentMethodSelector';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { vendorSeatsService } from '@/api/vendorSeatsService';
import { DuePaymentHistory } from '@/components/booking/DuePaymentHistory';
import { HostelDuePaymentHistory } from '@/components/booking/HostelDuePaymentHistory';
import { PaymentProofUpload } from '@/components/payment/PaymentProofUpload';

type Module = 'reading_room' | 'hostel';

interface CollectDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  due: any;
  module: Module;
  onSuccess: () => void;
  partnerId?: string;
}

export const CollectDrawer: React.FC<CollectDrawerProps> = ({ open, onOpenChange, due, module, onSuccess, partnerId }) => {
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('cash');
  const [txnId, setTxnId] = useState('');
  const [notes, setNotes] = useState('');
  const [proofUrl, setProofUrl] = useState('');
  const [collecting, setCollecting] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  React.useEffect(() => {
    if (due && open) {
      const remaining = Math.max(0, Number(due.due_amount) - Number(due.paid_amount));
      setAmount(String(remaining));
      setMethod('cash');
      setTxnId('');
      setNotes('');
      setProofUrl('');
    }
  }, [due, open]);

  const handleCollect = async () => {
    if (!due || !amount) return;
    const amt = parseFloat(amount);
    if (amt <= 0) { toast({ title: 'Enter a valid amount', variant: 'destructive' }); return; }

    // Duplicate transaction ID check for non-cash methods
    if (method !== 'cash' && txnId && txnId.trim()) {
      const { data: isDuplicate } = await supabase.rpc('check_duplicate_transaction_id', { p_txn_id: txnId.trim() });
      if (isDuplicate) {
        toast({ title: 'Duplicate Transaction ID', description: 'This Transaction ID has already been used. Please enter a unique Transaction ID.', variant: 'destructive' });
        return;
      }
    }

    setCollecting(true);

    if (module === 'reading_room') {
      const res = await vendorSeatsService.collectDuePayment(due.id, amt, method, txnId, notes, proofUrl);
      if (res.success) {
        toast({ title: 'Payment collected successfully' });
        onOpenChange(false);
        onSuccess();
      } else {
        toast({ title: 'Error', description: res.error, variant: 'destructive' });
      }
    } else {
      const collectedByName = user?.name || user?.email || 'Admin';
      const currentPaid = Number(due.paid_amount);
      const newPaid = currentPaid + amt;
      const dueAmount = Number(due.due_amount);
      const newStatus = newPaid >= dueAmount ? 'paid' : 'partially_paid';

      const { error: paymentError } = await supabase.from('hostel_due_payments').insert({
        due_id: due.id,
        amount: amt,
        payment_method: method,
        transaction_id: txnId,
        collected_by: user?.id,
        collected_by_name: collectedByName,
        notes,
        payment_proof_url: proofUrl || null,
      });

      if (paymentError) {
        toast({ title: 'Error', description: paymentError.message, variant: 'destructive' });
        setCollecting(false);
        return;
      }

      await supabase.from('hostel_dues').update({
        paid_amount: newPaid,
        status: newStatus,
      }).eq('id', due.id);

      await supabase.from('hostel_receipts').insert({
        hostel_id: due.hostel_id,
        booking_id: due.booking_id,
        user_id: due.user_id,
        amount: amt,
        payment_method: method,
        transaction_id: txnId,
        receipt_type: 'due_collection',
        collected_by: user?.id,
        collected_by_name: collectedByName,
        notes,
        payment_proof_url: proofUrl || null,
      });

      if (newStatus === 'paid' && due.booking_id) {
        await supabase.from('hostel_bookings').update({
          payment_status: 'completed',
          remaining_amount: 0,
        }).eq('id', due.booking_id);
      }

      toast({ title: 'Payment collected successfully' });
      onOpenChange(false);
      onSuccess();
    }
    setCollecting(false);
  };

  if (!due) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[380px] sm:w-[420px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-sm">Collect Due Payment</SheetTitle>
        </SheetHeader>
        <div className="space-y-4 mt-4">
          <div className="bg-muted/50 rounded p-3 space-y-1 text-[11px]">
            <div className="font-semibold text-sm">{due.profiles?.name || 'N/A'}</div>
            <div className="text-muted-foreground">{due.profiles?.phone}</div>
            <Separator className="my-2" />
            <div className="flex justify-between"><span>Total Fee</span><span className="font-medium">₹{Number(due.total_fee).toLocaleString()}</span></div>
            <div className="flex justify-between"><span>Advance Paid</span><span>₹{Number(due.advance_paid).toLocaleString()}</span></div>
            <div className="flex justify-between"><span>Collected So Far</span><span className="text-emerald-600">₹{Number(due.paid_amount).toLocaleString()}</span></div>
            <div className="flex justify-between font-semibold text-red-600"><span>Remaining Due</span><span>₹{Math.max(0, Number(due.due_amount) - Number(due.paid_amount)).toLocaleString()}</span></div>
          </div>

          <div>
            <Label className="text-xs">Amount to Collect (₹)</Label>
            <Input type="number" className="h-8 text-xs" value={amount} onChange={e => setAmount(e.target.value)} />
          </div>

          <div>
            <Label className="text-xs">Payment Method</Label>
            <PaymentMethodSelector
              value={method}
              onValueChange={setMethod}
              partnerId={partnerId}
              idPrefix="ci"
              columns={2}
            />
          </div>

          {requiresTransactionId(method) && (
            <div>
              <Label className="text-xs">Transaction ID</Label>
              <Input className="h-8 text-xs" value={txnId} onChange={e => setTxnId(e.target.value)} />
            </div>
          )}

          {method !== 'cash' && (
            <PaymentProofUpload value={proofUrl} onChange={setProofUrl} />
          )}

          <div>
            <Label className="text-xs">Notes (optional)</Label>
            <Textarea className="text-xs h-16" value={notes} onChange={e => setNotes(e.target.value)} />
          </div>

          <Button className="w-full h-9 text-xs" onClick={handleCollect} disabled={collecting || !amount}>
            {collecting ? 'Processing...' : `Confirm Collection · ₹${amount}`}
          </Button>

          <Separator className="my-3" />
          {module === 'reading_room' ? (
            <DuePaymentHistory dueId={due.id} defaultOpen />
          ) : (
            <HostelDuePaymentHistory dueId={due.id} defaultOpen />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

interface ReceiptsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: any;
  module: Module;
}

export const ReceiptsDialog: React.FC<ReceiptsDialogProps> = ({ open, onOpenChange, booking, module }) => {
  const [receipts, setReceipts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    if (!booking || !open) return;
    const fetchReceipts = async () => {
      setLoading(true);
      const table = module === 'reading_room' ? 'receipts' : 'hostel_receipts';
      const { data } = await supabase
        .from(table)
        .select('*')
        .eq('booking_id', booking.id)
        .order('created_at', { ascending: false });
      setReceipts(data || []);
      setLoading(false);
    };
    fetchReceipts();
  }, [booking, open, module]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-sm">Booking Receipts</DialogTitle>
        </DialogHeader>
        {booking && (
          <div className="text-[11px] text-muted-foreground mb-2">
            {booking.profiles?.name} · {booking.serial_number || 'N/A'}
          </div>
        )}
        {loading ? (
          <div className="flex justify-center py-8"><div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full" /></div>
        ) : receipts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-xs">No receipts found</div>
        ) : (
          <div className="space-y-2">
            {receipts.map((r, i) => (
              <div key={r.id} className="border rounded p-3 space-y-1 text-[11px]">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-xs">{r.serial_number || `#${i + 1}`}</span>
                  <Badge variant="outline" className="text-[9px] h-5">
                    {r.receipt_type === 'booking_payment' ? 'Booking' : 'Due Collection'}
                  </Badge>
                </div>
                <Separator className="my-1" />
                <div className="grid grid-cols-2 gap-1">
                  <div><span className="text-muted-foreground">Amount:</span> <span className="font-medium">₹{Number(r.amount).toLocaleString()}</span></div>
                  <div><span className="text-muted-foreground">Method:</span> {r.payment_method}</div>
                  <div><span className="text-muted-foreground">Date:</span> {format(new Date(r.created_at), 'dd MMM yy, hh:mm a')}</div>
                  <div><span className="text-muted-foreground">By:</span> {r.collected_by_name || '-'}</div>
                  {r.transaction_id && <div className="col-span-2"><span className="text-muted-foreground">Txn ID:</span> {r.transaction_id}</div>}
                  {r.notes && <div className="col-span-2"><span className="text-muted-foreground">Notes:</span> {r.notes}</div>}
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

// Helper to format currency inline
export const fmtAmt = (v: number) => `₹${v.toLocaleString()}`;
