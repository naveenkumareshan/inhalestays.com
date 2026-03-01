
import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { partnerEarningsService } from '@/api/partnerEarningsService';
import { Loader2, Wallet, TrendingDown, CheckCircle, Clock, Eye, IndianRupee } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const PartnerEarnings: React.FC = () => {
  const [partner, setPartner] = useState<any>(null);
  const [summary, setSummary] = useState<any>(null);
  const [settlements, setSettlements] = useState<any[]>([]);
  const [ledger, setLedger] = useState<any[]>([]);
  const [selectedItems, setSelectedItems] = useState<any[]>([]);
  const [showItems, setShowItems] = useState(false);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      const { data: p } = await partnerEarningsService.getMyPartner();
      if (p) {
        setPartner(p);
        const [summaryData, settData, ledgerData] = await Promise.all([
          partnerEarningsService.getMyEarningsSummary(p.id),
          partnerEarningsService.getMySettlements(p.id),
          partnerEarningsService.getMyLedger(p.id),
        ]);
        setSummary(summaryData);
        setSettlements(settData.data || []);
        setLedger(ledgerData.data || []);
      }
      setLoading(false);
    };
    init();
  }, []);

  const viewItems = async (settlementId: string) => {
    const { data } = await partnerEarningsService.getMySettlementItems(settlementId);
    setSelectedItems(data || []);
    setShowItems(true);
  };

  const filteredSettlements = statusFilter === 'all' ? settlements : settlements.filter(s => s.status === statusFilter);

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  if (!partner) {
    return <div className="p-6 text-center text-muted-foreground">Partner profile not found</div>;
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Earnings & Settlements</h1>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <IndianRupee className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-[10px] text-muted-foreground">Total Earnings</p>
                <p className="text-sm font-bold">₹{summary.totalEarnings?.toLocaleString()}</p>
              </div>
            </div>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-red-500" />
              <div>
                <p className="text-[10px] text-muted-foreground">Commission Deducted</p>
                <p className="text-sm font-bold text-red-600">₹{summary.totalCommission?.toLocaleString()}</p>
              </div>
            </div>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <div>
                <p className="text-[10px] text-muted-foreground">Net Received</p>
                <p className="text-sm font-bold text-green-700">₹{summary.netReceived?.toLocaleString()}</p>
              </div>
            </div>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-orange-500" />
              <div>
                <p className="text-[10px] text-muted-foreground">Pending Settlement</p>
                <p className="text-sm font-bold text-orange-600">₹{summary.pendingAmount?.toLocaleString()}</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      <Tabs defaultValue="settlements">
        <TabsList>
          <TabsTrigger value="settlements" className="text-xs">Settlements</TabsTrigger>
          <TabsTrigger value="ledger" className="text-xs">Ledger</TabsTrigger>
          <TabsTrigger value="settings" className="text-xs">Payout Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="settlements" className="space-y-3">
          <div className="flex items-center gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-8 text-xs w-[130px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="generated">Generated</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="border rounded-md overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="text-[11px]">
                  <TableHead className="px-2 py-1.5">S.No.</TableHead>
                  <TableHead className="px-2 py-1.5">Settlement ID</TableHead>
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
                {filteredSettlements.length === 0 ? (
                  <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground text-xs">No settlements</TableCell></TableRow>
                ) : filteredSettlements.map((s, idx) => (
                  <TableRow key={s.id} className="text-[11px]">
                    <TableCell className="px-2 py-1.5">{idx + 1}</TableCell>
                    <TableCell className="px-2 py-1.5 font-mono text-[10px]">{s.serial_number || s.id.slice(0, 8)}</TableCell>
                    <TableCell className="px-2 py-1.5 whitespace-nowrap">{s.period_start} → {s.period_end}</TableCell>
                    <TableCell className="px-2 py-1.5 text-right">{s.total_bookings}</TableCell>
                    <TableCell className="px-2 py-1.5 text-right">₹{s.total_collected?.toLocaleString()}</TableCell>
                    <TableCell className="px-2 py-1.5 text-right text-red-600">₹{s.commission_amount?.toLocaleString()}</TableCell>
                    <TableCell className="px-2 py-1.5 text-right font-medium">₹{s.net_payable?.toLocaleString()}</TableCell>
                    <TableCell className="px-2 py-1.5">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${s.status === 'paid' ? 'bg-emerald-100 text-emerald-800' : s.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                        {s.status.toUpperCase()}
                      </span>
                    </TableCell>
                    <TableCell className="px-2 py-1.5">
                      <Button variant="ghost" size="sm" className="h-6 px-1.5 text-[10px]" onClick={() => viewItems(s.id)}><Eye className="h-3 w-3" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="ledger">
          <div className="border rounded-md overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="text-[10px]">
                  <TableHead className="px-2 py-1">Date</TableHead>
                  <TableHead className="px-2 py-1">Type</TableHead>
                  <TableHead className="px-2 py-1">Category</TableHead>
                  <TableHead className="px-2 py-1 text-right">Amount</TableHead>
                  <TableHead className="px-2 py-1 text-right">Balance</TableHead>
                  <TableHead className="px-2 py-1">Description</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ledger.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-4 text-xs text-muted-foreground">No ledger entries yet</TableCell></TableRow>
                ) : ledger.map(e => (
                  <TableRow key={e.id} className="text-[10px]">
                    <TableCell className="px-2 py-1">{new Date(e.created_at).toLocaleDateString()}</TableCell>
                    <TableCell className="px-2 py-1">
                      <span className={`px-1 py-0.5 rounded text-[9px] font-medium ${e.entry_type === 'credit' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {e.entry_type.toUpperCase()}
                      </span>
                    </TableCell>
                    <TableCell className="px-2 py-1">{e.category}</TableCell>
                    <TableCell className="px-2 py-1 text-right">{e.entry_type === 'credit' ? '+' : '-'}₹{e.amount?.toLocaleString()}</TableCell>
                    <TableCell className="px-2 py-1 text-right">₹{e.running_balance?.toLocaleString()}</TableCell>
                    <TableCell className="px-2 py-1 max-w-[200px] truncate">{e.description}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="settings">
          {summary?.settings ? (
            <div className="grid grid-cols-2 gap-3 text-xs border rounded-md p-4">
              <div><span className="text-muted-foreground">Settlement Cycle:</span> <span className="font-medium">{summary.settings.settlement_cycle}</span></div>
              <div><span className="text-muted-foreground">Commission Type:</span> <span className="font-medium">{summary.settings.commission_type}</span></div>
              <div><span className="text-muted-foreground">Commission %:</span> <span className="font-medium">{summary.settings.commission_percentage}%</span></div>
              <div><span className="text-muted-foreground">Commission On:</span> <span className="font-medium">{summary.settings.commission_on}</span></div>
              <div><span className="text-muted-foreground">Gateway Charges:</span> <span className="font-medium">{summary.settings.gateway_charge_mode}</span></div>
              <div><span className="text-muted-foreground">Min Payout:</span> <span className="font-medium">₹{summary.settings.minimum_payout_amount}</span></div>
              {summary.settings.tds_enabled && <div><span className="text-muted-foreground">TDS:</span> <span className="font-medium">{summary.settings.tds_percentage}%</span></div>}
              {summary.settings.security_hold_enabled && <div><span className="text-muted-foreground">Security Hold:</span> <span className="font-medium">{summary.settings.security_hold_percentage}% for {summary.settings.security_hold_days} days</span></div>}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground p-4">No payout settings configured yet. Contact admin.</p>
          )}
        </TabsContent>
      </Tabs>

      {/* Items Detail Dialog */}
      <Dialog open={showItems} onOpenChange={setShowItems}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Receipt Breakdown</DialogTitle></DialogHeader>
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
                <TableHead className="px-2 py-1 text-right">Net</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {selectedItems.map((item, idx) => (
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
                  <TableCell className="px-2 py-1 text-right font-medium">₹{item.net_amount?.toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PartnerEarnings;
