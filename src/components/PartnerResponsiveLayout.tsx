import React, { lazy, Suspense } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Loader2 } from 'lucide-react';
import PartnerMobileLayout from './partner/PartnerMobileLayout';

const AdminLayout = lazy(() => import('./AdminLayout'));

const PartnerResponsiveLayout: React.FC = () => {
  const isMobile = useIsMobile();

  if (isMobile) return <PartnerMobileLayout />;

  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>}>
      <AdminLayout />
    </Suspense>
  );
};

export default PartnerResponsiveLayout;
