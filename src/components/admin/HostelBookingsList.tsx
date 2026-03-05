
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { hostelService } from '@/api/hostelService';
import { Eye, Download, Search, Filter, Calendar } from 'lucide-react';
import { DateFilterSelector } from '@/components/common/DateFilterSelector';
import { getDateRangeFromFilter } from '@/utils/dateFilterUtils';

interface BookingListProps {
  hostelId?: string;
}

export const HostelBookingsList = ({ hostelId }: BookingListProps) => {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [filterStartDate, setFilterStartDate] = useState<Date | undefined>(undefined);
  const [filterEndDate, setFilterEndDate] = useState<Date | undefined>(undefined);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  
  const { toast } = useToast();
  
  useEffect(() => {
    fetchBookings();
  }, [hostelId]);
  
  const fetchBookings = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = hostelId ? { hostel_id: hostelId } : {};
      const response = await hostelService.getAllBookings(params) as any;
      
      if (!response?.length || (response as any).success !== undefined ? (response as any).success : true) {
        setBookings(Array.isArray(response) ? response : (response as any)?.data || response);
      } else {
        setError('Failed to load bookings');
        toast({
          title: "Error",
          description: "Failed to load bookings",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error fetching bookings:', error);
      setError('Failed to load bookings');
      toast({
        title: "Error",
        description: "Failed to load bookings",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleViewDetails = (booking: any) => {
    setSelectedBooking(booking);
    setIsDetailsOpen(true);
  };
  
  const getFilteredBookings = () => {
    let filtered = bookings.filter(booking => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = !searchTerm ||
        (booking.profiles?.name?.toLowerCase().includes(searchLower) || 
         booking.profiles?.email?.toLowerCase().includes(searchLower) ||
         booking.profiles?.phone?.toLowerCase().includes(searchLower) ||
         booking.serial_number?.toLowerCase().includes(searchLower) ||
         booking.id?.toLowerCase().includes(searchLower));
         
      const matchesStatus = statusFilter === 'all' || booking.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });

    const { from, to } = getDateRangeFromFilter(dateFilter, filterStartDate, filterEndDate);
    if (from) {
      const fromStr = format(from, 'yyyy-MM-dd');
      filtered = filtered.filter(b => (b.created_at || b.createdAt || '').slice(0, 10) >= fromStr);
    }
    if (to) {
      const toStr = format(to, 'yyyy-MM-dd');
      filtered = filtered.filter(b => (b.created_at || b.createdAt || '').slice(0, 10) <= toStr);
    }

    return filtered;
  };
  
  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
      case 'pending': return 'bg-amber-50 text-amber-700 border border-amber-200';
      case 'cancelled': return 'bg-red-50 text-red-700 border border-red-200';
      default: return 'bg-muted text-muted-foreground border border-border';
    }
  };

  const getStatusBadge = (status: string) => (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${getStatusBadgeClass(status)}`}>
      {status === 'completed' ? 'Completed' : status}
    </span>
  );
  
  const getPaymentStatusBadge = (status: string) => {
    const cls = status === 'completed'
      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
      : status === 'pending'
      ? 'bg-amber-50 text-amber-700 border border-amber-200'
      : status === 'failed'
      ? 'bg-red-50 text-red-700 border border-red-200'
      : 'bg-muted text-muted-foreground border border-border';
    const label = status === 'completed' ? 'Paid' : status;
    return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${cls}`}>{label}</span>;
  };
  
  const filteredBookings = getFilteredBookings();
  
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search bookings..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="outline" onClick={fetchBookings}>
            <Filter className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
        <DateFilterSelector
          dateFilter={dateFilter}
          startDate={filterStartDate}
          endDate={filterEndDate}
          onDateFilterChange={setDateFilter}
          onStartDateChange={setFilterStartDate}
          onEndDateChange={setFilterEndDate}
          compact
        />
      </div>
      
      <Tabs defaultValue="current">
        <TabsList>
          <TabsTrigger value="current">Current & Upcoming</TabsTrigger>
          <TabsTrigger value="past">Past Bookings</TabsTrigger>
          <TabsTrigger value="all">All Bookings</TabsTrigger>
        </TabsList>
        
        <TabsContent value="current">
          <BookingTable 
            bookings={filteredBookings.filter(b => new Date(b.endDate) >= new Date())}
            loading={loading}
            error={error}
            onViewDetails={handleViewDetails}
            getStatusBadge={getStatusBadge}
            getPaymentStatusBadge={getPaymentStatusBadge}
          />
        </TabsContent>
        
        <TabsContent value="past">
          <BookingTable 
            bookings={filteredBookings.filter(b => new Date(b.endDate) < new Date())}
            loading={loading}
            error={error}
            onViewDetails={handleViewDetails}
            getStatusBadge={getStatusBadge}
            getPaymentStatusBadge={getPaymentStatusBadge}
          />
        </TabsContent>
        
        <TabsContent value="all">
          <BookingTable 
            bookings={filteredBookings}
            loading={loading}
            error={error}
            onViewDetails={handleViewDetails}
            getStatusBadge={getStatusBadge}
            getPaymentStatusBadge={getPaymentStatusBadge}
          />
        </TabsContent>
      </Tabs>
      
      {/* Booking Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Booking Details</DialogTitle>
          </DialogHeader>
          
          {selectedBooking && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-medium mb-2">Booking Information</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Booking ID</span>
                        <span className="font-mono">{selectedBooking._id}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Booking Date</span>
                        <span>{format(new Date(selectedBooking.createdAt), 'PPP')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Status</span>
                        <span>{getStatusBadge(selectedBooking.status)}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-medium mb-2">Student Information</h3>
                    <div className="space-y-2">
                      {selectedBooking.student ? (
                        <>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Name</span>
                            <span>{selectedBooking.student.name}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Email</span>
                            <span>{selectedBooking.student.email}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Phone</span>
                            <span>{selectedBooking.student.phone || 'N/A'}</span>
                          </div>
                        </>
                      ) : (
                        <div className="text-muted-foreground">Student data not available</div>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-medium mb-2">Payment Information</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Payment Status</span>
                        <span>{getPaymentStatusBadge(selectedBooking.paymentStatus)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Payment Method</span>
                        <span>{selectedBooking.paymentMethod || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Payment Date</span>
                        <span>{selectedBooking.paymentDate ? format(new Date(selectedBooking.paymentDate), 'PPP') : 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Total Amount</span>
                        <span className="font-bold">₹{selectedBooking.totalPrice}</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-medium mb-2">Accommodation Details</h3>
                    <div className="space-y-2">
                      {selectedBooking.hostel && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Hostel</span>
                          <span>{selectedBooking.hostel.name}</span>
                        </div>
                      )}
                      {selectedBooking.room && (
                        <>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Room</span>
                            <span>{selectedBooking.room.name} (#{selectedBooking.room.roomNumber})</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Room Type</span>
                            <span>{selectedBooking.room.category.charAt(0).toUpperCase() + selectedBooking.room.category.slice(1)}</span>
                          </div>
                        </>
                      )}
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Sharing Type</span>
                        <span>{selectedBooking.sharingType}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-medium mb-2">Stay Period</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Check-in</span>
                        <span>{format(new Date(selectedBooking.startDate), 'PPP')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Check-out</span>
                        <span>{format(new Date(selectedBooking.endDate), 'PPP')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Duration</span>
                        <span>
                          {selectedBooking.bookingDuration === 'daily' && `${selectedBooking.durationCount} days`}
                          {selectedBooking.bookingDuration === 'weekly' && `${selectedBooking.durationCount} weeks`}
                          {selectedBooking.bookingDuration === 'monthly' && `${selectedBooking.durationCount} months`}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {selectedBooking.notes && (
                    <div>
                      <h3 className="text-lg font-medium mb-2">Notes</h3>
                      <p className="text-muted-foreground">{selectedBooking.notes}</p>
                    </div>
                  )}
                  
                  <div className="pt-4">
                    <Button className="w-full">
                      <Download className="mr-2 h-4 w-4" />
                      Download Receipt
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

interface BookingTableProps {
  bookings: any[];
  loading: boolean;
  error: string | null;
  onViewDetails: (booking: any) => void;
  getStatusBadge: (status: string) => React.ReactNode;
  getPaymentStatusBadge: (status: string) => React.ReactNode;
}

const BookingTable = ({ 
  bookings, 
  loading, 
  error, 
  onViewDetails,
  getStatusBadge,
  getPaymentStatusBadge 
}: BookingTableProps) => {
  if (loading) {
    return (
      <Card>
        <CardContent className="py-10 flex justify-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
        </CardContent>
      </Card>
    );
  }
  
  if (error) {
    return (
      <Card>
        <CardContent className="py-10">
          <div className="text-center text-red-500">{error}</div>
        </CardContent>
      </Card>
    );
  }
  
  if (bookings.length === 0) {
    return (
      <Card>
        <CardContent className="py-10">
          <div className="text-center">
            <Calendar className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-sm font-medium">No Bookings Found</p>
            <p className="text-xs text-muted-foreground mt-1">There are no bookings matching your criteria.</p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
          <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider py-3">Booking ID</TableHead>
                <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider py-3">Student</TableHead>
                <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider py-3">Room Details</TableHead>
                <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider py-3">Check-in / Check-out</TableHead>
                <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider py-3">Amount</TableHead>
                <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider py-3">Payment</TableHead>
                <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider py-3">Status</TableHead>
                <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider py-3 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bookings.map((booking, idx) => (
                <TableRow key={booking._id} className={idx % 2 === 0 ? "bg-background" : "bg-muted/20"}>
                  <TableCell className="font-mono text-xs">
                    {booking._id.substring(0, 8)}...
                  </TableCell>
                  <TableCell>
                    {booking.student ? (
                      <div>
                        <div className="font-medium">{booking.student.name}</div>
                        <div className="text-xs text-muted-foreground">{booking.student.email}</div>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">N/A</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {booking.room ? (
                      <div>
                        <div className="font-medium">{booking.room.name}</div>
                        <div className="text-xs text-muted-foreground">
                          #{booking.room.roomNumber}, {booking.sharingType}
                        </div>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">N/A</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="text-xs">
                      <div>{format(new Date(booking.startDate), 'PP')}</div>
                      <div className="text-muted-foreground mt-1">{format(new Date(booking.endDate), 'PP')}</div>
                    </div>
                  </TableCell>
                  <TableCell>₹{booking.totalPrice}</TableCell>
                  <TableCell>{getPaymentStatusBadge(booking.paymentStatus)}</TableCell>
                  <TableCell>{getStatusBadge(booking.status)}</TableCell>
                  <TableCell className="text-right">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => onViewDetails(booking)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};
