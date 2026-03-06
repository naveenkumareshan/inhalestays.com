import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ImageUpload } from "@/components/ImageUpload";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Building2, Image, Clock, CalendarDays, ChevronDown, Plus, Trash2, Save, Loader2 } from "lucide-react";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { getMealTimings, upsertMealTiming, deleteMealTiming, getWeeklyMenu, upsertWeeklyMenu } from '@/api/messService';

function SectionBadge({ number, icon: Icon }: { number: number; icon: React.ElementType }) {
  return (
    <div className="flex items-center gap-2">
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0">{number}</span>
      <Icon className="h-4 w-4 text-muted-foreground" />
    </div>
  );
}

const MEALS = ['breakfast', 'lunch', 'dinner'];
const MEAL_LABELS: Record<string, string> = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner' };
const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

interface MessEditorProps {
  onSave: (mess: any) => void;
  onCancel: () => void;
  existingMess?: any;
  isAdmin?: boolean;
}

export function MessEditor({ onSave, onCancel, existingMess, isAdmin = true }: MessEditorProps) {
  const { user } = useAuth();
  const [mess, setMess] = useState({
    id: existingMess?.id || '',
    name: existingMess?.name || '',
    location: existingMess?.location || '',
    description: existingMess?.description || '',
    contact_number: existingMess?.contact_number || '',
    food_type: existingMess?.food_type || 'both',
    capacity: existingMess?.capacity?.toString() || '',
    starting_price: existingMess?.starting_price?.toString() || '',
    logo_image: existingMess?.logo_image || '',
    images: existingMess?.images || [],
    is_active: existingMess?.is_active ?? true,
    user_id: existingMess?.user_id || '',
  });

  const [timings, setTimings] = useState<any[]>([]);
  const [timingForm, setTimingForm] = useState({ meal_type: 'breakfast', start_time: '07:00', end_time: '09:30' });
  const [menu, setMenu] = useState<any[]>([]);

  const [partners, setPartners] = useState<Array<{ id: string; name: string; email: string }>>([]);
  const [selectedPartner, setSelectedPartner] = useState(existingMess?.user_id || '');

  const [openSection, setOpenSection] = useState<number | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch partners for admin
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

  // Load timings and menu for existing mess
  useEffect(() => {
    if (existingMess?.id) {
      getMealTimings(existingMess.id).then(setTimings).catch(() => {});
      getWeeklyMenu(existingMess.id).then(setMenu).catch(() => {});
    }
  }, [existingMess?.id]);

  useEffect(() => {
    if (!isAdmin && user?.id) {
      setMess(prev => ({ ...prev, user_id: user.id }));
      setSelectedPartner(user.id);
    }
  }, [isAdmin, user?.id]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setMess(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setValidationError(null);
  };

  const handleImageUpload = (url: string) => {
    const updatedImages = [...(mess.images || []), url];
    setMess(prev => ({ ...prev, logo_image: url, images: updatedImages }));
  };

  const handleImageRemove = (url: string) => {
    const updatedImages = (mess.images || []).filter((img: string) => img !== url);
    const newLogo = url === mess.logo_image ? (updatedImages.length > 0 ? updatedImages[0] : '') : mess.logo_image;
    setMess(prev => ({ ...prev, logo_image: newLogo, images: updatedImages }));
  };

  // Timings CRUD
  const saveTiming = async () => {
    if (!existingMess?.id) { toast({ title: 'Save the mess first before adding timings', variant: 'destructive' }); return; }
    try {
      await upsertMealTiming({ mess_id: existingMess.id, ...timingForm });
      toast({ title: 'Timing saved!' });
      setTimings(await getMealTimings(existingMess.id));
    } catch (e: any) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
  };
  const removeTiming = async (id: string) => {
    await deleteMealTiming(id);
    if (existingMess?.id) setTimings(await getMealTimings(existingMess.id));
  };

  // Menu
  const getMenuValue = (day: string, meal: string) => menu.find(m => m.day_of_week === day && m.meal_type === meal)?.menu_items || '';
  const setMenuValue = (day: string, meal: string, value: string) => {
    setMenu(prev => {
      const existing = prev.find(m => m.day_of_week === day && m.meal_type === meal);
      if (existing) return prev.map(m => m === existing ? { ...m, menu_items: value } : m);
      return [...prev, { mess_id: existingMess?.id, day_of_week: day, meal_type: meal, menu_items: value }];
    });
  };

  const handleSave = async () => {
    if (!mess.name) { setValidationError("Mess name is required"); return; }
    if (!mess.location) { setValidationError("Location is required"); return; }
    setValidationError(null);
    setIsSaving(true);

    // Save menu if editing existing
    if (existingMess?.id) {
      try {
        const items = menu.filter(m => m.menu_items).map(m => ({
          ...(m.id ? { id: m.id } : {}),
          mess_id: existingMess.id,
          day_of_week: m.day_of_week,
          meal_type: m.meal_type,
          menu_items: m.menu_items,
        }));
        if (items.length > 0) await upsertWeeklyMenu(items);
      } catch (err) { console.error('Error saving menu:', err); }
    }

    const payload = {
      ...(mess.id ? { id: mess.id } : {}),
      user_id: selectedPartner || user?.id,
      name: mess.name,
      location: mess.location,
      description: mess.description,
      contact_number: mess.contact_number,
      food_type: mess.food_type,
      capacity: mess.capacity ? parseInt(mess.capacity) : null,
      starting_price: mess.starting_price ? parseFloat(mess.starting_price) : null,
      logo_image: mess.logo_image,
      images: mess.images,
    };

    onSave(payload);
    setIsSaving(false);
  };

  const allImages = (mess.images || []).filter(Boolean);

  return (
    <div className="w-full mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-xl font-bold text-foreground">{existingMess ? "Edit" : "Create"} Mess</h1>
          <p className="text-sm text-muted-foreground">{existingMess ? "Modify mess details, timings and menu." : "Add a new mess with all required details."}</p>
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
                    <div><CardTitle className="text-base">Basic Information</CardTitle><CardDescription className="text-xs">Name, location, food type, capacity</CardDescription></div>
                  </div>
                  <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="px-4 pb-4 pt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name" className="text-sm">Mess Name *</Label>
                    <Input id="name" name="name" value={mess.name} onChange={handleInputChange} placeholder="e.g., Fresh Bites Mess" />
                  </div>
                  <div>
                    <Label htmlFor="location" className="text-sm">Location *</Label>
                    <Input id="location" name="location" value={mess.location} onChange={handleInputChange} placeholder="e.g., Near Main Gate" />
                  </div>
                  <div>
                    <Label className="text-sm">Food Type</Label>
                    <Select value={mess.food_type} onValueChange={(v) => setMess(prev => ({ ...prev, food_type: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="veg">Veg</SelectItem>
                        <SelectItem value="non_veg">Non-Veg</SelectItem>
                        <SelectItem value="both">Both</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="capacity" className="text-sm">Capacity</Label>
                    <Input id="capacity" name="capacity" type="number" value={mess.capacity} onChange={handleInputChange} />
                  </div>
                  <div>
                    <Label htmlFor="starting_price" className="text-sm">Starting Price (₹)</Label>
                    <Input id="starting_price" name="starting_price" type="number" value={mess.starting_price} onChange={handleInputChange} placeholder="e.g., 2000" />
                    <p className="text-[10px] text-muted-foreground mt-0.5">Shown on marketplace. Leave empty to auto-compute from packages.</p>
                  </div>
                  <div>
                    <Label htmlFor="contact_number" className="text-sm">Contact Number</Label>
                    <Input id="contact_number" name="contact_number" value={mess.contact_number} onChange={handleInputChange} />
                  </div>
                  {isAdmin && (
                    <div>
                      <Label className="text-sm">Partner / Owner</Label>
                      <Select value={selectedPartner} onValueChange={(v) => { setSelectedPartner(v); setMess(prev => ({ ...prev, user_id: v })); }}>
                        <SelectTrigger><SelectValue placeholder="Select partner" /></SelectTrigger>
                        <SelectContent>
                          {partners.map(p => (
                            <SelectItem key={p.id} value={p.id}>{p.name} ({p.email})</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div className="md:col-span-2">
                    <Label htmlFor="description" className="text-sm">Description</Label>
                    <Textarea id="description" name="description" value={mess.description} onChange={handleInputChange} rows={3} />
                  </div>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Section 2: Images */}
        <Collapsible open={openSection === 2} onOpenChange={(isOpen) => setOpenSection(isOpen ? 2 : null)}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="py-4 px-4 cursor-pointer group">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <SectionBadge number={2} icon={Image} />
                    <div><CardTitle className="text-base">Images</CardTitle><CardDescription className="text-xs">Upload mess photos</CardDescription></div>
                  </div>
                  <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="px-4 pb-4 pt-0">
                <ImageUpload
                  onUpload={handleImageUpload}
                  onRemove={handleImageRemove}
                  existingImages={allImages}
                  maxCount={6}
                />
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Section 3: Meal Timings */}
        <Collapsible open={openSection === 3} onOpenChange={(isOpen) => setOpenSection(isOpen ? 3 : null)}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="py-4 px-4 cursor-pointer group">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <SectionBadge number={3} icon={Clock} />
                    <div><CardTitle className="text-base">Meal Timings</CardTitle><CardDescription className="text-xs">Set breakfast, lunch and dinner times</CardDescription></div>
                  </div>
                  <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="px-4 pb-4 pt-0 space-y-4">
                {timings.map(t => (
                  <div key={t.id} className="flex items-center gap-3 p-2 border rounded">
                    <Badge>{MEAL_LABELS[t.meal_type]}</Badge>
                    <span className="text-sm">{t.start_time} – {t.end_time}</span>
                    <Button variant="ghost" size="icon" onClick={() => removeTiming(t.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                ))}
                <Separator />
                <div className="flex items-end gap-3 flex-wrap">
                  <div>
                    <Label>Meal</Label>
                    <Select value={timingForm.meal_type} onValueChange={v => setTimingForm(f => ({ ...f, meal_type: v }))}>
                      <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                      <SelectContent>{MEALS.map(m => <SelectItem key={m} value={m}>{MEAL_LABELS[m]}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Start</Label><Input type="time" value={timingForm.start_time} onChange={e => setTimingForm(f => ({ ...f, start_time: e.target.value }))} className="w-32" /></div>
                  <div><Label>End</Label><Input type="time" value={timingForm.end_time} onChange={e => setTimingForm(f => ({ ...f, end_time: e.target.value }))} className="w-32" /></div>
                  <Button onClick={saveTiming} disabled={!existingMess?.id}><Plus className="h-4 w-4 mr-1" /> Add</Button>
                </div>
                {!existingMess?.id && <p className="text-xs text-muted-foreground">Save the mess first to add timings.</p>}
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Section 4: Weekly Menu */}
        <Collapsible open={openSection === 4} onOpenChange={(isOpen) => setOpenSection(isOpen ? 4 : null)}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="py-4 px-4 cursor-pointer group">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <SectionBadge number={4} icon={CalendarDays} />
                    <div><CardTitle className="text-base">Weekly Menu</CardTitle><CardDescription className="text-xs">Set daily meal items</CardDescription></div>
                  </div>
                  <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="px-4 pb-4 pt-0 space-y-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr><th className="text-left p-2">Day</th>{MEALS.map(m => <th key={m} className="text-left p-2">{MEAL_LABELS[m]}</th>)}</tr></thead>
                    <tbody>
                      {DAYS.map(day => (
                        <tr key={day} className="border-t">
                          <td className="p-2 capitalize font-medium">{day}</td>
                          {MEALS.map(meal => (
                            <td key={meal} className="p-2">
                              <Input value={getMenuValue(day, meal)} onChange={e => setMenuValue(day, meal, e.target.value)} placeholder="e.g. Rice + Dal" className="text-xs" />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Save Button */}
        <div className="sticky bottom-4 z-10 flex justify-end gap-2 bg-background/80 backdrop-blur-sm p-3 rounded-lg border shadow-sm">
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            {existingMess ? "Update Mess" : "Create Mess"}
          </Button>
        </div>
      </div>
    </div>
  );
}
