import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/hooks/use-toast';
import { ArrowLeft, Building2, Clock, ChevronDown, Save, Loader2, MapPin, MessageCircle } from 'lucide-react';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

function SectionBadge({ number, icon: Icon }: { number: number; icon: React.ElementType }) {
  return (
    <div className="flex items-center gap-2">
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0">{number}</span>
      <Icon className="h-4 w-4 text-muted-foreground" />
    </div>
  );
}

interface LaundryEditorProps {
  onSave: (data: any) => void;
  onCancel: () => void;
  existingPartner?: any;
  isAdmin?: boolean;
}

export function LaundryEditor({ onSave, onCancel, existingPartner, isAdmin = true }: LaundryEditorProps) {
  const { user } = useAuth();
  const [form, setForm] = useState({
    id: existingPartner?.id || '',
    business_name: existingPartner?.business_name || '',
    description: existingPartner?.description || '',
    contact_person: existingPartner?.contact_person || '',
    phone: existingPartner?.phone || '',
    email: existingPartner?.email || '',
    service_area: existingPartner?.service_area || '',
    address: existingPartner?.address || '',
    city: existingPartner?.city || '',
    state: existingPartner?.state || '',
    delivery_time_hours: existingPartner?.delivery_time_hours?.toString() || '48',
    operating_hours: existingPartner?.operating_hours || { start: '08:00', end: '20:00' },
    user_id: existingPartner?.user_id || '',
    latitude: existingPartner?.latitude?.toString() || '',
    longitude: existingPartner?.longitude?.toString() || '',
    whatsapp_number: existingPartner?.whatsapp_number || '',
    whatsapp_chat_enabled: existingPartner?.whatsapp_chat_enabled || false,
  });

  const [partners, setPartners] = useState<Array<{ id: string; name: string; email: string }>>([]);
  const [selectedPartner, setSelectedPartner] = useState(existingPartner?.user_id || '');
  const [openSection, setOpenSection] = useState<number | null>(1);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [capturingLocation, setCapturingLocation] = useState(false);

  useEffect(() => {
    const fetchPartners = async () => {
      try {
        const { data: vendorRoles } = await supabase.from('user_roles').select('user_id').eq('role', 'vendor');
        if (!vendorRoles || vendorRoles.length === 0) return;
        const { data: adminRoles } = await supabase.from('user_roles').select('user_id').eq('role', 'admin');
        const allIds = [...new Set([...vendorRoles.map(r => r.user_id), ...(adminRoles || []).map(r => r.user_id)])];
        const { data: profiles } = await supabase.from('profiles').select('id, name, email').in('id', allIds);
        setPartners((profiles || []).map(p => ({ id: p.id, name: p.name || 'Unknown', email: p.email || '' })));
      } catch (err) { console.error('Error fetching partners:', err); }
    };
    if (isAdmin) fetchPartners();
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin && user?.id) {
      setForm(prev => ({ ...prev, user_id: user.id }));
      setSelectedPartner(user.id);
    }
  }, [isAdmin, user?.id]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setValidationError(null);
  };

  const handleCaptureLocation = () => {
    if (!navigator.geolocation) {
      toast({ title: 'Geolocation not supported', variant: 'destructive' });
      return;
    }
    setCapturingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm(prev => ({
          ...prev,
          latitude: pos.coords.latitude.toFixed(6),
          longitude: pos.coords.longitude.toFixed(6),
        }));
        setCapturingLocation(false);
        toast({ title: 'Location captured' });
      },
      (err) => {
        setCapturingLocation(false);
        toast({ title: 'Location error', description: err.message, variant: 'destructive' });
      },
      { enableHighAccuracy: true }
    );
  };

  const handleSave = async () => {
    if (!form.business_name) { setValidationError('Business name is required'); return; }
    if (!form.contact_person) { setValidationError('Contact person is required'); return; }
    setValidationError(null);
    setIsSaving(true);

    const payload = {
      ...(form.id ? { id: form.id } : {}),
      user_id: selectedPartner || user?.id,
      business_name: form.business_name,
      description: form.description,
      contact_person: form.contact_person,
      phone: form.phone,
      email: form.email,
      service_area: form.service_area,
      address: form.address,
      city: form.city,
      state: form.state,
      delivery_time_hours: parseInt(form.delivery_time_hours) || 48,
      operating_hours: form.operating_hours,
      latitude: form.latitude ? parseFloat(form.latitude) : null,
      longitude: form.longitude ? parseFloat(form.longitude) : null,
      whatsapp_number: form.whatsapp_number || null,
      whatsapp_chat_enabled: form.whatsapp_chat_enabled,
    };

    onSave(payload);
    setIsSaving(false);
  };

  return (
    <div className="w-full mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-xl font-bold text-foreground">{existingPartner ? 'Edit' : 'Create'} Laundry Partner</h1>
          <p className="text-sm text-muted-foreground">{existingPartner ? 'Modify laundry partner details.' : 'Add a new laundry partner.'}</p>
        </div>
        <Button variant="outline" size="sm" onClick={onCancel}><ArrowLeft className="h-4 w-4 mr-1" />Back</Button>
      </div>

      {validationError && (
        <div className="mb-4 p-3 bg-destructive/10 border border-destructive/30 rounded-md text-destructive text-sm">
          <p>{validationError}</p>
        </div>
      )}

      <div className="space-y-4 pb-24">
        {/* Section 1: Basic Information */}
        <Collapsible open={openSection === 1} onOpenChange={(isOpen) => setOpenSection(isOpen ? 1 : null)}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="py-4 px-4 cursor-pointer group">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <SectionBadge number={1} icon={Building2} />
                    <div><CardTitle className="text-base">Basic Information</CardTitle><CardDescription className="text-xs">Business name, contact, email</CardDescription></div>
                  </div>
                  <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="px-4 pb-4 pt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><Label htmlFor="business_name" className="text-sm">Business Name *</Label><Input id="business_name" name="business_name" value={form.business_name} onChange={handleInputChange} placeholder="e.g., QuickWash" /></div>
                  <div><Label htmlFor="contact_person" className="text-sm">Contact Person *</Label><Input id="contact_person" name="contact_person" value={form.contact_person} onChange={handleInputChange} /></div>
                  <div><Label htmlFor="phone" className="text-sm">Phone</Label><Input id="phone" name="phone" value={form.phone} onChange={handleInputChange} /></div>
                  <div><Label htmlFor="email" className="text-sm">Email</Label><Input id="email" name="email" value={form.email} onChange={handleInputChange} /></div>
                  {isAdmin && (
                    <div>
                      <Label className="text-sm">Partner / Owner</Label>
                      <Select value={selectedPartner} onValueChange={(v) => { setSelectedPartner(v); setForm(prev => ({ ...prev, user_id: v })); }}>
                        <SelectTrigger><SelectValue placeholder="Select partner" /></SelectTrigger>
                        <SelectContent>
                          {partners.map(p => <SelectItem key={p.id} value={p.id}>{p.name} ({p.email})</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div className="md:col-span-2"><Label htmlFor="description" className="text-sm">Description</Label><Textarea id="description" name="description" value={form.description} onChange={handleInputChange} rows={3} /></div>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Section 2: Location & Service */}
        <Collapsible open={openSection === 2} onOpenChange={(isOpen) => setOpenSection(isOpen ? 2 : null)}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="py-4 px-4 cursor-pointer group">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <SectionBadge number={2} icon={MapPin} />
                    <div><CardTitle className="text-base">Location & Service</CardTitle><CardDescription className="text-xs">Address, coordinates, service area, delivery time</CardDescription></div>
                  </div>
                  <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="px-4 pb-4 pt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2"><Label htmlFor="address" className="text-sm">Address</Label><Input id="address" name="address" value={form.address} onChange={handleInputChange} /></div>
                  <div><Label htmlFor="city" className="text-sm">City</Label><Input id="city" name="city" value={form.city} onChange={handleInputChange} /></div>
                  <div><Label htmlFor="state" className="text-sm">State</Label><Input id="state" name="state" value={form.state} onChange={handleInputChange} /></div>
                  <div><Label htmlFor="latitude" className="text-sm">Latitude</Label><Input id="latitude" name="latitude" type="number" step="any" value={form.latitude} onChange={handleInputChange} placeholder="e.g., 17.385044" /></div>
                  <div><Label htmlFor="longitude" className="text-sm">Longitude</Label><Input id="longitude" name="longitude" type="number" step="any" value={form.longitude} onChange={handleInputChange} placeholder="e.g., 78.486671" /></div>
                  <div className="md:col-span-2">
                    <Button type="button" variant="outline" size="sm" onClick={handleCaptureLocation} disabled={capturingLocation}>
                      {capturingLocation ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <MapPin className="h-3 w-3 mr-1" />}
                      Capture Current Location
                    </Button>
                  </div>
                  <div><Label htmlFor="service_area" className="text-sm">Service Area</Label><Input id="service_area" name="service_area" value={form.service_area} onChange={handleInputChange} placeholder="e.g., Campus Area" /></div>
                  <div><Label htmlFor="delivery_time_hours" className="text-sm">Delivery Time (hours)</Label><Input id="delivery_time_hours" name="delivery_time_hours" type="number" value={form.delivery_time_hours} onChange={handleInputChange} /></div>
                  <div>
                    <Label className="text-sm">Operating Start</Label>
                    <Input type="time" value={form.operating_hours?.start || '08:00'} onChange={e => setForm(prev => ({ ...prev, operating_hours: { ...prev.operating_hours, start: e.target.value } }))} />
                  </div>
                  <div>
                    <Label className="text-sm">Operating End</Label>
                    <Input type="time" value={form.operating_hours?.end || '20:00'} onChange={e => setForm(prev => ({ ...prev, operating_hours: { ...prev.operating_hours, end: e.target.value } }))} />
                  </div>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Section 3: WhatsApp */}
        <Collapsible open={openSection === 3} onOpenChange={(isOpen) => setOpenSection(isOpen ? 3 : null)}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="py-4 px-4 cursor-pointer group">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <SectionBadge number={3} icon={MessageCircle} />
                    <div><CardTitle className="text-base">WhatsApp</CardTitle><CardDescription className="text-xs">Contact number and chat toggle</CardDescription></div>
                  </div>
                  <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="px-4 pb-4 pt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="whatsapp_number" className="text-sm">WhatsApp Number</Label>
                    <Input id="whatsapp_number" name="whatsapp_number" value={form.whatsapp_number} onChange={handleInputChange} placeholder="e.g., 919876543210" />
                    <p className="text-[10px] text-muted-foreground mt-1">Include country code without + sign</p>
                  </div>
                  <div className="flex items-center gap-3 pt-5">
                    <Switch checked={form.whatsapp_chat_enabled} onCheckedChange={v => setForm(prev => ({ ...prev, whatsapp_chat_enabled: v }))} />
                    <Label className="text-sm">Enable WhatsApp Chat Button</Label>
                  </div>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      </div>

      {/* Sticky save bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-3 flex justify-end gap-3 z-50">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
          {existingPartner ? 'Update' : 'Create'} Laundry Partner
        </Button>
      </div>
    </div>
  );
}
