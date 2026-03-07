
import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SiteSettingsForm } from '@/components/admin/SiteSettingsForm';
import { PaymentGatewaySettings } from '@/components/admin/settings/PaymentGatewaySettings';
import { EmailSettings } from '@/components/admin/settings/EmailSettings';
import { SmsSettings } from '@/components/admin/settings/SmsSettings';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Save, Loader2, Settings } from 'lucide-react';

function PartnerTrialDaysConfig() {
  const { toast } = useToast();
  const [days, setDays] = useState<number>(7);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('platform_config')
        .select('value')
        .eq('key', 'partner_trial_days')
        .maybeSingle();
      if (data?.value && typeof data.value === 'object' && 'days' in (data.value as any)) {
        setDays((data.value as any).days);
      }
      setLoading(false);
    })();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('platform_config')
      .upsert({ key: 'partner_trial_days', value: { days }, updated_at: new Date().toISOString() } as any);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Saved', description: 'Partner trial days updated.' });
    }
    setSaving(false);
  };

  if (loading) return <div className="flex justify-center py-4"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">Partner Free Trial</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <Label className="text-xs">Free Trial Days for New Partners</Label>
        <p className="text-[11px] text-muted-foreground">Number of days a new partner can add properties without a subscription.</p>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            min={0}
            max={365}
            value={days}
            onChange={(e) => setDays(parseInt(e.target.value) || 0)}
            className="w-20 h-8 text-xs"
          />
          <span className="text-xs text-muted-foreground">days</span>
          <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1 h-7 text-[11px] px-2.5">
            {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
            Save
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminSettingsNew() {
  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <div className="flex items-center gap-2 mb-4">
        <Settings className="h-4 w-4 text-muted-foreground" />
        <div>
          <h1 className="text-base font-semibold leading-tight">System Configuration</h1>
          <p className="text-[11px] text-muted-foreground">Manage site settings, integrations and platform config</p>
        </div>
      </div>
      
      <Tabs defaultValue="site" className="w-full">
        <TabsList className="h-8 w-full grid grid-cols-5 gap-0.5">
          <TabsTrigger value="site" className="text-[11px] h-7 px-2">Site Settings</TabsTrigger>
          <TabsTrigger value="payment" className="text-[11px] h-7 px-2">Payment</TabsTrigger>
          <TabsTrigger value="email" className="text-[11px] h-7 px-2">Email</TabsTrigger>
          <TabsTrigger value="sms" className="text-[11px] h-7 px-2">SMS</TabsTrigger>
          <TabsTrigger value="platform" className="text-[11px] h-7 px-2">Platform</TabsTrigger>
        </TabsList>
        
        <TabsContent value="site" className="mt-4">
          <SiteSettingsForm />
        </TabsContent>
        
        <TabsContent value="payment" className="mt-4">
          <PaymentGatewaySettings />
        </TabsContent>
        
        <TabsContent value="email" className="mt-4">
          <EmailSettings />
        </TabsContent>
        
        <TabsContent value="sms" className="mt-4">
          <SmsSettings />
        </TabsContent>

        <TabsContent value="platform" className="mt-4">
          <div className="space-y-4">
            <PartnerTrialDaysConfig />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
