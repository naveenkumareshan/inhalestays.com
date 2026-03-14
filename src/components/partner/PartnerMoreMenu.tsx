import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/contexts/AuthContext';
import { usePartnerEmployeePermissions } from '@/hooks/useVendorEmployeePermissions';
import { usePartnerPropertyTypes } from '@/hooks/usePartnerPropertyTypes';
import { usePartnerNavPreferences, ALL_NAV_OPTIONS } from '@/hooks/usePartnerNavPreferences';
import { cn } from '@/lib/utils';
import {
  User, MapIcon, Wallet, Calendar, CreditCard, Activity, Clock,
  Bed, ClipboardCheck, Users, Plus, TicketPlus, Building, Star,
  BarChart2, Users2, MessageSquare, Megaphone, Crown, Shirt,
  UtensilsCrossed, LogOut, Settings, Pencil,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import PartnerNavCustomizer from './PartnerNavCustomizer';

interface MoreMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface MenuLink {
  title: string;
  url: string;
  icon: React.ComponentType<any>;
  permission?: string;
  vendorOnly?: boolean;
}

interface MenuSection {
  title: string;
  items: MenuLink[];
  show: boolean;
}

const PartnerMoreMenu: React.FC<MoreMenuProps> = ({ open, onOpenChange }) => {
  const { pathname } = useLocation();
  const { user, logout } = useAuth();
  const { hasPermission } = usePartnerEmployeePermissions();
  const { hasReadingRooms, hasHostels, hasLaundry, hasMess } = usePartnerPropertyTypes();
  const { pinnedItems, savePreferences, isSaving } = usePartnerNavPreferences();
  const [customizerOpen, setCustomizerOpen] = useState(false);

  const isVendor = user?.role === 'vendor';
  const prefix = '/partner';

  const can = (perm: string) => isVendor || hasPermission(perm as any);

  // Compute filtered nav options for the customizer
  const filteredNavOptions = ALL_NAV_OPTIONS.filter((item) => {
    if (item.category === 'vendor_only' && !isVendor) return false;
    if (item.category === 'reading_rooms' && !hasReadingRooms) return false;
    if (item.category === 'hostels' && !hasHostels) return false;
    if (item.category === 'laundry' && !hasLaundry) return false;
    if (item.category === 'mess' && !hasMess) return false;
    if (item.permission && !can(item.permission)) return false;
    return true;
  });

  const sections: MenuSection[] = [
    {
      title: 'Account',
      show: isVendor,
      items: [
        { title: 'Profile', url: `${prefix}/profile`, icon: User, vendorOnly: true },
      ],
    },
    {
      title: 'Operations',
      show: can('view_operations'),
      items: [
        { title: 'Operations Hub', url: `${prefix}/operations`, icon: ClipboardCheck, permission: 'view_operations' },
        { title: 'Business Performance', url: `${prefix}/business-performance`, icon: BarChart2, permission: 'view_reports' },
      ],
    },
    {
      title: 'Reading Rooms',
      show: hasReadingRooms && (can('seats_available_map') || can('view_due_management') || can('view_bookings') || can('view_key_deposits')),
      items: [
        { title: 'Seat Map', url: `${prefix}/seats-available-map`, icon: MapIcon, permission: 'seats_available_map' },
        { title: 'Due Management', url: `${prefix}/due-management`, icon: Wallet, permission: 'view_due_management' },
        { title: 'Bookings', url: `${prefix}/bookings`, icon: Calendar, permission: 'view_bookings' },
        { title: 'Expiring Bookings', url: `${prefix}/expiring-bookings`, icon: Clock, permission: 'view_bookings' },
        { title: 'Receipts', url: `${prefix}/receipts`, icon: CreditCard, permission: 'view_receipts' },
        { title: 'Key Deposits', url: `${prefix}/deposits-restrictions`, icon: Wallet, permission: 'view_key_deposits' },
        { title: 'Activity Log', url: `${prefix}/booking-activity-log`, icon: Activity, permission: 'view_bookings' },
      ],
    },
    {
      title: 'Hostels',
      show: hasHostels && (can('view_bed_map') || can('view_hostel_due_management') || can('view_hostel_bookings') || can('view_hostel_receipts') || can('view_hostel_deposits')),
      items: [
        { title: 'Bed Map', url: `${prefix}/hostel-bed-map`, icon: Bed, permission: 'view_bed_map' },
        { title: 'Due Management', url: `${prefix}/hostel-due-management`, icon: Wallet, permission: 'view_hostel_due_management' },
        { title: 'Hostel Bookings', url: `${prefix}/hostel-bookings`, icon: Calendar, permission: 'view_hostel_bookings' },
        { title: 'Expiring Bookings', url: `${prefix}/hostel-expiring-bookings`, icon: Clock, permission: 'view_hostel_bookings' },
        { title: 'Hostel Receipts', url: `${prefix}/hostel-receipts`, icon: CreditCard, permission: 'view_hostel_receipts' },
        { title: 'Hostel Deposits', url: `${prefix}/hostel-deposits`, icon: Wallet, permission: 'view_hostel_deposits' },
        { title: 'Activity Log', url: `${prefix}/booking-activity-log`, icon: Activity, permission: 'view_hostel_bookings' },
      ],
    },
    {
      title: 'Laundry',
      show: hasLaundry,
      items: [
        { title: 'Laundry Dashboard', url: `${prefix}/laundry`, icon: Shirt },
      ],
    },
    {
      title: 'Mess / Food',
      show: hasMess,
      items: [
        { title: 'Manage Mess', url: `${prefix}/mess`, icon: UtensilsCrossed },
        { title: 'Subscriptions', url: `${prefix}/mess-bookings`, icon: Users },
        { title: 'Receipts', url: `${prefix}/mess-receipts`, icon: CreditCard },
        { title: 'Attendance', url: `${prefix}/mess-attendance`, icon: ClipboardCheck },
      ],
    },
    {
      title: 'Users',
      show: can('view_students'),
      items: [
        { title: 'All Users', url: `${prefix}/students`, icon: Users, permission: 'view_students' },
        { title: 'Create User', url: `${prefix}/students-create`, icon: Plus, vendorOnly: true },
        { title: 'Coupons', url: `${prefix}/coupons`, icon: TicketPlus, permission: 'view_coupons' },
      ],
    },
    {
      title: 'Properties & Reviews',
      show: can('view_manage_properties') || can('view_reviews'),
      items: [
        { title: 'Manage Properties', url: `${prefix}/manage-properties`, icon: Building, permission: 'view_manage_properties' },
        { title: 'Reviews', url: `${prefix}/reviews`, icon: Star, permission: 'view_reviews' },
      ],
    },
    {
      title: 'Finance',
      show: can('view_reconciliation') || can('view_banks'),
      items: [
        { title: 'Reconciliation', url: `${prefix}/reconciliation`, icon: ClipboardCheck, permission: 'view_reconciliation' },
        { title: 'Banks', url: `${prefix}/banks`, icon: Building, permission: 'view_banks' },
      ],
    },
    {
      title: 'Management',
      show: can('manage_employees') || can('view_complaints') || can('view_payouts'),
      items: [
        { title: 'Employees', url: `${prefix}/employees`, icon: Users2, permission: 'manage_employees' },
        { title: 'Complaints', url: `${prefix}/complaints`, icon: MessageSquare, permission: 'view_complaints' },
        { title: 'Earnings & Settlements', url: `${prefix}/earnings`, icon: Wallet, permission: 'view_payouts' },
      ],
    },
    {
      title: 'More',
      show: isVendor,
      items: [
        { title: 'Reports', url: `${prefix}/reports`, icon: BarChart2, vendorOnly: true },
        { title: 'My Promotions', url: `${prefix}/promotions`, icon: Megaphone, vendorOnly: true },
        { title: 'My Subscriptions', url: `${prefix}/my-subscriptions`, icon: Crown, vendorOnly: true },
      ],
    },
  ];

  const handleLinkClick = () => onOpenChange(false);

  const handleLogout = () => {
    onOpenChange(false);
    logout();
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl p-0">
          <SheetHeader className="px-5 pt-5 pb-3 border-b">
            <SheetTitle className="text-base font-semibold">All Features</SheetTitle>
          </SheetHeader>
        <ScrollArea className="h-[calc(85vh-70px)]">
          <div className="px-4 py-3 space-y-5">

            {sections.map((section) => {
              if (!section.show) return null;

              const visibleItems = section.items.filter((item) => {
                if (item.vendorOnly && !isVendor) return false;
                if (item.permission && !can(item.permission)) return false;
                return true;
              });

              if (visibleItems.length === 0) return null;

              return (
                <div key={section.title}>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 px-1">
                    {section.title}
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {visibleItems.map((item) => {
                      const isActive = pathname === item.url;
                      return (
                        <Link
                          key={item.url}
                          to={item.url}
                          onClick={handleLinkClick}
                          className={cn(
                            'flex flex-col items-center gap-1.5 rounded-xl p-3 text-center transition-colors',
                            isActive
                              ? 'bg-primary/10 text-primary'
                              : 'bg-muted/40 text-muted-foreground hover:bg-muted/70 hover:text-foreground'
                          )}
                        >
                          <item.icon className="h-5 w-5" strokeWidth={isActive ? 2.2 : 1.6} />
                          <span className={cn('text-[10px] leading-tight', isActive ? 'font-semibold' : 'font-medium')}>
                            {item.title}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* Customize Nav + Sign Out */}
            <div className="pt-2 pb-4 space-y-2">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => {
                  onOpenChange(false);
                  setTimeout(() => setCustomizerOpen(true), 300);
                }}
              >
                <Settings className="h-3.5 w-3.5" />
                Customize Nav Bar
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-center text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>

    <PartnerNavCustomizer
      open={customizerOpen}
      onOpenChange={setCustomizerOpen}
      currentItems={pinnedItems}
      onSave={savePreferences}
      isSaving={isSaving}
    />
    </>
  );
};

export default PartnerMoreMenu;
