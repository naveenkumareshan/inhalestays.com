
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import  RevenueReports  from './RevenueReports';
import { OccupancyReports } from './OccupancyReports';
import { BookingTransactions } from './BookingTransactions';
import ReportDateRangePicker  from './ReportDateRangePicker';
import { DateRange } from 'react-day-picker';
import { ExportReportButton } from './ExportReportButton';
import { FileSpreadsheet, FileBarChart, FileText, Calendar } from 'lucide-react';
import { ExpiringBookings } from './ExpiringBookings';
import { useSearchParams } from 'react-router-dom';
import { BookingCalendarDashboard } from '../BookingCalendarDashboard';
import { useAuth } from '@/contexts/AuthContext';
import { getEffectiveOwnerId } from '@/utils/getEffectiveOwnerId';

const BookingReportsPage: React.FC = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [dateFilterType, setDateFilterType] = useState('today');
  const [dateRange, setDateRange] = useState<DateRange>({
    from: new Date(new Date().setDate(new Date().getDate())),
    to: new Date()
  });
  const [partnerUserId, setPartnerUserId] = useState<string | undefined>(undefined);
  
  const isPartner = user?.role === 'vendor' || user?.role === 'vendor_employee';

  // Resolve partner user ID
  useEffect(() => {
    if (isPartner) {
      getEffectiveOwnerId().then(({ ownerId }) => setPartnerUserId(ownerId));
    }
  }, [isPartner]);

  // Get active tab from URL params or default to 'revenue'
  const tabFromUrl = searchParams.get('tab') as 'revenue' | 'occupancy' | 'transactions' | 'expirybooking' | 'calendar' | null;
  const [activeTab, setActiveTab] = useState<'revenue' | 'occupancy' | 'transactions' | 'expirybooking' | 'calendar'>(
    tabFromUrl || 'revenue'
  );

  // Update URL when tab changes
  const handleTabChange = (value: string) => {
     const newTab = value as 'revenue' | 'occupancy' | 'transactions' | 'expirybooking' | 'calendar';
    setActiveTab(newTab);
    setSearchParams({ tab: newTab });
  };

  // Sync state with URL on mount and URL changes
  useEffect(() => {
    if (tabFromUrl && tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    }
  }, [tabFromUrl, activeTab]);

  const handleDateRangeChange = (range: DateRange) => {
    setDateRange(range);
  };

  const handleTypeChange = (type: string) => {
      setDateFilterType(type)
  };
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-background to-muted/20">     
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight mb-2 text-foreground/90">Reading Room Seat Booking Reports</h1>
          <p className="text-muted-foreground max-w-2xl">
            Comprehensive analytics on bookings, occupancy, and revenue. Use these insights to make data-driven decisions for your business.
          </p>
        </div>

        {activeTab !== 'occupancy' && activeTab !== 'expirybooking' && activeTab !== 'calendar' && 
        <Card className="mb-6 bg-card shadow-md border-border/50 overflow-hidden">
          <CardHeader className="pb-3 bg-muted/30">
            <CardTitle className="text-xl flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <span>Report Parameters</span>
            </CardTitle>
            <CardDescription>
              Select a date range to filter the report data
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <ReportDateRangePicker 
              dateRange={dateRange} 
              onChange={handleDateRangeChange} 
              onTypeChange={handleTypeChange}
              dateFilterType={dateFilterType}
            />
          </CardContent>
        </Card>
        }

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-4 mb-6">
          <Tabs 
            value={activeTab}
            className="space-y-4 w-full"
            onValueChange={handleTabChange}
          >
            <TabsList className="bg-background border border-border/50 p-1">
              <TabsTrigger value="revenue" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <FileBarChart className="h-4 w-4" />
                <span>Revenue</span>
              </TabsTrigger>
              <TabsTrigger value="occupancy" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <FileSpreadsheet className="h-4 w-4" />
                <span>Occupancy</span>
              </TabsTrigger>
              <TabsTrigger value="transactions" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <FileText className="h-4 w-4" />
                <span>Transactions</span>
              </TabsTrigger>
              <TabsTrigger value="expirybooking" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <FileText className="h-4 w-4" />
                <span>Expiring Bookings</span>
              </TabsTrigger>
              <TabsTrigger value="calendar" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Calendar className="h-4 w-4" />
                <span>Calendar View</span>
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="revenue" className="space-y-4 mt-6">
              <RevenueReports dateRange={dateRange} />
            </TabsContent>
            
            <TabsContent value="occupancy" className="space-y-4 mt-6">
              <OccupancyReports dateRange={dateRange} />
            </TabsContent>
            
            <TabsContent value="transactions" className="space-y-4 mt-6">
              <BookingTransactions dateRange={dateRange} />
            </TabsContent>

            <TabsContent value="expirybooking" className="space-y-4 mt-6">
              <ExpiringBookings />
            </TabsContent>

            <TabsContent value="calendar" className="space-y-4 mt-6">
              <BookingCalendarDashboard />
            </TabsContent>
          </Tabs>
          
          <div className="flex lg:flex-col gap-2 items-start">
            {(activeTab === 'transactions' || activeTab === 'revenue') && (
              <ExportReportButton 
                reportType={activeTab === 'revenue' ? 'revenue' : 'bookings'}
                startDate={dateRange?.from}
                endDate={dateRange?.to}
                period={activeTab === 'revenue' ? 'monthly' : undefined}
                className="w-full lg:w-auto"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingReportsPage;
