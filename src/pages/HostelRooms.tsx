
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { hostelService } from '@/api/hostelService';
import { roomSharingService, HostelAvailability } from '@/api/roomSharingService';
import { useToast } from '@/hooks/use-toast';
import { Bed } from 'lucide-react';
import { isUUID } from '@/utils/idUtils';

export default function HostelRooms() {
  const { hostelId } = useParams<{ hostelId: string }>();
  const [hostelData, setHostelData] = useState<HostelAvailability | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!hostelId) return;
    
    const fetchData = async () => {
      try {
        setLoading(true);
        // Resolve serial number to UUID if needed
        let resolvedId = hostelId;
        if (!isUUID(hostelId)) {
          const hostelData = await (await import('@/api/hostelService')).hostelService.getHostelBySerialNumber(hostelId);
          resolvedId = hostelData.id;
        }
        const data = await roomSharingService.getHostelAvailability(resolvedId!);
        setHostelData(data);
      } catch (err: any) {
        console.error('Error fetching hostel data:', err);
        setError(err.message || 'Failed to fetch hostel data');
        toast({
          title: 'Error',
          description: 'Failed to load hostel data',
          variant: 'destructive'
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [hostelId, toast]);

  const handleBookRoom = (roomId: string, sharingType: string) => {
    navigate(`/book-shared-room/${roomId}?sharingType=${sharingType}`);
  };

  if (loading) {
    return (
      <div className="container mx-auto py-10">
        <div className="text-center">Loading hostel information...</div>
      </div>
    );
  }

  if (error || !hostelData) {
    return (
      <div className="container mx-auto py-10">
        <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              {error || 'Failed to load hostel data. Please try again later.'}
            </AlertDescription>
        </Alert>
      </div>
    );
  }

  const { hostel, roomsAvailability } = hostelData;

  return (
    <div>
      <div className="container mx-auto py-10">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">{hostel.name}</h1>
            <p className="text-gray-500">{hostel.location}</p>
          </div>
          <Button onClick={() => navigate('/hostels')}>Back to Hostels</Button>
        </div>

        {hostel.description && (
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-2">About this Hostel</h2>
            <p>{hostel.description}</p>
          </div>
        )}

        <Separator className="my-6" />

        <h2 className="text-2xl font-bold mb-4">Available Rooms</h2>
        
        {roomsAvailability.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">No rooms available at this hostel.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {roomsAvailability.map((room) => (
              <Card key={room.roomId} className="overflow-hidden">
                <CardHeader className="bg-muted">
                  <CardTitle className="flex justify-between items-center">
                    <span>{room.roomName}</span>
                    <Badge variant={room.roomType === 'luxury' ? 'default' : 'outline'}>
                      {room.roomType}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <h3 className="text-lg font-semibold mb-4">Sharing Options</h3>
                  <div className="space-y-4">
                    {Object.entries(room.sharingAvailability).map(([type, info]) => (
                      <div 
                        key={type} 
                        className="border rounded-lg p-4 flex flex-col md:flex-row justify-between items-start md:items-center"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <Bed className="h-5 w-5 text-primary" />
                            <span className="font-semibold capitalize">{type}</span>
                          </div>
                          <div className="mt-1 text-sm text-gray-500">
                            {info.available} of {info.total} beds available
                          </div>
                          <div className="mt-1 font-medium">
                            ₹{info.price} / month
                          </div>
                        </div>
                        <Button
                          onClick={() => handleBookRoom(room.roomId, type)}
                          disabled={info.available <= 0}
                          className="mt-2 md:mt-0"
                        >
                          {info.available > 0 ? 'Book Now' : 'Fully Booked'}
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
                <CardFooter className="bg-muted flex justify-between">
                  <span className="text-sm text-muted-foreground">
                    Room capacity varies by sharing option
                  </span>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
