import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { format, parseISO } from 'date-fns';
import { Search, Clock } from 'lucide-react';
import { AdminTablePagination, getSerialNumber } from '@/components/admin/AdminTablePagination';
import TicketChat from '@/components/shared/TicketChat';
import { getElapsedDisplay, getElapsedBadgeClass } from '@/utils/complaintTimerUtils';

const getPropertyName = (c: any) =>
  c.cabins?.name || c.hostels?.name || c.mess_partners?.name || (c as any).laundry_partners?.business_name || '—';

const getBookingSerial = (c: any) =>
  c.bookings?.serial_number || '—';

const getLocation = (c: any) => {
  if (c.bookings?.seats) {
    const s = c.bookings.seats;
    return `Floor ${s.floor}, Seat ${s.number}`;
  }
  if (c.bookings?.seat_number) {
    return `Seat ${c.bookings.seat_number}`;
  }
  return '—';
};

const ComplaintTracker = () => {
  const [viewTab, setViewTab] = useState<'pending' | 'resolved'>('pending');
  const [search, setSearch] = useState('');
  const [selectedComplaint, setSelectedComplaint] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [, setTick] = useState(0);
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Live timer refresh every 60s for pending
  useEffect(() => {
    if (viewTab !== 'pending') return;
    const interval = setInterval(() => setTick(t => t + 1), 60000);
    return () => clearInterval(interval);
  }, [viewTab]);

  const { data: complaints = [], isLoading } = useQuery({
    queryKey: ['ops-complaints'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('complaints')
        .select(`
          *,
          profiles:user_id(name, phone, email),
          cabins:cabin_id(name),
          hostels:hostel_id(name),
          mess_partners:mess_id(name),
          bookings:booking_id(serial_number, seat_number, seats:seat_id(number, floor))
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from('complaints')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Status updated' });
      queryClient.invalidateQueries({ queryKey: ['ops-complaints'] });
    },
    onError: (err: any) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });

  const isPending = (c: any) => c.status === 'open' || c.status === 'in_progress';

  const filtered = complaints.filter((c: any) => {
    const matchesTab = viewTab === 'pending' ? isPending(c) : !isPending(c);
    if (!matchesTab) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.subject?.toLowerCase().includes(q) ||
      c.profiles?.name?.toLowerCase().includes(q) ||
      c.serial_number?.toLowerCase().includes(q)
    );
  });

  // Reset page on filter change
  useEffect(() => { setCurrentPage(1); }, [viewTab, search]);

  const statusColor = (s: string) => {
    switch (s) {
      case 'open': return 'destructive';
      case 'in_progress': return 'secondary';
      case 'resolved': return 'default';
      case 'closed': return 'outline';
      default: return 'secondary';
    }
  };

  const handleDialogStatusUpdate = (newStatus: string) => {
    if (!selectedComplaint) return;
    updateStatusMutation.mutate({ id: selectedComplaint.id, status: newStatus });
    setSelectedComplaint({ ...selectedComplaint, status: newStatus });
  };

  const pendingCount = complaints.filter(isPending).length;
  const resolvedCount = complaints.filter(c => !isPending(c)).length;

  return (
    <div className="space-y-4">
      {/* Pending / Resolved toggle */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={viewTab === 'pending' ? 'default' : 'outline'}
            className="h-8 text-xs rounded-xl gap-1"
            onClick={() => setViewTab('pending')}
          >
            Pending <Badge variant="secondary" className="ml-1 text-[10px] h-4 px-1.5">{pendingCount}</Badge>
          </Button>
          <Button
            size="sm"
            variant={viewTab === 'resolved' ? 'default' : 'outline'}
            className="h-8 text-xs rounded-xl gap-1"
            onClick={() => setViewTab('resolved')}
          >
            Resolved <Badge variant="secondary" className="ml-1 text-[10px] h-4 px-1.5">{resolvedCount}</Badge>
          </Button>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search subject, name, ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-xs"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-sm text-muted-foreground">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-8 text-sm text-muted-foreground">No {viewTab} complaints found.</div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left py-2 px-3 font-medium w-12">S.No.</th>
                <th className="text-left py-2 px-3 font-medium">ID</th>
                <th className="text-left py-2 px-3 font-medium">Subject</th>
                <th className="text-left py-2 px-3 font-medium">Student</th>
                <th className="text-left py-2 px-3 font-medium">Property</th>
                <th className="text-left py-2 px-3 font-medium">Booking #</th>
                <th className="text-left py-2 px-3 font-medium">Location</th>
                <th className="text-left py-2 px-3 font-medium">Priority</th>
                <th className="text-left py-2 px-3 font-medium">Status</th>
                <th className="text-left py-2 px-3 font-medium">Elapsed</th>
                <th className="text-left py-2 px-3 font-medium">Date</th>
                <th className="text-right py-2 px-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((c: any, index: number) => (
                <tr key={c.id} className="border-b last:border-0 hover:bg-muted/30 cursor-pointer" onClick={() => setSelectedComplaint(c)}>
                  <td className="py-1.5 px-3 text-muted-foreground">{getSerialNumber(index, currentPage, pageSize)}</td>
                  <td className="py-1.5 px-3 font-mono text-muted-foreground">{c.serial_number || c.id.slice(0, 8)}</td>
                  <td className="py-1.5 px-3 font-medium max-w-[200px] truncate">{c.subject}</td>
                  <td className="py-1.5 px-3">{c.profiles?.name || 'N/A'}</td>
                  <td className="py-1.5 px-3">{getPropertyName(c)}</td>
                  <td className="py-1.5 px-3 font-mono">{getBookingSerial(c)}</td>
                  <td className="py-1.5 px-3">{getLocation(c)}</td>
                  <td className="py-1.5 px-3">
                    <Badge variant="outline" className="text-[10px] capitalize">{c.priority}</Badge>
                  </td>
                  <td className="py-1.5 px-3">
                    <Badge variant={statusColor(c.status) as any} className="text-[10px] capitalize">
                      {c.status?.replace('_', ' ')}
                    </Badge>
                  </td>
                  <td className="py-1.5 px-3">
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${getElapsedBadgeClass(c.status)}`}>
                      <Clock className="h-2.5 w-2.5" />
                      {getElapsedDisplay(c.created_at, c.resolved_at)}
                    </span>
                  </td>
                  <td className="py-1.5 px-3">{format(parseISO(c.created_at), 'dd MMM yyyy')}</td>
                  <td className="py-1.5 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex gap-1 justify-end">
                      {c.status !== 'resolved' && c.status !== 'closed' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-5 text-[9px] px-1.5"
                          onClick={() => updateStatusMutation.mutate({ id: c.id, status: 'resolved' })}
                        >
                          Resolve
                        </Button>
                      )}
                      {c.status === 'open' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-5 text-[9px] px-1.5"
                          onClick={() => updateStatusMutation.mutate({ id: c.id, status: 'in_progress' })}
                        >
                          In Progress
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
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

      {/* Complaint Chat Dialog */}
      <Dialog open={!!selectedComplaint} onOpenChange={(open) => !open && setSelectedComplaint(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-sm">Complaint — {selectedComplaint?.serial_number || ''}</DialogTitle>
          </DialogHeader>
          {selectedComplaint && (
            <div className="flex flex-col flex-1 min-h-0 space-y-3">
              <div className="grid grid-cols-2 gap-2 text-xs shrink-0">
                <div><span className="text-muted-foreground">Student:</span> {selectedComplaint.profiles?.name}</div>
                <div><span className="text-muted-foreground">Phone:</span> {selectedComplaint.profiles?.phone || '—'}</div>
                <div><span className="text-muted-foreground">Property:</span> {getPropertyName(selectedComplaint)}</div>
                <div><span className="text-muted-foreground">Booking #:</span> {getBookingSerial(selectedComplaint)}</div>
                <div><span className="text-muted-foreground">Location:</span> {getLocation(selectedComplaint)}</div>
                <div><span className="text-muted-foreground">Priority:</span> <span className="capitalize">{selectedComplaint.priority}</span></div>
                <div className="col-span-2">
                  <span className="text-muted-foreground">Elapsed:</span>{' '}
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${getElapsedBadgeClass(selectedComplaint.status)}`}>
                    <Clock className="h-2.5 w-2.5" />
                    {getElapsedDisplay(selectedComplaint.created_at, selectedComplaint.resolved_at)}
                  </span>
                </div>
              </div>

              {/* Status actions */}
              <div className="flex gap-2 shrink-0">
                {selectedComplaint.status !== 'resolved' && selectedComplaint.status !== 'closed' && (
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleDialogStatusUpdate('resolved')}>
                    Mark Resolved
                  </Button>
                )}
                {selectedComplaint.status === 'open' && (
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => handleDialogStatusUpdate('in_progress')}>
                    In Progress
                  </Button>
                )}
                {(selectedComplaint.status === 'resolved' || selectedComplaint.status === 'closed') && (
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => handleDialogStatusUpdate('open')}>
                    Reopen
                  </Button>
                )}
              </div>

              {/* Chat thread */}
              <div className="flex-1 min-h-0 border rounded-lg overflow-hidden">
                <TicketChat
                  ticketId={selectedComplaint.id}
                  ticketType="complaint"
                  ticketDescription={selectedComplaint.description}
                  ticketCreatedAt={selectedComplaint.created_at}
                  ticketStatus={selectedComplaint.status}
                  senderRole="admin"
                  currentUserId={user?.id || ''}
                  creatorName={selectedComplaint.profiles?.name || 'Student'}
                />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ComplaintTracker;
