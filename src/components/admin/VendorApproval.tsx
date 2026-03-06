
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Eye, Check, X, AlertTriangle, User, Download, Search, RefreshCw, Power, Link2, Copy, Settings, ChevronDown, ChevronRight, Building, Home, MapPin } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { vendorApprovalService, Vendor, VendorFilters, VendorsResponse } from '@/api/vendorApprovalService';
import { VendorDetailsDialog } from './VendorDetailsDialog';
import { VendorStatsCards } from './VendorStatsCards';
import { AdminTablePagination, getSerialNumber } from '@/components/admin/AdminTablePagination';
import { useIsMobile } from '@/hooks/use-mobile';
import { supabase } from '@/integrations/supabase/client';
import { getPublicAppUrl } from '@/utils/appUrl';
import { PartnerPayoutSettingsDialog } from './PartnerPayoutSettingsDialog';

interface PropertyInfo {
  id: string;
  name: string;
  type: 'Reading Room' | 'Hostel';
  city: string;
  state: string;
  capacity: number;
  is_active: boolean;
  is_approved: boolean;
  activeBookings: number;
  totalSeatsOrBeds: number;
  occupiedSeatsOrBeds: number;
}

const VendorApproval: React.FC = () => {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterBusinessType, setFilterBusinessType] = useState('all');
  const [showPayoutSettings, setShowPayoutSettings] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [expandedPartners, setExpandedPartners] = useState<Set<string>>(new Set());
  const [propertiesMap, setPropertiesMap] = useState<Map<string, PropertyInfo[]>>(new Map());
  const [propertiesLoading, setPropertiesLoading] = useState(false);
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const fetchVendors = useCallback(async () => {
    setLoading(true);
    const filters: VendorFilters = {
      status: filterStatus === 'all' ? 'all' : filterStatus as any,
      search: searchTerm,
      businessType: filterBusinessType === 'all' ? '' : filterBusinessType,
    };
    const result = await vendorApprovalService.getVendors(
      { page: 1, limit: 500 },
      filters
    );
    if (result.success) {
      const data: VendorsResponse = result.data.data;
      setVendors(data.vendors);
      setTotalCount(data.totalCount);
    }
    setLoading(false);
  }, [filterStatus, searchTerm, filterBusinessType]);

  // Batch fetch all properties for all partners
  const fetchProperties = useCallback(async (partnerUserIds: string[]) => {
    if (partnerUserIds.length === 0) return;
    setPropertiesLoading(true);
    try {
      const [cabinsRes, hostelsRes, bookingsRes, hostelBookingsRes, seatsRes, bedsRes] = await Promise.all([
        supabase.from('cabins').select('id, name, city, state, capacity, is_active, is_approved, created_by'),
        supabase.from('hostels').select('id, name, location, is_active, is_approved, created_by'),
        supabase.from('bookings').select('cabin_id, id').in('payment_status', ['confirmed', 'paid']),
        supabase.from('hostel_bookings').select('hostel_id, id').in('status', ['confirmed', 'active']),
        supabase.from('seats').select('cabin_id, id, is_available'),
        supabase.from('hostel_beds').select('room_id, id, is_available').eq('is_blocked', false),
      ]);

      const cabins = cabinsRes.data || [];
      const hostels = hostelsRes.data || [];
      const bookings = bookingsRes.data || [];
      const hostelBookings = hostelBookingsRes.data || [];
      const seats = seatsRes.data || [];
      const beds = bedsRes.data || [];

      // Count active bookings per cabin
      const cabinBookingCounts = new Map<string, number>();
      bookings.forEach(b => {
        if (b.cabin_id) cabinBookingCounts.set(b.cabin_id, (cabinBookingCounts.get(b.cabin_id) || 0) + 1);
      });

      // Count active bookings per hostel
      const hostelBookingCounts = new Map<string, number>();
      hostelBookings.forEach(b => {
        if (b.hostel_id) hostelBookingCounts.set(b.hostel_id, (hostelBookingCounts.get(b.hostel_id) || 0) + 1);
      });

      // Count seats per cabin
      const cabinSeatCounts = new Map<string, { total: number; occupied: number }>();
      seats.forEach(s => {
        if (s.cabin_id) {
          const cur = cabinSeatCounts.get(s.cabin_id) || { total: 0, occupied: 0 };
          cur.total++;
          if (!s.is_available) cur.occupied++;
          cabinSeatCounts.set(s.cabin_id, cur);
        }
      });

      // Count beds per hostel (need hostel_rooms to map room_id -> hostel_id)
      // For simplicity, we'll use hostels' capacity field and bed counts
      const hostelBedCounts = new Map<string, { total: number; occupied: number }>();
      // We need room -> hostel mapping
      const roomsRes = await supabase.from('hostel_rooms').select('id, hostel_id');
      const rooms = roomsRes.data || [];
      const roomToHostel = new Map<string, string>();
      rooms.forEach(r => roomToHostel.set(r.id, r.hostel_id));

      beds.forEach(b => {
        const hostelId = roomToHostel.get(b.room_id);
        if (hostelId) {
          const cur = hostelBedCounts.get(hostelId) || { total: 0, occupied: 0 };
          cur.total++;
          if (!b.is_available) cur.occupied++;
          hostelBedCounts.set(hostelId, cur);
        }
      });

      const map = new Map<string, PropertyInfo[]>();

      cabins.forEach(c => {
        if (!c.created_by) return;
        const seatInfo = cabinSeatCounts.get(c.id) || { total: 0, occupied: 0 };
        const prop: PropertyInfo = {
          id: c.id,
          name: c.name,
          type: 'Reading Room',
          city: c.city || '',
          state: c.state || '',
          capacity: c.capacity || 0,
          is_active: c.is_active ?? false,
          is_approved: c.is_approved ?? false,
          activeBookings: cabinBookingCounts.get(c.id) || 0,
          totalSeatsOrBeds: seatInfo.total,
          occupiedSeatsOrBeds: seatInfo.occupied,
        };
        const existing = map.get(c.created_by) || [];
        existing.push(prop);
        map.set(c.created_by, existing);
      });

      hostels.forEach(h => {
        if (!h.created_by) return;
        const bedInfo = hostelBedCounts.get(h.id) || { total: 0, occupied: 0 };
        const prop: PropertyInfo = {
          id: h.id,
          name: h.name,
          type: 'Hostel',
          city: h.location || '',
          state: '',
          capacity: 0,
          is_active: h.is_active ?? false,
          is_approved: h.is_approved ?? false,
          activeBookings: hostelBookingCounts.get(h.id) || 0,
          totalSeatsOrBeds: bedInfo.total,
          occupiedSeatsOrBeds: bedInfo.occupied,
        };
        const existing = map.get(h.created_by) || [];
        existing.push(prop);
        map.set(h.created_by, existing);
      });

      setPropertiesMap(map);
    } catch (err) {
      console.error('Error fetching properties:', err);
    }
    setPropertiesLoading(false);
  }, []);

  useEffect(() => {
    fetchVendors();
  }, [fetchVendors]);

  useEffect(() => {
    if (vendors.length > 0) {
      const userIds = vendors.map(v => v.user_id).filter(Boolean);
      fetchProperties(userIds);
    }
  }, [vendors, fetchProperties]);

  const filtered = useMemo(() => vendors, [vendors]);
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const toggleExpanded = (vendorId: string) => {
    setExpandedPartners(prev => {
      const next = new Set(prev);
      if (next.has(vendorId)) next.delete(vendorId);
      else next.add(vendorId);
      return next;
    });
  };

  const handleStatusUpdate = async (vendorId: string, action: 'approve' | 'reject' | 'suspend', additionalData?: any) => {
    const data = {
      action,
      rejectionReason: action === 'reject' ? rejectionReason : undefined,
      ...additionalData
    };

    if (action === 'suspend') {
      const vendor = vendors.find(v => v.id === vendorId);
      if (vendor) {
        await supabase.from('cabins').update({ is_booking_active: false }).eq('created_by', vendor.user_id);
        await supabase.from('hostels').update({ is_booking_active: false }).eq('created_by', vendor.user_id);
      }
    }

    if (action === 'approve') {
      const vendor = vendors.find(v => v.id === vendorId);
      if (vendor && (vendor.status === 'suspended' || vendor.status === 'rejected')) {
        await supabase.from('cabins').update({ is_booking_active: true }).eq('created_by', vendor.user_id);
        await supabase.from('hostels').update({ is_booking_active: true }).eq('created_by', vendor.user_id);
      }
    }

    const result = await vendorApprovalService.updateVendorStatus(vendorId, data);
    if (result.success) {
      toast({ title: "Success", description: `Partner ${action}ed successfully` });
      fetchVendors();
      setRejectionReason('');
    } else {
      toast({ title: "Error", description: result.error?.message || `Failed to ${action} Partner`, variant: "destructive" });
    }
  };

  const handleVendorUpdate = async (vendorId: string, updatedData: Partial<Vendor>) => {
    const result = await vendorApprovalService.updateVendorDetails(vendorId, updatedData);
    if (result.success) {
      toast({ title: "Success", description: "Partner details updated" });
      fetchVendors();
      setSelectedVendor(result.data.data);
    } else {
      toast({ title: "Error", description: result.error?.message || "Failed to update", variant: "destructive" });
    }
  };

  const handleExport = async () => {
    const result = await vendorApprovalService.exportVendors({ status: filterStatus as any, search: searchTerm });
    if (result.success) {
      const url = window.URL.createObjectURL(new Blob([result.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Partners_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      rejected: 'bg-red-50 text-red-700 border-red-200',
      suspended: 'bg-orange-50 text-orange-700 border-orange-200',
      pending: 'bg-amber-50 text-amber-700 border-amber-200',
    };
    return <Badge className={`${styles[status] || 'bg-muted text-muted-foreground'} border text-[10px]`}>{status}</Badge>;
  };

  const getPropertyTypeBadge = (type: string) => {
    if (type === 'Reading Room') return <Badge className="bg-blue-50 text-blue-700 border-blue-200 border text-[10px]">Reading Room</Badge>;
    return <Badge className="bg-purple-50 text-purple-700 border-purple-200 border text-[10px]">Hostel</Badge>;
  };

  const getPropertyCountPills = (userId: string) => {
    const props = propertiesMap.get(userId) || [];
    const cabinCount = props.filter(p => p.type === 'Reading Room').length;
    const hostelCount = props.filter(p => p.type === 'Hostel').length;
    if (cabinCount === 0 && hostelCount === 0) return <span className="text-[10px] text-muted-foreground">No properties</span>;
    return (
      <div className="flex items-center gap-1.5">
        {cabinCount > 0 && <Badge variant="outline" className="text-[10px] border-blue-200 text-blue-600 px-1.5 py-0">{cabinCount} Reading Room{cabinCount > 1 ? 's' : ''}</Badge>}
        {hostelCount > 0 && <Badge variant="outline" className="text-[10px] border-purple-200 text-purple-600 px-1.5 py-0">{hostelCount} Hostel{hostelCount > 1 ? 's' : ''}</Badge>}
      </div>
    );
  };

  const renderPropertyTable = (userId: string) => {
    const props = propertiesMap.get(userId) || [];
    if (props.length === 0) {
      return (
        <div className="py-4 text-center text-[11px] text-muted-foreground">
          No properties registered yet
        </div>
      );
    }

    // Quick stats
    const totalActive = props.filter(p => p.is_active).length;
    const totalSeats = props.reduce((s, p) => s + p.totalSeatsOrBeds, 0);
    const totalOccupied = props.reduce((s, p) => s + p.occupiedSeatsOrBeds, 0);
    const totalBookings = props.reduce((s, p) => s + p.activeBookings, 0);
    const occupancyPct = totalSeats > 0 ? Math.round((totalOccupied / totalSeats) * 100) : 0;

    return (
      <div className="space-y-3">
        {/* Quick Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <div className="bg-muted/50 rounded-md px-3 py-2">
            <p className="text-[10px] text-muted-foreground">Active Properties</p>
            <p className="text-sm font-semibold">{totalActive}/{props.length}</p>
          </div>
          <div className="bg-muted/50 rounded-md px-3 py-2">
            <p className="text-[10px] text-muted-foreground">Active Bookings</p>
            <p className="text-sm font-semibold">{totalBookings}</p>
          </div>
          <div className="bg-muted/50 rounded-md px-3 py-2">
            <p className="text-[10px] text-muted-foreground">Total Seats/Beds</p>
            <p className="text-sm font-semibold">{totalOccupied}/{totalSeats}</p>
          </div>
          <div className="bg-muted/50 rounded-md px-3 py-2">
            <p className="text-[10px] text-muted-foreground">Occupancy</p>
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold">{occupancyPct}%</p>
              <Progress value={occupancyPct} className="h-1.5 flex-1" />
            </div>
          </div>
        </div>

        {/* Properties Table */}
        {isMobile ? (
          <div className="space-y-2">
            {props.map(p => {
              const occ = p.totalSeatsOrBeds > 0 ? Math.round((p.occupiedSeatsOrBeds / p.totalSeatsOrBeds) * 100) : 0;
              return (
                <div key={p.id} className="border rounded-md p-2.5 bg-card space-y-1.5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-[11px] font-medium">{p.name}</p>
                      <p className="text-[10px] text-muted-foreground">{p.city}{p.state ? `, ${p.state}` : ''}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      {getPropertyTypeBadge(p.type)}
                      <span className={`h-2 w-2 rounded-full ${p.is_active ? 'bg-emerald-500' : 'bg-muted-foreground/40'}`} />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-1 text-[10px]">
                    <div><span className="text-muted-foreground">Seats/Beds:</span> {p.occupiedSeatsOrBeds}/{p.totalSeatsOrBeds}</div>
                    <div><span className="text-muted-foreground">Bookings:</span> {p.activeBookings}</div>
                    <div><span className="text-muted-foreground">Occ:</span> {occ}%</div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-[11px] py-2">Name</TableHead>
                <TableHead className="text-[11px] py-2">Type</TableHead>
                <TableHead className="text-[11px] py-2">Location</TableHead>
                <TableHead className="text-[11px] py-2">Seats/Beds</TableHead>
                <TableHead className="text-[11px] py-2">Bookings</TableHead>
                <TableHead className="text-[11px] py-2">Occupancy</TableHead>
                <TableHead className="text-[11px] py-2">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {props.map(p => {
                const occ = p.totalSeatsOrBeds > 0 ? Math.round((p.occupiedSeatsOrBeds / p.totalSeatsOrBeds) * 100) : 0;
                return (
                  <TableRow key={p.id}>
                    <TableCell className="text-[11px] py-1.5 font-medium">{p.name}</TableCell>
                    <TableCell className="py-1.5">{getPropertyTypeBadge(p.type)}</TableCell>
                    <TableCell className="text-[11px] py-1.5 text-muted-foreground">{p.city}{p.state ? `, ${p.state}` : ''}</TableCell>
                    <TableCell className="text-[11px] py-1.5">{p.occupiedSeatsOrBeds}/{p.totalSeatsOrBeds}</TableCell>
                    <TableCell className="text-[11px] py-1.5">{p.activeBookings}</TableCell>
                    <TableCell className="py-1.5">
                      <div className="flex items-center gap-1.5">
                        <Progress value={occ} className="h-1.5 w-12" />
                        <span className="text-[10px] text-muted-foreground">{occ}%</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className={`h-2 w-2 rounded-full ${p.is_active ? 'bg-emerald-500' : 'bg-muted-foreground/40'}`} />
                        <span className="text-[10px]">{p.is_active ? 'Active' : 'Inactive'}</span>
                        {!p.is_approved && <Badge className="text-[9px] bg-amber-50 text-amber-600 border-amber-200 border px-1 py-0">Pending</Badge>}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>
    );
  };

  const renderPartnerActions = (v: Vendor) => (
    <div className="flex items-center gap-1">
      <Button variant="outline" size="sm" className="h-6 w-6 p-0" onClick={(e) => { e.stopPropagation(); setSelectedVendor(v); setShowDetailsDialog(true); }}>
        <Eye className="h-3 w-3" />
      </Button>
      <Button variant="outline" size="sm" className="h-6 w-6 p-0" onClick={(e) => { e.stopPropagation(); setShowPayoutSettings(v.id); }} title="Payout Settings">
        <Settings className="h-3 w-3" />
      </Button>
      {v.status === 'pending' && (
        <>
          <Button variant="outline" size="sm" className="h-6 w-6 p-0 text-emerald-600 hover:text-emerald-700" onClick={(e) => { e.stopPropagation(); handleStatusUpdate(v.id, 'approve'); }}>
            <Check className="h-3 w-3" />
          </Button>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="h-6 w-6 p-0 text-red-600 hover:text-red-700" onClick={(e) => e.stopPropagation()}>
                <X className="h-3 w-3" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle className="text-sm">Reject Partner</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label className="text-xs">Reason</Label>
                  <Textarea className="text-xs" value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} placeholder="Reason for rejection..." />
                </div>
                <Button variant="destructive" size="sm" className="w-full text-xs" onClick={() => handleStatusUpdate(v.id, 'reject')}>Reject</Button>
              </div>
            </DialogContent>
          </Dialog>
        </>
      )}
      {(v.status === 'suspended' || v.status === 'rejected') && (
        <Button variant="outline" size="sm" className="h-6 px-2 text-[10px] text-emerald-600 hover:text-emerald-700" onClick={(e) => { e.stopPropagation(); handleStatusUpdate(v.id, 'approve'); }}>
          <Power className="h-3 w-3 mr-1" /> Activate
        </Button>
      )}
      {v.status === 'approved' && (
        <Button variant="outline" size="sm" className="h-6 w-6 p-0 text-orange-600 hover:text-orange-700" onClick={(e) => { e.stopPropagation(); handleStatusUpdate(v.id, 'suspend'); }}>
          <AlertTriangle className="h-3 w-3" />
        </Button>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-lg font-semibold">Partner Management</h1>
          <p className="text-xs text-muted-foreground">Review and manage partner applications & properties</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline" size="sm" className="h-8 text-xs gap-1"
            onClick={() => {
              const url = `${getPublicAppUrl()}/partner/register`;
              navigator.clipboard.writeText(url);
              toast({ title: "Copied!", description: "Partner onboarding link copied to clipboard" });
            }}
          >
            <Link2 className="h-3 w-3" /> Onboarding Link
            <Copy className="h-3 w-3 ml-0.5" />
          </Button>
          <Button
            variant="outline" size="sm" className="h-8 text-xs gap-1"
            onClick={() => {
              const url = `${getPublicAppUrl()}/partner/login`;
              navigator.clipboard.writeText(url);
              toast({ title: "Copied!", description: "Partner login link copied to clipboard" });
            }}
          >
            <Link2 className="h-3 w-3" /> Login Link
            <Copy className="h-3 w-3 ml-0.5" />
          </Button>
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1" onClick={fetchVendors}>
            <RefreshCw className="h-3 w-3" /> Refresh
          </Button>
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1" onClick={handleExport}>
            <Download className="h-3 w-3" /> Export
          </Button>
        </div>
      </div>

      <VendorStatsCards />

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
          <Input className="h-8 pl-7 text-xs w-[200px]" placeholder="Search name, email, phone..." value={searchTerm} onChange={e => { setSearchTerm(e.target.value); setPage(1); }} />
        </div>
        <Select value={filterStatus} onValueChange={(v) => { setFilterStatus(v); setPage(1); }}>
          <SelectTrigger className="h-8 w-[130px] text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">All Status</SelectItem>
            <SelectItem value="pending" className="text-xs">Pending</SelectItem>
            <SelectItem value="approved" className="text-xs">Approved</SelectItem>
            <SelectItem value="rejected" className="text-xs">Rejected</SelectItem>
            <SelectItem value="suspended" className="text-xs">Suspended</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterBusinessType} onValueChange={(v) => { setFilterBusinessType(v); setPage(1); }}>
          <SelectTrigger className="h-8 w-[140px] text-xs"><SelectValue placeholder="Business Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">All Types</SelectItem>
            <SelectItem value="individual" className="text-xs">Individual</SelectItem>
            <SelectItem value="company" className="text-xs">Company</SelectItem>
            <SelectItem value="partnership" className="text-xs">Partnership</SelectItem>
          </SelectContent>
        </Select>
        {(searchTerm || filterStatus !== 'all' || filterBusinessType !== 'all') && (
          <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => { setSearchTerm(''); setFilterStatus('all'); setFilterBusinessType('all'); setPage(1); }}>
            Clear
          </Button>
        )}
        <Badge variant="secondary" className="text-xs ml-auto">{totalCount} partners</Badge>
      </div>

      {/* Partner Cards with Expandable Properties */}
      <div className="border rounded-md">
        {loading ? (
          <div className="text-center py-8 text-muted-foreground text-xs">Loading...</div>
        ) : paginated.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <User className="h-6 w-6 text-muted-foreground/40 mb-2" />
            <p className="text-xs text-muted-foreground">No partners found</p>
          </div>
        ) : (
          <div className="divide-y">
            {paginated.map((v, index) => {
              const isExpanded = expandedPartners.has(v.id);
              const props = propertiesMap.get(v.user_id) || [];

              return (
                <Collapsible key={v.id} open={isExpanded} onOpenChange={() => toggleExpanded(v.id)}>
                  <CollapsibleTrigger asChild>
                    <div className="flex items-center gap-3 px-3 py-2.5 hover:bg-muted/30 cursor-pointer transition-colors">
                      {/* Expand icon */}
                      <div className="flex-shrink-0">
                        {isExpanded ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
                      </div>

                      {/* S.No */}
                      <span className="text-[11px] text-muted-foreground w-6 flex-shrink-0">{getSerialNumber(index, page, pageSize)}</span>

                      {/* Main info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[11px] font-medium truncate">{v.business_name}</span>
                          {getStatusBadge(v.status)}
                          {getPropertyCountPills(v.user_id)}
                        </div>
                        <div className="flex items-center gap-3 mt-0.5 text-[10px] text-muted-foreground">
                          <span>{v.contact_person}</span>
                          <span className="hidden sm:inline">·</span>
                          <span className="hidden sm:inline">{v.email}</span>
                          <span className="hidden sm:inline">·</span>
                          <span className="hidden sm:inline">{v.phone}</span>
                          {v.address?.city && (
                            <>
                              <span className="hidden md:inline">·</span>
                              <span className="hidden md:inline">{v.address.city}{v.address?.state ? `, ${v.address.state}` : ''}</span>
                            </>
                          )}
                          <span className="hidden lg:inline">·</span>
                          <span className="hidden lg:inline">Joined {new Date(v.created_at).toLocaleDateString('en-IN')}</span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex-shrink-0" onClick={e => e.stopPropagation()}>
                        {renderPartnerActions(v)}
                      </div>
                    </div>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <div className="px-4 pb-3 pt-1 bg-muted/20 border-t">
                      {propertiesLoading ? (
                        <div className="text-center py-3 text-[11px] text-muted-foreground">Loading properties...</div>
                      ) : (
                        renderPropertyTable(v.user_id)
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
          </div>
        )}
      </div>

      <AdminTablePagination
        currentPage={page}
        totalItems={filtered.length}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
      />

      {selectedVendor && (
        <VendorDetailsDialog
          vendor={selectedVendor}
          open={showDetailsDialog}
          onOpenChange={setShowDetailsDialog}
          onStatusUpdate={handleStatusUpdate}
          onVendorUpdate={handleVendorUpdate}
        />
      )}

      <PartnerPayoutSettingsDialog
        partnerId={showPayoutSettings || ''}
        open={!!showPayoutSettings}
        onClose={() => setShowPayoutSettings(null)}
      />
    </div>
  );
};

export default VendorApproval;
