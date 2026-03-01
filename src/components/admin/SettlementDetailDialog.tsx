
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { settlementService } from '@/api/settlementService';

interface Props {
  settlementId: string;
  open: boolean;
  onClose: () => void;
}

export const SettlementDetailDialog: React.FC<Props> = ({ settlementId, open, onClose }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open && settlementId) {
      setLoading(true);
      settlementService.getSettlementDetail(settlementId).then(res => {
        setData(res);
        setLoading(false);
      });
    }
  }, [open, settlementId]);

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Settlement Detail — {data?.settlement?.serial_number || settlementId.slice(0, 8)}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : data?.settlement ? (
          <div className="space-y-4">
            {/* Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div><span className="text-muted-foreground">Partner:</span> <span className="font-medium">{data.settlement.partners?.business_name}</span></div>
              <div><span className="text-muted-foreground">Period:</span> <span className="font-medium">{data.settlement.period_start} → {data.settlement.period_end}</span></div>
              <div><span className="text-muted-foreground">Status:</span> <Badge variant="outline" className="text-[10px] ml-1">{data.settlement.status}</Badge></div>
              <div><span className="text-muted-foreground">Bookings:</span> <span className="font-medium">{data.settlement.total_bookings}</span></div>
            </div>

            {/* Financial Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs border rounded-md p-3 bg-muted/30">
              <div><p className="text-muted-foreground">Total Collected</p><p className="font-bold">₹{data.settlement.total_collected?.toLocaleString()}</p></div>
              <div><p className="text-muted-foreground">Commission</p><p className="font-bold text-red-600">-₹{data.settlement.commission_amount?.toLocaleString()}</p></div>
              <div><p className="text-muted-foreground">Gateway Fees</p><p className="font-bold text-red-600">-₹{data.settlement.gateway_fees?.toLocaleString()}</p></div>
              <div><p className="text-muted-foreground">Adjustments</p><p className="font-bold text-red-600">-₹{data.settlement.adjustment_amount?.toLocaleString()}</p></div>
              {data.settlement.tds_amount > 0 && <div><p className="text-muted-foreground">TDS</p><p className="font-bold text-red-600">-₹{data.settlement.tds_amount?.toLocaleString()}</p></div>}
              {data.settlement.security_hold_amount > 0 && <div><p className="text-muted-foreground">Security Hold</p><p className="font-bold text-orange-600">-₹{data.settlement.security_hold_amount?.toLocaleString()}</p></div>}
              <div className="col-span-2 md:col-span-4 border-t pt-2 mt-2">
                <p className="text-muted-foreground">Net Payable</p>
                <p className="font-bold text-lg text-green-700">₹{data.settlement.net_payable?.toLocaleString()}</p>
              </div>
            </div>

            {/* Payment Info */}
            {data.settlement.status === 'paid' && (
              <div className="text-xs border rounded-md p-3 bg-emerald-50 space-y-1">
                <p><span className="text-muted-foreground">UTR:</span> <span className="font-mono font-medium">{data.settlement.utr_number}</span></p>
                <p><span className="text-muted-foreground">Payment Mode:</span> {data.settlement.payment_mode?.toUpperCase()}</p>
                <p><span className="text-muted-foreground">Payment Date:</span> {data.settlement.payment_date}</p>
                {data.settlement.payment_reference && <p><span className="text-muted-foreground">Ref:</span> {data.settlement.payment_reference}</p>}
              </div>
            )}

            {/* Items */}
            <div>
              <h3 className="text-sm font-semibold mb-2">Receipt Items ({data.items.length})</h3>
              <div className="border rounded-md overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="text-[10px]">
                      <TableHead className="px-2 py-1">S.No.</TableHead>
                      <TableHead className="px-2 py-1">Receipt ID</TableHead>
                      <TableHead className="px-2 py-1">Type</TableHead>
                      <TableHead className="px-2 py-1">Module</TableHead>
                      <TableHead className="px-2 py-1">Student</TableHead>
                      <TableHead className="px-2 py-1">Property</TableHead>
                      <TableHead className="px-2 py-1">Payment Date</TableHead>
                      <TableHead className="px-2 py-1 text-right">Amount</TableHead>
                      <TableHead className="px-2 py-1 text-right">Commission</TableHead>
                      <TableHead className="px-2 py-1 text-right">Gateway</TableHead>
                      <TableHead className="px-2 py-1 text-right">Net</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.items.map((item: any, idx: number) => (
                      <TableRow key={item.id} className="text-[10px]">
                        <TableCell className="px-2 py-1">{idx + 1}</TableCell>
                        <TableCell className="px-2 py-1 font-mono text-[9px]">{item.receipt_serial || '-'}</TableCell>
                        <TableCell className="px-2 py-1"><Badge variant="outline" className="text-[9px]">{item.receipt_type || '-'}</Badge></TableCell>
                        <TableCell className="px-2 py-1"><Badge variant="outline" className="text-[9px]">{item.booking_type === 'hostel' ? 'Hostel' : 'RR'}</Badge></TableCell>
                        <TableCell className="px-2 py-1">{item.student_name}</TableCell>
                        <TableCell className="px-2 py-1">{item.property_name}</TableCell>
                        <TableCell className="px-2 py-1 whitespace-nowrap">{item.payment_date ? new Date(item.payment_date).toLocaleDateString() : '-'}</TableCell>
                        <TableCell className="px-2 py-1 text-right">₹{item.total_amount?.toLocaleString()}</TableCell>
                        <TableCell className="px-2 py-1 text-right text-red-600">-₹{item.commission_amount?.toLocaleString()}</TableCell>
                        <TableCell className="px-2 py-1 text-right text-red-600">-₹{item.gateway_fee?.toLocaleString()}</TableCell>
                        <TableCell className="px-2 py-1 text-right font-medium">₹{item.net_amount?.toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Adjustments */}
            {data.adjustments.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-2">Adjustments ({data.adjustments.length})</h3>
                <div className="border rounded-md overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="text-[10px]">
                        <TableHead className="px-2 py-1">Type</TableHead>
                        <TableHead className="px-2 py-1 text-right">Amount</TableHead>
                        <TableHead className="px-2 py-1">Description</TableHead>
                        <TableHead className="px-2 py-1">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.adjustments.map((adj: any) => (
                        <TableRow key={adj.id} className="text-[10px]">
                          <TableCell className="px-2 py-1">{adj.type}</TableCell>
                          <TableCell className="px-2 py-1 text-right">₹{adj.amount?.toLocaleString()}</TableCell>
                          <TableCell className="px-2 py-1">{adj.description}</TableCell>
                          <TableCell className="px-2 py-1"><Badge variant="outline" className="text-[9px]">{adj.status}</Badge></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Settlement not found</p>
        )}
      </DialogContent>
    </Dialog>
  );
};
