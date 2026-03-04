
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useDashboardStatistics } from '@/hooks/use-dashboard-statistics';
import { BarChart, TrendingUp, AlertCircle, UserCheck } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { adminBookingsService } from '@/api/adminBookingsService';
import { useAuth } from '@/contexts/AuthContext';

export function DynamicStatisticsCards() {
  const { user } = useAuth();
  const partnerUserId = user?.role === 'vendor' ? user.id : undefined;
  const { statistics, loading, error } = useDashboardStatistics(partnerUserId);
  const [activeResidents, setActiveResidents] = useState({
    activeResidents: 0,
    totalCapacity: 0,
    occupancyPercentage: 0
  });
  const [residentsLoading, setResidentsLoading] = useState(true);

const hasFetched = useRef(false);

useEffect(() => {
  if (hasFetched.current) return;

  const fetchActiveResidents = async () => {
    try {
      const response = await adminBookingsService.getActiveResidents(partnerUserId);
      if (response.success) {
        setActiveResidents(response.data as any);
      }
    } catch (error) {
      console.error('Error fetching active residents:', error);
    } finally {
      setResidentsLoading(false);
    }
  };

  fetchActiveResidents();
  hasFetched.current = true;
}, []);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
      <Card className="shadow-none border rounded-lg border-l-4 border-l-primary">
        <div className="p-3 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Revenue</p>
            {loading ? <Skeleton className="h-6 w-20 mt-1" /> : (
              <>
                <p className="text-xl font-bold mt-0.5 text-primary">₹{statistics.totalRevenue.toLocaleString()}</p>
                <p className="text-[10px] text-secondary">₹{statistics.revenueToday.toLocaleString()} today</p>
              </>
            )}
          </div>
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
            <BarChart className="h-4 w-4 text-primary" />
          </div>
        </div>
      </Card>

      <Card className="shadow-none border rounded-lg border-l-4 border-l-secondary">
        <div className="p-3 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Active Residents</p>
            {residentsLoading ? <Skeleton className="h-6 w-14 mt-1" /> : (
              <>
                <p className="text-xl font-bold mt-0.5 text-secondary">{activeResidents.activeResidents}</p>
                <p className="text-[10px] text-muted-foreground">{activeResidents.occupancyPercentage}% occupancy</p>
              </>
            )}
          </div>
          <div className="h-8 w-8 rounded-full bg-secondary/10 flex items-center justify-center">
            <UserCheck className="h-4 w-4 text-secondary" />
          </div>
        </div>
      </Card>

      <Card className="shadow-none border rounded-lg border-l-4 border-l-accent">
        <div className="p-3 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Seat Availability</p>
            {loading ? <Skeleton className="h-6 w-14 mt-1" /> : (
              <p className="text-xl font-bold mt-0.5 text-accent-foreground">{statistics.availableSeats}</p>
            )}
          </div>
          <div className="h-8 w-8 rounded-full bg-accent/20 flex items-center justify-center">
            <TrendingUp className="h-4 w-4 text-accent-foreground" />
          </div>
        </div>
      </Card>

      <Card className="shadow-none border rounded-lg border-l-4 border-l-destructive">
        <div className="p-3 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Pending Payments</p>
            {loading ? <Skeleton className="h-6 w-20 mt-1" /> : (
              <p className="text-xl font-bold mt-0.5 text-destructive">₹{statistics.pendingPayments.toLocaleString()}</p>
            )}
          </div>
          <div className="h-8 w-8 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertCircle className="h-4 w-4 text-destructive" />
          </div>
        </div>
      </Card>
    </div>
  );
}
