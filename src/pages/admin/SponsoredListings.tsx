
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format } from 'date-fns';
import { CalendarIcon, Plus, Pencil, Pause, Play, Trash2, RefreshCw, Download, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AdminTablePagination, getSerialNumber } from '@/components/admin/AdminTablePagination';
import { formatCurrency } from '@/utils/currency';

interface SponsoredListing {
  id: string;
  serial_number: string;
  property_type: string;
  property_id: string;
  partner_id: string;
  tier: string;
  target_city_id: string;
  target_area_ids: string[];
  start_date: string;
  end_date: string;
  priority_rank: number;
  status: string;
  payment_status: string;
  package_id: string | null;
  created_at: string;
  property_name?: string;
  partner_name?: string;
  city_name?: string;
  area_names?: string[];
  impressions?: number;
  clicks?: number;
  bookings?: number;
}

interface SponsoredPackage {
  id: string;
  serial_number: string;
  name: string;
  description: string;
  tier: string;
  duration_days: number;
  price: number;
  is_active: boolean;
  created_at: string;
}

const tierOptions = [
  { value: 'featured', label: 'Featured' },
  { value: 'inline_sponsored', label: 'Inline Sponsored' },
  { value: 'boost_ranking', label: 'Boost Ranking' },
];

const statusColors: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  paused: 'bg-yellow-100 text-yellow-800',
  expired: 'bg-red-100 text-red-800',
  pending: 'bg-orange-100 text-orange-800',
};

export default function SponsoredListingsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('listings');

  // ── Listings state ──
  const [listings, setListings] = useState<SponsoredListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPropertyType, setFilterPropertyType] = useState('all');
  const [filterTier, setFilterTier] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Form state
  const [propertyType, setPropertyType] = useState('reading_room');
  const [propertyId, setPropertyId] = useState('');
  const [partnerId, setPartnerId] = useState('');
  const [tier, setTier] = useState('featured');
  const [cityId, setCityId] = useState('');
  const [areaIds, setAreaIds] = useState<string[]>([]);
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [startDateOpen, setStartDateOpen] = useState(false);
  const [endDateOpen, setEndDateOpen] = useState(false);
  const [priorityRank, setPriorityRank] = useState(0);
  const [formStatus, setFormStatus] = useState('active');

  // Lookups
  const [properties, setProperties] = useState<any[]>([]);
  const [partners, setPartners] = useState<any[]>([]);
  const [cities, setCities] = useState<any[]>([]);
  const [areas, setAreas] = useState<any[]>([]);
  const [allAreas, setAllAreas] = useState<any[]>([]);

  // ── Packages state ──
  const [packages, setPackages] = useState<SponsoredPackage[]>([]);
  const [pkgLoading, setPkgLoading] = useState(true);
  const [pkgDialogOpen, setPkgDialogOpen] = useState(false);
  const [editingPkgId, setEditingPkgId] = useState<string | null>(null);
  const [pkgForm, setPkgForm] = useState({ name: '', description: '', tier: 'featured', duration_days: 7, price: 0, is_active: true });
  const [pkgPage, setPkgPage] = useState(1);
  const [pkgPageSize, setPkgPageSize] = useState(25);

  useEffect(() => {
    fetchListings();
    fetchLookups();
    fetchPackages();
  }, []);

  const fetchLookups = async () => {
    const [citiesRes, partnersRes, areasRes] = await Promise.all([
      supabase.from('cities').select('id, name').eq('is_active', true).order('name'),
      supabase.from('partners').select('id, business_name, user_id').eq('is_active', true).order('business_name'),
      supabase.from('areas').select('id, name, city_id').eq('is_active', true).order('name'),
    ]);
    setCities(citiesRes.data || []);
    setPartners(partnersRes.data || []);
    setAllAreas(areasRes.data || []);
  };

  const fetchProperties = async (type: string) => {
    if (type === 'hostel') {
      const { data } = await supabase.from('hostels').select('id, name, created_by').eq('is_active', true).order('name');
      setProperties(data || []);
    } else {
      const { data } = await supabase.from('cabins').select('id, name, created_by').eq('is_active', true).order('name');
      setProperties(data || []);
    }
  };

  const fetchAreas = async (cId: string) => {
    const { data } = await supabase.from('areas').select('id, name').eq('city_id', cId).eq('is_active', true).order('name');
    setAreas(data || []);
  };

  useEffect(() => { fetchProperties(propertyType); }, [propertyType]);
  useEffect(() => { if (cityId) fetchAreas(cityId); else setAreas([]); }, [cityId]);

  useEffect(() => {
    if (propertyId && properties.length > 0) {
      const prop = properties.find(p => p.id === propertyId);
      if (prop?.created_by) {
        const partner = partners.find(p => p.user_id === prop.created_by);
        if (partner) setPartnerId(partner.id);
      }
    }
  }, [propertyId, properties, partners]);

  const resolveAreaNames = (areaIds: string[]): string[] => {
    if (!areaIds?.length) return [];
    return areaIds.map(id => allAreas.find(a => a.id === id)?.name).filter(Boolean) as string[];
  };

  const fetchListings = async () => {
    setLoading(true);
    const { data: listingsData, error } = await supabase
      .from('sponsored_listings')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) { console.error(error); setLoading(false); return; }

    const enriched = await Promise.all((listingsData || []).map(async (l: any) => {
      let property_name = '';
      if (l.property_type === 'hostel') {
        const { data } = await supabase.from('hostels').select('name').eq('id', l.property_id).single();
        property_name = data?.name || 'Unknown';
      } else {
        const { data } = await supabase.from('cabins').select('name').eq('id', l.property_id).single();
        property_name = data?.name || 'Unknown';
      }

      const { data: partnerData } = await supabase.from('partners').select('business_name').eq('id', l.partner_id).single();
      const { data: cityData } = await supabase.from('cities').select('name').eq('id', l.target_city_id).single();

      const { data: events } = await supabase
        .from('sponsored_listing_events')
        .select('event_type')
        .eq('sponsored_listing_id', l.id);

      return {
        ...l,
        property_name,
        partner_name: partnerData?.business_name || 'Unknown',
        city_name: cityData?.name || 'Unknown',
        area_names: resolveAreaNames(l.target_area_ids || []),
        impressions: events?.filter((e: any) => e.event_type === 'impression').length || 0,
        clicks: events?.filter((e: any) => e.event_type === 'click').length || 0,
        bookings: events?.filter((e: any) => e.event_type === 'booking').length || 0,
      };
    }));

    setListings(enriched);
    setLoading(false);
  };

  // ── Filtered + paginated listings ──
  const filteredListings = useMemo(() => {
    let result = [...listings];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(l =>
        l.property_name?.toLowerCase().includes(q) ||
        l.partner_name?.toLowerCase().includes(q) ||
        l.serial_number?.toLowerCase().includes(q) ||
        l.city_name?.toLowerCase().includes(q)
      );
    }
    if (filterPropertyType !== 'all') result = result.filter(l => l.property_type === filterPropertyType);
    if (filterTier !== 'all') result = result.filter(l => l.tier === filterTier);
    if (filterStatus !== 'all') result = result.filter(l => l.status === filterStatus);
    if (filterFrom) result = result.filter(l => l.start_date >= filterFrom);
    if (filterTo) result = result.filter(l => l.end_date <= filterTo);
    return result;
  }, [listings, searchQuery, filterPropertyType, filterTier, filterStatus, filterFrom, filterTo]);

  const paginatedListings = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredListings.slice(start, start + pageSize);
  }, [filteredListings, currentPage, pageSize]);

  const summaryStats = useMemo(() => ({
    total: listings.length,
    active: listings.filter(l => l.status === 'active').length,
    paused: listings.filter(l => l.status === 'paused').length,
    expired: listings.filter(l => l.status === 'expired').length,
    pending: listings.filter(l => l.status === 'pending').length,
  }), [listings]);

  const clearFilters = () => {
    setSearchQuery(''); setFilterPropertyType('all'); setFilterTier('all');
    setFilterStatus('all'); setFilterFrom(''); setFilterTo('');
    setCurrentPage(1);
  };

  const resetForm = () => {
    setPropertyType('reading_room'); setPropertyId(''); setPartnerId('');
    setTier('featured'); setCityId(''); setAreaIds([]);
    setStartDate(undefined); setEndDate(undefined); setPriorityRank(0);
    setFormStatus('active'); setEditingId(null);
  };

  const handleCreate = () => { resetForm(); setDialogOpen(true); };

  const handleEdit = (listing: SponsoredListing) => {
    setEditingId(listing.id);
    setPropertyType(listing.property_type);
    setPropertyId(listing.property_id);
    setPartnerId(listing.partner_id);
    setTier(listing.tier);
    setCityId(listing.target_city_id);
    setAreaIds(listing.target_area_ids || []);
    setStartDate(new Date(listing.start_date));
    setEndDate(new Date(listing.end_date));
    setPriorityRank(listing.priority_rank);
    setFormStatus(listing.status);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!propertyId || !partnerId || !cityId || !startDate || !endDate) {
      toast({ title: 'Validation Error', description: 'Please fill all required fields.', variant: 'destructive' });
      return;
    }
    const payload = {
      property_type: propertyType, property_id: propertyId, partner_id: partnerId, tier,
      target_city_id: cityId, target_area_ids: areaIds,
      start_date: format(startDate, 'yyyy-MM-dd'), end_date: format(endDate, 'yyyy-MM-dd'),
      priority_rank: priorityRank, status: formStatus, created_by: user?.id,
    };
    let error;
    if (editingId) {
      ({ error } = await supabase.from('sponsored_listings').update(payload).eq('id', editingId));
    } else {
      ({ error } = await supabase.from('sponsored_listings').insert(payload));
    }
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: editingId ? 'Listing updated.' : 'Listing created.' });
      setDialogOpen(false); resetForm(); fetchListings();
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'paused' : 'active';
    const { error } = await supabase.from('sponsored_listings').update({ status: newStatus }).eq('id', id);
    if (!error) fetchListings();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('sponsored_listings').delete().eq('id', id);
    if (!error) { toast({ title: 'Deleted' }); fetchListings(); }
  };

  const toggleAreaId = (areaId: string) => {
    setAreaIds(prev => prev.includes(areaId) ? prev.filter(a => a !== areaId) : [...prev, areaId]);
  };

  // ── Packages CRUD ──
  const fetchPackages = async () => {
    setPkgLoading(true);
    const { data } = await supabase.from('sponsored_packages').select('*').order('created_at', { ascending: false });
    setPackages((data || []) as SponsoredPackage[]);
    setPkgLoading(false);
  };

  const resetPkgForm = () => {
    setPkgForm({ name: '', description: '', tier: 'featured', duration_days: 7, price: 0, is_active: true });
    setEditingPkgId(null);
  };

  const handleSavePkg = async () => {
    if (!pkgForm.name) { toast({ title: 'Error', description: 'Package name is required.', variant: 'destructive' }); return; }
    const payload = { ...pkgForm, created_by: user?.id };
    let error;
    if (editingPkgId) {
      ({ error } = await supabase.from('sponsored_packages').update(payload).eq('id', editingPkgId));
    } else {
      ({ error } = await supabase.from('sponsored_packages').insert(payload));
    }
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); }
    else { toast({ title: 'Success' }); setPkgDialogOpen(false); resetPkgForm(); fetchPackages(); }
  };

  const handleDeletePkg = async (id: string) => {
    const { error } = await supabase.from('sponsored_packages').delete().eq('id', id);
    if (!error) { toast({ title: 'Deleted' }); fetchPackages(); }
  };

  const paginatedPackages = useMemo(() => {
    const start = (pkgPage - 1) * pkgPageSize;
    return packages.slice(start, start + pkgPageSize);
  }, [packages, pkgPage, pkgPageSize]);

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold">Sponsored Listings</h1>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => { fetchListings(); fetchPackages(); }}><RefreshCw className="h-3.5 w-3.5 mr-1" /> Refresh</Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="listings">Listings</TabsTrigger>
          <TabsTrigger value="packages">Packages</TabsTrigger>
        </TabsList>

        {/* ═══ LISTINGS TAB ═══ */}
        <TabsContent value="listings" className="space-y-3">
          {/* Summary Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {[
              { label: 'Total', value: summaryStats.total, color: 'text-foreground' },
              { label: 'Active', value: summaryStats.active, color: 'text-green-600' },
              { label: 'Paused', value: summaryStats.paused, color: 'text-yellow-600' },
              { label: 'Pending', value: summaryStats.pending, color: 'text-orange-600' },
              { label: 'Expired', value: summaryStats.expired, color: 'text-red-600' },
            ].map(s => (
              <div key={s.label} className="border border-border rounded-lg p-2 text-center">
                <div className={`text-lg font-bold ${s.color}`}>{s.value}</div>
                <div className="text-[10px] text-muted-foreground">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[150px] max-w-[220px]">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input placeholder="Search..." value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }} className="h-8 text-[11px] pl-7" />
            </div>
            <Select value={filterPropertyType} onValueChange={v => { setFilterPropertyType(v); setCurrentPage(1); }}>
              <SelectTrigger className="h-8 text-[11px] w-[120px]"><SelectValue placeholder="Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-[11px]">All Types</SelectItem>
                <SelectItem value="reading_room" className="text-[11px]">Reading Room</SelectItem>
                <SelectItem value="hostel" className="text-[11px]">Hostel</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterTier} onValueChange={v => { setFilterTier(v); setCurrentPage(1); }}>
              <SelectTrigger className="h-8 text-[11px] w-[130px]"><SelectValue placeholder="Tier" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-[11px]">All Tiers</SelectItem>
                {tierOptions.map(t => <SelectItem key={t.value} value={t.value} className="text-[11px]">{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={v => { setFilterStatus(v); setCurrentPage(1); }}>
              <SelectTrigger className="h-8 text-[11px] w-[110px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-[11px]">All Status</SelectItem>
                <SelectItem value="active" className="text-[11px]">Active</SelectItem>
                <SelectItem value="paused" className="text-[11px]">Paused</SelectItem>
                <SelectItem value="pending" className="text-[11px]">Pending</SelectItem>
                <SelectItem value="expired" className="text-[11px]">Expired</SelectItem>
              </SelectContent>
            </Select>
            <Input type="date" placeholder="From" value={filterFrom} onChange={e => { setFilterFrom(e.target.value); setCurrentPage(1); }} className="h-8 text-[11px] w-[130px]" />
            <Input type="date" placeholder="To" value={filterTo} onChange={e => { setFilterTo(e.target.value); setCurrentPage(1); }} className="h-8 text-[11px] w-[130px]" />
            {(searchQuery || filterPropertyType !== 'all' || filterTier !== 'all' || filterStatus !== 'all' || filterFrom || filterTo) && (
              <Button variant="ghost" size="sm" className="h-8 text-[11px]" onClick={clearFilters}><X className="h-3 w-3 mr-1" />Clear</Button>
            )}
            <div className="ml-auto">
              <Button size="sm" className="h-8 text-[11px]" onClick={handleCreate}><Plus className="h-3.5 w-3.5 mr-1" /> Create Ad</Button>
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div className="text-center py-8 text-muted-foreground text-[11px]">Loading...</div>
          ) : (
            <>
              <div className="overflow-x-auto border border-border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-[11px] w-12">S.No</TableHead>
                      <TableHead className="text-[11px]">Serial #</TableHead>
                      <TableHead className="text-[11px]">Property</TableHead>
                      <TableHead className="text-[11px]">Partner</TableHead>
                      <TableHead className="text-[11px]">Tier</TableHead>
                      <TableHead className="text-[11px]">City</TableHead>
                      <TableHead className="text-[11px]">Areas</TableHead>
                      <TableHead className="text-[11px]">Dates</TableHead>
                      <TableHead className="text-[11px]">Priority</TableHead>
                      <TableHead className="text-[11px]">Status</TableHead>
                      <TableHead className="text-[11px]">Stats</TableHead>
                      <TableHead className="text-[11px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedListings.length === 0 ? (
                      <TableRow><TableCell colSpan={12} className="text-center text-[11px] text-muted-foreground py-8">No listings found.</TableCell></TableRow>
                    ) : paginatedListings.map((l, idx) => (
                      <TableRow key={l.id}>
                        <TableCell className="text-[11px] text-muted-foreground">{getSerialNumber(idx, currentPage, pageSize)}</TableCell>
                        <TableCell className="text-[11px] font-mono">{l.serial_number || '—'}</TableCell>
                        <TableCell className="text-[11px]">
                          <div>{l.property_name}</div>
                          <span className="text-muted-foreground capitalize text-[10px]">{l.property_type.replace('_', ' ')}</span>
                        </TableCell>
                        <TableCell className="text-[11px]">{l.partner_name}</TableCell>
                        <TableCell className="text-[11px]">
                          <Badge variant="outline" className="capitalize text-[10px]">{l.tier.replace('_', ' ')}</Badge>
                        </TableCell>
                        <TableCell className="text-[11px]">{l.city_name}</TableCell>
                        <TableCell className="text-[11px] max-w-[120px]">
                          {l.area_names?.length ? (
                            <span className="text-[10px]">{l.area_names.join(', ')}</span>
                          ) : <span className="text-muted-foreground text-[10px]">All areas</span>}
                        </TableCell>
                        <TableCell className="text-[11px] whitespace-nowrap">
                          {format(new Date(l.start_date), 'dd MMM')} – {format(new Date(l.end_date), 'dd MMM yy')}
                        </TableCell>
                        <TableCell className="text-[11px] text-center">{l.priority_rank}</TableCell>
                        <TableCell>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium capitalize ${statusColors[l.status] || ''}`}>
                            {l.status}
                          </span>
                        </TableCell>
                        <TableCell className="text-[11px]">
                          <div className="flex gap-2 text-muted-foreground text-[10px]">
                            <span>👁 {l.impressions}</span>
                            <span>👆 {l.clicks}</span>
                            <span>📋 {l.bookings}</span>
                          </div>
                          {(l.impressions || 0) > 0 && (
                            <div className="text-[10px] text-muted-foreground">CTR: {(((l.clicks || 0) / (l.impressions || 1)) * 100).toFixed(1)}%</div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleEdit(l)}><Pencil className="h-3 w-3" /></Button>
                            {l.status !== 'expired' && (
                              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleToggleStatus(l.id, l.status)}>
                                {l.status === 'active' ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                              </Button>
                            )}
                            <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => handleDelete(l.id)}><Trash2 className="h-3 w-3" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <AdminTablePagination
                currentPage={currentPage} totalItems={filteredListings.length} pageSize={pageSize}
                onPageChange={setCurrentPage} onPageSizeChange={s => { setPageSize(s); setCurrentPage(1); }}
              />
            </>
          )}
        </TabsContent>

        {/* ═══ PACKAGES TAB ═══ */}
        <TabsContent value="packages" className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Ad Packages</h2>
            <Button size="sm" className="h-8 text-[11px]" onClick={() => { resetPkgForm(); setPkgDialogOpen(true); }}><Plus className="h-3.5 w-3.5 mr-1" /> Create Package</Button>
          </div>
          {pkgLoading ? (
            <div className="text-center py-8 text-muted-foreground text-[11px]">Loading...</div>
          ) : (
            <>
              <div className="overflow-x-auto border border-border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-[11px] w-12">S.No</TableHead>
                      <TableHead className="text-[11px]">Serial #</TableHead>
                      <TableHead className="text-[11px]">Name</TableHead>
                      <TableHead className="text-[11px]">Tier</TableHead>
                      <TableHead className="text-[11px]">Duration</TableHead>
                      <TableHead className="text-[11px]">Price</TableHead>
                      <TableHead className="text-[11px]">Status</TableHead>
                      <TableHead className="text-[11px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedPackages.length === 0 ? (
                      <TableRow><TableCell colSpan={8} className="text-center text-[11px] text-muted-foreground py-8">No packages yet.</TableCell></TableRow>
                    ) : paginatedPackages.map((pkg, idx) => (
                      <TableRow key={pkg.id}>
                        <TableCell className="text-[11px] text-muted-foreground">{getSerialNumber(idx, pkgPage, pkgPageSize)}</TableCell>
                        <TableCell className="text-[11px] font-mono">{pkg.serial_number || '—'}</TableCell>
                        <TableCell className="text-[11px] font-medium">{pkg.name}</TableCell>
                        <TableCell className="text-[11px]"><Badge variant="outline" className="capitalize text-[10px]">{pkg.tier.replace('_', ' ')}</Badge></TableCell>
                        <TableCell className="text-[11px]">{pkg.duration_days} days</TableCell>
                        <TableCell className="text-[11px] font-mono">{formatCurrency(pkg.price)}</TableCell>
                        <TableCell>
                          <Badge variant={pkg.is_active ? 'default' : 'secondary'} className="text-[10px]">{pkg.is_active ? 'Active' : 'Inactive'}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => {
                              setEditingPkgId(pkg.id);
                              setPkgForm({ name: pkg.name, description: pkg.description, tier: pkg.tier, duration_days: pkg.duration_days, price: pkg.price, is_active: pkg.is_active });
                              setPkgDialogOpen(true);
                            }}><Pencil className="h-3 w-3" /></Button>
                            <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => handleDeletePkg(pkg.id)}><Trash2 className="h-3 w-3" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <AdminTablePagination
                currentPage={pkgPage} totalItems={packages.length} pageSize={pkgPageSize}
                onPageChange={setPkgPage} onPageSizeChange={s => { setPkgPageSize(s); setPkgPage(1); }}
              />
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* ═══ Create/Edit Listing Dialog ═══ */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base">{editingId ? 'Edit' : 'Create'} Sponsored Listing</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Property Type</Label>
              <Select value={propertyType} onValueChange={(v) => { setPropertyType(v); setPropertyId(''); }}>
                <SelectTrigger className="text-xs h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="reading_room">Reading Room</SelectItem>
                  <SelectItem value="hostel">Hostel</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Property *</Label>
              <Select value={propertyId} onValueChange={setPropertyId}>
                <SelectTrigger className="text-xs h-9"><SelectValue placeholder="Select property" /></SelectTrigger>
                <SelectContent>{properties.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Partner *</Label>
              <Select value={partnerId} onValueChange={setPartnerId}>
                <SelectTrigger className="text-xs h-9"><SelectValue placeholder="Auto-filled from property" /></SelectTrigger>
                <SelectContent>{partners.map(p => <SelectItem key={p.id} value={p.id}>{p.business_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Tier *</Label>
              <Select value={tier} onValueChange={setTier}>
                <SelectTrigger className="text-xs h-9"><SelectValue /></SelectTrigger>
                <SelectContent>{tierOptions.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Target City *</Label>
              <Select value={cityId} onValueChange={(v) => { setCityId(v); setAreaIds([]); }}>
                <SelectTrigger className="text-xs h-9"><SelectValue placeholder="Select city" /></SelectTrigger>
                <SelectContent>{cities.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {areas.length > 0 && (
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Target Areas (optional)</Label>
                <div className="flex flex-wrap gap-1.5">
                  {areas.map(a => (
                    <button key={a.id} onClick={() => toggleAreaId(a.id)}
                      className={`px-2.5 py-1 rounded-lg border text-[11px] font-medium transition-colors ${
                        areaIds.includes(a.id) ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-foreground border-border'
                      }`}>{a.name}</button>
                  ))}
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Start Date *</Label>
                <Popover open={startDateOpen} onOpenChange={setStartDateOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left text-xs h-9", !startDate && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-3.5 w-3.5" />{startDate ? format(startDate, 'PPP') : 'Pick date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={startDate} onSelect={(d) => { setStartDate(d); setStartDateOpen(false); }} className="p-3 pointer-events-auto" /></PopoverContent>
                </Popover>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">End Date *</Label>
                <Popover open={endDateOpen} onOpenChange={setEndDateOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left text-xs h-9", !endDate && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-3.5 w-3.5" />{endDate ? format(endDate, 'PPP') : 'Pick date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={endDate} onSelect={(d) => { setEndDate(d); setEndDateOpen(false); }} className="p-3 pointer-events-auto" /></PopoverContent>
                </Popover>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Priority Rank</Label>
                <Input type="number" value={priorityRank} onChange={e => setPriorityRank(parseInt(e.target.value) || 0)} className="text-xs h-9" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Status</Label>
                <Select value={formStatus} onValueChange={setFormStatus}>
                  <SelectTrigger className="text-xs h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="paused">Paused</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={handleSave}>{editingId ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ Create/Edit Package Dialog ═══ */}
      <Dialog open={pkgDialogOpen} onOpenChange={setPkgDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">{editingPkgId ? 'Edit' : 'Create'} Ad Package</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Package Name *</Label>
              <Input value={pkgForm.name} onChange={e => setPkgForm(p => ({ ...p, name: e.target.value }))} className="h-8 text-xs" placeholder="e.g. 7-Day Featured Boost" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Description</Label>
              <Input value={pkgForm.description} onChange={e => setPkgForm(p => ({ ...p, description: e.target.value }))} className="h-8 text-xs" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Tier</Label>
                <Select value={pkgForm.tier} onValueChange={v => setPkgForm(p => ({ ...p, tier: v }))}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{tierOptions.map(t => <SelectItem key={t.value} value={t.value} className="text-xs">{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Duration (days)</Label>
                <Input type="number" value={pkgForm.duration_days} onChange={e => setPkgForm(p => ({ ...p, duration_days: parseInt(e.target.value) || 7 }))} className="h-8 text-xs" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Price (₹)</Label>
                <Input type="number" value={pkgForm.price} onChange={e => setPkgForm(p => ({ ...p, price: parseFloat(e.target.value) || 0 }))} className="h-8 text-xs" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Status</Label>
                <Select value={pkgForm.is_active ? 'active' : 'inactive'} onValueChange={v => setPkgForm(p => ({ ...p, is_active: v === 'active' }))}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active" className="text-xs">Active</SelectItem>
                    <SelectItem value="inactive" className="text-xs">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setPkgDialogOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={handleSavePkg}>{editingPkgId ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
