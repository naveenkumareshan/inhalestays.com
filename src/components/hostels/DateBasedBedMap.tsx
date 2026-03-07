import React, { useState, useEffect } from 'react';
import { format, addDays, isBefore } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Download, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { HostelBedPlanViewer, ViewerBed } from './HostelBedPlanViewer';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/utils/currency';

interface DateBasedBedMapProps {
  hostelId: string;
}

export const DateBasedBedMap: React.FC<DateBasedBedMapProps> = ({ hostelId }) => {
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(addDays(new Date(), 30));
  const [startDateOpen, setStartDateOpen] = useState(false);
  const [endDateOpen, setEndDateOpen] = useState(false);
  const [rooms, setRooms] = useState<any[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [beds, setBeds] = useState<ViewerBed[]>([]);
  const [selectedBed, setSelectedBed] = useState<ViewerBed | null>(null);
  const [loading, setLoading] = useState(false);
  const [roomData, setRoomData] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    const fetchRooms = async () => {
      const { data } = await supabase
        .from('hostel_rooms')
        .select('id, room_number, floor, room_width, room_height, layout_image, layout_image_opacity')
        .eq('hostel_id', hostelId)
        .eq('is_active', true)
        .order('floor')
        .order('room_number');
      if (data?.length) {
        setRooms(data);
        setSelectedRoomId(data[0].id);
      }
    };
    fetchRooms();
  }, [hostelId]);

  const fetchAvailability = async () => {
    if (!selectedRoomId || !startDate || !endDate) return;
    setLoading(true);
    try {
      const room = rooms.find(r => r.id === selectedRoomId);
      setRoomData(room);

      const { data: allBeds } = await supabase
        .from('hostel_beds')
        .select('*, hostel_sharing_options(type, price_monthly)')
        .eq('room_id', selectedRoomId)
        .order('bed_number');

      // Get overlapping bookings
      const { data: bookings } = await supabase
        .from('hostel_bookings')
        .select('bed_id, start_date, end_date, status, serial_number, profiles:user_id(name)')
        .eq('hostel_id', hostelId)
        .in('status', ['confirmed', 'pending'])
        .lte('start_date', format(endDate, 'yyyy-MM-dd'))
        .gte('end_date', format(startDate, 'yyyy-MM-dd'));

      const bookingsByBed = new Map<string, any[]>();
      bookings?.forEach((b: any) => {
        const existing = bookingsByBed.get(b.bed_id) || [];
        existing.push(b);
        bookingsByBed.set(b.bed_id, existing);
      });

      const viewerBeds: ViewerBed[] = (allBeds || []).map((bed: any) => {
        const conflicts = bookingsByBed.get(bed.id) || [];
        return {
          id: bed.id,
          bed_number: bed.bed_number,
          position_x: bed.position_x || 0,
          position_y: bed.position_y || 0,
          is_available: !bed.is_blocked && conflicts.length === 0,
          is_blocked: bed.is_blocked,
          category: bed.category,
          price_override: bed.price_override,
          sharingType: bed.hostel_sharing_options?.type,
          sharingPrice: bed.hostel_sharing_options?.price_monthly,
          conflictingBookings: conflicts,
        };
      });

      setBeds(viewerBeds);
    } catch (error) {
      console.error('Error fetching bed availability:', error);
      toast({ title: 'Error', description: 'Failed to fetch availability', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAvailability(); }, [selectedRoomId, startDate, endDate]);

  const availableCount = beds.filter(b => b.is_available).length;
  const unavailableCount = beds.length - availableCount;

  const exportCSV = () => {
    const csvContent = [
      ['Bed #', 'Category', 'Type', 'Price', 'Available', 'Conflicts'].join(','),
      ...beds.map(b => [
        b.bed_number,
        b.category || '',
        b.sharingType || '',
        b.price_override ?? b.sharingPrice ?? 0,
        b.is_available ? 'Yes' : 'No',
        b.conflictingBookings?.length || 0,
      ].join(','))
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bed-availability-${format(startDate, 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Check if room has positioned beds (for floor plan vs grid fallback)
  const hasPositionedBeds = beds.some(b => b.position_x > 0 || b.position_y > 0);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Date-Based Bed Availability
            <Button onClick={exportCSV} variant="outline" size="sm"><Download className="h-4 w-4 mr-2" />Export CSV</Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-2">Room</label>
              <Select value={selectedRoomId} onValueChange={setSelectedRoomId}>
                <SelectTrigger><SelectValue placeholder="Select room" /></SelectTrigger>
                <SelectContent>
                  {rooms.map(r => <SelectItem key={r.id} value={r.id}>Room {r.room_number} (Floor {r.floor})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Start Date</label>
              <Popover open={startDateOpen} onOpenChange={setStartDateOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !startDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />{startDate ? format(startDate, 'PPP') : 'Select'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={startDate} onSelect={d => { if (d) setStartDate(d); setStartDateOpen(false); }} initialFocus /></PopoverContent>
              </Popover>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">End Date</label>
              <Popover open={endDateOpen} onOpenChange={setEndDateOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !endDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />{endDate ? format(endDate, 'PPP') : 'Select'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={endDate} onSelect={d => { if (d) setEndDate(d); setEndDateOpen(false); }} initialFocus disabled={d => isBefore(d, startDate)} /></PopoverContent>
              </Popover>
            </div>
          </div>
          <Button onClick={fetchAvailability} disabled={loading} className="mb-4">{loading ? 'Checking...' : 'Refresh'}</Button>
        </CardContent>
      </Card>

      <div className="flex gap-4 mb-4">
        <Badge variant="secondary">Available: {availableCount}</Badge>
        <Badge variant="destructive">Unavailable: {unavailableCount}</Badge>
        <Badge variant="outline">Total: {beds.length}</Badge>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>
      ) : hasPositionedBeds && roomData ? (
        <HostelBedPlanViewer
          beds={beds}
          roomWidth={roomData.room_width || 800}
          roomHeight={roomData.room_height || 600}
          onBedSelect={setSelectedBed}
          selectedBed={selectedBed}
          layoutImage={roomData.layout_image}
          layoutImageOpacity={roomData.layout_image_opacity || 30}
        />
      ) : (
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 gap-2">
              {beds.map(bed => {
                let bgClass = 'bg-emerald-50 border-emerald-400 text-emerald-800';
                if (bed.is_blocked) bgClass = 'bg-destructive/10 border-destructive/30 text-destructive';
                else if (!bed.is_available) bgClass = 'bg-blue-50 border-blue-400 text-blue-800';
                return (
                  <button key={bed.id} className={`flex flex-col items-center justify-center rounded-lg border p-2 text-[10px] font-bold cursor-pointer ${bgClass} ${selectedBed?.id === bed.id ? 'ring-2 ring-primary' : ''}`} onClick={() => setSelectedBed(bed)}>
                    {bed.bed_number}
                    {bed.category && <span className="text-[8px] font-normal opacity-70">{bed.category}</span>}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {selectedBed && selectedBed.conflictingBookings && selectedBed.conflictingBookings.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Conflicting Bookings for Bed #{selectedBed.bed_number}</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {selectedBed.conflictingBookings.map((booking: any, index: number) => (
                <div key={index} className="p-3 border rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{booking.serial_number || booking.bed_id}</span>
                    <Badge variant={booking.status === 'confirmed' ? 'default' : 'secondary'}>{booking.status}</Badge>
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {format(new Date(booking.start_date), 'dd MMM yyyy')} - {format(new Date(booking.end_date), 'dd MMM yyyy')}
                  </div>
                  {booking.profiles?.name && <div className="text-sm mt-1">Guest: {booking.profiles.name}</div>}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
