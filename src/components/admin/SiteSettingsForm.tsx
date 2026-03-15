
import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Save, Loader2, Upload, X, Image as ImageIcon, Camera } from 'lucide-react';

import { EnabledMenus } from '@/hooks/useEnabledMenus';

const SETTINGS_KEYS = ['site_name', 'site_description', 'site_logo', 'site_tagline', 'enabled_menus', 'admin_whatsapp'];

export function SiteSettingsForm() {
  const [siteName, setSiteName] = useState('Inhalestays');
  const [siteDescription, setSiteDescription] = useState('Reading Cabin Booking');
  const [siteTagline, setSiteTagline] = useState('Reading Room Booking');
  const [logoUrl, setLogoUrl] = useState('/uploads/d168fbcf-ee4f-4b70-9427-f6a8a480590b.png');
  const [adminWhatsapp, setAdminWhatsapp] = useState('');
  const [enabledMenus, setEnabledMenus] = useState<EnabledMenus>({
    bookings: true, hostel: true, laundry: true, roomSharing: true, about: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
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
            case 'site_tagline': if (v?.value) setSiteTagline(v.value); break;
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

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({ title: 'Invalid file', description: 'Please select an image file.', variant: 'destructive' });
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `site-logo-${Date.now()}.${fileExt}`;
      const filePath = `logos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('cabin-images')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('cabin-images')
        .getPublicUrl(filePath);

      setLogoUrl(urlData.publicUrl);
      toast({ title: 'Uploaded', description: 'Logo uploaded successfully.' });
    } catch (err: any) {
      toast({ title: 'Upload failed', description: err.message, variant: 'destructive' });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSave = async () => {
    setSaving(true);
    const upserts = [
      { key: 'site_name', value: { value: siteName } },
      { key: 'site_description', value: { value: siteDescription } },
      { key: 'site_tagline', value: { value: siteTagline } },
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
              <Label className="text-xs">Tagline</Label>
              <Input
                value={siteTagline}
                onChange={e => setSiteTagline(e.target.value)}
                placeholder="e.g. Reading Room Booking"
                className="h-8 text-xs"
              />
              <p className="text-[11px] text-muted-foreground">Shown on splash screen and app header</p>
            </div>
          </div>

          {/* Logo Upload */}
          <div className="space-y-1.5">
            <Label className="text-xs">Logo</Label>
            <div className="flex items-center gap-3 rounded-md border border-border bg-muted/30 p-3">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt="Logo preview"
                  className="h-14 w-14 object-contain rounded-lg border border-border bg-background"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              ) : (
                <div className="h-14 w-14 rounded-lg border border-dashed border-border flex items-center justify-center bg-background">
                  <ImageIcon className="h-5 w-5 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-[11px] text-muted-foreground truncate mb-1.5">
                  {logoUrl ? logoUrl.split('/').pop() : 'No logo uploaded'}
                </p>
                <div className="flex gap-1.5">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                  <input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-[11px] px-2.5 gap-1"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                    {uploading ? 'Uploading...' : 'Gallery'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-[11px] px-2.5 gap-1"
                    onClick={() => cameraInputRef.current?.click()}
                    disabled={uploading}
                  >
                    <Camera className="h-3 w-3" />
                    Capture
                  </Button>
                  {logoUrl && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 text-[11px] px-2 text-destructive hover:text-destructive"
                      onClick={() => setLogoUrl('')}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>

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
