
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { User, Building, CreditCard, Phone, Mail, MapPin, Calendar, Check, X, AlertTriangle, Edit, Save, FileText, Power, Home, KeyRound } from 'lucide-react';
import { Vendor } from '@/api/vendorApprovalService';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { AdminResetPasswordDialog } from './AdminResetPasswordDialog';

interface VendorDetailsDialogProps {
  vendor: Vendor;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStatusUpdate: (vendorId: string, action: 'approve' | 'reject' | 'suspend', additionalData?: any) => Promise<void>;
  onVendorUpdate: (vendorId: string, updatedData: Partial<Vendor>) => Promise<void>;
}

interface DocumentFile {
  name: string;
  url: string;
}

interface PropertyInfo {
  id: string;
  name: string;
  type: 'Reading Room' | 'Hostel';
  capacity: number;
  is_active: boolean;
}

export const VendorDetailsDialog: React.FC<VendorDetailsDialogProps> = ({
  vendor,
  open,
  onOpenChange,
  onStatusUpdate,
  onVendorUpdate
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedVendor, setEditedVendor] = useState(vendor);
  const [rejectionReason, setRejectionReason] = useState('');
  const [commissionRate, setCommissionRate] = useState(vendor.commission_settings?.value || 10);
  const [notes, setNotes] = useState('');
  const [documents, setDocuments] = useState<DocumentFile[]>([]);
  const [properties, setProperties] = useState<PropertyInfo[]>([]);
  const [docApprovals, setDocApprovals] = useState<Record<string, string>>({});
  const [showResetPassword, setShowResetPassword] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setEditedVendor(vendor);
    setCommissionRate(vendor.commission_settings?.value || 10);
    setDocApprovals((vendor as any).document_approvals || {});
    if (open) {
      fetchDocuments();
      fetchProperties();
    }
  }, [vendor, open]);

  const fetchDocuments = async () => {
    try {
      const { data, error } = await supabase.storage
        .from('partner-documents')
        .list(vendor.user_id, { limit: 100 });
      if (error) return;
      const docs = (data || []).map(f => ({
        name: f.name,
        url: supabase.storage.from('partner-documents').getPublicUrl(`${vendor.user_id}/${f.name}`).data.publicUrl
      }));
      setDocuments(docs);
    } catch {}
  };

  const fetchProperties = async () => {
    try {
      const [cabinsRes, hostelsRes] = await Promise.all([
        supabase.from('cabins').select('id, name, capacity, is_active').eq('created_by', vendor.user_id),
        supabase.from('hostels').select('id, name, is_active').eq('created_by', vendor.user_id),
      ]);
      const props: PropertyInfo[] = [
        ...(cabinsRes.data || []).map(c => ({ id: c.id, name: c.name, type: 'Reading Room' as const, capacity: c.capacity || 0, is_active: c.is_active !== false })),
        ...(hostelsRes.data || []).map(h => ({ id: h.id, name: h.name, type: 'Hostel' as const, capacity: 0, is_active: h.is_active !== false })),
      ];
      setProperties(props);
    } catch {}
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'suspended': return 'bg-yellow-100 text-yellow-800';
      case 'pending': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleApprove = async () => {
    await onStatusUpdate(vendor.id, 'approve', { commissionRate, notes });
    onOpenChange(false);
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) return;
    await onStatusUpdate(vendor.id, 'reject', { rejectionReason, notes });
    onOpenChange(false);
  };

  const handleSuspend = async () => {
    await onStatusUpdate(vendor.id, 'suspend', { notes });
    onOpenChange(false);
  };

  const handleSaveChanges = async () => {
    await onVendorUpdate(vendor.id, editedVendor);
    setIsEditing(false);
  };

  const handleSectionApproval = async (section: string, status: 'approved' | 'rejected') => {
    const updated = { ...docApprovals, [section]: status };
    setDocApprovals(updated);
    await supabase.from('partners').update({ document_approvals: updated } as any).eq('id', vendor.id);
    toast({ title: "Success", description: `${section} ${status}` });
  };

  const updateEditedVendor = (field: string, value: any) => {
    const fieldParts = field.split('.');
    if (fieldParts.length === 1) {
      setEditedVendor(prev => ({ ...prev, [field]: value }));
    } else if (fieldParts.length === 2) {
      setEditedVendor(prev => {
        const parentField = fieldParts[0] as keyof Vendor;
        const parentValue = prev[parentField];
        if (typeof parentValue === 'object' && parentValue !== null) {
          return { ...prev, [fieldParts[0]]: { ...parentValue, [fieldParts[1]]: value } };
        }
        return prev;
      });
    }
  };

  const SectionApprovalButtons = ({ section }: { section: string }) => (
    <div className="flex items-center gap-2">
      {docApprovals[section] === 'approved' ? (
        <Badge className="bg-green-100 text-green-800 text-[10px]">✓ Approved</Badge>
      ) : docApprovals[section] === 'rejected' ? (
        <Badge className="bg-red-100 text-red-800 text-[10px]">✗ Rejected</Badge>
      ) : (
        <Badge className="bg-amber-100 text-amber-800 text-[10px]">Pending</Badge>
      )}
      <Button variant="outline" size="sm" className="h-6 text-[10px] text-emerald-600" onClick={() => handleSectionApproval(section, 'approved')}>
        <Check className="h-3 w-3 mr-1" />Approve
      </Button>
      <Button variant="outline" size="sm" className="h-6 text-[10px] text-red-600" onClick={() => handleSectionApproval(section, 'rejected')}>
        <X className="h-3 w-3 mr-1" />Reject
      </Button>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg">Partner Details</DialogTitle>
            <div className="flex items-center gap-2">
              <Badge className={`${getStatusColor(vendor.status)} border-0 text-xs`}>
                <span className="capitalize">{vendor.status}</span>
              </Badge>
              {!isEditing ? (
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setIsEditing(true)}>
                  <Edit className="h-3 w-3 mr-1" /> Edit
                </Button>
              ) : (
                <div className="flex gap-1">
                  <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => { setEditedVendor(vendor); setIsEditing(false); }}>Cancel</Button>
                  <Button size="sm" className="h-7 text-xs" onClick={handleSaveChanges}><Save className="h-3 w-3 mr-1" />Save</Button>
                </div>
              )}
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-6 h-8">
            <TabsTrigger value="basic" className="text-[11px]">Basic</TabsTrigger>
            <TabsTrigger value="business" className="text-[11px]">Business</TabsTrigger>
            <TabsTrigger value="bank" className="text-[11px]">Bank</TabsTrigger>
            <TabsTrigger value="documents" className="text-[11px]">Documents</TabsTrigger>
            <TabsTrigger value="properties" className="text-[11px]">Properties</TabsTrigger>
            <TabsTrigger value="actions" className="text-[11px]">Actions</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-3">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2"><User className="h-4 w-4" />Contact Information</CardTitle>
                  <SectionApprovalButtons section="basic_info" />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Partner ID</Label>
                    <p className="font-mono text-xs bg-muted p-1.5 rounded">{vendor.serial_number || vendor.id.slice(0, 8)}</p>
                  </div>
                  <div>
                    <Label className="text-xs">Business Name</Label>
                    {isEditing ? <Input className="h-7 text-xs" value={editedVendor.business_name} onChange={(e) => updateEditedVendor('business_name', e.target.value)} />
                    : <p className="text-xs p-1.5">{vendor.business_name}</p>}
                  </div>
                  <div>
                    <Label className="text-xs">Contact Person</Label>
                    {isEditing ? <Input className="h-7 text-xs" value={editedVendor.contact_person} onChange={(e) => updateEditedVendor('contact_person', e.target.value)} />
                    : <p className="text-xs p-1.5">{vendor.contact_person}</p>}
                  </div>
                  <div>
                    <Label className="text-xs">Business Type</Label>
                    <Badge variant="outline" className="capitalize text-[10px]">{vendor.business_type}</Badge>
                  </div>
                </div>
                <Separator />
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-1.5">
                    <Mail className="h-3 w-3 text-muted-foreground" />
                    {isEditing ? <Input className="h-7 text-xs" value={editedVendor.email} onChange={(e) => updateEditedVendor('email', e.target.value)} />
                    : <span className="text-xs">{vendor.email}</span>}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Phone className="h-3 w-3 text-muted-foreground" />
                    {isEditing ? <Input className="h-7 text-xs" value={editedVendor.phone} onChange={(e) => updateEditedVendor('phone', e.target.value)} />
                    : <span className="text-xs">{vendor.phone}</span>}
                  </div>
                </div>
                <div className="flex items-start gap-1.5">
                  <MapPin className="h-3 w-3 text-muted-foreground mt-0.5" />
                  {isEditing ? (
                    <div className="space-y-1.5 flex-1">
                      <Input className="h-7 text-xs" placeholder="Street" value={editedVendor.address?.street || ''} onChange={(e) => updateEditedVendor('address.street', e.target.value)} />
                      <div className="grid grid-cols-2 gap-1.5">
                        <Input className="h-7 text-xs" placeholder="City" value={editedVendor.address?.city || ''} onChange={(e) => updateEditedVendor('address.city', e.target.value)} />
                        <Input className="h-7 text-xs" placeholder="State" value={editedVendor.address?.state || ''} onChange={(e) => updateEditedVendor('address.state', e.target.value)} />
                      </div>
                      <Input className="h-7 text-xs" placeholder="Pincode" value={editedVendor.address?.pincode || ''} onChange={(e) => updateEditedVendor('address.pincode', e.target.value)} />
                    </div>
                  ) : (
                    <div className="text-xs">
                      <p>{vendor.address?.street}</p>
                      <p className="text-muted-foreground">{vendor.address?.city}, {vendor.address?.state} - {vendor.address?.pincode}</p>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                  <div className="flex items-center gap-1"><Calendar className="h-3 w-3" />Applied: {new Date(vendor.created_at).toLocaleDateString('en-IN')}</div>
                  <div className="flex items-center gap-1"><Calendar className="h-3 w-3" />Updated: {new Date(vendor.updated_at).toLocaleDateString('en-IN')}</div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="business" className="space-y-3">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2"><Building className="h-4 w-4" />Business Details</CardTitle>
                  <SectionApprovalButtons section="business_details" />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  {['gstNumber', 'panNumber', 'aadharNumber', 'businessLicense'].map(key => (
                    <div key={key}>
                      <Label className="text-xs capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</Label>
                      {isEditing ? <Input className="h-7 text-xs" value={(editedVendor.business_details as any)?.[key] || ''} onChange={(e) => updateEditedVendor(`business_details.${key}`, e.target.value)} />
                      : <p className="font-mono text-xs bg-muted p-1.5 rounded">{(vendor.business_details as any)?.[key] || 'Not provided'}</p>}
                    </div>
                  ))}
                </div>
                <div>
                  <Label className="text-xs">Description</Label>
                  {isEditing ? <Textarea className="text-xs min-h-[50px]" value={editedVendor.business_details?.description || ''} onChange={(e) => updateEditedVendor('business_details.description', e.target.value)} />
                  : <p className="text-xs bg-muted p-1.5 rounded">{vendor.business_details?.description || 'No description'}</p>}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bank" className="space-y-3">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2"><CreditCard className="h-4 w-4" />Bank Details</CardTitle>
                  <SectionApprovalButtons section="bank_details" />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { key: 'accountHolderName', label: 'Account Holder' },
                    { key: 'bankName', label: 'Bank Name' },
                    { key: 'accountNumber', label: 'Account Number' },
                    { key: 'ifscCode', label: 'IFSC Code' },
                    { key: 'upiId', label: 'UPI ID' },
                  ].map(({ key, label }) => (
                    <div key={key}>
                      <Label className="text-xs">{label}</Label>
                      {isEditing ? <Input className="h-7 text-xs" value={(editedVendor.bank_details as any)?.[key] || ''} onChange={(e) => updateEditedVendor(`bank_details.${key}`, e.target.value)} />
                      : <p className="font-mono text-xs bg-muted p-1.5 rounded">
                          {key === 'accountNumber' && (vendor.bank_details as any)?.[key]
                            ? `****${(vendor.bank_details as any)[key].slice(-4)}`
                            : (vendor.bank_details as any)?.[key] || 'Not provided'}
                        </p>}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="documents" className="space-y-3">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2"><FileText className="h-4 w-4" />Uploaded Documents</CardTitle>
                  <SectionApprovalButtons section="documents" />
                </div>
              </CardHeader>
              <CardContent>
                {documents.length === 0 ? (
                  <div className="text-center py-6">
                    <FileText className="h-6 w-6 mx-auto text-muted-foreground/40 mb-2" />
                    <p className="text-xs text-muted-foreground">No documents uploaded by this partner</p>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {documents.map((doc) => (
                      <div key={doc.name} className="flex items-center justify-between py-1.5 px-2.5 bg-muted/30 rounded text-xs">
                        <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate flex-1">
                          {doc.name}
                        </a>
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
                <CardTitle className="text-sm flex items-center gap-2"><Home className="h-4 w-4" />Linked Properties</CardTitle>
              </CardHeader>
              <CardContent>
                {properties.length === 0 ? (
                  <div className="text-center py-6">
                    <Building className="h-6 w-6 mx-auto text-muted-foreground/40 mb-2" />
                    <p className="text-xs text-muted-foreground">No properties linked to this partner</p>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {properties.map((p) => (
                      <div key={p.id} className="flex items-center justify-between py-1.5 px-2.5 bg-muted/30 rounded text-xs">
                        <div>
                          <span className="font-medium">{p.name}</span>
                          <Badge variant="outline" className="ml-2 text-[9px]">{p.type}</Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          {p.type === 'Reading Room' && <span className="text-muted-foreground">{p.capacity} seats</span>}
                          <Badge className={p.is_active ? 'bg-emerald-100 text-emerald-700 text-[9px]' : 'bg-red-100 text-red-700 text-[9px]'}>
                            {p.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="actions" className="space-y-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Partner Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {vendor.status === 'pending' && (
                  <>
                    <div className="space-y-3 p-3 border border-green-200 rounded-lg bg-green-50">
                      <h3 className="font-medium text-green-800 text-xs">Approve Partner</h3>
                      <div>
                        <Label className="text-xs">Commission Rate (%)</Label>
                        <Input className="h-7 text-xs" type="number" value={commissionRate} onChange={(e) => setCommissionRate(Number(e.target.value))} min="0" max="50" />
                      </div>
                      <div>
                        <Label className="text-xs">Notes</Label>
                        <Textarea className="text-xs" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes..." />
                      </div>
                      <Button size="sm" className="w-full text-xs bg-green-600 hover:bg-green-700" onClick={handleApprove}>
                        <Check className="h-3 w-3 mr-1" /> Approve
                      </Button>
                    </div>
                    <div className="space-y-3 p-3 border border-red-200 rounded-lg bg-red-50">
                      <h3 className="font-medium text-red-800 text-xs">Reject Partner</h3>
                      <div>
                        <Label className="text-xs">Reason *</Label>
                        <Textarea className="text-xs" value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} placeholder="Reason..." required />
                      </div>
                      <Button variant="destructive" size="sm" className="w-full text-xs" onClick={handleReject} disabled={!rejectionReason.trim()}>
                        <X className="h-3 w-3 mr-1" /> Reject
                      </Button>
                    </div>
                  </>
                )}

                {(vendor.status === 'suspended' || vendor.status === 'rejected') && (
                  <div className="space-y-3 p-3 border border-green-200 rounded-lg bg-green-50">
                    <h3 className="font-medium text-green-800 text-xs">Activate Partner</h3>
                    <p className="text-[10px] text-muted-foreground">This will re-enable the partner and restore bookings on all their properties.</p>
                    <div>
                      <Label className="text-xs">Notes</Label>
                      <Textarea className="text-xs" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes..." />
                    </div>
                    <Button size="sm" className="w-full text-xs bg-green-600 hover:bg-green-700" onClick={handleApprove}>
                      <Power className="h-3 w-3 mr-1" /> Activate
                    </Button>
                  </div>
                )}

                {vendor.status === 'approved' && (
                  <div className="space-y-3 p-3 border border-yellow-200 rounded-lg bg-yellow-50">
                    <h3 className="font-medium text-yellow-800 text-xs">Suspend Partner</h3>
                    <p className="text-[10px] text-muted-foreground">This will disable the partner's login and stop bookings on all their properties.</p>
                    <div>
                      <Label className="text-xs">Notes</Label>
                      <Textarea className="text-xs" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes..." />
                    </div>
                    <Button size="sm" className="w-full text-xs bg-yellow-600 hover:bg-yellow-700" onClick={handleSuspend}>
                      <AlertTriangle className="h-3 w-3 mr-1" /> Suspend
                    </Button>
                  </div>
                )}

                {/* Reset Password — always visible */}
                <div className="space-y-3 p-3 border border-blue-200 rounded-lg bg-blue-50">
                  <h3 className="font-medium text-blue-800 text-xs">Reset Password</h3>
                  <p className="text-[10px] text-muted-foreground">Set a new password for this partner's account.</p>
                  <Button size="sm" variant="outline" className="w-full text-xs" onClick={() => setShowResetPassword(true)}>
                    <KeyRound className="h-3 w-3 mr-1" /> Reset Password
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>

      <AdminResetPasswordDialog
        open={showResetPassword}
        onClose={() => setShowResetPassword(false)}
        userId={vendor.user_id}
        userName={vendor.contact_person}
        userEmail={vendor.email}
      />
    </Dialog>
  );
};
