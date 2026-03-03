
import React, { useState, useEffect } from 'react';
import { getImageUrl } from '@/lib/utils';
import { useParams } from 'react-router-dom';
import { isUUID } from '@/utils/idUtils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { CabinManagement } from '@/components/admin/CabinManagement';
import { toast } from '@/hooks/use-toast';
import { hostelService } from '@/api/hostelService';
import ErrorBoundary from '../components/ErrorBoundary';
import { Bed, BedDouble, Building2, Eye, Edit, Image as ImageIcon } from 'lucide-react';
import { HostelRoomForm } from '@/components/admin/HostelRoomForm';
import { hostelRoomService, HostelRoomData } from '@/api/hostelRoomService';
import { RoomBedManagement } from '@/components/hostels/RoomBedManagement';

interface SharingOption {
  type: string;
  capacity: number;
  count: number;
  price: number;
  available: number;
  total: number;
}

interface Room {
  _id: string;
  id: string;
  name: string;
  description: string;
  category: 'standard' | 'premium' | 'luxury';
  price: number;
  imageSrc: string;
  images?: string[];
  sharingOptions: SharingOption[];
  hostelId: string;
  roomNumber: string;
  floor: string;
  basePrice: number;
  maxCapacity: number;
  isActive: boolean;
  amenities?: string[];
}

const HostelRoomView = () => {
  const { hostelId } = useParams<{ hostelId: string }>();
  const [hostel, setHostel] = useState<any>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeView, setActiveView] = useState('list');
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isImageGalleryOpen, setIsImageGalleryOpen] = useState(false);
  const [isBedManagementOpen, setIsBedManagementOpen] = useState(false);

  useEffect(() => {
    if (hostelId) {
      fetchHostelAndRooms();
    }
  }, [hostelId]);

  const fetchHostelAndRooms = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Resolve serial number to UUID if needed
      let resolvedId = hostelId!;
      if (!isUUID(hostelId!)) {
        const hostelData = await hostelService.getHostelBySerialNumber(hostelId!);
        resolvedId = hostelData.id;
      }
      
      // Fetch hostel details
      const hostelResponse = await hostelService.getHostelById(resolvedId) as any;
      if (hostelResponse) {
        setHostel(hostelResponse);
      } else {
        setError('Failed to load hostel details');
      }
      
      // Fetch hostel rooms
      const roomsResponse = await (hostelService as any).getHostelRooms?.(resolvedId) || await hostelRoomService.getHostelRooms(resolvedId);
      if (Array.isArray(roomsResponse)) {
        setRooms(roomsResponse as any);
      } else {
        setError('Failed to load hostel rooms');
      }
    } catch (error) {
      console.error('Error fetching hostel data:', error);
      setError('Failed to load hostel data');
      toast({
        title: "Error",
        description: "Failed to load hostel data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleViewRoomDetails = (room: Room) => {
    setSelectedRoom(room);
    setIsDetailsOpen(true);
  };

  const handleEditRoom = (room: Room) => {
    setSelectedRoom(room);
    setIsEditOpen(true);
  };

  const handleManageBeds = (room: Room) => {
    setSelectedRoom(room);
    setIsBedManagementOpen(true);
  };

  const handleRoomUpdated = () => {
    setIsEditOpen(false);
    fetchHostelAndRooms();
    toast({
      title: "Success",
      description: "Room updated successfully"
    });
  };

  const handleOpenImageGallery = (room: Room, initialImage?: string) => {
    setSelectedRoom(room);
    setSelectedImage(initialImage || room.imageSrc);
    setIsImageGalleryOpen(true);
  };

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case 'luxury':
        return <Badge className="bg-purple-500">Luxury</Badge>;
      case 'premium':
        return <Badge className="bg-blue-500">Premium</Badge>;
      default:
        return <Badge className="bg-green-500">Standard</Badge>;
    }
  };

  return (
    <ErrorBoundary>
      <div className="container mx-auto p-6">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin h-8 w-8 border-4 border-cabin-wood border-t-transparent rounded-full"></div>
          </div>
        ) : error ? (
          <div className="text-center py-6 text-red-500">{error}</div>
        ) : (
          <>
            {/* Hostel Information */}
            <Card className="mb-6">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                  <CardTitle className="text-2xl font-bold">
                    {hostel?.name || 'Hostel Details'}
                  </CardTitle>
                  <p className="text-muted-foreground">{hostel?.location}</p>
                </div>
                <Button variant="outline" onClick={() => window.history.back()}>
                  Back
                </Button>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 mb-4">
                  {hostel?.logoImage ? (
                    <img 
                      src={getImageUrl(hostel.logoImage)} 
                      alt={hostel.name} 
                      className="h-16 w-16 object-cover rounded-lg" 
                    />
                  ) : (
                    <div className="h-16 w-16 bg-muted rounded-lg flex items-center justify-center">
                      <Building2 className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}
                  <div>
                    <h3 className="text-lg font-medium">{hostel?.name}</h3>
                    <p className="text-muted-foreground">{hostel?.description}</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">Contact Email</h4>
                    <p>{hostel?.contactEmail || 'Not provided'}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">Contact Phone</h4>
                    <p>{hostel?.contactPhone || 'Not provided'}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">Status</h4>
                    {hostel?.isActive ? (
                      <Badge className="bg-green-500">Active</Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground">Inactive</Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Rooms Management */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xl">Rooms in This Hostel</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs value={activeView} onValueChange={setActiveView} className="w-full">                  
                  <TabsContent value="list">
                    {rooms.length === 0 ? (
                      <div className="text-center py-12">
                        <Bed className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                        <h3 className="text-lg font-medium mb-2">No Rooms Found</h3>
                        <p className="text-muted-foreground mb-6">
                          This hostel doesn't have any rooms yet.
                        </p>
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Room Name</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Sharing Options</TableHead>
                            <TableHead>Price Range</TableHead>
                            <TableHead>Bed Status</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {rooms.map((room) => (
                            <TableRow key={room._id}>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <div 
                                    className="h-10 w-10 rounded overflow-hidden cursor-pointer"
                                    onClick={() => handleOpenImageGallery(room)}
                                  >
                                    {room.imageSrc ? (
                                      <img src={getImageUrl(room.imageSrc)} alt={room.name} className="h-full w-full object-cover" />
                                    ) : (
                                      <div className="h-full w-full bg-muted flex items-center justify-center">
                                        <Bed className="h-5 w-5 text-muted-foreground" />
                                      </div>
                                    )}
                                  </div>
                                  <span className="font-medium">{room.name}</span>
                                  {room.images && room.images.length > 1 && (
                                    <Badge variant="outline" className="ml-2">
                                      <ImageIcon className="h-3 w-3 mr-1" />
                                      {room.images.length}
                                    </Badge>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                {getCategoryBadge(room.category)}
                              </TableCell>
                              <TableCell>
                                {room.sharingOptions?.length ? (
                                  <div className="flex flex-col gap-1">
                                    {room.sharingOptions.map((option, idx) => (
                                      <span key={idx} className="text-sm">
                                        {option.type} ({option.available}/{option.total} available)
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground">No options defined</span>
                                )}
                              </TableCell>
                              <TableCell>
                                {room.sharingOptions?.length ? (
                                  <>
                                    ₹{Math.min(...room.sharingOptions.map(opt => opt.price))} - 
                                    ₹{Math.max(...room.sharingOptions.map(opt => opt.price))}
                                  </>
                                ) : (
                                  `₹${room.price}`
                                )}
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="flex items-center gap-1"
                                  onClick={() => handleManageBeds(room)}
                                >
                                  <BedDouble className="h-4 w-4" />
                                  Manage Beds
                                </Button>
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="flex items-center gap-1"
                                    onClick={() => handleViewRoomDetails(room)}
                                  >
                                    <Eye className="h-4 w-4" />
                                    View
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="flex items-center gap-1"
                                    onClick={() => handleEditRoom(room)}
                                  >
                                    <Edit className="h-4 w-4" />
                                    Edit
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </>
        )}
        
        {/* Room Details Dialog */}
        <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Room Details</DialogTitle>
            </DialogHeader>
            {selectedRoom && (
              <div className="space-y-6">
                <div className="flex flex-col md:flex-row gap-6">
                  <div className="md:w-1/3">
                    <div 
                      className="aspect-square rounded-md overflow-hidden bg-muted cursor-pointer"
                      onClick={() => handleOpenImageGallery(selectedRoom)}
                    >
                      {selectedRoom.imageSrc ? (
                        <img 
                          src={getImageUrl(selectedRoom.imageSrc)} 
                          alt={selectedRoom.name} 
                          className="w-full h-full object-cover" 
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Bed className="h-16 w-16 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    
                    {/* Image thumbnails */}
                    {selectedRoom.images && selectedRoom.images.length > 1 && (
                      <div className="mt-3 grid grid-cols-4 gap-2">
                        {selectedRoom.images.slice(0, 4).map((img, index) => (
                          <div 
                            key={index}
                            className="aspect-square rounded-md overflow-hidden bg-muted cursor-pointer"
                            onClick={() => handleOpenImageGallery(selectedRoom, img)}
                          >
                            <img 
                              src={getImageUrl(img)} 
                              alt={`${selectedRoom.name} image ${index + 1}`} 
                              className="w-full h-full object-cover" 
                            />
                          </div>
                        ))}
                        {selectedRoom.images.length > 4 && (
                          <div 
                            className="aspect-square rounded-md overflow-hidden bg-black/70 cursor-pointer flex items-center justify-center text-white"
                            onClick={() => handleOpenImageGallery(selectedRoom)}
                          >
                            +{selectedRoom.images.length - 4}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div className="md:w-2/3 space-y-4">
                    <div>
                      <h3 className="text-2xl font-bold">{selectedRoom.name}</h3>
                      {getCategoryBadge(selectedRoom.category)}
                    </div>
                    
                    <p className="text-muted-foreground">{selectedRoom.description}</p>
                    
                    <div className="space-y-3">
                      <h4 className="text-lg font-medium">Sharing Options</h4>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Type</TableHead>
                            <TableHead>Capacity</TableHead>
                            {/* <TableHead>Count</TableHead> */}
                            <TableHead>Price</TableHead>
                            <TableHead>Availability</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedRoom.sharingOptions?.map((option, idx) => (
                            <TableRow key={idx}>
                              <TableCell className="font-medium">{option.type}</TableCell>
                              <TableCell>{option.capacity}</TableCell>
                              {/* <TableCell>{option.count}</TableCell> */}
                              <TableCell>₹{option.price}</TableCell>
                              <TableCell>
                                <Badge className={option.available > 0 ? "bg-green-500" : "bg-red-500"}>
                                  {option.available}/{option.total}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Room Edit Dialog */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Edit Room</DialogTitle>
              <DialogDescription>
                Update the room details and sharing options for this hostel.
              </DialogDescription>
            </DialogHeader>
            {selectedRoom && (
              <HostelRoomForm 
                initialData={selectedRoom as any} 
                hostelId={hostelId!} 
                roomId={selectedRoom._id || selectedRoom.id} 
                onSuccess={handleRoomUpdated} 
              />
            )}
          </DialogContent>
        </Dialog>

        {/* Image Gallery Dialog */}
        <Dialog open={isImageGalleryOpen} onOpenChange={setIsImageGalleryOpen}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Room Images</DialogTitle>
            </DialogHeader>
            {selectedRoom && (
              <div className="space-y-6">
                {/* Main Selected Image */}
                <div className="w-full aspect-video bg-muted rounded-lg overflow-hidden">
                  {selectedImage ? (
                    <img 
                      src={getImageUrl(selectedImage)} 
                      alt={selectedRoom.name}
                      className="w-full h-full object-contain" 
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Bed className="h-16 w-16 text-muted-foreground" />
                    </div>
                  )}
                </div>

                {/* Thumbnails */}
                {selectedRoom.images && selectedRoom.images.length > 0 && (
                  <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                    {selectedRoom.images.map((img, index) => (
                      <div 
                        key={index} 
                        onClick={() => setSelectedImage(img)}
                        className={`aspect-square rounded-md overflow-hidden cursor-pointer ${
                          selectedImage === img ? 'ring-2 ring-primary' : ''
                        }`}
                      >
                        <img 
                          src={getImageUrl(img)} 
                          alt={`Room image ${index + 1}`} 
                          className="w-full h-full object-cover" 
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Bed Management Dialog */}
        <Dialog open={isBedManagementOpen} onOpenChange={setIsBedManagementOpen}>
          <DialogContent className="max-w-5xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Bed Management</DialogTitle>
              <DialogDescription>
                Manage beds for {selectedRoom?.name} - Room {selectedRoom?.roomNumber}
              </DialogDescription>
            </DialogHeader>
            {selectedRoom && (
              <RoomBedManagement
                hostelId={hostelId!}
                roomId={selectedRoom._id || selectedRoom.id}
                roomNumber={selectedRoom.roomNumber}
                floor={selectedRoom.floor}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </ErrorBoundary>
  );
};

export default HostelRoomView;
