
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

interface SiteSettings {
  siteName: string;
  siteDescription: string;
  logoUrl: string;
  enabledMenus: {
    bookings: boolean;
    hostel: boolean;
    laundry: boolean;
    roomSharing: boolean;
    about: boolean;
  };
}

export function SiteSettingsForm() {
  const [settings, setSettings] = useState<SiteSettings>({
    siteName: 'Inhalestays',
    siteDescription: 'Reading Cabin Booking',
    logoUrl: '/uploads/d168fbcf-ee4f-4b70-9427-f6a8a480590b.png',
    enabledMenus: {
      bookings: true,
      hostel: true,
      laundry: true,
      roomSharing: true,
      about: true,
    }
  });
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const savedSettings = localStorage.getItem('siteSettings');
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }
  }, []);

  const handleMenuToggle = (menu: keyof SiteSettings['enabledMenus']) => {
    setSettings(prev => ({
      ...prev,
      enabledMenus: {
        ...prev.enabledMenus,
        [menu]: !prev.enabledMenus[menu]
      }
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Save to localStorage for demo purposes
    localStorage.setItem('siteSettings', JSON.stringify(settings));
    
    // In a real app, you would call an API endpoint:
    // await adminService.updateSiteSettings(settings);
    
    setTimeout(() => {
      setIsLoading(false);
      toast({
        title: "Settings saved",
        description: "Your site settings have been updated."
      });
    }, 1000);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Site Settings</CardTitle>
        <CardDescription>
          Configure your website appearance and menu options.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-6">
            <div className="grid gap-3">
              <Label htmlFor="siteName">Site Name</Label>
              <Input
                id="siteName"
                value={settings.siteName}
                onChange={(e) => setSettings({...settings, siteName: e.target.value})}
              />
            </div>
            
            <div className="grid gap-3">
              <Label htmlFor="siteDescription">Site Description</Label>
              <Textarea
                id="siteDescription"
                value={settings.siteDescription}
                onChange={(e) => setSettings({...settings, siteDescription: e.target.value})}
              />
            </div>
            
            <div className="grid gap-3">
              <Label htmlFor="logoUrl">Logo URL</Label>
              <Input
                id="logoUrl"
                value={settings.logoUrl}
                onChange={(e) => setSettings({...settings, logoUrl: e.target.value})}
                placeholder="https://example.com/logo.png"
              />
              <p className="text-sm text-muted-foreground">
                Enter the URL of your logo image. For best results, use a PNG or SVG file.
              </p>
            </div>
            
            <div className="grid gap-3">
              <Label className="mb-2">Enabled Menu Items</Label>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="bookings-toggle">Cabing Booking</Label>
                    <p className="text-sm text-muted-foreground">
                      Show bookings menu in navigation
                    </p>
                  </div>
                  <Switch
                    id="bookings-toggle"
                    checked={settings.enabledMenus.bookings}
                    onCheckedChange={() => handleMenuToggle('bookings')}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="hostel-toggle">Hostels</Label>
                    <p className="text-sm text-muted-foreground">
                      Show hostels menu in navigation
                    </p>
                  </div>
                  <Switch
                    id="hostel-toggle"
                    checked={settings.enabledMenus.hostel}
                    onCheckedChange={() => handleMenuToggle('hostel')}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="laundry-toggle">Laundry</Label>
                    <p className="text-sm text-muted-foreground">
                      Show laundry menu in navigation
                    </p>
                  </div>
                  <Switch
                    id="laundry-toggle"
                    checked={settings.enabledMenus.laundry}
                    onCheckedChange={() => handleMenuToggle('laundry')}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="about-toggle">About</Label>
                    <p className="text-sm text-muted-foreground">
                      Show about menu in navigation
                    </p>
                  </div>
                  <Switch
                    id="about-toggle"
                    checked={settings.enabledMenus.about}
                    onCheckedChange={() => handleMenuToggle('about')}
                  />
                </div>
              </div>
            </div>

            {/* WhatsApp Chat Info */}
            <div className="grid gap-3">
              <Label className="mb-2">WhatsApp Chat for Partners</Label>
              <p className="text-sm text-muted-foreground">
                WhatsApp chat is now managed per-property from the Partner Management page.
              </p>
            </div>
          </div>
          
          <CardFooter className="pt-6 px-0">
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Saving..." : "Save Settings"}
            </Button>
          </CardFooter>
        </form>
      </CardContent>
    </Card>
  );
}
