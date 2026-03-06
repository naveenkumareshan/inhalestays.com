
import { supabase } from '@/integrations/supabase/client';

export type ActivityType = 'cancelled' | 'released' | 'transferred' | 'date_changed';
export type BookingType = 'cabin' | 'hostel';

interface LogActivityParams {
  bookingId: string;
  bookingType: BookingType;
  activityType: ActivityType;
  serialNumber?: string;
  details?: Record<string, any>;
}

export const logBookingActivity = async ({
  bookingId,
  bookingType,
  activityType,
  serialNumber,
  details = {},
}: LogActivityParams) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('booking_activity_log' as any).insert({
      booking_id: bookingId,
      booking_type: bookingType,
      activity_type: activityType,
      performed_by: user?.id || null,
      serial_number: serialNumber || null,
      details,
    });
  } catch (e) {
    console.error('Failed to log booking activity:', e);
  }
};
