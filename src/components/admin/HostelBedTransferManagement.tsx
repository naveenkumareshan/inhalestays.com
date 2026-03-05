import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ArrowRight, Download } from 'lucide-react';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { format } from 'date-fns';
import { formatCurrency } from '@/utils/currency';

interface HostelBedTransferManagementProps {
  hostelId: string;
}

export default function HostelBedTransferManagement({ hostelId }: HostelBedTransferManagementProps) {
  const [bookings, setBookings] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [targetRoomId, setTargetRoomId] = useState('');
  const [availableBeds, setAvailableBeds] = useState<any[]>([]);
  const [targetBedId, setTargetBedId] = useState('');
  const [loading, setLoading] = useState(true);
  const [isTransferring, setIsTransferring] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const { toast } = useToast();

  useEffect(() => {
    loadRooms();
    loadBookings();
  }, [hostelId]);

  const loadRooms = async () => {
    const { data } = await supabase
      .from('hostel_rooms')
      .select('id, room_number, floor')
      .eq('hostel_id', hostelId)
      .eq('is_active', true)
      .order('floor')
      .order('room_number');
    setRooms(data || []);
  };

  const loadBookings = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('hostel_bookings')
        .select('*, profiles:user_id(name, email, phone), hostel_rooms:room_id(room_number, floor), hostel_beds:bed_id(bed_number)')
        .eq('hostel_id', hostelId)
        .in('status', ['confirmed', 'pending'])
        .order('created_at', { ascending: false });
      setBookings(data || []);
    } catch (error) {
      console.error(error);
      toast({ title: 'Error', description: 'Failed to load bookings', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableBeds = async (roomId: string) => {
    const { data } = await supabase
      .from('hostel_beds')
      .select('id, bed_number, category, hostel_sharing_options(type, price_monthly)')
      .eq('room_id', roomId)
      .eq('is_available', true)
      .eq('is_blocked', false)
      .order('bed_number');
    setAvailableBeds(data || []);
  };

  useEffect(() => {
    if (targetRoomId) loadAvailableBeds(targetRoomId);
    else setAvailableBeds([]);
    setTargetBedId('');
  }, [targetRoomId]);

  const handleTransfer = async () => {
    if (!selectedBooking || !targetRoomId || !targetBedId) {
      toast({ title: 'Error', description: 'Please select target room and bed', variant: 'destructive' });
      return;
    }
    setIsTransferring(true);
    try {
      // Update booking
      const { error: bookingErr } = await supabase
        .from('hostel_bookings')
        .update({ bed_id: targetBedId, room_id: targetRoomId })
        .eq('id', selectedBooking.id);
      if (bookingErr) throw bookingErr;

      // Bed availability is now handled by database trigger

      toast({ title: 'Transfer Successful', description: 'Booking transferred to new bed' });
      setIsDialogOpen(false);
      setSelectedBooking(null);
      setTargetRoomId('');
      setTargetBedId('');
      loadBookings();
    } catch (error: any) {
      toast({ title: 'Transfer Failed', description: error.message, variant: 'destructive' });
    } finally {
      setIsTransferring(false);
    }
  };

  const filtered = bookings.filter(b => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (b.profiles?.name || '').toLowerCase().includes(s) ||
      (b.profiles?.email || '').toLowerCase().includes(s) ||
      (b.serial_number || '').toLowerCase().includes(s);
  });

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const exportCSV = () => {
    const csv = [
      ['Booking ID', 'Guest', 'Email', 'Room', 'Bed', 'Start', 'End', 'Amount', 'Status'].join(','),
      ...filtered.map(b => [
        b.serial_number || b.id,
        b.profiles?.name, b.profiles?.email,
        `Room ${b.hostel_rooms?.room_number}`, `Bed ${b.hostel_beds?.bed_number}`,
        b.start_date, b.end_date, b.total_price, b.status,
      ].map(f => `"${f || ''}"`).join(','))
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bed-transfers-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <Card className="border border-border/60 rounded-xl shadow-sm">
        <CardContent className="p-3">
          <div className="flex flex-wrap items-center gap-2">
            <Input placeholder="Search guest name, email, booking ID..." value={search} onChange={e => { setSearch(e.target.value); setCurrentPage(1); }} className="h-8 text-sm w-64" />
            <Button variant="outline" size="sm" onClick={exportCSV} className="h-8"><Download className="h-3.5 w-3.5 mr-1" />CSV</Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-border/60 rounded-xl shadow-sm">
        <div className="flex items-center justify-between py-3 px-4 border-b">
          <span className="text-sm font-medium">Active Bookings</span>
          <span className="text-xs text-muted-foreground">{filtered.length} bookings · Page {currentPage}/{totalPages || 1}</span>
        </div>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-12"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>
          ) : paginated.length === 0 ? (
            <div className="text-center py-12">
              <ArrowRight className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-sm font-medium">No transferable bookings</p>
            </div>
          ) : (
            <div className="divide-y">
              {paginated.map(booking => (
                <div key={booking.id} className="flex items-start justify-between p-4 hover:bg-muted/30 border-l-2 border-primary/20 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{booking.serial_number || booking.id?.slice(-8)}</span>
                      <Badge variant="default" className="text-xs">{booking.status}</Badge>
                    </div>
                    <p className="text-sm font-medium">{booking.profiles?.name}</p>
                    <p className="text-xs text-muted-foreground">{booking.profiles?.email}</p>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <Badge variant="outline">Room {booking.hostel_rooms?.room_number}</Badge>
                      <Badge variant="outline">Bed {booking.hostel_beds?.bed_number}</Badge>
                      <Badge variant="outline">{new Date(booking.start_date).toLocaleDateString()} – {new Date(booking.end_date).toLocaleDateString()}</Badge>
                      <Badge variant="outline">{formatCurrency(booking.total_price)}</Badge>
                    </div>
                  </div>
                  <Dialog open={isDialogOpen && selectedBooking?.id === booking.id} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" onClick={() => { setSelectedBooking(booking); setTargetRoomId(''); setTargetBedId(''); }}>
                        <ArrowRight className="h-4 w-4 mr-2" />Transfer
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>Transfer Bed — {booking.profiles?.name}</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="p-3 bg-muted/50 rounded-lg text-sm">
                          <p>Current: Room {booking.hostel_rooms?.room_number} · Bed {booking.hostel_beds?.bed_number}</p>
                          <p className="text-muted-foreground">{new Date(booking.start_date).toLocaleDateString()} – {new Date(booking.end_date).toLocaleDateString()}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium">Target Room</label>
                          <Select value={targetRoomId} onValueChange={setTargetRoomId}>
                            <SelectTrigger className="mt-1"><SelectValue placeholder="Select room" /></SelectTrigger>
                            <SelectContent>
                              {rooms.map(r => <SelectItem key={r.id} value={r.id}>Room {r.room_number} (Floor {r.floor})</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        {targetRoomId && (
                          <div>
                            <label className="text-sm font-medium">Target Bed</label>
                            <Select value={targetBedId} onValueChange={setTargetBedId}>
                              <SelectTrigger className="mt-1"><SelectValue placeholder="Select bed" /></SelectTrigger>
                              <SelectContent>
                                {availableBeds.length === 0 ? (
                                  <SelectItem value="none" disabled>No available beds</SelectItem>
                                ) : (
                                  availableBeds.map((b: any) => (
                                    <SelectItem key={b.id} value={b.id}>
                                      Bed {b.bed_number} {b.category ? `(${b.category})` : ''} — {b.hostel_sharing_options?.type}
                                    </SelectItem>
                                  ))
                                )}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleTransfer} disabled={isTransferring || !targetBedId}>
                          {isTransferring ? 'Transferring...' : 'Confirm Transfer'}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem><PaginationPrevious onClick={() => setCurrentPage(p => Math.max(1, p - 1))} /></PaginationItem>
            {Array.from({ length: totalPages }, (_, i) => (
              <PaginationItem key={i + 1}><PaginationLink isActive={currentPage === i + 1} onClick={() => setCurrentPage(i + 1)}>{i + 1}</PaginationLink></PaginationItem>
            ))}
            <PaginationItem><PaginationNext onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} /></PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
}
