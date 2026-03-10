
import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DynamicStatisticsCards } from './DynamicStatisticsCards';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { adminBookingsService } from '@/api/adminBookingsService';
import { OccupancyChart } from './OccupancyChart';
import { RevenueChart } from './RevenueChart';
import { DashboardExpiringBookings } from './DashboardExpiringBookings';
import { TrendingUp } from 'lucide-react';
import ErrorBoundary from '@/components/ErrorBoundary';
import { EmptyState } from '@/components/ui/empty-state';
import { useAuth } from '@/contexts/AuthContext';
import { getEffectiveOwnerId } from '@/utils/getEffectiveOwnerId';

interface TopFillingRoom {
  id: string;
  name: string;
  occupancyRate: number;
  category: string;
  totalSeats: number;
  bookedSeats: number;
}

export function DashboardStatistics() {
  const { user } = useAuth();
  const [topFillingRooms, setTopFillingRooms] = useState<TopFillingRoom[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState(false);
  const hasFetchedRef = useRef(false);
  const [partnerUserId, setPartnerUserId] = useState<string | undefined>(
    user?.role === 'vendor' ? user.id : undefined
  );

  useEffect(() => {
    if (user?.role === 'vendor_employee') {
      getEffectiveOwnerId().then(({ ownerId }) => setPartnerUserId(ownerId));
    }
  }, [user]);

  const fetchDashboardData = async (pId?: string) => {
    try {
      setLoading(true);
      setError(false);
      const topRoomsResponse = await adminBookingsService.getTopFillingRooms(10, pId);
      if (topRoomsResponse.success && topRoomsResponse.data) {
        setTopFillingRooms(topRoomsResponse.data.slice(0, 10));
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hasFetchedRef.current) return;
    // Wait for employee resolution
    if (user?.role === 'vendor_employee' && !partnerUserId) return;
    hasFetchedRef.current = true;
    fetchDashboardData(partnerUserId);
  }, [partnerUserId]);
  
  const getCategoryBadgeColor = (category: string) => {
    switch (category.toLowerCase()) {
      case 'luxury': return 'bg-purple-500 hover:bg-purple-600';
      case 'premium': return 'bg-blue-500 hover:bg-blue-600';
      case 'standard': return 'bg-green-500 hover:bg-green-600';
      default: return 'bg-gray-500 hover:bg-gray-600';
    }
  };

  return (
    <div className="space-y-3">
      <ErrorBoundary>
        <DynamicStatisticsCards />
      </ErrorBoundary>

      {/* Top Filling Reading Rooms */}
      <Card className="shadow-sm">
        <CardHeader className="pb-2 border-b">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Top Filling Reading Rooms
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">Rooms with highest seat occupancy rates</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-2 p-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : error ? (
            <EmptyState
              icon={TrendingUp}
              title="No data available"
              description="Unable to fetch data. Please refresh."
              onRetry={() => { hasFetchedRef.current = false; fetchDashboardData(); }}
            />
          ) : topFillingRooms.length === 0 ? (
            <EmptyState icon={TrendingUp} title="No room data available" />
          ) : (
            <>
              {/* Mobile cards */}
              <div className="block md:hidden space-y-3 p-3">
                {topFillingRooms.map((room, idx) => (
                  <div key={room.id} className="border rounded-lg p-3 bg-card space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-xs">{idx + 1}. {room.name}</span>
                      <Badge className={`capitalize text-[10px] ${getCategoryBadgeColor(room.category)}`}>{room.category}</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className="h-full bg-primary rounded-full" style={{ width: `${room.occupancyRate}%` }} />
                      </div>
                      <span className="text-xs font-medium">{room.occupancyRate}%</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">{room.bookedSeats} / {room.totalSeats} seats booked</p>
                  </div>
                ))}
              </div>
              {/* Desktop table */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead className="font-semibold text-xs">#</TableHead>
                      <TableHead className="font-semibold text-xs">Room Name</TableHead>
                      <TableHead className="font-semibold text-xs">Category</TableHead>
                      <TableHead className="font-semibold text-xs">Occupancy</TableHead>
                      <TableHead className="font-semibold text-xs">Booked / Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topFillingRooms.map((room, idx) => (
                      <TableRow key={room.id} className={idx % 2 === 0 ? "bg-background" : "bg-muted/20"}>
                        <TableCell className="text-muted-foreground text-xs w-8">{idx + 1}</TableCell>
                        <TableCell className="font-medium text-xs">{room.name}</TableCell>
                        <TableCell>
                          <Badge className={`capitalize ${getCategoryBadgeColor(room.category)}`}>
                            {room.category}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-20 h-1.5 rounded-full bg-muted overflow-hidden">
                              <div className="h-full bg-primary rounded-full" style={{ width: `${room.occupancyRate}%` }} />
                            </div>
                            <span className="text-xs font-medium">{room.occupancyRate}%</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs">
                          <span className="font-medium">{room.bookedSeats}</span>
                          <span className="text-muted-foreground"> / {room.totalSeats}</span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
      
      {/* Charts Row */}
      <div className="grid md:grid-cols-2 gap-3">
        <ErrorBoundary>
          <RevenueChart />
        </ErrorBoundary>
        <ErrorBoundary>
          <OccupancyChart />
        </ErrorBoundary>
      </div>
      
      {/* Expiring Bookings */}
      <ErrorBoundary>
        <DashboardExpiringBookings />
      </ErrorBoundary>
    </div>
  );
}
