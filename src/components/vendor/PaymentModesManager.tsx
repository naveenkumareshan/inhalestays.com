
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Plus, Trash2, Building2, Banknote, Smartphone, Link } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface PaymentMode {
  id: string;
  label: string;
  mode_type: string;
  is_active: boolean;
  display_order: number;
  linked_bank_id: string | null;
}

export const PaymentModesManager: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [modes, setModes] = useState<PaymentMode[]>([]);
  const [loading, setLoading] = useState(true);
  const [newLabel, setNewLabel] = useState('');
  const [linkedBankId, setLinkedBankId] = useState('');
  const [addTab, setAddTab] = useState('bank_transfer');
  const [adding, setAdding] = useState(false);

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

  useEffect(() => { fetchModes(); }, [partnerId]);

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
    const { error } = await supabase.from('partner_payment_modes').insert(insertData);
    if (error) {
      toast({ title: 'Error adding payment mode', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Payment mode added' });
      setNewLabel('');
      setLinkedBankId('');
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

  const renderModeList = (list: PaymentMode[], emptyMsg: string) => {
    if (list.length === 0) return <p className="text-xs text-muted-foreground py-2">{emptyMsg}</p>;
    return (
      <div className="space-y-1.5">
        {list.map(mode => (
          <div key={mode.id} className="flex items-center justify-between border rounded p-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xs font-medium truncate">{mode.label}</span>
              {mode.linked_bank_id && (
                <Badge variant="outline" className="text-[9px] h-5 gap-0.5 shrink-0">
                  <Link className="h-2.5 w-2.5" /> {getBankLabel(mode.linked_bank_id)}
                </Badge>
              )}
              {!mode.is_active && <Badge variant="secondary" className="text-[9px] h-5">Inactive</Badge>}
            </div>
            <div className="flex items-center gap-2 shrink-0">
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
          <Tabs value={addTab} onValueChange={v => { setAddTab(v); setNewLabel(''); setLinkedBankId(''); }}>
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
                  <Button size="sm" className="h-8" onClick={handleAdd} disabled={adding || !newLabel.trim()}>
                    <Plus className="h-3 w-3 mr-1" /> Add
                  </Button>
                </div>
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
              {renderModeList(cashModes, 'No cash counters added yet.')}
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
  );
};
