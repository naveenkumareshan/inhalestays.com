import React, { Suspense } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "./admin/AdminSidebar";
import { useAuth } from "@/contexts/AuthContext";

const routeLabels: Record<string, string> = {
  "/admin/dashboard": "Dashboard",
  "/admin/bookings": "All Transactions",
  "/admin/students": "Users",
  "/admin/students-create": "Create User",
  "/admin/students-import": "Import Users",
  "/admin/coupons": "Coupons",
  "/admin/vendors": "Partners",
  "/admin/rooms": "Reading Rooms",
  "/admin/hostels": "Hostels",
  "/admin/reports": "Reports",
  "/admin/payouts": "Payouts",
  "/admin/email-reports": "Email Reports",
  "/admin/email-templates": "Email Templates",
  "/admin/locations": "Locations",
  "/admin/banners": "Banners",
  "/admin/settings": "Settings",
  "/admin/deposits-restrictions": "Key Deposits",
  "/admin/reviews": "Reviews",
  "/admin/employees": "Employees",
  "/admin/vendorpayouts": "Payouts",
  "/admin/profile": "Profile",
  "/admin/seats-available-map": "Seat Map",
  "/admin/complaints": "Complaints",
  "/admin/operations": "Operations",
  "/admin/manage-properties": "Manage Properties",
  "/admin/laundry": "Laundry",
  "/admin/laundry-receipts": "Laundry Receipts",
  "/admin/admin-employees": "Admin Employees",
  // Partner route aliases
  "/partner/dashboard": "Dashboard",
  "/partner/bookings": "All Transactions",
  "/partner/students": "Users",
  "/partner/students-create": "Create User",
  "/partner/coupons": "Coupons",
  "/partner/rooms": "Reading Rooms",
  "/partner/hostels": "Hostels",
  "/partner/reports": "Reports",
  "/partner/deposits-restrictions": "Key Deposits",
  "/partner/reviews": "Reviews",
  "/partner/employees": "Employees",
  "/partner/vendorpayouts": "Payouts",
  "/partner/profile": "Profile",
  "/partner/seats-available-map": "Seat Map",
  "/partner/complaints": "Complaints",
  "/partner/operations": "Operations",
  "/partner/manage-properties": "Manage Properties",
  "/partner/hostel-bookings": "Hostel Bookings",
  "/partner/hostel-receipts": "Hostel Receipts",
  "/partner/hostel-deposits": "Hostel Deposits",
  "/partner/hostel-bed-map": "Bed Map",
  "/partner/hostel-due-management": "Hostel Due Management",
  "/partner/due-management": "Due Management",
  "/partner/receipts": "Receipts",
  "/partner/laundry": "Laundry",
  "/partner/laundry-receipts": "Laundry Receipts",
};

const getPageLabel = (pathname: string): string => {
  // Exact match first
  if (routeLabels[pathname]) return routeLabels[pathname];
  // Strip query params for matching
  const basePath = pathname.split('?')[0];
  if (routeLabels[basePath]) return routeLabels[basePath];
  // Prefix match for dynamic routes
  for (const key of Object.keys(routeLabels)) {
    if (pathname.startsWith(key + "/")) return routeLabels[key];
  }
  return "Admin Panel";
};

const AdminLayout: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  const pageLabel = getPageLabel(location.pathname);

  return (
    <div className="min-h-screen overflow-hidden">
      <SidebarProvider>
        <div className="flex min-h-screen w-full">
          <AdminSidebar />
          <SidebarInset className="flex-1 flex flex-col min-w-0 overflow-y-auto">
            <header
              className="flex h-13 shrink-0 items-center gap-2 border-b px-3 sm:px-4 sticky top-0 z-10"
              style={{ background: 'linear-gradient(90deg, hsl(var(--primary) / 0.04) 0%, hsl(var(--background)) 60%)' }}
            >
              <SidebarTrigger className="-ml-1" style={{ paddingTop: 'env(safe-area-inset-top)' }} />
              <div className="mx-2 h-4 w-px bg-border hidden sm:block" />
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground min-w-0 truncate">
                <span className="hidden sm:inline">{user?.role === "admin" ? "Admin" : user?.role === "vendor_employee" ? "Employee" : "Partner"} Panel</span>
                <span className="hidden sm:inline">/</span>
                <span className="text-foreground font-medium text-xs truncate">{pageLabel}</span>
              </div>
            </header>

            <div className="flex-1 p-3 sm:p-6 bg-muted/10 overflow-x-hidden">
              <Suspense fallback={<div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>}>
                <Outlet />
              </Suspense>
            </div>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </div>
  );
};

export default AdminLayout;
