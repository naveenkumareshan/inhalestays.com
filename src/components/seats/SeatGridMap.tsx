
import React, { useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TooltipProvider, Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { format } from 'date-fns';

import { AirVent, ToiletIcon, DoorOpen, MonitorPlay, Wind } from "lucide-react";
export interface Seat {
  _id: string;
  id: string;
  number: number;
  cabinId: string;
  position: {
    x: number;
    y: number;
  };
  isAvailable: boolean;
  isFutureBooked?: boolean;
  price: number;
  unavailableUntil?: string;
}

export interface RoomElement {
  id: string;
  type: string;
  position: {
    x: number;
    y: number;
  };
  rotation?: number; // Added rotation property
}

interface SeatGridMapProps {
  seats: Seat[];
  onSeatSelect: (seat: Seat) => void;
  selectedSeat: Seat | null;
  isAdmin: boolean;
  showDateInfo: boolean;
  dateRange:{start : Date, end: Date}
  readOnly?: boolean;
  rowCapacity?: number;
  roomElements?: RoomElement[];
}

export const SeatGridMap: React.FC<SeatGridMapProps> = ({
  seats,
  onSeatSelect,
  selectedSeat,
  isAdmin,
  showDateInfo,
  dateRange,
  readOnly = false,
  rowCapacity = 10,
  roomElements = []
}) => {
  const [hoveredSeat, setHoveredSeat] = useState<number | null>(null);
      // Map element types to their icons
  const elementIcons = {
    door: DoorOpen,
    bath: ToiletIcon,
    window: Wind,
    screen: MonitorPlay,
    AC: AirVent
  };

  const getSeatStatusColor = (seat: Seat) => {
    if (selectedSeat?._id === seat._id) return 'bg-emerald-100 text-emerald-800 border-2 border-emerald-400 hover:bg-emerald-200';
    
    if (!seat.isAvailable) {
      return 'bg-[#D3E4FD] text-blue-600 border-blue-200 cursor-not-allowed';
    }

    if (seat.isFutureBooked) {
      return 'bg-violet-100 text-violet-800 border-violet-400 hover:bg-violet-200';
    }
    
    return 'bg-[#d4f7c4] text-cabin-green border-cabin-green hover:bg-cabin-green/10';
  };

  // Render room elements (doors, washrooms, etc.) with rotation support
  const renderRoomElements = () => {
    return roomElements.map((element) => {
      let elementClass = 'absolute text-xs font-medium px-2 py-1 rounded rounded flex items-center space-x-2';
      
      // Apply different styles based on element type
      switch (element.type) {
        case 'door':
          elementClass += ' bg-cabin-green/20 text-cabin-green';
          break;
        case 'bath':
          elementClass += ' bg-blue-100 text-blue-800';
          break;
        case 'window':
          elementClass += ' bg-sky-100 text-sky-800 border border-sky-200';
          break;
        case 'screen':
          elementClass += ' bg-gray-100 text-gray-800 border border-gray-200';
          break;
        case 'AC':
          elementClass += ' bg-gray-100 text-gray-800 border border-gray-200';
          break;
        case 'washroom':
          elementClass += ' bg-blue-100 text-blue-800';
          break;
        case 'entrance':
          elementClass += ' bg-cabin-green/20 text-cabin-green';
          break;
        default:
          elementClass += ' bg-white/80 border text-gray-800';
      }
      
      // Get display text for element type
      const elementLabel = 
        element.type === 'entrance' ? 'Entrance' : 
        element.type === 'door' ? 'Door' : 
        element.type === 'washroom' ? 'Washroom' : 
        element.type === 'bath' ? 'Bathroom' : 
        element.type === 'window' ? 'Window' : 
        element.type === 'screen' ? 'Screen' :
        element.type === 'AC' ? 'AC' :
        element.type;
      
        const ElementIcon = elementIcons[element.type];
      return (
        <div
          key={element.id}
          className={elementClass}
          style={{
            left: element.position.x,
            top: element.position.y,
            position: 'absolute',
            transform: `rotate(${element.rotation || 0}deg)`,
            transformOrigin: 'center'
          }}
        >
          {elementLabel}&nbsp;&nbsp;
          <ElementIcon 
            className="h-5 w-5" 
            data-type={element.type}
          />
        </div>
      );
    });
  };

  // Use seat positions from DB if available, otherwise auto-arrange
  const renderSeats = () => {
    return seats.map((seat) => {
      // Use position from DB or auto-calculate
      const position = seat.position || {
        x: ((seat.number - 1) % rowCapacity) * 42 + 10,
        y: Math.floor((seat.number - 1) / rowCapacity) * 32 + 10
      };
      
      return (
        <Tooltip key={seat._id}>
          <TooltipTrigger asChild>
            <button
              className={`
                absolute transition-all border rounded 
                flex items-center justify-center 
                text-[11px] font-semibold
                ${getSeatStatusColor(seat)}
              `}
              style={{
                left: position.x,
                top: position.y,
                width: 32,
                height: 22,
                cursor: !seat.isAvailable && !isAdmin ? 'not-allowed' : 'pointer',
              }}
              onClick={() => {
                if (seat.isAvailable || isAdmin) {
                  onSeatSelect(seat);
                }
              }}
              onMouseEnter={() => setHoveredSeat(seat.number)}
              onMouseLeave={() => setHoveredSeat(null)}
              disabled={!seat.isAvailable && !isAdmin}
            >
              {seat.number}
            </button>
          </TooltipTrigger>
          <TooltipContent>
            <div>
              <div className="font-bold text-xs mb-1">Seat {seat.number}</div>
              <div>
                Status: {
                  seat.isAvailable
                    ? (seat.isFutureBooked ? "Future Booked" : "Available")
                    : "Unavailable"
                }
              </div>
              <div>Price: ₹{seat.price}/month</div>
              {!seat.isAvailable && seat.unavailableUntil && (
                <div>Unavailable until: {seat.unavailableUntil ? format(new Date(seat.unavailableUntil), "dd MMM yyyy hh:mm:ss a") : ""}</div>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      );
    });
  };

  // Calculate height based on number of rows
  const numRows = Math.ceil(seats.length / rowCapacity);
  const mapHeight = Math.max(400, numRows * 15 ); // Add padding

  return (
    <div>
      <ScrollArea className="h-[400px] border rounded-lg">
        <div 
          className="relative bg-[#f6f8fa] rounded-lg p-8"
          style={{ 
            height: `${mapHeight}px`,
            overflow:"scroll",
            position: 'relative'
          }}
        >
          {/* Room layout elements */}
          {renderRoomElements()}
          
          <TooltipProvider>
            {renderSeats()}
          </TooltipProvider>
        </div>
      </ScrollArea>
      
      <div className="mt-4 flex items-center justify-center flex-wrap gap-2 text-xs">
        <div className="flex items-center">
          <div className="w-4 h-4 bg-[#d4f7c4] border border-cabin-green rounded-sm mr-2"></div>
          <span>Available</span>
        </div>
        <div className="flex items-center">
          <div className="w-4 h-4 bg-violet-100 border border-violet-400 rounded-sm mr-2"></div>
          <span>Future Booked</span>
        </div>
        <div className="flex items-center">
          <div className="w-4 h-4 bg-cabin-dark rounded-sm mr-2"></div>
          <span>Selected</span>
        </div>
        <div className="flex items-center">
          <div className="w-4 h-4 bg-[#D3E4FD] border border-blue-200 rounded-sm mr-2"></div>
          <span>Unavailable</span>
        </div>
      </div>
    </div>
  );
};
