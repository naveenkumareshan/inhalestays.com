
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { adminBookingsService } from '@/api/adminBookingsService';
import { adminSeatsService } from '@/api/adminSeatsService';
import { adminCabinsService } from '@/api/adminCabinsService';
import { ArrowRight, Search, Filter, Download, FileSpreadsheet, Eye } from 'lucide-react';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { format } from 'date-fns';

interface Booking {
  _id: string;
  bookingId: string;
  userId: { name: string; email: string };
  cabinId: { _id: string; name: string };
  seatId: { _id: string; number: number };
  startDate: string;
  endDate: string;
  status: string;
  totalPrice: number;
  transferredHistory:any;
}

interface Cabin {
  _id: string;
  name: string;
  category: string;
}

interface Seat {
  _id: string;
  number: number;
  isAvailable: boolean;
  price: number;
}

interface FilterState {
  status: string;
  search: string;
  startDate: string;
  endDate: string;
  cabin: string;
  sortBy: string;
  order: 'asc' | 'desc';
}

export function SeatTransferManagementHistory() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [cabins, setCabins] = useState<Cabin[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [targetCabin, setTargetCabin] = useState<string>('');
  const [availableSeats, setAvailableSeats] = useState<Seat[]>([]);
  const [targetSeat, setTargetSeat] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [isTransferring, setIsTransferring] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [itemsPerPage] = useState(10);
  const [filters, setFilters] = useState<FilterState>({
    status: 'completed',
    search: '',
    startDate: '',
    endDate: '',
    cabin: '',
    sortBy: 'createdAt',
    order: 'desc'
  });
  const { toast } = useToast();

  useEffect(() => {
    loadCabins();
  }, []);

  useEffect(() => {
    loadBookings();
  }, [currentPage, filters]);

  const loadCabins = async () => {
    try {
      const response = await adminCabinsService.getAllCabins();
      if (response.success) {
        setCabins(response.data || []);
      }
    } catch (error) {
      console.error('Error loading cabins:', error);
    }
  };

  const loadBookings = async () => {
    setLoading(true);
    try {
      // Prepare filters for API call
      const apiFilters: any = {
        page: currentPage,
        limit: itemsPerPage,
        sortBy: filters.sortBy,
        order: filters.order,
        bookingStatus: 'transferred'
      };

      // Add filters only if they have values
      if (filters.status) apiFilters.status = filters.status;
      if (filters.search) apiFilters.search = filters.search;
      if (filters.startDate) apiFilters.startDate = filters.startDate;
      if (filters.endDate) apiFilters.endDate = filters.endDate;
      if (filters.cabin) apiFilters.cabinId = filters.cabin;

      if(filters.cabin){
        if(filters.cabin == 'all'){
            apiFilters.cabinId = '';
        }
      }
      // if(filters.status){
        // if(filters.status == 'all'){
            apiFilters.status = 'completed';
        // }
      // }
      const response = await adminBookingsService.getAllBookings(apiFilters);
      
      if (response.success) {
        // Filter for only completed bookings with seats (transferable bookings)
        const transferableBookings = (response.data || []).filter((booking: any) => 
          booking.status === 'completed' && booking.seatId
        );
        setBookings(transferableBookings as any);
        setTotalCount(response.totalDocs);
        // setTotalPages(Math.ceil(transferableBookings.length / itemsPerPage));
        setTotalPages(Math.ceil(response.totalPages));

      } else {
        throw new Error(response.error);
      }
    } catch (error) {
      console.error('Error loading bookings:', error);
      toast({
        title: "Error",
        description: "Failed to load bookings",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };


  const viewBookings = (booking: any) => {
     window.open(`/admin/bookings/${booking.bookingId || booking._id}/cabin`, '_blank');
  };

  const exportData = async (format: 'csv' | 'xlsx') => {
    try {
      // Get all data for export
      const exportFilters: any = { limit: 1000 };
      
      if (filters.status) exportFilters.status = filters.status;
      if (filters.search) exportFilters.search = filters.search;
      if (filters.startDate) exportFilters.startDate = filters.startDate;
      if (filters.endDate) exportFilters.endDate = filters.endDate;
      if (filters.cabin) exportFilters.cabinId = filters.cabin;

      const response = await adminBookingsService.getAllBookings(exportFilters);
      
      if (!response.success) {
        throw new Error(response.error);
      }

      const transferableBookings = (response.data || []).filter((booking: any) => 
        booking.status === 'completed' && booking.seatId
      );

      const csvContent = [
        ['Booking ID', 'Student Name', 'Email', 'Reading Room', 'Seat', 'Start Date', 'End Date', 'Status', 'Amount'].join(','),
        ...transferableBookings.map((booking: any) => [
          booking.bookingId || booking._id,
          booking.userId.name,
          booking.userId.email,
          booking.cabinId.name,
          booking.seatId.number,
          new Date(booking.startDate).toLocaleDateString(),
          new Date(booking.endDate).toLocaleDateString(),
          booking.status,
          booking.totalPrice
        ].map(field => `"${field}"`).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `seat-transfers-${new Date().toISOString().split('T')[0]}.${format}`;
      a.click();
      window.URL.revokeObjectURL(url);

      toast({
        title: "Export Complete",
        description: `${transferableBookings.length} records exported as ${format.toUpperCase()}`
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: error.message || "Failed to export data",
        variant: "destructive"
      });
    }
  };

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setFilters({
      status: 'completed',
      search: '',
      startDate: '',
      endDate: '',
      cabin: '',
      sortBy: 'createdAt',
      order: 'desc'
    });
    setCurrentPage(1);
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card className="border border-border/60 rounded-xl shadow-sm">
        <CardContent className="p-3">
          <div className="flex flex-wrap items-center gap-2">
            <Input
              placeholder="Search booking ID, name..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="h-8 text-sm w-48"
            />
            <Select value={filters.cabin} onValueChange={(value) => handleFilterChange('cabin', value)}>
              <SelectTrigger className="h-8 text-sm w-40">
                <SelectValue placeholder="All rooms" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Reading Rooms</SelectItem>
                {cabins.map((cabin) => (
                  <SelectItem key={cabin._id} value={cabin._id}>{cabin.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filters.sortBy} onValueChange={(value) => handleFilterChange('sortBy', value)}>
              <SelectTrigger className="h-8 text-sm w-32">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="createdAt">Created Date</SelectItem>
                <SelectItem value="startDate">Start Date</SelectItem>
                <SelectItem value="endDate">End Date</SelectItem>
                <SelectItem value="totalPrice">Amount</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filters.order} onValueChange={(value) => handleFilterChange('order', value as 'asc' | 'desc')}>
              <SelectTrigger className="w-16 h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="desc">↓</SelectItem>
                <SelectItem value="asc">↑</SelectItem>
              </SelectContent>
            </Select>
            <Input type="date" value={filters.startDate} onChange={(e) => handleFilterChange('startDate', e.target.value)} className="h-8 text-sm w-36" />
            <Input type="date" value={filters.endDate} onChange={(e) => handleFilterChange('endDate', e.target.value)} className="h-8 text-sm w-36" />
            <Button variant="outline" size="sm" onClick={clearFilters} className="h-8">Clear</Button>
            <Button variant="outline" size="sm" onClick={() => exportData('csv')} className="h-8 flex items-center gap-1">
              <Download className="h-3.5 w-3.5" /> CSV
            </Button>
            <Button variant="outline" size="sm" onClick={() => exportData('xlsx')} className="h-8 flex items-center gap-1">
              <FileSpreadsheet className="h-3.5 w-3.5" /> Excel
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Bookings List */}
      <Card className="border border-border/60 rounded-xl shadow-sm">
        <div className="flex items-center justify-between py-3 px-4 border-b">
          <span className="text-sm font-medium text-foreground">Transfer History</span>
          <span className="text-xs text-muted-foreground">{bookings.length} of {totalCount} · Page {currentPage}/{totalPages}</span>
        </div>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
            </div>
          ) : bookings.length === 0 ? (
            <div className="text-center py-12">
              <ArrowRight className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-sm font-medium text-foreground">No transfer history</p>
              <p className="text-xs text-muted-foreground mt-1">No transferred bookings found with the current filters</p>
            </div>
          ) : (
            <div className="divide-y">
              {bookings.map((booking) => (
                <div key={booking._id} className="flex items-start justify-between p-4 hover:bg-muted/30 border-l-2 border-primary/20 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{booking.bookingId || booking._id?.slice(-8)}</span>
                      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {booking.status}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-foreground">{booking.userId.name}</p>
                    <p className="text-xs text-muted-foreground">{booking.userId.email}</p>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs bg-muted text-muted-foreground border border-border/60">{booking.cabinId.name}</span>
                      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs bg-muted text-muted-foreground border border-border/60">Seat {booking.seatId.number}</span>
                      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs bg-muted text-muted-foreground border border-border/60">{new Date(booking.startDate).toLocaleDateString()} – {new Date(booking.endDate).toLocaleDateString()}</span>
                      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs bg-muted text-muted-foreground border border-border/60">₹{booking.totalPrice}</span>
                    </div>
                    {booking?.transferredHistory?.map((data, index) => (
                      data?.cabin ? (
                        <div key={index} className="mt-2 bg-muted/30 rounded px-3 py-1.5 text-xs space-y-0.5">
                          <p className="text-muted-foreground">From: <span className="text-foreground font-medium">{data.cabin?.name || data.hostelId?.name}</span> · Seat #{data.seat?.number}</p>
                          <p className="text-muted-foreground">By: {data.transferredBy?.name} · {format(new Date(data.transferredAt), 'dd MMM yyyy')}</p>
                        </div>
                      ) : null
                    ))}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 ml-3 shrink-0"
                    onClick={() => viewBookings(booking)}
                  >
                    <Eye className="h-3.5 w-3.5 mr-1" />
                    View
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6 px-4 pb-4">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(page => page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1)
                    .map((page) => (
                      <PaginationItem key={page}>
                        <PaginationLink onClick={() => setCurrentPage(page)} isActive={page === currentPage} className="cursor-pointer">
                          {page}
                        </PaginationLink>
                      </PaginationItem>
                    ))}
                  <PaginationItem>
                    <PaginationNext
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
