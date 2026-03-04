
import { useState, useEffect, useRef } from 'react';
import { adminBookingsService } from '@/api/adminBookingsService';

export type DashboardStatistics = {
  totalRevenue: number;
  revenueToday: number;
  pendingPayments: number;
  activeSubscriptions: number;
  newSubscriptionsThisMonth: number;
  occupancyRate: number;
  pendingSeats: number;
  availableSeats: number;
  totalCabins: number;
  currentYear: number;
};

export function useDashboardStatistics(partnerUserId?: string) {
  const [statistics, setStatistics] = useState<DashboardStatistics>({
    totalRevenue: 0,
    revenueToday: 0,
    pendingPayments: 0,
    activeSubscriptions: 0,
    newSubscriptionsThisMonth: 0,
    occupancyRate: 0,
    pendingSeats: 0,
    availableSeats: 0,
    totalCabins: 0,
    currentYear: 0
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasFetchedRef = useRef(false);

  useEffect(() => {
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;

    const fetchDashboardStatistics = async () => {
      setLoading(true);
      setError(null);
      try {
        // Single RPC call replaces 4+ separate full-table queries
        const result = await adminBookingsService.getDashboardStats(partnerUserId);
        if (!result.success || !result.data) throw new Error('Failed to load');

        const d = result.data;
        const totalCapacity = d.total_capacity || 0;
        const activeResidents = d.active_residents || 0;
        const occupancyRate = totalCapacity > 0 ? Math.round((activeResidents / totalCapacity) * 100) : 0;

        setStatistics({
          totalRevenue: d.total_revenue || 0,
          revenueToday: d.today_revenue || 0,
          currentYear: d.current_year || 0,
          pendingPayments: d.pending_bookings || 0,
          activeSubscriptions: d.completed_bookings || 0,
          newSubscriptionsThisMonth: 0,
          occupancyRate,
          pendingSeats: 0,
          availableSeats: d.available_seats || 0,
          totalCabins: d.total_bookings || 0,
        });
      } catch (err) {
        console.error('Error fetching dashboard statistics:', err);
        setError('Failed to load dashboard statistics');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardStatistics();
  }, []);

  return { statistics, loading, error };
}
