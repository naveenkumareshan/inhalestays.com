
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { BedDouble } from 'lucide-react';
import { formatCurrency } from '@/utils/currency';

interface BedData {
  id: string;
  bed_number: number;
  is_available: boolean;
  is_blocked: boolean;
  is_future_booked?: boolean;
  room_id: string;
  sharing_option_id: string;
  sharingType?: string;
  price?: number;
  category?: string | null;
  price_override?: number | null;
  amenities?: string[];
  occupantName?: string;
}

interface RoomGroup {
  roomId: string;
  roomNumber: string;
  category: string;
  beds: BedData[];
}

interface HostelFloorViewProps {
  floorNumber: number;
  rooms: RoomGroup[];
  selectedBedId?: string | null;
  onBedSelect?: (bed: BedData) => void;
  readOnly?: boolean;
  sharingFilter?: string;
  categoryFilter?: string;
  roomFilter?: string;
}

export const HostelFloorView: React.FC<HostelFloorViewProps> = ({
  floorNumber,
  rooms,
  selectedBedId,
  onBedSelect,
  readOnly = false,
  sharingFilter,
  categoryFilter,
  roomFilter,
}) => {
  const filteredRooms = roomFilter && roomFilter !== 'all'
    ? rooms.filter(r => r.roomId === roomFilter)
    : rooms;
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
        Floor {floorNumber}
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredRooms.map((room) => {
          const totalBeds = room.beds.length;
          const availableBeds = room.beds.filter(b => b.is_available && !b.is_blocked).length;
          const occupancyPercent = totalBeds > 0 ? ((totalBeds - availableBeds) / totalBeds) * 100 : 0;

          return (
            <div
              key={room.roomId}
              className="border rounded-xl p-4 bg-card"
            >
              {/* Room header */}
              <div className="flex items-center justify-between mb-3">
                <div>
                  <span className="font-semibold text-sm">Room {room.roomNumber}</span>
                  <Badge variant="outline" className="ml-2 text-[10px]">
                    {room.category}
                  </Badge>
                </div>
                <span className="text-xs text-muted-foreground">
                  {availableBeds}/{totalBeds} available
                </span>
              </div>

              {/* Occupancy bar */}
              <Progress value={occupancyPercent} className="h-1.5 mb-3" />

              {/* Bed grid */}
              <TooltipProvider>
                <div className="grid grid-cols-5 sm:grid-cols-6 gap-2">
                  {room.beds.map((bed) => {
                    const isSelected = selectedBedId === bed.id;
                    const isAvailable = bed.is_available && !bed.is_blocked;

                    // Check if bed matches the active filters
                    const matchesSharing = !sharingFilter || sharingFilter === 'all' || bed.sharingType?.toLowerCase() === sharingFilter.toLowerCase();
                    const matchesCategory = !categoryFilter || categoryFilter === 'all' || (bed.category || '').toLowerCase() === categoryFilter.toLowerCase();
                    const matchesFilter = matchesSharing && matchesCategory;
                    const isDisabledByFilter = !matchesFilter;

                    let bgClass = 'bg-emerald-50 border-emerald-400 text-emerald-800 hover:bg-emerald-100';
                    if (isSelected) bgClass = 'bg-primary border-primary text-primary-foreground ring-2 ring-primary/30';
                    else if (isDisabledByFilter) bgClass = 'bg-muted/50 border-border/50 text-muted-foreground/40';
                    else if (bed.is_future_booked) bgClass = 'bg-violet-50 border-violet-400 text-violet-800';
                    else if (!isAvailable) bgClass = 'bg-blue-50 border-blue-400 text-blue-800';

                    const canSelect = !readOnly && isAvailable && matchesFilter;
                    const effectivePrice = bed.price_override ?? bed.price ?? 0;

                    return (
                      <Tooltip key={bed.id}>
                        <TooltipTrigger asChild>
                          <button
                            className={`flex flex-col items-center justify-center rounded-lg border p-2 text-[10px] font-bold transition-all ${bgClass} ${
                              canSelect ? 'cursor-pointer' : readOnly ? 'cursor-default' : 'cursor-not-allowed'
                            }`}
                            onClick={() => {
                              if (canSelect && onBedSelect) {
                                onBedSelect(bed);
                              }
                            }}
                            disabled={!canSelect && !readOnly}
                          >
                            <BedDouble className="h-3.5 w-3.5 mb-0.5" />
                            {bed.bed_number}
                            {bed.category && (
                              <span className="text-[8px] font-normal opacity-70 mt-0.5">{bed.category}</span>
                            )}
                          </button>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-[220px]">
                          <div className="text-xs space-y-1.5">
                            <div className="flex items-center justify-between gap-3">
                              <p className="font-bold">Bed #{bed.bed_number}</p>
                              <Badge variant={isSelected ? 'default' : isAvailable ? 'outline' : 'secondary'} className="text-[9px] px-1.5 py-0">
                                {isDisabledByFilter ? 'Filtered' : isAvailable ? 'Available' : 'Not Available'}
                              </Badge>
                            </div>
                            <div className="space-y-0.5 text-muted-foreground">
                              <p>Room {room.roomNumber} · Floor {floorNumber}</p>
                              {bed.sharingType && <p>Type: {bed.sharingType}</p>}
                              {bed.category && <p>Category: {bed.category}</p>}
                              <p className="font-medium text-foreground">{formatCurrency(effectivePrice)}/month</p>
                            </div>
                            {bed.occupantName && (
                              <p className="text-muted-foreground">Guest: {bed.occupantName}</p>
                            )}
                            {bed.amenities && bed.amenities.length > 0 && (
                              <div className="flex flex-wrap gap-1 pt-0.5">
                                {bed.amenities.map((a) => (
                                  <span key={a} className="inline-flex items-center text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                                    {a}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>
              </TooltipProvider>
            </div>
          );
        })}
      </div>
    </div>
  );
};
