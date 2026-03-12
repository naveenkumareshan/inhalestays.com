import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { adminCabinsService } from '../api/adminCabinsService';
import { CabinItem } from '@/components/admin/CabinItem';
import { CabinEditor } from '@/components/admin/CabinEditor';
import { useNavigate } from 'react-router-dom';
import { Images, Plus, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { adminRoomsService } from '@/api/adminRoomsService';
import { useAuth } from '@/contexts/AuthContext';
import { vendorApprovalService } from '@/api/vendorApprovalService';

interface CabinData {
  _id: string;
  id: string;
  name: string;
  description: string;
  vendorId: any;
  address: string;
  price: number;
  capacity: number;
  amenities: string[];
  imageUrl: string;
  category: 'standard' | 'premium' | 'luxury';
  isActive?: boolean;
  isBookingActive?: boolean;
  serialNumber?: string;
  vendor?: {
    _id: string;
    businessName: string;
    vendorId: string;
  };
}

interface Vendor {
  id: string;
  serial_number: string | null;
  business_name: string;
}

interface RoomManagementProps {
  autoCreateNew?: boolean;
  onTriggerConsumed?: () => void;
}

const RoomManagement: React.FC<RoomManagementProps> = ({ autoCreateNew, onTriggerConsumed }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [cabins, setCabins] = useState<CabinData[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVendor, setSelectedVendor] = useState<string>('all');
  const [showEditor, setShowEditor] = useState(false);
  const [selectedCabin, setSelectedCabin] = useState<CabinData | null>(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(9); // 3x3 grid
  const [totalItems, setTotalItems] = useState(0);
  
  const isAdmin = user?.role === 'admin';
  
  useEffect(() => {
    fetchCabins();
    if (isAdmin) {
      fetchVendors();
    }
  }, [currentPage, selectedVendor, isAdmin]);

  // Auto-create new when triggered from parent
  useEffect(() => {
    if (autoCreateNew) {
      handleNewCabin();
      onTriggerConsumed?.();
    }
  }, [autoCreateNew]);
  
  const fetchVendors = async () => {
    try {
      // This would be a call to get all vendors
      const filters = {
        page: 1,
        limit: 50,
      };
      // For now, we'll extract unique vendors from cabins
      const response = await vendorApprovalService.getAllVendors(filters);
      if (response.success && response.data) {  
        setVendors(response.data?.data?.vendors);
      }
    } catch (err) {
      console.error('Error fetching vendors:', err);
    }
  };
  
  const fetchCabins = async () => {
    try {
      setLoading(true);
      setError('');
      
      const filters = {
        page: currentPage,
        limit: itemsPerPage,
        ...(selectedVendor !== 'all' && { vendorId: selectedVendor }),
        ...(searchQuery && { search: searchQuery }),
        ...(!isAdmin && user?.id && { partnerUserId: user.id })
      };
      
      const response = await adminCabinsService.getAllCabins(filters);
      
      if (response.success) {
        const processedCabins = (response.data || []).map((cabin: any) => ({
          ...cabin,
          _id: cabin.id,
          id: cabin.id,
          imageUrl: cabin.image_url || '/placeholder.svg',
          imageSrc: cabin.image_url || '/placeholder.svg',
          images: cabin.images || [],
          isActive: cabin.is_active !== false,
          isBookingActive: cabin.is_booking_active !== false,
          isPartnerVisible: cabin.is_partner_visible !== false,
        }));
        
        setCabins(processedCabins);
        setTotalItems(response.totalCount || processedCabins.length);
      } else {
              setError('Failed to fetch reading rooms');
        toast({
          title: "Error",
          description: "Failed to fetch reading rooms",
          variant: "destructive"
        });
      }
    } catch (err) {
      console.error('Error fetching cabins:', err);
      setError('Failed to fetch reading rooms');
      toast({
        title: "Error",
        description: "Failed to fetch reading rooms",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleNewCabin = () => {
    setSelectedCabin(null);
    setShowEditor(true);
  };

  const manualBooking = () => {
    navigate('/admin/manual-bookings');
  };
  
  const backToRooms = () => {
    setShowEditor(false);
    return;
  };

  const handleEditCabin = (cabin: CabinData) => {
    setSelectedCabin(cabin);
    setShowEditor(true);
  };
  
  const handleDeleteCabin = async (cabinId: string) => {
    if (!window.confirm('Are you sure you want to delete this reading room?')) {
      return;
    }
    
    try {
      const response = await adminCabinsService.deleteCabin(cabinId);
      
      if (response.success) {
        toast({
          title: "Success",
          description: "Reading Room deleted successfully"
        });
        
        setCabins(prevCabins => prevCabins.filter(cabin => cabin._id !== cabinId && cabin.id !== cabinId));
      } else {
        throw new Error(response.message || 'Failed to delete cabin');
      }
    } catch (error) {
      console.error('Error deleting cabin:', error);
      toast({
        title: "Error",
        description: String(error),
        variant: "destructive"
      });
    }
  };
  
  const handleSaveCabin = async (cabinData: any) => {
    try {
      let response;

      if (!cabinData) {
        backToRooms();
      } else {
        const cabinDataStore = {
          name: cabinData.name,
          description: cabinData.description,
          price: cabinData.price,
          lockerAvailable: cabinData?.lockerAvailable,
          lockerPrice: cabinData?.lockerPrice,
          isBookingActive: cabinData?.isBookingActive,
          capacity: cabinData.capacity,
          amenities: cabinData.amenities || [],
          category: cabinData.category,
          imageSrc: cabinData.images.length > 0 ? cabinData.images[0] : cabinData.imageUrl,
          images: cabinData.images,
          isActive: cabinData.isActive,
          created_by: cabinData.created_by || undefined,
          advanceBookingEnabled: cabinData.advanceBookingEnabled,
          advancePercentage: cabinData.advancePercentage,
          advanceFlatAmount: cabinData.advanceFlatAmount,
          advanceUseFlat: cabinData.advanceUseFlat,
          advanceValidityDays: cabinData.advanceValidityDays,
          advanceAutoCancel: cabinData.advanceAutoCancel,
          ownerDetails: {
            ownerName: cabinData.ownerName,
            ownerPhone: cabinData.ownerPhone,
            ownerEmail: cabinData.ownerEmail,
          },
          is24Hours: cabinData.is24Hours,
          slotsEnabled: cabinData.slotsEnabled,
          openingTime: cabinData.openingTime,
          closingTime: cabinData.closingTime,
          workingDays: cabinData.workingDays,
          location: {
            fullAddress: cabinData.fullAddress,
            city: cabinData.city,
            state: cabinData.state,
            pincode: cabinData.pincode,
            coordinates: {
              latitude: cabinData.latitude,
              longitude: cabinData.longitude
            },
            area: cabinData.area,
            locality: cabinData.locality,
            nearbyLandmarks: cabinData.nearbyLandmarks || []
          }
        };
        
        if (selectedCabin) {
          response = await adminCabinsService.updateCabin(selectedCabin.id || selectedCabin._id, cabinDataStore);
        } else {
          response = await adminCabinsService.createCabin(cabinDataStore);
        }
        
        if (response.success) {
          toast({
            title: "Success",
            description: selectedCabin ? "Reading Room updated successfully" : "Reading Room created successfully"
          });
          
          setShowEditor(false);
          fetchCabins();
        } else {
          throw new Error(response.message || `Failed to ${selectedCabin ? 'update' : 'create'} cabin`);
        }
      }
      
    } catch (error) {
      console.error('Error saving cabin:', error);
      toast({
        title: "Error",
        description: String(error),
        variant: "destructive"
      });
    }
  };
  
  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchCabins();
  };
  
  const handleVendorChange = (value: string) => {
    setSelectedVendor(value);
    setCurrentPage(1);
  };
  
  const handleCloseEditor = () => {
    setShowEditor(false);
    setSelectedCabin(null);
  };
  
  const handleManageSeats = (cabinId: string) => {
    const cabin = cabins.find(c => c._id === cabinId || c.id === cabinId);
    navigate(`/admin/cabins/${cabin?.serialNumber || cabinId}/seats`);
  };
  
  const handleToggleActive = async (roomId: string, isActive: boolean) => {
    try {
      const roomToUpdate = cabins.find(room => room._id === roomId);
      if (!roomToUpdate || !roomToUpdate._id) return;
      
      const response = await adminRoomsService.toggleRoomActive(roomToUpdate._id, isActive);
      if (!response.success) throw new Error(response.message);
      
      toast({
        title: isActive ? "Room Activated" : "Room Deactivated",
        description: `Room ${roomToUpdate.name} has been ${isActive ? 'activated' : 'deactivated'}`
      });
      fetchCabins();
    } catch (error) {
      console.error('Error toggling room status:', error);
      toast({
        title: "Error",
        description: "Failed to update room status",
        variant: "destructive"
      });
    }
  };

  const onToggleBooking = async (roomId: string, isBookingActive: boolean) => {
    try {
      const roomToUpdate = cabins.find(room => room._id === roomId);
      if (!roomToUpdate || !roomToUpdate._id) return;
      
      const response = await adminRoomsService.toggleBookingActive(roomToUpdate._id, isBookingActive);
      if (!response.success) throw new Error(response.message);
      
      toast({
        title: isBookingActive ? "Booking Enabled" : "Booking Paused",
        description: `Booking for ${roomToUpdate.name} has been ${isBookingActive ? 'enabled' : 'paused'}`
      });
      fetchCabins();
    } catch (error) {
      console.error('Error toggling booking status:', error);
      toast({
        title: "Error",
        description: "Failed to update booking status",
        variant: "destructive"
      });
    }
  };

  const onTogglePartnerVisible = async (roomId: string, isVisible: boolean) => {
    try {
      const roomToUpdate = cabins.find(room => room._id === roomId);
      if (!roomToUpdate || !roomToUpdate._id) return;
      
      const response = await adminRoomsService.togglePartnerVisible(roomToUpdate._id, isVisible);
      if (!response.success) throw new Error(response.message);
      
      toast({
        title: isVisible ? "Property Visible" : "Property Hidden",
        description: `${roomToUpdate.name} is now ${isVisible ? 'visible' : 'hidden'} in partner views`
      });
      fetchCabins();
    } catch (error) {
      console.error('Error toggling partner visibility:', error);
      toast({
        title: "Error",
        description: "Failed to update visibility",
        variant: "destructive"
      });
    }
  };

  // Filter cabins based on search query (client-side for current page)
  const filteredCabins = cabins.filter(cabin => 
    cabin.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    cabin.description.toLowerCase().includes(searchQuery.toLowerCase()) || 
    cabin.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Pagination calculations
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const renderPaginationButtons = () => {
    const buttons = [];
    const maxVisiblePages = 5;
    
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage < maxVisiblePages - 1) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      buttons.push(
        <Button
          key={i}
          variant={i === currentPage ? "default" : "outline"}
          size="sm"
          onClick={() => handlePageChange(i)}
          className="mx-1"
        >
          {i}
        </Button>
      );
    }

    return buttons;
  };
  
  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Reading Room Management</h1>
          <p className="text-muted-foreground text-xs mt-0.5">
            Configure and manage your reading room inventory.
          </p>
        </div>
        {!showEditor && isAdmin && (
          <Button onClick={handleNewCabin} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add New Room
          </Button>
        )}
      </div>

      {!showEditor ? (
        <Card className="shadow-sm">
          <CardHeader className="pb-4 border-b">
            <div className="flex flex-col md:flex-row gap-4">
              <form onSubmit={handleSearch} className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input 
                    placeholder="Search by name, category or description..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </form>
              {isAdmin && vendors.length > 0 && (
                <div className="w-full md:w-56">
                  <Select value={selectedVendor} onValueChange={handleVendorChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Filter by Vendor" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Partners</SelectItem>
                      {vendors.map((vendor) => (
                        <SelectItem key={vendor.id} value={vendor.id}>
                          {vendor.business_name} ({vendor.serial_number || vendor.id.slice(0,8)})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin h-7 w-7 border-2 border-primary border-t-transparent rounded-full"></div>
              </div>
            ) : error ? (
              <div className="text-center py-6 text-red-500">{error}</div>
            ) : filteredCabins.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                {searchQuery || selectedVendor !== 'all' ? 'No reading rooms found matching your criteria.' : 'No reading rooms found. Add your first reading room!'}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredCabins.map(cabin => (
                    <CabinItem
                      key={cabin._id}
                      cabin={cabin}
                      onToggleActive={handleToggleActive}
                      onToggleBooking={onToggleBooking}
                      onTogglePartnerVisible={onTogglePartnerVisible}
                      onEdit={() => handleEditCabin(cabin)}
                      onDelete={() => handleDeleteCabin(cabin._id)}
                      onManageSeats={() => handleManageSeats(cabin._id)}
                    />
                  ))}
                </div>
                
                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex flex-col sm:flex-row justify-between items-center mt-8 gap-4">
                    <div className="text-sm text-muted-foreground">
                      Showing {startItem} to {endItem} of {totalItems} results
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="flex items-center gap-1"
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Previous
                      </Button>
                      
                      <div className="flex items-center">
                        {renderPaginationButtons()}
                      </div>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="flex items-center gap-1"
                      >
                        Next
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        <CabinEditor
          onSave={handleSaveCabin}
          onCancel={backToRooms}
          existingCabin={selectedCabin}
          isAdmin={isAdmin}
        />
      )}
    </div>
  );
};

export default RoomManagement;
