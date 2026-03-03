
import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { adminBookingsService } from '@/api/adminBookingsService';
import { Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

export function DashboardExpiringBookings() {
  const [expiringBookings, setExpiringBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const hasFetchedRef = useRef(false);

 useEffect(() => {
    if (hasFetchedRef.current) return;
      hasFetchedRef.current = true;
    const fetchExpiringBookings = async () => {
      try {
        setLoading(true);
        const response = await adminBookingsService.getExpiringBookings(7);
        
        if (response.success && response.data) {
          setExpiringBookings(response.data.slice(0, 5));
        }
      } catch (error) {
        console.error('Error fetching expiring bookings:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchExpiringBookings();
  }, []);

  const handleViewAll = () => {
    navigate('/admin/reports');
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), 'MMM dd, yyyy');
    } catch {
      return 'N/A';
    }
  };

  return (
    <Card className="border-l-4 border-l-primary">
      <CardHeader className="pb-1 pt-3 px-4 bg-primary/5">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            Expiring Bookings
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={handleViewAll} className="text-primary hover:text-primary/80">
            View All
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center gap-2">
                <Skeleton className="h-12 w-full" />
              </div>
            ))}
          </div>
        ) : expiringBookings.length === 0 ? (
          <p className="text-center text-muted-foreground py-4">
            No bookings expiring soon
          </p>
        ) : (
          <div className="space-y-2">
            {expiringBookings.map((booking) => {
              const profile = booking.profiles as any;
              const cabin = booking.cabins as any;
              const seat = booking.seats as any;
              const studentName = profile?.name || booking.customer_name || 'Student';
              const studentPhone = profile?.phone || '';
              const studentEmail = profile?.email || '';
              const cabinName = cabin?.name || 'Cabin';
              const seatNumber = seat?.number || 'N/A';

              return (
                <div 
                  key={booking.id} 
                  className="flex justify-between items-center p-1.5 rounded-md hover:bg-primary/5 cursor-pointer transition-colors"
                  onClick={() => navigate(`/admin/bookings/${booking.id}/cabin`)}
                >
                  <div>
                    <p className="font-medium">{studentName}</p>
                    {(studentPhone || studentEmail) && (
                      <p className="text-xs text-muted-foreground">
                        {studentPhone}{studentPhone && studentEmail ? ' · ' : ''}{studentEmail}
                      </p>
                    )}
                    <p className="text-sm text-muted-foreground">
                      {cabinName} - Seat {seatNumber}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline" className="border-amber-500 text-amber-500">
                      Expires {formatDate(booking.end_date)}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
