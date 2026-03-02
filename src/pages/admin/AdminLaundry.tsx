import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { laundryCloudService } from '@/api/laundryCloudService';
import { toast } from '@/hooks/use-toast';
import { Loader2, Plus, Pencil, Trash2 } from 'lucide-react';

const ORDER_STATUSES = ['pending', 'confirmed', 'pickup_scheduled', 'picked_up', 'washing', 'ready', 'out_for_delivery', 'delivered', 'cancelled'];

const statusColors: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800', confirmed: 'bg-blue-100 text-blue-800',
  pickup_scheduled: 'bg-indigo-100 text-indigo-800', picked_up: 'bg-violet-100 text-violet-800',
  washing: 'bg-cyan-100 text-cyan-800', ready: 'bg-teal-100 text-teal-800',
  out_for_delivery: 'bg-orange-100 text-orange-800', delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

// ── Orders Tab ──
const OrdersTab = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [partners, setPartners] = useState<any[]>([]);

  const load = async () => {
    setLoading(true);
    try {
      const [o, p] = await Promise.all([
        laundryCloudService.adminGetAllOrders({ status: filter }),
        laundryCloudService.adminGetPartners(),
      ]);
      setOrders(o || []);
      setPartners(p || []);
    } catch { /* empty */ } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [filter]);

  const updateOrder = async (id: string, updates: Record<string, any>) => {
    try {
      await laundryCloudService.adminUpdateOrder(id, updates);
      toast({ title: 'Order updated' });
      load();
    } catch (e: any) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-[180px] h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {ORDER_STATUSES.map(s => <SelectItem key={s} value={s}>{s.replace(/_/g, ' ')}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div> : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-[11px]">S.No.</TableHead>
                <TableHead className="text-[11px]">Order #</TableHead>
                <TableHead className="text-[11px]">Student</TableHead>
                <TableHead className="text-[11px]">Items</TableHead>
                <TableHead className="text-[11px]">Total</TableHead>
                <TableHead className="text-[11px]">Status</TableHead>
                <TableHead className="text-[11px]">Partner</TableHead>
                <TableHead className="text-[11px]">Pickup</TableHead>
                <TableHead className="text-[11px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((o, i) => (
                <TableRow key={o.id}>
                  <TableCell className="text-[11px]">{i + 1}</TableCell>
                  <TableCell className="text-[11px] font-medium">{o.serial_number}</TableCell>
                  <TableCell className="text-[11px]">{(o.profiles as any)?.name || '—'}</TableCell>
                  <TableCell className="text-[11px]">{o.laundry_order_items?.length || 0}</TableCell>
                  <TableCell className="text-[11px]">₹{o.total_amount}</TableCell>
                  <TableCell>
                    <Select value={o.status} onValueChange={(v) => updateOrder(o.id, { status: v })}>
                      <SelectTrigger className="h-6 text-[10px] w-[130px]"><SelectValue /></SelectTrigger>
                      <SelectContent>{ORDER_STATUSES.map(s => <SelectItem key={s} value={s}>{s.replace(/_/g, ' ')}</SelectItem>)}</SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Select value={o.partner_id || ''} onValueChange={(v) => updateOrder(o.id, { partner_id: v })}>
                      <SelectTrigger className="h-6 text-[10px] w-[120px]"><SelectValue placeholder="Assign" /></SelectTrigger>
                      <SelectContent>{partners.filter((p: any) => p.status === 'approved').map((p: any) => <SelectItem key={p.id} value={p.id}>{p.business_name}</SelectItem>)}</SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-[11px]">
                    <Input type="date" className="h-6 text-[10px] w-[120px]" value={o.pickup_date || ''} onChange={e => updateOrder(o.id, { pickup_date: e.target.value })} />
                  </TableCell>
                  <TableCell>
                    <Input type="date" className="h-6 text-[10px] w-[120px]" placeholder="Delivery" value={o.delivery_date || ''} onChange={e => updateOrder(o.id, { delivery_date: e.target.value })} />
                  </TableCell>
                </TableRow>
              ))}
              {orders.length === 0 && <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No orders</TableCell></TableRow>}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

// ── Items Tab ──
const ItemsTab = () => {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', icon: '👕', price: 0, category: 'clothing' });

  const load = async () => { setLoading(true); try { setItems(await laundryCloudService.adminGetAllItems() || []); } catch {} finally { setLoading(false); } };
  useEffect(() => { load(); }, []);

  const save = async () => {
    try {
      await laundryCloudService.adminCreateItem(form);
      toast({ title: 'Item added' });
      setForm({ name: '', icon: '👕', price: 0, category: 'clothing' });
      setShowAdd(false);
      load();
    } catch (e: any) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> Add Item</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Laundry Item</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Name</Label><Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></div>
              <div><Label>Icon (Emoji)</Label><Input value={form.icon} onChange={e => setForm(p => ({ ...p, icon: e.target.value }))} /></div>
              <div><Label>Price (₹)</Label><Input type="number" value={form.price} onChange={e => setForm(p => ({ ...p, price: Number(e.target.value) }))} /></div>
              <div><Label>Category</Label>
                <Select value={form.category} onValueChange={v => setForm(p => ({ ...p, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="clothing">Clothing</SelectItem>
                    <SelectItem value="bedding">Bedding</SelectItem>
                    <SelectItem value="special">Special</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={save} className="w-full">Save</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div> : (
        <Table>
          <TableHeader><TableRow>
            <TableHead className="text-[11px]">Icon</TableHead>
            <TableHead className="text-[11px]">Name</TableHead>
            <TableHead className="text-[11px]">Price</TableHead>
            <TableHead className="text-[11px]">Category</TableHead>
            <TableHead className="text-[11px]">Status</TableHead>
            <TableHead className="text-[11px]">Actions</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {items.map(it => (
              <TableRow key={it.id}>
                <TableCell>{it.icon}</TableCell>
                <TableCell className="text-[11px]">{it.name}</TableCell>
                <TableCell className="text-[11px]">₹{it.price}</TableCell>
                <TableCell className="text-[11px] capitalize">{it.category}</TableCell>
                <TableCell><Badge variant={it.is_active ? 'default' : 'secondary'} className="text-[10px]">{it.is_active ? 'Active' : 'Inactive'}</Badge></TableCell>
                <TableCell>
                  <Button size="icon" variant="ghost" className="h-6 w-6" onClick={async () => {
                    await laundryCloudService.adminDeleteItem(it.id);
                    toast({ title: 'Item deactivated' }); load();
                  }}><Trash2 className="h-3 w-3" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
};

// ── Partners Tab ──
const PartnersTab = () => {
  const [partners, setPartners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ user_id: '', business_name: '', contact_person: '', phone: '', email: '', service_area: '', commission_percentage: 10, status: 'approved' });

  const load = async () => { setLoading(true); try { setPartners(await laundryCloudService.adminGetPartners() || []); } catch {} finally { setLoading(false); } };
  useEffect(() => { load(); }, []);

  const save = async () => {
    try {
      await laundryCloudService.adminCreatePartner(form);
      toast({ title: 'Partner added' });
      setShowAdd(false);
      setForm({ user_id: '', business_name: '', contact_person: '', phone: '', email: '', service_area: '', commission_percentage: 10, status: 'approved' });
      load();
    } catch (e: any) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> Add Partner</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Laundry Partner</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>User ID (from profiles)</Label><Input value={form.user_id} onChange={e => setForm(p => ({ ...p, user_id: e.target.value }))} placeholder="UUID of the partner user" /></div>
              <div><Label>Business Name</Label><Input value={form.business_name} onChange={e => setForm(p => ({ ...p, business_name: e.target.value }))} /></div>
              <div><Label>Contact Person</Label><Input value={form.contact_person} onChange={e => setForm(p => ({ ...p, contact_person: e.target.value }))} /></div>
              <div><Label>Phone</Label><Input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} /></div>
              <div><Label>Email</Label><Input value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} /></div>
              <div><Label>Service Area</Label><Input value={form.service_area} onChange={e => setForm(p => ({ ...p, service_area: e.target.value }))} /></div>
              <div><Label>Commission %</Label><Input type="number" value={form.commission_percentage} onChange={e => setForm(p => ({ ...p, commission_percentage: Number(e.target.value) }))} /></div>
              <Button onClick={save} className="w-full">Save Partner</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div> : (
        <Table>
          <TableHeader><TableRow>
            <TableHead className="text-[11px]">S.No.</TableHead>
            <TableHead className="text-[11px]">Serial #</TableHead>
            <TableHead className="text-[11px]">Business Name</TableHead>
            <TableHead className="text-[11px]">Contact</TableHead>
            <TableHead className="text-[11px]">Phone</TableHead>
            <TableHead className="text-[11px]">Area</TableHead>
            <TableHead className="text-[11px]">Commission</TableHead>
            <TableHead className="text-[11px]">Status</TableHead>
            <TableHead className="text-[11px]">Actions</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {partners.map((p, i) => (
              <TableRow key={p.id}>
                <TableCell className="text-[11px]">{i + 1}</TableCell>
                <TableCell className="text-[11px]">{p.serial_number}</TableCell>
                <TableCell className="text-[11px] font-medium">{p.business_name}</TableCell>
                <TableCell className="text-[11px]">{p.contact_person}</TableCell>
                <TableCell className="text-[11px]">{p.phone}</TableCell>
                <TableCell className="text-[11px]">{p.service_area}</TableCell>
                <TableCell className="text-[11px]">{p.commission_percentage}%</TableCell>
                <TableCell>
                  <Select value={p.status} onValueChange={async (v) => {
                    await laundryCloudService.adminUpdatePartner(p.id, { status: v, is_active: v === 'approved' });
                    toast({ title: 'Partner updated' }); load();
                  }}>
                    <SelectTrigger className="h-6 text-[10px] w-[100px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Button size="icon" variant="ghost" className="h-6 w-6"><Pencil className="h-3 w-3" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
};

// ── Slots Tab ──
const SlotsTab = () => {
  const [slots, setSlots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ slot_name: '', start_time: '09:00', end_time: '12:00', max_orders: 10 });

  const load = async () => { setLoading(true); try { setSlots(await laundryCloudService.adminGetAllSlots() || []); } catch {} finally { setLoading(false); } };
  useEffect(() => { load(); }, []);

  const save = async () => {
    try {
      await laundryCloudService.adminCreateSlot(form);
      toast({ title: 'Slot added' });
      setShowAdd(false);
      load();
    } catch (e: any) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> Add Slot</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Pickup Slot</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Slot Name</Label><Input value={form.slot_name} onChange={e => setForm(p => ({ ...p, slot_name: e.target.value }))} placeholder="e.g. Morning" /></div>
              <div><Label>Start Time</Label><Input type="time" value={form.start_time} onChange={e => setForm(p => ({ ...p, start_time: e.target.value }))} /></div>
              <div><Label>End Time</Label><Input type="time" value={form.end_time} onChange={e => setForm(p => ({ ...p, end_time: e.target.value }))} /></div>
              <div><Label>Max Orders</Label><Input type="number" value={form.max_orders} onChange={e => setForm(p => ({ ...p, max_orders: Number(e.target.value) }))} /></div>
              <Button onClick={save} className="w-full">Save</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div> : (
        <Table>
          <TableHeader><TableRow>
            <TableHead className="text-[11px]">Slot Name</TableHead>
            <TableHead className="text-[11px]">Time</TableHead>
            <TableHead className="text-[11px]">Max Orders</TableHead>
            <TableHead className="text-[11px]">Status</TableHead>
            <TableHead className="text-[11px]">Actions</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {slots.map(s => (
              <TableRow key={s.id}>
                <TableCell className="text-[11px] font-medium">{s.slot_name}</TableCell>
                <TableCell className="text-[11px]">{s.start_time?.slice(0, 5)} - {s.end_time?.slice(0, 5)}</TableCell>
                <TableCell className="text-[11px]">{s.max_orders}</TableCell>
                <TableCell><Badge variant={s.is_active ? 'default' : 'secondary'} className="text-[10px]">{s.is_active ? 'Active' : 'Inactive'}</Badge></TableCell>
                <TableCell>
                  <Button size="icon" variant="ghost" className="h-6 w-6" onClick={async () => {
                    await laundryCloudService.adminUpdateSlot(s.id, { is_active: !s.is_active });
                    toast({ title: s.is_active ? 'Slot deactivated' : 'Slot activated' }); load();
                  }}><Pencil className="h-3 w-3" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
};

// ── Main Page ──
const AdminLaundry = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Laundry Management</h1>
        <p className="text-sm text-muted-foreground">Manage orders, items, partners and pickup slots</p>
      </div>
      <Tabs defaultValue="orders">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="orders" className="text-xs">Orders</TabsTrigger>
          <TabsTrigger value="items" className="text-xs">Items</TabsTrigger>
          <TabsTrigger value="partners" className="text-xs">Partners</TabsTrigger>
          <TabsTrigger value="slots" className="text-xs">Slots</TabsTrigger>
        </TabsList>
        <TabsContent value="orders"><OrdersTab /></TabsContent>
        <TabsContent value="items"><ItemsTab /></TabsContent>
        <TabsContent value="partners"><PartnersTab /></TabsContent>
        <TabsContent value="slots"><SlotsTab /></TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminLaundry;
