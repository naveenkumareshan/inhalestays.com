import React, { lazy, Suspense } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Building, Hotel, Plus } from 'lucide-react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const RoomManagement = lazy(() => import('@/pages/RoomManagement'));
const HostelManagement = lazy(() => import('@/pages/hotelManager/HostelManagement'));

const ManageProperties: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Building className="h-5 w-5 text-primary" />
          <h1 className="text-base font-semibold">Manage Properties</h1>
        </div>
        <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={() => navigate('/partner/profile')}>
          <Plus className="h-3 w-3" /> Add New Property
        </Button>
      </div>

      <Tabs defaultValue="rooms" className="space-y-3">
        <TabsList className="h-8">
          <TabsTrigger value="rooms" className="text-xs gap-1.5">
            <Building className="h-3.5 w-3.5" />
            Reading Rooms
          </TabsTrigger>
          <TabsTrigger value="hostels" className="text-xs gap-1.5">
            <Hotel className="h-3.5 w-3.5" />
            Hostels
          </TabsTrigger>
        </TabsList>

        <TabsContent value="rooms">
          <Suspense fallback={<div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>}>
            <RoomManagement />
          </Suspense>
        </TabsContent>

        <TabsContent value="hostels">
          <Suspense fallback={<div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>}>
            <HostelManagement />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ManageProperties;
