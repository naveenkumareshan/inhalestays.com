
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2, Building2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface PaymentMode {
  id: string;
  label: string;
  mode_type: string;
  is_active: boolean;
  display_order: number;
}

export const PaymentModesManager: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [modes, setModes] = useState<PaymentMode[]>([]);
  const [loading, setLoading] = useState(true);
  const [newLabel, setNewLabel] = useState('');
  const [newType, setNewType] = useState('bank_transfer');
  const [adding, setAdding] = useState(false);

  const fetchModes = async () => {
    if (!user?.id) return;
    setLoading(true);
    const { data } = await supabase
      .from('partner_payment_modes')
      .select('*')
      .eq('partner_user_id', user.vendorId || user.id)
      .order('display_order');
    setModes((data as PaymentMode[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchModes(); }, [user?.id]);

  const handleAdd = async () => {
    if (!newLabel.trim() || !user?.id) return;
    setAdding(true);
    const { error } = await supabase.from('partner_payment_modes').insert({
      partner_user_id: user.vendorId || user.id,
      label: newLabel.trim(),
      mode_type: newType,
      display_order: modes.length,
    });
    if (error) {
      toast({ title: 'Error adding payment mode', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Payment mode added' });
      setNewLabel('');
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

  const typeLabels: Record<string, string> = {
    cash: 'Cash', upi: 'UPI', bank_transfer: 'Bank Transfer', online: 'Online',
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Building2 className="h-4 w-4" /> Custom Payment Modes
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Add your bank accounts or payment labels. These will appear during offline receipt collection.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add new */}
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <Label className="text-xs">Label</Label>
            <Input
              className="h-8 text-xs"
              placeholder="e.g. ICICI Bank 303"
              value={newLabel}
              onChange={e => setNewLabel(e.target.value)}
            />
          </div>
          <div className="w-[130px]">
            <Label className="text-xs">Type</Label>
            <Select value={newType} onValueChange={setNewType}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                <SelectItem value="upi">UPI</SelectItem>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="online">Online</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button size="sm" className="h-8" onClick={handleAdd} disabled={adding || !newLabel.trim()}>
            <Plus className="h-3 w-3 mr-1" /> Add
          </Button>
        </div>

        {/* List */}
        {loading ? (
          <div className="text-center text-xs text-muted-foreground py-4">Loading...</div>
        ) : modes.length === 0 ? (
          <div className="text-center text-xs text-muted-foreground py-4">
            No custom payment modes yet. Add one above.
          </div>
        ) : (
          <div className="space-y-2">
            {modes.map(mode => (
              <div key={mode.id} className="flex items-center justify-between border rounded p-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium">{mode.label}</span>
                  <Badge variant="outline" className="text-[9px] h-5">{typeLabels[mode.mode_type] || mode.mode_type}</Badge>
                </div>
                <div className="flex items-center gap-2">
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
        )}
      </CardContent>
    </Card>
  );
};
