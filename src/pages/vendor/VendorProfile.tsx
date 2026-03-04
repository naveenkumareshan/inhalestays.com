import React from 'react';
import { VendorProfile } from '@/components/vendor/VendorProfile';
import { PaymentModesManager } from '@/components/vendor/PaymentModesManager';

const VendorProfilePage: React.FC = () => {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Profile</h1>
        <p className="text-muted-foreground mt-2">
          Manage your business information and account details
        </p>
      </div>
      
      <VendorProfile />
      <PaymentModesManager />
    </div>
  );
};

export default VendorProfilePage;