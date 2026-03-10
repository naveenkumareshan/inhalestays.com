
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DateRange } from 'react-day-picker';
import { Progress } from '@/components/ui/progress';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PercentIcon, Users, BookOpenCheck } from 'lucide-react';
import { ReportSkeleton } from './ReportSkeleton';
import { EnhancedChart } from './ReportsChartTheme';
import { ChartTooltipContent } from '@/components/ui/chart';
import { adminBookingsService } from '@/api/adminBookingsService';
import { toast } from '@/hooks/use-toast';

interface OccupancyData {
  cabinId: string;
  cabinName: string;
  totalSeats: number;
  occupiedSeats: number;
  availableSeats: number;
  occupancyRate: number;
  pendingBookings: number;
  category?: string;
}

interface OccupancyTrendData {
  time?: string;
  day?: string;
  date?: string;
  occupancyRate: number;
}

interface OverallOccupancy {
  totalSeats: number;
  occupiedSeats: number;
  availableSeats: number;
  occupancyRate: number;
}

export function OccupancyReports({ dateRange, partnerUserId }: { dateRange: DateRange; partnerUserId?: string }) {
  const [occupancyData, setOccupancyData] = useState<OccupancyData[]>([]);
  const [occupancyTrend, setOccupancyTrend] = useState<OccupancyTrendData[]>([]);
  const [timeframe, setTimeframe] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [isLoading, setIsLoading] = useState(false);
  const [overallOccupancy, setOverallOccupancy] = useState(0);
  const [totalSeats, setTotalSeats] = useState(0);
  const [occupiedSeats, setOccupiedSeats] = useState(0);
  const [availableSeats, setAvailableSeats] = useState(0);
  const [totalPendingBookings, setTotalPendingBookings] = useState(0);

  useEffect(() => {
    fetchOccupancyData();
  }, [dateRange, timeframe]);

  const fetchOccupancyData = async () => {
    setIsLoading(true);
    
    try {
      const params: any = {
        timeframe
      };
      
      if (dateRange?.from) {
        params.startDate = dateRange.from.toISOString();
      }
      
      if (dateRange?.to) {
        params.endDate = dateRange.to.toISOString();
      }
      
      const response = await adminBookingsService.getOccupancyReports(params);
      
      
      if (response.success && response.data) {
        const rData = response.data as any;
        // Process cabin-level data
        if (rData.cabins && Array.isArray(rData.cabins)) {
          setOccupancyData(rData.cabins);
          
          // Get overall data directly from API
          if (rData.overall) {
            const overall = rData.overall as OverallOccupancy;
            setTotalSeats(overall.totalSeats);
            setOccupiedSeats(overall.occupiedSeats);
            setAvailableSeats(overall.availableSeats || overall.totalSeats - overall.occupiedSeats);
            setOverallOccupancy(overall.occupancyRate);
            
            // Calculate total pending bookings
            const totalPending = rData.cabins.reduce(
              (sum: number, cabin: OccupancyData) => sum + cabin.pendingBookings, 0
            );
            setTotalPendingBookings(totalPending);
          } else {
            // Calculate overall metrics from cabin data if not provided
            const totalSeatCount = rData.cabins.reduce((sum: number, cabin: OccupancyData) => sum + cabin.totalSeats, 0);
            const occupiedSeatCount = rData.cabins.reduce((sum: number, cabin: OccupancyData) => sum + cabin.occupiedSeats, 0);
            const availableSeatCount = rData.cabins.reduce((sum: number, cabin: OccupancyData) => sum + cabin.availableSeats, 0);
            const pendingBookingsCount = rData.cabins.reduce((sum: number, cabin: OccupancyData) => sum + cabin.pendingBookings, 0);
            
            setTotalSeats(totalSeatCount);
            setOccupiedSeats(occupiedSeatCount);
            setAvailableSeats(availableSeatCount);
            setOverallOccupancy(totalSeatCount > 0 ? (occupiedSeatCount / totalSeatCount) * 100 : 0);
            setTotalPendingBookings(pendingBookingsCount);
          }
        } else {
          // No data from API
          setOccupancyData([]);
          setOccupancyTrend([]);
          setTotalSeats(0);
          setOccupiedSeats(0);
          setAvailableSeats(0);
          setOverallOccupancy(0);
          setTotalPendingBookings(0);
        }
        
        // Handle trend data
        if (rData.trend && Array.isArray(rData.trend)) {
          setOccupancyTrend(rData.trend);
        } else {
          setOccupancyTrend([]);
        }
      } else {
        setOccupancyData([]);
        setOccupancyTrend([]);
      }
    } catch (error) {
      console.error('Error fetching occupancy data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch occupancy data.",
        variant: "destructive"
      });
      setOccupancyData([]);
      setOccupancyTrend([]);
    } finally {
      setIsLoading(false);
    }
  };

  const setMockData = () => {
    // Mock cabin data
    const mockOccupancyData = [
      { cabinId: '1', cabinName: "Reading Room A", totalSeats: 16, occupiedSeats: 14, availableSeats: 2, occupancyRate: 87.5, pendingBookings: 2 },
      { cabinId: '2', cabinName: "Study Hall B", totalSeats: 18, occupiedSeats: 12, availableSeats: 6, occupancyRate: 66.7, pendingBookings: 3 },
      { cabinId: '3', cabinName: "Research Center", totalSeats: 16, occupiedSeats: 15, availableSeats: 1, occupancyRate: 93.8, pendingBookings: 1 },
      { cabinId: '4', cabinName: "Quiet Zone", totalSeats: 16, occupiedSeats: 10, availableSeats: 6, occupancyRate: 62.5, pendingBookings: 0 },
      { cabinId: '5', cabinName: "Group Study Area", totalSeats: 18, occupiedSeats: 16, availableSeats: 2, occupancyRate: 88.9, pendingBookings: 2 },
    ];
    
    setOccupancyData(mockOccupancyData);
    
    // Mock trend data
    const mockTrend = generateMockOccupancyTrend(timeframe);
    setOccupancyTrend(mockTrend);
    
    // Calculate mock aggregate metrics
    const totalMockSeats = mockOccupancyData.reduce((sum, cabin) => sum + cabin.totalSeats, 0);
    const totalMockOccupied = mockOccupancyData.reduce((sum, cabin) => sum + cabin.occupiedSeats, 0);
    const totalMockAvailable = mockOccupancyData.reduce((sum, cabin) => sum + cabin.availableSeats, 0);
    const totalMockPending = mockOccupancyData.reduce((sum, cabin) => sum + cabin.pendingBookings, 0);
    const avgMockOccupancy = (totalMockOccupied / totalMockSeats) * 100;
    
    setTotalSeats(totalMockSeats);
    setOccupiedSeats(totalMockOccupied);
    setAvailableSeats(totalMockAvailable);
    setOverallOccupancy(avgMockOccupancy);
    setTotalPendingBookings(totalMockPending);
  };

  // Generate mock occupancy trend data for fallback
  const generateMockOccupancyTrend = (timeframe: string) => {
    let data = [];
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const now = new Date();
    
    switch(timeframe) {
      case 'daily':
        data = Array.from({ length: 24 }, (_, i) => ({
          time: `${i}:00`,
          occupancyRate: Math.floor(Math.random() * 40) + 60
        }));
        break;
      case 'weekly':
        data = Array.from({ length: 7 }, (_, i) => ({
          day: days[(now.getDay() + i) % 7],
          occupancyRate: Math.floor(Math.random() * 30) + 65
        }));
        break;
      case 'monthly':
        data = Array.from({ length: 30 }, (_, i) => ({
          date: `${i + 1}`,
          occupancyRate: Math.floor(Math.random() * 25) + 70
        }));
        break;
    }
    
    return data;
  };

  if (isLoading) {
    return (
      <>
        <ReportSkeleton type="metrics" count={3} />
        <ReportSkeleton type="chart" />
        <ReportSkeleton type="table" />
      </>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="overflow-hidden border-border/50 shadow-sm hover:shadow transition-shadow duration-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2 bg-muted/30">
            <div className="space-y-1">
              <CardTitle className="text-base font-medium text-foreground/90 flex items-center gap-2">
                <PercentIcon className="h-4 w-4 text-primary" />
                Average Occupancy
              </CardTitle>
              <CardDescription>Across all reading rooms</CardDescription>
            </div>
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
              <PercentIcon className="h-5 w-5 text-primary" />
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold mb-2">{overallOccupancy.toFixed(1)}%</div>
            <Progress 
              value={overallOccupancy} 
              className="h-2"
              indicator={
                <div 
                  className="h-full bg-gradient-to-r from-primary/80 to-primary" 
                  style={{ width: `${overallOccupancy}%` }}
                />
              }
            />
          </CardContent>
        </Card>
        
        <Card className="overflow-hidden border-border/50 shadow-sm hover:shadow transition-shadow duration-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2 bg-muted/30">
            <div className="space-y-1">
              <CardTitle className="text-base font-medium text-foreground/90 flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                Seat Availability
              </CardTitle>
              <CardDescription>All reading rooms</CardDescription>
            </div>
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
              <Users className="h-5 w-5 text-primary" />
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">
              {occupiedSeats} / {totalSeats}
            </div>
            <p className="text-sm font-medium text-green-600 mt-1">
              {availableSeats} seats available
            </p>
          </CardContent>
        </Card>
        
        <Card className="overflow-hidden border-border/50 shadow-sm hover:shadow transition-shadow duration-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2 bg-muted/30">
            <div className="space-y-1">
              <CardTitle className="text-base font-medium text-foreground/90 flex items-center gap-2">
                <BookOpenCheck className="h-4 w-4 text-primary" />
                Pending Bookings
              </CardTitle>
              <CardDescription>Awaiting confirmation</CardDescription>
            </div>
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
              <BookOpenCheck className="h-5 w-5 text-primary" />
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{totalPendingBookings}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {totalPendingBookings > 0 ? `${totalPendingBookings} bookings require attention` : 'No pending bookings'}
            </p>
          </CardContent>
        </Card>
      </div>
      <Card className="overflow-hidden border-border/50 shadow-md">
        <CardHeader className="bg-muted/30">
          <CardTitle className="text-lg font-medium text-foreground/90 flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            Room-wise Occupancy
          </CardTitle>
          <CardDescription>Current occupancy rates for each reading room</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Reading Room</TableHead>
                  <TableHead>Occupancy</TableHead>
                  <TableHead>Seats (Booked/Total)</TableHead>
                  <TableHead className="text-right">Available</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                  <TableHead className="text-right">Pending</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {occupancyData.length > 0 ? (
                  occupancyData.map((cabin) => (
                    <TableRow key={cabin.cabinId}>
                      <TableCell className="font-medium">{cabin.cabinName}</TableCell>
                      <TableCell>
                        <div className="w-[100px] h-5 flex items-center">
                          <Progress
                            value={cabin.occupancyRate}
                            className="h-2"
                            indicator={
                              <div 
                                className={`h-full ${
                                  cabin.occupancyRate > 85 ? 'bg-red-500' : 
                                  cabin.occupancyRate > 70 ? 'bg-amber-500' : 
                                  'bg-green-500'
                                }`}
                                style={{ width: `${cabin.occupancyRate}%` }}
                              />
                            }
                          />
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="flex items-center gap-1">
                          <span className="font-medium">{cabin.occupiedSeats}</span>
                          <span className="text-muted-foreground">/</span> 
                          <span>{cabin.totalSeats}</span>
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="font-medium text-green-600">{cabin.availableSeats}</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={`
                          font-medium px-2 py-1 rounded-full text-xs
                          ${cabin.occupancyRate > 85 ? 'bg-red-100 text-red-800' : 
                            cabin.occupancyRate > 70 ? 'bg-amber-100 text-amber-800' : 
                            'bg-green-100 text-green-800'
                          }
                        `}>
                          {cabin.occupancyRate.toFixed(1)}%
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={`
                          ${cabin.pendingBookings > 0 ? 'text-amber-500 font-medium' : 'text-muted-foreground'}
                        `}>
                          {cabin.pendingBookings}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No occupancy data available
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      <Card className="mb-6 overflow-hidden border-border/50 shadow-md">
        <CardHeader className="bg-muted/30">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-medium text-foreground/90 flex items-center gap-2">
                <PercentIcon className="h-4 w-4 text-primary" />
                Occupancy Trend
              </CardTitle>
              <CardDescription>Occupancy rates over time</CardDescription>
            </div>
            <Tabs value={timeframe} onValueChange={(v) => setTimeframe(v as any)}>
              <TabsList className="grid grid-cols-3 w-[300px] bg-muted/50">
                <TabsTrigger value="daily">Daily</TabsTrigger>
                <TabsTrigger value="weekly">Weekly</TabsTrigger>
                <TabsTrigger value="monthly">Monthly</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <EnhancedChart height={300}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={occupancyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" strokeOpacity={0.4} />
                <XAxis 
                  dataKey={timeframe === 'daily' ? 'time' : timeframe === 'weekly' ? 'day' : 'date'} 
                  tick={{ fill: 'var(--foreground)', fontSize: 12, opacity: 0.8 }}
                />
                <YAxis 
                  domain={[0, 100]} 
                  tickFormatter={(value) => `${value}%`} 
                  tick={{ fill: 'var(--foreground)', fontSize: 12, opacity: 0.8 }}
                />
                <Tooltip 
                  content={<ChartTooltipContent />}
                  formatter={(value: any) => [`${value}%`, 'Occupancy Rate']} 
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="occupancyRate" 
                  name="Occupancy"
                  stroke="url(#occupancyGradient)"
                  strokeWidth={2}
                  dot={{ r: 3, stroke: 'var(--primary)', strokeWidth: 1, fill: 'var(--background)' }}
                  activeDot={{ r: 5, stroke: 'var(--primary)', strokeWidth: 1, fill: 'var(--primary)' }}
                />
                <defs>
                  <linearGradient id="occupancyGradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.8}/>
                    <stop offset="100%" stopColor="var(--secondary)" stopOpacity={0.8}/>
                  </linearGradient>
                </defs>
              </LineChart>
            </ResponsiveContainer>
          </EnhancedChart>
        </CardContent>
      </Card>
      

    </>
  );
}
