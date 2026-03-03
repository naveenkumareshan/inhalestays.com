
import React, { useState, useEffect, useRef } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { ScrollArea } from './ui/scroll-area';
import { Button } from './ui/button';
import { ArrowLeft } from 'lucide-react';
import { seatsService } from '@/api/seatsService';

export interface Seat {
  _id?: string;
  id: string;
  number: number;
  cabinId: string;
  price: number;
  position: { x: number; y: number };
  isAvailable: boolean;
  unavailableUntil?: string;
}

interface SeatMapProps {
  seats?: Seat[];
  cabinId: string;
  onSeatSelect: (seat: Seat) => void;
  selectedSeat?: Seat | null;
  onGoBack?: () => void;
  isAdmin?: boolean;
  startDate?: string;
  endDate?: string;
}

export function SeatMap({ cabinId, onSeatSelect, selectedSeat, onGoBack, isAdmin = false, startDate, endDate }: SeatMapProps) {
  const [hoveredSeat, setHoveredSeat] = useState<Seat | null>(null);
  const [seats, setSeats] = useState<Seat[]>([]);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  
  // Fetch seats when component mounts or cabinId changes
  useEffect(() => {
    fetchSeats();
  }, [cabinId, startDate, endDate]);


  
  const fetchSeats = async () => {
    try {      
      if (!cabinId) return;
      
      console.log("Fetching seats for cabin:", cabinId);
      
      try {
        const response = startDate && endDate
          ? await seatsService.getAvailableSeatsForDateRange(cabinId, '1', startDate, endDate)
          : await seatsService.getSeatsByCabin(cabinId, 1);
        
        if (response.success && Array.isArray(response.data)) {
          console.log("Seats data received:", response.data);
          
          // Transform API response to match our interface
          const transformedSeats = response.data.map((seat: any) => ({
            _id: seat._id || seat.id,
            id: seat._id || seat.id,
            number: seat.number,
            cabinId: seat.cabinId,
            price: seat.price,
            position: seat.position,
            isAvailable: seat.isAvailable !== false,
            unavailableUntil: seat.unavailableUntil
          }));
          
          setSeats(transformedSeats);
        } else {
          console.log("No valid seats data, creating mock seats");
        }
      } catch (error) {
        console.error("Error fetching seats:", error);
      }
    } catch (error) {
      console.error("Error in seat fetching flow:", error);
    } finally { /* empty */ }
  };
  
  // Using the same color scheme as in RoomSeatButton
  const getSeatStatusColor = (seat: Seat) => {
    if (!seat.isAvailable) return 'bg-[#D3E4FD] text-blue-600 border-blue-200 cursor-not-allowed';
    if (selectedSeat?.id === seat.id) return 'bg-cabin-dark text-white';
    return 'bg-[#d4f7c4] text-cabin-green border-cabin-green hover:bg-cabin-green/10';
  };

  // Handle navigation back - FIXED to properly prevent event propagation
  const handleGoBack = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent default behavior
    e.stopPropagation(); // Prevent event bubbling
    if (onGoBack) onGoBack();
  };

  // Prevent clicking on the component from bubbling up to parent components
  const handleContainerClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <div className="max-w-xl mx-auto mt-6" onClick={handleContainerClick}>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-serif font-semibold text-cabin-dark">Select Your Seat</h3>
        {onGoBack && (
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleGoBack}
            className="flex items-center gap-1"
          >
            <ArrowLeft className="h-4 w-4" />
            Go Back
          </Button>
        )}
      </div>
      
      <div className="bg-white p-4 sm:p-6 rounded-lg border border-border overflow-hidden" onClick={handleContainerClick}>
        {/* Remove the Reading Area badge as requested */}
        
        <ScrollArea 
          ref={scrollAreaRef}
          className="h-[400px] w-full rounded-md" 
          type="always"
        >
          <div 
            className="relative bg-[#f6f8fa] rounded-lg border p-4 sm:p-8 mx-auto"
            style={{ minWidth: "100%", minHeight: "400px", width: "100%", height: "100%" }}
            onClick={(e) => e.stopPropagation()} // Prevent event bubbling
          >
            <TooltipProvider>
              {seats.map((seat) => (
                <Tooltip key={seat.id}>
                  <TooltipTrigger asChild>
                    <button
                      className={`
                        absolute transition-all border rounded 
                        flex items-center justify-center 
                        text-[11px] font-semibold
                        ${getSeatStatusColor(seat)}
                      `}
                      style={{
                        left: seat.position.x,
                        top: seat.position.y,
                        width: 32,
                        height: 22,
                      }}
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent event bubbling
                        e.preventDefault(); // Prevent default
                        if (seat.isAvailable) onSeatSelect(seat);
                      }}
                      onMouseEnter={() => setHoveredSeat(seat)}
                      onMouseLeave={() => setHoveredSeat(null)}
                      disabled={!seat.isAvailable}
                    >
                      {seat.number}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                  }}>
                    <div>
                      <div className="font-bold text-xs mb-1">Seat {seat.number}</div>
                      <div>Status: {
                        seat.isAvailable ? "Available" : "Unavailable"
                      }</div>
                      <div>Price: ₹{seat.price}/month</div>
                      {!seat.isAvailable && seat.unavailableUntil && (
                        <div>Unavailable until: {seat.unavailableUntil}</div>
                      )}
                    </div>
                  </TooltipContent>
                </Tooltip>
              ))}
            </TooltipProvider>
          </div>
        </ScrollArea>
        
        <div className="mt-4 sm:mt-6 flex items-center justify-center flex-wrap gap-2 text-xs sm:text-sm">
          <div className="flex items-center">
            <div className="w-4 h-4 bg-[#d4f7c4] border border-cabin-green rounded-sm mr-2"></div>
            <span>Available</span>
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
        
        {hoveredSeat && hoveredSeat.isAvailable && (
          <div className="mt-4 p-2 bg-cabin-light/20 rounded-md text-center text-xs sm:text-sm">
            <p>
              Seat #{hoveredSeat.number} - ₹{hoveredSeat.price}/month
            </p>
          </div>
        )}
        
        {selectedSeat && (
          <div className="mt-4 p-3 bg-cabin-wood/10 rounded-md text-center border border-cabin-wood/30">
            <p className="font-medium">Selected: Seat #{selectedSeat.number}</p>
            <p className="text-xs sm:text-sm mt-1">
              ₹{selectedSeat.price}/month
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
