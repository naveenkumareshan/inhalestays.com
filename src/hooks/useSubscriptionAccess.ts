import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface SubscriptionPlan {
  id: string;
  name: string;
  slug: string;
  display_order: number;
  hostel_bed_limit: number;
  reading_room_seat_limit: number;
  features: string[];
  capacity_upgrade_enabled: boolean;
  capacity_upgrade_price: number;
  capacity_upgrade_slab_beds: number;
  capacity_upgrade_slab_seats: number;
  is_universal: boolean;
}

interface PropertySubscription {
  id: string;
  plan_id: string;
  status: string;
  start_date: string;
  end_date: string;
  capacity_upgrades: number;
  plan?: SubscriptionPlan;
}

export function useSubscriptionAccess(propertyId?: string, propertyType?: 'hostel' | 'reading_room', partnerId?: string) {
  // Check property-specific subscription
  const { data: propertySub, isLoading: propLoading } = useQuery({
    queryKey: ['property-subscription', propertyId],
    queryFn: async () => {
      if (!propertyId) return null;
      
      const { data, error } = await supabase
        .from('property_subscriptions')
        .select('*, subscription_plans(*)')
        .eq('property_id', propertyId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error fetching subscription:', error);
        return null;
      }

      if (!data) return null;

      const plan = (data as any).subscription_plans as SubscriptionPlan | null;
      return {
        ...data,
        plan: plan ? {
          ...plan,
          features: Array.isArray(plan.features) ? plan.features : [],
        } : undefined,
      } as PropertySubscription;
    },
    enabled: !!propertyId,
  });

  // Check universal subscription (fallback)
  const { data: universalSub, isLoading: uniLoading } = useQuery({
    queryKey: ['universal-subscription', partnerId],
    queryFn: async () => {
      if (!partnerId) return null;

      const { data, error } = await supabase
        .from('property_subscriptions')
        .select('*, subscription_plans(*)')
        .eq('partner_id', partnerId)
        .eq('property_type', 'universal')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error fetching universal subscription:', error);
        return null;
      }

      if (!data) return null;

      const plan = (data as any).subscription_plans as SubscriptionPlan | null;
      return {
        ...data,
        plan: plan ? {
          ...plan,
          features: Array.isArray(plan.features) ? plan.features : [],
        } : undefined,
      } as PropertySubscription;
    },
    enabled: !!partnerId && !propertySub,
  });

  const isLoading = propLoading || uniLoading;
  const subscription = propertySub || universalSub || null;
  const currentPlan = subscription?.plan || null;

  const hasFeature = (featureKey: string): boolean => {
    if (!currentPlan) return false;
    return currentPlan.features.includes(featureKey);
  };

  const getCapacityLimit = (): number => {
    if (!currentPlan) return 0;
    const baseLimit = propertyType === 'hostel'
      ? currentPlan.hostel_bed_limit
      : currentPlan.reading_room_seat_limit;
    if (baseLimit === 0) return Infinity; // unlimited
    const slabSize = propertyType === 'hostel'
      ? currentPlan.capacity_upgrade_slab_beds
      : currentPlan.capacity_upgrade_slab_seats;
    return baseLimit + (subscription?.capacity_upgrades || 0) * slabSize;
  };

  const isWithinCapacity = (currentCount: number): boolean => {
    const limit = getCapacityLimit();
    return currentCount < limit;
  };

  const daysRemaining = (): number => {
    if (!subscription?.end_date) return 0;
    const end = new Date(subscription.end_date);
    const now = new Date();
    const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, diff);
  };

  const isExpired = !subscription || subscription.status !== 'active' || daysRemaining() <= 0;
  const needsUpgrade = (currentCount: number) => !isWithinCapacity(currentCount);

  return {
    subscription,
    currentPlan,
    hasFeature,
    isWithinCapacity,
    getCapacityLimit,
    daysRemaining: daysRemaining(),
    isExpired,
    needsUpgrade,
    isLoading,
    hasSubscription: !!subscription && subscription.status === 'active',
  };
}
