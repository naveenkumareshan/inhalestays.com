import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { hostelService } from '@/api/hostelService';
import { supabase } from '@/integrations/supabase/client';
import { AdminTablePagination, getSerialNumber } from '@/components/admin/AdminTablePagination';
import { Check, X, Building, Clock, Hotel, Search, RefreshCw, Loader2, UtensilsCrossed, Shirt } from 'lucide-react';
import { format } from 'date-fns';

interface PropertyItem {
  id: string;
  name: string;
  type: 'Reading Room' | 'Hostel' | 'Mess' | 'Laundry';
  serial_number: string | null;
  location: string;
  partner_name: string;
  partner_id: string;
  gender?: string;
  is_approved: boolean;
  is_active: boolean;
  commission_percentage?: number;
  created_at: string;
}

const PropertyApprovals = () => {
  const [properties, setProperties] = useState<PropertyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [tab, setTab] = useState('pending');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Action dialog
  const [selectedProperty, setSelectedProperty] = useState<PropertyItem | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
  const [commission, setCommission] = useState('10');
  const [notes, setNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  const fetchProperties = async () => {
    setLoading(true);
    try {
      const [cabinsRes, hostelsRes, messRes, laundryRes] = await Promise.all([
        supabase.from('cabins').select('id, name, serial_number, city, state, is_approved, is_active, created_by, created_at').order('created_at', { ascending: false }),
        supabase.from('hostels').select('id, name, serial_number, location, gender, is_approved, is_active, created_by, commission_percentage, created_at').order('created_at', { ascending: false }),
        supabase.from('mess_partners').select('id, name, serial_number, location, is_approved, is_active, user_id, commission_percentage, created_at').order('created_at', { ascending: false }),
        supabase.from('laundry_partners').select('id, business_name, serial_number, city, state, is_approved, is_active, user_id, commission_percentage, created_at').order('created_at', { ascending: false }),
      ]);

      const cabins = cabinsRes.data || [];
      const hostels = hostelsRes.data || [];
      const messes = messRes.data || [];
      const laundries = laundryRes.data || [];

      // Get all partner user_ids
      const partnerIds = new Set<string>();
      cabins.forEach(c => c.created_by && partnerIds.add(c.created_by));
      hostels.forEach(h => h.created_by && partnerIds.add(h.created_by));
      messes.forEach(m => (m as any).user_id && partnerIds.add((m as any).user_id));
      laundries.forEach(l => (l as any).user_id && partnerIds.add((l as any).user_id));

      const partnerMap: Record<string, string> = {};
      if (partnerIds.size > 0) {
        const { data: partners } = await supabase.from('partners').select('user_id, business_name').in('user_id', Array.from(partnerIds));
        (partners || []).forEach(p => { partnerMap[p.user_id] = p.business_name; });
      }

      const items: PropertyItem[] = [
        ...(cabins).map(c => ({
          id: c.id, name: c.name, type: 'Reading Room' as const,
          serial_number: c.serial_number,
          location: [c.city, c.state].filter(Boolean).join(', ') || '—',
          partner_name: partnerMap[c.created_by || ''] || '—',
          partner_id: c.created_by || '',
          is_approved: (c as any).is_approved ?? true,
          is_active: c.is_active !== false,
          created_at: c.created_at || '',
        })),
        ...(hostels).map(h => ({
          id: h.id, name: h.name, type: 'Hostel' as const,
          serial_number: h.serial_number,
          location: h.location || '—',
          partner_name: partnerMap[h.created_by || ''] || '—',
          partner_id: h.created_by || '',
          gender: h.gender, is_approved: h.is_approved, is_active: h.is_active,
          commission_percentage: h.commission_percentage,
          created_at: h.created_at,
        })),
        ...(messes as any[]).map((m: any) => ({
          id: m.id, name: m.name, type: 'Mess' as const,
          serial_number: m.serial_number,
          location: m.location || '—',
          partner_name: partnerMap[m.user_id || ''] || '—',
          partner_id: m.user_id || '',
          is_approved: m.is_approved ?? false,
          is_active: m.is_active,
          commission_percentage: m.commission_percentage,
          created_at: m.created_at,
        })),
        ...(laundries).map(l => ({
          id: l.id, name: (l as any).business_name, type: 'Laundry' as const,
          serial_number: l.serial_number,
          location: [(l as any).city, (l as any).state].filter(Boolean).join(', ') || '—',
          partner_name: partnerMap[(l as any).user_id || ''] || '—',
          partner_id: (l as any).user_id || '',
          is_approved: (l as any).is_approved ?? false,
          is_active: (l as any).is_active,
          commission_percentage: (l as any).commission_percentage,
          created_at: (l as any).created_at,
        })),
      ];

      setProperties(items);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProperties(); }, []);

  const filtered = useMemo(() => {
    let items = properties;
    if (tab === 'pending') items = items.filter(p => !p.is_approved);
    else if (tab === 'approved') items = items.filter(p => p.is_approved);
    else if (tab === 'rooms') items = items.filter(p => !p.is_approved && p.type === 'Reading Room');
    else if (tab === 'hostels') items = items.filter(p => !p.is_approved && p.type === 'Hostel');
    else if (tab === 'mess') items = items.filter(p => !p.is_approved && p.type === 'Mess');
    else if (tab === 'laundry') items = items.filter(p => !p.is_approved && p.type === 'Laundry');

    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      items = items.filter(p =>
        p.name.toLowerCase().includes(s) || p.partner_name.toLowerCase().includes(s) ||
        p.location.toLowerCase().includes(s) || (p.serial_number || '').toLowerCase().includes(s)
      );
    }
    return items;
  }, [properties, tab, searchTerm]);

  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const pendingCount = properties.filter(p => !p.is_approved).length;
  const approvedCount = properties.filter(p => p.is_approved).length;
  const pendingRooms = properties.filter(p => !p.is_approved && p.type === 'Reading Room').length;
  const pendingHostels = properties.filter(p => !p.is_approved && p.type === 'Hostel').length;
  const pendingMess = properties.filter(p => !p.is_approved && p.type === 'Mess').length;
  const pendingLaundry = properties.filter(p => !p.is_approved && p.type === 'Laundry').length;

  const getTypeIcon = (type: string) => {
    if (type === 'Reading Room') return <Building className="h-3 w-3 mr-1" />;
    if (type === 'Hostel') return <Hotel className="h-3 w-3 mr-1" />;
    if (type === 'Mess') return <UtensilsCrossed className="h-3 w-3 mr-1" />;
    return <Shirt className="h-3 w-3 mr-1" />;
  };

  const getTypeBadgeClass = (type: string) => {
    if (type === 'Reading Room') return 'bg-blue-50 text-blue-700 border-blue-200';
    if (type === 'Hostel') return 'bg-purple-50 text-purple-700 border-purple-200';
    if (type === 'Mess') return 'bg-orange-50 text-orange-700 border-orange-200';
    return 'bg-teal-50 text-teal-700 border-teal-200';
  };

  const handleAction = async () => {
    if (!selectedProperty) return;
    setProcessing(true);
    try {
      const isApprove = actionType === 'approve';
      const updates: Record<string, any> = { is_approved: isApprove };
      if (isApprove && commission) updates.commission_percentage = parseFloat(commission);

      if (selectedProperty.type === 'Hostel') {
        await hostelService.approveHostel(selectedProperty.id, isApprove);
        if (isApprove && commission) await hostelService.setCommission(selectedProperty.id, parseFloat(commission));
      } else if (selectedProperty.type === 'Reading Room') {
        const { error } = await supabase.from('cabins').update({ is_approved: isApprove }).eq('id', selectedProperty.id);
        if (error) throw error;
      } else if (selectedProperty.type === 'Mess') {
        const { error } = await supabase.from('mess_partners').update(updates).eq('id', selectedProperty.id);
        if (error) throw error;
      } else if (selectedProperty.type === 'Laundry') {
        const { error } = await supabase.from('laundry_partners').update(updates).eq('id', selectedProperty.id);
        if (error) throw error;
      }

      toast({ title: `Property ${isApprove ? 'approved' : 'rejected'} successfully` });
      setSelectedProperty(null);
      setActionType(null);
      setNotes('');
      fetchProperties();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Property Approvals</h1>
          <p className="text-xs text-muted-foreground">Review and approve partner property listings</p>
        </div>
        <Button variant="outline" size="sm" className="h-8 text-xs gap-1" onClick={fetchProperties}>
          <RefreshCw className="h-3 w-3" /> Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card><CardContent className="p-3 flex items-center gap-2.5">
          <Clock className="h-5 w-5 text-amber-500" />
          <div><p className="text-xl font-bold">{pendingCount}</p><p className="text-[10px] text-muted-foreground">Pending</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-3 flex items-center gap-2.5">
          <Building className="h-5 w-5 text-blue-500" />
          <div><p className="text-xl font-bold">{pendingRooms}</p><p className="text-[10px] text-muted-foreground">Rooms</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-3 flex items-center gap-2.5">
          <Hotel className="h-5 w-5 text-purple-500" />
          <div><p className="text-xl font-bold">{pendingHostels}</p><p className="text-[10px] text-muted-foreground">Hostels</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-3 flex items-center gap-2.5">
          <UtensilsCrossed className="h-5 w-5 text-orange-500" />
          <div><p className="text-xl font-bold">{pendingMess}</p><p className="text-[10px] text-muted-foreground">Mess</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-3 flex items-center gap-2.5">
          <Shirt className="h-5 w-5 text-teal-500" />
          <div><p className="text-xl font-bold">{pendingLaundry}</p><p className="text-[10px] text-muted-foreground">Laundry</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-3 flex items-center gap-2.5">
          <Check className="h-5 w-5 text-emerald-500" />
          <div><p className="text-xl font-bold">{approvedCount}</p><p className="text-[10px] text-muted-foreground">Approved</p></div>
        </CardContent></Card>
      </div>

      {/* Tabs + Filter */}
      <Tabs value={tab} onValueChange={(v) => { setTab(v); setPage(1); }}>
        <div className="flex items-center gap-2 flex-wrap">
          <TabsList className="h-8">
            <TabsTrigger value="pending" className="text-xs">All Pending ({pendingCount})</TabsTrigger>
            <TabsTrigger value="rooms" className="text-xs">Rooms ({pendingRooms})</TabsTrigger>
            <TabsTrigger value="hostels" className="text-xs">Hostels ({pendingHostels})</TabsTrigger>
            <TabsTrigger value="mess" className="text-xs">Mess ({pendingMess})</TabsTrigger>
            <TabsTrigger value="laundry" className="text-xs">Laundry ({pendingLaundry})</TabsTrigger>
            <TabsTrigger value="approved" className="text-xs">Approved ({approvedCount})</TabsTrigger>
          </TabsList>
          <div className="relative ml-auto">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
            <Input className="h-8 pl-7 text-xs w-[200px]" placeholder="Search..." value={searchTerm} onChange={e => { setSearchTerm(e.target.value); setPage(1); }} />
          </div>
        </div>

        <div className="border rounded-md mt-3">
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
          ) : paginated.length === 0 ? (
            <div className="text-center py-8 text-xs text-muted-foreground">No properties found</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs w-12">S.No.</TableHead>
                  <TableHead className="text-xs">ID</TableHead>
                  <TableHead className="text-xs">Name</TableHead>
                  <TableHead className="text-xs">Type</TableHead>
                  <TableHead className="text-xs">Partner</TableHead>
                  <TableHead className="text-xs">Location</TableHead>
                  <TableHead className="text-xs">Submitted</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  {tab !== 'approved' && <TableHead className="text-xs">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.map((p, index) => (
                  <TableRow key={`${p.type}-${p.id}`}>
                    <TableCell className="text-[11px] text-muted-foreground">{getSerialNumber(index, page, pageSize)}</TableCell>
                    <TableCell className="text-[11px] font-mono">{p.serial_number || p.id.slice(0, 8)}</TableCell>
                    <TableCell className="text-[11px] font-medium">{p.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-[10px] ${getTypeBadgeClass(p.type)}`}>
                        {getTypeIcon(p.type)}{p.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-[11px]">{p.partner_name}</TableCell>
                    <TableCell className="text-[11px]">{p.location}</TableCell>
                    <TableCell className="text-[11px] text-muted-foreground">{p.created_at ? format(new Date(p.created_at), 'dd MMM yyyy') : '—'}</TableCell>
                    <TableCell>
                      {p.is_approved ? (
                        <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">Approved</Badge>
                      ) : (
                        <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-[10px]">Pending</Badge>
                      )}
                    </TableCell>
                    {tab !== 'approved' && (
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="outline" size="sm"
                            className="h-6 px-2 text-[10px] text-emerald-600 hover:text-emerald-700"
                            onClick={() => { setSelectedProperty(p); setActionType('approve'); setCommission(String(p.commission_percentage || 10)); }}
                          >
                            <Check className="h-3 w-3 mr-1" /> Approve
                          </Button>
                          <Button
                            variant="outline" size="sm"
                            className="h-6 px-2 text-[10px] text-red-600 hover:text-red-700"
                            onClick={() => { setSelectedProperty(p); setActionType('reject'); }}
                          >
                            <X className="h-3 w-3 mr-1" /> Reject
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </Tabs>

      <AdminTablePagination
        currentPage={page}
        totalItems={filtered.length}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
      />

      {/* Approve/Reject Dialog */}
      <Dialog open={!!selectedProperty && !!actionType} onOpenChange={() => { setSelectedProperty(null); setActionType(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-sm">
              {actionType === 'approve' ? 'Approve' : 'Reject'}: {selectedProperty?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Badge variant="outline" className="text-xs">{selectedProperty?.type}</Badge>
            {actionType === 'approve' && (selectedProperty?.type === 'Hostel' || selectedProperty?.type === 'Mess' || selectedProperty?.type === 'Laundry') && (
              <div>
                <label className="text-xs font-medium">Commission %</label>
                <Input type="number" value={commission} onChange={e => setCommission(e.target.value)} min="0" max="100" className="h-8 text-xs mt-1" />
              </div>
            )}
            <div>
              <label className="text-xs font-medium">Notes (optional)</label>
              <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder={actionType === 'approve' ? 'Approval notes...' : 'Rejection reason...'} className="text-xs mt-1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" className="text-xs" onClick={() => { setSelectedProperty(null); setActionType(null); }}>Cancel</Button>
            <Button size="sm" className="text-xs" onClick={handleAction} disabled={processing} variant={actionType === 'approve' ? 'default' : 'destructive'}>
              {processing && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
              {actionType === 'approve' ? 'Approve' : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PropertyApprovals;
