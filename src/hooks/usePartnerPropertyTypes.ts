import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface PartnerPropertyTypes {
  hasReadingRooms: boolean;
  hasHostels: boolean;
  hasLaundry: boolean;
  hasMess: boolean;
  loading: boolean;
}

export function usePartnerPropertyTypes(): PartnerPropertyTypes {
  const { user } = useAuth();
  const isPartner = user?.role === 'vendor' || user?.role === 'vendor_employee';
  const userId = isPartner
    ? (user?.role === 'vendor_employee' && user?.vendorId ? user.vendorId : user?.id)
    : undefined;

  const { data, isLoading } = useQuery({
    queryKey: ['partner-property-types', userId],
    queryFn: async () => {
      const [cabinsRes, hostelsRes, laundryRes, messRes] = await Promise.all([
        supabase.from('cabins').select('id').eq('created_by', userId!).limit(1),
        supabase.from('hostels').select('id').eq('created_by', userId!).limit(1),
        supabase.from('laundry_partners').select('id').eq('user_id', userId!).limit(1),
        supabase.from('mess_partners' as any).select('id').eq('user_id', userId!).limit(1),
      ]);
      return {
        hasReadingRooms: (cabinsRes.data?.length ?? 0) > 0,
        hasHostels: (hostelsRes.data?.length ?? 0) > 0,
        hasLaundry: (laundryRes.data?.length ?? 0) > 0,
        hasMess: (messRes.data?.length ?? 0) > 0,
      };
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });

  return {
    hasReadingRooms: data?.hasReadingRooms ?? false,
    hasHostels: data?.hasHostels ?? false,
    hasLaundry: data?.hasLaundry ?? false,
    hasMess: data?.hasMess ?? false,
    loading: isLoading,
  };
}
