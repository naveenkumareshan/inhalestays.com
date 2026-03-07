import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";

import { Icons } from "@/components/icons";
import { ModeToggle } from "@/components/mode-toggle";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import inhalestaysLogo from '@/assets/inhalestays-logo.png';

interface SiteSettings {
  siteName: string;
  logoUrl: string;
  enabledMenus: {
    bookings: boolean;
    hostel: boolean;
    laundry: boolean;
    roomSharing: boolean;
    about: boolean;
  };
}

const DEFAULT_SETTINGS: SiteSettings = {
  siteName: "InhaleStays",
  logoUrl: "",
  enabledMenus: { bookings: true, hostel: false, laundry: false, roomSharing: true, about: true },
};

export function Navigation() {
  const { isAuthenticated, user, logout } = useAuth();
  const { pathname } = useLocation();
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    // Try sessionStorage cache first for instant render
    const cached = sessionStorage.getItem('site_settings_cache');
    if (cached) {
      try { setSettings(JSON.parse(cached)); } catch {}
    }

    // Fetch from DB
    (async () => {
      const { data } = await supabase
        .from('site_settings')
        .select('key, value')
        .in('key', ['site_name', 'site_logo', 'enabled_menus']);

      if (data && data.length > 0) {
        const s: SiteSettings = { ...DEFAULT_SETTINGS };
        for (const row of data) {
          const v = row.value as any;
          if (row.key === 'site_name' && v?.value) s.siteName = v.value;
          if (row.key === 'site_logo' && v?.url) s.logoUrl = v.url;
          if (row.key === 'enabled_menus' && typeof v === 'object') {
            s.enabledMenus = { ...DEFAULT_SETTINGS.enabledMenus, ...v };
          }
        }
        setSettings(s);
        sessionStorage.setItem('site_settings_cache', JSON.stringify(s));
      }
    })();
  }, []);

  const logoSrc = settings.logoUrl || inhalestaysLogo;

  const navLinks = [
    { href: "/", label: "Home", show: true },
    { href: "/cabins", label: "Reading Rooms", show: settings.enabledMenus.bookings, matchPaths: ["/cabins", "/book-seat"] },
    { href: "/hostels", label: "Hostels", show: settings.enabledMenus.hostel, matchPaths: ["/hostels"] },
    { href: "/mess", label: "Food / Mess", show: true, matchPaths: ["/mess"] },
    { href: "/about", label: "About", show: settings.enabledMenus.about },
  ];

  const isActive = (link: typeof navLinks[0]) => {
    if (link.matchPaths) {
      return link.matchPaths.some(path => pathname === path || pathname.startsWith(path + '/'));
    }
    return pathname === link.href;
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <nav className="container flex h-16 items-center">
        {/* Desktop Navigation */}
        <div className="mr-4 hidden md:flex">
          <Link to="/" className="mr-8 flex items-center space-x-3">
            <img 
              src={logoSrc} 
              alt="Logo" 
              className="h-10 w-auto"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = inhalestaysLogo;
              }}
            />
            <span className="hidden font-bold text-lg text-foreground sm:inline-block">
              {settings.siteName}
            </span>
          </Link>
          <div className="flex items-center gap-1">
            {navLinks.filter(link => link.show).map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className={cn(
                  "px-4 py-2 text-sm font-medium rounded-lg transition-colors",
                  isActive(link) 
                    ? "bg-primary/10 text-primary" 
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                {link.label}
              </Link>
            ))}
            {isAuthenticated && (
              <Link
                to={user?.role === "admin" || user?.role === 'vendor' || user?.role === 'vendor_employee' 
                  ? "/admin/dashboard" 
                  : "/student/dashboard"}
                className={cn(
                  "px-4 py-2 text-sm font-medium rounded-lg transition-colors",
                  pathname.startsWith("/admin/") || pathname === "/student/dashboard"
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                {user?.role === "admin" || user?.role === 'vendor' || user?.role === 'vendor_employee' 
                  ? "Dashboard" 
                  : "My Dashboard"}
              </Link>
            )}
          </div>
        </div>

        {/* Mobile Navigation */}
        <Sheet>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="md:hidden flex items-center justify-center"
            >
              <img
                src={logoSrc}
                alt="Logo"
                className="h-8 w-auto mr-2"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = inhalestaysLogo;
                }}
              />
              <Icons.menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>

          <SheetContent side="left" className="w-72 bg-background">
            <div className="flex flex-col gap-6">
              <Link to="/" className="flex items-center space-x-3">
                <img
                  src={logoSrc}
                  alt="Logo"
                  className="h-10 w-auto"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = inhalestaysLogo;
                  }}
                />
                <span className="font-bold text-foreground">{settings.siteName}</span>
              </Link>
              
              <div className="flex flex-col gap-2">
                {navLinks.filter(link => link.show).map((link) => (
                  <Link
                    key={link.href}
                    to={link.href}
                    className={cn(
                      "px-4 py-3 text-sm font-medium rounded-lg transition-colors",
                      isActive(link)
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    )}
                  >
                    {link.label}
                  </Link>
                ))}
                
                {isAuthenticated ? (
                  <Link
                    to={user?.role === "admin" || user?.role === 'vendor' || user?.role === 'vendor_employee'
                      ? "/admin/dashboard"
                      : "/student/dashboard"}
                    className={cn(
                      "px-4 py-3 text-sm font-medium rounded-lg transition-colors",
                      pathname.startsWith("/admin/") || pathname === "/student/dashboard"
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    )}
                  >
                    Dashboard
                  </Link>
                ) : (
                  <div className="flex flex-col gap-2 pt-4 border-t border-border">
                    <Link to="/student/login">
                      <Button variant="outline" className="w-full justify-start">
                        Login
                      </Button>
                    </Link>
                    <Link to="/vendor/login">
                      <Button variant="outline" className="w-full justify-start">
                        Vendor
                      </Button>
                    </Link>
                    <Link to="/student/register">
                      <Button className="w-full justify-start">Register</Button>
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </SheetContent>
        </Sheet>

        {/* Right Side Actions */}
        <div className="ml-auto flex items-center space-x-3">
          {isAuthenticated ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-9 w-9 p-0 rounded-full">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={user?.profileImage} />
                    <AvatarFallback className="bg-primary text-primary-foreground font-medium">
                      {user?.name?.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {user?.role === "admin" || user?.role === 'vendor' || user?.role === 'vendor_employee' ? (
                  <Link to="/admin/dashboard">
                    <DropdownMenuItem>
                      {user?.role === "admin" ? 'Admin' : 'Manager'} Dashboard
                    </DropdownMenuItem>
                  </Link>
                ) : (
                  <>
                    <Link to="/student/dashboard">
                      <DropdownMenuItem>Dashboard</DropdownMenuItem>
                    </Link>
                    <Link to="/student/profile">
                      <DropdownMenuItem>Profile</DropdownMenuItem>
                    </Link>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => logout()} className="text-destructive">
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="hidden md:flex items-center gap-2">
              <Link to="/student/login">
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                  Login
                </Button>
              </Link>
              <Link to="/student/register">
                <Button size="sm" className="bg-primary hover:bg-primary/90">
                  Get Started
                </Button>
              </Link>
            </div>
          )}
        </div>
      </nav>
    </header>
  );
}
