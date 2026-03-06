
import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { calculateBookingEndDate } from '@/utils/dateCalculations';

interface BookingExtensionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookingId: string;
  booking: any;
  bookingType: 'cabin' | 'hostel';
  currentEndDate: Date;
  onExtensionComplete: () => void;
  seatId?: string;
  bedId?: string;
}

export const BookingUpdateDatesDialog = ({
  open,
  onOpenChange,
  bookingId,
  booking,
  bookingType,
  currentEndDate,
  onExtensionComplete,
  seatId,
  bedId,
}: BookingExtensionDialogProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const [startDate, setStartDate] = useState<Date>(new Date(booking.startDate));

  // Extract duration info from booking (handles both camelCase and snake_case)
  const durationType = booking.bookingDuration || booking.booking_duration || 'monthly';
  const durationCount = Number(booking.durationCount || booking.duration_count || 1);

  // Auto-calculate end date based on start date + duration
  const endDate = useMemo(
    () => calculateBookingEndDate(startDate, durationType, durationCount),
    [startDate, durationType, durationCount]
  );

  // Duration label for display
  const durationLabel = `${durationCount} ${durationType === 'daily' ? (durationCount > 1 ? 'days' : 'day') : durationType === 'weekly' ? (durationCount > 1 ? 'weeks' : 'week') : (durationCount > 1 ? 'months' : 'month')}`;

  const handleUpdateBooking = async () => {
    try {
      setIsLoading(true);

      const newStart = format(startDate, 'yyyy-MM-dd');
      const newEnd = format(endDate, 'yyyy-MM-dd');

      // ── Overlap validation ──
      if (bookingType === 'cabin' && (seatId || booking.seatId)) {
        const resourceId = seatId || booking.seatId;
        const { data: conflicts } = await supabase
          .from('bookings')
          .select('id')
          .eq('seat_id', resourceId)
          .neq('id', bookingId)
          .in('payment_status', ['completed', 'advance_paid'])
          .lte('start_date', newEnd)
          .gte('end_date', newStart);

        if (conflicts && conflicts.length > 0) {
          toast({ title: "Date conflict", description: "Another booking exists on this seat for the selected dates.", variant: "destructive" });
          setIsLoading(false);
          return;
        }
      } else if (bookingType === 'hostel' && (bedId || booking.bedId)) {
        const resourceId = bedId || booking.bedId;
        const { data: conflicts } = await supabase
          .from('hostel_bookings')
          .select('id')
          .eq('bed_id', resourceId)
          .neq('id', bookingId)
          .in('status', ['confirmed', 'pending'])
          .lte('start_date', newEnd)
          .gte('end_date', newStart);

        if (conflicts && conflicts.length > 0) {
          toast({ title: "Date conflict", description: "Another booking exists on this bed for the selected dates.", variant: "destructive" });
          setIsLoading(false);
          return;
        }
      }

      // ── Update booking dates ──
      const table = bookingType === 'cabin' ? 'bookings' : 'hostel_bookings';
      const updateData: any = {
        start_date: newStart,
        end_date: newEnd,
      };

      const { error } = await supabase
        .from(table)
        .update(updateData)
        .eq('id', bookingId);

      if (error) throw error;

      // ── Sync dues proportional_end_date ──
      if (bookingType === 'cabin') {
        await supabase
          .from('dues')
          .update({ proportional_end_date: newEnd })
          .eq('booking_id', bookingId);
      } else {
        await supabase
          .from('hostel_dues')
          .update({ proportional_end_date: newEnd })
          .eq('booking_id', bookingId);
      }

      // Log activity
      try {
        const { logBookingActivity } = await import('@/api/bookingActivityLogService');
        await logBookingActivity({
          bookingId,
          bookingType,
          activityType: 'date_changed',
          serialNumber: booking.serialNumber || booking.serial_number,
          details: {
            old_start_date: booking.startDate || booking.start_date,
            new_start_date: newStart,
            old_end_date: booking.endDate || booking.end_date,
            new_end_date: newEnd,
          },
        });
      } catch (e) {
        console.error('Activity log failed:', e);
      }

      toast({
        title: "Booking updated successfully",
        description: `Dates updated to ${format(startDate, 'PPP')} – ${format(endDate, 'PPP')}`,
      });

      onExtensionComplete();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Update error:", error);
      toast({
        title: "Update failed",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Update Booking</DialogTitle>
          <DialogDescription>
            Select new start date — end date is auto-calculated based on duration ({durationLabel})
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="mb-2 block">Start Date</Label>
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
                    {startDate ? format(startDate, "PPP") : "Select start date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={(date) => date && setStartDate(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <Label className="mb-2 block">End Date</Label>
              <div className="flex items-center h-10 px-3 rounded-md border bg-muted text-muted-foreground text-sm">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(endDate, "PPP")}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Auto-calculated: {durationLabel}
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleUpdateBooking} disabled={isLoading}>
            {isLoading ? "Processing..." : "Update Booking"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
