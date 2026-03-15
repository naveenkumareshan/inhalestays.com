import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { MessageSquareWarning, Search, Send, Clock } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { getEffectiveOwnerId } from '@/utils/getEffectiveOwnerId';
import { AdminTablePagination, getSerialNumber } from '@/components/admin/AdminTablePagination';
import { getElapsedDisplay, getElapsedBadgeClass } from '@/utils/complaintTimerUtils';

const PRIORITIES = ['all', 'low', 'medium', 'high'];

const statusBadge: Record<string, string> = {
  open: 'bg-yellow-100 text-yellow-700',
  in_progress: 'bg-blue-100 text-blue-700',
  resolved: 'bg-green-100 text-green-700',
  closed: 'bg-muted text-muted-foreground',
};

const priorityBadge: Record<string, string> = {
  low: 'bg-green-100 text-green-700',
  medium: 'bg-yellow-100 text-yellow-700',
  high: 'bg-red-100 text-red-700',
};

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

const ComplaintsManagement = () => {
  const [complaints, setComplaints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewTab, setViewTab] = useState<'pending' | 'resolved'>('pending');
  const [filterPriority, setFilterPriority] = useState('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<any>(null);
  const [response, setResponse] = useState('');
  const [newStatus, setNewStatus] = useState('');
  const [saving, setSaving] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [, setTick] = useState(0);

  // Live timer refresh every 60s for pending complaints
  useEffect(() => {
    if (viewTab !== 'pending') return;
    const interval = setInterval(() => setTick(t => t + 1), 60000);
    return () => clearInterval(interval);
  }, [viewTab]);

  useEffect(() => { loadComplaints(); }, []);

  const loadComplaints = async () => {
    setLoading(true);
    try {
      const { ownerId } = await getEffectiveOwnerId();

      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', ownerId);
      const isAdmin = roles?.some(r => r.role === 'admin' || r.role === 'super_admin');

      const { data } = await supabase
        .from('complaints')
        .select(`
          *,
          profiles:user_id(name, email, phone),
          cabins:cabin_id(name, created_by),
          hostels:hostel_id(name, created_by),
          mess_partners:mess_id(name, user_id),
          bookings:booking_id(serial_number, seat_number, seats:seat_id(number, floor))
        `)
        .order('created_at', { ascending: false });

      let results = (data as any[]) || [];

      if (!isAdmin) {
        results = results.filter(c => {
          if (c.cabins?.created_by === ownerId) return true;
          if (c.hostels?.created_by === ownerId) return true;
          if (c.mess_partners?.user_id === ownerId) return true;
          return false;
        });
      }

      setComplaints(results);
    } catch (err) {
      console.error('Failed to load complaints:', err);
    }
    setLoading(false);
  };

  const isPending = (c: any) => c.status === 'open' || c.status === 'in_progress';

  const filtered = complaints.filter(c => {
    const matchesTab = viewTab === 'pending' ? isPending(c) : !isPending(c);
    if (!matchesTab) return false;
    if (filterPriority !== 'all' && c.priority !== filterPriority) return false;
    if (search && !c.subject?.toLowerCase().includes(search.toLowerCase()) && !c.description?.toLowerCase().includes(search.toLowerCase()) && !c.serial_number?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const paged = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Reset page on filter change
  useEffect(() => { setCurrentPage(1); }, [viewTab, filterPriority, search]);

  const handleRespond = async () => {
    if (!selected) return;
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const updates: any = {};
    if (response.trim()) {
      updates.response = response.trim();
      updates.responded_by = user?.id;
      updates.responded_at = new Date().toISOString();
    }
    if (newStatus) updates.status = newStatus;

    const { error } = await supabase.from('complaints').update(updates).eq('id', selected.id);
    setSaving(false);
    if (error) {
      toast({ title: 'Error', description: 'Failed to update complaint', variant: 'destructive' });
    } else {
      toast({ title: 'Updated', description: 'Complaint updated successfully' });
      setSelected(null);
      setResponse('');
      setNewStatus('');
      loadComplaints();
    }
  };

  const pendingCount = complaints.filter(isPending).length;
  const resolvedCount = complaints.filter(c => !isPending(c)).length;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <MessageSquareWarning className="h-5 w-5 text-primary" /> Complaints Management
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Pending / Resolved toggle */}
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

          <div className="flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search complaints…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9 text-sm" />
            </div>
            <Select value={filterPriority} onValueChange={setFilterPriority}>
              <SelectTrigger className="w-[140px] h-9 text-sm"><SelectValue placeholder="Priority" /></SelectTrigger>
              <SelectContent>
                {PRIORITIES.map(p => <SelectItem key={p} value={p} className="capitalize text-sm">{p === 'all' ? 'All Priority' : p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">No {viewTab} complaints found</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs w-12">S.No.</TableHead>
                    <TableHead className="text-xs">Serial #</TableHead>
                    <TableHead className="text-xs">Date</TableHead>
                    <TableHead className="text-xs">Student</TableHead>
                    <TableHead className="text-xs">Property</TableHead>
                    <TableHead className="text-xs">Booking #</TableHead>
                    <TableHead className="text-xs">Location</TableHead>
                    <TableHead className="text-xs">Subject</TableHead>
                    <TableHead className="text-xs">Priority</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs">Elapsed</TableHead>
                    <TableHead className="text-xs">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paged.map((c: any, index: number) => (
                    <TableRow key={c.id}>
                      <TableCell className="text-xs text-muted-foreground">{getSerialNumber(index, currentPage, pageSize)}</TableCell>
                      <TableCell className="text-xs font-mono">{c.serial_number || '—'}</TableCell>
                      <TableCell className="text-xs">{format(new Date(c.created_at), 'd MMM yy')}</TableCell>
                      <TableCell className="text-xs">
                        <div className="font-medium">{(c.profiles as any)?.name || '—'}</div>
                        {(c.profiles as any)?.phone && <div className="text-[10px] text-muted-foreground">{(c.profiles as any)?.phone}</div>}
                      </TableCell>
                      <TableCell className="text-xs font-medium">{getPropertyName(c)}</TableCell>
                      <TableCell className="text-xs font-mono">{getBookingSerial(c)}</TableCell>
                      <TableCell className="text-xs">{getLocation(c)}</TableCell>
                      <TableCell className="text-xs max-w-[200px] truncate">{c.subject}</TableCell>
                      <TableCell><span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${priorityBadge[c.priority] || ''}`}>{c.priority}</span></TableCell>
                      <TableCell><span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${statusBadge[c.status] || ''}`}>{c.status?.replace('_', ' ')}</span></TableCell>
                      <TableCell>
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${getElapsedBadgeClass(c.status)}`}>
                          <Clock className="h-2.5 w-2.5" />
                          {getElapsedDisplay(c.created_at, c.resolved_at)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { setSelected(c); setNewStatus(c.status); setResponse(c.response || ''); }}>
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <AdminTablePagination
                currentPage={currentPage}
                totalItems={filtered.length}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
                onPageSizeChange={(s) => { setPageSize(s); setCurrentPage(1); }}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-sm">Complaint Details</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div><span className="text-muted-foreground">Student:</span> {(selected.profiles as any)?.name}</div>
                <div><span className="text-muted-foreground">Email:</span> {(selected.profiles as any)?.email}</div>
                <div><span className="text-muted-foreground">Property:</span> {getPropertyName(selected)}</div>
                <div><span className="text-muted-foreground">Booking #:</span> {getBookingSerial(selected)}</div>
                <div><span className="text-muted-foreground">Location:</span> {getLocation(selected)}</div>
                <div><span className="text-muted-foreground">Priority:</span> <span className="capitalize">{selected.priority}</span></div>
                <div className="col-span-2">
                  <span className="text-muted-foreground">Elapsed:</span>{' '}
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${getElapsedBadgeClass(selected.status)}`}>
                    <Clock className="h-2.5 w-2.5" />
                    {getElapsedDisplay(selected.created_at, selected.resolved_at)}
                  </span>
                </div>
              </div>
              <div>
                <p className="text-xs font-medium mb-1">Subject</p>
                <p className="text-sm">{selected.subject}</p>
              </div>
              <div>
                <p className="text-xs font-medium mb-1">Description</p>
                <p className="text-sm text-muted-foreground">{selected.description}</p>
              </div>
              <div>
                <p className="text-xs font-medium mb-1">Update Status</p>
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['open', 'in_progress', 'resolved', 'closed'].map(s => (
                      <SelectItem key={s} value={s} className="capitalize text-sm">{s.replace('_', ' ')}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <p className="text-xs font-medium mb-1">Response / Message</p>
                <Textarea value={response} onChange={(e) => setResponse(e.target.value)} rows={3} className="text-sm" placeholder="Write a response to the student…" maxLength={1000} />
              </div>
              <Button onClick={handleRespond} disabled={saving} className="w-full h-9 text-sm gap-1">
                <Send className="h-3.5 w-3.5" /> {saving ? 'Saving…' : 'Update & Respond'}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ComplaintsManagement;
