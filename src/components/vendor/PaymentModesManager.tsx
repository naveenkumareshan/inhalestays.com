
import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Trash2, Building2, Banknote, Smartphone, Link, User, Eye, Camera, ImageIcon, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { v4 as uuidv4 } from 'uuid';

interface PaymentMode {
  id: string;
  label: string;
  mode_type: string;
  is_active: boolean;
  display_order: number;
  linked_bank_id: string | null;
  assigned_employee_id: string | null;
  details_image_url: string | null;
}

interface Employee {
  id: string;
  name: string;
}

const uploadQRImage = async (file: File): Promise<string | null> => {
  try {
    const ext = file.name.split('.').pop();
    const path = `qr/${uuidv4()}.${ext}`;
    const { error } = await supabase.storage.from('payment-proofs').upload(path, file);
    if (error) throw error;
    const { data: { publicUrl } } = supabase.storage.from('payment-proofs').getPublicUrl(path);
    return publicUrl;
  } catch (err) {
    console.error('QR upload error:', err);
    return null;
  }
};

export const PaymentModesManager: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [modes, setModes] = useState<PaymentMode[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [newLabel, setNewLabel] = useState('');
  const [linkedBankId, setLinkedBankId] = useState('');
  const [assignedEmployeeId, setAssignedEmployeeId] = useState('');
  const [addTab, setAddTab] = useState('bank_transfer');
  const [adding, setAdding] = useState(false);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [viewImageUrl, setViewImageUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const captureInputRef = useRef<HTMLInputElement>(null);
  const replaceFileRef = useRef<HTMLInputElement>(null);
  const replaceCaptureRef = useRef<HTMLInputElement>(null);
  const [replacingModeId, setReplacingModeId] = useState<string | null>(null);

  const partnerId = user?.vendorId || user?.id;

  const fetchModes = async () => {
    if (!partnerId) return;
    setLoading(true);
    const { data } = await supabase
      .from('partner_payment_modes')
      .select('*')
      .eq('partner_user_id', partnerId)
      .order('display_order');
    setModes((data as PaymentMode[]) || []);
    setLoading(false);
  };

  const fetchEmployees = async () => {
    if (!partnerId) return;
    const { data } = await supabase
      .from('vendor_employees')
      .select('id, name')
      .eq('partner_user_id', partnerId)
      .eq('status', 'active')
      .order('name');
    setEmployees((data as Employee[]) || []);
  };

  useEffect(() => {
    fetchModes();
    fetchEmployees();
  }, [partnerId]);

  const handleFileUpload = async (file: File, forReplace = false) => {
    setUploading(true);
    const url = await uploadQRImage(file);
    if (url) {
      if (forReplace && replacingModeId) {
        await supabase.from('partner_payment_modes').update({ details_image_url: url }).eq('id', replacingModeId);
        toast({ title: 'Image updated' });
        setReplacingModeId(null);
        fetchModes();
      } else {
        setNewImageUrl(url);
      }
    } else {
      toast({ title: 'Upload failed', variant: 'destructive' });
    }
    setUploading(false);
  };

  const handleAdd = async () => {
    if (!newLabel.trim() || !partnerId) return;
    setAdding(true);
    const insertData: any = {
      partner_user_id: partnerId,
      label: newLabel.trim(),
      mode_type: addTab,
      display_order: modes.length,
    };
    if (addTab === 'upi' && linkedBankId) {
      insertData.linked_bank_id = linkedBankId;
    }
    if (addTab === 'cash' && assignedEmployeeId) {
      insertData.assigned_employee_id = assignedEmployeeId === 'partner' ? null : assignedEmployeeId;
    }
    if ((addTab === 'bank_transfer' || addTab === 'upi') && newImageUrl) {
      insertData.details_image_url = newImageUrl;
    }
    const { error } = await supabase.from('partner_payment_modes').insert(insertData);
    if (error) {
      toast({ title: 'Error adding payment mode', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Payment mode added' });
      setNewLabel('');
      setLinkedBankId('');
      setAssignedEmployeeId('');
      setNewImageUrl('');
      fetchModes();
    }
    setAdding(false);
  };

  const handleToggle = async (id: string, active: boolean) => {
    await supabase.from('partner_payment_modes').update({ is_active: !active }).eq('id', id);
    fetchModes();
  };

  const handleDelete = async (id: string) => {
    await supabase.from('partner_payment_modes').delete().eq('id', id);
    toast({ title: 'Payment mode deleted' });
    fetchModes();
  };

  const bankModes = modes.filter(m => m.mode_type === 'bank_transfer');
  const cashModes = modes.filter(m => m.mode_type === 'cash');
  const upiModes = modes.filter(m => m.mode_type === 'upi');

  const getBankLabel = (bankId: string | null) => {
    if (!bankId) return null;
    return bankModes.find(b => b.id === bankId)?.label || null;
  };

  const getAssigneeName = (empId: string | null) => {
    if (!empId) return 'Partner (Self)';
    return employees.find(e => e.id === empId)?.name || 'Unknown';
  };

  const placeholders: Record<string, string> = {
    cash: 'e.g. Cash - Ravi',
    bank_transfer: 'e.g. ISSM ICICI 303',
    upi: 'e.g. PhonePe ICICI',
  };

  const tabLabels: Record<string, { label: string; icon: React.ReactNode }> = {
    bank_transfer: { label: 'Bank', icon: <Building2 className="h-3 w-3" /> },
    cash: { label: 'Cash', icon: <Banknote className="h-3 w-3" /> },
    upi: { label: 'UPI', icon: <Smartphone className="h-3 w-3" /> },
  };

  const showImageUpload = addTab === 'bank_transfer' || addTab === 'upi';

  const renderModeList = (list: PaymentMode[], emptyMsg: string, showAssignee = false) => {
    if (list.length === 0) return <p className="text-xs text-muted-foreground py-2">{emptyMsg}</p>;
    return (
      <div className="space-y-1.5">
        {list.map(mode => (
          <div key={mode.id} className="flex items-center justify-between border rounded p-2">
            <div className="flex items-center gap-2 min-w-0 flex-wrap">
              <span className="text-xs font-medium truncate">{mode.label}</span>
              {mode.linked_bank_id && (
                <Badge variant="outline" className="text-[9px] h-5 gap-0.5 shrink-0">
                  <Link className="h-2.5 w-2.5" /> {getBankLabel(mode.linked_bank_id)}
                </Badge>
              )}
              {showAssignee && (
                <Badge variant="secondary" className="text-[9px] h-5 gap-0.5 shrink-0">
                  <User className="h-2.5 w-2.5" /> {getAssigneeName(mode.assigned_employee_id)}
                </Badge>
              )}
              {!mode.is_active && <Badge variant="secondary" className="text-[9px] h-5">Inactive</Badge>}
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {(mode.mode_type === 'bank_transfer' || mode.mode_type === 'upi') && (
                <>
                  {mode.details_image_url ? (
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setViewImageUrl(mode.details_image_url)}>
                      <Eye className="h-3.5 w-3.5 text-primary" />
                    </Button>
                  ) : null}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => {
                      setReplacingModeId(mode.id);
                      replaceFileRef.current?.click();
                    }}
                  >
                    <ImageIcon className="h-3 w-3 text-muted-foreground" />
                  </Button>
                </>
              )}
              <Switch
                checked={mode.is_active}
                onCheckedChange={() => handleToggle(mode.id, mode.is_active)}
              />
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(mode.id)}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-4 w-4" /> Payment Modes
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Add bank accounts, cash counters, and UPI labels. These appear during offline receipt collection.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add new - tabbed */}
          <div className="border rounded-lg p-3 space-y-3 bg-muted/30">
            <p className="text-xs font-medium">Add New Payment Mode</p>
            <Tabs value={addTab} onValueChange={v => { setAddTab(v); setNewLabel(''); setLinkedBankId(''); setAssignedEmployeeId(''); setNewImageUrl(''); }}>
              <TabsList className="h-8">
                {Object.entries(tabLabels).map(([key, { label, icon }]) => (
                  <TabsTrigger key={key} value={key} className="text-xs gap-1 h-7">
                    {icon} {label}
                  </TabsTrigger>
                ))}
              </TabsList>

              {Object.keys(tabLabels).map(key => (
                <TabsContent key={key} value={key} className="mt-3">
                  <div className="flex gap-2 items-end flex-wrap">
                    <div className="flex-1 min-w-[160px]">
                      <Label className="text-xs">Label</Label>
                      <Input
                        className="h-8 text-xs"
                        placeholder={placeholders[key]}
                        value={newLabel}
                        onChange={e => setNewLabel(e.target.value)}
                      />
                    </div>
                    {key === 'upi' && (
                      <div className="w-[160px]">
                        <Label className="text-xs">Linked Bank</Label>
                        <Select value={linkedBankId} onValueChange={setLinkedBankId}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select bank" /></SelectTrigger>
                          <SelectContent>
                            {bankModes.filter(b => b.is_active).map(b => (
                              <SelectItem key={b.id} value={b.id} className="text-xs">{b.label}</SelectItem>
                            ))}
                            {bankModes.filter(b => b.is_active).length === 0 && (
                              <div className="px-2 py-1.5 text-xs text-muted-foreground">Add a bank first</div>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    {key === 'cash' && (
                      <div className="w-[160px]">
                        <Label className="text-xs">Assign To</Label>
                        <Select value={assignedEmployeeId} onValueChange={setAssignedEmployeeId}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select person" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="partner" className="text-xs">Partner (Self)</SelectItem>
                            {employees.map(emp => (
                              <SelectItem key={emp.id} value={emp.id} className="text-xs">{emp.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    <Button size="sm" className="h-8" onClick={handleAdd} disabled={adding || !newLabel.trim()}>
                      <Plus className="h-3 w-3 mr-1" /> Add
                    </Button>
                  </div>
                  {/* Optional QR/Bank details image upload for bank_transfer and upi */}
                  {(key === 'bank_transfer' || key === 'upi') && (
                    <div className="mt-2">
                      <Label className="text-[10px] uppercase text-muted-foreground">QR / Bank Details Image (Optional)</Label>
                      {newImageUrl ? (
                        <div className="flex items-center gap-2 mt-1">
                          <img src={newImageUrl} alt="QR" className="h-12 w-12 object-cover rounded border" />
                          <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive" onClick={() => setNewImageUrl('')}>Remove</Button>
                        </div>
                      ) : (
                        <div className="flex gap-2 mt-1">
                          <Button type="button" variant="outline" size="sm" className="h-7 text-[10px] gap-1" disabled={uploading} onClick={() => fileInputRef.current?.click()}>
                            {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <ImageIcon className="h-3 w-3" />} Gallery
                          </Button>
                          <Button type="button" variant="outline" size="sm" className="h-7 text-[10px] gap-1" disabled={uploading} onClick={() => captureInputRef.current?.click()}>
                            {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Camera className="h-3 w-3" />} Capture
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </TabsContent>
              ))}
            </Tabs>
          </div>

          {/* Grouped listing */}
          {loading ? (
            <div className="text-center text-xs text-muted-foreground py-4">Loading...</div>
          ) : (
            <div className="space-y-4">
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <Building2 className="h-3 w-3" /> Bank Accounts
                </h4>
                {renderModeList(bankModes, 'No bank accounts added yet.')}
              </div>
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <Banknote className="h-3 w-3" /> Cash Counters
                </h4>
                {renderModeList(cashModes, 'No cash counters added yet.', true)}
              </div>
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <Smartphone className="h-3 w-3" /> UPI Accounts
                </h4>
                {renderModeList(upiModes, 'No UPI accounts added yet.')}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Hidden file inputs for new mode */}
      <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); e.target.value = ''; }} />
      <input ref={captureInputRef} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); e.target.value = ''; }} />

      {/* Hidden file inputs for replacing existing mode image */}
      <input ref={replaceFileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(f, true); e.target.value = ''; }} />
      <input ref={replaceCaptureRef} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(f, true); e.target.value = ''; }} />

      {/* View Image Dialog */}
      <Dialog open={!!viewImageUrl} onOpenChange={() => setViewImageUrl(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm">Payment Details / QR</DialogTitle>
          </DialogHeader>
          {viewImageUrl && <img src={viewImageUrl} alt="Payment QR / Details" className="w-full rounded" />}
        </DialogContent>
      </Dialog>
    </>
  );
};
