import React, { useState } from 'react';
import { usePartnerPerformance, PerformanceFilters, MonthlyTrend, CollectionsByMethod } from '@/hooks/usePartnerPerformance';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCurrency } from '@/utils/currency';
import { Loader2, TrendingUp, TrendingDown, Users, BedDouble, IndianRupee, AlertTriangle, Star, Flame, BarChart2, Wallet, UserPlus, UserMinus, Clock, Building, Banknote, Smartphone, Building2, CreditCard } from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Area, AreaChart
} from 'recharts';
import { DateFilterSelector } from '@/components/common/DateFilterSelector';

function GrowthBadge({ current, previous, suffix = '' }: { current: number; previous: number; suffix?: string }) {
  if (previous === 0 && current === 0) return <span className="text-[10px] text-muted-foreground">—</span>;
  const change = previous > 0 ? Math.round(((current - previous) / previous) * 100) : current > 0 ? 100 : 0;
  const isPositive = change >= 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] font-medium ${isPositive ? 'text-emerald-600' : 'text-red-500'}`}>
      {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {Math.abs(change)}%{suffix}
    </span>
  );
}

function SummaryCard({ title, value, icon: Icon, prev, isCurrency = false }: {
  title: string; value: number; icon: any; prev?: number; isCurrency?: boolean;
}) {
  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">{title}</p>
            <p className="text-xl font-bold mt-1">{isCurrency ? formatCurrency(value) : value.toLocaleString('en-IN')}</p>
            {prev !== undefined && <GrowthBadge current={value} previous={prev} suffix=" vs prev" />}
          </div>
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Icon className="h-5 w-5 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function InsightCard({ text, icon: Icon, gradient }: { text: string; icon: any; gradient: string }) {
  return (
    <div className={`rounded-xl p-4 ${gradient} text-white`}>
      <div className="flex items-start gap-3">
        <div className="h-8 w-8 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Icon className="h-4 w-4" />
        </div>
        <p className="text-sm font-medium leading-snug">{text}</p>
      </div>
    </div>
  );
}

const METHOD_LABELS: Record<string, { label: string; icon: any }> = {
  cash: { label: 'Cash', icon: Banknote },
  upi: { label: 'UPI', icon: Smartphone },
  bank_transfer: { label: 'Bank Transfer', icon: Building2 },
  online: { label: 'Online', icon: CreditCard },
};

function getMethodDisplay(key: string) {
  if (METHOD_LABELS[key]) return METHOD_LABELS[key];
  // Custom payment mode - clean up the key for display
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

  // Generate insights
  const insights: { text: string; icon: any; gradient: string }[] = [];
  if (d.prevOccupancy !== undefined && d.occupancyPercent > d.prevOccupancy) {
    insights.push({
      text: `Your occupancy improved by ${d.occupancyPercent - d.prevOccupancy}% compared to previous period.`,
      icon: TrendingUp, gradient: 'bg-gradient-to-r from-emerald-500 to-teal-600',
    });
  }
  if (d.prevCollections !== undefined && d.totalCollections > d.prevCollections) {
    insights.push({
      text: `You earned ${formatCurrency(d.totalCollections - d.prevCollections)} more than previous period.`,
      icon: IndianRupee, gradient: 'bg-gradient-to-r from-blue-500 to-indigo-600',
    });
  }
  if (d.bestFloor && d.bestFloor !== '-') {
    insights.push({
      text: `${d.bestFloor} has the highest occupancy among your floors.`,
      icon: Star, gradient: 'bg-gradient-to-r from-amber-500 to-orange-600',
    });
  }
  if (d.pendingDues > 0) {
    insights.push({
      text: `${formatCurrency(d.pendingDues)} in dues are pending collection. Follow up soon!`,
      icon: AlertTriangle, gradient: 'bg-gradient-to-r from-red-500 to-rose-600',
    });
  }

  const bestRevMonth = d.monthlyTrends?.length
    ? d.monthlyTrends.reduce((a: MonthlyTrend, b: MonthlyTrend) => a.revenue > b.revenue ? a : b)
    : null;

  // Payment method breakdown data
  const methodEntries = Object.entries((d.collectionsByMethod || {}) as CollectionsByMethod)
    .sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-6 p-1">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Business Performance</h1>
          <p className="text-sm text-muted-foreground">Complete overview of your business metrics</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {d.properties?.length > 1 && (
            <Select value={filters.propertyId || 'all'} onValueChange={v => setFilters(f => ({ ...f, propertyId: v === 'all' ? undefined : v }))}>
              <SelectTrigger className="w-[160px] h-8 text-xs"><SelectValue placeholder="All Properties" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Properties</SelectItem>
                {d.properties.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {/* Date Filter */}
      <DateFilterSelector
        dateFilter={filters.dateFilter}
        startDate={filters.startDate}
        endDate={filters.endDate}
        onDateFilterChange={v => setFilters(f => ({ ...f, dateFilter: v }))}
        onStartDateChange={d => setFilters(f => ({ ...f, startDate: d }))}
        onEndDateChange={d => setFilters(f => ({ ...f, endDate: d }))}
      />

      {/* Section A: Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard title="Total Seats/Beds" value={d.totalSeats} icon={BedDouble} />
        <SummaryCard title="Occupied" value={d.occupiedSeats} icon={Users} prev={undefined} />
        <SummaryCard title="Occupancy %" value={d.occupancyPercent} icon={BarChart2} prev={d.prevOccupancy} />
        <SummaryCard title="Net Earnings" value={d.netEarnings} icon={IndianRupee} isCurrency prev={d.prevNetEarnings} />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard title="Total Collections" value={d.totalCollections} icon={Wallet} isCurrency prev={d.prevCollections} />
        <SummaryCard title="Fees Collected" value={d.feesCollected} icon={IndianRupee} isCurrency />
        <SummaryCard title="Deposits Collected" value={d.depositsCollected} icon={IndianRupee} isCurrency />
        <SummaryCard title="Pending Dues" value={d.pendingDues} icon={AlertTriangle} isCurrency />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard title="Pending Refunds" value={d.pendingRefunds} icon={Wallet} isCurrency />
        <SummaryCard title="New Admissions" value={d.newAdmissions} icon={UserPlus} />
        <SummaryCard title="Renewals" value={d.renewals} icon={Users} />
        <SummaryCard title="Dropouts" value={d.dropouts} icon={UserMinus} />
      </div>

      {/* Section B: Revenue Breakdown */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Revenue Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-[11px]">Category</TableHead>
                <TableHead className="text-[11px] text-right">This Period</TableHead>
                <TableHead className="text-[11px] text-right">Previous Period</TableHead>
                <TableHead className="text-[11px] text-right">Growth</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[
                { label: 'Room Fees', cur: d.roomFees, prev: d.prevRoomFees },
                { label: 'Food Collection', cur: d.foodCollection, prev: d.prevFoodCollection },
                { label: 'Deposit Collection', cur: d.depositCollection, prev: d.prevDepositCollection },
                { label: 'Other Charges', cur: d.otherCharges, prev: d.prevOtherCharges },
                { label: 'Total Revenue', cur: d.totalRevenue, prev: d.prevTotalRevenue },
              ].map(row => (
                <TableRow key={row.label}>
                  <TableCell className="text-xs font-medium">{row.label}</TableCell>
                  <TableCell className="text-xs text-right font-mono">{formatCurrency(row.cur || 0)}</TableCell>
                  <TableCell className="text-xs text-right font-mono text-muted-foreground">{formatCurrency(row.prev || 0)}</TableCell>
                  <TableCell className="text-right"><GrowthBadge current={row.cur || 0} previous={row.prev || 0} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Section B2: Collections by Payment Mode */}
      {methodEntries.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Wallet className="h-4 w-4" /> Collections by Payment Mode
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-[11px]">Payment Mode</TableHead>
                  <TableHead className="text-[11px] text-right">This Period</TableHead>
                  <TableHead className="text-[11px] text-right">Previous Period</TableHead>
                  <TableHead className="text-[11px] text-right">Growth</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {methodEntries.map(([method, amount]) => {
                  const display = getMethodDisplay(method);
                  const prevAmt = (d.prevCollectionsByMethod || {})[method] || 0;
                  const MethodIcon = display.icon;
                  return (
                    <TableRow key={method}>
                      <TableCell className="text-xs font-medium">
                        <span className="inline-flex items-center gap-1.5">
                          <MethodIcon className="h-3.5 w-3.5 text-muted-foreground" />
                          {display.label}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-right font-mono">{formatCurrency(amount)}</TableCell>
                      <TableCell className="text-xs text-right font-mono text-muted-foreground">{formatCurrency(prevAmt)}</TableCell>
                      <TableCell className="text-right"><GrowthBadge current={amount} previous={prevAmt} /></TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Section C: Dues & Refund */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Students with Dues', value: d.totalStudentsWithDues },
          { label: 'Total Dues', value: formatCurrency(d.totalDuesAmount || 0) },
          { label: 'Overdue > 7 days', value: d.overdueGt7 },
          { label: 'Overdue > 30 days', value: d.overdueGt30 },
          { label: 'Refunds Pending', value: d.refundsPending },
          { label: 'Refunds Processed', value: d.refundsProcessed },
        ].map(item => (
          <Card key={item.label}>
            <CardContent className="p-3 text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{item.label}</p>
              <p className="text-lg font-bold mt-1">{item.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Section D: Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Monthly Revenue</CardTitle>
              {bestRevMonth && bestRevMonth.revenue > 0 && (
                <Badge variant="outline" className="text-[10px] gap-1 border-amber-300 text-amber-700 bg-amber-50">
                  <Flame className="h-3 w-3" /> Highest: {bestRevMonth.label}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={d.monthlyTrends || []}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Revenue" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Deposit & Dues Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={d.monthlyTrends || []}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  <Area type="monotone" dataKey="deposits" stroke="hsl(142, 76%, 36%)" fill="hsl(142, 76%, 36%, 0.1)" name="Deposits" />
                  <Area type="monotone" dataKey="dues" stroke="hsl(0, 84%, 60%)" fill="hsl(0, 84%, 60%, 0.1)" name="Dues" />
                  <Legend />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Section E: Floor Performance */}
      {d.floorPerformance?.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Floor / Room Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-[11px]">Floor</TableHead>
                  <TableHead className="text-[11px] text-right">Total Beds</TableHead>
                  <TableHead className="text-[11px] text-right">Occupied</TableHead>
                  <TableHead className="text-[11px] text-right">Occupancy %</TableHead>
                  <TableHead className="text-[11px]">Performance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {d.floorPerformance.map((fp: any) => (
                  <TableRow key={fp.floorName}>
                    <TableCell className="text-xs font-medium">{fp.floorName}</TableCell>
                    <TableCell className="text-xs text-right">{fp.totalBeds}</TableCell>
                    <TableCell className="text-xs text-right">{fp.occupiedBeds}</TableCell>
                    <TableCell className="text-xs text-right font-mono">{fp.occupancy}%</TableCell>
                    <TableCell>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${fp.occupancy >= 75 ? 'bg-emerald-500' : fp.occupancy >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                          style={{ width: `${fp.occupancy}%` }}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="flex gap-4 mt-3 text-[11px] text-muted-foreground">
              <span>🏆 Best: <strong className="text-foreground">{d.bestFloor}</strong></span>
              <span>⚠️ Lowest: <strong className="text-foreground">{d.worstFloor}</strong></span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Section F: Reading Room Specific */}
      {d.hasReadingRooms && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Building className="h-4 w-4" /> Reading Room Metrics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <p className="text-[10px] text-muted-foreground uppercase">Active Members</p>
                <p className="text-lg font-bold">{d.readingRoomActiveMembers}</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <p className="text-[10px] text-muted-foreground uppercase">Due Members</p>
                <p className="text-lg font-bold">{d.readingRoomDueMembers}</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <p className="text-[10px] text-muted-foreground uppercase">Total Seats</p>
                <p className="text-lg font-bold">{d.totalSeats - (d.floorPerformance?.reduce((s: number, f: any) => s + f.totalBeds, 0) || 0)}</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <p className="text-[10px] text-muted-foreground uppercase">Occupancy</p>
                <p className="text-lg font-bold">{d.occupancyPercent}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Section G: Settlement & Earnings */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Settlement & Earnings Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { label: 'Gross Collection', value: formatCurrency(d.grossCollection || 0) },
              { label: 'Platform Commission', value: formatCurrency(d.platformCommission || 0) },
              { label: 'Net Earnings', value: formatCurrency(d.netEarnings || 0) },
              { label: 'Paid Settlements', value: formatCurrency(d.paidSettlements || 0) },
              { label: 'Pending Amount', value: formatCurrency(d.pendingSettlement || 0) },
            ].map(item => (
              <div key={item.label} className="text-center p-3 rounded-lg border">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{item.label}</p>
                <p className="text-base font-bold mt-1">{item.value}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Section H: Student Insights */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Student Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { label: 'Active Students', value: d.activeStudents, icon: Users },
              { label: 'New This Period', value: d.newAdmissions, icon: UserPlus },
              { label: 'Renewals', value: d.renewals, icon: Users },
              { label: 'Dropouts', value: d.dropouts, icon: UserMinus },
              { label: 'Avg Stay (days)', value: d.avgStayDuration, icon: Clock },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-3 p-3 rounded-lg border">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <item.icon className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase">{item.label}</p>
                  <p className="text-lg font-bold">{item.value}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Section I: Insight Cards */}
      {insights.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-3">💡 Smart Insights</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {insights.map((insight, i) => (
              <InsightCard key={i} {...insight} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
