
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ImageUpload } from "@/components/ImageUpload";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Building2, Image, IndianRupee, CalendarClock, Sparkles, User, Users, MapPin, ChevronDown, Utensils, Plus, X } from "lucide-react";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LocationSelector } from "../forms/LocationSelector";
import MapPicker from "./MapPicker";
import { Switch } from "@/components/ui/switch";
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

interface HostelEditorProps {
  onSave: (hostel: any) => void;
  onCancel: () => void;
  existingHostel?: any;
  isAdmin?: boolean;
}

export function HostelEditor({ onSave, onCancel, existingHostel, isAdmin = true }: HostelEditorProps) {
  const { user } = useAuth();
  const [hostel, setHostel] = useState({
    id: existingHostel?.id || '',
    name: existingHostel?.name || '',
    description: existingHostel?.description || '',
    gender: existingHostel?.gender || 'Co-ed',
    stay_type: existingHostel?.stay_type || 'Both',
    location: existingHostel?.location || '',
    locality: existingHostel?.locality || '',
    logo_image: existingHostel?.logo_image || '',
    images: existingHostel?.images || [],
    security_deposit: existingHostel?.security_deposit || 0,
    advance_booking_enabled: existingHostel?.advance_booking_enabled ?? false,
    advance_percentage: existingHostel?.advance_percentage ?? 50,
    advance_flat_amount: existingHostel?.advance_flat_amount ?? 0,
    advance_use_flat: existingHostel?.advance_use_flat ?? false,
    max_advance_booking_days: existingHostel?.max_advance_booking_days ?? 30,
    allowed_durations: existingHostel?.allowed_durations ?? ['daily', 'weekly', 'monthly'],
    advance_applicable_durations: existingHostel?.advance_applicable_durations ?? ['daily', 'weekly', 'monthly'],
    cancellation_window_hours: existingHostel?.cancellation_window_hours ?? 24,
    amenities: existingHostel?.amenities || [],
    contact_email: existingHostel?.contact_email || '',
    contact_phone: existingHostel?.contact_phone || '',
    state_id: existingHostel?.state_id || '',
    city_id: existingHostel?.city_id || '',
    area_id: existingHostel?.area_id || '',
    coordinates_lat: existingHostel?.coordinates_lat || 0,
    coordinates_lng: existingHostel?.coordinates_lng || 0,
    created_by: existingHostel?.created_by || '',
    is_active: existingHostel?.is_active ?? true,
    food_enabled: existingHostel?.food_enabled ?? false,
    food_policy_type: existingHostel?.food_policy_type || 'not_available',
    food_price_monthly: existingHostel?.food_price_monthly ?? 0,
    food_menu_image: existingHostel?.food_menu_image || '',
    show_food_price: existingHostel?.show_food_price ?? true,
  });

  const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
  const DAY_LABELS: Record<string, string> = {
    sunday: 'Sunday', monday: 'Monday', tuesday: 'Tuesday', wednesday: 'Wednesday',
    thursday: 'Thursday', friday: 'Friday', saturday: 'Saturday',
  };
  const DAY_SHORT: Record<string, string> = {
    sunday: 'Sun', monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed',
    thursday: 'Thu', friday: 'Fri', saturday: 'Sat',
  };

  // Food menu items state: day -> meal_type -> items
  const emptyDayMenu = (): Record<string, string[]> => ({ breakfast: [], lunch: [], dinner: [] });
  const [foodMenuItems, setFoodMenuItems] = useState<Record<string, Record<string, string[]>>>(() => {
    const init: Record<string, Record<string, string[]>> = {};
    DAYS.forEach(d => { init[d] = emptyDayMenu(); });
    return init;
  });
  const [selectedFoodDay, setSelectedFoodDay] = useState<string>('monday');
  const [newFoodItem, setNewFoodItem] = useState<Record<string, string>>({ breakfast: '', lunch: '', dinner: '' });

  const [partners, setPartners] = useState<Array<{ id: string; name: string; email: string; phone: string; serial_number: string }>>([]);
  const [selectedPartner, setSelectedPartner] = useState<string>(existingHostel?.created_by || '');
  const [partnerDetails, setPartnerDetails] = useState<{ name: string; email: string; phone: string; serial_number: string } | null>(null);
  const [openSection, setOpenSection] = useState<number | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch partners
  useEffect(() => {
    const fetchPartners = async () => {
      try {
        const { data: vendorRoles } = await supabase.from('user_roles').select('user_id').eq('role', 'vendor');
        if (!vendorRoles || vendorRoles.length === 0) return;
        const { data: adminRoles } = await supabase.from('user_roles').select('user_id').eq('role', 'admin');
        const allIds = [...new Set([...vendorRoles.map(r => r.user_id), ...(adminRoles || []).map(r => r.user_id)])];
        const { data: profiles } = await supabase.from('profiles').select('id, name, email, phone, serial_number').in('id', allIds);
        setPartners((profiles || []).map(p => ({ id: p.id, name: p.name || 'Unknown', email: p.email || '', phone: p.phone || '', serial_number: p.serial_number || '' })));
      } catch (err) { console.error('Error fetching partners:', err); }
    };
    if (isAdmin) fetchPartners();
  }, [isAdmin]);

  // Fetch food menu items for existing hostel
  useEffect(() => {
    if (existingHostel?.id) {
      const fetchFoodMenu = async () => {
        const { data } = await supabase
          .from('hostel_food_menu')
          .select('*')
          .eq('hostel_id', existingHostel.id)
          .eq('is_active', true)
          .order('display_order');
        if (data) {
          const grouped: Record<string, Record<string, string[]>> = {};
          DAYS.forEach(d => { grouped[d] = { breakfast: [], lunch: [], dinner: [] }; });
          (data as any[]).forEach((item: any) => {
            const day = item.day_of_week || 'monday';
            if (!grouped[day]) grouped[day] = { breakfast: [], lunch: [], dinner: [] };
            if (grouped[day][item.meal_type]) grouped[day][item.meal_type].push(item.item_name);
          });
          setFoodMenuItems(grouped);
        }
      };
      fetchFoodMenu();
    }
  }, [existingHostel?.id]);

  useEffect(() => {
    if (selectedPartner) {
      const partner = partners.find(p => p.id === selectedPartner);
      if (partner) { setPartnerDetails(partner); setHostel(prev => ({ ...prev, created_by: selectedPartner })); }
    } else if (!isAdmin && user?.id) {
      const loadOwn = async () => {
        const { data } = await supabase.from('profiles').select('id, name, email, phone, serial_number').eq('id', user.id).single();
        if (data) {
          setPartnerDetails({ name: data.name || '', email: data.email || '', phone: data.phone || '', serial_number: data.serial_number || '' });
          setHostel(prev => ({ ...prev, created_by: user.id }));
          setSelectedPartner(user.id);
        }
      };
      loadOwn();
    }
  }, [selectedPartner, partners, isAdmin, user?.id]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setHostel(prev => ({ ...prev, [name]: value }));
    setValidationError(null);
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setHostel(prev => ({ ...prev, [name]: parseFloat(value) || 0 }));
  };

  const handleAmenityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (e.target.checked) {
      setHostel(prev => ({ ...prev, amenities: [...prev.amenities, value] }));
    } else {
      setHostel(prev => ({ ...prev, amenities: prev.amenities.filter((a: string) => a !== value) }));
    }
  };

  const handleImageUpload = (url: string) => {
    const updatedImages = [...(hostel.images || []), url];
    setHostel(prev => ({ ...prev, logo_image: url, images: updatedImages }));
  };

  const handleImageRemove = (url: string) => {
    const updatedImages = (hostel.images || []).filter((img: string) => img !== url);
    const newLogo = url === hostel.logo_image ? (updatedImages.length > 0 ? updatedImages[0] : '') : hostel.logo_image;
    setHostel(prev => ({ ...prev, logo_image: newLogo, images: updatedImages }));
  };

  const handleSave = async () => {
    if (!hostel.name) { setValidationError("Hostel name is required"); window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
    setValidationError(null);
    setIsSaving(true);

    // Save food menu items if food policy is not 'not_available' and hostel exists
    if (hostel.food_policy_type !== 'not_available' && existingHostel?.id) {
      try {
        // Delete existing items and re-insert
        await supabase.from('hostel_food_menu').delete().eq('hostel_id', existingHostel.id);
        const menuInserts: any[] = [];
        DAYS.forEach(day => {
          (['breakfast', 'lunch', 'dinner'] as const).forEach(mealType => {
            (foodMenuItems[day]?.[mealType] || []).forEach((itemName, idx) => {
              menuInserts.push({
                hostel_id: existingHostel.id,
                meal_type: mealType,
                item_name: itemName,
                display_order: idx,
                is_active: true,
                day_of_week: day,
              });
            });
          });
        });
        if (menuInserts.length > 0) {
          await supabase.from('hostel_food_menu').insert(menuInserts);
        }
      } catch (err) { console.error('Error saving food menu:', err); }
    }

    setTimeout(() => {
      onSave({ ...hostel, food_enabled: hostel.food_policy_type !== 'not_available' });
      toast({ title: "Hostel Saved", description: `${existingHostel ? "Updated" : "Created"} hostel "${hostel.name}" successfully.` });
      setIsSaving(false);
    }, 500);
  };

  const addFoodItem = (mealType: string) => {
    const item = newFoodItem[mealType]?.trim();
    if (!item) return;
    setFoodMenuItems(prev => ({
      ...prev,
      [selectedFoodDay]: {
        ...prev[selectedFoodDay],
        [mealType]: [...(prev[selectedFoodDay]?.[mealType] || []), item],
      },
    }));
    setNewFoodItem(prev => ({ ...prev, [mealType]: '' }));
  };

  const removeFoodItem = (mealType: string, index: number) => {
    setFoodMenuItems(prev => ({
      ...prev,
      [selectedFoodDay]: {
        ...prev[selectedFoodDay],
        [mealType]: (prev[selectedFoodDay]?.[mealType] || []).filter((_, i) => i !== index),
      },
    }));
  };

  const copyToAllDays = () => {
    const sourceMenu = foodMenuItems[selectedFoodDay];
    setFoodMenuItems(prev => {
      const updated = { ...prev };
      DAYS.forEach(day => { updated[day] = { breakfast: [...sourceMenu.breakfast], lunch: [...sourceMenu.lunch], dinner: [...sourceMenu.dinner] }; });
      return updated;
    });
    toast({ title: "Copied", description: `${DAY_LABELS[selectedFoodDay]}'s menu copied to all days.` });
  };

  const handleMapLocationChange = (coordinates: { lat: number; lng: number }) => {
    setHostel(prev => ({ ...prev, coordinates_lat: coordinates.lat, coordinates_lng: coordinates.lng }));
  };

  const allImages = (hostel.images || []).filter(Boolean);

  const amenityOptions = [
    "WiFi", "Air Conditioning", "Gym", "Laundry", "Food Service", "Study Room",
    "TV Room", "Parking", "24/7 Security", "Power Backup", "Housekeeping", "Recreation Area",
    "Hot Water", "Drinking Water", "CCTV", "Fire Safety",
  ];

  return (
    <div className="w-full mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-xl font-bold text-foreground">{existingHostel ? "Edit" : "Create"} Hostel</h1>
          <p className="text-sm text-muted-foreground">{existingHostel ? "Modify hostel details and configuration." : "Add a new hostel with all required details."}</p>
        </div>
        <Button variant="outline" size="sm" onClick={onCancel}><ArrowLeft className="h-4 w-4 mr-1" />Back to Dashboard</Button>
      </div>

      {validationError && (
        <div className="mb-4 p-3 bg-destructive/10 border border-destructive/30 rounded-md text-destructive text-sm">
          <p className="font-medium">Please correct the following:</p>
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
                    <div><CardTitle className="text-base">Basic Information</CardTitle><CardDescription className="text-xs">Name, description, gender, stay type</CardDescription></div>
                  </div>
                  <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="px-4 pb-4 pt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name" className="text-sm">Hostel Name *</Label>
                    <Input id="name" name="name" value={hostel.name} onChange={handleInputChange} placeholder="e.g., Sunrise Hostel" required />
                  </div>
                  <div>
                    <Label className="text-sm">Gender *</Label>
                    <Select value={hostel.gender} onValueChange={(v) => setHostel(prev => ({ ...prev, gender: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Male">Male (Boys Only)</SelectItem>
                        <SelectItem value="Female">Female (Girls Only)</SelectItem>
                        <SelectItem value="Co-ed">Co-ed (Both)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-sm">Stay Type *</Label>
                    <Select value={hostel.stay_type} onValueChange={(v) => setHostel(prev => ({ ...prev, stay_type: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Short-term">Short-term</SelectItem>
                        <SelectItem value="Long-term">Long-term</SelectItem>
                        <SelectItem value="Both">Both</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="description" className="text-sm">Description</Label>
                    <Textarea id="description" name="description" value={hostel.description} onChange={handleInputChange} rows={3} placeholder="Describe the hostel features and benefits" />
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
                    <div><CardTitle className="text-base">Images</CardTitle><CardDescription className="text-xs">Upload hostel logo and gallery photos</CardDescription></div>
                  </div>
                  <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="px-4 pb-4 pt-0">
                {hostel.logo_image && (
                  <div className="aspect-video mb-4 overflow-hidden rounded-md max-w-md">
                    <img src={hostel.logo_image} alt={hostel.name} className="w-full h-full object-cover" />
                    <p className="text-xs text-center mt-1 text-muted-foreground">Main Image</p>
                  </div>
                )}
                <ImageUpload onUpload={handleImageUpload} onRemove={handleImageRemove} existingImages={allImages} />
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Section 3: Pricing & Deposit */}
        <Collapsible open={openSection === 3} onOpenChange={(isOpen) => setOpenSection(isOpen ? 3 : null)}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="py-4 px-4 cursor-pointer group">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <SectionBadge number={3} icon={IndianRupee} />
                    <div><CardTitle className="text-base">Pricing & Deposit</CardTitle><CardDescription className="text-xs">Security deposit and advance payment settings</CardDescription></div>
                  </div>
                  <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="px-4 pb-4 pt-0 space-y-4">
                <div>
                  <Label htmlFor="security_deposit" className="text-sm font-medium">Security Deposit (₹)</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm text-muted-foreground">₹</span>
                    <Input id="security_deposit" name="security_deposit" type="number" value={hostel.security_deposit} onChange={handleNumberChange} className="max-w-[180px]" min={0} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Refundable deposit collected at check-in</p>
                </div>

                <div className="border rounded-lg p-3 space-y-3">
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="advanceBookingEnabled" checked={hostel.advance_booking_enabled} onChange={(e) => setHostel(prev => ({ ...prev, advance_booking_enabled: e.target.checked }))} className="h-4 w-4" />
                    <Label htmlFor="advanceBookingEnabled" className="text-sm cursor-pointer font-medium">Allow Advance Payment</Label>
                  </div>

                  {hostel.advance_booking_enabled && (
                    <div className="space-y-3 pl-2 border-l-2 border-primary/20 ml-2">
                      <div>
                        <Label className="text-xs font-medium mb-1 block">Advance Type</Label>
                        <div className="flex gap-4">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input type="radio" checked={!hostel.advance_use_flat} onChange={() => setHostel(prev => ({ ...prev, advance_use_flat: false }))} className="h-3.5 w-3.5" />
                            <span className="text-xs">Percentage (%)</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input type="radio" checked={hostel.advance_use_flat} onChange={() => setHostel(prev => ({ ...prev, advance_use_flat: true }))} className="h-3.5 w-3.5" />
                            <span className="text-xs">Flat Amount (₹)</span>
                          </label>
                        </div>
                      </div>
                      {!hostel.advance_use_flat ? (
                        <div>
                          <Label className="text-xs">Advance Percentage (%)</Label>
                          <Input type="number" min={1} max={99} value={hostel.advance_percentage} onChange={e => setHostel(prev => ({ ...prev, advance_percentage: Number(e.target.value) }))} />
                        </div>
                      ) : (
                        <div>
                          <Label className="text-xs">Flat Advance Amount (₹)</Label>
                          <Input type="number" min={1} value={hostel.advance_flat_amount} onChange={e => setHostel(prev => ({ ...prev, advance_flat_amount: Number(e.target.value) }))} />
                        </div>
                      )}
                      <div>
                        <Label className="text-xs">Cancellation Window (hours)</Label>
                        <Input type="number" min={0} value={hostel.cancellation_window_hours} onChange={e => setHostel(prev => ({ ...prev, cancellation_window_hours: Number(e.target.value) }))} />
                      </div>
                      <div>
                        <Label className="text-xs font-medium mb-2 block">Advance applicable for</Label>
                        <div className="flex flex-wrap gap-3">
                          {['daily', 'weekly', 'monthly'].filter(d => (hostel.allowed_durations as string[]).includes(d)).map(dur => (
                            <label key={dur} className="flex items-center gap-1.5 cursor-pointer">
                              <input type="checkbox" checked={(hostel.advance_applicable_durations as string[]).includes(dur)} onChange={(e) => {
                                setHostel(prev => {
                                  const current = prev.advance_applicable_durations as string[];
                                  const updated = e.target.checked ? [...current, dur] : current.filter(d => d !== dur);
                                  return { ...prev, advance_applicable_durations: updated };
                                });
                              }} className="h-3.5 w-3.5" />
                              <span className="text-xs capitalize">{dur}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Section 4: Booking Configuration */}
        <Collapsible open={openSection === 4} onOpenChange={(isOpen) => setOpenSection(isOpen ? 4 : null)}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="py-4 px-4 cursor-pointer group">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <SectionBadge number={4} icon={CalendarClock} />
                    <div><CardTitle className="text-base">Booking Configuration</CardTitle><CardDescription className="text-xs">Allowed durations and max advance days</CardDescription></div>
                  </div>
                  <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="px-4 pb-4 pt-0 space-y-3">
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Offer bookings for</Label>
                  <p className="text-xs text-muted-foreground">Choose which duration types students can book</p>
                  <div className="flex flex-wrap gap-2">
                    {(['daily', 'weekly', 'monthly'] as const).map((dur) => {
                      const isSelected = (hostel.allowed_durations || []).includes(dur);
                      return (
                        <button key={dur} type="button" className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${isSelected ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted text-muted-foreground border-border hover:bg-accent'}`}
                          onClick={() => {
                            const current = hostel.allowed_durations || ['daily', 'weekly', 'monthly'];
                            if (isSelected && current.length <= 1) return;
                            const updated = isSelected ? current.filter((d: string) => d !== dur) : [...current, dur];
                            setHostel(prev => ({ ...prev, allowed_durations: updated }));
                          }}>
                          {dur.charAt(0).toUpperCase() + dur.slice(1)}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Max Advance Booking Days</Label>
                  <Input name="max_advance_booking_days" type="number" value={hostel.max_advance_booking_days} onChange={handleNumberChange} min={1} max={365} className="max-w-[180px]" />
                  <p className="text-xs text-muted-foreground mt-1">How many days in advance students can book</p>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Section 5: Food Facility */}
        <Collapsible open={openSection === 5} onOpenChange={(isOpen) => setOpenSection(isOpen ? 5 : null)}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="py-4 px-4 cursor-pointer group">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <SectionBadge number={5} icon={Utensils} />
                    <div><CardTitle className="text-base">Food Facility</CardTitle><CardDescription className="text-xs">Enable food service and manage menu</CardDescription></div>
                  </div>
                  <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="px-4 pb-4 pt-0 space-y-4">
                <div>
                  <Label className="text-sm font-medium mb-1 block">Food Policy Type</Label>
                  <Select
                    value={hostel.food_policy_type}
                    onValueChange={(v) => setHostel(prev => ({ ...prev, food_policy_type: v }))}
                  >
                    <SelectTrigger className="max-w-[280px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="not_available">Not Available</SelectItem>
                      <SelectItem value="mandatory">Mandatory (Included in Rent)</SelectItem>
                      <SelectItem value="optional">Optional (Add-on)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {hostel.food_policy_type !== 'not_available' && (
                  <div className="space-y-4 pl-2 border-l-2 border-primary/20 ml-2">
                    <div>
                      <Label className="text-xs font-medium">Monthly Food Price (₹)</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-sm text-muted-foreground">₹</span>
                        <Input
                          type="number"
                          min={0}
                          value={hostel.food_price_monthly}
                          onChange={e => setHostel(prev => ({ ...prev, food_price_monthly: Number(e.target.value) || 0 }))}
                          className="max-w-[180px]"
                        />
                      </div>
                    </div>

                    {hostel.food_policy_type === 'mandatory' && (
                      <div className="flex items-center gap-2">
                        <Switch
                          id="show_food_price"
                          checked={hostel.show_food_price}
                          onCheckedChange={(checked) => setHostel(prev => ({ ...prev, show_food_price: checked }))}
                        />
                        <Label htmlFor="show_food_price" className="text-xs font-medium cursor-pointer">Show food price to students</Label>
                        <p className="text-xs text-muted-foreground ml-1">If off, students see only "Food Included" without price</p>
                      </div>
                    )}

                    {/* Day-wise Food Menu Items */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label className="text-xs font-medium">Day-wise Menu</Label>
                        <Button type="button" size="sm" variant="ghost" className="h-7 text-xs" onClick={copyToAllDays}>
                          Copy to all days
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-1 mb-3">
                        {DAYS.map(day => (
                          <button
                            key={day}
                            type="button"
                            onClick={() => setSelectedFoodDay(day)}
                            className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${
                              selectedFoodDay === day
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted text-muted-foreground hover:bg-muted/80'
                            }`}
                          >
                            {DAY_SHORT[day]}
                          </button>
                        ))}
                      </div>

                      {(['breakfast', 'lunch', 'dinner'] as const).map(mealType => (
                        <div key={mealType} className="mb-3">
                          <Label className="text-xs font-medium capitalize mb-1 block">{mealType === 'breakfast' ? '🌅 Breakfast' : mealType === 'lunch' ? '☀️ Lunch' : '🌙 Dinner'}</Label>
                          <div className="flex flex-wrap gap-1.5 mb-1.5">
                            {(foodMenuItems[selectedFoodDay]?.[mealType] || []).map((item, idx) => (
                              <span key={idx} className="inline-flex items-center gap-1 text-xs bg-muted px-2 py-1 rounded-md">
                                {item}
                                <button onClick={() => removeFoodItem(mealType, idx)} className="text-muted-foreground hover:text-destructive"><X className="h-3 w-3" /></button>
                              </span>
                            ))}
                          </div>
                          <div className="flex gap-1.5">
                            <Input
                              className="h-8 text-xs flex-1"
                              placeholder={`Add ${mealType} item...`}
                              value={newFoodItem[mealType] || ''}
                              onChange={e => setNewFoodItem(prev => ({ ...prev, [mealType]: e.target.value }))}
                              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addFoodItem(mealType); } }}
                            />
                            <Button type="button" size="sm" variant="outline" className="h-8 text-xs" onClick={() => addFoodItem(mealType)}>
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Menu Image Upload */}
                    <div>
                      <Label className="text-xs font-medium mb-1 block">Upload Menu Image (optional)</Label>
                      <ImageUpload
                        onUpload={(url) => setHostel(prev => ({ ...prev, food_menu_image: url }))}
                        onRemove={() => setHostel(prev => ({ ...prev, food_menu_image: '' }))}
                        existingImages={hostel.food_menu_image ? [hostel.food_menu_image] : []}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Section 6: Amenities */}
        <Collapsible open={openSection === 6} onOpenChange={(isOpen) => setOpenSection(isOpen ? 6 : null)}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="py-4 px-4 cursor-pointer group">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <SectionBadge number={6} icon={Sparkles} />
                    <div><CardTitle className="text-base">Amenities</CardTitle><CardDescription className="text-xs">Select available facilities</CardDescription></div>
                  </div>
                  <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="px-4 pb-4 pt-0">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {amenityOptions.map((amenity) => (
                    <div key={amenity} className="flex items-center space-x-2 p-2 rounded-md border bg-background">
                      <input type="checkbox" id={`amenity-${amenity}`} value={amenity} checked={hostel.amenities.includes(amenity)} onChange={handleAmenityChange} className="h-3.5 w-3.5" />
                      <Label htmlFor={`amenity-${amenity}`} className="text-xs cursor-pointer">{amenity}</Label>
                    </div>
                  ))}
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Section 7: Contact */}
        <Collapsible open={openSection === 7} onOpenChange={(isOpen) => setOpenSection(isOpen ? 7 : null)}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="py-4 px-4 cursor-pointer group">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <SectionBadge number={7} icon={User} />
                    <div><CardTitle className="text-base">Contact</CardTitle><CardDescription className="text-xs">Email and phone for this hostel</CardDescription></div>
                  </div>
                  <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="px-4 pb-4 pt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="contact_email" className="text-sm">Email</Label>
                    <Input id="contact_email" name="contact_email" type="email" value={hostel.contact_email} onChange={handleInputChange} placeholder="contact@hostel.com" />
                  </div>
                  <div>
                    <Label htmlFor="contact_phone" className="text-sm">Phone</Label>
                    <Input id="contact_phone" name="contact_phone" value={hostel.contact_phone} onChange={handleInputChange} placeholder="Enter phone number" />
                  </div>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Section 8: Partner Assignment */}
        <Collapsible open={openSection === 8} onOpenChange={(isOpen) => setOpenSection(isOpen ? 8 : null)}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="py-4 px-4 cursor-pointer group">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <SectionBadge number={8} icon={Users} />
                    <div><CardTitle className="text-base">Partner Assignment</CardTitle><CardDescription className="text-xs">{isAdmin ? "Select or assign a partner" : "Your partner details"}</CardDescription></div>
                  </div>
                  <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="px-4 pb-4 pt-0 space-y-4">
                {isAdmin && (
                  <div>
                    <Label className="text-sm">Select Partner *</Label>
                    <Select value={selectedPartner} onValueChange={setSelectedPartner}>
                      <SelectTrigger><SelectValue placeholder="Select a partner" /></SelectTrigger>
                      <SelectContent>
                        {partners.map((partner) => (
                          <SelectItem key={partner.id} value={partner.id}>{partner.name} ({partner.email})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {partnerDetails && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div><Label className="text-xs text-muted-foreground">Partner Name</Label><Input value={partnerDetails.name} readOnly className="bg-muted text-sm" /></div>
                    <div><Label className="text-xs text-muted-foreground">Email</Label><Input value={partnerDetails.email} readOnly className="bg-muted text-sm" /></div>
                    <div><Label className="text-xs text-muted-foreground">Phone</Label><Input value={partnerDetails.phone} readOnly className="bg-muted text-sm" /></div>
                    <div><Label className="text-xs text-muted-foreground">Partner ID</Label><Input value={partnerDetails.serial_number} readOnly className="bg-muted text-sm" /></div>
                  </div>
                )}
                {!partnerDetails && !isAdmin && <p className="text-sm text-muted-foreground">Loading your partner details...</p>}
                {!partnerDetails && isAdmin && !selectedPartner && <p className="text-sm text-muted-foreground">Please select a partner to see their details.</p>}
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Section 9: Location */}
        <Collapsible open={openSection === 9} onOpenChange={(isOpen) => setOpenSection(isOpen ? 9 : null)}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="py-4 px-4 cursor-pointer group">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <SectionBadge number={9} icon={MapPin} />
                    <div><CardTitle className="text-base">Location</CardTitle><CardDescription className="text-xs">Address, state/city/area, and map coordinates</CardDescription></div>
                  </div>
                  <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="px-4 pb-4 pt-0 space-y-4">
                <LocationSelector
                  selectedState={hostel.state_id}
                  selectedCity={hostel.city_id}
                  selectedArea={hostel.area_id}
                  onStateChange={(state) => setHostel(prev => ({ ...prev, state_id: state, city_id: '', area_id: '' }))}
                  onCityChange={(city) => setHostel(prev => ({ ...prev, city_id: city, area_id: '' }))}
                  onAreaChange={(area) => setHostel(prev => ({ ...prev, area_id: area }))}
                  showCountry={false}
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="location" className="text-sm">Full Address</Label>
                    <Textarea id="location" name="location" value={hostel.location} onChange={handleInputChange} placeholder="Enter complete address" rows={2} />
                  </div>
                  <div>
                    <Label htmlFor="locality" className="text-sm">Locality</Label>
                    <Input id="locality" name="locality" value={hostel.locality} onChange={handleInputChange} placeholder="e.g., Gachibowli, Madhapur" />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm">Latitude</Label>
                    <Input name="coordinates_lat" type="number" step="any" value={hostel.coordinates_lat} onChange={handleNumberChange} />
                  </div>
                  <div>
                    <Label className="text-sm">Longitude</Label>
                    <Input name="coordinates_lng" type="number" step="any" value={hostel.coordinates_lng} onChange={handleNumberChange} />
                  </div>
                </div>
                <MapPicker
                  initialLocation={hostel.coordinates_lat ? { lat: hostel.coordinates_lat, lng: hostel.coordinates_lng } : undefined}
                  name={hostel.name}
                  onLocationSelect={handleMapLocationChange}
                />
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      </div>

      {/* Sticky Footer */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border px-4 py-3 flex justify-end gap-3 md:pl-64">
        <Button variant="outline" onClick={onCancel} disabled={isSaving} size="sm">Cancel</Button>
        <Button onClick={handleSave} disabled={isSaving} size="sm">{isSaving ? "Saving..." : existingHostel ? "Update Hostel" : "Create Hostel"}</Button>
      </div>
    </div>
  );
}
