
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Navigation } from '@/components/Navigation';
import { DollarSign, Users, Calendar, MapPin, Settings, Eye, Banknote, MessageCircle } from 'lucide-react';
import { whatsappLeadService } from '@/api/whatsappLeadService';
import { getEffectiveOwnerId } from '@/utils/getEffectiveOwnerId';
import { supabase } from '@/integrations/supabase/client';

const VendorDashboard: React.FC = () => {
  // Mock data - replace with actual API calls
  const dashboardData = {
    totalRevenue: 125000,
    pendingPayout: 8500,
    activeBookings: 23,
    totalSeats: 48,
    availableSeats: 12,
    occupiedSeats: 36,
    properties: 3
  };

  return (
    <div className="min-h-screen bg-accent/30">
      <Navigation />
      
      <div className="container mx-auto px-4 py-4">
        <div className="flex flex-col md:flex-row justify-between items-center mb-4">
          <div>
            <h1 className="text-lg font-semibold text-cabin-dark">Partner Dashboard</h1>
            <p className="text-xs text-cabin-dark/70">Manage your properties and track earnings</p>
          </div>
          
          <div className="mt-2 md:mt-0 flex gap-2">
            <Link to="/vendor/seats">
              <Button variant="outline" size="sm" className="flex items-center gap-1.5 h-8 text-sm">
                <MapPin className="h-3.5 w-3.5" />
                Seats
              </Button>
            </Link>
            <Link to="/vendor/auto-payout-settings">
              <Button variant="outline" size="sm" className="flex items-center gap-1.5 h-8 text-sm">
                <Settings className="h-3.5 w-3.5" />
                Payout Settings
              </Button>
            </Link>
            <Link to="/vendor/payouts">
              <Button size="sm" className="flex items-center gap-1.5 h-8 text-sm">
                <Banknote className="h-3.5 w-3.5" />
                Payouts
              </Button>
            </Link>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <Card className="shadow-none border rounded-lg">
            <div className="p-3 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Revenue</p>
                <p className="text-xl font-bold mt-0.5">₹{dashboardData.totalRevenue.toLocaleString()}</p>
                <p className="text-[10px] text-muted-foreground">All time earnings</p>
              </div>
              <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
          </Card>

          <Card className="shadow-none border rounded-lg">
            <div className="p-3 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Pending Payout</p>
                <p className="text-xl font-bold mt-0.5">₹{dashboardData.pendingPayout.toLocaleString()}</p>
                <p className="text-[10px] text-muted-foreground">Available for withdrawal</p>
              </div>
              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
          </Card>

          <Card className="shadow-none border rounded-lg">
            <div className="p-3 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Active Bookings</p>
                <p className="text-xl font-bold mt-0.5">{dashboardData.activeBookings}</p>
                <p className="text-[10px] text-muted-foreground">Current occupancy</p>
              </div>
              <Users className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
          </Card>

          <Card className="shadow-none border rounded-lg">
            <div className="p-3 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Properties</p>
                <p className="text-xl font-bold mt-0.5">{dashboardData.properties}</p>
                <p className="text-[10px] text-muted-foreground">Total locations</p>
              </div>
              <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-4">
          <Card className="shadow-none border rounded-lg">
            <CardHeader className="pb-2 pt-3 px-4">
              <CardTitle className="text-sm font-semibold flex items-center justify-between">
                Seat Overview
                <Link to="/vendor/seats">
                  <Button variant="outline" size="sm" className="h-7 text-xs">
                    <Eye className="h-3 w-3 mr-1" />
                    View All
                  </Button>
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3 pt-0">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium">Total Seats</span>
                  <Badge variant="outline" className="text-xs">{dashboardData.totalSeats}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium">Occupied</span>
                  <Badge className="bg-red-100 text-red-800 text-xs">{dashboardData.occupiedSeats}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium">Available</span>
                  <Badge className="bg-green-100 text-green-800 text-xs">{dashboardData.availableSeats}</Badge>
                </div>
                <div className="w-full bg-muted rounded-full h-1.5">
                  <div 
                    className="bg-emerald-600 h-1.5 rounded-full" 
                    style={{ width: `${(dashboardData.occupiedSeats / dashboardData.totalSeats) * 100}%` }}
                  ></div>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  {Math.round((dashboardData.occupiedSeats / dashboardData.totalSeats) * 100)}% occupancy rate
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-none border rounded-lg">
            <CardHeader className="pb-2 pt-3 px-4">
              <CardTitle className="text-sm font-semibold">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3 pt-0">
              <div className="space-y-1.5">
                <Link to="/vendor/seats" className="block">
                  <Button variant="outline" size="sm" className="w-full justify-start h-8 text-sm">
                    <MapPin className="h-3.5 w-3.5 mr-2" />
                    Manage Seats
                  </Button>
                </Link>
                <Link to="/vendor/payouts" className="block">
                  <Button variant="outline" size="sm" className="w-full justify-start h-8 text-sm">
                    <DollarSign className="h-3.5 w-3.5 mr-2" />
                    Request Payout
                  </Button>
                </Link>
                <Link to="/vendor/auto-payout-settings" className="block">
                  <Button variant="outline" size="sm" className="w-full justify-start h-8 text-sm">
                    <Settings className="h-3.5 w-3.5 mr-2" />
                    Auto Payout Settings
                  </Button>
                </Link>
                <Link to="/vendor/profile" className="block">
                  <Button variant="outline" size="sm" className="w-full justify-start h-8 text-sm">
                    <Users className="h-3.5 w-3.5 mr-2" />
                    Update Profile
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      
      <footer className="bg-cabin-dark text-white py-6 mt-6">
        <div className="container mx-auto px-4">
          <div className="border-t border-white/20 mt-8 pt-8 text-center text-white/50 text-sm">
            <p>© 2025 Inhalestays. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default VendorDashboard;
