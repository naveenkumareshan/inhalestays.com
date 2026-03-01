
import React, { useState, useEffect } from 'react';
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
import { format } from 'date-fns';
import { CalendarIcon, Plus, Pencil, Pause, Play, Trash2, BarChart2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SponsoredListing {
  id: string;
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
  created_at: string;
  // joined
  property_name?: string;
  partner_name?: string;
  city_name?: string;
  impressions?: number;
  clicks?: number;
  bookings?: number;
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
};

export default function SponsoredListingsPage() {
  const { user } = useAuth();
  const [listings, setListings] = useState<SponsoredListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [propertyType, setPropertyType] = useState('reading_room');
  const [propertyId, setPropertyId] = useState('');
  const [partnerId, setPartnerId] = useState('');
  const [tier, setTier] = useState('featured');
  const [cityId, setCityId] = useState('');
  const [areaIds, setAreaIds] = useState<string[]>([]);
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [priorityRank, setPriorityRank] = useState(0);
  const [formStatus, setFormStatus] = useState('active');

  // Lookup data
  const [properties, setProperties] = useState<any[]>([]);
  const [partners, setPartners] = useState<any[]>([]);
  const [cities, setCities] = useState<any[]>([]);
  const [areas, setAreas] = useState<any[]>([]);

  useEffect(() => {
    fetchListings();
    fetchLookups();
  }, []);

  const fetchLookups = async () => {
    const [citiesRes, partnersRes] = await Promise.all([
      supabase.from('cities').select('id, name').eq('is_active', true).order('name'),
      supabase.from('partners').select('id, business_name, user_id').eq('is_active', true).order('business_name'),
    ]);
    setCities(citiesRes.data || []);
    setPartners(partnersRes.data || []);
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

  // Auto-fill partner from property
  useEffect(() => {
    if (propertyId && properties.length > 0) {
      const prop = properties.find(p => p.id === propertyId);
      if (prop?.created_by) {
        const partner = partners.find(p => p.user_id === prop.created_by);
        if (partner) setPartnerId(partner.id);
      }
    }
  }, [propertyId, properties, partners]);

  const fetchListings = async () => {
    setLoading(true);
    const { data: listingsData, error } = await supabase
      .from('sponsored_listings')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) { console.error(error); setLoading(false); return; }

    // Enrich with names and analytics
    const enriched = await Promise.all((listingsData || []).map(async (l: any) => {
      // Property name
      let property_name = '';
      if (l.property_type === 'hostel') {
        const { data } = await supabase.from('hostels').select('name').eq('id', l.property_id).single();
        property_name = data?.name || 'Unknown';
      } else {
        const { data } = await supabase.from('cabins').select('name').eq('id', l.property_id).single();
        property_name = data?.name || 'Unknown';
      }

      // Partner name
      const { data: partnerData } = await supabase.from('partners').select('business_name').eq('id', l.partner_id).single();

      // City name
      const { data: cityData } = await supabase.from('cities').select('name').eq('id', l.target_city_id).single();

      // Analytics
      const { data: events } = await supabase
        .from('sponsored_listing_events')
        .select('event_type')
        .eq('sponsored_listing_id', l.id);

      const impressions = events?.filter(e => e.event_type === 'impression').length || 0;
      const clicks = events?.filter(e => e.event_type === 'click').length || 0;
      const bookings = events?.filter(e => e.event_type === 'booking').length || 0;

      return {
        ...l,
        property_name,
        partner_name: partnerData?.business_name || 'Unknown',
        city_name: cityData?.name || 'Unknown',
        impressions,
        clicks,
        bookings,
      };
    }));

    setListings(enriched);
    setLoading(false);
  };

  const resetForm = () => {
    setPropertyType('reading_room');
    setPropertyId('');
    setPartnerId('');
    setTier('featured');
    setCityId('');
    setAreaIds([]);
    setStartDate(undefined);
    setEndDate(undefined);
    setPriorityRank(0);
    setFormStatus('active');
    setEditingId(null);
  };

  const handleCreate = () => {
    resetForm();
    setDialogOpen(true);
  };

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
      property_type: propertyType,
      property_id: propertyId,
      partner_id: partnerId,
      tier,
      target_city_id: cityId,
      target_area_ids: areaIds,
      start_date: format(startDate, 'yyyy-MM-dd'),
      end_date: format(endDate, 'yyyy-MM-dd'),
      priority_rank: priorityRank,
      status: formStatus,
      created_by: user?.id,
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
      setDialogOpen(false);
      resetForm();
      fetchListings();
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'paused' : 'active';
    const { error } = await supabase.from('sponsored_listings').update({ status: newStatus }).eq('id', id);
    if (!error) fetchListings();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('sponsored_listings').delete().eq('id', id);
    if (!error) {
      toast({ title: 'Deleted' });
      fetchListings();
    }
  };

  const toggleAreaId = (areaId: string) => {
    setAreaIds(prev => prev.includes(areaId) ? prev.filter(a => a !== areaId) : [...prev, areaId]);
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold">Sponsored Listings</h1>
        <Button size="sm" onClick={handleCreate}><Plus className="h-4 w-4 mr-1" /> Create Ad</Button>
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground text-sm">Loading...</div>
      ) : listings.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">No sponsored listings yet.</div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Property</TableHead>
                <TableHead className="text-xs">Partner</TableHead>
                <TableHead className="text-xs">Tier</TableHead>
                <TableHead className="text-xs">City</TableHead>
                <TableHead className="text-xs">Dates</TableHead>
                <TableHead className="text-xs">Priority</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs">Stats</TableHead>
                <TableHead className="text-xs">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {listings.map(l => (
                <TableRow key={l.id}>
                  <TableCell className="text-xs">
                    <div>{l.property_name}</div>
                    <span className="text-muted-foreground capitalize">{l.property_type.replace('_', ' ')}</span>
                  </TableCell>
                  <TableCell className="text-xs">{l.partner_name}</TableCell>
                  <TableCell className="text-xs">
                    <Badge variant="outline" className="capitalize text-[10px]">{l.tier.replace('_', ' ')}</Badge>
                  </TableCell>
                  <TableCell className="text-xs">{l.city_name}</TableCell>
                  <TableCell className="text-xs whitespace-nowrap">
                    {format(new Date(l.start_date), 'dd MMM')} - {format(new Date(l.end_date), 'dd MMM yyyy')}
                  </TableCell>
                  <TableCell className="text-xs text-center">{l.priority_rank}</TableCell>
                  <TableCell>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium capitalize ${statusColors[l.status] || ''}`}>
                      {l.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs">
                    <div className="flex gap-2 text-muted-foreground">
                      <span title="Impressions">👁 {l.impressions}</span>
                      <span title="Clicks">👆 {l.clicks}</span>
                      <span title="Bookings">📋 {l.bookings}</span>
                    </div>
                    {(l.impressions || 0) > 0 && (
                      <div className="text-[10px] text-muted-foreground">
                        CTR: {(((l.clicks || 0) / (l.impressions || 1)) * 100).toFixed(1)}%
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleEdit(l)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      {l.status !== 'expired' && (
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleToggleStatus(l.id, l.status)}>
                          {l.status === 'active' ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                        </Button>
                      )}
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleDelete(l.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Create/Edit Dialog */}
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
                <SelectContent>
                  {properties.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Partner *</Label>
              <Select value={partnerId} onValueChange={setPartnerId}>
                <SelectTrigger className="text-xs h-9"><SelectValue placeholder="Auto-filled from property" /></SelectTrigger>
                <SelectContent>
                  {partners.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.business_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Tier *</Label>
              <Select value={tier} onValueChange={setTier}>
                <SelectTrigger className="text-xs h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {tierOptions.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Target City *</Label>
              <Select value={cityId} onValueChange={(v) => { setCityId(v); setAreaIds([]); }}>
                <SelectTrigger className="text-xs h-9"><SelectValue placeholder="Select city" /></SelectTrigger>
                <SelectContent>
                  {cities.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {areas.length > 0 && (
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Target Areas (optional, multi-select)</Label>
                <div className="flex flex-wrap gap-1.5">
                  {areas.map(a => (
                    <button
                      key={a.id}
                      onClick={() => toggleAreaId(a.id)}
                      className={`px-2.5 py-1 rounded-lg border text-[11px] font-medium transition-colors ${
                        areaIds.includes(a.id) ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-foreground border-border'
                      }`}
                    >
                      {a.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Start Date *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left text-xs h-9", !startDate && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                      {startDate ? format(startDate, 'PPP') : 'Pick date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={startDate} onSelect={setStartDate} className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">End Date *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left text-xs h-9", !endDate && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                      {endDate ? format(endDate, 'PPP') : 'Pick date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={endDate} onSelect={setEndDate} className="p-3 pointer-events-auto" />
                  </PopoverContent>
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
    </div>
  );
}
