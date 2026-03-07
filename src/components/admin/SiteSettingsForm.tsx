
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Save, Loader2, Image as ImageIcon } from 'lucide-react';

interface EnabledMenus {
  bookings: boolean;
  hostel: boolean;
  laundry: boolean;
  roomSharing: boolean;
  about: boolean;
}

const SETTINGS_KEYS = ['site_name', 'site_description', 'site_logo', 'enabled_menus', 'admin_whatsapp'];

export function SiteSettingsForm() {
  const [siteName, setSiteName] = useState('Inhalestays');
  const [siteDescription, setSiteDescription] = useState('Reading Cabin Booking');
  const [logoUrl, setLogoUrl] = useState('/uploads/d168fbcf-ee4f-4b70-9427-f6a8a480590b.png');
  const [adminWhatsapp, setAdminWhatsapp] = useState('');
  const [enabledMenus, setEnabledMenus] = useState<EnabledMenus>({
    bookings: true, hostel: true, laundry: true, roomSharing: true, about: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('site_settings')
        .select('key, value')
        .in('key', SETTINGS_KEYS);
      if (data) {
        for (const row of data) {
          const v = row.value as any;
          switch (row.key) {
            case 'site_name': if (v?.value) setSiteName(v.value); break;
            case 'site_description': if (v?.value) setSiteDescription(v.value); break;
            case 'site_logo': if (v?.url) setLogoUrl(v.url); break;
            case 'admin_whatsapp': if (v?.number) setAdminWhatsapp(v.number); break;
            case 'enabled_menus':
              if (v && typeof v === 'object') {
                setEnabledMenus(prev => ({ ...prev, ...v }));
              }
              break;
          }
        }
      }
      setLoading(false);
    })();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const upserts = [
      { key: 'site_name', value: { value: siteName } },
      { key: 'site_description', value: { value: siteDescription } },
      { key: 'site_logo', value: { url: logoUrl } },
      { key: 'enabled_menus', value: enabledMenus },
      { key: 'admin_whatsapp', value: { number: adminWhatsapp.trim() } },
    ];

    const { error } = await supabase
      .from('site_settings')
      .upsert(upserts as any, { onConflict: 'key' });

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      // Clear sessionStorage cache so Navigation picks up new values
      sessionStorage.removeItem('site_settings_cache');
      toast({ title: 'Saved', description: 'Site settings updated successfully.' });
    }
    setSaving(false);
  };

  const toggleMenu = (key: keyof EnabledMenus) => {
    setEnabledMenus(prev => ({ ...prev, [key]: !prev[key] }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const menuItems: { key: keyof EnabledMenus; label: string; desc: string }[] = [
    { key: 'bookings', label: 'Cabin Booking', desc: 'Reading rooms / cabin bookings menu' },
    { key: 'hostel', label: 'Hostels', desc: 'Hostel listings and booking menu' },
    { key: 'laundry', label: 'Laundry', desc: 'Laundry service menu' },
    { key: 'roomSharing', label: 'Room Sharing', desc: 'Room sharing listings' },
    { key: 'about', label: 'About', desc: 'About page in navigation' },
  ];

  return (
    <div className="space-y-4">
      {/* Branding */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Branding</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Site Name</Label>
              <Input
                value={siteName}
                onChange={e => setSiteName(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Logo URL</Label>
              <Input
                value={logoUrl}
                onChange={e => setLogoUrl(e.target.value)}
                placeholder="https://example.com/logo.png"
                className="h-8 text-xs"
              />
            </div>
          </div>
          {logoUrl && (
            <div className="flex items-center gap-3 rounded-md border border-border bg-muted/30 p-3">
              <ImageIcon className="h-4 w-4 text-muted-foreground shrink-0" />
              <img
                src={logoUrl}
                alt="Logo preview"
                className="h-10 w-auto max-w-[160px] object-contain"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
              <span className="text-[11px] text-muted-foreground truncate">{logoUrl}</span>
            </div>
          )}
          <div className="space-y-1.5">
            <Label className="text-xs">Site Description</Label>
            <Textarea
              value={siteDescription}
              onChange={e => setSiteDescription(e.target.value)}
              className="text-xs min-h-[60px] resize-none"
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* Navigation Toggles */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Navigation Menu</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="divide-y divide-border">
            {menuItems.map(item => (
              <div key={item.key} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
                <div>
                  <p className="text-xs font-medium">{item.label}</p>
                  <p className="text-[11px] text-muted-foreground">{item.desc}</p>
                </div>
                <Switch
                  checked={enabledMenus[item.key]}
                  onCheckedChange={() => toggleMenu(item.key)}
                  className="scale-90"
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Support */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Support</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1.5">
          <Label className="text-xs">Admin Support WhatsApp Number</Label>
          <Input
            value={adminWhatsapp}
            onChange={e => setAdminWhatsapp(e.target.value)}
            placeholder="e.g. 919876543210"
            className="h-8 text-xs max-w-xs"
          />
          <p className="text-[11px] text-muted-foreground">
            Students can contact you via WhatsApp from support tickets. Enter with country code (no + symbol).
          </p>
        </CardContent>
      </Card>

      {/* Save */}
      <div className="flex justify-end pt-1">
        <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1.5 text-xs h-8">
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          Save Settings
        </Button>
      </div>
    </div>
  );
}
