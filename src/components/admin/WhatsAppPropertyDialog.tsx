import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Save, MousePointerClick } from 'lucide-react';

interface WhatsAppPropertyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyId: string;
  propertyType: 'cabin' | 'hostel' | 'mess';
  propertyName: string;
  initialNumber: string;
  initialEnabled: boolean;
  onSaved?: () => void;
}

export const WhatsAppPropertyDialog: React.FC<WhatsAppPropertyDialogProps> = ({
  open,
  onOpenChange,
  propertyId,
  propertyType,
  propertyName,
  initialNumber,
  initialEnabled,
  onSaved,
}) => {
  const { toast } = useToast();
  const [number, setNumber] = useState(initialNumber);
  const [enabled, setEnabled] = useState(initialEnabled);
  const [saving, setSaving] = useState(false);
  const [loadingState, setLoadingState] = useState(false);

  const table = propertyType === 'cabin' ? 'cabins' : propertyType === 'hostel' ? 'hostels' : 'mess_partners';

  // Fetch fresh data from DB when dialog opens
  useEffect(() => {
    if (!open) return;
    const fetchCurrent = async () => {
      setLoadingState(true);
      try {
        const { data } = await supabase
          .from(table)
          .select('whatsapp_number, whatsapp_chat_enabled')
          .eq('id', propertyId)
          .maybeSingle();
        if (data) {
          setNumber((data as any).whatsapp_number || '');
          setEnabled((data as any).whatsapp_chat_enabled || false);
        }
      } catch {
        // fallback to props
        setNumber(initialNumber);
        setEnabled(initialEnabled);
      }
      setLoadingState(false);
    };
    fetchCurrent();
  }, [open, propertyId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from(table)
        .update({ whatsapp_number: number || null, whatsapp_chat_enabled: enabled } as any)
        .eq('id', propertyId);
      if (error) throw error;
      toast({ title: 'Saved', description: `WhatsApp settings updated for ${propertyName}.` });
      onSaved?.();
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to save', variant: 'destructive' });
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-sm">WhatsApp Chat — {propertyName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 pt-1">
          <div className="flex items-center justify-between">
            <Label htmlFor="wa-prop-toggle" className="text-xs">Enable WhatsApp Button</Label>
            <Switch id="wa-prop-toggle" checked={enabled} onCheckedChange={setEnabled} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="wa-prop-number" className="text-xs">WhatsApp Number (with country code)</Label>
            <Input
              id="wa-prop-number"
              className="h-8 text-xs"
              placeholder="e.g. 919876543210"
              value={number}
              onChange={(e) => setNumber(e.target.value)}
            />
            <p className="text-[10px] text-muted-foreground">Include country code without + sign</p>
          </div>
          <Button size="sm" className="h-7 text-xs gap-1 w-full" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
            Save
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
