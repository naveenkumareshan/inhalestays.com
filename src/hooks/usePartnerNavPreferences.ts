import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export interface NavItem {
  key: string;
  label: string;
  url: string;
  icon: string;
  category?: 'general' | 'reading_rooms' | 'hostels' | 'laundry' | 'mess' | 'vendor_only';
  permission?: string;
}

export const DEFAULT_NAV_ITEMS: NavItem[] = [
  { key: 'dashboard', label: 'Dashboard', url: '/partner/dashboard', icon: 'LayoutDashboard' },
  { key: 'bookings', label: 'Bookings', url: '/partner/bookings', icon: 'BookOpen' },
  { key: 'properties', label: 'Properties', url: '/partner/manage-properties', icon: 'Building2' },
  { key: 'earnings', label: 'Earnings', url: '/partner/earnings', icon: 'Wallet' },
];

export const ALL_NAV_OPTIONS: NavItem[] = [
  { key: 'dashboard', label: 'Dashboard', url: '/partner/dashboard', icon: 'LayoutDashboard', category: 'general' },
  { key: 'bookings', label: 'Bookings', url: '/partner/bookings', icon: 'BookOpen', category: 'general', permission: 'view_bookings' },
  { key: 'properties', label: 'Properties', url: '/partner/manage-properties', icon: 'Building2', category: 'general', permission: 'view_manage_properties' },
  { key: 'earnings', label: 'Earnings', url: '/partner/earnings', icon: 'Wallet', category: 'general', permission: 'view_payouts' },
  { key: 'operations', label: 'Operations', url: '/partner/operations', icon: 'ClipboardCheck', category: 'general', permission: 'view_operations' },
  { key: 'seat-map', label: 'Seat Map', url: '/partner/seats-available-map', icon: 'MapIcon', category: 'reading_rooms', permission: 'seats_available_map' },
  { key: 'due-mgmt', label: 'Dues', url: '/partner/due-management', icon: 'Wallet', category: 'reading_rooms', permission: 'view_due_management' },
  { key: 'expiring', label: 'Expiring', url: '/partner/expiring-bookings', icon: 'Clock', category: 'reading_rooms', permission: 'view_bookings' },
  { key: 'receipts', label: 'Receipts', url: '/partner/receipts', icon: 'CreditCard', category: 'reading_rooms', permission: 'view_receipts' },
  { key: 'deposits', label: 'Deposits', url: '/partner/deposits-restrictions', icon: 'Wallet', category: 'reading_rooms', permission: 'view_key_deposits' },
  { key: 'bed-map', label: 'Bed Map', url: '/partner/hostel-bed-map', icon: 'Bed', category: 'hostels', permission: 'view_bed_map' },
  { key: 'hostel-dues', label: 'Hostel Dues', url: '/partner/hostel-due-management', icon: 'Wallet', category: 'hostels', permission: 'view_hostel_due_management' },
  { key: 'hostel-bookings', label: 'Hostel Book.', url: '/partner/hostel-bookings', icon: 'Calendar', category: 'hostels', permission: 'view_hostel_bookings' },
  { key: 'hostel-expiring', label: 'H. Expiring', url: '/partner/hostel-expiring-bookings', icon: 'Clock', category: 'hostels', permission: 'view_hostel_bookings' },
  { key: 'hostel-receipts', label: 'H. Receipts', url: '/partner/hostel-receipts', icon: 'CreditCard', category: 'hostels', permission: 'view_hostel_receipts' },
  { key: 'hostel-deposits', label: 'H. Deposits', url: '/partner/hostel-deposits', icon: 'Wallet', category: 'hostels', permission: 'view_hostel_deposits' },
  { key: 'students', label: 'Users', url: '/partner/students', icon: 'Users', category: 'general', permission: 'view_students' },
  { key: 'coupons', label: 'Coupons', url: '/partner/coupons', icon: 'TicketPlus', category: 'general', permission: 'view_coupons' },
  { key: 'employees', label: 'Employees', url: '/partner/employees', icon: 'Users2', category: 'general', permission: 'manage_employees' },
  { key: 'complaints', label: 'Complaints', url: '/partner/complaints', icon: 'MessageSquare', category: 'general', permission: 'view_complaints' },
  { key: 'reconciliation', label: 'Reconcile', url: '/partner/reconciliation', icon: 'ClipboardCheck', category: 'general', permission: 'view_reconciliation' },
  { key: 'banks', label: 'Banks', url: '/partner/banks', icon: 'Building', category: 'general', permission: 'view_banks' },
  { key: 'performance', label: 'Performance', url: '/partner/business-performance', icon: 'BarChart2', category: 'general', permission: 'view_reports' },
  { key: 'reviews', label: 'Reviews', url: '/partner/reviews', icon: 'Star', category: 'general', permission: 'view_reviews' },
  { key: 'laundry', label: 'Laundry', url: '/partner/laundry', icon: 'Shirt', category: 'laundry' },
  { key: 'mess', label: 'Mess', url: '/partner/mess', icon: 'UtensilsCrossed', category: 'mess' },
  { key: 'promotions', label: 'Promotions', url: '/partner/promotions', icon: 'Megaphone', category: 'vendor_only' },
  { key: 'subscriptions', label: 'Subscriptions', url: '/partner/my-subscriptions', icon: 'Crown', category: 'vendor_only' },
  { key: 'profile', label: 'Profile', url: '/partner/profile', icon: 'User', category: 'vendor_only' },
  { key: 'activity-log', label: 'Activity Log', url: '/partner/booking-activity-log', icon: 'Activity', category: 'general', permission: 'view_bookings' },
];

export function usePartnerNavPreferences() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: savedItems, isLoading } = useQuery({
    queryKey: ['partner-nav-preferences', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('partner_nav_preferences')
        .select('nav_items')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      return (data?.nav_items as unknown as NavItem[]) ?? null;
    },
    enabled: !!user?.id,
  });

  const saveMutation = useMutation({
    mutationFn: async (items: NavItem[]) => {
      if (!user?.id) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('partner_nav_preferences')
        .upsert({ user_id: user.id, nav_items: items as any }, { onConflict: 'user_id' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partner-nav-preferences'] });
      toast({ title: 'Navigation updated!' });
    },
    onError: () => {
      toast({ title: 'Failed to save', variant: 'destructive' });
    },
  });

  const pinnedItems = savedItems && savedItems.length === 4 ? savedItems : DEFAULT_NAV_ITEMS;

  return {
    pinnedItems,
    isLoading,
    savePreferences: saveMutation.mutateAsync,
    isSaving: saveMutation.isPending,
  };
}
