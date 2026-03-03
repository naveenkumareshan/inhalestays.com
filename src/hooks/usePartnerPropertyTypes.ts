import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface PartnerPropertyTypes {
  hasReadingRooms: boolean;
  hasHostels: boolean;
  hasLaundry: boolean;
  loading: boolean;
}

export function usePartnerPropertyTypes(): PartnerPropertyTypes {
  const { user } = useAuth();
  const [state, setState] = useState<PartnerPropertyTypes>({
    hasReadingRooms: false,
    hasHostels: false,
    hasLaundry: false,
    loading: true,
  });

  const isPartner = user?.role === 'vendor' || user?.role === 'vendor_employee';

  useEffect(() => {
    if (!isPartner || !user?.id) {
      setState(prev => ({ ...prev, loading: false }));
      return;
    }

    const fetchPropertyTypes = async () => {
      const userId = user.id;

      const [cabinsRes, hostelsRes, laundryRes] = await Promise.all([
        supabase.from('cabins').select('id').eq('created_by', userId).limit(1),
        supabase.from('hostels').select('id').eq('created_by', userId).limit(1),
        supabase.from('laundry_partners').select('id').eq('user_id', userId).limit(1),
      ]);

      setState({
        hasReadingRooms: (cabinsRes.data?.length ?? 0) > 0,
        hasHostels: (hostelsRes.data?.length ?? 0) > 0,
        hasLaundry: (laundryRes.data?.length ?? 0) > 0,
        loading: false,
      });
    };

    fetchPropertyTypes();
  }, [user?.id, isPartner]);

  return state;
}
