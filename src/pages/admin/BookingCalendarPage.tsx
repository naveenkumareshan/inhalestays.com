
import React, { useState, useEffect } from 'react';
import { BookingCalendarDashboard } from '@/components/admin/BookingCalendarDashboard';
import { useAuth } from '@/contexts/AuthContext';
import { getEffectiveOwnerId } from '@/utils/getEffectiveOwnerId';

const BookingCalendarPage: React.FC = () => {
  const { user } = useAuth();
  const [partnerUserId, setPartnerUserId] = useState<string | undefined>(undefined);
  const isPartner = user?.role === 'vendor' || user?.role === 'vendor_employee';

  useEffect(() => {
    if (isPartner) {
      getEffectiveOwnerId().then(({ ownerId }) => setPartnerUserId(ownerId));
    }
  }, [isPartner]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight mb-2 text-foreground/90">
            Booking Calendar Dashboard
          </h1>
          <p className="text-muted-foreground max-w-2xl">
            Visual overview of all bookings with date ranges and cabin-based filtering. 
            Each colored bar represents a booking period for different cabins.
          </p>
        </div>
        
        <BookingCalendarDashboard partnerUserId={partnerUserId} />
      </div>
    </div>
  );
};

export default BookingCalendarPage;
