import React, { lazy, Suspense, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Building, Hotel, Plus, Shirt } from 'lucide-react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePartnerPropertyTypes } from '@/hooks/usePartnerPropertyTypes';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const RoomManagement = lazy(() => import('@/pages/RoomManagement'));
const HostelManagement = lazy(() => import('@/pages/hotelManager/HostelManagement'));
const LaundryPartnerDashboard = lazy(() => import('@/pages/LaundryPartnerDashboard'));

const ManageProperties: React.FC = () => {
  const { hasReadingRooms, hasHostels, hasLaundry, loading } = usePartnerPropertyTypes();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [triggerNew, setTriggerNew] = useState(false);

  const hasAny = hasReadingRooms || hasHostels || hasLaundry;
  const showAllTabs = !hasAny && !loading;

  const defaultTab = hasReadingRooms ? 'rooms' : hasHostels ? 'hostels' : hasLaundry ? 'laundry' : 'rooms';
  const [activeTab, setActiveTab] = useState(defaultTab);

  // Update activeTab when loading finishes and defaultTab changes
  React.useEffect(() => {
    if (!loading) {
      setActiveTab(hasReadingRooms ? 'rooms' : hasHostels ? 'hostels' : hasLaundry ? 'laundry' : 'rooms');
    }
  }, [loading, hasReadingRooms, hasHostels, hasLaundry]);

  const handleAddProperty = (tab: string) => {
    setShowAddDialog(false);
    setActiveTab(tab);
    setTriggerNew(true);
  };

  // Reset triggerNew after it's been consumed
  const handleTriggerConsumed = () => setTriggerNew(false);

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
        <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={() => setShowAddDialog(true)}>
          <Plus className="h-3 w-3" /> Add New Property
        </Button>
      </div>

      {loading ? (
        <LoadingFallback />
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-3">
          <TabsList className="h-8">
            {(showAllTabs || hasReadingRooms) && (
              <TabsTrigger value="rooms" className="text-xs gap-1.5">
                <Building className="h-3.5 w-3.5" />
                Reading Rooms
              </TabsTrigger>
            )}
            {(showAllTabs || hasHostels) && (
              <TabsTrigger value="hostels" className="text-xs gap-1.5">
                <Hotel className="h-3.5 w-3.5" />
                Hostels
              </TabsTrigger>
            )}
            {(showAllTabs || hasLaundry) && (
              <TabsTrigger value="laundry" className="text-xs gap-1.5">
                <Shirt className="h-3.5 w-3.5" />
                Laundry
              </TabsTrigger>
            )}
          </TabsList>

          {(showAllTabs || hasReadingRooms) && (
            <TabsContent value="rooms">
              <Suspense fallback={<LoadingFallback />}>
                <RoomManagement autoCreateNew={activeTab === 'rooms' && triggerNew} onTriggerConsumed={handleTriggerConsumed} />
              </Suspense>
            </TabsContent>
          )}

          {(showAllTabs || hasHostels) && (
            <TabsContent value="hostels">
              <Suspense fallback={<LoadingFallback />}>
                <HostelManagement autoCreateNew={activeTab === 'hostels' && triggerNew} onTriggerConsumed={handleTriggerConsumed} />
              </Suspense>
            </TabsContent>
          )}

          {(showAllTabs || hasLaundry) && (
            <TabsContent value="laundry">
              <Suspense fallback={<LoadingFallback />}>
                <LaundryPartnerDashboard />
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
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ManageProperties;
