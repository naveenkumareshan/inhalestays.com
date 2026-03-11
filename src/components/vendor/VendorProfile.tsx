import React, { useState, useEffect, useRef } from 'react';
import { getEffectiveOwnerId } from '@/utils/getEffectiveOwnerId';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { 
  User, Building, MapPin, FileText, Phone, Mail,
  Calendar, CheckCircle, Clock, XCircle, AlertCircle, Upload, Trash2, FileIcon, Home, Plus
} from 'lucide-react';
import { vendorProfileService, VendorProfileData, VendorProfileUpdateData } from '@/api/vendorProfileService';
import { supabase } from '@/integrations/supabase/client';
import { adminCabinsService } from '@/api/adminCabinsService';

interface PropertyInfo {
  id: string;
  name: string;
  type: 'Reading Room' | 'Hostel';
  capacity: number;
  is_active: boolean;
  is_approved: boolean;
}

type NewPropertyType = 'reading_room' | 'hostel';

export const VendorProfile: React.FC = () => {
  const { toast } = useToast();
  const [profile, setProfile] = useState<VendorProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState<VendorProfileUpdateData>({});
  const [documents, setDocuments] = useState<{ name: string; url: string }[]>([]);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [properties, setProperties] = useState<PropertyInfo[]>([]);
  const [docApprovals, setDocApprovals] = useState<Record<string, string>>({});
  const [showAddProperty, setShowAddProperty] = useState(false);
  const [newPropertyType, setNewPropertyType] = useState<NewPropertyType>('reading_room');
  const [newPropertyName, setNewPropertyName] = useState('');
  const [newPropertyCity, setNewPropertyCity] = useState('');
  const [newPropertyState, setNewPropertyState] = useState('');
  const [newPropertyGender, setNewPropertyGender] = useState('Co-ed');
  const [addingProperty, setAddingProperty] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hasFetched = useRef(false);

  useEffect(() => {
    if (!hasFetched.current) {
      hasFetched.current = true;
      fetchProfile();
      fetchDocuments();
      fetchProperties();
    }
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await vendorProfileService.getProfile();
      if (response.success && response.data) {
        const profileData = response.data as VendorProfileData;
        setProfile(profileData);
        setDocApprovals((profileData as any).documentApprovals || {});
        setFormData({
          businessName: profileData.businessName,
          contactPerson: profileData.contactPerson,
          phone: profileData.phone,
          address: profileData.address,
          businessDetails: profileData.businessDetails
        });
      } else {
        toast({ title: "Error", description: response.error || "Failed to load profile", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to load profile", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const fetchDocuments = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data, error } = await supabase.storage
        .from('partner-documents')
        .list(user.id, { limit: 100 });
      if (error) throw error;
      const docs = (data || []).map(f => ({
        name: f.name,
        url: supabase.storage.from('partner-documents').getPublicUrl(`${user.id}/${f.name}`).data.publicUrl
      }));
      setDocuments(docs);
    } catch {}
  };

  const fetchProperties = async () => {
    try {
      let effectiveOwnerId: string;
      try {
        const { ownerId } = await getEffectiveOwnerId();
        effectiveOwnerId = ownerId;
      } catch {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        effectiveOwnerId = user.id;
      }
      const [cabinsRes, hostelsRes] = await Promise.all([
        supabase.from('cabins').select('id, name, capacity, is_active, is_approved').eq('created_by', effectiveOwnerId),
        supabase.from('hostels').select('id, name, is_active, is_approved').eq('created_by', effectiveOwnerId),
      ]);
      const props: PropertyInfo[] = [
        ...(cabinsRes.data || []).map(c => ({ id: c.id, name: c.name, type: 'Reading Room' as const, capacity: c.capacity || 0, is_active: c.is_active !== false, is_approved: (c as any).is_approved ?? true })),
        ...(hostelsRes.data || []).map(h => ({ id: h.id, name: h.name, type: 'Hostel' as const, capacity: 0, is_active: h.is_active !== false, is_approved: h.is_approved })),
      ];
      setProperties(props);
    } catch {}
  };

  const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploadingDoc(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      for (const file of Array.from(files)) {
        const filePath = `${user.id}/${Date.now()}_${file.name}`;
        const { error } = await supabase.storage.from('partner-documents').upload(filePath, file);
        if (error) throw error;
      }
      toast({ title: "Success", description: "Document(s) uploaded" });
      fetchDocuments();
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Upload failed", variant: "destructive" });
    } finally {
      setUploadingDoc(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDocDelete = async (docName: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      // Check if documents section is approved - prevent deletion
      if (docApprovals['documents'] === 'approved') {
        toast({ title: "Locked", description: "Documents section has been approved. Cannot delete.", variant: "destructive" });
        return;
      }
      const { error } = await supabase.storage.from('partner-documents').remove([`${user.id}/${docName}`]);
      if (error) throw error;
      toast({ title: "Deleted", description: "Document removed" });
      fetchDocuments();
    } catch {
      toast({ title: "Error", description: "Failed to delete", variant: "destructive" });
    }
  };

  const handleUpdate = async () => {
    setUpdating(true);
    try {
      const response = await vendorProfileService.updateProfile(formData);
      if (response.success && response.data) {
        setProfile(response.data as VendorProfileData);
        setEditMode(false);
        toast({ title: "Success", description: "Profile updated successfully" });
      } else {
        toast({ title: "Error", description: "Failed to update profile", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to update profile", variant: "destructive" });
    } finally {
      setUpdating(false);
    }
  };

  const handleAddProperty = async () => {
    if (!newPropertyName.trim()) {
      toast({ title: "Error", description: "Property name is required", variant: "destructive" });
      return;
    }
    setAddingProperty(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      if (newPropertyType === 'reading_room') {
        const result = await adminCabinsService.createCabin({
          name: newPropertyName,
          city: newPropertyCity || null,
          state: newPropertyState || null,
          is_active: false,
          isActive: false,
          created_by: user.id,
        });
        if (!result.success) throw new Error(result.message || 'Failed to create reading room');
        if (result.data?.id) {
          await supabase.from('cabins').update({ is_approved: false, is_active: false }).eq('id', result.data.id);
        }
      } else {
        const { error } = await supabase.from('hostels').insert({
          name: newPropertyName,
          location: [newPropertyCity, newPropertyState].filter(Boolean).join(', '),
          gender: newPropertyGender,
          is_active: false,
          is_approved: false,
          created_by: user.id,
        });
        if (error) throw error;
      }

      toast({ title: "Success", description: "Property submitted for approval!" });
      setShowAddProperty(false);
      setNewPropertyName('');
      setNewPropertyCity('');
      setNewPropertyState('');
      fetchProperties();
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to add property", variant: "destructive" });
    } finally {
      setAddingProperty(false);
    }
  };

  const isSectionLocked = (section: string) => docApprovals[section] === 'approved';

  const SectionBadge = ({ section }: { section: string }) => {
    const status = docApprovals[section];
    if (status === 'approved') return <Badge className="bg-green-100 text-green-800 text-[10px]"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>;
    if (status === 'rejected') return <Badge className="bg-red-100 text-red-800 text-[10px]"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
    return null;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved': return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>;
      case 'pending': return <Badge className="bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'rejected': return <Badge className="bg-red-100 text-red-800"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
      case 'suspended': return <Badge className="bg-orange-100 text-orange-800"><AlertCircle className="w-3 h-3 mr-1" />Suspended</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <Card><CardContent className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-sm">Loading profile...</p>
        </div>
      </CardContent></Card>
    );
  }

  if (!profile) {
    return (
      <Card><CardContent className="flex items-center justify-center p-8">
        <div className="text-center">
          <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm font-medium">Profile not found</p>
          <p className="text-xs text-muted-foreground mt-1">Please contact the admin.</p>
        </div>
      </CardContent></Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-primary/10 rounded-full">
                <Building className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">{profile.businessName || 'Partner'}</CardTitle>
                <p className="text-xs text-muted-foreground">ID: {profile.vendorId}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {getStatusBadge(profile.status)}
              {properties.length > 0 && (
                <Badge variant="outline" className="text-xs">
                  <Home className="h-3 w-3 mr-1" />{properties.length} Properties
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      <Tabs defaultValue="basic" className="space-y-3">
        <TabsList className="h-8">
          <TabsTrigger value="basic" className="text-xs">Basic Info</TabsTrigger>
          <TabsTrigger value="business" className="text-xs">Business Details</TabsTrigger>
          <TabsTrigger value="documents" className="text-xs">Documents</TabsTrigger>
          <TabsTrigger value="properties" className="text-xs">Properties</TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="space-y-3">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2"><User className="h-4 w-4" />Basic Information</CardTitle>
                <div className="flex items-center gap-2">
                  <SectionBadge section="basic_info" />
                  {!isSectionLocked('basic_info') && !editMode && (
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setEditMode(true)}>Edit</Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Business Name</Label>
                  {editMode && !isSectionLocked('basic_info') ? (
                    <Input className="h-8 text-xs" value={formData.businessName || ''} onChange={(e) => setFormData({...formData, businessName: e.target.value})} />
                  ) : (
                    <p className="mt-0.5 text-sm font-medium">{profile.businessName || '—'}</p>
                  )}
                </div>
                <div>
                  <Label className="text-xs">Contact Person</Label>
                  {editMode && !isSectionLocked('basic_info') ? (
                    <Input className="h-8 text-xs" value={formData.contactPerson || ''} onChange={(e) => setFormData({...formData, contactPerson: e.target.value})} />
                  ) : (
                    <p className="mt-0.5 text-sm font-medium">{profile.contactPerson || '—'}</p>
                  )}
                </div>
                <div>
                  <Label className="text-xs flex items-center gap-1"><Mail className="h-3 w-3" />Email</Label>
                  <p className="mt-0.5 text-sm text-muted-foreground">{profile.email}</p>
                </div>
                <div>
                  <Label className="text-xs flex items-center gap-1"><Phone className="h-3 w-3" />Phone</Label>
                  {editMode && !isSectionLocked('basic_info') ? (
                    <Input className="h-8 text-xs" value={formData.phone || ''} onChange={(e) => setFormData({...formData, phone: e.target.value})} />
                  ) : (
                    <p className="mt-0.5 text-sm font-medium">{profile.phone || '—'}</p>
                  )}
                </div>
              </div>

              <div>
                <Label className="text-xs flex items-center gap-1"><MapPin className="h-3 w-3" />Address</Label>
                {editMode && !isSectionLocked('basic_info') ? (
                  <div className="mt-1 space-y-2">
                    <Input className="h-8 text-xs" placeholder="Street" value={formData.address?.street || ''} onChange={(e) => setFormData({...formData, address: {...formData.address, street: e.target.value}})} />
                    <div className="grid grid-cols-2 gap-2">
                      <Input className="h-8 text-xs" placeholder="City" value={formData.address?.city || ''} onChange={(e) => setFormData({...formData, address: {...formData.address, city: e.target.value}})} />
                      <Input className="h-8 text-xs" placeholder="State" value={formData.address?.state || ''} onChange={(e) => setFormData({...formData, address: {...formData.address, state: e.target.value}})} />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Input className="h-8 text-xs" placeholder="Pincode" value={formData.address?.pincode || ''} onChange={(e) => setFormData({...formData, address: {...formData.address, pincode: e.target.value}})} />
                      <Input className="h-8 text-xs" placeholder="Country" value={formData.address?.country || ''} onChange={(e) => setFormData({...formData, address: {...formData.address, country: e.target.value}})} />
                    </div>
                  </div>
                ) : (
                  <div className="mt-0.5 text-sm">
                    <p>{profile.address?.street || '—'}</p>
                    <p className="text-muted-foreground">{profile.address?.city}, {profile.address?.state} {profile.address?.pincode}</p>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <Calendar className="h-3 w-3" />
                Joined on {new Date(profile.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
              </div>

              {editMode && !isSectionLocked('basic_info') && (
                <div className="flex gap-2 pt-2 border-t">
                  <Button size="sm" className="h-7 text-xs" onClick={handleUpdate} disabled={updating}>{updating ? 'Saving...' : 'Save Changes'}</Button>
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setEditMode(false)}>Cancel</Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="business" className="space-y-3">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2"><FileText className="h-4 w-4" />Business Details</CardTitle>
                <div className="flex items-center gap-2">
                  <SectionBadge section="business_details" />
                  {!isSectionLocked('business_details') && !editMode && (
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setEditMode(true)}>Edit</Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Business Type</Label>
                  <p className="mt-0.5 text-sm font-medium capitalize">{profile.businessType || '—'}</p>
                </div>
                {['gstNumber', 'panNumber', 'aadharNumber'].map(key => (
                  <div key={key}>
                    <Label className="text-xs capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</Label>
                    {editMode && !isSectionLocked('business_details') ? (
                      <Input className="h-8 text-xs" value={(formData.businessDetails as any)?.[key] || ''} onChange={(e) => setFormData({...formData, businessDetails: {...formData.businessDetails, [key]: e.target.value}})} />
                    ) : (
                      <p className="mt-0.5 text-sm font-medium">{(profile.businessDetails as any)?.[key] || 'Not provided'}</p>
                    )}
                  </div>
                ))}
              </div>
              <div>
                <Label className="text-xs">Business Description</Label>
                {editMode && !isSectionLocked('business_details') ? (
                  <Textarea className="text-xs min-h-[60px]" value={formData.businessDetails?.description || ''} onChange={(e) => setFormData({...formData, businessDetails: {...formData.businessDetails, description: e.target.value}})} />
                ) : (
                  <p className="mt-0.5 text-sm">{profile.businessDetails?.description || 'No description'}</p>
                )}
              </div>
              {editMode && !isSectionLocked('business_details') && (
                <div className="flex gap-2 pt-2 border-t">
                  <Button size="sm" className="h-7 text-xs" onClick={handleUpdate} disabled={updating}>{updating ? 'Saving...' : 'Save'}</Button>
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setEditMode(false)}>Cancel</Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="space-y-3">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2"><FileText className="h-4 w-4" />Business Documents</CardTitle>
                <div className="flex items-center gap-2">
                  <SectionBadge section="documents" />
                  {!isSectionLocked('documents') && (
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => fileInputRef.current?.click()} disabled={uploadingDoc}>
                      <Upload className="h-3 w-3 mr-1" />{uploadingDoc ? 'Uploading...' : 'Upload'}
                    </Button>
                  )}
                  <input ref={fileInputRef} type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" className="hidden" onChange={handleDocUpload} />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-[10px] text-muted-foreground mb-3">
                Upload business documents: Aadhar, PAN, GST Certificate, Cancelled Cheque, Site Photos, etc.
              </p>
              {documents.length === 0 ? (
                <div className="text-center py-8">
                  <FileIcon className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
                  <p className="text-xs text-muted-foreground">No documents uploaded yet</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {documents.map((doc) => (
                    <div key={doc.name} className="flex items-center justify-between py-1.5 px-2.5 bg-muted/30 rounded text-xs">
                      <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate flex-1">
                        {doc.name}
                      </a>
                      {!isSectionLocked('documents') && (
                        <Button variant="ghost" size="sm" className="h-5 w-5 p-0 text-destructive hover:text-destructive ml-2" onClick={() => handleDocDelete(doc.name)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="properties" className="space-y-3">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2"><Home className="h-4 w-4" />My Properties</CardTitle>
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setShowAddProperty(true)}>
                  <Plus className="h-3 w-3 mr-1" /> Add New Property
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {properties.length === 0 ? (
                <div className="text-center py-8">
                  <Building className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
                  <p className="text-xs text-muted-foreground">No properties linked yet</p>
                  <Button size="sm" variant="outline" className="mt-3 text-xs" onClick={() => setShowAddProperty(true)}>
                    <Plus className="h-3 w-3 mr-1" /> Add Your First Property
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {properties.map((p) => (
                    <div key={p.id} className="flex items-center justify-between py-2 px-3 bg-muted/30 rounded">
                      <div>
                        <span className="text-sm font-medium">{p.name}</span>
                        <Badge variant="outline" className="ml-2 text-[9px]">{p.type}</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        {p.type === 'Reading Room' && p.capacity > 0 && (
                          <span className="text-xs text-muted-foreground">{p.capacity} seats</span>
                        )}
                        {!p.is_approved && (
                          <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-[10px]">
                            <Clock className="h-3 w-3 mr-1" />Pending Approval
                          </Badge>
                        )}
                        {p.is_approved && (
                          <Badge className={p.is_active ? 'bg-emerald-100 text-emerald-700 text-[10px]' : 'bg-red-100 text-red-700 text-[10px]'}>
                            {p.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Add New Property Dialog */}
          <Dialog open={showAddProperty} onOpenChange={setShowAddProperty}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="text-sm">Add New Property</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label className="text-xs">Property Type</Label>
                  <Select value={newPropertyType} onValueChange={(v) => setNewPropertyType(v as NewPropertyType)}>
                    <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="reading_room" className="text-xs">Reading Room</SelectItem>
                      <SelectItem value="hostel" className="text-xs">Hostel</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Property Name *</Label>
                  <Input className="h-8 text-xs mt-1" value={newPropertyName} onChange={e => setNewPropertyName(e.target.value)} placeholder="Enter property name" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">City</Label>
                    <Input className="h-8 text-xs mt-1" value={newPropertyCity} onChange={e => setNewPropertyCity(e.target.value)} placeholder="City" />
                  </div>
                  <div>
                    <Label className="text-xs">State</Label>
                    <Input className="h-8 text-xs mt-1" value={newPropertyState} onChange={e => setNewPropertyState(e.target.value)} placeholder="State" />
                  </div>
                </div>
                {newPropertyType === 'hostel' && (
                  <div>
                    <Label className="text-xs">Gender</Label>
                    <Select value={newPropertyGender} onValueChange={setNewPropertyGender}>
                      <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Co-ed" className="text-xs">Co-ed</SelectItem>
                        <SelectItem value="Male" className="text-xs">Male Only</SelectItem>
                        <SelectItem value="Female" className="text-xs">Female Only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <p className="text-[10px] text-muted-foreground">
                  Property will be created in "Pending Approval" state. Admin will review and approve it before it goes live.
                </p>
              </div>
              <DialogFooter>
                <Button variant="outline" size="sm" className="text-xs" onClick={() => setShowAddProperty(false)}>Cancel</Button>
                <Button size="sm" className="text-xs" onClick={handleAddProperty} disabled={addingProperty}>
                  {addingProperty ? 'Submitting...' : 'Submit for Approval'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>
      </Tabs>
    </div>
  );
};
