import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, BookOpen, Building2, Wallet, User } from 'lucide-react';
import { cn } from '@/lib/utils';

const tabs = [
  {
    label: 'Dashboard',
    icon: LayoutDashboard,
    to: '/partner/dashboard',
    isActive: (p: string) => p === '/partner' || p === '/partner/dashboard',
  },
  {
    label: 'Bookings',
    icon: BookOpen,
    to: '/partner/bookings',
    isActive: (p: string) => p.startsWith('/partner/bookings') || p.startsWith('/partner/hostel-bookings'),
  },
  {
    label: 'Properties',
    icon: Building2,
    to: '/partner/manage-properties',
    isActive: (p: string) =>
      p.startsWith('/partner/manage-properties') ||
      p.startsWith('/partner/rooms') ||
      p.startsWith('/partner/hostels') ||
      p.startsWith('/partner/cabins'),
  },
  {
    label: 'Earnings',
    icon: Wallet,
    to: '/partner/earnings',
    isActive: (p: string) =>
      p.startsWith('/partner/earnings') ||
      p.startsWith('/partner/vendorpayouts') ||
      p.startsWith('/partner/receipts') ||
      p.startsWith('/partner/reconciliation'),
  },
  {
    label: 'Profile',
    icon: User,
    to: '/partner/profile',
    isActive: (p: string) =>
      p === '/partner/profile' ||
      p.startsWith('/partner/employees') ||
      p.startsWith('/partner/settings'),
  },
];

export const PartnerBottomNav: React.FC = () => {
  const { pathname } = useLocation();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-md border-t border-border"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-stretch max-w-lg mx-auto">
        {tabs.map((tab) => {
          const active = tab.isActive(pathname);
          return (
            <Link
              key={tab.label}
              to={tab.to}
              className={cn(
                'flex-1 flex flex-col items-center justify-center gap-0.5 min-h-[56px] relative transition-all duration-200 overflow-hidden',
                active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {active && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-0.5 rounded-full bg-primary" />
              )}
              <div className={cn(
                'w-full flex flex-col items-center gap-0.5 px-0.5 py-1 rounded-xl transition-all duration-200 overflow-hidden',
                active && 'bg-primary/10'
              )}>
                <tab.icon
                  className="w-5 h-5"
                  strokeWidth={active ? 2.5 : 1.75}
                />
                <span className={cn('text-[9px] leading-tight whitespace-nowrap', active ? 'font-semibold' : 'font-medium')}>
                  {tab.label}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default PartnerBottomNav;
