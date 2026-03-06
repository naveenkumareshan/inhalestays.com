import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, BookOpen, Hotel, UtensilsCrossed, User } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

const tabs = [
  {
    label: 'Home',
    icon: Home,
    to: '/',
    isActive: (pathname: string) => pathname === '/',
  },
  {
    label: 'Study Rooms',
    icon: BookOpen,
    to: '/cabins',
    isActive: (pathname: string) =>
      pathname.startsWith('/cabins') || pathname.startsWith('/book-seat') || pathname.startsWith('/cabin'),
  },
  {
    label: 'Hostels',
    icon: Hotel,
    to: '/hostels',
    isActive: (pathname: string) => pathname.startsWith('/hostels') || pathname.startsWith('/hostel'),
  },
  {
    label: 'Mess',
    icon: UtensilsCrossed,
    to: '/mess',
    isActive: (pathname: string) => pathname.startsWith('/mess') || pathname.startsWith('/student/mess'),
  },
  {
    label: 'Profile',
    icon: User,
    to: '/student/profile',
    isActive: (pathname: string) =>
      pathname === '/student' ||
      pathname === '/student/profile' ||
      pathname.startsWith('/student/profile/') ||
      pathname === '/student/dashboard' ||
      pathname.startsWith('/student/bookings') ||
      pathname === '/student/laundry-orders',
    requireAuth: true,
  },
];

export const MobileBottomNav: React.FC = () => {
  const { pathname } = useLocation();
  const { isAuthenticated } = useAuth();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-md border-t border-border"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-stretch max-w-lg mx-auto">
        {tabs.map((tab) => {
          const active = tab.isActive(pathname);
          const href = tab.requireAuth && !isAuthenticated ? '/student/login' : tab.to;
          return (
            <Link
              key={tab.label}
              to={href}
              className={cn(
                'flex-1 flex flex-col items-center justify-center gap-0.5 min-h-[56px] relative transition-all duration-200 overflow-hidden',
                active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {/* Active indicator bar at top */}
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

export default MobileBottomNav;
