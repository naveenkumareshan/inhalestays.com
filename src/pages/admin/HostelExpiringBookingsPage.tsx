
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarRange, Calendar, Phone, Mail } from 'lucide-react';
import { adminBookingsService } from '@/api/adminBookingsService';
import { format, differenceInDays } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { getEffectiveOwnerId } from '@/utils/getEffectiveOwnerId';
import { useAuth } from '@/contexts/AuthContext';

export default function HostelExpiringBookingsPage() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [daysThreshold, setDaysThreshold] = useState('7');
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    fetchData();
  }, [daysThreshold]);

  const fetchData = async () => {
    setLoading(true);
    try {
      let partnerUserId: string | undefined;
      if (user?.role !== 'admin') {
        const { ownerId } = await getEffectiveOwnerId();
        partnerUserId = ownerId;
      }
      const response = await adminBookingsService.getExpiringHostelBookings(parseInt(daysThreshold), partnerUserId);
      if (response.success && response.data) {
        setBookings(Array.isArray(response.data) ? response.data : []);
      } else {
        setBookings([]);
      }
    } catch {
      setBookings([]);
    } finally {
      setLoading(false);
    }
  };

  const getDaysRemaining = (endDate: string) => {
    return Math.max(0, differenceInDays(new Date(endDate), new Date()));
  };

  const getStatusColor = (days: number) => {
    if (days <= 2) return 'destructive';
    if (days <= 5) return 'warning';
    return 'secondary';
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <Card className="overflow-hidden border-border/50 shadow-md">
        <CardHeader className="bg-muted/30">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg font-medium text-foreground/90 flex items-center gap-2">
                <CalendarRange className="h-4 w-4 text-primary" />
                Expiring Hostel Bookings
              </CardTitle>
              <CardDescription>Hostel bookings that will expire soon</CardDescription>
            </div>
            <div className="flex items-center">
              <span className="mr-2 text-sm text-muted-foreground">Expiring within:</span>
              <Select value={daysThreshold} onValueChange={setDaysThreshold}>
                <SelectTrigger className="w-24">
                  <SelectValue />
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
          ) : bookings.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Booking ID</TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead>Hostel</TableHead>
                    <TableHead>Bed</TableHead>
                    <TableHead>Expires In</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bookings.map((booking) => {
                    const profile = booking.profiles as any;
                    const hostel = booking.hostels as any;
                    const bed = booking.hostel_beds as any;
                    const room = booking.hostel_rooms as any;
                    const days = getDaysRemaining(booking.end_date);

                    return (
                      <TableRow key={booking.id}>
                        <TableCell className="font-medium">
                          {booking.serial_number || booking.id.substring(0, 8)}
                        </TableCell>
                        <TableCell>
                          {profile?.name || 'N/A'}
                          {profile?.email && (
                            <div className="text-xs text-muted-foreground flex items-center mt-1">
                              <Mail className="h-3 w-3 mr-1" />{profile.email}
                            </div>
                          )}
                          {profile?.phone && (
                            <div className="text-xs text-muted-foreground flex items-center mt-1">
                              <Phone className="h-3 w-3 mr-1" />{profile.phone}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {hostel?.name || 'N/A'}
                          {room?.room_number && (
                            <div className="text-xs text-muted-foreground">Room {room.room_number}</div>
                          )}
                        </TableCell>
                        <TableCell>Bed {bed?.bed_number || 'N/A'}</TableCell>
                        <TableCell>
                          <Badge variant={getStatusColor(days) as any}>
                            {days} {days === 1 ? 'day' : 'days'}
                          </Badge>
                          <div className="text-xs text-muted-foreground mt-1">
                            {format(new Date(booking.end_date), 'MMM d, yyyy')}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/admin/bookings/${booking.id}/hostel`)}
                          >
                            View
                          </Button>
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
              <p className="text-muted-foreground">No hostel bookings expiring within {daysThreshold} days</p>
              <Button variant="outline" className="mt-4" onClick={() => setDaysThreshold('30')}>
                Check next 30 days
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
