import React, { useState, useEffect, memo } from "react";
import { format, addDays, isAfter, isBefore } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Building, CalendarIcon, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { FloorPlanViewer } from "./FloorPlanViewer";
// Section type removed - no longer needed
import { seatsService, SeatAvailabilityResponse } from "@/api/seatsService";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { formatBookingPeriod } from "@/utils/currency";

export interface RoomElement {
  id: string;
  type: string;
  position: {
    x: number;
    y: number;
  };
  rotation?: number; // Added rotation property
}

interface DateBasedSeatMapProps {
  cabinId: string;
  floorsList?: { id: string; number: number; layout_image?: string; layout_image_opacity?: number }[];
  exportcsv?: boolean;
  onSeatSelect?: (seat: any) => void;
  selectedSeat?: any;
  startDate?: Date;
  endDate?: Date;
  roomElements?: RoomElement[];
  sections?: any[];
  layoutImage?: string | null;
  roomWidth?: number;
  roomHeight?: number;
  categoryFilter?: string;
  slotId?: string;
}

const DateBasedSeatMapComponent: React.FC<DateBasedSeatMapProps> = ({
  cabinId,
  floorsList,
  onSeatSelect,
  selectedSeat,
  exportcsv = true,
  startDate: propStartDate,
  endDate: propEndDate,
  roomElements = [],
  sections = [],
  layoutImage,
  roomWidth = 800,
  roomHeight = 600,
  categoryFilter,
  slotId,
}) => {
  const [startDate, setStartDate] = useState<Date>(propStartDate || new Date());
  const [endDate, setEndDate] = useState<Date>(
    propEndDate || addDays(new Date(), 30)
  );
  const [availableSeats, setAvailableSeats] = useState<any[]>([]);
  const [seatAvailability, setSeatAvailability] = useState<
    SeatAvailabilityResponse[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [selectedfloor, setSelectedFloor] = useState(floorsList?.[0]?.id ?? '1');
  const { toast } = useToast();

  // Update internal state when props change
  useEffect(() => {
    if (propStartDate) setStartDate(propStartDate);
    if (propEndDate) setEndDate(propEndDate);
  }, [propStartDate, propEndDate]);

  // Fetch available seats for the selected date range
  const fetchAvailableSeats = async () => {
    if (!startDate || !endDate || !cabinId) return;

    setLoading(true);
    try {
      const response = await seatsService.getAvailableSeatsForDateRange(
        cabinId,
        selectedfloor,
        startDate.toISOString(),
        endDate.toISOString(),
        slotId
      );

      if (response.success) {
        setAvailableSeats(response.data);

        if(exportcsv){
          // Also get detailed availability info
          const availabilityResponse =
            await seatsService.checkSeatsAvailabilityBulk(
              cabinId,
              startDate.toISOString(),
              endDate.toISOString()
            );

          if (availabilityResponse.success) {
            setSeatAvailability(availabilityResponse.data as any);
          }
        }
      }
    } catch (error) {
      console.error("Error fetching seat availability:", error);
      toast({
        title: "Error",
        description: "Failed to fetch seat availability",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (startDate && endDate && cabinId) {
      fetchAvailableSeats();
    }
  }, [startDate, endDate, cabinId, selectedfloor, slotId]);

  // Export availability data
  const exportAvailability = () => {
    const csvData = seatAvailability.map((seat) => ({
      room:  seat.cabinName,
      code:  seat.cabinCode,
      number: seat.number,
      price:   seat.price,
      unavailableUntil: seat.conflictingBookings.length > 0
          ? seat.conflictingBookings[0].endDate
          : "",
      userName:
        seat.conflictingBookings.length > 0
          ? seat.conflictingBookings[0].userId.name
          : "",
      userPhone:
       seat.conflictingBookings.length > 0
          ? seat.conflictingBookings[0].userId.phone
          : "",
      userEmail:
       seat.conflictingBookings.length > 0
          ? seat.conflictingBookings[0].userId.email
          : "",
      endDate:
        seat.conflictingBookings.length > 0
          ? seat.conflictingBookings[0].endDate
          : "",
      startDate:
        seat.conflictingBookings.length > 0
          ? seat.conflictingBookings[0].startDate
          : "",
      isAvailable: seat.isAvailable ? "Yes" : "No",
      conflictingBookings: seat.conflictingBookings?.length || 0,
      dateRange: `${format(startDate, "dd/MM/yyyy")} - ${format(
        endDate,
        "dd/MM/yyyy"
      )}`,
    }));

    const csvContent = [
      [
        "Room Name",
        "Room Code",
        "Seat Number",
        "Price",
        "User Name",
        "User Email",
        "User Phone",
        "unavailableUntil",
        "End Date",
        "Stat Date",
        "Available",
        "Conflicting Bookings",
        "Date Range",
      ],
      ...csvData.map((row) => [
        row.room,
        row.code,
        row.number,
        row.price,
        row.userName,
        row.userEmail,
        row.userPhone,
        row.unavailableUntil,
        row.endDate,
        row.startDate,
        row.isAvailable,
        row.conflictingBookings,
        row.dateRange,
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `seat-availability-${format(
      startDate,
      "yyyy-MM-dd"
    )}-to-${format(endDate, "yyyy-MM-dd")}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Transform seats to show availability status
  const transformedSeats = availableSeats.map((seat) => {
    const availabilityInfo = seatAvailability.find(
      (info) => info.seatId === seat._id
    );
    const categoryMismatch = categoryFilter && seat.category !== categoryFilter;
    return {
      ...seat,
      isAvailable: categoryMismatch ? false : (availabilityInfo?.isAvailable ?? seat.isAvailable),
      isFutureBooked: seat.isFutureBooked,
      isCategoryMismatch: !!categoryMismatch,
      conflictingBookings: availabilityInfo?.conflictingBookings || [],
      isDateFiltered: true,
    };
  });

  const availableCount = transformedSeats.filter(
    (seat) => seat.isAvailable
  ).length;
  const futureBookedCount = transformedSeats.filter(
    (seat) => seat.isFutureBooked && seat.isAvailable
  ).length;
  const unavailableCount = transformedSeats.length - availableCount;

  return (
    <div className="space-y-6">
      {exportcsv && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Date-Based Seat Availability
              <Button onClick={exportAvailability} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Start Date
                </label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !startDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate
                        ? format(startDate, "PPP")
                        : "Select start date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={(date) => date && setStartDate(date)}
                      initialFocus
                      disabled={(date) => isBefore(date, startDate)}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  End Date
                </label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !endDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, "PPP") : "Select end date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={(date) => date && setEndDate(date)}
                      initialFocus
                      disabled={(date) => isBefore(date, startDate)}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <Button
              onClick={fetchAvailableSeats}
              disabled={loading}
              className="mb-4"
            >
              {loading ? "Checking Availability..." : "Refresh Availability"}
            </Button>
          </CardContent>
        </Card>
      )}

      {exportcsv && (
        <div className="flex gap-4 mb-4">
          <Badge variant="secondary">Available: {availableCount}</Badge>
          {futureBookedCount > 0 && (
            <Badge className="bg-violet-100 text-violet-800 border-violet-400">Future Booked: {futureBookedCount}</Badge>
          )}
          <Badge variant="destructive">Unavailable: {unavailableCount}</Badge>
          <Badge variant="outline">Total: {transformedSeats.length}</Badge>
        </div>
      )}

      <div className="text-sm text-muted-foreground mb-4">
        <p>
          Showing availability from{" "}
          <strong>{formatBookingPeriod(startDate, endDate)}</strong>
        </p>
      </div>

      {exportcsv ? (
        <Card>
          <CardHeader>
            <CardTitle>Seat Map</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-4 mb-4">
              {floorsList?.map((floor) => {
                const isActive = selectedfloor === floor.number.toString();
                return (
                  <button
                    key={floor.number}
                    type="button"
                    onClick={() => setSelectedFloor(floor.number.toString())}
                    className={`group rounded-xl border p-3 sm:p-4 flex flex-col items-center justify-center gap-1 sm:gap-2 transition-all duration-200 ease-in-out hover:shadow-md hover:-translate-y-[1px] active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-400 ${isActive ? "bg-blue-50 border-blue-400 shadow-md ring-1 ring-blue-300/50" : "hover:border-blue-300"}`}
                  >
                    <Building className={`h-4 w-4 sm:h-6 sm:w-6 transition-colors ${isActive ? "text-blue-600" : "text-gray-600 group-hover:text-blue-500"}`} />
                    <span className={`text-xs sm:text-base font-medium ${isActive ? "text-blue-700" : "text-gray-800"}`}>Floor {floor.number}</span>
                  </button>
                );
              })}
            </div>
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
              </div>
            ) : (
              <FloorPlanViewer
                seats={transformedSeats}
                sections={sections}
                roomWidth={roomWidth}
                roomHeight={roomHeight}
                onSeatSelect={(seat: any) => {
                  if (seat?.isCategoryMismatch) return;
                  onSeatSelect?.(seat);
                }}
                selectedSeat={selectedSeat}
                dateRange={{ start: startDate, end: endDate }}
                layoutImage={(() => {
                  const floor = floorsList?.find(f => f.number.toString() === selectedfloor);
                  return floor?.layout_image || layoutImage;
                })()}
                layoutImageOpacity={(() => {
                  const floor = floorsList?.find(f => f.number.toString() === selectedfloor);
                  return floor?.layout_image_opacity ?? 30;
                })()}
              />
            )}
          </CardContent>
        </Card>
      ) : (
        <div>
          {/* Pill-style floor selector + available counter */}
          <div className="flex items-center gap-2 mb-3">
            <div className="flex gap-1 bg-muted/50 rounded-xl p-1 overflow-x-auto no-scrollbar">
              {floorsList?.map((floor) => {
                const isActive = selectedfloor === floor.number.toString();
                return (
                  <button
                    key={floor.number}
                    type="button"
                    onClick={() => setSelectedFloor(floor.number.toString())}
                    className={cn(
                      "flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all whitespace-nowrap",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Building className="h-3 w-3" />
                    Floor {floor.number}
                  </button>
                );
              })}
            </div>
            <Badge variant="secondary" className="text-[10px] px-2 py-0.5 whitespace-nowrap">
              {availableCount} available
            </Badge>
          </div>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
            </div>
          ) : (
            <FloorPlanViewer
              seats={transformedSeats}
              sections={sections}
              roomWidth={roomWidth}
              roomHeight={roomHeight}
              onSeatSelect={(seat: any) => {
                if (seat?.isCategoryMismatch) return;
                onSeatSelect?.(seat);
              }}
              selectedSeat={selectedSeat}
              dateRange={{ start: startDate, end: endDate }}
              layoutImage={(() => {
                const floor = floorsList?.find(f => f.number.toString() === selectedfloor);
                return floor?.layout_image || layoutImage;
              })()}
              layoutImageOpacity={(() => {
                const floor = floorsList?.find(f => f.number.toString() === selectedfloor);
                return floor?.layout_image_opacity ?? 30;
              })()}
            />
          )}
        </div>
      )}

      {selectedSeat && selectedSeat.conflictingBookings?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>
              Conflicting Bookings for Seat #{selectedSeat.number}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {selectedSeat.conflictingBookings.map(
                (booking: { status: string, bookingId:string, startDate: string, endDate: string}, index: number) => (
                  <div key={index} className="p-3 border rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">
                        Booking #{booking.bookingId}
                      </span>
                      <Badge
                        variant={
                          booking.status === "active" ? "default" : "secondary"
                        }
                      >
                        {booking.status}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {format(new Date(booking.startDate), "dd MMM yyyy")} -{" "}
                      {format(new Date(booking.endDate), "dd MMM yyyy")}
                    </div>
                  </div>
                )
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

// Memoize the component with custom comparison function
export const DateBasedSeatMap = memo(DateBasedSeatMapComponent, (prevProps, nextProps) => {
  return (
    prevProps.cabinId === nextProps.cabinId &&
    prevProps.exportcsv === nextProps.exportcsv &&
    prevProps.startDate?.getTime() === nextProps.startDate?.getTime() &&
    prevProps.endDate?.getTime() === nextProps.endDate?.getTime() &&
    prevProps.selectedSeat?._id === nextProps.selectedSeat?._id &&
    prevProps.categoryFilter === nextProps.categoryFilter &&
    prevProps.slotId === nextProps.slotId &&
    JSON.stringify(prevProps.roomElements) === JSON.stringify(nextProps.roomElements)
  );
});

DateBasedSeatMap.displayName = 'DateBasedSeatMap';