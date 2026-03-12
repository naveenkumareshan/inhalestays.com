
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarRange, Calendar, Phone, Mail } from 'lucide-react';
import { adminBookingsService } from '@/api/adminBookingsService';
import { format, differenceInDays, addDays } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

export function ExpiringBookings({ partnerUserId }: { partnerUserId?: string }) {
  const [expiringBookings, setExpiringBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [daysThreshold, setDaysThreshold] = useState('7');
  const { toast } = useToast();
  const navigate = useNavigate();
  

  useEffect(() => {
    fetchExpiringBookings();
  }, [daysThreshold]);

  const fetchExpiringBookings = async () => {
    setLoading(true);
    try {
      const response = await adminBookingsService.getExpiringBookings(parseInt(daysThreshold), partnerUserId);
            
      if (response.success && response.data) {
        setExpiringBookings(Array.isArray(response.data) ? response.data : []);
      } else {
        toast({
          title: "Error",
          description: "Failed to fetch expiring bookings",
          variant: "destructive"
        });
        setExpiringBookings([]);
      }
    } catch (error) {
      console.error('Error fetching expiring bookings:', error);
      toast({
        title: "Error",
        description: "Failed to fetch expiring bookings",
        variant: "destructive"
      });
      setExpiringBookings([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRenewBooking = (bookingId: string) => {
    navigate(`/admin/bookings/${bookingId}/cabin`) // bookingId here is already the _id from the row
  };

  const handleContactStudent = (studentId: string, studentName: string, method: 'email' | 'phone') => {
    toast({
      title: "Contact initiated",
      description: `Contacting ${studentName} via ${method} about their expiring booking`,
    });
  };

  const getDaysRemaining = (endDate: string) => {
    const today = new Date();
    const expiryDate = new Date(endDate);
    return Math.max(0, differenceInDays(expiryDate, today));
  };

  const getStatusColor = (daysRemaining: number) => {
    if (daysRemaining <= 2) return "destructive";
    if (daysRemaining <= 5) return "warning";
    return "secondary";
  };

  return (
    <Card className="overflow-hidden border-border/50 shadow-md">
      <CardHeader className="bg-muted/30">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-lg font-medium text-foreground/90 flex items-center gap-2">
              <CalendarRange className="h-4 w-4 text-primary" />
              Expiring Bookings
            </CardTitle>
            <CardDescription>Bookings that will expire soon</CardDescription>
          </div>
          <div className="flex items-center">
            <span className="mr-2 text-sm text-muted-foreground">Show bookings expiring within:</span>
            <Select
              value={daysThreshold}
              onValueChange={setDaysThreshold}
            >
              <SelectTrigger className="w-24">
                <SelectValue placeholder="7 days" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Today</SelectItem>
                <SelectItem value="2">2 days</SelectItem>
                <SelectItem value="3">3 days</SelectItem>
                <SelectItem value="7">7 days</SelectItem>
                <SelectItem value="14">14 days</SelectItem>
                <SelectItem value="30">30 days</SelectItem>
                <SelectItem value="60">60 days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : expiringBookings.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Booking ID</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>Room</TableHead>
                  <TableHead>Seat</TableHead>
                  <TableHead>Expires In</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expiringBookings.map((booking) => {
                  const daysRemaining = getDaysRemaining(booking.endDate);
                  const statusColor = getStatusColor(daysRemaining);
                  
                  return (
                    <TableRow key={booking._id}>
                      <TableCell className="font-medium">
                        {booking.bookingId || booking._id.substring(0, 8)}
                      </TableCell>
                      <TableCell>
                        {booking.userId?.name || 'N/A'}
                        {booking.userId?.email && (
                          <div className="text-xs text-muted-foreground flex items-center mt-1">
                            <Mail className="h-3 w-3 mr-1" />
                            {booking.userId.email}
                          </div>
                        )}
                        {booking.userId?.phone && (
                          <div className="text-xs text-muted-foreground flex items-center mt-1">
                            <Phone className="h-3 w-3 mr-1" />
                            {booking.userId.phone}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {booking.cabinId?.name || 'N/A'}
                        {booking.cabinId?.category && (
                          <div className="text-xs capitalize text-muted-foreground">
                            {booking.cabinId.category}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {booking.seatId?.number || 'N/A'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusColor as any}>
                          {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'}
                        </Badge>
                        <div className="text-xs text-muted-foreground mt-1">
                          {format(new Date(booking.endDate), 'MMM d, yyyy')}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="w-full"
                            onClick={() => handleRenewBooking(booking.bookingId || booking._id)}
                          >
                            View
                          </Button>
                          <div className="flex gap-2">
                            {/* {booking.userId?.email && (
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleContactStudent(booking.userId?._id, booking.userId?.name, 'email')}
                                className="flex-1"
                              >
                                <Mail className="h-3 w-3 mr-1" /> Email
                              </Button>
                            )} */}
                            {booking.userId?.phoneNumber && (
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleContactStudent(booking.userId?._id, booking.userId?.name, 'phone')}
                                className="flex-1"
                              >
                                <Phone className="h-3 w-3 mr-1" /> Call
                              </Button>
                            )}
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16">
            <Calendar className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">No bookings are expiring within {daysThreshold} days</p>
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => setDaysThreshold('30')}
            >
              Check next 30 days
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
