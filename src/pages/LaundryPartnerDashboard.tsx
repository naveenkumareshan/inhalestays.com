import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { laundryCloudService } from '@/api/laundryCloudService';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { Loader2, Package, CheckCircle2, Phone, Plus, Trash2, Edit2, Save, Clock, Shirt, MapPin } from 'lucide-react';

interface LaundryPartnerDashboardProps {
  autoCreateNew?: boolean;
  onTriggerConsumed?: () => void;
}

const statusColors: Record<string, string> = {
  confirmed: 'bg-blue-100 text-blue-800', pickup_scheduled: 'bg-indigo-100 text-indigo-800',
  picked_up: 'bg-violet-100 text-violet-800', washing: 'bg-cyan-100 text-cyan-800',
  ready: 'bg-teal-100 text-teal-800', out_for_delivery: 'bg-orange-100 text-orange-800',
  delivered: 'bg-green-100 text-green-800',
};
const PARTNER_STATUSES = ['pickup_scheduled', 'picked_up', 'washing', 'ready', 'out_for_delivery', 'delivered'];

const LaundryPartnerDashboard: React.FC<LaundryPartnerDashboardProps> = ({ autoCreateNew, onTriggerConsumed }) => {
  const { user } = useAuth();
  const [partner, setPartner] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('details');

  // Form state for creation/edit
  const [form, setForm] = useState({
    business_name: '', description: '', contact_person: '', phone: '', email: '',
    service_area: '', address: '', city: '', state: '',
    delivery_time_hours: 48, operating_hours: { start: '08:00', end: '20:00' },
  });

  // Items state
  const [items, setItems] = useState<any[]>([]);
  const [newItem, setNewItem] = useState({ name: '', icon: '👕', price: 0, category: 'clothing' });
  const [editingItem, setEditingItem] = useState<string | null>(null);

  // Slots state
  const [slots, setSlots] = useState<any[]>([]);
  const [newSlot, setNewSlot] = useState({ slot_name: '', start_time: '08:00', end_time: '10:00', max_orders: 10 });

  // Orders state
  const [orders, setOrders] = useState<any[]>([]);
  const [otpInputs, setOtpInputs] = useState<Record<string, string>>({});
  const [verifying, setVerifying] = useState<string | null>(null);

  useEffect(() => {
    loadPartner();
  }, []);

  useEffect(() => {
    if (autoCreateNew) {
      onTriggerConsumed?.();
      setActiveTab('details');
    }
  }, [autoCreateNew]);

  const loadPartner = async () => {
    setLoading(true);
    try {
      const p = await laundryCloudService.getMyPartnerRecord();
      setPartner(p);
      if (p) {
        const opHours = (p.operating_hours && typeof p.operating_hours === 'object' && !Array.isArray(p.operating_hours))
          ? { start: (p.operating_hours as any).start || '08:00', end: (p.operating_hours as any).end || '20:00' }
          : { start: '08:00', end: '20:00' };
        setForm({
          business_name: p.business_name || '', description: (p as any).description || '',
          contact_person: p.contact_person || '', phone: p.phone || '', email: p.email || '',
          service_area: p.service_area || '', address: (p as any).address || '',
          city: (p as any).city || '', state: (p as any).state || '',
          delivery_time_hours: (p as any).delivery_time_hours || 48,
          operating_hours: opHours,
        });
        await Promise.all([loadItems(p.id), loadSlots(p.id), loadOrders()]);
      }
    } catch { /* empty */ }
    finally { setLoading(false); }
  };

  const loadItems = async (partnerId: string) => {
    try { setItems(await laundryCloudService.adminGetAllItems(partnerId) || []); } catch { /* empty */ }
  };
  const loadSlots = async (partnerId: string) => {
    try { setSlots(await laundryCloudService.adminGetAllSlots(partnerId) || []); } catch { /* empty */ }
  };
  const loadOrders = async () => {
    try { setOrders(await laundryCloudService.partnerGetOrders() || []); } catch { /* empty */ }
  };

  const handleSavePartner = async () => {
    if (!user) return;
    setSaving(true);
    try {
      if (partner) {
        const updated = await laundryCloudService.adminUpdatePartner(partner.id, {
          ...form, operating_hours: form.operating_hours,
        });
        setPartner(updated);
        toast({ title: 'Details updated' });
      } else {
        const created = await laundryCloudService.adminCreatePartner({
          user_id: user.id, ...form, status: 'pending',
        });
        setPartner(created);
        toast({ title: 'Laundry property created!', description: 'Pending admin approval.' });
      }
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally { setSaving(false); }
  };

  // Items CRUD
  const handleAddItem = async () => {
    if (!partner || !newItem.name) return;
    try {
      await laundryCloudService.adminCreateItem({ ...newItem, partner_id: partner.id });
      setNewItem({ name: '', icon: '👕', price: 0, category: 'clothing' });
      await loadItems(partner.id);
      toast({ title: 'Item added' });
    } catch (e: any) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
  };

  const handleToggleItem = async (id: string, isActive: boolean) => {
    try {
      await laundryCloudService.adminUpdateItem(id, { is_active: !isActive });
      await loadItems(partner.id);
    } catch { /* empty */ }
  };

  const handleDeleteItem = async (id: string) => {
    try {
      await laundryCloudService.adminDeleteItem(id);
      await loadItems(partner.id);
      toast({ title: 'Item removed' });
    } catch { /* empty */ }
  };

  // Slots CRUD
  const handleAddSlot = async () => {
    if (!partner || !newSlot.slot_name) return;
    try {
      await laundryCloudService.adminCreateSlot({ ...newSlot, partner_id: partner.id });
      setNewSlot({ slot_name: '', start_time: '08:00', end_time: '10:00', max_orders: 10 });
      await loadSlots(partner.id);
      toast({ title: 'Slot added' });
    } catch (e: any) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
  };

  const handleToggleSlot = async (id: string, isActive: boolean) => {
    try {
      await laundryCloudService.adminUpdateSlot(id, { is_active: !isActive });
      await loadSlots(partner.id);
    } catch { /* empty */ }
  };

  // Orders
  const verifyOtp = async (orderId: string, type: 'pickup' | 'delivery') => {
    const otp = otpInputs[`${orderId}_${type}`];
    if (!otp || otp.length !== 4) {
      toast({ title: 'Enter 4-digit OTP', variant: 'destructive' });
      return;
    }
    setVerifying(orderId);
    try {
      await laundryCloudService.partnerVerifyOtp(orderId, otp, type);
      toast({ title: `${type === 'pickup' ? 'Pickup' : 'Delivery'} OTP verified!` });
      loadOrders();
    } catch (e: any) {
      toast({ title: 'Invalid OTP', description: e.message, variant: 'destructive' });
    } finally { setVerifying(null); }
  };

  const updateStatus = async (orderId: string, status: string) => {
    try {
      await laundryCloudService.adminUpdateOrder(orderId, { status });
      toast({ title: 'Status updated' });
      loadOrders();
    } catch (e: any) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
  };

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  // No partner record — show creation form
  if (!partner) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-2xl">
        <h1 className="text-2xl font-bold mb-1">Create Laundry Service</h1>
        <p className="text-sm text-muted-foreground mb-6">Set up your laundry business profile</p>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs font-semibold">Business Name *</Label><Input value={form.business_name} onChange={e => setForm(p => ({ ...p, business_name: e.target.value }))} /></div>
              <div><Label className="text-xs font-semibold">Contact Person *</Label><Input value={form.contact_person} onChange={e => setForm(p => ({ ...p, contact_person: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs font-semibold">Phone *</Label><Input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} /></div>
              <div><Label className="text-xs font-semibold">Email *</Label><Input value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} /></div>
            </div>
            <div><Label className="text-xs font-semibold">Description</Label><Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={3} /></div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label className="text-xs font-semibold">Address</Label><Input value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} /></div>
              <div><Label className="text-xs font-semibold">City</Label><Input value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))} /></div>
              <div><Label className="text-xs font-semibold">State</Label><Input value={form.state} onChange={e => setForm(p => ({ ...p, state: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs font-semibold">Service Area</Label><Input value={form.service_area} onChange={e => setForm(p => ({ ...p, service_area: e.target.value }))} placeholder="e.g. 3 km radius" /></div>
              <div><Label className="text-xs font-semibold">Delivery Time (hours)</Label><Input type="number" value={form.delivery_time_hours} onChange={e => setForm(p => ({ ...p, delivery_time_hours: parseInt(e.target.value) || 48 }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs font-semibold">Opening Time</Label><Input type="time" value={form.operating_hours.start} onChange={e => setForm(p => ({ ...p, operating_hours: { ...p.operating_hours, start: e.target.value } }))} /></div>
              <div><Label className="text-xs font-semibold">Closing Time</Label><Input type="time" value={form.operating_hours.end} onChange={e => setForm(p => ({ ...p, operating_hours: { ...p.operating_hours, end: e.target.value } }))} /></div>
            </div>
            <Button onClick={handleSavePartner} disabled={saving || !form.business_name || !form.phone} className="w-full">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
              Create Laundry Property
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Partner exists — show management tabs
  return (
    <div className="container mx-auto px-4 py-6 max-w-3xl">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{partner.business_name}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant={partner.is_active ? 'default' : 'secondary'}>{partner.status}</Badge>
            {partner.serial_number && <span className="text-xs text-muted-foreground">{partner.serial_number}</span>}
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-4 mb-4">
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="items">Items</TabsTrigger>
          <TabsTrigger value="slots">Slots</TabsTrigger>
          <TabsTrigger value="orders">Orders</TabsTrigger>
        </TabsList>

        {/* Details Tab */}
        <TabsContent value="details">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs font-semibold">Business Name</Label><Input value={form.business_name} onChange={e => setForm(p => ({ ...p, business_name: e.target.value }))} /></div>
                <div><Label className="text-xs font-semibold">Contact Person</Label><Input value={form.contact_person} onChange={e => setForm(p => ({ ...p, contact_person: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs font-semibold">Phone</Label><Input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} /></div>
                <div><Label className="text-xs font-semibold">Email</Label><Input value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} /></div>
              </div>
              <div><Label className="text-xs font-semibold">Description</Label><Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={3} /></div>
              <div className="grid grid-cols-3 gap-3">
                <div><Label className="text-xs font-semibold">Address</Label><Input value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} /></div>
                <div><Label className="text-xs font-semibold">City</Label><Input value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))} /></div>
                <div><Label className="text-xs font-semibold">State</Label><Input value={form.state} onChange={e => setForm(p => ({ ...p, state: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs font-semibold">Service Area</Label><Input value={form.service_area} onChange={e => setForm(p => ({ ...p, service_area: e.target.value }))} /></div>
                <div><Label className="text-xs font-semibold">Delivery Time (hours)</Label><Input type="number" value={form.delivery_time_hours} onChange={e => setForm(p => ({ ...p, delivery_time_hours: parseInt(e.target.value) || 48 }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs font-semibold">Opening Time</Label><Input type="time" value={form.operating_hours.start} onChange={e => setForm(p => ({ ...p, operating_hours: { ...p.operating_hours, start: e.target.value } }))} /></div>
                <div><Label className="text-xs font-semibold">Closing Time</Label><Input type="time" value={form.operating_hours.end} onChange={e => setForm(p => ({ ...p, operating_hours: { ...p.operating_hours, end: e.target.value } }))} /></div>
              </div>
              <Button onClick={handleSavePartner} disabled={saving} className="w-full">
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                Save Changes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Items Tab */}
        <TabsContent value="items">
          <Card className="border-0 shadow-sm mb-4">
            <CardHeader className="pb-2"><CardTitle className="text-sm">Add Item</CardTitle></CardHeader>
            <CardContent className="p-4">
              <div className="grid grid-cols-5 gap-2 items-end">
                <div><Label className="text-[10px]">Icon</Label><Input value={newItem.icon} onChange={e => setNewItem(p => ({ ...p, icon: e.target.value }))} className="text-center text-lg" /></div>
                <div className="col-span-2"><Label className="text-[10px]">Name</Label><Input value={newItem.name} onChange={e => setNewItem(p => ({ ...p, name: e.target.value }))} placeholder="Item name" /></div>
                <div><Label className="text-[10px]">Price (₹)</Label><Input type="number" value={newItem.price} onChange={e => setNewItem(p => ({ ...p, price: parseFloat(e.target.value) || 0 }))} /></div>
                <Button size="sm" onClick={handleAddItem} disabled={!newItem.name}><Plus className="h-3 w-3 mr-1" /> Add</Button>
              </div>
              <div className="mt-2">
                <Select value={newItem.category} onValueChange={v => setNewItem(p => ({ ...p, category: v }))}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="clothing">Clothing</SelectItem>
                    <SelectItem value="bedding">Bedding</SelectItem>
                    <SelectItem value="special">Special</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
          <div className="space-y-2">
            {items.map(item => (
              <Card key={item.id} className={`border-0 shadow-sm ${!item.is_active ? 'opacity-50' : ''}`}>
                <CardContent className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{item.icon}</span>
                    <div>
                      <p className="text-sm font-medium">{item.name}</p>
                      <p className="text-xs text-muted-foreground">₹{item.price} • {item.category}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={item.is_active} onCheckedChange={() => handleToggleItem(item.id, item.is_active)} />
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleDeleteItem(item.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {items.length === 0 && <p className="text-center text-muted-foreground py-8 text-sm">No items yet. Add your first laundry item above.</p>}
          </div>
        </TabsContent>

        {/* Slots Tab */}
        <TabsContent value="slots">
          <Card className="border-0 shadow-sm mb-4">
            <CardHeader className="pb-2"><CardTitle className="text-sm">Add Pickup Slot</CardTitle></CardHeader>
            <CardContent className="p-4">
              <div className="grid grid-cols-5 gap-2 items-end">
                <div className="col-span-2"><Label className="text-[10px]">Slot Name</Label><Input value={newSlot.slot_name} onChange={e => setNewSlot(p => ({ ...p, slot_name: e.target.value }))} placeholder="e.g. Morning" /></div>
                <div><Label className="text-[10px]">Start</Label><Input type="time" value={newSlot.start_time} onChange={e => setNewSlot(p => ({ ...p, start_time: e.target.value }))} /></div>
                <div><Label className="text-[10px]">End</Label><Input type="time" value={newSlot.end_time} onChange={e => setNewSlot(p => ({ ...p, end_time: e.target.value }))} /></div>
                <Button size="sm" onClick={handleAddSlot} disabled={!newSlot.slot_name}><Plus className="h-3 w-3 mr-1" /> Add</Button>
              </div>
            </CardContent>
          </Card>
          <div className="space-y-2">
            {slots.map(slot => (
              <Card key={slot.id} className={`border-0 shadow-sm ${!slot.is_active ? 'opacity-50' : ''}`}>
                <CardContent className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{slot.slot_name}</p>
                      <p className="text-xs text-muted-foreground">{slot.start_time?.slice(0, 5)} - {slot.end_time?.slice(0, 5)} • Max {slot.max_orders} orders</p>
                    </div>
                  </div>
                  <Switch checked={slot.is_active} onCheckedChange={() => handleToggleSlot(slot.id, slot.is_active)} />
                </CardContent>
              </Card>
            ))}
            {slots.length === 0 && <p className="text-center text-muted-foreground py-8 text-sm">No pickup slots yet. Add your first slot above.</p>}
          </div>
        </TabsContent>

        {/* Orders Tab */}
        <TabsContent value="orders">
          <div className="grid grid-cols-3 gap-3 mb-4">
            <Card className="border-0 shadow-sm"><CardContent className="p-3 text-center">
              <p className="text-2xl font-bold">{orders.filter(o => !['delivered', 'cancelled'].includes(o.status)).length}</p>
              <p className="text-[10px] text-muted-foreground">Active</p>
            </CardContent></Card>
            <Card className="border-0 shadow-sm"><CardContent className="p-3 text-center">
              <p className="text-2xl font-bold">{orders.filter(o => o.status === 'delivered').length}</p>
              <p className="text-[10px] text-muted-foreground">Completed</p>
            </CardContent></Card>
            <Card className="border-0 shadow-sm"><CardContent className="p-3 text-center">
              <p className="text-2xl font-bold">₹{orders.filter(o => o.status === 'delivered').reduce((s, o) => s + (o.total_amount || 0), 0)}</p>
              <p className="text-[10px] text-muted-foreground">Earnings</p>
            </CardContent></Card>
          </div>
          <div className="space-y-3">
            {orders.map(o => (
              <Card key={o.id} className="border-0 shadow-sm">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold">{o.serial_number}</p>
                      <p className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={`text-[10px] ${statusColors[o.status] || 'bg-muted'}`}>{o.status?.replace(/_/g, ' ')}</Badge>
                      <span className="text-sm font-medium">₹{o.total_amount}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{(o.profiles as any)?.name}</span>
                    {(o.profiles as any)?.phone && (
                      <a href={`tel:${(o.profiles as any).phone}`} className="flex items-center gap-1 text-primary">
                        <Phone className="h-3 w-3" /> {(o.profiles as any).phone}
                      </a>
                    )}
                  </div>
                  {o.pickup_address && (
                    <p className="text-xs bg-muted/50 rounded p-2">
                      📍 Room {(o.pickup_address as any)?.room}, {(o.pickup_address as any)?.block}, {(o.pickup_address as any)?.floor}
                    </p>
                  )}
                  <div className="text-xs space-y-1">
                    {o.laundry_order_items?.map((item: any) => (
                      <div key={item.id} className="flex justify-between">
                        <span>{item.item_name} × {item.quantity}</span>
                        <span>₹{item.subtotal}</span>
                      </div>
                    ))}
                  </div>
                  {!o.pickup_otp_verified && o.status !== 'delivered' && o.status !== 'cancelled' && (
                    <div className="flex gap-2">
                      <Input placeholder="Pickup OTP" className="h-8 text-xs flex-1" maxLength={4}
                        value={otpInputs[`${o.id}_pickup`] || ''}
                        onChange={e => setOtpInputs(p => ({ ...p, [`${o.id}_pickup`]: e.target.value }))} />
                      <Button size="sm" className="h-8 text-xs" onClick={() => verifyOtp(o.id, 'pickup')} disabled={verifying === o.id}>
                        {verifying === o.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3 mr-1" />}
                        Verify Pickup
                      </Button>
                    </div>
                  )}
                  {o.pickup_otp_verified && !o.delivery_otp_verified && o.status !== 'delivered' && (
                    <div className="flex gap-2">
                      <Input placeholder="Delivery OTP" className="h-8 text-xs flex-1" maxLength={4}
                        value={otpInputs[`${o.id}_delivery`] || ''}
                        onChange={e => setOtpInputs(p => ({ ...p, [`${o.id}_delivery`]: e.target.value }))} />
                      <Button size="sm" className="h-8 text-xs" onClick={() => verifyOtp(o.id, 'delivery')} disabled={verifying === o.id}>
                        {verifying === o.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3 mr-1" />}
                        Verify Delivery
                      </Button>
                    </div>
                  )}
                  {o.status !== 'delivered' && o.status !== 'cancelled' && (
                    <Select value={o.status} onValueChange={(v) => updateStatus(o.id, v)}>
                      <SelectTrigger className="h-7 text-[10px]"><SelectValue /></SelectTrigger>
                      <SelectContent>{PARTNER_STATUSES.map(s => <SelectItem key={s} value={s}>{s.replace(/_/g, ' ')}</SelectItem>)}</SelectContent>
                    </Select>
                  )}
                </CardContent>
              </Card>
            ))}
            {orders.length === 0 && (
              <div className="text-center py-12">
                <Package className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">No orders assigned to you yet</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default LaundryPartnerDashboard;
