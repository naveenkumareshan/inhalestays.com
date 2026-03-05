import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, Receipt } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { resolvePaymentMethodLabels, getMethodLabel } from '@/utils/paymentMethodLabels';

interface DuePayment {
  id: string;
  amount: number;
  payment_method: string;
  transaction_id: string;
  collected_by_name: string;
  notes: string;
  created_at: string;
}

interface ReceiptInfo {
  id: string;
  serial_number: string | null;
  amount: number;
  created_at: string;
}

interface HostelDuePaymentHistoryProps {
  dueId: string;
  dueInfo?: {
    totalFee: number;
    advancePaid: number;
    paidAmount: number;
    dueAmount: number;
    status: string;
  };
  compact?: boolean;
  defaultOpen?: boolean;
}

export const HostelDuePaymentHistory: React.FC<HostelDuePaymentHistoryProps> = ({
  dueId,
  dueInfo,
  compact = false,
  defaultOpen = false,
}) => {
  const [payments, setPayments] = useState<DuePayment[]>([]);
  const [receipts, setReceipts] = useState<ReceiptInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(defaultOpen);
  const [paymentLabels, setPaymentLabels] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!dueId) return;
    const fetchData = async () => {
      setLoading(true);
      const [paymentsRes, receiptsRes] = await Promise.all([
        supabase
          .from('hostel_due_payments')
          .select('*')
          .eq('due_id', dueId)
          .order('created_at', { ascending: true }),
        supabase
          .from('hostel_receipts')
          .select('id, serial_number, amount, created_at')
          .eq('receipt_type', 'due_collection')
          .order('created_at', { ascending: true }),
      ]);
      if (paymentsRes.data) {
        const pData = paymentsRes.data as DuePayment[];
        setPayments(pData);
        const customLabels = await resolvePaymentMethodLabels(pData.map(p => p.payment_method));
        setPaymentLabels(customLabels);
      }
      if (receiptsRes.data) setReceipts(receiptsRes.data as ReceiptInfo[]);
      setLoading(false);
    };
    fetchData();
  }, [dueId]);

  if (loading) {
    return <div className="flex justify-center py-2"><div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" /></div>;
  }

  if (payments.length === 0 && !dueInfo) return null;

  const findReceiptForPayment = (payment: DuePayment): ReceiptInfo | undefined => {
    return receipts.find(r => {
      const rTime = new Date(r.created_at).getTime();
      const pTime = new Date(payment.created_at).getTime();
      return Math.abs(Number(r.amount) - Number(payment.amount)) < 0.01 && Math.abs(rTime - pTime) < 60000;
    });
  };

  const content = (
    <div className="space-y-1.5">
      {dueInfo && (
        <div className="space-y-1 text-[11px]">
          <div className="flex justify-between"><span className="text-muted-foreground">Total Fee</span><span>₹{dueInfo.totalFee.toLocaleString()}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Advance Paid</span><span>₹{dueInfo.advancePaid.toLocaleString()}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Collected</span><span className="text-emerald-600">₹{(dueInfo.paidAmount).toLocaleString()}</span></div>
          <div className="flex justify-between font-medium text-red-600"><span>Remaining</span><span>₹{Math.max(0, dueInfo.dueAmount - dueInfo.paidAmount).toLocaleString()}</span></div>
          <Separator className="my-1" />
        </div>
      )}
      {payments.length === 0 ? (
        <p className="text-[11px] text-muted-foreground text-center py-2">No payment receipts yet</p>
      ) : (
        payments.map((p) => {
          const receipt = findReceiptForPayment(p);
          return (
            <div key={p.id} className="border rounded p-2 text-[11px] space-y-0.5 bg-muted/30">
              <div className="flex items-center justify-between">
                <span className="font-medium">₹{Number(p.amount).toLocaleString()}</span>
                <span className="text-[10px] text-muted-foreground">{format(new Date(p.created_at), 'dd MMM yyyy, HH:mm')}</span>
              </div>
              {receipt?.serial_number && (
                <div className="text-[10px] font-medium text-primary">Receipt: {receipt.serial_number}</div>
              )}
              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                <span>{getMethodLabel(p.payment_method, paymentLabels)}</span>
                {p.collected_by_name && <span>by {p.collected_by_name}</span>}
              </div>
              {p.transaction_id && <div className="text-[10px] text-muted-foreground">Txn: {p.transaction_id}</div>}
              {p.notes && <div className="text-[10px] text-muted-foreground italic">{p.notes}</div>}
            </div>
          );
        })
      )}
    </div>
  );

  if (compact) {
    return (
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="w-full h-6 text-[10px] gap-1 justify-between px-2">
            <span className="flex items-center gap-1"><Receipt className="h-3 w-3" /> Payment History ({payments.length})</span>
            <ChevronDown className={cn("h-3 w-3 transition-transform", open && "rotate-180")} />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-1">
          {content}
        </CollapsibleContent>
      </Collapsible>
    );
  }

  return (
    <div className="space-y-2">
      <h3 className="text-[13px] font-semibold flex items-center gap-1.5">
        <Receipt className="h-3.5 w-3.5" />
        Payment Receipts ({payments.length})
      </h3>
      {content}
    </div>
  );
};
