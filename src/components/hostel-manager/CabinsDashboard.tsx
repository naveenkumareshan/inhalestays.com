
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { hostelManagerService } from '@/api/hostelManagerService';
import { Input } from '@/components/ui/input';
import { Plus, Search, Star, BarChart3 } from 'lucide-react';

interface Cabin {
  _id: string;
  id: string;
  name: string;
  description: string;
  category: string;
  price: number;
  capacity: number;
  imageUrl: string;
  amenities: string[];
  isActive: boolean;
  averageRating?: number;
  reviewCount?: number;
  totalSeats?: number;
  availableSeats?: number;
  activeBookings?: number;
}

interface CabinStats {
  totalRevenue: number;
  monthlyRevenue: number;
  totalSeats: number;
  availableSeats: number;
  occupiedSeats: number;
  occupancyRate: number;
  totalBookings: number;
  activeBookings: number;
  completedBookings: number;
}

export function CabinsDashboard() {
  const navigate = useNavigate();
  const [cabins, setCabins] = useState<Cabin[]>([]);
  const [stats, setStats] = useState<CabinStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch managed cabins
      const cabinsResponse = await hostelManagerService.getManagedCabins();
      
      if (cabinsResponse.success && cabinsResponse.data) {
        const mapped: Cabin[] = (cabinsResponse.data as any[]).map((c: any) => ({
          _id: c.id,
          id: c.id,
          name: c.name || '',
          description: c.description || '',
          category: c.category || 'standard',
          price: Number(c.price) || 0,
          capacity: c.capacity || 0,
          imageUrl: c.image_url || '',
          amenities: c.amenities || [],
          isActive: c.is_active ?? true,
        }));
        setCabins(mapped);
      }
      
      // Fetch revenue stats
      const revenueResponse = await hostelManagerService.getCabinRevenueStats();
      const bookingStatsResponse = await hostelManagerService.getCabinBookingStats();
      const seatsStatsResponse = await hostelManagerService.getCabinSeatsStats();
      
      if (revenueResponse.success && bookingStatsResponse.success && seatsStatsResponse.success) {
        const rev = revenueResponse.data as any;
        const bk = bookingStatsResponse.data as any;
        const seats = seatsStatsResponse.data as any;
        const totalSeats = seats?.total || 0;
        const occupiedSeats = seats?.occupied || 0;
        setStats({
          totalRevenue: rev?.totalRevenue || 0,
          monthlyRevenue: rev?.totalRevenue || 0,
          totalSeats,
          availableSeats: seats?.available || 0,
          occupiedSeats,
          occupancyRate: totalSeats > 0 ? Math.round((occupiedSeats / totalSeats) * 100) : 0,
          totalBookings: bk?.total || 0,
          activeBookings: bk?.active || 0,
          completedBookings: 0,
        });
      }
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddCabin = () => {
    navigate("/hostel-manager/cabins/new");
  };

  const handleViewCabin = (cabinId: string) => {
    navigate(`/hostel-manager/cabins/${cabinId}`);
  };

  const handleViewBookings = (cabinId: string) => {
    navigate(`/hostel-manager/cabins/${cabinId}/bookings`);
  };

  // Filter cabins based on search query and active tab
  const filteredCabins = cabins.filter(cabin => {
    const matchesSearch = 
      cabin.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cabin.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cabin.category.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesTab = 
      activeTab === "all" || 
      (activeTab === "active" && cabin.isActive) ||
      (activeTab === "inactive" && !cabin.isActive);
    
    return matchesSearch && matchesTab;
  });

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-muted-foreground">Total Revenue</p>
                  <p className="text-2xl font-bold">₹{stats.totalRevenue?.toLocaleString()}</p>
                </div>
                <BarChart3 className="h-8 w-8 text-primary opacity-75" />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                ₹{stats.monthlyRevenue?.toLocaleString()} this month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-muted-foreground">Occupancy Rate</p>
                  <p className="text-2xl font-bold">{stats.occupancyRate}%</p>
                </div>
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                  <span className="text-primary text-sm font-bold">{stats.occupiedSeats}/{stats.totalSeats}</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {stats.availableSeats} seats available
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-muted-foreground">Active Bookings</p>
                  <p className="text-2xl font-bold">{stats.activeBookings}</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {stats.totalBookings} total bookings
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-muted-foreground">Total Cabins</p>
                  <p className="text-2xl font-bold">{cabins.length}</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {cabins.filter(c => c.isActive).length} active cabins
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Cabins List */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row justify-between items-center pb-4">
          <CardTitle>My Reading Rooms</CardTitle>
          <div className="flex gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input 
                placeholder="Search cabins..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-64 pl-10"
              />
            </div>
            <Button onClick={handleAddCabin} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Cabin
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="mb-6">
            <TabsList>
              <TabsTrigger value="all">All Cabins</TabsTrigger>
              <TabsTrigger value="active">Active</TabsTrigger>
              <TabsTrigger value="inactive">Inactive</TabsTrigger>
            </TabsList>
          </Tabs>

          {loading ? (
            <div className="flex justify-center p-8">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
            </div>
          ) : filteredCabins.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {searchQuery ? "No cabins matching your search" : "No cabins found. Add your first reading room!"}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCabins.map(cabin => (
                <Card key={cabin._id} className="overflow-hidden hover:shadow-md transition-shadow">
                  <div className="h-48 relative">
                    <img 
                      src={cabin.imageUrl || 'https://images.unsplash.com/photo-1626948683838-3be9a4e90737?q=80&w=1470&auto=format&fit=crop'}
                      alt={cabin.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 left-2">
                      <Badge className={`
                        ${cabin.category === 'standard' ? 'bg-blue-500' : 
                          cabin.category === 'premium' ? 'bg-purple-500' : 
                          'bg-amber-500'} text-white
                      `}>
                        {cabin.category.charAt(0).toUpperCase() + cabin.category.slice(1)}
                      </Badge>
                    </div>
                    
                    {!cabin.isActive && (
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                        <Badge className="bg-red-500 text-white">Inactive</Badge>
                      </div>
                    )}
                  </div>
                  
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <h3 className="font-medium text-lg">{cabin.name}</h3>
                      {cabin.averageRating && cabin.averageRating > 0 && (
                        <div className="flex items-center">
                          <Star className="h-4 w-4 text-yellow-400 fill-yellow-400 mr-1" />
                          <span className="text-sm">{cabin.averageRating.toFixed(1)}</span>
                          <span className="text-xs text-muted-foreground ml-1">({cabin.reviewCount})</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex justify-between items-center text-sm text-muted-foreground mt-1 mb-3">
                      <span>₹{cabin.price}/month</span>
                      <span>Capacity: {cabin.capacity || 1}</span>
                    </div>
                    
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                      {cabin.description}
                    </p>
                    
                    {(cabin.totalSeats !== undefined || cabin.availableSeats !== undefined || cabin.activeBookings !== undefined) && (
                      <div className="flex justify-between items-center text-xs text-muted-foreground mb-4 bg-accent/30 p-2 rounded">
                        {cabin.totalSeats !== undefined && <span>Total: {cabin.totalSeats} seats</span>}
                        {cabin.availableSeats !== undefined && <span>Free: {cabin.availableSeats}</span>}
                        {cabin.activeBookings !== undefined && <span>Booked: {cabin.activeBookings}</span>}
                      </div>
                    )}
                    
                    <div className="flex space-x-2">
                      <Button variant="default" size="sm" onClick={() => handleViewCabin(cabin._id)}>
                        Manage Seats
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleViewBookings(cabin._id)}>
                        View Bookings
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
