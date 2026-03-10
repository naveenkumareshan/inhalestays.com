
import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart as BarChartIcon } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { adminBookingsService } from '@/api/adminBookingsService';
import { EmptyState } from '@/components/ui/empty-state';
import { useAuth } from '@/contexts/AuthContext';
import { getEffectiveOwnerId } from '@/utils/getEffectiveOwnerId';

export function RevenueChart() {
  const { user } = useAuth();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

 const fetched = useRef(false);

useEffect(() => {
  if (fetched.current) return;

  const fetchMonthlyRevenue = async () => {
    try {
      setLoading(true);
      let partnerUserId: string | undefined;
      if (user?.role === 'vendor') partnerUserId = user.id;
      else if (user?.role === 'vendor_employee') {
        const { ownerId } = await getEffectiveOwnerId();
        partnerUserId = ownerId;
      }
      const response = await adminBookingsService.getMonthlyRevenue(new Date().getFullYear(), partnerUserId);
      if (response.success && response.data) {
        const chartData = response.data.map((month: any) => ({
          name: month.monthName.slice(0, 3),
          revenue: month.revenue
        }));
        setData(chartData);
      }
    } catch (err) {
      console.error('Error fetching monthly revenue:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  fetchMonthlyRevenue();
  fetched.current = true;
}, []);

  const config = {
    revenue: {
      label: 'Revenue',
      color: 'hsl(207, 52%, 33%)',
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2 pt-4 px-4 bg-primary/5">
        <CardTitle className="text-sm font-semibold text-primary">Monthly Revenue</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[200px] w-full">
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-[240px] w-full" />
            </div>
          ) : (
            error ? (
              <EmptyState icon={BarChartIcon} title="No revenue data" description="Unable to fetch data. Please refresh." />
            ) : data.length === 0 ? (
              <EmptyState icon={BarChartIcon} title="No revenue data available" />
            ) : (
            <ChartContainer config={config}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis tickFormatter={(value) => `₹${value / 1000}K`} />
                  <Tooltip content={<ChartTooltipContent />} formatter={(value) => [`₹${value}`, 'Revenue']} />
                  <Legend />
                  <Bar 
                    dataKey="revenue" 
                    fill="hsl(207, 52%, 33%)" 
                    name="Monthly Revenue"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
            )
          )}
        </div>
      </CardContent>
    </Card>
  );
}