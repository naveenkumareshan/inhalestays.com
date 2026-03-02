import React, { useState, useEffect } from "react";
import { toast } from "@/hooks/use-toast";
import { hostelService, HostelData as HostelServiceData } from "@/api/hostelService";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { ImageUpload } from "@/components/ImageUpload";
import MapPicker from "./MapPicker";
import { LocationSelector } from "../forms/LocationSelector";

interface HostelFormProps {
  initialData?: any;
  onSuccess: () => void;
  hostelId?: string;
}

export interface HostelData {
  id?: string;
  name: string;
  location: string;
  description?: string;
  locality?: string;
  state_id?: string;
  city_id?: string;
  area_id?: string;
  contact_email?: string;
  contact_phone?: string;
  is_active: boolean;
  logo_image?: string;
  stay_type?: "Short-term" | "Long-term" | "Both";
  gender?: "Male" | "Female" | "Co-ed";
  amenities?: string[];
  images?: string[];
  coordinates_lat?: number;
  coordinates_lng?: number;
  security_deposit?: number;
  advance_booking_enabled?: boolean;
  advance_percentage?: number;
  advance_flat_amount?: number;
  advance_use_flat?: boolean;
  cancellation_window_hours?: number;
  max_advance_booking_days?: number;
  allowed_durations?: string[];
  advance_applicable_durations?: string[];
  food_policy_type?: 'not_available' | 'mandatory' | 'optional';
  food_price_monthly?: number;
  food_enabled?: boolean;
  show_food_price?: boolean;
}

export const HostelForm: React.FC<HostelFormProps> = ({
  initialData,
  hostelId,
  onSuccess,
}) => {
  const [formData, setFormData] = useState<HostelData>({
    name: "",
    location: "",
    description: "",
    contact_email: "",
    contact_phone: "",
    is_active: true,
    logo_image: "",
    stay_type: "Both",
    gender: "Co-ed",
    locality: "",
    state_id: "",
    city_id: "",
    area_id: "",
    amenities: [],
    images: [],
    coordinates_lat: 0,
    coordinates_lng: 0,
    security_deposit: 0,
    advance_booking_enabled: false,
    advance_percentage: 50,
    advance_use_flat: false,
    cancellation_window_hours: 24,
    max_advance_booking_days: 30,
    allowed_durations: ['daily', 'weekly', 'monthly'],
    advance_applicable_durations: ['daily', 'weekly', 'monthly'],
    food_policy_type: 'not_available',
    food_price_monthly: 0,
    show_food_price: true,
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || "",
        location: initialData.location || "",
        description: initialData.description || "",
        contact_email: initialData.contact_email || "",
        contact_phone: initialData.contact_phone || "",
        is_active: initialData.is_active ?? true,
        logo_image: initialData.logo_image || "",
        stay_type: initialData.stay_type || "Both",
        gender: initialData.gender || "Co-ed",
        locality: initialData.locality || "",
        state_id: initialData.state_id || "",
        city_id: initialData.city_id || "",
        area_id: initialData.area_id || "",
        amenities: initialData.amenities || [],
        images: initialData.images || [],
        coordinates_lat: initialData.coordinates_lat || 0,
        coordinates_lng: initialData.coordinates_lng || 0,
        security_deposit: initialData.security_deposit || 0,
        advance_booking_enabled: initialData.advance_booking_enabled || false,
        advance_percentage: initialData.advance_percentage || 50,
        advance_flat_amount: initialData.advance_flat_amount,
        advance_use_flat: initialData.advance_use_flat || false,
        cancellation_window_hours: initialData.cancellation_window_hours || 24,
        max_advance_booking_days: initialData.max_advance_booking_days || 30,
        allowed_durations: initialData.allowed_durations || ['daily', 'weekly', 'monthly'],
        advance_applicable_durations: initialData.advance_applicable_durations || ['daily', 'weekly', 'monthly'],
        food_policy_type: initialData.food_policy_type || 'not_available',
        food_price_monthly: initialData.food_price_monthly || 0,
        show_food_price: initialData.show_food_price ?? true,
      });
    }
  }, [initialData]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: parseFloat(value) || 0 }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAmenityToggle = (amenity: string) => {
    setFormData((prev) => {
      const current = prev.amenities || [];
      return {
        ...prev,
        amenities: current.includes(amenity)
          ? current.filter((a) => a !== amenity)
          : [...current, amenity],
      };
    });
  };

  const handleImageUpload = async (url: string) => {
    const updatedImages = [...(formData.images || []), url];
    setFormData((prev) => ({ ...prev, logo_image: url, images: updatedImages }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const submitData = {
        ...formData,
        food_enabled: formData.food_policy_type !== 'not_available',
      };
      if (hostelId) {
        await hostelService.updateHostel(hostelId, submitData);
      } else {
        await hostelService.createHostel(submitData);
      }
      toast({
        title: "Success",
        description: hostelId ? "Hostel updated successfully" : "Hostel created successfully",
      });
      onSuccess();
    } catch (error: any) {
      console.error("Error saving hostel:", error);
      toast({
        title: "Error",
        description: error.message || `Failed to ${hostelId ? "update" : "create"} hostel`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMapLocationChange = (coordinates: { lat: number; lng: number }) => {
    setFormData((prev) => ({
      ...prev,
      coordinates_lat: coordinates.lat,
      coordinates_lng: coordinates.lng,
    }));
  };

  const amenityOptions = [
    { id: "wifi", label: "WiFi" },
    { id: "ac", label: "Air Conditioning" },
    { id: "gym", label: "Gym" },
    { id: "laundry", label: "Laundry" },
    { id: "food", label: "Food Service" },
    { id: "study-room", label: "Study Room" },
    { id: "tv-room", label: "TV Room" },
    { id: "parking", label: "Parking" },
    { id: "security", label: "24/7 Security" },
    { id: "power-backup", label: "Power Backup" },
    { id: "housekeeping", label: "Housekeeping" },
    { id: "recreation", label: "Recreation Area" },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-6 h-[500px] overflow-y-auto">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <Label htmlFor="name">Hostel Name</Label>
            <Input id="name" name="name" value={formData.name} onChange={handleInputChange} required />
          </div>
          <div>
            <Label htmlFor="location">Location Address</Label>
            <Input id="location" name="location" value={formData.location} onChange={handleInputChange} required />
          </div>
          <div>
            <Label htmlFor="locality">Locality/Area</Label>
            <Input id="locality" name="locality" value={formData.locality} onChange={handleInputChange} placeholder="e.g., Gachibowli, Madhapur" />
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" name="description" value={formData.description} onChange={handleInputChange} rows={3} />
          </div>
          <div>
            <Label htmlFor="stay_type">Stay Type</Label>
            <Select value={formData.stay_type} onValueChange={(value) => handleSelectChange("stay_type", value)}>
              <SelectTrigger><SelectValue placeholder="Select stay type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Short-term">Short-term</SelectItem>
                <SelectItem value="Long-term">Long-term</SelectItem>
                <SelectItem value="Both">Both</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="gender">Gender</Label>
            <Select value={formData.gender} onValueChange={(value) => handleSelectChange("gender", value)}>
              <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Male">Male (Boys Only)</SelectItem>
                <SelectItem value="Female">Female (Girls Only)</SelectItem>
                <SelectItem value="Co-ed">Co-ed (Both)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="security_deposit">Security Deposit (₹)</Label>
            <Input id="security_deposit" name="security_deposit" type="number" value={formData.security_deposit} onChange={handleNumberChange} min="0" />
          </div>

          {/* Food Policy */}
          <div className="space-y-3 border rounded-lg p-3">
            <Label className="text-sm font-semibold">Food Policy</Label>
            <Select value={formData.food_policy_type} onValueChange={(value) => handleSelectChange("food_policy_type", value)}>
              <SelectTrigger><SelectValue placeholder="Select food policy" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="not_available">Not Available</SelectItem>
                <SelectItem value="mandatory">Mandatory (Included in Rent)</SelectItem>
                <SelectItem value="optional">Optional (Add-on)</SelectItem>
              </SelectContent>
            </Select>
            {(formData.food_policy_type === 'mandatory' || formData.food_policy_type === 'optional') && (
              <div>
                <Label className="text-xs">Food Price (₹/month)</Label>
                <Input name="food_price_monthly" type="number" value={formData.food_price_monthly} onChange={handleNumberChange} min="0" />
              </div>
            )}
            {formData.food_policy_type === 'mandatory' && (
              <div className="flex items-center gap-2">
                <Switch checked={formData.show_food_price ?? true} onCheckedChange={(checked) => setFormData(prev => ({ ...prev, show_food_price: checked }))} />
                <Label className="text-xs font-normal cursor-pointer">Show food price to students</Label>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="contact_email">Email</Label>
              <Input id="contact_email" name="contact_email" type="email" value={formData.contact_email} onChange={handleInputChange} />
            </div>
            <div>
              <Label htmlFor="contact_phone">Phone</Label>
              <Input id="contact_phone" name="contact_phone" value={formData.contact_phone} onChange={handleInputChange} />
            </div>
          </div>

          {/* Advance payment settings */}
          <div className="space-y-3 border rounded-lg p-3">
            <div className="flex items-center justify-between">
              <Label>Advance Payment</Label>
              <Switch checked={formData.advance_booking_enabled} onCheckedChange={(checked) => setFormData(prev => ({ ...prev, advance_booking_enabled: checked }))} />
            </div>
            {formData.advance_booking_enabled && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Switch checked={formData.advance_use_flat} onCheckedChange={(checked) => setFormData(prev => ({ ...prev, advance_use_flat: checked }))} />
                  <Label className="text-sm">{formData.advance_use_flat ? 'Flat Amount' : 'Percentage'}</Label>
                </div>
                {formData.advance_use_flat ? (
                  <div>
                    <Label className="text-xs">Flat Amount (₹)</Label>
                    <Input name="advance_flat_amount" type="number" value={formData.advance_flat_amount || ''} onChange={handleNumberChange} min="0" />
                  </div>
                ) : (
                  <div>
                    <Label className="text-xs">Percentage (%)</Label>
                    <Input name="advance_percentage" type="number" value={formData.advance_percentage} onChange={handleNumberChange} min="0" max="100" />
                  </div>
                )}
                <div>
                  <Label className="text-xs">Cancellation Window (hours)</Label>
                  <Input name="cancellation_window_hours" type="number" value={formData.cancellation_window_hours} onChange={handleNumberChange} min="0" />
                </div>
              </div>
            )}
          </div>

          {/* Booking Duration & Advance Controls */}
          <div className="space-y-3 border rounded-lg p-3">
            <Label className="text-sm font-semibold">Booking Controls</Label>
            <div>
              <Label className="text-xs">Max Advance Booking Days</Label>
              <Input name="max_advance_booking_days" type="number" value={formData.max_advance_booking_days} onChange={handleNumberChange} min="1" max="365" />
              <p className="text-xs text-muted-foreground mt-1">How many days in advance students can book</p>
            </div>
            <div>
              <Label className="text-xs">Allowed Duration Types</Label>
              <div className="flex gap-2 mt-1">
                {['daily', 'weekly', 'monthly'].map(dur => (
                  <div key={dur} className="flex items-center space-x-1">
                    <Checkbox
                      id={`allowed-${dur}`}
                      checked={formData.allowed_durations?.includes(dur)}
                      onCheckedChange={(checked) => {
                        setFormData(prev => {
                          const current = prev.allowed_durations || [];
                          return {
                            ...prev,
                            allowed_durations: checked
                              ? [...current, dur]
                              : current.filter(d => d !== dur),
                          };
                        });
                      }}
                    />
                    <Label htmlFor={`allowed-${dur}`} className="text-xs font-normal cursor-pointer capitalize">{dur}</Label>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Which duration types are shown to students</p>
            </div>
            {formData.advance_booking_enabled && (
              <div>
                <Label className="text-xs">Advance Payment Applicable For</Label>
                <div className="flex gap-2 mt-1">
                  {['daily', 'weekly', 'monthly'].map(dur => (
                    <div key={dur} className="flex items-center space-x-1">
                      <Checkbox
                        id={`adv-applicable-${dur}`}
                        checked={formData.advance_applicable_durations?.includes(dur)}
                        onCheckedChange={(checked) => {
                          setFormData(prev => {
                            const current = prev.advance_applicable_durations || [];
                            return {
                              ...prev,
                              advance_applicable_durations: checked
                                ? [...current, dur]
                                : current.filter(d => d !== dur),
                            };
                          });
                        }}
                      />
                      <Label htmlFor={`adv-applicable-${dur}`} className="text-xs font-normal cursor-pointer capitalize">{dur}</Label>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Which durations allow advance (partial) payment</p>
              </div>
            )}
          </div>

          <div>
            <Label>Amenities</Label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {amenityOptions.map((amenity) => (
                <div key={amenity.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`amenity-${amenity.id}`}
                    checked={formData.amenities?.includes(amenity.id)}
                    onCheckedChange={() => handleAmenityToggle(amenity.id)}
                  />
                  <Label htmlFor={`amenity-${amenity.id}`} className="text-sm font-normal cursor-pointer">{amenity.label}</Label>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Switch id="is_active" checked={formData.is_active} onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))} />
            <Label htmlFor="is_active">Active</Label>
          </div>

          <div>
            <Label>Hostel Images</Label>
            <div className="mt-1">
              <ImageUpload
                onUpload={handleImageUpload}
                existingImages={[
                  ...(formData.logo_image ? [formData.logo_image] : []),
                  ...(formData.images || []),
                ]}
                maxCount={5}
              />
            </div>
          </div>
        </div>
      </div>

      <MapPicker
        initialLocation={formData.coordinates_lat && formData.coordinates_lng ? { lat: formData.coordinates_lat, lng: formData.coordinates_lng } : undefined}
        name={formData.name}
        onLocationSelect={handleMapLocationChange}
      />

      <LocationSelector
        selectedState={formData.state_id || ''}
        selectedCity={formData.city_id || ''}
        selectedArea={formData.area_id || ''}
        onStateChange={(state) => setFormData(prev => ({ ...prev, state_id: state, city_id: '', area_id: '' }))}
        onCityChange={(city) => setFormData(prev => ({ ...prev, city_id: city, area_id: '' }))}
        onAreaChange={(area) => setFormData(prev => ({ ...prev, area_id: area }))}
        showCountry={false}
      />

      <div className="flex justify-end">
        <Button type="submit" disabled={loading}>
          {loading ? "Saving..." : hostelId ? "Update Hostel" : "Create Hostel"}
        </Button>
      </div>
    </form>
  );
};
