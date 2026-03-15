import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { LaundryItem } from '@/components/admin/LaundryItem';
import { LaundryEditor } from '@/components/admin/LaundryEditor';
import { Plus, Shirt, Search, Loader2, Trash2, Pencil, MessageCircle } from 'lucide-react';
import ErrorBoundary from '../../components/ErrorBoundary';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AdminTablePagination } from '@/components/admin/AdminTablePagination';
import { laundryCloudService } from '@/api/laundryCloudService';
import { supabase } from '@/integrations/supabase/client';
import { WhatsAppPropertyDialog } from '@/components/admin/WhatsAppPropertyDialog';

const DEFAULT_PAGE_SIZE = 9;

interface AdminLaundryProps {
  autoCreateNew?: boolean;
  onTriggerConsumed?: () => void;
}

export default function AdminLaundry({ autoCreateNew, onTriggerConsumed }: AdminLaundryProps = {}) {
  const [partners, setPartners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const { user, authChecked } = useAuth();

  // Items & Slots dialogs
  const [isItemsOpen, setIsItemsOpen] = useState(false);
  const [isSlotsOpen, setIsSlotsOpen] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const [slots, setSlots] = useState<any[]>([]);
  const [itemCounts, setItemCounts] = useState<Record<string, number>>({});
  const [slotCounts, setSlotCounts] = useState<Record<string, number>>({});

  // Item form
  const [itemForm, setItemForm] = useState({ name: '', icon: '👕', price: '', category: 'clothing' });
  const [slotForm, setSlotForm] = useState({ slot_name: '', start_time: '09:00', end_time: '12:00', max_orders: '10' });
  const [whatsAppPartner, setWhatsAppPartner] = useState<any>(null);

  useEffect(() => {
    if (authChecked && user?.id) fetchPartners();
  }, [authChecked, user?.id]);

  useEffect(() => {
    if (autoCreateNew) {
      handleAddPartner();
      onTriggerConsumed?.();
    }
  }, [autoCreateNew]);

  const fetchPartners = async () => {
    try {
      setLoading(true);
      let query = supabase.from('laundry_partners').select('*, profiles:user_id(name, email, phone)');
      if (user?.role !== 'admin') {
        const userId = user?.role === 'vendor_employee' && user.vendorId ? user.vendorId : user?.id;
        query = query.eq('user_id', userId);
      }
      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      setPartners(data || []);

      // Fetch item/slot counts
      const ids = (data || []).map((p: any) => p.id);
      if (ids.length > 0) {
        const [itemsRes, slotsRes] = await Promise.all([
          supabase.from('laundry_items').select('partner_id').in('partner_id', ids),
          supabase.from('laundry_pickup_slots').select('partner_id').in('partner_id', ids),
        ]);
        const ic: Record<string, number> = {};
        const sc: Record<string, number> = {};
        (itemsRes.data || []).forEach((i: any) => { ic[i.partner_id] = (ic[i.partner_id] || 0) + 1; });
        (slotsRes.data || []).forEach((s: any) => { sc[s.partner_id] = (sc[s.partner_id] || 0) + 1; });
        setItemCounts(ic);
        setSlotCounts(sc);
      }
    } catch (err) {
      console.error('Error fetching laundry partners:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddPartner = () => { setSelectedPartner(null); setShowEditor(true); };
  const handleEditPartner = (p: any) => { setSelectedPartner(p); setShowEditor(true); };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    try {
      await laundryCloudService.adminUpdatePartner(id, { is_active: isActive, ...(isActive ? {} : { is_booking_active: false, is_partner_visible: false }) });
      toast({ title: `Partner ${isActive ? 'activated' : 'deactivated'}` });
      fetchPartners();
    } catch { toast({ title: 'Error', variant: 'destructive' }); }
  };

  const handleToggleBooking = async (id: string, val: boolean) => {
    try {
      await laundryCloudService.adminUpdatePartner(id, { is_booking_active: val });
      toast({ title: `Online booking ${val ? 'enabled' : 'disabled'}` });
      fetchPartners();
    } catch { toast({ title: 'Error', variant: 'destructive' }); }
  };

  const handleTogglePartnerVisible = async (id: string, val: boolean) => {
    try {
      await laundryCloudService.adminUpdatePartner(id, { is_partner_visible: val });
      toast({ title: `Partner ${val ? 'shown' : 'hidden'} from employees` });
      fetchPartners();
    } catch { toast({ title: 'Error', variant: 'destructive' }); }
  };

  const handleToggleStudentVisible = async (id: string, val: boolean) => {
    try {
      await laundryCloudService.adminUpdatePartner(id, { is_student_visible: val });
      toast({ title: `Partner ${val ? 'shown to' : 'hidden from'} students` });
      fetchPartners();
    } catch { toast({ title: 'Error', variant: 'destructive' }); }
  };

  const handleEditorSave = async (data: any) => {
    try {
      if (data.id) {
        await laundryCloudService.adminUpdatePartner(data.id, data);
      } else {
        await laundryCloudService.adminCreatePartner(data);
      }
      setShowEditor(false);
      fetchPartners();
      toast({ title: 'Laundry partner saved' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  // ── Items Dialog ──
  const openItems = async (partner: any) => {
    setSelectedPartner(partner);
    setIsItemsOpen(true);
    try {
      setItems(await laundryCloudService.adminGetAllItems(partner.id) || []);
    } catch { setItems([]); }
  };

  const saveItem = async () => {
    if (!selectedPartner?.id || !itemForm.name) return;
    try {
      await laundryCloudService.adminCreateItem({
        name: itemForm.name, icon: itemForm.icon, price: parseFloat(itemForm.price) || 0,
        category: itemForm.category, partner_id: selectedPartner.id,
      });
      toast({ title: 'Item added' });
      setItemForm({ name: '', icon: '👕', price: '', category: 'clothing' });
      setItems(await laundryCloudService.adminGetAllItems(selectedPartner.id) || []);
      fetchPartners();
    } catch (e: any) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
  };

  const toggleItem = async (id: string, isActive: boolean) => {
    await laundryCloudService.adminUpdateItem(id, { is_active: !isActive });
    if (selectedPartner?.id) setItems(await laundryCloudService.adminGetAllItems(selectedPartner.id) || []);
    fetchPartners();
  };

  // ── Slots Dialog ──
  const openSlots = async (partner: any) => {
    setSelectedPartner(partner);
    setIsSlotsOpen(true);
    try {
      setSlots(await laundryCloudService.adminGetAllSlots(partner.id) || []);
    } catch { setSlots([]); }
  };

  const saveSlot = async () => {
    if (!selectedPartner?.id || !slotForm.slot_name) return;
    try {
      await laundryCloudService.adminCreateSlot({
        slot_name: slotForm.slot_name, start_time: slotForm.start_time, end_time: slotForm.end_time,
        max_orders: parseInt(slotForm.max_orders) || 10, partner_id: selectedPartner.id,
      });
      toast({ title: 'Slot added' });
      setSlotForm({ slot_name: '', start_time: '09:00', end_time: '12:00', max_orders: '10' });
      setSlots(await laundryCloudService.adminGetAllSlots(selectedPartner.id) || []);
      fetchPartners();
    } catch (e: any) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
  };

  const toggleSlot = async (id: string, isActive: boolean) => {
    await laundryCloudService.adminUpdateSlot(id, { is_active: !isActive });
    if (selectedPartner?.id) setSlots(await laundryCloudService.adminGetAllSlots(selectedPartner.id) || []);
    fetchPartners();
  };

  // Filter & paginate
  const filtered = partners.filter(p => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return p.business_name?.toLowerCase().includes(q) || p.serial_number?.toLowerCase().includes(q) || p.service_area?.toLowerCase().includes(q);
  });
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  if (showEditor) {
    return (
      <ErrorBoundary>
        <LaundryEditor
          existingPartner={selectedPartner}
          onSave={handleEditorSave}
          onCancel={() => setShowEditor(false)}
          isAdmin={user?.role === 'admin'}
        />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold tracking-tight">
              Manage Laundry
              {filtered.length > 0 && <Badge variant="secondary" className="ml-2 text-xs font-normal">{filtered.length}</Badge>}
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">View and manage all laundry partners.</p>
          </div>
          <Button onClick={handleAddPartner} size="sm" className="flex items-center gap-1.5">
            <Plus className="h-4 w-4" /> Add Laundry
          </Button>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search laundry partners..." value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }} className="pl-9 h-9" />
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Shirt className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm font-medium">{searchQuery ? 'No partners match your search' : 'No Laundry Partners Found'}</p>
            <p className="text-xs text-muted-foreground mb-4">{searchQuery ? 'Try a different search term' : 'Start by adding your first laundry partner.'}</p>
            {!searchQuery && <Button onClick={handleAddPartner} size="sm"><Plus className="h-4 w-4 mr-1" /> Add Laundry</Button>}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {paginated.map((p) => (
                <LaundryItem
                  key={p.id}
                  partner={p}
                  onEdit={handleEditPartner}
                  onManageItems={openItems}
                  onManageSlots={openSlots}
                  onToggleActive={handleToggleActive}
                  onToggleBooking={handleToggleBooking}
                  onTogglePartnerVisible={handleTogglePartnerVisible}
                  onToggleStudentVisible={handleToggleStudentVisible}
                  onWhatsAppConfig={setWhatsAppPartner}
                  itemCount={itemCounts[p.id] || 0}
                  slotCount={slotCounts[p.id] || 0}
                />
              ))}
            </div>

            <AdminTablePagination
              currentPage={currentPage}
              totalItems={filtered.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={(s) => { setPageSize(s); setCurrentPage(1); }}
              pageSizeOptions={[9, 18, 36, 72]}
            />
          </>
        )}

        {/* Items Dialog */}
        <Dialog open={isItemsOpen} onOpenChange={setIsItemsOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Laundry Items — {selectedPartner?.business_name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {items.map(it => (
                <div key={it.id} className="flex items-center justify-between p-3 border rounded">
                  <div className="flex items-center gap-2">
                    <span>{it.icon}</span>
                    <div>
                      <p className="font-medium text-sm">{it.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{it.category} · ₹{it.price}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={it.is_active ? 'default' : 'secondary'} className="text-[10px]">{it.is_active ? 'Active' : 'Inactive'}</Badge>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toggleItem(it.id, it.is_active)}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
              <div className="border-t pt-3 grid grid-cols-2 md:grid-cols-4 gap-2">
                <div><Label className="text-xs">Name</Label><Input value={itemForm.name} onChange={e => setItemForm(f => ({ ...f, name: e.target.value }))} className="h-8 text-xs" /></div>
                <div><Label className="text-xs">Icon</Label><Input value={itemForm.icon} onChange={e => setItemForm(f => ({ ...f, icon: e.target.value }))} className="h-8 text-xs" /></div>
                <div><Label className="text-xs">Price (₹)</Label><Input type="number" value={itemForm.price} onChange={e => setItemForm(f => ({ ...f, price: e.target.value }))} className="h-8 text-xs" /></div>
                <div>
                  <Label className="text-xs">Category</Label>
                  <Select value={itemForm.category} onValueChange={v => setItemForm(f => ({ ...f, category: v }))}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="clothing">Clothing</SelectItem>
                      <SelectItem value="bedding">Bedding</SelectItem>
                      <SelectItem value="special">Special</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={saveItem} disabled={!itemForm.name} size="sm"><Plus className="h-4 w-4 mr-1" /> Add Item</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Slots Dialog */}
        <Dialog open={isSlotsOpen} onOpenChange={setIsSlotsOpen}>
          <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Pickup Slots — {selectedPartner?.business_name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {slots.map(s => (
                <div key={s.id} className="flex items-center justify-between p-3 border rounded">
                  <div>
                    <p className="font-medium text-sm">{s.slot_name}</p>
                    <p className="text-xs text-muted-foreground">{s.start_time?.slice(0, 5)} – {s.end_time?.slice(0, 5)} · Max {s.max_orders}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={s.is_active ? 'default' : 'secondary'} className="text-[10px]">{s.is_active ? 'Active' : 'Inactive'}</Badge>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toggleSlot(s.id, s.is_active)}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
              <div className="border-t pt-3 grid grid-cols-2 gap-2">
                <div><Label className="text-xs">Slot Name</Label><Input value={slotForm.slot_name} onChange={e => setSlotForm(f => ({ ...f, slot_name: e.target.value }))} className="h-8 text-xs" placeholder="e.g., Morning" /></div>
                <div><Label className="text-xs">Max Orders</Label><Input type="number" value={slotForm.max_orders} onChange={e => setSlotForm(f => ({ ...f, max_orders: e.target.value }))} className="h-8 text-xs" /></div>
                <div><Label className="text-xs">Start Time</Label><Input type="time" value={slotForm.start_time} onChange={e => setSlotForm(f => ({ ...f, start_time: e.target.value }))} className="h-8 text-xs" /></div>
                <div><Label className="text-xs">End Time</Label><Input type="time" value={slotForm.end_time} onChange={e => setSlotForm(f => ({ ...f, end_time: e.target.value }))} className="h-8 text-xs" /></div>
              </div>
              <Button onClick={saveSlot} disabled={!slotForm.slot_name} size="sm"><Plus className="h-4 w-4 mr-1" /> Add Slot</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* WhatsApp Dialog */}
        {whatsAppPartner && (
          <WhatsAppPropertyDialog
            open={!!whatsAppPartner}
            onOpenChange={(open) => { if (!open) setWhatsAppPartner(null); }}
            propertyId={whatsAppPartner.id}
            propertyType="laundry"
            propertyName={whatsAppPartner.business_name}
            initialNumber={whatsAppPartner.whatsapp_number || ''}
            initialEnabled={whatsAppPartner.whatsapp_chat_enabled || false}
            onSaved={fetchPartners}
          />
        )}
      </div>
    </ErrorBoundary>
  );
}
