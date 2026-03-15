import React, { lazy, Suspense, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Building, Hotel, Plus, Shirt, Loader2, UtensilsCrossed, Crown, LayoutGrid, Download } from 'lucide-react';
import { generateBrandedQrPng } from '@/utils/brandedQrGenerator';
import PlansComparisonDialog from '@/components/partner/PlansComparisonDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { usePartnerPropertyTypes } from '@/hooks/usePartnerPropertyTypes';
import { useAuth } from '@/hooks/use-auth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const RoomManagement = lazy(() => import('@/pages/RoomManagement'));
const HostelManagement = lazy(() => import('@/pages/hotelManager/HostelManagement'));
const AdminLaundry = lazy(() => import('@/pages/admin/AdminLaundry'));
const MessManagement = lazy(() => import('@/pages/admin/MessManagement'));

const ManageProperties: React.FC = () => {
  const { hasReadingRooms, hasHostels, hasLaundry, hasMess, loading } = usePartnerPropertyTypes();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [triggerNew, setTriggerNew] = useState(false);
  const [showPlansDialog, setShowPlansDialog] = useState(false);
  const [showQrDialog, setShowQrDialog] = useState(false);
  const [qrPropertyId, setQrPropertyId] = useState('');
  const [qrPropertyType, setQrPropertyType] = useState('');
  const [qrPropertyName, setQrPropertyName] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState('');
  

  // Check for active universal subscription
  const { data: partner } = useQuery({
    queryKey: ['partner-for-universal', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('partners').select('id').eq('user_id', user?.id).single();
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: universalSub } = useQuery({
    queryKey: ['universal-sub-check', partner?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('property_subscriptions')
        .select('id, status')
        .eq('partner_id', partner!.id)
        .eq('property_type', 'universal')
        .eq('status', 'active')
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!partner?.id,
  });

  const hasAny = hasReadingRooms || hasHostels || hasLaundry || hasMess;
  const showAllTabs = !hasAny && !loading;

  const defaultTab = hasReadingRooms ? 'rooms' : hasHostels ? 'hostels' : hasLaundry ? 'laundry' : hasMess ? 'mess' : 'rooms';
  const [activeTab, setActiveTab] = useState(defaultTab);

  React.useEffect(() => {
    if (!loading) {
      setActiveTab(hasReadingRooms ? 'rooms' : hasHostels ? 'hostels' : hasLaundry ? 'laundry' : hasMess ? 'mess' : 'rooms');
    }
  }, [loading, hasReadingRooms, hasHostels, hasLaundry, hasMess]);

  const handleAddProperty = (tab: string) => {
    setShowAddDialog(false);
    setActiveTab(tab);
    setTriggerNew(true);
  };

  const handleTriggerConsumed = () => setTriggerNew(false);


  const handleOpenQr = async (propertyId: string, propertyType: string, propertyName: string) => {
    setQrPropertyId(propertyId);
    setQrPropertyType(propertyType);
    setQrPropertyName(propertyName);
    const url = await generateBrandedQrPng(propertyId, propertyType, propertyName);
    setQrDataUrl(url);
    setShowQrDialog(true);
  };

  const handleDownloadQr = () => {
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `qr-${qrPropertyName.replace(/\s+/g, '-').toLowerCase()}.png`;
    a.click();
  };

  const LoadingFallback = () => (
    <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Building className="h-5 w-5 text-primary" />
          <h1 className="text-base font-semibold">Manage Properties</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={() => setShowPlansDialog(true)}>
            <LayoutGrid className="h-3 w-3" /> View Plans
          </Button>
          <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={() => setShowAddDialog(true)}>
            <Plus className="h-3 w-3" /> Add New Property
          </Button>
        </div>
      </div>


      {!universalSub && (
        <Card className="border-primary/30 bg-gradient-to-r from-primary/5 to-accent/10">
          <CardContent className="p-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Crown className="h-4 w-4 text-primary" />
              <div>
                <p className="text-xs font-semibold">Universal Package</p>
                <p className="text-[10px] text-muted-foreground">One plan for all properties</p>
              </div>
            </div>
            <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1" onClick={() => navigate('/partner/my-subscriptions')}>
              <Crown className="h-3 w-3" /> Subscribe
            </Button>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <LoadingFallback />
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-3">
          <TabsList className="h-8">
            {(showAllTabs || hasReadingRooms || activeTab === 'rooms') && (
              <TabsTrigger value="rooms" className="text-xs gap-1.5">
                <Building className="h-3.5 w-3.5" />
                Reading Rooms
              </TabsTrigger>
            )}
            {(showAllTabs || hasHostels || activeTab === 'hostels') && (
              <TabsTrigger value="hostels" className="text-xs gap-1.5">
                <Hotel className="h-3.5 w-3.5" />
                Hostels
              </TabsTrigger>
            )}
            {(showAllTabs || hasLaundry || activeTab === 'laundry') && (
              <TabsTrigger value="laundry" className="text-xs gap-1.5">
                <Shirt className="h-3.5 w-3.5" />
                Laundry
              </TabsTrigger>
            )}
            {(showAllTabs || hasMess || activeTab === 'mess') && (
              <TabsTrigger value="mess" className="text-xs gap-1.5">
                <UtensilsCrossed className="h-3.5 w-3.5" />
                Mess
              </TabsTrigger>
            )}
          </TabsList>

          {(showAllTabs || hasReadingRooms || activeTab === 'rooms') && (
            <TabsContent value="rooms">
              <Suspense fallback={<LoadingFallback />}>
                <RoomManagement autoCreateNew={activeTab === 'rooms' && triggerNew} onTriggerConsumed={handleTriggerConsumed} onOpenQr={(id, name) => handleOpenQr(id, 'reading_room', name)} />
              </Suspense>
            </TabsContent>
          )}

          {(showAllTabs || hasHostels || activeTab === 'hostels') && (
            <TabsContent value="hostels">
              <Suspense fallback={<LoadingFallback />}>
                <HostelManagement autoCreateNew={activeTab === 'hostels' && triggerNew} onTriggerConsumed={handleTriggerConsumed} onOpenQr={(id, name) => handleOpenQr(id, 'hostel', name)} />
              </Suspense>
            </TabsContent>
          )}

          {(showAllTabs || hasLaundry || activeTab === 'laundry') && (
            <TabsContent value="laundry">
              <Suspense fallback={<LoadingFallback />}>
                <AdminLaundry autoCreateNew={activeTab === 'laundry' && triggerNew} onTriggerConsumed={handleTriggerConsumed} />
              </Suspense>
            </TabsContent>
          )}

          {(showAllTabs || hasMess || activeTab === 'mess') && (
            <TabsContent value="mess">
              <Suspense fallback={<LoadingFallback />}>
                <MessManagement autoCreateNew={activeTab === 'mess' && triggerNew} onTriggerConsumed={handleTriggerConsumed} onOpenQr={(id, name) => handleOpenQr(id, 'mess', name)} />
              </Suspense>
            </TabsContent>
          )}
        </Tabs>
      )}

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm">Select Property Type</DialogTitle>
          </DialogHeader>
          <div className="grid gap-2">
            <Button
              variant="outline"
              className="justify-start gap-2 h-12"
              onClick={() => handleAddProperty('rooms')}
            >
              <Building className="h-4 w-4 text-primary" />
              <div className="text-left">
                <div className="text-sm font-medium">Reading Room</div>
                <div className="text-xs text-muted-foreground">Add a new reading room / library</div>
              </div>
            </Button>
            <Button
              variant="outline"
              className="justify-start gap-2 h-12"
              onClick={() => handleAddProperty('hostels')}
            >
              <Hotel className="h-4 w-4 text-primary" />
              <div className="text-left">
                <div className="text-sm font-medium">Hostel</div>
                <div className="text-xs text-muted-foreground">Add a new hostel / PG</div>
              </div>
            </Button>
            <Button
              variant="outline"
              className="justify-start gap-2 h-12"
              onClick={() => handleAddProperty('laundry')}
            >
              <Shirt className="h-4 w-4 text-primary" />
              <div className="text-left">
                <div className="text-sm font-medium">Laundry</div>
                <div className="text-xs text-muted-foreground">Add a new laundry service</div>
              </div>
            </Button>
            <Button
              variant="outline"
              className="justify-start gap-2 h-12"
              onClick={() => handleAddProperty('mess')}
            >
              <UtensilsCrossed className="h-4 w-4 text-primary" />
              <div className="text-left">
                <div className="text-sm font-medium">Mess</div>
                <div className="text-xs text-muted-foreground">Add a new mess / food service</div>
              </div>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <PlansComparisonDialog open={showPlansDialog} onOpenChange={setShowPlansDialog} />

      {/* QR Code Dialog */}
      <Dialog open={showQrDialog} onOpenChange={setShowQrDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm">Property QR Code</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4">
            {qrDataUrl && <img src={qrDataUrl} alt="QR Code" className="w-full max-w-[320px] h-auto rounded-lg" />}
            <Button size="sm" className="w-full gap-1.5" onClick={handleDownloadQr}>
              <Download className="h-3.5 w-3.5" /> Download QR Code
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ManageProperties;
