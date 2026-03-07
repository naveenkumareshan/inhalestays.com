import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { MessageCircle, Save, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { getEffectiveOwnerId } from '@/utils/getEffectiveOwnerId';

export const WhatsAppSettings: React.FC = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [whatsappEnabled, setWhatsappEnabled] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        let ownerId: string;
        try {
          const r = await getEffectiveOwnerId();
          ownerId = r.ownerId;
        } catch {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;
          ownerId = user.id;
        }
        const { data } = await supabase
          .from('partners')
          .select('whatsapp_number, whatsapp_enabled')
          .eq('user_id', ownerId)
          .maybeSingle();
        if (data) {
          setWhatsappNumber((data as any).whatsapp_number || '');
          setWhatsappEnabled((data as any).whatsapp_enabled || false);
        }
      } catch {}
      setLoading(false);
    })();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      let ownerId: string;
      try {
        const r = await getEffectiveOwnerId();
        ownerId = r.ownerId;
      } catch {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');
        ownerId = user.id;
      }
      const { error } = await supabase
        .from('partners')
        .update({ whatsapp_number: whatsappNumber || null, whatsapp_enabled: whatsappEnabled } as any)
        .eq('user_id', ownerId);
      if (error) throw error;
      toast({ title: 'Saved', description: 'WhatsApp settings updated.' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to save', variant: 'destructive' });
    }
    setSaving(false);
  };

  if (loading) return <Card><CardContent className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></CardContent></Card>;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <MessageCircle className="h-4 w-4" style={{ color: '#25D366' }} />
          WhatsApp Chat
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Enable WhatsApp chat so students can contact you directly from your property pages.
        </p>
        <div className="flex items-center justify-between">
          <Label htmlFor="wa-toggle" className="text-xs">Enable WhatsApp Button</Label>
          <Switch id="wa-toggle" checked={whatsappEnabled} onCheckedChange={setWhatsappEnabled} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="wa-number" className="text-xs">WhatsApp Number (with country code)</Label>
          <Input
            id="wa-number"
            className="h-8 text-xs"
            placeholder="e.g. 919876543210"
            value={whatsappNumber}
            onChange={(e) => setWhatsappNumber(e.target.value)}
          />
          <p className="text-[10px] text-muted-foreground">Include country code without + sign, e.g. 919876543210</p>
        </div>
        <Button size="sm" className="h-7 text-xs gap-1" onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
          Save
        </Button>
      </CardContent>
    </Card>
  );
};
