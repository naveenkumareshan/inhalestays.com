
import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { CalendarIcon, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { adminRoomsService } from '@/api/adminRoomsService';
import { roomSharingService } from '@/api/roomSharingService';
import { bookingsService } from '@/api/bookingsService';

export default function BookSharedRoom() {
  const { roomId } = useParams<{ roomId: string }>();
  const [searchParams] = useSearchParams();
  const sharingType = searchParams.get('sharingType') || '';
  const navigate = useNavigate();
  const { toast } = useToast();

  const [room, setRoom] = useState<any>(null);
  const [sharingOption, setSharingOption] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Booking form state
  const [startDate, setStartDate] = useState<Date | undefined>(new Date());
  const [startDateOpen, setStartDateOpen] = useState(false);
  const [months, setMonths] = useState<number>(1);
  
  // Calculate end date based on start date and number of months
  const endDate = startDate && new Date(
    startDate.getFullYear(),
    startDate.getMonth() + months,
    startDate.getDate()
  );

  // Calculate total price
  const totalPrice = sharingOption ? sharingOption.price * months : 0;

  useEffect(() => {
    const fetchData = async () => {
      if (!roomId) return;
      
      try {
        setLoading(true);
        
        // Fetch room details
        const roomResponse = await (adminRoomsService as any).getRoomById(roomId);
        setRoom(roomResponse.data);
        
        // Fetch sharing options for this room
        const sharingResponse = await roomSharingService.getRoomSharingOptions(roomId);
        const options = sharingResponse.sharingOptions || {};
        
        // Find the specific sharing option
        if (options[sharingType]) {
          setSharingOption({
            ...options[sharingType],
            type: sharingType
          });
        } else {
          setError('Selected sharing option is not available for this room');
        }
      } catch (err: any) {
        console.error('Error fetching data:', err);
        setError(err.message || 'Failed to fetch room data');
        toast({
          title: 'Error',
          description: 'Failed to load room information',
          variant: 'destructive'
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [roomId, sharingType, toast]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomId || !startDate || !sharingOption) return;
    
    try {
      setSubmitting(true);
      
      const bookingData = {
        startDate: startDate.toISOString(),
        endDate: endDate?.toISOString() || '',
        months,
        totalPrice
      };
      
      const result = await roomSharingService.bookSharedRoom(roomId, sharingType, bookingData);
      
      toast({
        title: 'Booking Successful',
        description: 'Your room has been booked successfully!',
      });
      
      // Redirect to booking confirmation
      navigate('/confirmation');
    } catch (err: any) {
      console.error('Booking error:', err);
      setError(err.message || 'Failed to complete booking');
      toast({
        title: 'Booking Failed',
        description: err.message || 'There was a problem with your booking',
        variant: 'destructive'
      });
    } finally {
      setSubmitting(false);
    }
  };
  
  if (loading) {
    return (
      <div className="container mx-auto py-10 text-center">Loading...</div>
    );
  }
  
  if (error || !room || !sharingOption) {
    return (
      <div className="container mx-auto py-10">
        <Card>
          <CardHeader>
            <CardTitle>Error</CardTitle>
            <CardDescription>
              {error || 'Room or sharing option not found'}
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button onClick={() => navigate(-1)}>Go Back</Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <div className="container mx-auto py-10">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">Book Room</h1>
          
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>{room.name}</CardTitle>
              <CardDescription>
                {sharingType} - {sharingOption.sharingCapacity} people per room
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                <div>
                  <Label>Room Type</Label>
                  <div className="font-medium">{room.category}</div>
                </div>
                <div>
                  <Label>Price per Month</Label>
                  <div className="font-medium">₹{sharingOption.price}</div>
                </div>
                <div>
                  <Label>Available Beds</Label>
                  <div className="font-medium">{sharingOption.available} of {sharingOption.total}</div>
                </div>
                {room.description && (
                  <div>
                    <Label>Description</Label>
                    <div>{room.description}</div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Booking Details</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit}>
                <div className="grid gap-6">
                  <div className="grid gap-2">
                    <Label htmlFor="startDate">Start Date</Label>
                    <Popover open={startDateOpen} onOpenChange={setStartDateOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                          id="startDate"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {startDate ? format(startDate, 'PPP') : <span>Pick a date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={startDate}
                          onSelect={(d) => { setStartDate(d); setStartDateOpen(false); }}
                          initialFocus
                          disabled={(date) => date < new Date()}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="months">Duration (Months)</Label>
                    <div className="flex items-center space-x-2">
                      {[1, 3, 6, 12].map((option) => (
                        <Button
                          key={option}
                          type="button"
                          variant={months === option ? "default" : "outline"}
                          onClick={() => setMonths(option)}
                          className="flex-1"
                        >
                          {months === option && <Check className="mr-1 h-4 w-4" />}
                          {option} {option === 1 ? 'month' : 'months'}
                        </Button>
                      ))}
                    </div>
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="endDate">End Date</Label>
                    <Input 
                      id="endDate" 
                      value={endDate ? format(endDate, 'PPP') : ''} 
                      disabled 
                      className="bg-muted" 
                    />
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="totalPrice">Total Price</Label>
                    <div className="text-2xl font-bold">₹{totalPrice}</div>
                  </div>
                </div>
                
                <div className="mt-6 flex flex-col gap-2">
                  <Button type="submit" className="w-full" disabled={submitting}>
                    {submitting ? 'Processing...' : 'Confirm Booking'}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="w-full" 
                    onClick={() => navigate(-1)}
                    disabled={submitting}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
