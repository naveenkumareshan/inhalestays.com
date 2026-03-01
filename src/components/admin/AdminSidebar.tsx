
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarHeader,
  SidebarFooter,
} from '@/components/ui/sidebar';
import { useAuth } from '@/contexts/AuthContext';
import { useVendorEmployeePermissions } from '@/hooks/useVendorEmployeePermissions';
import { Button } from '@/components/ui/button';
import { 
  LayoutDashboard, 
  Calendar, 
  Building, 
  Users, 
  Plus,
  Settings, 
  Bed,
  CreditCard,
  Mail,
  MessageSquare,
  LogOut,
  Import,
  User,
  Users2,
  Wallet,
  Map,
  Bell,
  MapIcon,
  TicketPlus,
  Hotel,
  HomeIcon,
  Star,
  BarChart2,
  UserCheck,
  ClipboardCheck
} from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronRight } from 'lucide-react';
import { ScrollArea } from "@/components/ui/scroll-area"

interface MenuItem {
  title: string;
  url?: string;
  icon: React.ComponentType<any>;
  roles: string[];
  permissions?: string[];
  subItems?: MenuItem[];
}

export function AdminSidebar() {
  const { pathname } = useLocation();
  const { user, logout } = useAuth();
  const { hasPermission, hasAnyPermission, loading } = useVendorEmployeePermissions();

  if (loading) {
    return (
      <Sidebar>
        <SidebarContent>
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full"></div>
          </div>
        </SidebarContent>
      </Sidebar>
    );
  }

  const isPartner = user?.role === 'vendor' || user?.role === 'vendor_employee';
  const routePrefix = isPartner ? '/partner' : '/admin';

  const menuItems: MenuItem[] = [
    {
      title: 'Dashboard',
      url: `${routePrefix}/dashboard`,
      icon: LayoutDashboard,
      roles: ['admin', 'vendor', 'vendor_employee'],
      permissions: ['view_dashboard']
    },
    {
      title: 'Operations',
      url: `${routePrefix}/operations`,
      icon: ClipboardCheck,
      roles: ['admin', 'vendor', 'vendor_employee'],
      permissions: ['view_operations']
    }
  ];

  // Reading Rooms section
  if (user?.role === 'admin' || hasPermission('view_bookings')) {
    const readingRoomSubItems: MenuItem[] = [];

    if (user?.role === 'admin' || hasPermission('seats_available_map')) {
      readingRoomSubItems.push({
        title: 'Seat Map',
        url: `${routePrefix}/seats-available-map`,
        icon: MapIcon,
        roles: ['admin', 'vendor', 'vendor_employee'],
        permissions: ['seats_available_map']
      });
    }

    if (user?.role === 'admin' || hasPermission('view_due_management')) {
      readingRoomSubItems.push({
        title: 'Due Management',
        url: `${routePrefix}/due-management`,
        icon: Wallet,
        roles: ['admin', 'vendor', 'vendor_employee'],
        permissions: ['view_due_management']
      });
    }
    
    if (user?.role === 'admin' || hasPermission('view_bookings')) {
      readingRoomSubItems.push({
        title: 'Bookings',
        url: `${routePrefix}/bookings`,
        icon: Calendar,
        roles: ['admin', 'vendor', 'vendor_employee'],
        permissions: ['view_bookings']
      });
      readingRoomSubItems.push({
        title: 'Receipts',
        url: `${routePrefix}/receipts`,
        icon: CreditCard,
        roles: ['admin', 'vendor', 'vendor_employee'],
        permissions: ['view_receipts']
      });
    }
    
    if (user?.role === 'admin' || user?.role === 'vendor' || hasPermission('view_key_deposits')) {
      readingRoomSubItems.push({
        title: 'Key Deposits',
        url: `${routePrefix}/deposits-restrictions`,
        icon: Wallet,
        roles: ['admin', 'vendor', 'vendor_employee'],
        permissions: ['view_key_deposits']
      });
    }

    if (user?.role === 'admin' || hasPermission('view_reading_rooms')) {
      if (!isPartner) {
        readingRoomSubItems.push({
          title: 'Manage Rooms',
          url: '/admin/rooms',
          icon: Building,
          roles: ['admin', 'vendor', 'vendor_employee'],
          permissions: ['view_reading_rooms']
        });
        readingRoomSubItems.push({
          title: 'Reviews',
          url: '/admin/reviews?module=Reading Room',
          icon: Star,
          roles: ['admin', 'vendor', 'vendor_employee'],
          permissions: ['view_reviews']
        });
      }
    }

    if (readingRoomSubItems.length > 0) {
      menuItems.push({
        title: 'Reading Rooms',
        icon: Building,
        roles: ['admin', 'vendor', 'vendor_employee'],
        permissions: ['view_bookings'],
        subItems: readingRoomSubItems,
      });
    }
  }

  // ===== HOSTELS SECTION (moved ABOVE Users) =====
  if (user?.role === 'admin' || hasPermission('view_reading_rooms')) {
    const hostelSubItems: MenuItem[] = [
      {
        title: 'Bed Map',
        url: `${routePrefix}/hostel-bed-map`,
        icon: Bed,
        roles: ['admin', 'vendor', 'vendor_employee'],
        permissions: ['view_bed_map']
      },
      {
        title: 'Due Management',
        url: `${routePrefix}/hostel-due-management`,
        icon: Wallet,
        roles: ['admin', 'vendor', 'vendor_employee'],
        permissions: ['view_hostel_due_management']
      },
      ...(!isPartner ? [{
        title: 'Manage Hostels',
        url: '/admin/hostels',
        icon: HomeIcon,
        roles: ['admin', 'vendor', 'vendor_employee'],
        permissions: ['view_reading_rooms']
      }] : []) as MenuItem[],
      {
        title: 'Hostel Bookings',
        url: `${routePrefix}/hostel-bookings`,
        icon: Calendar,
        roles: ['admin', 'vendor', 'vendor_employee'],
        permissions: ['view_hostel_bookings']
      },
      {
        title: 'Hostel Receipts',
        url: `${routePrefix}/hostel-receipts`,
        icon: CreditCard,
        roles: ['admin', 'vendor', 'vendor_employee'],
        permissions: ['view_hostel_receipts']
      },
      {
        title: 'Hostel Deposits',
        url: `${routePrefix}/hostel-deposits`,
        icon: Wallet,
        roles: ['admin', 'vendor', 'vendor_employee'],
        permissions: ['view_hostel_deposits']
      },
      ...(!isPartner ? [{
        title: 'Reviews',
        url: '/admin/reviews?module=Hostel',
        icon: Star,
        roles: ['admin', 'vendor', 'vendor_employee'],
        permissions: ['view_reviews']
      }] : []) as MenuItem[],
    ];

    // Approvals moved to Partners section

    menuItems.push({
      title: 'Hostels',
      icon: Hotel,
      roles: ['admin', 'vendor', 'vendor_employee'],
      permissions: ['view_reading_rooms'],
      subItems: hostelSubItems,
    });
  }

  // ===== USERS SECTION (moved BELOW Hostels) =====
  if (user?.role === 'admin' || hasPermission('manage_students')) {
    menuItems.push({
      title: 'Users',
      icon: Users,
      roles: ['admin', 'vendor', 'vendor_employee'],
      subItems: [
        { title: 'All Users', url: `${routePrefix}/students`, icon: Users, roles: ['admin', 'vendor', 'vendor_employee'] },
        { title: 'Create User', url: `${routePrefix}/students-create`, icon: Plus, roles: ['admin', 'vendor'] },
        { title: 'Import Users', url: '/admin/students-import', icon: Import, roles: ['admin'] },
        {
          title: 'Coupons',
          url: `${routePrefix}/coupons`,
          icon: TicketPlus,
          roles: ['admin', 'vendor', 'vendor_employee'],
          permissions: ['view_coupons']
        },
      ],
    });
  }

  // For partners: add merged Manage Properties and Reviews
  if (isPartner && (user?.role === 'vendor' || hasPermission('view_reading_rooms'))) {
    menuItems.push({
      title: 'Manage Properties',
      url: `${routePrefix}/manage-properties`,
      icon: Building,
      roles: ['vendor', 'vendor_employee'],
      permissions: ['view_manage_properties']
    });
    menuItems.push({
      title: 'Reviews',
      url: `${routePrefix}/reviews`,
      icon: Star,
      roles: ['vendor', 'vendor_employee'],
      permissions: ['view_reviews']
    });
  }

  if (user?.role === 'admin') {
    menuItems.push(
      {
        title: 'Settings',
        icon: Settings,
        roles: ['admin'],
        subItems: [
          { title: 'Site Configuration', url: '/admin/settings', icon: Settings, roles: ['admin'] }
        ],
      },
      {
      title: 'Partners',
      icon: UserCheck,
      roles: ['admin'],
      subItems: [
        { title: 'All Partners', url: '/admin/vendors', icon: UserCheck, roles: ['admin'] },
        { title: 'Property Approvals', url: '/admin/property-approvals', icon: ClipboardCheck, roles: ['admin'] },
      ],
      },
      {
        title: 'Reports',
        icon: BarChart2,
        roles: ['admin'],
        subItems: [
          { title: 'Booking Reports', url: '/admin/reports', icon: BarChart2, roles: ['admin'] },
          { title: 'Payouts', url: '/admin/payouts', icon: Wallet, roles: ['admin'] }
        ],
      },
      {
        title: 'Messaging',
        icon: Mail,
        roles: ['admin'],
        subItems: [
          { title: 'Email Reports', url: '/admin/email-reports', icon: Mail, roles: ['admin'] },
          { title: 'Email Templates', url: '/admin/email-templates', icon: MessageSquare, roles: ['admin'] }
        ],
      },
      {
        title: 'Locations',
        icon: Map,
        roles: ['admin'],
        url: '/admin/locations'
      },
      {
        title: 'Banners',
        icon: Bell,
        roles: ['admin'],
        url: '/admin/banners'
      },
      {
        title: 'Complaints',
        icon: MessageSquare,
        roles: ['admin'],
        url: '/admin/complaints'
      },
      {
        title: 'Support Tickets',
        icon: Mail,
        roles: ['admin'],
        url: '/admin/support-tickets'
      }
    );
  } else {
    const vendorMenuItems: MenuItem[] = [];

    vendorMenuItems.push({
      title: 'Complaints',
      icon: MessageSquare,
      roles: ['vendor', 'vendor_employee'],
      url: `${routePrefix}/complaints`,
      permissions: ['view_complaints']
    });

    if (hasPermission('view_reports')) {
      vendorMenuItems.push({
        title: 'Reports',
        icon: BarChart2,
        roles: ['vendor', 'vendor_employee'],
        permissions: ['view_reports'],
        subItems: [
          {
            title: 'Booking Reports',
            url: `${routePrefix}/reports`,
            icon: BarChart2,
            roles: ['vendor', 'vendor_employee'],
            permissions: ['view_reports']
          },
          {
            title: 'Hostel Reports',
            url: `${routePrefix}/reports?tab=transactions`,
            icon: BarChart2,
            roles: ['vendor', 'vendor_employee'],
            permissions: ['view_reports']
          }
        ],
      });
    }

    if (user?.role === 'vendor' || hasPermission('manage_employees')) {
      vendorMenuItems.push({
        title: 'Employees',
        icon: Users2,
        roles: ['vendor', 'vendor_employee'],
        permissions: ['manage_employees'],
        url: `${routePrefix}/employees`,
      });
    }

    if (hasPermission('view_payouts')) {
      vendorMenuItems.push({
        title: 'Payouts',
        icon: Wallet,
        roles: ['vendor', 'vendor_employee'],
        permissions: ['view_payouts'],
        url: `${routePrefix}/vendorpayouts`
      });
    }

    if (user?.role == 'vendor') {
      vendorMenuItems.push({
        title: 'Profile',
        icon: User,
        roles: ['vendor', 'vendor_employee'],
        url: `${routePrefix}/profile`
      });
    }

    menuItems.push(...vendorMenuItems);
  }

  const isActiveItem = (itemUrl?: string, subItems?: MenuItem[]) => {
    if (itemUrl && pathname === itemUrl) return true;
    if (subItems) {
      return subItems.some(subItem => pathname === subItem.url);
    }
    return false;
  };

  const hasAccess = (item: MenuItem) => {
    if (!item.roles.includes(user?.role || '')) {
      return false;
    }
    if (item.permissions && user?.role === 'vendor_employee') {
      return hasAnyPermission(item.permissions as any);
    }
    return true;
  };

  const renderMenuItem = (item: MenuItem) => {
    if (!hasAccess(item)) {
      return null;
    }

    if (item.subItems) {
      const accessibleSubItems = item.subItems.filter(hasAccess);
      
      if (accessibleSubItems.length === 0) {
        return null;
      }

      return (
        <Collapsible key={item.title} defaultOpen={isActiveItem(item.url, item.subItems)}>
          <SidebarMenuItem>
            <CollapsibleTrigger asChild>
              <SidebarMenuButton className="w-full justify-between hover:bg-muted/60 transition-colors">
                <div className="flex items-center gap-2.5">
                  <item.icon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{item.title}</span>
                </div>
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground transition-transform group-data-[state=open]/collapsible:rotate-90" />
              </SidebarMenuButton>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarMenuSub>
                {accessibleSubItems.map((subItem) => {
                  const isActive = pathname === subItem.url || pathname.startsWith(subItem.url?.split('?')[0] || '____');
                  return (
                    <SidebarMenuSubItem key={subItem.title}>
                      <SidebarMenuSubButton
                        asChild
                        isActive={isActive}
                        className={isActive ? "border-l-2 border-primary bg-primary/8 text-primary font-medium" : "hover:bg-muted/60"}
                      >
                        <Link to={subItem.url || '#'} className="flex items-center gap-2.5 pl-2">
                          <subItem.icon className="h-3.5 w-3.5 flex-shrink-0" />
                          <span className="text-xs">{subItem.title}</span>
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  );
                })}
              </SidebarMenuSub>
            </CollapsibleContent>
          </SidebarMenuItem>
        </Collapsible>
      );
    }

    const isActive = pathname === item.url;
    return (
      <SidebarMenuItem key={item.title}>
        <SidebarMenuButton
          asChild
          isActive={isActive}
          className={isActive ? "border-l-2 border-primary bg-primary/8 text-primary font-medium" : "hover:bg-muted/60 transition-colors"}
        >
          <Link to={item.url || '#'} className="flex items-center gap-2.5">
            <item.icon className="h-4 w-4 flex-shrink-0" />
            <span className="text-sm font-medium">{item.title}</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

  const getRoleBadgeStyle = () => {
    switch (user?.role) {
      case 'admin': return 'bg-blue-50 text-blue-700 border border-blue-200 ring-1 ring-blue-100';
      case 'vendor': return 'bg-emerald-50 text-emerald-700 border border-emerald-200 ring-1 ring-emerald-100';
      case 'vendor_employee': return 'bg-amber-50 text-amber-700 border border-amber-200 ring-1 ring-amber-100';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getRoleLabel = () => {
    switch (user?.role) {
      case 'admin': return 'Admin';
      case 'vendor': return 'Partner';
      case 'vendor_employee': return 'Employee';
      default: return 'User';
    }
  };

  return (
    <Sidebar>
      <SidebarHeader className="border-b" style={{ background: 'linear-gradient(180deg, hsl(var(--primary) / 0.06) 0%, hsl(var(--background)) 100%)' }}>
        <div className="flex items-center gap-3 px-4 py-3.5">
          <img
            src="/src/assets/inhalestays-logo.png"
            alt="InhaleStays"
            className="h-8 w-8 rounded-lg object-contain drop-shadow-sm"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
          <div className="flex flex-col flex-1 min-w-0">
            <span className="font-semibold text-sm truncate tracking-tight">InhaleStays</span>
            <div className="flex items-center gap-1.5 mt-1">
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${getRoleBadgeStyle()}`}>
                {getRoleLabel()}
              </span>
              <span className="text-[11px] text-muted-foreground truncate">{user?.name}</span>
            </div>
          </div>
        </div>
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <ScrollArea className="my-1">
                {menuItems.map(renderMenuItem).filter(Boolean)}
              </ScrollArea>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      
      <SidebarFooter className="border-t">
        <SidebarMenu>
          <SidebarMenuItem>
            <Button 
              variant="ghost" 
              className="w-full justify-start text-muted-foreground hover:text-foreground hover:bg-red-50 hover:text-red-600 transition-colors" 
              onClick={logout}
            >
              <LogOut className="h-4 w-4 mr-2.5" />
              <span className="text-sm">Sign Out</span>
            </Button>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
