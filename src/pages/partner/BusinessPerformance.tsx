import React, { useState } from 'react';
import { usePartnerPerformance, PerformanceFilters, MonthlyTrend, CollectionsByMethod } from '@/hooks/usePartnerPerformance';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCurrency } from '@/utils/currency';
import { Loader2, TrendingUp, TrendingDown, AlertTriangle, Star, Flame, IndianRupee, Wallet, Banknote, Smartphone, Building2, CreditCard, Building } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Area, AreaChart
} from 'recharts';
import { DateFilterSelector } from '@/components/common/DateFilterSelector';

function GrowthBadge({ current, previous }: { current: number; previous: number }) {
  if (previous === 0 && current === 0) return <span className="text-[10px] text-muted-foreground">—</span>;
  const change = previous > 0 ? Math.round(((current - previous) / previous) * 100) : current > 0 ? 100 : 0;
  const isPositive = change >= 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] font-medium ${isPositive ? 'text-emerald-600' : 'text-red-500'}`}>
      {isPositive ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
      {Math.abs(change)}%
    </span>
  );
}

function CompactStatsTable({ title, rows }: {
  title: string;
  rows: { label: string; value: string | number; prev?: number; current?: number }[];
}) {
  return (
    <Card>
      <CardHeader className="py-2 px-3">
        <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="text-[10px] py-1.5 px-3">Metric</TableHead>
              <TableHead className="text-[10px] py-1.5 px-3 text-right">Value</TableHead>
              <TableHead className="text-[10px] py-1.5 px-3 text-right">Growth</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(row => (
              <TableRow key={row.label}>
                <TableCell className="text-[11px] py-1.5 px-3 font-medium">{row.label}</TableCell>
                <TableCell className="text-[11px] py-1.5 px-3 text-right font-mono font-semibold">{row.value}</TableCell>
                <TableCell className="text-right py-1.5 px-3">
                  {row.prev !== undefined && row.current !== undefined
                    ? <GrowthBadge current={row.current} previous={row.prev} />
                    : <span className="text-[10px] text-muted-foreground">—</span>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

const METHOD_LABELS: Record<string, { label: string; icon: any }> = {
  cash: { label: 'Cash', icon: Banknote },
  upi: { label: 'UPI', icon: Smartphone },
  bank_transfer: { label: 'Bank Transfer', icon: Building2 },
  online: { label: 'Online', icon: CreditCard },
};

function getMethodDisplay(key: string, customLabels?: Record<string, string>) {
  if (METHOD_LABELS[key]) return METHOD_LABELS[key];
  if (customLabels && customLabels[key]) return { label: customLabels[key], icon: Building2 };
  const label = key.startsWith('custom_') ? key.replace('custom_', '') : key;
  return { label: label.charAt(0).toUpperCase() + label.slice(1), icon: Building2 };
}

export default function BusinessPerformance() {
  const [filters, setFilters] = useState<PerformanceFilters>({
    dateFilter: 'this_month',
    propertyType: 'all',
  });

  const { data, isLoading } = usePartnerPerformance(filters);
  const d = data || ({} as any);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const insights: { text: string; gradient: string }[] = [];
  if (d.prevOccupancy !== undefined && d.occupancyPercent > d.prevOccupancy) {
    insights.push({ text: `Occupancy improved by ${d.occupancyPercent - d.prevOccupancy}% vs previous period.`, gradient: 'bg-gradient-to-r from-emerald-500 to-teal-600' });
  }
  if (d.prevCollections !== undefined && d.totalCollections > d.prevCollections) {
    insights.push({ text: `Earned ${formatCurrency(d.totalCollections - d.prevCollections)} more than previous period.`, gradient: 'bg-gradient-to-r from-blue-500 to-indigo-600' });
  }
  if (d.bestFloor && d.bestFloor !== '-') {
    insights.push({ text: `${d.bestFloor} has the highest occupancy.`, gradient: 'bg-gradient-to-r from-amber-500 to-orange-600' });
  }
  if (d.pendingDues > 0) {
    insights.push({ text: `${formatCurrency(d.pendingDues)} in dues pending. Follow up!`, gradient: 'bg-gradient-to-r from-red-500 to-rose-600' });
  }

  const bestRevMonth = d.monthlyTrends?.length
    ? d.monthlyTrends.reduce((a: MonthlyTrend, b: MonthlyTrend) => a.revenue > b.revenue ? a : b)
    : null;

  const methodEntries = Object.entries((d.collectionsByMethod || {}) as CollectionsByMethod).sort((a, b) => b[1] - a[1]);

  const occupancyRows = [
    { label: 'Total Seats/Beds', value: d.totalSeats, current: d.totalSeats },
    { label: 'Occupied', value: d.occupiedSeats, current: d.occupiedSeats },
    { label: 'Available', value: d.availableSeats ?? (d.totalSeats - d.occupiedSeats), current: d.availableSeats ?? (d.totalSeats - d.occupiedSeats) },
    { label: 'Occupancy %', value: `${d.occupancyPercent}%`, current: d.occupancyPercent, prev: d.prevOccupancy },
    { label: 'New Admissions', value: d.newAdmissions, current: d.newAdmissions },
    { label: 'Renewals', value: d.renewals, current: d.renewals },
    { label: 'Dropouts', value: d.dropouts, current: d.dropouts },
    { label: 'Active Students', value: d.activeStudents, current: d.activeStudents },
    { label: 'Avg Stay (days)', value: d.avgStayDuration, current: d.avgStayDuration },
  ];

  const financialRows = [
    { label: 'Seat Fees', value: formatCurrency(d.seatFees ?? 0), current: d.seatFees ?? 0, prev: d.prevSeatFees },
    { label: 'Bed Fees', value: formatCurrency(d.bedFees ?? 0), current: d.bedFees ?? 0, prev: d.prevBedFees },
    { label: 'Locker Amount', value: formatCurrency(d.lockerAmount ?? 0), current: d.lockerAmount ?? 0, prev: d.prevLockerAmount },
    { label: 'Security Deposit', value: formatCurrency(d.securityDeposit ?? 0), current: d.securityDeposit ?? 0, prev: d.prevSecurityDeposit },
    { label: 'Food Collection', value: formatCurrency(d.foodCollection || 0), current: d.foodCollection, prev: d.prevFoodCollection },
    { label: 'Total Collections', value: formatCurrency(d.totalCollections || 0), current: d.totalCollections, prev: d.prevCollections },
    { label: 'Pending Dues', value: formatCurrency(d.pendingDues || 0), current: d.pendingDues },
    { label: 'Pending Refunds', value: formatCurrency(d.pendingRefunds || 0), current: d.pendingRefunds },
    { label: 'Net Earnings', value: formatCurrency(d.netEarnings || 0), current: d.netEarnings, prev: d.prevNetEarnings },
  ];

  return (
    <div className="space-y-3 p-1">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-bold tracking-tight">Business Performance</h1>
          <p className="text-[11px] text-muted-foreground">Complete overview of your business metrics</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {d.properties?.length > 1 && (
            <Select value={filters.propertyId || 'all'} onValueChange={v => setFilters(f => ({ ...f, propertyId: v === 'all' ? undefined : v }))}>
              <SelectTrigger className="w-[140px] h-7 text-[11px]"><SelectValue placeholder="All Properties" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Properties</SelectItem>
                {d.properties.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      <DateFilterSelector
        dateFilter={filters.dateFilter}
        startDate={filters.startDate}
        endDate={filters.endDate}
        onDateFilterChange={v => setFilters(f => ({ ...f, dateFilter: v }))}
        onStartDateChange={d => setFilters(f => ({ ...f, startDate: d }))}
        onEndDateChange={d => setFilters(f => ({ ...f, endDate: d }))}
      />

      {/* Two compact stat tables side by side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <CompactStatsTable title="Occupancy & Students" rows={occupancyRows} />
        <CompactStatsTable title="Financials" rows={financialRows} />
      </div>

      {/* Revenue Breakdown */}
      <Card>
        <CardHeader className="py-2 px-3">
          <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Revenue Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="text-[10px] py-1.5 px-3">Category</TableHead>
                <TableHead className="text-[10px] py-1.5 px-3 text-right">This Period</TableHead>
                <TableHead className="text-[10px] py-1.5 px-3 text-right">Previous</TableHead>
                <TableHead className="text-[10px] py-1.5 px-3 text-right">Growth</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[
                { label: 'Seat Fees', cur: d.seatFees ?? 0, prev: d.prevSeatFees ?? 0 },
                { label: 'Bed Fees', cur: d.bedFees ?? 0, prev: d.prevBedFees ?? 0 },
                { label: 'Locker Amount', cur: d.lockerAmount ?? 0, prev: d.prevLockerAmount ?? 0 },
                { label: 'Security Deposit', cur: d.securityDeposit ?? 0, prev: d.prevSecurityDeposit ?? 0 },
                { label: 'Food Collection', cur: d.foodCollection, prev: d.prevFoodCollection },
                { label: 'Due Payments', cur: d.otherCharges, prev: d.prevOtherCharges },
                { label: 'Total Revenue', cur: d.totalRevenue, prev: d.prevTotalRevenue },
              ].map(row => (
                <TableRow key={row.label}>
                  <TableCell className="text-[11px] py-1.5 px-3 font-medium">{row.label}</TableCell>
                  <TableCell className="text-[11px] py-1.5 px-3 text-right font-mono">{formatCurrency(row.cur || 0)}</TableCell>
                  <TableCell className="text-[11px] py-1.5 px-3 text-right font-mono text-muted-foreground">{formatCurrency(row.prev || 0)}</TableCell>
                  <TableCell className="text-right py-1.5 px-3"><GrowthBadge current={row.cur || 0} previous={row.prev || 0} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Payment Mode */}
      {methodEntries.length > 0 && (
        <Card>
          <CardHeader className="py-2 px-3">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Wallet className="h-3 w-3" /> Collections by Payment Mode
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="text-[10px] py-1.5 px-3">Mode</TableHead>
                  <TableHead className="text-[10px] py-1.5 px-3 text-right">This Period</TableHead>
                  <TableHead className="text-[10px] py-1.5 px-3 text-right">Previous</TableHead>
                  <TableHead className="text-[10px] py-1.5 px-3 text-right">Growth</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {methodEntries.map(([method, amount]) => {
                  const display = getMethodDisplay(method, d.paymentModeLabels);
                  const prevAmt = (d.prevCollectionsByMethod || {})[method] || 0;
                  const MethodIcon = display.icon;
                  return (
                    <TableRow key={method}>
                      <TableCell className="text-[11px] py-1.5 px-3 font-medium">
                        <span className="inline-flex items-center gap-1">
                          <MethodIcon className="h-3 w-3 text-muted-foreground" />
                          {display.label}
                        </span>
                      </TableCell>
                      <TableCell className="text-[11px] py-1.5 px-3 text-right font-mono">{formatCurrency(amount)}</TableCell>
                      <TableCell className="text-[11px] py-1.5 px-3 text-right font-mono text-muted-foreground">{formatCurrency(prevAmt)}</TableCell>
                      <TableCell className="text-right py-1.5 px-3"><GrowthBadge current={amount} previous={prevAmt} /></TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Charts — reduced height */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Card>
          <CardHeader className="py-2 px-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Monthly Revenue</CardTitle>
              {bestRevMonth && bestRevMonth.revenue > 0 && (
                <Badge variant="outline" className="text-[9px] gap-0.5 border-amber-300 text-amber-700 bg-amber-50 py-0 px-1.5">
                  <Flame className="h-2.5 w-2.5" /> {bestRevMonth.label}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="px-3 pb-3 pt-0">
            <div className="h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={d.monthlyTrends || []}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="label" tick={{ fontSize: 9 }} />
                  <YAxis tick={{ fontSize: 9 }} />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} name="Revenue" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="py-2 px-3">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Deposit & Dues Trend</CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3 pt-0">
            <div className="h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={d.monthlyTrends || []}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="label" tick={{ fontSize: 9 }} />
                  <YAxis tick={{ fontSize: 9 }} />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  <Area type="monotone" dataKey="deposits" stroke="hsl(142, 76%, 36%)" fill="hsl(142, 76%, 36%, 0.1)" name="Deposits" />
                  <Area type="monotone" dataKey="dues" stroke="hsl(0, 84%, 60%)" fill="hsl(0, 84%, 60%, 0.1)" name="Dues" />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Floor Performance */}
      {d.floorPerformance?.length > 0 && (
        <Card>
          <CardHeader className="py-2 px-3">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Floor / Room Performance</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="text-[10px] py-1.5 px-3">Floor</TableHead>
                  <TableHead className="text-[10px] py-1.5 px-3 text-right">Total</TableHead>
                  <TableHead className="text-[10px] py-1.5 px-3 text-right">Occupied</TableHead>
                  <TableHead className="text-[10px] py-1.5 px-3 text-right">%</TableHead>
                  <TableHead className="text-[10px] py-1.5 px-3">Bar</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {d.floorPerformance.map((fp: any) => (
                  <TableRow key={fp.floorName}>
                    <TableCell className="text-[11px] py-1.5 px-3 font-medium">{fp.floorName}</TableCell>
                    <TableCell className="text-[11px] py-1.5 px-3 text-right">{fp.totalBeds}</TableCell>
                    <TableCell className="text-[11px] py-1.5 px-3 text-right">{fp.occupiedBeds}</TableCell>
                    <TableCell className="text-[11px] py-1.5 px-3 text-right font-mono">{fp.occupancy}%</TableCell>
                    <TableCell className="py-1.5 px-3">
                      <div className="w-full bg-muted rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full ${fp.occupancy >= 75 ? 'bg-emerald-500' : fp.occupancy >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                          style={{ width: `${fp.occupancy}%` }}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="flex gap-3 px-3 py-2 text-[10px] text-muted-foreground border-t">
              <span>🏆 Best: <strong className="text-foreground">{d.bestFloor}</strong></span>
              <span>⚠️ Lowest: <strong className="text-foreground">{d.worstFloor}</strong></span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Settlement Overview — compact inline */}
      <Card>
        <CardHeader className="py-2 px-3">
          <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Settlement Overview</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableBody>
              {[
                { label: 'Gross Collection', value: formatCurrency(d.grossCollection || 0) },
                { label: 'Platform Commission', value: formatCurrency(d.platformCommission || 0) },
                { label: 'Net Earnings', value: formatCurrency(d.netEarnings || 0) },
                { label: 'Paid Settlements', value: formatCurrency(d.paidSettlements || 0) },
                { label: 'Pending Amount', value: formatCurrency(d.pendingSettlement || 0) },
              ].map(item => (
                <TableRow key={item.label}>
                  <TableCell className="text-[11px] py-1.5 px-3 font-medium">{item.label}</TableCell>
                  <TableCell className="text-[11px] py-1.5 px-3 text-right font-mono font-semibold">{item.value}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Smart Insights — compact */}
      {insights.length > 0 && (
        <div>
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">💡 Smart Insights</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {insights.map((insight, i) => (
              <div key={i} className={`rounded-lg px-3 py-2 ${insight.gradient} text-white`}>
                <p className="text-[11px] font-medium leading-snug">{insight.text}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
