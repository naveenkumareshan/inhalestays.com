
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { format, subDays, parseISO } from 'date-fns';
import { Search, AlertTriangle, CheckCircle2, Eye, Upload, Receipt, IndianRupee } from 'lucide-react';
import CheckInUploadDialog from './CheckInUploadDialog';
import ReportedTodaySection from './ReportedTodaySection';
import CheckInViewDetailsDialog from './CheckInViewDetailsDialog';
import { AdminTablePagination, getSerialNumber } from '@/components/admin/AdminTablePagination';
import { CollectDrawer, ReceiptsDialog, fmtAmt } from './CheckInFinancials';
import { usePartnerPropertyTypes } from '@/hooks/usePartnerPropertyTypes';

type Module = 'reading_room' | 'hostel';

const CheckInTracker = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { hasReadingRooms, hasHostels, loading: propLoading } = usePartnerPropertyTypes();

  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
  const showRR = isAdmin || hasReadingRooms;
  const showHostel = isAdmin || hasHostels;
  const showToggle = showRR && showHostel;

  const [module, setModule] = useState<Module>(showRR ? 'reading_room' : 'hostel');
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [uploadBooking, setUploadBooking] = useState<any>(null);
  const [notes, setNotes] = useState('');
  const [viewBooking, setViewBooking] = useState<any>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Collect & Receipts state
  const [collectDue, setCollectDue] = useState<any>(null);
  const [collectOpen, setCollectOpen] = useState(false);
  const [receiptsBooking, setReceiptsBooking] = useState<any>(null);
  const [receiptsOpen, setReceiptsOpen] = useState(false);

  const today = format(new Date(), 'yyyy-MM-dd');
  const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');

  // Reading room bookings query
  const { data: rrBookings = [], isLoading: rrLoading } = useQuery({
    queryKey: ['checkin-rr-bookings', today, yesterday],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bookings')
        .select('*, profiles:user_id(name, phone, email), cabins:cabin_id(name), seats:seat_id(number)')
        .is('checked_in_at', null)
        .in('payment_status', ['completed', 'advance_paid'])
        .in('start_date', [today, yesterday])
        .order('start_date', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: module === 'reading_room',
  });

  // Hostel bookings query
  const { data: hostelBookings = [], isLoading: hostelLoading } = useQuery({
    queryKey: ['checkin-hostel-bookings', today, yesterday],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hostel_bookings')
        .select('*, profiles:user_id(name, phone, email), hostels:hostel_id(name), hostel_rooms:room_id(room_number), hostel_beds:bed_id(bed_number)')
        .is('checked_in_at', null)
        .in('payment_status', ['completed', 'advance_paid'])
        .in('start_date', [today, yesterday])
        .order('start_date', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: module === 'hostel',
  });

  // Fetch dues for current bookings (reading room)
  const bookingIds = (module === 'reading_room' ? rrBookings : hostelBookings).map((b: any) => b.id);
  
  const { data: duesMap = {} } = useQuery({
    queryKey: ['checkin-dues', module, bookingIds],
    queryFn: async () => {
      if (bookingIds.length === 0) return {};
      const table = module === 'reading_room' ? 'dues' : 'hostel_dues';
      const { data } = await supabase
        .from(table)
        .select('*')
        .in('booking_id', bookingIds);
      const map: Record<string, any> = {};
      (data || []).forEach((d: any) => { map[d.booking_id] = d; });
      return map;
    },
    enabled: bookingIds.length > 0,
  });

  const markReportedMutation = useMutation({
    mutationFn: async ({ id, type }: { id: string; type: Module }) => {
      const table = type === 'reading_room' ? 'bookings' : 'hostel_bookings';
      const { error } = await supabase
        .from(table)
        .update({
          checked_in_at: new Date().toISOString(),
          checked_in_by: user?.id,
          check_in_notes: notes,
        } as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Marked as reported', description: 'Student has been checked in successfully.' });
      queryClient.invalidateQueries({ queryKey: ['checkin-rr-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['checkin-hostel-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['reported-today-rr'] });
      queryClient.invalidateQueries({ queryKey: ['reported-today-hostel'] });
      setDialogOpen(false);
      setNotes('');
      setSelectedBooking(null);
    },
    onError: (err: any) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });

  const handleMarkReported = (booking: any) => {
    setSelectedBooking(booking);
    setNotes('');
    setDialogOpen(true);
  };

  const confirmMarkReported = () => {
    if (!selectedBooking) return;
    markReportedMutation.mutate({ id: selectedBooking.id, type: module });
  };

  const handleUploadDocs = (booking: any) => {
    setUploadBooking(booking);
    setUploadDialogOpen(true);
  };

  const handleViewDetails = (booking: any) => {
    setViewBooking(booking);
    setViewDialogOpen(true);
  };

  const handleCollect = (booking: any) => {
    const due = duesMap[booking.id];
    if (!due) return;
    setCollectDue({ ...due, profiles: booking.profiles });
    setCollectOpen(true);
  };

  const handleReceipts = (booking: any) => {
    setReceiptsBooking(booking);
    setReceiptsOpen(true);
  };

  const isLoading = module === 'reading_room' ? rrLoading : hostelLoading;
  const bookings = module === 'reading_room' ? rrBookings : hostelBookings;

  const filtered = bookings.filter((b: any) => {
    if (!search) return true;
    const q = search.toLowerCase();
    const name = b.profiles?.name?.toLowerCase() || '';
    const phone = b.profiles?.phone?.toLowerCase() || '';
    const email = b.profiles?.email?.toLowerCase() || '';
    return name.includes(q) || phone.includes(q) || email.includes(q);
  });

  const isNoShow = (startDate: string) => startDate === yesterday;

  const getFinancials = (b: any) => {
    const due = duesMap[b.id];
    if (module === 'reading_room') {
      const deposit = Number(b.locker_price || 0);
      const price = Number(b.total_price || 0) - deposit;
      if (due) {
        const paid = Number(due.advance_paid || 0) + Number(due.paid_amount || 0);
        const remaining = Math.max(0, Number(due.due_amount || 0) - Number(due.paid_amount || 0));
        return { price, deposit, paid, due: remaining, hasDue: !!due };
      }
      // No due record - assume fully paid
      return { price, deposit, paid: price + deposit, due: 0, hasDue: false };
    } else {
      const price = Number(b.total_price || 0);
      const deposit = Number(b.security_deposit || 0);
      if (due) {
        const paid = Number(due.advance_paid || 0) + Number(due.paid_amount || 0);
        const remaining = Math.max(0, Number(due.due_amount || 0) - Number(due.paid_amount || 0));
        return { price, deposit, paid, due: remaining, hasDue: !!due };
      }
      const paid = Number(b.advance_amount || 0);
      return { price, deposit, paid, due: Math.max(0, price + deposit - paid), hasDue: false };
    }
  };

  return (
    <div className="space-y-4">
      {/* Module toggle + search */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        {showToggle && (
          <div className="flex gap-1 bg-muted rounded-lg p-0.5">
            <Button
              variant={module === 'reading_room' ? 'default' : 'ghost'}
              size="sm"
              className="text-xs h-7"
              onClick={() => setModule('reading_room')}
            >
              Reading Room
            </Button>
            <Button
              variant={module === 'hostel' ? 'default' : 'ghost'}
              size="sm"
              className="text-xs h-7"
              onClick={() => setModule('hostel')}
            >
              Hostel
            </Button>
          </div>
        )}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search by name, phone, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-xs"
          />
        </div>
      </div>

      {/* Pending Table */}
      {isLoading ? (
        <div className="text-center py-8 text-sm text-muted-foreground">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-8 text-sm text-muted-foreground">
          <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-500" />
          All students have reported!
        </div>
      ) : (
        <div className="border rounded-lg overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left py-2 px-3 font-medium w-12">S.No.</th>
                <th className="text-left py-2 px-3 font-medium">Student</th>
                <th className="text-left py-2 px-3 font-medium">
                  {module === 'reading_room' ? 'Room / Seat' : 'Hostel / Bed'}
                </th>
                <th className="text-left py-2 px-3 font-medium">Start Date</th>
                <th className="text-right py-2 px-3 font-medium">{module === 'reading_room' ? 'Seat Price' : 'Bed Price'}</th>
                <th className="text-right py-2 px-3 font-medium">Deposit</th>
                <th className="text-right py-2 px-3 font-medium">Paid</th>
                <th className="text-right py-2 px-3 font-medium">Due</th>
                <th className="text-left py-2 px-3 font-medium">Payment</th>
                <th className="text-right py-2 px-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((b: any, index: number) => {
                const startDate = b.start_date;
                const noShow = isNoShow(startDate);
                const fin = getFinancials(b);
                return (
                  <tr key={b.id} className={`border-b last:border-0 ${noShow ? 'bg-destructive/5' : 'hover:bg-muted/30'}`}>
                    <td className="py-1.5 px-3 text-muted-foreground">{getSerialNumber(index, currentPage, pageSize)}</td>
                    <td className="py-1.5 px-3">
                      <div className="font-medium">{b.profiles?.name || 'N/A'}</div>
                      <div className="text-muted-foreground">{b.profiles?.phone || b.profiles?.email || ''}</div>
                    </td>
                    <td className="py-1.5 px-3">
                      {module === 'reading_room' ? (
                        <span>{b.cabins?.name || '—'} / Seat #{b.seats?.number || '—'}</span>
                      ) : (
                        <span>{b.hostels?.name || '—'} / Bed #{b.hostel_beds?.bed_number || '—'}</span>
                      )}
                    </td>
                    <td className="py-1.5 px-3">
                      <div className="flex items-center gap-1">
                        {noShow && <AlertTriangle className="h-3 w-3 text-destructive" />}
                        <span className={noShow ? 'text-destructive font-medium' : ''}>
                          {startDate ? format(parseISO(startDate), 'dd MMM yyyy') : '—'}
                        </span>
                      </div>
                      {noShow && <div className="text-[10px] text-destructive">Yesterday - No show</div>}
                    </td>
                    <td className="py-1.5 px-3 text-right font-medium">{fmtAmt(fin.price)}</td>
                    <td className="py-1.5 px-3 text-right">{fmtAmt(fin.deposit)}</td>
                    <td className="py-1.5 px-3 text-right text-emerald-600">{fmtAmt(fin.paid)}</td>
                    <td className={`py-1.5 px-3 text-right font-medium ${fin.due > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                      {fmtAmt(fin.due)}
                    </td>
                    <td className="py-1.5 px-3">
                      <Badge variant={b.payment_status === 'completed' ? 'default' : 'secondary'} className="text-[10px]">
                        {b.payment_status}
                      </Badge>
                    </td>
                    <td className="py-1.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0" title="View Details" onClick={() => handleViewDetails(b)}>
                          <Eye className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0" title="Upload Documents" onClick={() => handleUploadDocs(b)}>
                          <Upload className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0" title="Receipts" onClick={() => handleReceipts(b)}>
                          <Receipt className="h-3 w-3" />
                        </Button>
                        {fin.due > 0 && fin.hasDue && (
                          <Button size="sm" variant="outline" className="h-6 text-[10px] px-2" onClick={() => handleCollect(b)}>
                            <IndianRupee className="h-3 w-3 mr-0.5" />Collect
                          </Button>
                        )}
                        <Button size="sm" variant="outline" className="h-6 text-[10px] px-2" onClick={() => handleMarkReported(b)}>
                          Mark Reported
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <AdminTablePagination
            currentPage={currentPage}
            totalItems={filtered.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={(s) => { setPageSize(s); setCurrentPage(1); }}
          />
        </div>
      )}

      {/* Reported Today Section */}
      <ReportedTodaySection module={module} />

      {/* Mark Reported Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">Mark as Reported</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="text-sm">
              <span className="text-muted-foreground">Student: </span>
              <span className="font-medium">{selectedBooking?.profiles?.name || 'N/A'}</span>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Notes (optional)</label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any notes about the reporting..."
                className="mt-1 text-sm"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={confirmMarkReported} disabled={markReportedMutation.isPending}>
              {markReportedMutation.isPending ? 'Saving...' : 'Confirm Reported'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Details Dialog */}
      <CheckInViewDetailsDialog
        open={viewDialogOpen}
        onOpenChange={setViewDialogOpen}
        booking={viewBooking}
        module={module}
      />

      {/* Upload Documents Dialog */}
      {uploadBooking && (
        <CheckInUploadDialog
          open={uploadDialogOpen}
          onOpenChange={setUploadDialogOpen}
          booking={uploadBooking}
          module={module}
          onUploaded={() => {
            queryClient.invalidateQueries({ queryKey: ['checkin-rr-bookings'] });
            queryClient.invalidateQueries({ queryKey: ['checkin-hostel-bookings'] });
          }}
        />
      )}

      {/* Collect Drawer */}
      <CollectDrawer
        open={collectOpen}
        onOpenChange={setCollectOpen}
        due={collectDue}
        module={module}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['checkin-rr-bookings'] });
          queryClient.invalidateQueries({ queryKey: ['checkin-hostel-bookings'] });
          queryClient.invalidateQueries({ queryKey: ['checkin-dues'] });
        }}
      />

      {/* Receipts Dialog */}
      <ReceiptsDialog
        open={receiptsOpen}
        onOpenChange={setReceiptsOpen}
        booking={receiptsBooking}
        module={module}
      />
    </div>
  );
};

export default CheckInTracker;
