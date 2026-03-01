
import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { settlementService, SettlementFilters, PaymentData } from '@/api/settlementService';
import { SettlementDetailDialog } from '@/components/admin/SettlementDetailDialog';
import { PartnerPayoutSettingsDialog } from '@/components/admin/PartnerPayoutSettingsDialog';
import { AdjustmentManager } from '@/components/admin/AdjustmentManager';
import { PartnerLedgerView } from '@/components/admin/PartnerLedgerView';
import { Loader2, Eye, CheckCircle, Lock, CreditCard, Plus, Settings, BookOpen, Wallet, Clock, IndianRupee } from 'lucide-react';
import { format } from 'date-fns';

const PartnerSettlements: React.FC = () => {
  const [settlements, setSettlements] = useState<any[]>([]);
  const [partners, setPartners] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<SettlementFilters>({ status: 'all' });
  const [selectedSettlement, setSelectedSettlement] = useState<string | null>(null);
  const [showGenerate, setShowGenerate] = useState(false);
  const [showPayDialog, setShowPayDialog] = useState(false);
  const [paySettlementId, setPaySettlementId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState<string | null>(null);
  const [showAdjustments, setShowAdjustments] = useState<string | null>(null);
  const [showLedger, setShowLedger] = useState<string | null>(null);
  const [generateForm, setGenerateForm] = useState({ partner_id: '', period_start: '', period_end: '' });
  const [payForm, setPayForm] = useState<PaymentData>({ utr_number: '', payment_reference: '', payment_mode: 'neft', payment_date: format(new Date(), 'yyyy-MM-dd'), notes: '' });
  const [generating, setGenerating] = useState(false);
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

  const handleGenerate = async () => {
    if (!generateForm.partner_id || !generateForm.period_start || !generateForm.period_end) {
      toast({ title: 'Error', description: 'Please fill all fields', variant: 'destructive' });
      return;
    }
    setGenerating(true);
    const result = await settlementService.generateSettlement(generateForm.partner_id, generateForm.period_start, generateForm.period_end);
    if (result.error) {
      toast({ title: 'Error', description: result.error.message || 'Failed to generate', variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'Settlement generated successfully' });
      setShowGenerate(false);
      fetchData();
    }
    setGenerating(false);
  };

  const handleApprove = async (id: string) => {
    const { error } = await settlementService.approveSettlement(id);
    if (error) toast({ title: 'Error', description: 'Failed to approve', variant: 'destructive' });
    else { toast({ title: 'Approved' }); fetchData(); }
  };

  const handleLock = async (id: string) => {
    const { error } = await settlementService.lockSettlement(id);
    if (error) toast({ title: 'Error', description: 'Failed to lock', variant: 'destructive' });
    else { toast({ title: 'Locked' }); fetchData(); }
  };

  const handleMarkPaid = async () => {
    if (!paySettlementId || !payForm.utr_number) {
      toast({ title: 'Error', description: 'UTR number is required', variant: 'destructive' });
      return;
    }
    setPaying(true);
    const { error } = await settlementService.markSettlementPaid(paySettlementId, payForm);
    if (error) toast({ title: 'Error', description: 'Failed to mark paid', variant: 'destructive' });
    else {
      toast({ title: 'Success', description: 'Settlement marked as paid' });
      setShowPayDialog(false);
      setPaySettlementId(null);
      setPayForm({ utr_number: '', payment_reference: '', payment_mode: 'neft', payment_date: format(new Date(), 'yyyy-MM-dd'), notes: '' });
      fetchData();
    }
    setPaying(false);
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, string> = { draft: 'secondary', generated: 'default', approved: 'default', locked: 'outline', paid: 'default', disputed: 'destructive' };
    const colorMap: Record<string, string> = { draft: 'bg-gray-100 text-gray-700', generated: 'bg-blue-100 text-blue-700', approved: 'bg-green-100 text-green-700', locked: 'bg-orange-100 text-orange-700', paid: 'bg-emerald-100 text-emerald-800', disputed: 'bg-red-100 text-red-700' };
    return <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${colorMap[status] || 'bg-gray-100 text-gray-700'}`}>{status.toUpperCase()}</span>;
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Partner Settlements</h1>
        <Button size="sm" onClick={() => setShowGenerate(true)}><Plus className="h-3.5 w-3.5 mr-1" /> Generate Settlement</Button>
      </div>

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
                <p className="text-[10px] text-muted-foreground">Pending</p>
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
              <SelectItem value="draft">Draft</SelectItem>
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
              <TableHead className="px-2 py-1.5 text-right">Receipts</TableHead>
              <TableHead className="px-2 py-1.5 text-right">Collected</TableHead>
              <TableHead className="px-2 py-1.5 text-right">Commission</TableHead>
              <TableHead className="px-2 py-1.5 text-right">Net Payable</TableHead>
              <TableHead className="px-2 py-1.5">Status</TableHead>
              <TableHead className="px-2 py-1.5">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {settlements.length === 0 ? (
              <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground text-xs">No settlements found</TableCell></TableRow>
            ) : settlements.map((s, idx) => (
              <TableRow key={s.id} className="text-[11px]">
                <TableCell className="px-2 py-1.5">{idx + 1}</TableCell>
                <TableCell className="px-2 py-1.5 font-mono text-[10px]">{s.serial_number || s.id.slice(0, 8)}</TableCell>
                <TableCell className="px-2 py-1.5">{s.partners?.business_name || '-'}</TableCell>
                <TableCell className="px-2 py-1.5 whitespace-nowrap">{s.period_start} → {s.period_end}</TableCell>
                <TableCell className="px-2 py-1.5 text-right">{s.total_bookings}</TableCell>
                <TableCell className="px-2 py-1.5 text-right">₹{s.total_collected?.toLocaleString()}</TableCell>
                <TableCell className="px-2 py-1.5 text-right">₹{s.commission_amount?.toLocaleString()}</TableCell>
                <TableCell className="px-2 py-1.5 text-right font-medium">₹{s.net_payable?.toLocaleString()}</TableCell>
                <TableCell className="px-2 py-1.5">{getStatusBadge(s.status)}</TableCell>
                <TableCell className="px-2 py-1.5">
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" className="h-6 px-1.5 text-[10px]" onClick={() => setSelectedSettlement(s.id)}><Eye className="h-3 w-3" /></Button>
                    {s.status === 'generated' && <Button variant="ghost" size="sm" className="h-6 px-1.5 text-[10px] text-green-600" onClick={() => handleApprove(s.id)}><CheckCircle className="h-3 w-3" /></Button>}
                    {s.status === 'approved' && <Button variant="ghost" size="sm" className="h-6 px-1.5 text-[10px] text-orange-600" onClick={() => handleLock(s.id)}><Lock className="h-3 w-3" /></Button>}
                    {(s.status === 'approved' || s.status === 'locked') && (
                      <Button variant="ghost" size="sm" className="h-6 px-1.5 text-[10px] text-emerald-600" onClick={() => { setPaySettlementId(s.id); setShowPayDialog(true); }}><CreditCard className="h-3 w-3" /></Button>
                    )}
                    <Button variant="ghost" size="sm" className="h-6 px-1.5 text-[10px]" onClick={() => setShowSettings(s.partner_id)}><Settings className="h-3 w-3" /></Button>
                    <Button variant="ghost" size="sm" className="h-6 px-1.5 text-[10px]" onClick={() => setShowAdjustments(s.partner_id)}><Plus className="h-3 w-3" /></Button>
                    <Button variant="ghost" size="sm" className="h-6 px-1.5 text-[10px]" onClick={() => setShowLedger(s.partner_id)}><BookOpen className="h-3 w-3" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Generate Dialog */}
      <Dialog open={showGenerate} onOpenChange={setShowGenerate}>
        <DialogContent>
          <DialogHeader><DialogTitle>Generate Settlement</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Partner</Label>
              <Select value={generateForm.partner_id} onValueChange={v => setGenerateForm(f => ({ ...f, partner_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select Partner" /></SelectTrigger>
                <SelectContent>
                  {partners.map(p => <SelectItem key={p.id} value={p.id}>{p.business_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Period Start</Label><Input type="date" value={generateForm.period_start} onChange={e => setGenerateForm(f => ({ ...f, period_start: e.target.value }))} /></div>
              <div><Label>Period End</Label><Input type="date" value={generateForm.period_end} onChange={e => setGenerateForm(f => ({ ...f, period_end: e.target.value }))} /></div>
            </div>
            <Button className="w-full" onClick={handleGenerate} disabled={generating}>{generating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Generate</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Pay Dialog */}
      <Dialog open={showPayDialog} onOpenChange={setShowPayDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Mark Settlement as Paid</DialogTitle></DialogHeader>
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

      {/* Settings Dialog */}
      {showSettings && (
        <PartnerPayoutSettingsDialog partnerId={showSettings} open={!!showSettings} onClose={() => setShowSettings(null)} />
      )}

      {/* Adjustments Dialog */}
      {showAdjustments && (
        <AdjustmentManager partnerId={showAdjustments} open={!!showAdjustments} onClose={() => setShowAdjustments(null)} />
      )}

      {/* Ledger Dialog */}
      {showLedger && (
        <PartnerLedgerView partnerId={showLedger} open={!!showLedger} onClose={() => setShowLedger(null)} />
      )}
    </div>
  );
};

export default PartnerSettlements;
