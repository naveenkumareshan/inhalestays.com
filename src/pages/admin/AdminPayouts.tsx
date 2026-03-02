
import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { settlementService, SettlementFilters, PaymentData } from '@/api/settlementService';
import { SettlementDetailDialog } from '@/components/admin/SettlementDetailDialog';
import { Loader2, Eye, CreditCard, Wallet, Clock, CheckCircle, IndianRupee } from 'lucide-react';
import { format } from 'date-fns';

const AdminPayouts: React.FC = () => {
  const [settlements, setSettlements] = useState<any[]>([]);
  const [partners, setPartners] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<SettlementFilters>({ status: 'all' });
  const [selectedSettlement, setSelectedSettlement] = useState<string | null>(null);
  const [showPayDialog, setShowPayDialog] = useState(false);
  const [paySettlementId, setPaySettlementId] = useState<string | null>(null);
  const [payForm, setPayForm] = useState<PaymentData>({ utr_number: '', payment_reference: '', payment_mode: 'neft', payment_date: format(new Date(), 'yyyy-MM-dd'), notes: '' });
  const [paying, setPaying] = useState(false);
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [settRes, partnerRes, statsRes] = await Promise.all([
      settlementService.getSettlements(filters),
      settlementService.getAllPartners(),
      settlementService.getDashboardStats(),
    ]);
    setSettlements(settRes.data || []);
    setPartners(partnerRes.data || []);
    setStats(statsRes);
    setLoading(false);
  }, [filters]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleMarkPaid = async () => {
    if (!paySettlementId || !payForm.utr_number) {
      toast({ title: 'Error', description: 'UTR number is required', variant: 'destructive' });
      return;
    }
    setPaying(true);
    const { error } = await settlementService.markSettlementPaid(paySettlementId, payForm);
    if (error) toast({ title: 'Error', description: 'Failed to mark paid', variant: 'destructive' });
    else {
      toast({ title: 'Success', description: 'Payout marked as paid' });
      setShowPayDialog(false);
      setPaySettlementId(null);
      setPayForm({ utr_number: '', payment_reference: '', payment_mode: 'neft', payment_date: format(new Date(), 'yyyy-MM-dd'), notes: '' });
      fetchData();
    }
    setPaying(false);
  };

  const getStatusBadge = (status: string) => {
    const colorMap: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-700',
      generated: 'bg-blue-100 text-blue-700',
      approved: 'bg-green-100 text-green-700',
      locked: 'bg-orange-100 text-orange-700',
      paid: 'bg-emerald-100 text-emerald-800',
      disputed: 'bg-red-100 text-red-700',
    };
    return <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${colorMap[status] || 'bg-gray-100 text-gray-700'}`}>{status.toUpperCase()}</span>;
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Payout Management</h1>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <Wallet className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-[10px] text-muted-foreground">Total Paid</p>
                <p className="text-sm font-bold">₹{stats.totalPaid?.toLocaleString() || 0}</p>
              </div>
            </div>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-[10px] text-muted-foreground">Pending Payable</p>
                <p className="text-sm font-bold">₹{stats.pendingAmount?.toLocaleString() || 0}</p>
              </div>
            </div>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-[10px] text-muted-foreground">Paid Settlements</p>
                <p className="text-sm font-bold">{stats.paidSettlements || 0}</p>
              </div>
            </div>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <IndianRupee className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-[10px] text-muted-foreground">Pending Count</p>
                <p className="text-sm font-bold">{stats.pendingSettlements || 0}</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-end">
        <div>
          <Label className="text-[10px]">Status</Label>
          <Select value={filters.status || 'all'} onValueChange={v => setFilters(f => ({ ...f, status: v }))}>
            <SelectTrigger className="h-8 text-xs w-[120px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="generated">Generated</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="locked">Locked</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="disputed">Disputed</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-[10px]">Partner</Label>
          <Select value={filters.partner_id || 'all'} onValueChange={v => setFilters(f => ({ ...f, partner_id: v === 'all' ? undefined : v }))}>
            <SelectTrigger className="h-8 text-xs w-[160px]"><SelectValue placeholder="All Partners" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Partners</SelectItem>
              {partners.map(p => <SelectItem key={p.id} value={p.id}>{p.business_name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-[10px]">From</Label>
          <Input type="date" className="h-8 text-xs w-[130px]" value={filters.period_start || ''} onChange={e => setFilters(f => ({ ...f, period_start: e.target.value }))} />
        </div>
        <div>
          <Label className="text-[10px]">To</Label>
          <Input type="date" className="h-8 text-xs w-[130px]" value={filters.period_end || ''} onChange={e => setFilters(f => ({ ...f, period_end: e.target.value }))} />
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-md overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="text-[11px]">
              <TableHead className="px-2 py-1.5">S.No.</TableHead>
              <TableHead className="px-2 py-1.5">Settlement ID</TableHead>
              <TableHead className="px-2 py-1.5">Partner</TableHead>
              <TableHead className="px-2 py-1.5">Period</TableHead>
              <TableHead className="px-2 py-1.5 text-right">Collected</TableHead>
              <TableHead className="px-2 py-1.5 text-right">Commission</TableHead>
              <TableHead className="px-2 py-1.5 text-right">Net Payable</TableHead>
              <TableHead className="px-2 py-1.5">Status</TableHead>
              <TableHead className="px-2 py-1.5">Paid Date</TableHead>
              <TableHead className="px-2 py-1.5">UTR</TableHead>
              <TableHead className="px-2 py-1.5">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {settlements.length === 0 ? (
              <TableRow><TableCell colSpan={11} className="text-center py-8 text-muted-foreground text-xs">No payouts found</TableCell></TableRow>
            ) : settlements.map((s, idx) => (
              <TableRow key={s.id} className="text-[11px]">
                <TableCell className="px-2 py-1.5">{idx + 1}</TableCell>
                <TableCell className="px-2 py-1.5 font-mono text-[10px]">{s.serial_number || s.id.slice(0, 8)}</TableCell>
                <TableCell className="px-2 py-1.5">{s.partners?.business_name || '-'}</TableCell>
                <TableCell className="px-2 py-1.5 whitespace-nowrap">{s.period_start} → {s.period_end}</TableCell>
                <TableCell className="px-2 py-1.5 text-right">₹{s.total_collected?.toLocaleString()}</TableCell>
                <TableCell className="px-2 py-1.5 text-right">₹{s.commission_amount?.toLocaleString()}</TableCell>
                <TableCell className="px-2 py-1.5 text-right font-medium">₹{s.net_payable?.toLocaleString()}</TableCell>
                <TableCell className="px-2 py-1.5">{getStatusBadge(s.status)}</TableCell>
                <TableCell className="px-2 py-1.5 whitespace-nowrap">{s.payment_date || '-'}</TableCell>
                <TableCell className="px-2 py-1.5 font-mono text-[10px]">{s.utr_number || '-'}</TableCell>
                <TableCell className="px-2 py-1.5">
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" className="h-6 px-1.5 text-[10px]" onClick={() => setSelectedSettlement(s.id)}><Eye className="h-3 w-3" /></Button>
                    {(s.status === 'approved' || s.status === 'locked') && (
                      <Button variant="ghost" size="sm" className="h-6 px-1.5 text-[10px] text-emerald-600" onClick={() => { setPaySettlementId(s.id); setShowPayDialog(true); }}><CreditCard className="h-3 w-3" /></Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pay Dialog */}
      <Dialog open={showPayDialog} onOpenChange={setShowPayDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Mark Payout as Paid</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>UTR Number *</Label><Input value={payForm.utr_number} onChange={e => setPayForm(f => ({ ...f, utr_number: e.target.value }))} /></div>
            <div><Label>Payment Reference</Label><Input value={payForm.payment_reference} onChange={e => setPayForm(f => ({ ...f, payment_reference: e.target.value }))} /></div>
            <div>
              <Label>Payment Mode</Label>
              <Select value={payForm.payment_mode} onValueChange={v => setPayForm(f => ({ ...f, payment_mode: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="neft">NEFT</SelectItem>
                  <SelectItem value="imps">IMPS</SelectItem>
                  <SelectItem value="upi">UPI</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Payment Date</Label><Input type="date" value={payForm.payment_date} onChange={e => setPayForm(f => ({ ...f, payment_date: e.target.value }))} /></div>
            <div><Label>Notes</Label><Textarea value={payForm.notes} onChange={e => setPayForm(f => ({ ...f, notes: e.target.value }))} /></div>
            <Button className="w-full" onClick={handleMarkPaid} disabled={paying}>{paying ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Confirm Payment</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      {selectedSettlement && (
        <SettlementDetailDialog settlementId={selectedSettlement} open={!!selectedSettlement} onClose={() => setSelectedSettlement(null)} />
      )}
    </div>
  );
};

export default AdminPayouts;
