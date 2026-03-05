import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ImageUpload } from "@/components/ImageUpload";
import { toast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Building2,
  Image,
  IndianRupee,
  Clock,
  CalendarClock,
  Sparkles,
  User,
  Users,
  MapPin,
  ChevronDown,
} from "lucide-react";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { LocationSelector } from "../forms/LocationSelector";
import MapPicker from "./MapPicker";
import { SlotManagement } from "./SlotManagement";
import { Switch } from "@/components/ui/switch";

import { getImageUrl } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// Section number badge
function SectionBadge({ number, icon: Icon }: { number: number; icon: React.ElementType }) {
  return (
    <div className="flex items-center gap-2">
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0">
        {number}
      </span>
      <Icon className="h-4 w-4 text-muted-foreground" />
    </div>
  );
}

interface CabinEditorProps {
  onSave: (cabin: any) => void;
  onCancel: () => void;
  existingCabin?: any;
  isAdmin?: boolean;
}

export function CabinEditor({
  onSave,
  onCancel,
  existingCabin,
  isAdmin = true,
}: CabinEditorProps) {
  const { user } = useAuth();
  const [cabin, setCabin] = useState({
    id: existingCabin?.id || Math.floor(Math.random() * 1000),
    name: existingCabin?.name || "",
    description: existingCabin?.description || "",
    price: existingCabin?.price || 2000,
    capacity: existingCabin?.capacity || 16,
    category: existingCabin?.category || "standard",
    amenities: existingCabin?.amenities || ["Wi-Fi", "Desk", "Bookshelf"],
    imageUrl: existingCabin?.imageUrl || "",
    imageSrc: existingCabin?.images?.length > 0  ? existingCabin?.images[0] :existingCabin?.imageSrc,
    images: existingCabin?.images || [],
    ownerName: existingCabin?.ownerDetails?.ownerName || "",
    ownerPhone: existingCabin?.ownerDetails?.ownerPhone || "",
    ownerEmail: existingCabin?.ownerDetails?.ownerEmail || "",
    aadharNumber: existingCabin?.ownerDetails?.aadharNumber || "",
    panNumber: existingCabin?.ownerDetails?.panNumber || "",
    accountHolderName: existingCabin?.ownerDetails?.bankDetails?.accountHolderName || "",
    accountNumber: existingCabin?.ownerDetails?.bankDetails?.accountNumber || "",
    ifscCode: existingCabin?.ownerDetails?.bankDetails?.ifscCode || "",
    bankName: existingCabin?.ownerDetails?.bankDetails?.bankName || "",
    branchName: existingCabin?.ownerDetails?.bankDetails?.branchName || "",
    accountType: existingCabin?.ownerDetails?.bankDetails?.accountType || "",
    upiId: existingCabin?.ownerDetails?.bankDetails?.upiId || "",
    fullAddress: existingCabin?.location?.fullAddress || existingCabin?.full_address || existingCabin?.fullAddress || "",
    city: existingCabin?.location?.city || existingCabin?.location?.city?._id || existingCabin?.city,
    state: existingCabin?.location?.state || existingCabin?.location?.state?._id || existingCabin?.state,
    pincode: existingCabin?.location?.pincode || "",
    latitude: existingCabin?.location?.coordinates?.latitude || 0,
    longitude: existingCabin?.location?.coordinates?.longitude || 0,
    area: existingCabin?.location?.area || existingCabin?.location?.area?._id || existingCabin?.area,
    locality: existingCabin?.location?.locality || "",
    nearbyLandmarks: existingCabin?.location?.nearbyLandmarks || [],
    lockerAvailable: existingCabin?.lockerAvailable ?? existingCabin?.locker_available ?? false,
    lockerPrice: existingCabin?.lockerPrice ?? existingCabin?.locker_price ?? 0,
    lockerMandatory: existingCabin?.lockerMandatory ?? existingCabin?.locker_mandatory ?? true,
    lockerMandatoryDurations: existingCabin?.lockerMandatoryDurations ?? existingCabin?.locker_mandatory_durations ?? ['daily', 'weekly', 'monthly'],
    created_by: existingCabin?.created_by || "",
    advanceBookingEnabled: existingCabin?.advanceBookingEnabled ?? existingCabin?.advance_booking_enabled ?? false,
    advancePercentage: existingCabin?.advancePercentage ?? existingCabin?.advance_percentage ?? 50,
    advanceFlatAmount: existingCabin?.advanceFlatAmount ?? existingCabin?.advance_flat_amount ?? 0,
    advanceUseFlat: existingCabin?.advanceUseFlat ?? existingCabin?.advance_use_flat ?? false,
    advanceValidityDays: existingCabin?.advanceValidityDays ?? existingCabin?.advance_validity_days ?? 3,
    advanceAutoCancel: existingCabin?.advanceAutoCancel ?? existingCabin?.advance_auto_cancel ?? true,
    advanceApplicableDurations: existingCabin?.advance_applicable_durations ?? existingCabin?.advanceApplicableDurations ?? ['daily', 'weekly', 'monthly'],
    is24Hours: existingCabin?.is_24_hours ?? existingCabin?.is24Hours ?? false,
    slotsEnabled: existingCabin?.slots_enabled ?? existingCabin?.slotsEnabled ?? false,
    openingTime: existingCabin?.opening_time ?? existingCabin?.openingTime ?? '06:00',
    closingTime: existingCabin?.closing_time ?? existingCabin?.closingTime ?? '22:00',
    workingDays: existingCabin?.working_days ?? existingCabin?.workingDays ?? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    allowedDurations: existingCabin?.allowed_durations ?? existingCabin?.allowedDurations ?? ['daily', 'weekly', 'monthly'],
    slotsApplicableDurations: existingCabin?.slots_applicable_durations ?? existingCabin?.slotsApplicableDurations ?? ['daily', 'weekly', 'monthly'],
    free_trial_days: existingCabin?.free_trial_days ?? 0,
  });

  // Partner details state
  const [partners, setPartners] = useState<Array<{ id: string; name: string; email: string; phone: string; serial_number: string }>>([]);
  const [selectedPartner, setSelectedPartner] = useState<string>(existingCabin?.created_by || "");
  const [partnerDetails, setPartnerDetails] = useState<{ name: string; email: string; phone: string; serial_number: string } | null>(null);

  // Fetch partners (vendors) for admin
  useEffect(() => {
    const fetchPartners = async () => {
      try {
        const { data: vendorRoles } = await supabase
          .from('user_roles')
          .select('user_id')
          .eq('role', 'vendor');

        if (!vendorRoles || vendorRoles.length === 0) return;

        const vendorIds = vendorRoles.map(r => r.user_id);

        const { data: adminRoles } = await supabase
          .from('user_roles')
          .select('user_id')
          .eq('role', 'admin');

        const allIds = [...vendorIds, ...(adminRoles || []).map(r => r.user_id)];
        const uniqueIds = [...new Set(allIds)];

        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, name, email, phone, serial_number')
          .in('id', uniqueIds);

        setPartners((profiles || []).map(p => ({
          id: p.id,
          name: p.name || 'Unknown',
          email: p.email || '',
          phone: p.phone || '',
          serial_number: p.serial_number || '',
        })));
      } catch (err) {
        console.error('Error fetching partners:', err);
      }
    };

    if (isAdmin) {
      fetchPartners();
    }
  }, [isAdmin]);

  // Load partner details when selected
  useEffect(() => {
    if (selectedPartner) {
      const partner = partners.find(p => p.id === selectedPartner);
      if (partner) {
        setPartnerDetails(partner);
        setCabin(prev => ({ ...prev, created_by: selectedPartner }));
      }
    } else if (!isAdmin && user?.id) {
      const loadOwnProfile = async () => {
        const { data } = await supabase
          .from('profiles')
          .select('id, name, email, phone, serial_number')
          .eq('id', user.id)
          .single();
        if (data) {
          setPartnerDetails({
            name: data.name || '',
            email: data.email || '',
            phone: data.phone || '',
            serial_number: data.serial_number || '',
          });
          setCabin(prev => ({ ...prev, created_by: user.id }));
          setSelectedPartner(user.id);
        }
      };
      loadOwnProfile();
    }
  }, [selectedPartner, partners, isAdmin, user?.id]);

  const [openSection, setOpenSection] = useState<number | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setCabin({
      ...cabin,
      [name]: name === "price" || name === "capacity" ? Number(value) : value,
    });
    setValidationError(null);
  };

  const handleAmenityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (e.target.checked) {
      setCabin({ ...cabin, amenities: [...cabin.amenities, value] });
    } else {
      setCabin({ ...cabin, amenities: cabin.amenities.filter((a) => a !== value) });
    }
    setValidationError(null);
  };

  const handleImageUpload = (url: string) => {
    const updatedImages = [...(cabin.images || []), url];
    setCabin({ ...cabin, imageUrl: url, images: updatedImages });
    setValidationError(null);
  };

  const handleImageRemove = (url: string) => {
    const updatedImages = (cabin.images || []).filter((img) => img !== url);
    const newMainImage = url === cabin.imageUrl
      ? updatedImages.length > 0 ? updatedImages[0] : ""
      : cabin.imageUrl;
    setCabin({ ...cabin, imageUrl: newMainImage, images: updatedImages });
  };

  const handleSave = () => {
    if (!cabin.name) {
      setValidationError("Reading room name is required");
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (!cabin.description) {
      setValidationError("Description is required");
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (!cabin.price || cabin.price <= 0) {
      setValidationError("Valid price is required");
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if ((!cabin.images || cabin.images.length === 0) && (!cabin.imageUrl || cabin.imageUrl === "/placeholder.svg")) {
      setValidationError("Please upload at least one image");
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setValidationError(null);
    setIsSaving(true);

    setTimeout(() => {
      onSave({ ...cabin });
      toast({
        title: "Reading Room Saved",
        description: `${existingCabin ? "Updated" : "Created"} reading room "${cabin.name}" successfully.`,
      });
      setIsSaving(false);
    }, 500);
  };

  const handleCancel = () => { onCancel(); };

  const handleMapLocationChange = (coordinates: { lat: number; lng: number }) => {
    setCabin({ ...cabin, latitude: coordinates.lat, longitude: coordinates.lng });
  };

  const handleLockerAvailableChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setCabin((prev) => ({
      ...prev,
      [name]: checked,
      ...(name === "lockerAvailable" && !checked && { lockerPrice: "" })
    }));
  };

  const allImages =
    cabin.imageUrl && cabin.imageUrl !== "/placeholder.svg"
      ? Array.from(new Set([cabin.imageSrc, ...(cabin.images || [])])).filter(Boolean)
      : (cabin.images || []).filter(Boolean);

  return (
    <div className="w-full mx-auto">
      {/* Page Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-xl font-bold text-foreground">
            {existingCabin ? "Edit" : "Create"} Reading Room
          </h1>
          <p className="text-sm text-muted-foreground">
            {existingCabin
              ? "Modify reading room details and pricing."
              : "Add a new reading room with all required details."}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleCancel}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Dashboard
        </Button>
      </div>

      {/* Validation Error */}
      {validationError && (
        <div className="mb-4 p-3 bg-destructive/10 border border-destructive/30 rounded-md text-destructive text-sm">
          <p className="font-medium">Please correct the following:</p>
          <p>{validationError}</p>
        </div>
      )}

      <div className="space-y-4 pb-24">
        {/* ── Section 1: Basic Information ── */}
        <Collapsible open={openSection === 1} onOpenChange={(isOpen) => setOpenSection(isOpen ? 1 : null)}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="py-4 px-4 cursor-pointer group">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <SectionBadge number={1} icon={Building2} />
                    <div>
                      <CardTitle className="text-base">Basic Information</CardTitle>
                      <CardDescription className="text-xs">Room name, type, capacity and description</CardDescription>
                    </div>
                  </div>
                  <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="px-4 pb-4 pt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name" className="text-sm">Reading Room Name *</Label>
                    <Input id="name" name="name" value={cabin.name} onChange={handleInputChange} placeholder="e.g., Literary Lounge" required />
                  </div>
                  <div>
                    <Label htmlFor="category" className="text-sm">Category *</Label>
                    <select id="category" name="category" value={cabin.category} onChange={handleInputChange} className="w-full p-2 border rounded-md text-sm bg-background" required>
                      <option value="standard">Standard</option>
                      <option value="premium">Premium</option>
                      <option value="luxury">Luxury</option>
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="capacity" className="text-sm">Seat Capacity *</Label>
                    <Input id="capacity" name="capacity" type="number" value={cabin.capacity} onChange={handleInputChange} required min={1} />
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="description" className="text-sm">Description *</Label>
                    <Textarea id="description" name="description" value={cabin.description} onChange={handleInputChange} rows={3} placeholder="Describe the reading room features and benefits" required />
                  </div>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* ── Section 2: Images ── */}
        <Collapsible open={openSection === 2} onOpenChange={(isOpen) => setOpenSection(isOpen ? 2 : null)}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="py-4 px-4 cursor-pointer group">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <SectionBadge number={2} icon={Image} />
                    <div>
                      <CardTitle className="text-base">Images</CardTitle>
                      <CardDescription className="text-xs">Upload reading room photos (at least one required)</CardDescription>
                    </div>
                  </div>
                  <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="px-4 pb-4 pt-0">
                {cabin.imageUrl && cabin.imageUrl !== "/placeholder.svg" && (
                  <div className="aspect-video mb-4 overflow-hidden rounded-md max-w-md">
                    <img src={getImageUrl(cabin.imageSrc)} alt={cabin.name} className="w-full h-full object-cover" />
                    <p className="text-xs text-center mt-1 text-muted-foreground">Main Image</p>
                  </div>
                )}
                <ImageUpload onUpload={handleImageUpload} onRemove={handleImageRemove} existingImages={allImages} />
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* ── Section 3: Pricing and Locker ── */}
        <Collapsible open={openSection === 3} onOpenChange={(isOpen) => setOpenSection(isOpen ? 3 : null)}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="py-4 px-4 cursor-pointer group">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <SectionBadge number={3} icon={IndianRupee} />
                    <div>
                      <CardTitle className="text-base">Pricing & Locker</CardTitle>
                      <CardDescription className="text-xs">Base price, locker configuration and advance booking</CardDescription>
                    </div>
                  </div>
                  <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="px-4 pb-4 pt-0 space-y-4">
                {/* Base Price */}
                <div>
                  <Label htmlFor="price" className="text-sm font-medium">Starting Price *</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm text-muted-foreground">₹</span>
                    <Input id="price" name="price" type="number" value={cabin.price} onChange={handleInputChange} className="max-w-[180px]" required min={1} />
                    <span className="text-sm text-muted-foreground">/month</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Base price shown to students. Actual seat prices set via categories.</p>
                </div>

                {isAdmin && (
                  <div className="border rounded-lg p-3 space-y-2">
                    <Label htmlFor="free_trial_days" className="text-sm font-medium">Free Trial Days (Admin)</Label>
                    <div className="flex items-center gap-2">
                      <Input id="free_trial_days" name="free_trial_days" type="number" value={cabin.free_trial_days} onChange={(e) => setCabin(prev => ({ ...prev, free_trial_days: Number(e.target.value) || 0 }))} className="max-w-[120px]" min={0} max={365} />
                      <span className="text-sm text-muted-foreground">days</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Partner can manage this property for free during the trial period. Set 0 to use global default.</p>
                  </div>
                )}

                {/* Locker */}
                <div className="border rounded-lg p-3 space-y-3">
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="lockerAvailable" name="lockerAvailable" checked={cabin.lockerAvailable} onChange={handleLockerAvailableChange} className="h-4 w-4" />
                    <Label htmlFor="lockerAvailable" className="text-sm cursor-pointer font-medium">Locker Available</Label>
                  </div>

                  {cabin.lockerAvailable && (
                    <>
                      <div className="flex items-center gap-2">
                        <span className="text-sm">₹</span>
                        <Input id="lockerPrice" name="lockerPrice" type="number" value={cabin.lockerPrice} onChange={handleInputChange} min={1} required className="max-w-[140px]" />
                        <span className="text-sm text-muted-foreground">/month</span>
                      </div>
                      <div>
                        <Label className="text-xs font-medium mb-1 block">Locker Requirement</Label>
                        <div className="flex gap-4">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input type="radio" name="lockerMandatory" checked={cabin.lockerMandatory === true} onChange={() => setCabin(prev => ({ ...prev, lockerMandatory: true }))} className="h-3.5 w-3.5" />
                            <span className="text-xs">Mandatory</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input type="radio" name="lockerMandatory" checked={cabin.lockerMandatory === false} onChange={() => setCabin(prev => ({ ...prev, lockerMandatory: false }))} className="h-3.5 w-3.5" />
                            <span className="text-xs">Optional</span>
                          </label>
                        </div>
                        {cabin.lockerMandatory && (
                          <div className="mt-2">
                            <Label className="text-xs text-muted-foreground mb-1 block">Mandatory for durations:</Label>
                            <div className="flex gap-3">
                              {(['daily', 'weekly', 'monthly'] as const).filter(d => (cabin.allowedDurations || ['daily','weekly','monthly']).includes(d)).map(dur => (
                                <label key={dur} className="flex items-center gap-1.5 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={(cabin.lockerMandatoryDurations || []).includes(dur)}
                                    onChange={(e) => {
                                      setCabin(prev => {
                                        const current = prev.lockerMandatoryDurations || ['daily','weekly','monthly'];
                                        const updated = e.target.checked ? [...current, dur] : current.filter((d: string) => d !== dur);
                                        return { ...prev, lockerMandatoryDurations: updated };
                                      });
                                    }}
                                    className="h-3.5 w-3.5"
                                  />
                                  <span className="text-xs capitalize">{dur}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {cabin.lockerMandatory ? "Students must pay locker deposit for selected durations" : "Students can choose whether to add a locker"}
                        </p>
                      </div>
                    </>
                  )}
                </div>

                {/* Advance Booking */}
                <div className="border rounded-lg p-3 space-y-3">
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="advanceBookingEnabled" checked={cabin.advanceBookingEnabled} onChange={(e) => setCabin(prev => ({ ...prev, advanceBookingEnabled: e.target.checked }))} className="h-4 w-4" />
                    <Label htmlFor="advanceBookingEnabled" className="text-sm cursor-pointer font-medium">Allow Advance Booking</Label>
                  </div>

                  {cabin.advanceBookingEnabled && (
                    <div className="space-y-3 pl-2 border-l-2 border-primary/20 ml-2">
                      <div>
                        <Label className="text-xs font-medium mb-1 block">Advance Type</Label>
                        <div className="flex gap-4">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input type="radio" name="advanceType" checked={!cabin.advanceUseFlat} onChange={() => setCabin(prev => ({ ...prev, advanceUseFlat: false }))} className="h-3.5 w-3.5" />
                            <span className="text-xs">Percentage (%)</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input type="radio" name="advanceType" checked={cabin.advanceUseFlat} onChange={() => setCabin(prev => ({ ...prev, advanceUseFlat: true }))} className="h-3.5 w-3.5" />
                            <span className="text-xs">Flat Amount (₹)</span>
                          </label>
                        </div>
                      </div>

                      {!cabin.advanceUseFlat ? (
                        <div>
                          <Label htmlFor="advancePercentage" className="text-xs">Advance Percentage (%)</Label>
                          <Input id="advancePercentage" type="number" min={1} max={99} value={cabin.advancePercentage} onChange={e => setCabin(prev => ({ ...prev, advancePercentage: Number(e.target.value) }))} />
                        </div>
                      ) : (
                        <div>
                          <Label htmlFor="advanceFlatAmount" className="text-xs">Flat Advance Amount (₹)</Label>
                          <Input id="advanceFlatAmount" type="number" min={1} value={cabin.advanceFlatAmount} onChange={e => setCabin(prev => ({ ...prev, advanceFlatAmount: Number(e.target.value) }))} />
                        </div>
                      )}

                      <div>
                        <Label htmlFor="advanceValidityDays" className="text-xs">Advance Validity (days)</Label>
                        <Input id="advanceValidityDays" type="number" min={1} value={cabin.advanceValidityDays} onChange={e => setCabin(prev => ({ ...prev, advanceValidityDays: Number(e.target.value) }))} />
                        <p className="text-xs text-muted-foreground mt-1">Due must be paid within this many days of booking start date</p>
                      </div>

                      <div className="flex items-center gap-2 opacity-60">
                        <input type="checkbox" id="advanceAutoCancel" checked={cabin.advanceAutoCancel} onChange={(e) => setCabin(prev => ({ ...prev, advanceAutoCancel: e.target.checked }))} className="h-4 w-4" disabled />
                        <Label htmlFor="advanceAutoCancel" className="text-xs cursor-pointer">Auto-cancel if unpaid <span className="text-muted-foreground">(Coming Soon)</span></Label>
                      </div>

                      <div>
                        <Label className="text-xs font-medium mb-2 block">Allow advance payment for</Label>
                        <div className="flex flex-wrap gap-3">
                          {['daily', 'weekly', 'monthly'].filter(d => (cabin.allowedDurations as string[]).includes(d)).map(dur => (
                            <label key={dur} className="flex items-center gap-1.5 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={(cabin.advanceApplicableDurations as string[]).includes(dur)}
                                onChange={(e) => {
                                  setCabin(prev => {
                                    const current = prev.advanceApplicableDurations as string[];
                                    const updated = e.target.checked
                                      ? [...current, dur]
                                      : current.filter((d: string) => d !== dur);
                                    return { ...prev, advanceApplicableDurations: updated };
                                  });
                                }}
                                className="h-3.5 w-3.5"
                              />
                              <span className="text-xs capitalize">{dur}</span>
                            </label>
                          ))}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Students can use advance payment only for selected duration types</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* ── Section 4: Room Timings ── */}
        <Collapsible open={openSection === 4} onOpenChange={(isOpen) => setOpenSection(isOpen ? 4 : null)}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="py-4 px-4 cursor-pointer group">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <SectionBadge number={4} icon={Clock} />
                    <div>
                      <CardTitle className="text-base">Room Timings</CardTitle>
                      <CardDescription className="text-xs">Operating hours and working days</CardDescription>
                    </div>
                  </div>
                  <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="px-4 pb-4 pt-0 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="is24Hours" className="text-sm font-medium">Open 24/7</Label>
                    <p className="text-xs text-muted-foreground">Room is accessible round the clock</p>
                  </div>
                  <Switch id="is24Hours" checked={cabin.is24Hours} onCheckedChange={(checked) => setCabin(prev => ({ ...prev, is24Hours: checked }))} />
                </div>

                {!cabin.is24Hours && (
                  <div className="space-y-3 pl-2 border-l-2 border-primary/20 ml-2">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="openingTime" className="text-xs">Opening Time</Label>
                        <Input id="openingTime" type="time" value={cabin.openingTime} onChange={(e) => setCabin(prev => ({ ...prev, openingTime: e.target.value }))} />
                      </div>
                      <div>
                        <Label htmlFor="closingTime" className="text-xs">Closing Time</Label>
                        <Input id="closingTime" type="time" value={cabin.closingTime} onChange={(e) => setCabin(prev => ({ ...prev, closingTime: e.target.value }))} />
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs font-medium mb-2 block">Working Days</Label>
                      <div className="flex flex-wrap gap-2">
                        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => {
                          const isSelected = (cabin.workingDays || []).includes(day);
                          return (
                            <button
                              key={day}
                              type="button"
                              className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                                isSelected
                                  ? 'bg-primary text-primary-foreground border-primary'
                                  : 'bg-muted text-muted-foreground border-border hover:bg-accent'
                              }`}
                              onClick={() => {
                                const days = cabin.workingDays || [];
                                const updated = isSelected ? days.filter((d: string) => d !== day) : [...days, day];
                                setCabin(prev => ({ ...prev, workingDays: updated }));
                              }}
                            >
                              {day}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {cabin.is24Hours && (
                  <p className="text-sm font-medium text-primary">✓ This room is open 24 hours, 7 days a week</p>
                )}
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* ── Section 5: Booking Configuration ── */}
        <Collapsible open={openSection === 5} onOpenChange={(isOpen) => setOpenSection(isOpen ? 5 : null)}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="py-4 px-4 cursor-pointer group">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <SectionBadge number={5} icon={CalendarClock} />
                    <div>
                      <CardTitle className="text-base">Booking Configuration</CardTitle>
                      <CardDescription className="text-xs">Configure booking durations and time slots</CardDescription>
                    </div>
                  </div>
                  <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="px-4 pb-4 pt-0 space-y-3">
                {/* Allowed Booking Durations - moved above Enable Slots */}
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Offer bookings for</Label>
                  <p className="text-xs text-muted-foreground">Choose which duration types students can book</p>
                  <div className="flex flex-wrap gap-2">
                    {(['daily', 'weekly', 'monthly'] as const).map((dur) => {
                      const isSelected = (cabin.allowedDurations || []).includes(dur);
                      return (
                        <button
                          key={dur}
                          type="button"
                          className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                            isSelected
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'bg-muted text-muted-foreground border-border hover:bg-accent'
                          }`}
                          onClick={() => {
                            const current = cabin.allowedDurations || ['daily', 'weekly', 'monthly'];
                            if (isSelected && current.length <= 1) return; // At least one must remain
                            const updated = isSelected ? current.filter((d: string) => d !== dur) : [...current, dur];
                            // Also remove from slotsApplicableDurations if unchecked
                            const updatedSlotsDur = isSelected
                              ? (cabin.slotsApplicableDurations || []).filter((d: string) => d !== dur)
                              : cabin.slotsApplicableDurations || [];
                            // Auto-disable slots if no applicable durations remain
                            const autoDisableSlots = updatedSlotsDur.length === 0;
                            setCabin(prev => ({
                              ...prev,
                              allowedDurations: updated,
                              slotsApplicableDurations: updatedSlotsDur,
                              ...(autoDisableSlots ? { slotsEnabled: false } : {}),
                            }));
                          }}
                        >
                          {dur.charAt(0).toUpperCase() + dur.slice(1)}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="slotsEnabled" className="text-sm font-medium">Enable Slots</Label>
                    <p className="text-xs text-muted-foreground">Students pick a batch/slot when booking</p>
                  </div>
                  <Switch id="slotsEnabled" checked={cabin.slotsEnabled} onCheckedChange={async (checked) => {
                    if (!checked && existingCabin?.id) {
                      // Check for active slot-based bookings before disabling
                      const { data: slotBookings } = await supabase
                        .from('bookings')
                        .select('id')
                        .eq('cabin_id', existingCabin.id)
                        .not('slot_id', 'is', null)
                        .not('payment_status', 'in', '("cancelled","failed")')
                        .limit(1);
                      if (slotBookings && slotBookings.length > 0) {
                        toast({
                          title: 'Cannot Disable Slots',
                          description: 'Active slot-based bookings exist. Please cancel or complete them first.',
                          variant: 'destructive',
                        });
                        return;
                      }
                    }
                    setCabin(prev => ({ ...prev, slotsEnabled: checked }));
                  }} />
                </div>

                {/* Slots Applicable Durations - only when slots enabled */}
                {cabin.slotsEnabled && (
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Apply slots to</Label>
                    <p className="text-xs text-muted-foreground">Which duration types require time slot selection</p>
                    <div className="flex flex-wrap gap-2">
                      {(cabin.allowedDurations || ['daily', 'weekly', 'monthly']).map((dur: string) => {
                        const isSelected = (cabin.slotsApplicableDurations || []).includes(dur);
                        return (
                          <button
                            key={dur}
                            type="button"
                            className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                              isSelected
                                ? 'bg-primary text-primary-foreground border-primary'
                                : 'bg-muted text-muted-foreground border-border hover:bg-accent'
                            }`}
                            onClick={() => {
                              const current = cabin.slotsApplicableDurations || ['daily', 'weekly', 'monthly'];
                              const updated = isSelected ? current.filter((d: string) => d !== dur) : [...current, dur];
                              // Auto-disable slots toggle if nothing selected
                              if (updated.length === 0) {
                                setCabin(prev => ({ ...prev, slotsApplicableDurations: updated, slotsEnabled: false }));
                              } else {
                                setCabin(prev => ({ ...prev, slotsApplicableDurations: updated }));
                              }
                            }}
                          >
                            {dur.charAt(0).toUpperCase() + dur.slice(1)}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {cabin.slotsEnabled && existingCabin?.id && (
                  <SlotManagement cabinId={existingCabin.id} />
                )}

                {cabin.slotsEnabled && !existingCabin?.id && (
                  <p className="text-xs text-muted-foreground">Save the room first, then you can add time slots.</p>
                )}
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* ── Section 6: Amenities ── */}
        <Collapsible open={openSection === 6} onOpenChange={(isOpen) => setOpenSection(isOpen ? 6 : null)}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="py-4 px-4 cursor-pointer group">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <SectionBadge number={6} icon={Sparkles} />
                    <div>
                      <CardTitle className="text-base">Amenities</CardTitle>
                      <CardDescription className="text-xs">Select available facilities in this room</CardDescription>
                    </div>
                  </div>
                  <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="px-4 pb-4 pt-0">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {[
                    "Wi-Fi", "Desk", "Bookshelf", "Power Outlet", "Reading Lamp",
                    "Air Conditioning", "Coffee Station", "Locker", "Printing Service",
                    "Quiet Zone", "24/7 Access", "Study Materials", "Ergonomic Chair",
                    "Natural Lighting", "Private Space",
                  ].map((amenity) => (
                    <div key={amenity} className="flex items-center space-x-2 p-2 rounded-md border bg-background">
                      <input type="checkbox" id={`amenity-${amenity}`} value={amenity} checked={cabin.amenities.includes(amenity)} onChange={handleAmenityChange} className="h-3.5 w-3.5" />
                      <Label htmlFor={`amenity-${amenity}`} className="text-xs cursor-pointer">{amenity}</Label>
                    </div>
                  ))}
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* ── Section 7: Contact Person Details ── */}
        <Collapsible open={openSection === 7} onOpenChange={(isOpen) => setOpenSection(isOpen ? 7 : null)}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="py-4 px-4 cursor-pointer group">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <SectionBadge number={7} icon={User} />
                    <div>
                      <CardTitle className="text-base">Contact Person Details</CardTitle>
                      <CardDescription className="text-xs">Point of contact for this reading room</CardDescription>
                    </div>
                  </div>
                  <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="px-4 pb-4 pt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="ownerName" className="text-sm">Contact Person Name *</Label>
                    <Input id="ownerName" name="ownerName" value={cabin.ownerName} onChange={handleInputChange} placeholder="Contact Person name" required />
                  </div>
                  <div>
                    <Label htmlFor="ownerPhone" className="text-sm">Phone *</Label>
                    <Input id="ownerPhone" name="ownerPhone" value={cabin.ownerPhone} onChange={handleInputChange} placeholder="Enter phone number" required type="number" maxLength={10} minLength={10} />
                  </div>
                  <div>
                    <Label htmlFor="ownerEmail" className="text-sm">Email *</Label>
                    <Input id="ownerEmail" name="ownerEmail" value={cabin.ownerEmail} onChange={handleInputChange} placeholder="Enter email address" required type="email" />
                  </div>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* ── Section 8: Partner Assignment ── */}
        <Collapsible open={openSection === 8} onOpenChange={(isOpen) => setOpenSection(isOpen ? 8 : null)}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="py-4 px-4 cursor-pointer group">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <SectionBadge number={8} icon={Users} />
                    <div>
                      <CardTitle className="text-base">Partner Assignment</CardTitle>
                      <CardDescription className="text-xs">
                        {isAdmin ? "Select or assign a partner for this room" : "Your partner details linked to this room"}
                      </CardDescription>
                    </div>
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
                      <SelectTrigger>
                        <SelectValue placeholder="Select a partner" />
                      </SelectTrigger>
                      <SelectContent>
                        {partners.map((partner) => (
                          <SelectItem key={partner.id} value={partner.id}>
                            {partner.name} ({partner.email})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {partnerDetails && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs text-muted-foreground">Partner Name</Label>
                      <Input value={partnerDetails.name} readOnly className="bg-muted text-sm" />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Email</Label>
                      <Input value={partnerDetails.email} readOnly className="bg-muted text-sm" />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Phone</Label>
                      <Input value={partnerDetails.phone} readOnly className="bg-muted text-sm" />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Partner ID</Label>
                      <Input value={partnerDetails.serial_number} readOnly className="bg-muted text-sm" />
                    </div>
                  </div>
                )}

                {!partnerDetails && !isAdmin && (
                  <p className="text-sm text-muted-foreground">Loading your partner details...</p>
                )}
                {!partnerDetails && isAdmin && !selectedPartner && (
                  <p className="text-sm text-muted-foreground">Please select a partner to see their details.</p>
                )}
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* ── Section 9: Location ── */}
        <Collapsible open={openSection === 9} onOpenChange={(isOpen) => setOpenSection(isOpen ? 9 : null)}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="py-4 px-4 cursor-pointer group">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <SectionBadge number={9} icon={MapPin} />
                    <div>
                      <CardTitle className="text-base">Location</CardTitle>
                      <CardDescription className="text-xs">Address, coordinates and nearby landmarks</CardDescription>
                    </div>
                  </div>
                  <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="px-4 pb-4 pt-0 space-y-4">
                <LocationSelector
                  selectedState={cabin?.state}
                  selectedCity={cabin?.city}
                  selectedArea={cabin?.area}
                  onStateChange={(state) => { if (state) setCabin(prev => ({ ...prev, state, city: '', area: '' })); }}
                  onCityChange={(city) => { if (city) setCabin(prev => ({ ...prev, city, area: '' })); }}
                  onAreaChange={(area) => { if (area) setCabin(prev => ({ ...prev, area })); }}
                />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <Label htmlFor="fullAddress" className="text-sm">Full Address *</Label>
                    <Textarea id="fullAddress" name="fullAddress" value={cabin.fullAddress} onChange={handleInputChange} placeholder="Enter complete address" required rows={2} />
                  </div>
                  <div>
                    <Label htmlFor="pincode" className="text-sm">Pincode *</Label>
                    <Input id="pincode" name="pincode" value={cabin.pincode} onChange={handleInputChange} placeholder="Enter Pincode" required />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="locality" className="text-sm">Specific Locality</Label>
                    <Input id="locality" name="locality" value={cabin.locality} onChange={handleInputChange} placeholder="Enter specific locality" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="latitude" className="text-sm">Latitude</Label>
                    <Input id="latitude" name="latitude" type="number" step="any" value={cabin.latitude} onChange={handleInputChange} placeholder="Enter latitude" />
                  </div>
                  <div>
                    <Label htmlFor="longitude" className="text-sm">Longitude</Label>
                    <Input id="longitude" name="longitude" type="number" step="any" value={cabin.longitude} onChange={handleInputChange} placeholder="Enter longitude" />
                  </div>
                  <div>
                    <MapPicker
                      initialLocation={cabin.longitude ? { lat: cabin.latitude, lng: cabin.longitude } : undefined}
                      name={cabin.name}
                      onLocationSelect={handleMapLocationChange}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="nearbyLandmarks" className="text-sm">Nearby Landmarks</Label>
                  <Input id="nearbyLandmarks" name="nearbyLandmarks" value={cabin.nearbyLandmarks} onChange={handleInputChange} placeholder="Enter landmarks separated by commas" />
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      </div>

      {/* ── Sticky Footer ── */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border px-4 py-3 flex justify-end gap-3 md:pl-64">
        <Button variant="outline" onClick={handleCancel} disabled={isSaving} size="sm">
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={isSaving} size="sm">
          {isSaving ? "Saving..." : existingCabin ? "Update Reading Room" : "Create Reading Room"}
        </Button>
      </div>
    </div>
  );
}
