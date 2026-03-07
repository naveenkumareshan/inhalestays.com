
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format, differenceInDays, addDays } from 'date-fns';
import { CalendarIcon, Package, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AdminTablePagination, getSerialNumber } from '@/components/admin/AdminTablePagination';
import { formatCurrency } from '@/utils/currency';

interface Promotion {
  id: string;
  serial_number: string;
  property_type: string;
  property_id: string;
  tier: string;
  target_city_id: string;
  target_area_ids: string[];
  start_date: string;
  end_date: string;
  status: string;
  payment_status: string;
  property_name: string;
  city_name: string;
  area_names: string[];
  impressions: number;
  clicks: number;
  bookings: number;
}

interface AdPackage {
  id: string;
  name: string;
  description: string;
  tier: string;
  duration_days: number;
  price: number;
}

const tierBadgeStyle: Record<string, string> = {
  featured: 'bg-amber-100 text-amber-800',
  inline_sponsored: 'bg-blue-100 text-blue-800',
  boost_ranking: 'bg-purple-100 text-purple-800',
};

const statusColors: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  paused: 'bg-yellow-100 text-yellow-800',
  expired: 'bg-red-100 text-red-800',
  pending: 'bg-orange-100 text-orange-800',
};

export default function MyPromotions() {
  const { user } = useAuth();
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [partnerId, setPartnerId] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Book package
  const [bookDialogOpen, setBookDialogOpen] = useState(false);
  const [packages, setPackages] = useState<AdPackage[]>([]);
  const [selectedPkgId, setSelectedPkgId] = useState('');
  const [bookPropertyType, setBookPropertyType] = useState('reading_room');
  const [bookPropertyId, setBookPropertyId] = useState('');
  const [bookCityId, setBookCityId] = useState('');
  const [bookAreaIds, setBookAreaIds] = useState<string[]>([]);
  const [bookStartDate, setBookStartDate] = useState<Date>();
  const [bookStartDateOpen, setBookStartDateOpen] = useState(false);
  const [myProperties, setMyProperties] = useState<any[]>([]);
  const [cities, setCities] = useState<any[]>([]);
  const [areas, setAreas] = useState<any[]>([]);
  const [allAreas, setAllAreas] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { fetchData(); }, [user]);

  const fetchData = async () => {
    if (!user?.id) return;
    setLoading(true);

    const { data: partnerData } = await supabase.from('partners').select('id').eq('user_id', user.id).single();
    if (!partnerData) { setLoading(false); return; }
    setPartnerId(partnerData.id);

    const [listingsRes, citiesRes, areasRes] = await Promise.all([
      supabase.from('sponsored_listings').select('*').eq('partner_id', partnerData.id).order('created_at', { ascending: false }),
      supabase.from('cities').select('id, name').eq('is_active', true).order('name'),
      supabase.from('areas').select('id, name, city_id').eq('is_active', true).order('name'),
    ]);

    setCities(citiesRes.data || []);
    setAllAreas(areasRes.data || []);

    const enriched = await Promise.all((listingsRes.data || []).map(async (l: any) => {
      let property_name = '';
      if (l.property_type === 'hostel') {
        const { data } = await supabase.from('hostels').select('name').eq('id', l.property_id).single();
        property_name = data?.name || 'Unknown';
      } else {
        const { data } = await supabase.from('cabins').select('name').eq('id', l.property_id).single();
        property_name = data?.name || 'Unknown';
      }

      const { data: cityData } = await supabase.from('cities').select('name').eq('id', l.target_city_id).single();

      let area_names: string[] = [];
      if (l.target_area_ids?.length > 0) {
        const { data: ad } = await supabase.from('areas').select('name').in('id', l.target_area_ids);
        area_names = ad?.map((a: any) => a.name) || [];
      }

      const { data: events } = await supabase.from('sponsored_listing_events').select('event_type').eq('sponsored_listing_id', l.id);

      return {
        ...l,
        property_name,
        city_name: cityData?.name || '',
        area_names,
        impressions: events?.filter((e: any) => e.event_type === 'impression').length || 0,
        clicks: events?.filter((e: any) => e.event_type === 'click').length || 0,
        bookings: events?.filter((e: any) => e.event_type === 'booking').length || 0,
      };
    }));

    setPromotions(enriched);
    setLoading(false);
  };

  // Fetch packages when dialog opens
  useEffect(() => {
    if (bookDialogOpen) {
      supabase.from('sponsored_packages').select('id, name, description, tier, duration_days, price').eq('is_active', true).order('price')
        .then(({ data }) => setPackages((data || []) as AdPackage[]));
    }
  }, [bookDialogOpen]);

  // Fetch properties for booking
  useEffect(() => {
    if (!bookDialogOpen || !user?.id) return;
    const table = bookPropertyType === 'hostel' ? 'hostels' : 'cabins';
    supabase.from(table).select('id, name').eq('created_by', user.id).eq('is_active', true).order('name')
      .then(({ data }) => setMyProperties(data || []));
  }, [bookPropertyType, bookDialogOpen, user?.id]);

  useEffect(() => {
    if (bookCityId) {
      setAreas(allAreas.filter(a => a.city_id === bookCityId));
    } else {
      setAreas([]);
    }
  }, [bookCityId, allAreas]);

  const filteredPromotions = useMemo(() => {
    let result = [...promotions];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(p => p.property_name.toLowerCase().includes(q) || p.serial_number?.toLowerCase().includes(q) || p.city_name.toLowerCase().includes(q));
    }
    if (filterStatus !== 'all') result = result.filter(p => p.status === filterStatus);
    return result;
  }, [promotions, searchQuery, filterStatus]);

  const paginatedPromotions = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredPromotions.slice(start, start + pageSize);
  }, [filteredPromotions, currentPage, pageSize]);

  const handleBookPackage = async () => {
    if (!selectedPkgId || !bookPropertyId || !bookCityId || !bookStartDate || !partnerId) {
      toast({ title: 'Error', description: 'Please fill all required fields.', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    const pkg = packages.find(p => p.id === selectedPkgId);
    if (!pkg) { setSubmitting(false); return; }

    const endDate = addDays(bookStartDate, pkg.duration_days);
    const { error } = await supabase.from('sponsored_listings').insert({
      property_type: bookPropertyType,
      property_id: bookPropertyId,
      partner_id: partnerId,
      tier: pkg.tier,
      target_city_id: bookCityId,
      target_area_ids: bookAreaIds,
      start_date: format(bookStartDate, 'yyyy-MM-dd'),
      end_date: format(endDate, 'yyyy-MM-dd'),
      status: 'pending',
      payment_status: 'pending',
      package_id: pkg.id,
      created_by: user?.id,
    });

    setSubmitting(false);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Booking Submitted', description: 'Your ad package request has been submitted. Admin will review and activate it.' });
      setBookDialogOpen(false);
      setSelectedPkgId(''); setBookPropertyId(''); setBookCityId(''); setBookAreaIds([]); setBookStartDate(undefined);
      fetchData();
    }
  };

  if (loading) {
    return <div className="p-4 text-[11px] text-muted-foreground">Loading promotions...</div>;
  }

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold">My Promotions</h1>
        <Button size="sm" className="h-8 text-[11px]" onClick={() => setBookDialogOpen(true)}>
          <Package className="h-3.5 w-3.5 mr-1" /> Book Ad Package
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[150px] max-w-[220px]">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Search..." value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }} className="h-8 text-[11px] pl-7" />
        </div>
        <Select value={filterStatus} onValueChange={v => { setFilterStatus(v); setCurrentPage(1); }}>
          <SelectTrigger className="h-8 text-[11px] w-[110px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-[11px]">All Status</SelectItem>
            <SelectItem value="active" className="text-[11px]">Active</SelectItem>
            <SelectItem value="pending" className="text-[11px]">Pending</SelectItem>
            <SelectItem value="paused" className="text-[11px]">Paused</SelectItem>
            <SelectItem value="expired" className="text-[11px]">Expired</SelectItem>
          </SelectContent>
        </Select>
        {(searchQuery || filterStatus !== 'all') && (
          <Button variant="ghost" size="sm" className="h-8 text-[11px]" onClick={() => { setSearchQuery(''); setFilterStatus('all'); setCurrentPage(1); }}><X className="h-3 w-3 mr-1" />Clear</Button>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto border border-border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-[11px] w-12">S.No</TableHead>
              <TableHead className="text-[11px]">Serial #</TableHead>
              <TableHead className="text-[11px]">Property</TableHead>
              <TableHead className="text-[11px]">Tier</TableHead>
              <TableHead className="text-[11px]">City</TableHead>
              <TableHead className="text-[11px]">Areas</TableHead>
              <TableHead className="text-[11px]">Dates</TableHead>
              <TableHead className="text-[11px]">Days Left</TableHead>
              <TableHead className="text-[11px]">Status</TableHead>
              <TableHead className="text-[11px]">Stats</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedPromotions.length === 0 ? (
              <TableRow><TableCell colSpan={10} className="text-center text-[11px] text-muted-foreground py-8">No promotions found.</TableCell></TableRow>
            ) : paginatedPromotions.map((p, idx) => {
              const remaining = differenceInDays(new Date(p.end_date), new Date());
              const ctr = p.impressions > 0 ? ((p.clicks / p.impressions) * 100).toFixed(1) : '0.0';
              return (
                <TableRow key={p.id}>
                  <TableCell className="text-[11px] text-muted-foreground">{getSerialNumber(idx, currentPage, pageSize)}</TableCell>
                  <TableCell className="text-[11px] font-mono">{p.serial_number || '—'}</TableCell>
                  <TableCell className="text-[11px]">
                    <div>{p.property_name}</div>
                    <span className="text-muted-foreground capitalize text-[10px]">{p.property_type.replace('_', ' ')}</span>
                  </TableCell>
                  <TableCell>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium capitalize ${tierBadgeStyle[p.tier] || ''}`}>{p.tier.replace('_', ' ')}</span>
                  </TableCell>
                  <TableCell className="text-[11px]">{p.city_name}</TableCell>
                  <TableCell className="text-[11px] max-w-[120px]">
                    {p.area_names.length ? <span className="text-[10px]">{p.area_names.join(', ')}</span> : <span className="text-muted-foreground text-[10px]">All areas</span>}
                  </TableCell>
                  <TableCell className="text-[11px] whitespace-nowrap">
                    {format(new Date(p.start_date), 'dd MMM')} – {format(new Date(p.end_date), 'dd MMM yy')}
                  </TableCell>
                  <TableCell className="text-[11px]">
                    {p.status === 'active' && remaining > 0 ? <span className="text-primary font-medium">{remaining}d</span> : '—'}
                  </TableCell>
                  <TableCell>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium capitalize ${statusColors[p.status] || ''}`}>{p.status}</span>
                  </TableCell>
                  <TableCell className="text-[11px]">
                    <div className="flex gap-2 text-muted-foreground text-[10px]">
                      <span>👁 {p.impressions}</span>
                      <span>👆 {p.clicks}</span>
                      <span>📋 {p.bookings}</span>
                    </div>
                    {p.impressions > 0 && <div className="text-[10px] text-muted-foreground">CTR: {ctr}%</div>}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      <AdminTablePagination
        currentPage={currentPage} totalItems={filteredPromotions.length} pageSize={pageSize}
        onPageChange={setCurrentPage} onPageSizeChange={s => { setPageSize(s); setCurrentPage(1); }}
      />

      {/* ═══ Book Ad Package Dialog ═══ */}
      <Dialog open={bookDialogOpen} onOpenChange={setBookDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base">Book Ad Package</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Package selection */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Select Package *</Label>
              {packages.length === 0 ? (
                <p className="text-[11px] text-muted-foreground">No packages available.</p>
              ) : (
                <div className="grid gap-2">
                  {packages.map(pkg => (
                    <button key={pkg.id} onClick={() => setSelectedPkgId(pkg.id)}
                      className={`w-full text-left border rounded-lg p-3 transition-colors ${
                        selectedPkgId === pkg.id ? 'border-primary bg-primary/5' : 'border-border'
                      }`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-xs font-medium">{pkg.name}</div>
                          {pkg.description && <div className="text-[10px] text-muted-foreground">{pkg.description}</div>}
                        </div>
                        <div className="text-right">
                          <div className="text-xs font-bold">{formatCurrency(pkg.price)}</div>
                          <div className="text-[10px] text-muted-foreground">{pkg.duration_days} days</div>
                        </div>
                      </div>
                      <Badge variant="outline" className="mt-1 capitalize text-[10px]">{pkg.tier.replace('_', ' ')}</Badge>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {selectedPkgId && (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Property Type</Label>
                  <Select value={bookPropertyType} onValueChange={v => { setBookPropertyType(v); setBookPropertyId(''); }}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="reading_room">Reading Room</SelectItem>
                      <SelectItem value="hostel">Hostel</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Property *</Label>
                  <Select value={bookPropertyId} onValueChange={setBookPropertyId}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select your property" /></SelectTrigger>
                    <SelectContent>{myProperties.map(p => <SelectItem key={p.id} value={p.id} className="text-xs">{p.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Target City *</Label>
                  <Select value={bookCityId} onValueChange={v => { setBookCityId(v); setBookAreaIds([]); }}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select city" /></SelectTrigger>
                    <SelectContent>{cities.map(c => <SelectItem key={c.id} value={c.id} className="text-xs">{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                {areas.length > 0 && (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Target Areas (optional)</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {areas.map(a => (
                        <button key={a.id} onClick={() => setBookAreaIds(prev => prev.includes(a.id) ? prev.filter(x => x !== a.id) : [...prev, a.id])}
                          className={`px-2.5 py-1 rounded-lg border text-[11px] font-medium transition-colors ${
                            bookAreaIds.includes(a.id) ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-foreground border-border'
                          }`}>{a.name}</button>
                      ))}
                    </div>
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Start Date *</Label>
                  <Popover open={bookStartDateOpen} onOpenChange={setBookStartDateOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start text-left text-xs h-9", !bookStartDate && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-3.5 w-3.5" />{bookStartDate ? format(bookStartDate, 'PPP') : 'Pick start date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={bookStartDate} onSelect={(d) => { setBookStartDate(d); setBookStartDateOpen(false); }} className="p-3 pointer-events-auto" /></PopoverContent>
                  </Popover>
                  {bookStartDate && selectedPkgId && (
                    <p className="text-[10px] text-muted-foreground">
                      End date: {format(addDays(bookStartDate, packages.find(p => p.id === selectedPkgId)!.duration_days), 'dd MMM yyyy')}
                    </p>
                  )}
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setBookDialogOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={handleBookPackage} disabled={submitting || !selectedPkgId}>
              {submitting ? 'Submitting...' : 'Submit Booking Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
