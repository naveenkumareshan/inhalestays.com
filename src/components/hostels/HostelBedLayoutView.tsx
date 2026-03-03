import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Layers } from 'lucide-react';
import { BedShapeIcon } from './BedShapeIcon';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { formatCurrency } from '@/utils/currency';

interface HostelBedLayoutViewProps {
  hostelId: string;
  selectedBedId?: string | null;
  onBedSelect?: (bed: any) => void;
  sharingFilter?: string;
  categoryFilter?: string;
  startDate?: string;
  endDate?: string;
}

interface RoomWithLayout {
  id: string;
  room_number: string;
  floor: number;
  room_width: number;
  room_height: number;
  layout_image: string | null;
  layout_image_opacity: number;
  beds: BedItem[];
}

interface BedItem {
  id: string;
  bed_number: number;
  position_x: number;
  position_y: number;
  rotation: number;
  is_available: boolean;
  is_blocked: boolean;
  room_id: string;
  sharing_option_id: string;
  sharingType: string;
  price: number;
  category: string | null;
  price_override: number | null;
  amenities: string[];
  occupantName?: string;
}

export const HostelBedLayoutView: React.FC<HostelBedLayoutViewProps> = ({
  hostelId,
  selectedBedId,
  onBedSelect,
  sharingFilter,
  categoryFilter,
  startDate,
  endDate,
}) => {
  const [loading, setLoading] = useState(true);
  const [roomsByFloor, setRoomsByFloor] = useState<Record<number, RoomWithLayout[]>>({});
  const [selectedFloor, setSelectedFloor] = useState<string>('');
  const [internalRoomFilter, setInternalRoomFilter] = useState<string>('all');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const { data: rooms } = await supabase
          .from('hostel_rooms')
          .select('id, room_number, floor, room_width, room_height, layout_image, layout_image_opacity')
          .eq('hostel_id', hostelId)
          .eq('is_active', true)
          .order('floor')
          .order('room_number');

        if (!rooms?.length) { setRoomsByFloor({}); setLoading(false); return; }

        const roomIds = rooms.map(r => r.id);

        const { data: beds } = await supabase
          .from('hostel_beds')
          .select('*, hostel_sharing_options(type, price_monthly)')
          .in('room_id', roomIds)
          .order('bed_number');

        // Use RPC to bypass RLS and see all users' bookings
        const { data: bookings } = await supabase.rpc('get_conflicting_hostel_bookings', {
          p_hostel_id: hostelId,
          p_start_date: startDate || null,
          p_end_date: endDate || null,
        });

        const bookingMap = new Map<string, string>();
        bookings?.forEach((b: any) => {
          bookingMap.set(b.bed_id, b.user_name || 'Occupied');
        });

        const grouped: Record<number, RoomWithLayout[]> = {};
        rooms.forEach(room => {
          if (!grouped[room.floor]) grouped[room.floor] = [];
          const roomBeds: BedItem[] = (beds || [])
            .filter(b => b.room_id === room.id)
            .map(b => ({
              id: b.id,
              bed_number: b.bed_number,
              position_x: b.position_x || 0,
              position_y: b.position_y || 0,
              rotation: (b as any).rotation || 0,
              is_available: b.is_available && !b.is_blocked && !bookingMap.has(b.id),
              is_blocked: b.is_blocked,
              room_id: b.room_id,
              sharing_option_id: b.sharing_option_id,
              sharingType: (b as any).hostel_sharing_options?.type || '',
              price: (b as any).hostel_sharing_options?.price_monthly || 0,
              category: (b as any).category || null,
              price_override: (b as any).price_override || null,
              amenities: (b as any).amenities || [],
              occupantName: bookingMap.get(b.id) || undefined,
            }));

          grouped[room.floor].push({
            id: room.id,
            room_number: room.room_number,
            floor: room.floor,
            room_width: room.room_width || 800,
            room_height: room.room_height || 600,
            layout_image: room.layout_image,
            layout_image_opacity: room.layout_image_opacity || 30,
            beds: roomBeds,
          });
        });

        setRoomsByFloor(grouped);
      } catch (error) {
        console.error('Error fetching layout view data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [hostelId, startDate, endDate]);

  const floors = Object.keys(roomsByFloor).map(Number).sort();

  useEffect(() => {
    if (floors.length > 0 && !selectedFloor) setSelectedFloor(String(floors[0]));
  }, [floors, selectedFloor]);

  useEffect(() => { setInternalRoomFilter('all'); }, [selectedFloor]);

  const currentFloorRooms = selectedFloor ? (roomsByFloor[Number(selectedFloor)] || []) : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40">
        <div className="animate-spin h-6 w-6 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (floors.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Layers className="h-10 w-10 mx-auto mb-2 opacity-50" />
        <p>No rooms or beds configured yet</p>
      </div>
    );
  }

  return (
    <div>
      <Tabs value={selectedFloor || String(floors[0])} onValueChange={setSelectedFloor}>
        <TabsList className="mb-2">
          {floors.map(floor => (
            <TabsTrigger key={floor} value={String(floor)} className="flex items-center gap-1">
              <Layers className="h-3.5 w-3.5" />
              Floor {floor}
            </TabsTrigger>
          ))}
        </TabsList>

        {currentFloorRooms.length > 1 && (
          <div className="flex gap-1.5 overflow-x-auto pb-2 no-scrollbar">
            <button
              onClick={() => setInternalRoomFilter('all')}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap border transition-all ${
                internalRoomFilter === 'all'
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-muted/50 text-muted-foreground border-border hover:border-primary/50'
              }`}
            >
              All Rooms
            </button>
            {currentFloorRooms.map(room => (
              <button
                key={room.id}
                onClick={() => setInternalRoomFilter(room.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap border transition-all ${
                  internalRoomFilter === room.id
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-muted/50 text-muted-foreground border-border hover:border-primary/50'
                }`}
              >
                Room {room.room_number}
              </button>
            ))}
          </div>
        )}

        {floors.map(floor => (
          <TabsContent key={floor} value={String(floor)}>
            <div className="space-y-4">
              {(roomsByFloor[floor] || [])
                .filter(room => internalRoomFilter === 'all' || internalRoomFilter === room.id)
                .map(room => (
                  <RoomLayoutCanvas
                    key={room.id}
                    room={room}
                    selectedBedId={selectedBedId}
                    onBedSelect={onBedSelect}
                    sharingFilter={sharingFilter}
                    categoryFilter={categoryFilter}
                  />
                ))}
            </div>
          </TabsContent>
        ))}
      </Tabs>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 text-[11px] mt-4 pt-3 border-t">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded border border-emerald-400 bg-emerald-50" />
          <span>Available</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded border border-blue-400 bg-blue-50" />
          <span>Not Available</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded border border-primary bg-primary" />
          <span>Selected</span>
        </div>
      </div>
    </div>
  );
};

/* ─── Room Layout Canvas ─── */
interface RoomLayoutCanvasProps {
  room: RoomWithLayout;
  selectedBedId?: string | null;
  onBedSelect?: (bed: any) => void;
  sharingFilter?: string;
  categoryFilter?: string;
}

const RoomLayoutCanvas: React.FC<RoomLayoutCanvasProps> = ({
  room,
  selectedBedId,
  onBedSelect,
  sharingFilter,
  categoryFilter,
}) => {
  const MAX_WIDTH = 350;
  const scale = Math.min(MAX_WIDTH / room.room_width, 1);
  const displayWidth = room.room_width * scale;
  const displayHeight = room.room_height * scale;

  const BED_W = 40;
  const BED_H = 52;

  // Auto-arrange beds at (0,0)
  const arrangedBeds = useMemo(() => {
    return room.beds.map((bed, idx) => {
      if (bed.position_x === 0 && bed.position_y === 0) {
        const cols = Math.floor(room.room_width / (BED_W + 20));
        const col = idx % Math.max(cols, 1);
        const row = Math.floor(idx / Math.max(cols, 1));
        return { ...bed, position_x: 20 + col * (BED_W + 20), position_y: 20 + row * (BED_H + 20) };
      }
      return bed;
    });
  }, [room.beds, room.room_width]);

  const getBedStatus = (bed: BedItem): 'available' | 'occupied' | 'blocked' | 'selected' => {
    if (selectedBedId === bed.id) return 'selected';
    if (bed.is_blocked || bed.occupantName) return 'occupied';
    if (!bed.is_available) return 'occupied';
    return 'available';
  };

  const isFilteredOut = (bed: BedItem) => {
    if (sharingFilter && sharingFilter !== 'all' && bed.sharingType !== sharingFilter) return true;
    if (categoryFilter && categoryFilter !== 'all' && bed.category !== categoryFilter) return true;
    return false;
  };

  return (
    <div className="border rounded-xl p-3 bg-card">
      <p className="text-xs font-semibold mb-2">Room {room.room_number}</p>
      <div
        className="relative border rounded-lg bg-muted/20 overflow-hidden mx-auto"
        style={{ width: displayWidth, height: displayHeight }}
      >
        {room.layout_image && (
          <img
            src={room.layout_image}
            alt="Room layout"
            className="absolute inset-0 w-full h-full object-contain pointer-events-none"
            style={{ opacity: room.layout_image_opacity / 100 }}
          />
        )}
        <TooltipProvider>
          {arrangedBeds.map(bed => {
            const filtered = isFilteredOut(bed);
            const status = getBedStatus(bed);
            const isClickable = !filtered && status !== 'occupied';
            const x = bed.position_x * scale;
            const y = bed.position_y * scale;
            const w = BED_W * scale;
            const h = BED_H * scale;

            return (
              <Tooltip key={bed.id}>
                <TooltipTrigger asChild>
                  <div
                    className={`absolute transition-all ${isClickable ? 'cursor-pointer hover:scale-110' : 'cursor-default'} ${filtered ? 'opacity-25' : ''}`}
                    style={{
                      left: x,
                      top: y,
                      width: w,
                      height: h,
                    }}
                    onClick={() => {
                      if (isClickable && onBedSelect) {
                        onBedSelect({
                          id: bed.id,
                          bed_number: bed.bed_number,
                          sharing_option_id: bed.sharing_option_id,
                          sharingType: bed.sharingType,
                          price: bed.price,
                          price_override: bed.price_override,
                          category: bed.category,
                          amenities: bed.amenities,
                        });
                      }
                    }}
                  >
                    <BedShapeIcon
                      width={w}
                      height={h}
                      rotation={bed.rotation}
                      status={filtered ? 'occupied' : status}
                      bedNumber={bed.bed_number}
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <div className="text-xs space-y-0.5">
                    <p className="font-bold">Bed #{bed.bed_number}</p>
                    {bed.sharingType && <p>Type: {bed.sharingType}</p>}
                    {bed.category && <p>Category: {bed.category}</p>}
                    <p>Price: {formatCurrency(bed.price_override ?? bed.price)}/mo</p>
                    <p>{status === 'selected' ? '✓ Selected' : status === 'available' ? '✅ Available' : '🔒 Not Available'}</p>
                    {bed.amenities?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {bed.amenities.map(a => (
                          <span key={a} className="px-1.5 py-0.5 bg-muted rounded text-[9px]">{a}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </TooltipProvider>
      </div>
    </div>
  );
};
