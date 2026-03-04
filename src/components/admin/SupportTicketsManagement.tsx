import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Headphones, Search } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import TicketChat from '@/components/shared/TicketChat';

const STATUSES = ['all', 'open', 'in_progress', 'resolved', 'closed'];

const statusBadge: Record<string, string> = {
  open: 'bg-yellow-100 text-yellow-700',
  in_progress: 'bg-blue-100 text-blue-700',
  resolved: 'bg-green-100 text-green-700',
  closed: 'bg-muted text-muted-foreground',
};

const SupportTicketsManagement = () => {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<any>(null);
  const [newStatus, setNewStatus] = useState('');
  const [saving, setSaving] = useState(false);
  const [currentUserId, setCurrentUserId] = useState('');

  useEffect(() => { loadTickets(); }, []);

  const loadTickets = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setCurrentUserId(user.id);
    const { data } = await supabase.from('support_tickets').select('*, profiles:user_id(name, email, phone)').order('created_at', { ascending: false });
    setTickets((data as any[]) || []);
    setLoading(false);
  };

  const filtered = tickets.filter(t => {
    if (filterStatus !== 'all' && t.status !== filterStatus) return false;
    if (search && !t.subject?.toLowerCase().includes(search.toLowerCase()) && !t.description?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleStatusUpdate = async () => {
    if (!selected || !newStatus) return;
    setSaving(true);
    const { error } = await supabase.from('support_tickets').update({ status: newStatus }).eq('id', selected.id);
    setSaving(false);
    if (error) {
      toast({ title: 'Error', description: 'Failed to update status', variant: 'destructive' });
    } else {
      toast({ title: 'Updated', description: 'Ticket status updated' });
      setSelected({ ...selected, status: newStatus });
      loadTickets();
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Headphones className="h-5 w-5 text-primary" /> Support Tickets
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search tickets…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9 text-sm" />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[140px] h-9 text-sm"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                {STATUSES.map(s => <SelectItem key={s} value={s} className="capitalize text-sm">{s === 'all' ? 'All Status' : s.replace('_', ' ')}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">No support tickets found</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Ticket #</TableHead>
                    <TableHead className="text-xs">Date</TableHead>
                    <TableHead className="text-xs">User</TableHead>
                    <TableHead className="text-xs">Subject</TableHead>
                    <TableHead className="text-xs">Category</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((t: any) => (
                    <TableRow key={t.id}>
                      <TableCell className="text-xs font-mono">{t.serial_number || '—'}</TableCell>
                      <TableCell className="text-xs">{format(new Date(t.created_at), 'd MMM yy')}</TableCell>
                      <TableCell className="text-xs">
                        <div className="font-medium">{(t.profiles as any)?.name || '—'}</div>
                        {(t.profiles as any)?.phone && <div className="text-[10px] text-muted-foreground">{(t.profiles as any)?.phone}</div>}
                        {(t.profiles as any)?.email && <div className="text-[10px] text-muted-foreground">{(t.profiles as any)?.email}</div>}
                      </TableCell>
                      <TableCell className="text-xs max-w-[200px] truncate">{t.subject}</TableCell>
                      <TableCell><Badge variant="outline" className="text-[10px] capitalize">{t.category}</Badge></TableCell>
                      <TableCell><span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${statusBadge[t.status] || ''}`}>{t.status?.replace('_', ' ')}</span></TableCell>
                      <TableCell>
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { setSelected(t); setNewStatus(t.status); }}>
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-sm">Support Ticket — {selected?.serial_number || ''}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="flex flex-col flex-1 min-h-0 space-y-3">
              <div className="grid grid-cols-2 gap-2 text-xs shrink-0">
                <div><span className="text-muted-foreground">User:</span> {(selected.profiles as any)?.name}</div>
                <div><span className="text-muted-foreground">Email:</span> {(selected.profiles as any)?.email}</div>
                <div><span className="text-muted-foreground">Category:</span> <span className="capitalize">{selected.category}</span></div>
                <div><span className="text-muted-foreground">Date:</span> {format(new Date(selected.created_at), 'd MMM yyyy')}</div>
              </div>

              {/* Status update */}
              <div className="flex items-center gap-2 shrink-0">
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger className="h-8 text-xs w-[140px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUSES.filter(s => s !== 'all').map(s => (
                      <SelectItem key={s} value={s} className="capitalize text-xs">{s.replace('_', ' ')}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button size="sm" className="h-8 text-xs" disabled={saving || newStatus === selected.status} onClick={handleStatusUpdate}>
                  {saving ? 'Saving…' : 'Update Status'}
                </Button>
              </div>

              {/* Chat thread */}
              <div className="flex-1 min-h-0 border rounded-lg overflow-hidden">
                <TicketChat
                  ticketId={selected.id}
                  ticketType="support"
                  ticketDescription={selected.description}
                  ticketCreatedAt={selected.created_at}
                  ticketStatus={selected.status}
                  senderRole="admin"
                  currentUserId={currentUserId}
                  creatorName={(selected.profiles as any)?.name || 'Student'}
                />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SupportTicketsManagement;
