
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import { adminBookingsService } from '@/api/adminBookingsService';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, isWithinInterval } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface BookingEvent {
  id: string;
  bookingId: string;
  userId: { name: string; email: string };
  cabinId: { name: string; _id: string };
  seatId: { number: number };
  startDate: string;
  endDate: string;
  status: string;
  paymentStatus: string;
  totalPrice: number;
}

interface Cabin {
  _id: string;
  name: string;
  category: string;
}

const BOOKING_COLORS = [
  'bg-blue-500',
  'bg-green-500',
  'bg-purple-500',
  'bg-orange-500',
  'bg-pink-500',
  'bg-yellow-500',
  'bg-red-500',
  'bg-indigo-500',
  'bg-teal-500'
];

export const BookingCalendarDashboard = ({ partnerUserId }: { partnerUserId?: string }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [bookings, setBookings] = useState<BookingEvent[]>([]);
  const [cabins, setCabins] = useState<Cabin[]>([]);
  const [selectedCabin, setSelectedCabin] = useState<string>('all');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  useEffect(() => {
    fetchBookings();
    fetchCabins();
  }, [currentDate, selectedCabin]);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const filters = {
        startDate: format(monthStart, 'yyyy-MM-dd'),
        endDate: format(monthEnd, 'yyyy-MM-dd'),
        ...(selectedCabin !== 'all' && { cabinId: selectedCabin })
      };

      const response = await adminBookingsService.getAllBookings(filters);
      if (response.success && response.data) {
        setBookings(response.data as any);
      }
    } catch (error) {
      console.error('Error fetching bookings:', error);
      toast({
        title: "Error",
        description: "Failed to fetch bookings",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchCabins = async () => {
    try {
      const response = await cabinsService.getAllCabins();
        if (response.success && response.data) {
        setCabins((response.data as any[]).map((c: any) => ({ _id: c.id || c._id, name: c.name, category: c.category })));
      }
    } catch (error) {
      console.error('Error fetching cabins:', error);
    }
  };

  const getBookingsForDay = (day: Date) => {
    return bookings.filter(booking => {
      const bookingStart = new Date(booking.startDate);
      const bookingEnd = new Date(booking.endDate);
      return isWithinInterval(day, { start: bookingStart, end: bookingEnd });
    });
  };

  const getBookingColor = (cabinId: string) => {
    const index = cabins.findIndex(cabin => cabin._id === cabinId);
    return BOOKING_COLORS[index % BOOKING_COLORS.length];
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => 
      direction === 'prev' ? subMonths(prev, 1) : addMonths(prev, 1)
    );
  };

  const renderBookingBar = (booking: BookingEvent, day: Date) => {
    const bookingStart = new Date(booking.startDate);
    const bookingEnd = new Date(booking.endDate);
    const isStartDay = isSameDay(day, bookingStart);
    const isEndDay = isSameDay(day, bookingEnd);
    
    let barClass = `h-1 ${getBookingColor(booking.cabinId._id)} mb-1`;
    
    if (isStartDay && isEndDay) {
      barClass += ' rounded';
    } else if (isStartDay) {
      barClass += ' rounded-l';
    } else if (isEndDay) {
      barClass += ' rounded-r';
    }
    
    return (
      <div
        key={booking.id}
        className={barClass}
        title={`${booking.userId.name} - ${booking.cabinId.name} Seat ${booking.seatId.number}`}
      />
    );
  };

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Booking Calendar Dashboard
            </CardTitle>
            
            <div className="flex items-center gap-4">
              <Select value={selectedCabin} onValueChange={setSelectedCabin}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Select reading room" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Reading Rooms</SelectItem>
                  {cabins.map(cabin => (
                    <SelectItem key={cabin._id} value={cabin._id}>
                      {cabin.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => navigateMonth('prev')}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="font-medium min-w-[120px] text-center">
                  {format(currentDate, 'MMMM yyyy')}
                </span>
                <Button variant="outline" size="sm" onClick={() => navigateMonth('next')}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Calendar Grid */}
      <Card>
        <CardContent className="p-6">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-2">
              {/* Day Headers */}
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="p-2 text-center font-medium text-muted-foreground">
                  {day}
                </div>
              ))}
              
              {/* Calendar Days */}
              {calendarDays.map((day, index) => {
                const dayBookings = getBookingsForDay(day);
                const isToday = isSameDay(day, new Date());
                
                return (
                  <div
                    key={index}
                    className={`min-h-[100px] p-2 border rounded-lg relative ${
                      isToday ? 'border-primary bg-primary/5' : 'border-muted'
                    }`}
                  >
                    <div className={`text-sm font-medium mb-2 ${
                      isToday ? 'text-primary' : 'text-foreground'
                    }`}>
                      {format(day, 'd')}
                    </div>
                    
                    {/* Booking Bars */}
                    <div className="space-y-1">
                      {dayBookings.slice(0, 8).map(booking => 
                        renderBookingBar(booking, day)
                      )}
                      {dayBookings.length > 8 && (
                        <div className="text-xs text-muted-foreground">
                          +{dayBookings.length - 8} more
                        </div>
                      )}
                    </div>
                    
                    {/* Booking Count Badge */}
                    {dayBookings.length > 0 && (
                      <Badge
                        variant="secondary"
                        className="absolute top-1 right-1 text-xs"
                      >
                        {dayBookings.length}
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Legend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Legend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {cabins.map((cabin, index) => (
              <div key={cabin._id} className="flex items-center gap-2">
                <div className={`w-4 h-4 rounded ${BOOKING_COLORS[index % BOOKING_COLORS.length]}`} />
                <span className="text-sm">{cabin.name}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
