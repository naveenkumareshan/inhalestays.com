
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DateRange } from 'react-day-picker';
import { adminBookingsService } from '@/api/adminBookingsService';
import { format } from 'date-fns';
import { IndianRupee, TrendingUp, Wallet, BarChart3 } from 'lucide-react';
import { ReportSkeleton } from './ReportSkeleton';

interface RevenueReportsProps {
  dateRange?: DateRange;
  partnerUserId?: string;
}

const RevenueReportsComponent: React.FC<RevenueReportsProps> = ({ dateRange, partnerUserId }) => {
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [averageBookingValue, setAverageBookingValue] = useState(0);
  const [bookingsCount, setBookingsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [status] = useState<"completed" | "pending" | "failed" | undefined>('completed');

  // Colors for pie chart

  useEffect(() => {
    const fetchRevenueData = async () => {
      setLoading(true);
      try {
        // In a real application, you would call your revenue API here
        const filters = { status: status, startDate:"",endDate:"" };
        
        // Apply date range filter if available
        if (dateRange?.from) {
          filters.startDate = format(dateRange.from, 'yyyy-MM-dd');
        }
        if (dateRange?.to) {
          filters.endDate = format(dateRange.to, 'yyyy-MM-dd');
        }
        
        const response = await adminBookingsService.getRevenueReport(filters, partnerUserId);
        
        if (response.success && response.data) {
          // Process data for charts based on the selected period
          // const revenueByPeriod = new Map();
          // const revenueByCategory = new Map();
          // let total = 0;
          setTotalRevenue(response.data.totalRevenue);
          const bCount = (response.data as any).bookingCount || response.data.count || 0;
          setAverageBookingValue(bCount ? response.data.totalRevenue / bCount : 0);
          setBookingsCount(bCount);
        }
      } catch (error) {
        console.error('Error fetching revenue data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRevenueData();
  }, [dateRange, status]);

  if (loading) {
    return (
      <>
        <ReportSkeleton type="metrics" count={3} />
        <ReportSkeleton type="chart" />
        <ReportSkeleton type="chart" />
      </>
    );
  }

  return (
    <>
      {/* Revenue metrics cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="overflow-hidden border-border/50 shadow-sm hover:shadow transition-shadow duration-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2 bg-muted/30">
            <div className="space-y-1">
              <CardTitle className="text-base font-medium text-foreground/90 flex items-center gap-2">
                <IndianRupee className="h-4 w-4 text-primary" />
                Total Revenue
              </CardTitle>
              <CardDescription>For selected period</CardDescription>
            </div>
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
              <IndianRupee className="h-5 w-5 text-primary" />
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">₹{totalRevenue.toLocaleString('en-IN')}</div>
          </CardContent>
        </Card>
        
        <Card className="overflow-hidden border-border/50 shadow-sm hover:shadow transition-shadow duration-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2 bg-muted/30">
            <div className="space-y-1">
              <CardTitle className="text-base font-medium text-foreground/90 flex items-center gap-2">
                <Wallet className="h-4 w-4 text-primary" />
                Average Transaction  Value
              </CardTitle>
              <CardDescription>Average revenue per Transaction </CardDescription>
            </div>
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">₹{averageBookingValue.toLocaleString('en-IN', {maximumFractionDigits: 2})}</div>
          </CardContent>
        </Card>
        
        <Card className="overflow-hidden border-border/50 shadow-sm hover:shadow transition-shadow duration-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2 bg-muted/30">
            <div className="space-y-1">
              <CardTitle className="text-base font-medium text-foreground/90 flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                Transaction Count
              </CardTitle>
              <CardDescription>Total completed Transaction</CardDescription>
            </div>
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
              <IndianRupee className="h-5 w-5 text-primary" />
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{bookingsCount}</div>
          </CardContent>
        </Card>
      </div>
    </>
  );
};
// ✅ Memoized export with custom comparison
const RevenueReports = React.memo(RevenueReportsComponent);

export default RevenueReports;