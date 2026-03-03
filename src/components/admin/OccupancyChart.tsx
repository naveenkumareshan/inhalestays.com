
import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { adminBookingsService } from '@/api/adminBookingsService';
import { EmptyState } from '@/components/ui/empty-state';
import { TrendingUp } from 'lucide-react';

export function OccupancyChart() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const fetched = useRef(false);

  useEffect(() => {
    if (fetched.current) return;
    fetched.current = true;
    const fetchMonthlyOccupancy = async () => {
      try {
        setLoading(true);
        const response = await adminBookingsService.getMonthlyOccupancy();
        
        if (response.success && response.data) {
          const chartData = response.data.map((month: any) => ({
            name: month.monthName.slice(0, 3),
            occupancy: month.occupancyRate
          }));
          setData(chartData);
        }
      } catch (err) {
        console.error('Error fetching monthly occupancy:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchMonthlyOccupancy();
  }, []);
  const config = {
    occupancy: {
      label: 'Occupancy',
      color: 'hsl(105, 35%, 55%)',
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2 pt-4 px-4 bg-secondary/5">
        <CardTitle className="text-sm font-semibold text-secondary">Occupancy Rate</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[220px] w-full">
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-[240px] w-full" />
            </div>
          ) : (
            error ? (
              <EmptyState icon={TrendingUp} title="No occupancy data" description="Unable to fetch data. Please refresh." />
            ) : data.length === 0 ? (
              <EmptyState icon={TrendingUp} title="No occupancy data available" />
            ) : (
            <ChartContainer config={config}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
                  <Tooltip content={<ChartTooltipContent />} />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="occupancy" 
                    stroke="hsl(105, 35%, 55%)" 
                    strokeWidth={2} 
                    dot={{ r: 4 }} 
                    activeDot={{ r: 6 }}
                    name="Occupancy Rate (%)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
            )
          )}
        </div>
      </CardContent>
    </Card>
  );
}
