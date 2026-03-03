
import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { partnerEarningsService } from '@/api/partnerEarningsService';
import { Loader2, Wallet, TrendingDown, CheckCircle, Clock, Eye, IndianRupee, Download } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatCurrency } from '@/utils/currency';
import ExcelJS from 'exceljs';

const PartnerEarnings: React.FC = () => {
  const [partner, setPartner] = useState<any>(null);
  const [summary, setSummary] = useState<any>(null);
  const [settlements, setSettlements] = useState<any[]>([]);
  const [ledger, setLedger] = useState<any[]>([]);
  const [showStatement, setShowStatement] = useState(false);
  const [statementData, setStatementData] = useState<any>(null);
  const [statementLoading, setStatementLoading] = useState(false);
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

  const viewStatement = async (settlementId: string) => {
    setStatementLoading(true);
    setShowStatement(true);
    const detail = await partnerEarningsService.getMySettlementDetail(settlementId);
    setStatementData(detail);
    setStatementLoading(false);
  };

  const downloadStatement = async () => {
    if (!statementData?.settlement) return;
    const s = statementData.settlement;
    const items = statementData.items || [];

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Settlement Statement');

    // Header
    ws.addRow(['Settlement Statement']);
    ws.addRow([]);
    ws.addRow(['Settlement ID', s.serial_number || s.id?.slice(0, 8)]);
    ws.addRow(['Period', `${s.period_start} to ${s.period_end}`]);
    ws.addRow(['Partner', partner?.business_name || '']);
    ws.addRow(['Generated', new Date(s.created_at).toLocaleDateString()]);
    ws.addRow([]);

    // Summary
    ws.addRow(['Summary']);
    ws.addRow(['Total Collected', Math.round((s.total_collected || 0) * 100) / 100]);
    ws.addRow(['Commission', Math.round((s.commission_amount || 0) * 100) / 100]);
    ws.addRow(['Gateway Fees', Math.round((s.gateway_fees || 0) * 100) / 100]);
    ws.addRow(['Adjustments', Math.round((s.adjustment_amount || 0) * 100) / 100]);
    if (s.tds_amount > 0) ws.addRow(['TDS', Math.round((s.tds_amount || 0) * 100) / 100]);
    if (s.security_hold_amount > 0) ws.addRow(['Security Hold', Math.round((s.security_hold_amount || 0) * 100) / 100]);
    ws.addRow(['Net Payable', Math.round((s.net_payable || 0) * 100) / 100]);
    ws.addRow([]);

    // Items
    ws.addRow(['S.No', 'Receipt ID', 'Type', 'Module', 'Student', 'Property', 'Payment Date', 'Amount', 'Commission', 'Gateway Fee', 'Net Amount']);
    ws.getRow(ws.rowCount).font = { bold: true };
    items.forEach((item: any, idx: number) => {
      ws.addRow([
        idx + 1,
        item.receipt_serial || '-',
        item.receipt_type || '-',
        item.booking_type === 'hostel' ? 'Hostel' : 'RR',
        item.student_name || '',
        item.property_name || '',
        item.payment_date ? new Date(item.payment_date).toLocaleDateString() : '-',
        Math.round((item.total_amount || 0) * 100) / 100,
        Math.round((item.commission_amount || 0) * 100) / 100,
        Math.round((item.gateway_fee || 0) * 100) / 100,
        Math.round((item.net_amount || 0) * 100) / 100,
      ]);
    });

    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `statement-${s.serial_number || s.id?.slice(0, 8)}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
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
                <p className="text-sm font-bold">{formatCurrency(summary.totalEarnings || 0)}</p>
              </div>
            </div>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-destructive" />
              <div>
                <p className="text-[10px] text-muted-foreground">Commission Deducted</p>
                <p className="text-sm font-bold text-destructive">{formatCurrency(summary.totalCommission || 0)}</p>
              </div>
            </div>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <div>
                <p className="text-[10px] text-muted-foreground">Net Received</p>
                <p className="text-sm font-bold text-green-700">{formatCurrency(summary.netReceived || 0)}</p>
              </div>
            </div>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-orange-500" />
              <div>
                <p className="text-[10px] text-muted-foreground">Pending Settlement</p>
                <p className="text-sm font-bold text-orange-600">{formatCurrency(summary.pendingAmount || 0)}</p>
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
                    <TableCell className="px-2 py-1.5 text-right">{formatCurrency(s.total_collected || 0)}</TableCell>
                    <TableCell className="px-2 py-1.5 text-right text-destructive">{formatCurrency(s.commission_amount || 0)}</TableCell>
                    <TableCell className="px-2 py-1.5 text-right font-medium">{formatCurrency(s.net_payable || 0)}</TableCell>
                    <TableCell className="px-2 py-1.5">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${s.status === 'paid' ? 'bg-emerald-100 text-emerald-800' : s.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                        {s.status.toUpperCase()}
                      </span>
                    </TableCell>
                    <TableCell className="px-2 py-1.5">
                      <Button variant="ghost" size="sm" className="h-6 px-1.5 text-[10px]" onClick={() => viewStatement(s.id)}><Eye className="h-3 w-3" /></Button>
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
                    <TableCell className="px-2 py-1 text-right">{e.entry_type === 'credit' ? '+' : '-'}{formatCurrency(e.amount || 0)}</TableCell>
                    <TableCell className="px-2 py-1 text-right">{formatCurrency(e.running_balance || 0)}</TableCell>
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
              <div><span className="text-muted-foreground">Min Payout:</span> <span className="font-medium">{formatCurrency(summary.settings.minimum_payout_amount || 0)}</span></div>
              {summary.settings.tds_enabled && <div><span className="text-muted-foreground">TDS:</span> <span className="font-medium">{summary.settings.tds_percentage}%</span></div>}
              {summary.settings.security_hold_enabled && <div><span className="text-muted-foreground">Security Hold:</span> <span className="font-medium">{summary.settings.security_hold_percentage}% for {summary.settings.security_hold_days} days</span></div>}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground p-4">No payout settings configured yet. Contact admin.</p>
          )}
        </TabsContent>
      </Tabs>

      {/* Statement Detail Dialog */}
      <Dialog open={showStatement} onOpenChange={setShowStatement}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Settlement Statement — {statementData?.settlement?.serial_number || ''}</span>
              {statementData?.settlement && (
                <Button size="sm" variant="outline" onClick={downloadStatement}><Download className="h-3.5 w-3.5 mr-1" /> Download</Button>
              )}
            </DialogTitle>
          </DialogHeader>

          {statementLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : statementData?.settlement ? (
            <div className="space-y-4">
              {/* Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div><span className="text-muted-foreground">Period:</span> <span className="font-medium">{statementData.settlement.period_start} → {statementData.settlement.period_end}</span></div>
                <div><span className="text-muted-foreground">Status:</span> <Badge variant="outline" className="text-[10px] ml-1">{statementData.settlement.status}</Badge></div>
                <div><span className="text-muted-foreground">Receipts:</span> <span className="font-medium">{statementData.settlement.total_bookings}</span></div>
              </div>

              {/* Financial */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs border rounded-md p-3 bg-muted/30">
                <div><p className="text-muted-foreground">Total Collected</p><p className="font-bold">{formatCurrency(statementData.settlement.total_collected || 0)}</p></div>
                <div><p className="text-muted-foreground">Commission</p><p className="font-bold text-destructive">-{formatCurrency(statementData.settlement.commission_amount || 0)}</p></div>
                <div><p className="text-muted-foreground">Gateway Fees</p><p className="font-bold text-destructive">-{formatCurrency(statementData.settlement.gateway_fees || 0)}</p></div>
                <div><p className="text-muted-foreground">Adjustments</p><p className="font-bold text-destructive">-{formatCurrency(statementData.settlement.adjustment_amount || 0)}</p></div>
                {statementData.settlement.tds_amount > 0 && <div><p className="text-muted-foreground">TDS</p><p className="font-bold text-destructive">-{formatCurrency(statementData.settlement.tds_amount || 0)}</p></div>}
                {statementData.settlement.security_hold_amount > 0 && <div><p className="text-muted-foreground">Security Hold</p><p className="font-bold text-orange-600">-{formatCurrency(statementData.settlement.security_hold_amount || 0)}</p></div>}
                <div className="col-span-2 md:col-span-4 border-t pt-2 mt-2">
                  <p className="text-muted-foreground">Net Payable</p>
                  <p className="font-bold text-lg text-green-700">{formatCurrency(statementData.settlement.net_payable || 0)}</p>
                </div>
              </div>

              {/* Payment info if paid */}
              {statementData.settlement.status === 'paid' && (
                <div className="text-xs border rounded-md p-3 bg-emerald-50 space-y-1">
                  <p><span className="text-muted-foreground">UTR:</span> <span className="font-mono font-medium">{statementData.settlement.utr_number}</span></p>
                  <p><span className="text-muted-foreground">Payment Mode:</span> {statementData.settlement.payment_mode?.toUpperCase()}</p>
                  <p><span className="text-muted-foreground">Payment Date:</span> {statementData.settlement.payment_date}</p>
                </div>
              )}

              {/* Items table */}
              <div>
                <h3 className="text-sm font-semibold mb-2">Receipt Items ({statementData.items.length})</h3>
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
                      {statementData.items.map((item: any, idx: number) => (
                        <TableRow key={item.id} className="text-[10px]">
                          <TableCell className="px-2 py-1">{idx + 1}</TableCell>
                          <TableCell className="px-2 py-1 font-mono text-[9px]">{item.receipt_serial || '-'}</TableCell>
                          <TableCell className="px-2 py-1"><Badge variant="outline" className="text-[9px]">{item.receipt_type || '-'}</Badge></TableCell>
                          <TableCell className="px-2 py-1"><Badge variant="outline" className="text-[9px]">{item.booking_type === 'hostel' ? 'Hostel' : 'RR'}</Badge></TableCell>
                          <TableCell className="px-2 py-1">{item.student_name}</TableCell>
                          <TableCell className="px-2 py-1">{item.property_name}</TableCell>
                          <TableCell className="px-2 py-1 whitespace-nowrap">{item.payment_date ? new Date(item.payment_date).toLocaleDateString() : '-'}</TableCell>
                          <TableCell className="px-2 py-1 text-right">{formatCurrency(item.total_amount || 0)}</TableCell>
                          <TableCell className="px-2 py-1 text-right text-destructive">-{formatCurrency(item.commission_amount || 0)}</TableCell>
                          <TableCell className="px-2 py-1 text-right text-destructive">-{formatCurrency(item.gateway_fee || 0)}</TableCell>
                          <TableCell className="px-2 py-1 text-right font-medium">{formatCurrency(item.net_amount || 0)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Adjustments */}
              {statementData.adjustments?.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold mb-2">Adjustments ({statementData.adjustments.length})</h3>
                  <div className="border rounded-md overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="text-[10px]">
                          <TableHead className="px-2 py-1">Type</TableHead>
                          <TableHead className="px-2 py-1 text-right">Amount</TableHead>
                          <TableHead className="px-2 py-1">Description</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {statementData.adjustments.map((adj: any) => (
                          <TableRow key={adj.id} className="text-[10px]">
                            <TableCell className="px-2 py-1">{adj.type}</TableCell>
                            <TableCell className="px-2 py-1 text-right">{formatCurrency(adj.amount || 0)}</TableCell>
                            <TableCell className="px-2 py-1">{adj.description}</TableCell>
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
    </div>
  );
};

export default PartnerEarnings;
