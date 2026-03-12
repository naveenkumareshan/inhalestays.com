import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { MessItem } from '@/components/admin/MessItem';
import { MessEditor } from '@/components/admin/MessEditor';
import { Plus, UtensilsCrossed, Search } from 'lucide-react';
import ErrorBoundary from '../../components/ErrorBoundary';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { upsertMessPartner, getMessPackages, upsertMessPackage, deleteMessPackage } from '@/api/messService';
import { formatCurrency } from '@/utils/currency';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Trash2, Loader2 } from 'lucide-react';

const ITEMS_PER_PAGE = 9;
const MEALS = ['breakfast', 'lunch', 'dinner'];
const MEAL_LABELS: Record<string, string> = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner' };

interface MessManagementProps {
  autoCreateNew?: boolean;
  onTriggerConsumed?: () => void;
}

export default function MessManagement({ autoCreateNew, onTriggerConsumed }: MessManagementProps = {}) {
  const [messes, setMesses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [selectedMess, setSelectedMess] = useState<any>(null);
  const [isPackagesOpen, setIsPackagesOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const { user } = useAuth();

  // Packages state
  const [packages, setPackages] = useState<any[]>([]);
  const [pkgForm, setPkgForm] = useState({ name: '', meal_types: ['breakfast', 'lunch', 'dinner'], duration_type: 'monthly', duration_count: '1', price: '' });
  const [mealCheckboxes, setMealCheckboxes] = useState({ breakfast: true, lunch: true, dinner: true });

  useEffect(() => { fetchMesses(); }, []);

  // Auto-create new when triggered from parent
  useEffect(() => {
    if (autoCreateNew) {
      handleAddMess();
      onTriggerConsumed?.();
    }
  }, [autoCreateNew]);

  const fetchMesses = async () => {
    try {
      setLoading(true);
      setError(null);
      let query = supabase.from('mess_partners' as any).select('*, profiles:user_id(name, email, phone)');
      if (user?.role !== 'admin') {
        const userId = user?.role === 'vendor_employee' && user.vendorId ? user.vendorId : user?.id;
        query = query.eq('user_id', userId);
      }
      const { data, error: err } = await query.order('created_at', { ascending: false });
      if (err) throw err;
      setMesses(data || []);
    } catch (err) {
      console.error('Error fetching mess places:', err);
      setError('Unable to fetch data. Please refresh.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddMess = () => { setSelectedMess(null); setShowEditor(true); };
  const handleEditMess = (mess: any) => { setSelectedMess(mess); setShowEditor(true); };

  const handleToggleActive = async (messId: string, isActive: boolean) => {
    try {
      await supabase.from('mess_partners' as any).update({ is_active: isActive, ...(isActive ? {} : { is_booking_active: false, is_partner_visible: false }) }).eq('id', messId);
      toast({ title: "Success", description: `Mess ${isActive ? 'activated' : 'deactivated'} successfully` });
      fetchMesses();
    } catch { toast({ title: "Error", description: "Failed to update status", variant: "destructive" }); }
  };

  const handleToggleBooking = async (messId: string, isBookingActive: boolean) => {
    try {
      await supabase.from('mess_partners' as any).update({ is_booking_active: isBookingActive }).eq('id', messId);
      toast({ title: "Success", description: `Online booking ${isBookingActive ? 'enabled' : 'disabled'} successfully` });
      fetchMesses();
    } catch { toast({ title: "Error", description: "Failed to update booking status", variant: "destructive" }); }
  };

  const handleTogglePartnerVisible = async (messId: string, isVisible: boolean) => {
    try {
      await supabase.from('mess_partners' as any).update({ is_partner_visible: isVisible }).eq('id', messId);
      toast({ title: "Success", description: `Mess ${isVisible ? 'shown' : 'hidden'} in partner views` });
      fetchMesses();
    } catch { toast({ title: "Error", description: "Failed to update visibility", variant: "destructive" }); }
  };

  const handleDeleteMess = async (messId: string) => {
    try {
      await supabase.from('mess_partners' as any).delete().eq('id', messId);
      toast({ title: "Success", description: "Mess deleted successfully" });
      fetchMesses();
    } catch { toast({ title: "Error", description: "Failed to delete mess", variant: "destructive" }); }
  };

  const handleManagePackages = async (mess: any) => {
    setSelectedMess(mess);
    setIsPackagesOpen(true);
    try {
      const pkgs = await getMessPackages(mess.id);
      setPackages(pkgs);
    } catch { setPackages([]); }
  };

  const handleEditorSave = async (messData: any) => {
    try {
      await upsertMessPartner(messData);
      setShowEditor(false);
      fetchMesses();
      toast({ title: "Mess saved successfully" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to save", variant: "destructive" });
    }
  };

  const savePackage = async () => {
    if (!selectedMess?.id) return;
    const meal_types = Object.entries(mealCheckboxes).filter(([, v]) => v).map(([k]) => k);
    try {
      await upsertMessPackage({ mess_id: selectedMess.id, name: pkgForm.name, meal_types, duration_type: pkgForm.duration_type, duration_count: parseInt(pkgForm.duration_count) || 1, price: parseFloat(pkgForm.price) || 0 });
      toast({ title: 'Package saved!' });
      setPackages(await getMessPackages(selectedMess.id));
      setPkgForm({ name: '', meal_types: [], duration_type: 'monthly', duration_count: '1', price: '' });
    } catch (e: any) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
  };

  const removePackage = async (id: string) => {
    await deleteMessPackage(id);
    if (selectedMess?.id) setPackages(await getMessPackages(selectedMess.id));
  };

  // Filter & paginate
  const filtered = messes.filter(m => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return m.name?.toLowerCase().includes(q) || m.serial_number?.toLowerCase().includes(q) || m.location?.toLowerCase().includes(q);
  });
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  if (showEditor) {
    return (
      <ErrorBoundary>
        <MessEditor
          existingMess={selectedMess}
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
            <h1 className="text-lg font-semibold tracking-tight">Manage Mess Places</h1>
            <p className="text-xs text-muted-foreground mt-0.5">View and manage all mess / food partners.</p>
          </div>
          <Button onClick={handleAddMess} size="sm" className="flex items-center gap-1.5">
            <Plus className="h-4 w-4" /> Add Mess
          </Button>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search mess places..." value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }} className="pl-9 h-9" />
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-16">
            <UtensilsCrossed className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm font-medium">Unable to load mess places</p>
            <Button onClick={fetchMesses} variant="outline" size="sm" className="mt-4">Retry</Button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <UtensilsCrossed className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm font-medium">{searchQuery ? 'No mess places match your search' : 'No Mess Places Found'}</p>
            <p className="text-xs text-muted-foreground mb-4">{searchQuery ? 'Try a different search term' : 'Start by adding your first mess.'}</p>
            {!searchQuery && <Button onClick={handleAddMess} size="sm"><Plus className="h-4 w-4 mr-1" /> Add Mess</Button>}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {paginated.map((mess) => (
                <MessItem
                  key={mess.id}
                  mess={mess}
                  onEdit={handleEditMess}
                  onDelete={handleDeleteMess}
                  onManagePackages={handleManagePackages}
                  onToggleActive={handleToggleActive}
                  onToggleBooking={handleToggleBooking}
                  onTogglePartnerVisible={handleTogglePartnerVisible}
                />
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-2">
                <p className="text-xs text-muted-foreground">
                  Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)} of {filtered.length}
                </p>
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" className="h-7 text-xs" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>Prev</Button>
                  {Array.from({ length: totalPages }, (_, i) => (
                    <Button key={i + 1} size="sm" variant={currentPage === i + 1 ? "default" : "outline"} className="h-7 w-7 p-0 text-xs" onClick={() => setCurrentPage(i + 1)}>{i + 1}</Button>
                  ))}
                  <Button size="sm" variant="outline" className="h-7 text-xs" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}>Next</Button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Packages Dialog */}
        <Dialog open={isPackagesOpen} onOpenChange={setIsPackagesOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Meal Packages - {selectedMess?.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {packages.map(p => (
                <div key={p.id} className="flex items-center justify-between p-3 border rounded">
                  <div>
                    <p className="font-medium">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{(p.meal_types as string[])?.join(', ')} · {p.duration_count} {p.duration_type}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold">{formatCurrency(p.price)}</span>
                    <Button variant="ghost" size="icon" onClick={() => removePackage(p.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </div>
              ))}
              <Separator />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div><Label>Package Name</Label><Input value={pkgForm.name} onChange={e => setPkgForm(f => ({ ...f, name: e.target.value }))} /></div>
                <div><Label>Price (₹)</Label><Input type="number" value={pkgForm.price} onChange={e => setPkgForm(f => ({ ...f, price: e.target.value }))} /></div>
                <div>
                  <Label>Duration Type</Label>
                  <Select value={pkgForm.duration_type} onValueChange={v => setPkgForm(f => ({ ...f, duration_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Duration Count</Label><Input type="number" value={pkgForm.duration_count} onChange={e => setPkgForm(f => ({ ...f, duration_count: e.target.value }))} /></div>
                <div className="col-span-full">
                  <Label>Meals Included</Label>
                  <div className="flex gap-4 mt-1">
                    {MEALS.map(m => (
                      <label key={m} className="flex items-center gap-1.5 text-sm">
                        <input type="checkbox" checked={mealCheckboxes[m as keyof typeof mealCheckboxes]} onChange={e => setMealCheckboxes(c => ({ ...c, [m]: e.target.checked }))} />
                        {MEAL_LABELS[m]}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              <Button onClick={savePackage} disabled={!pkgForm.name || !pkgForm.price}><Plus className="h-4 w-4 mr-1" /> Add Package</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </ErrorBoundary>
  );
}
