
import { supabase } from '@/integrations/supabase/client';

export type ActivityType = 'cancelled' | 'released' | 'transferred' | 'date_changed';
export type BookingType = 'cabin' | 'hostel';

interface LogActivityParams {
  bookingId: string;
  bookingType: BookingType;
  activityType: ActivityType;
  serialNumber?: string;
  details?: Record<string, any>;
  propertyOwnerId?: string;
}

/**
 * Resolves the property owner from the booking if not explicitly provided.
 */
async function resolvePropertyOwnerId(bookingId: string, bookingType: BookingType): Promise<string | null> {
  try {
    if (bookingType === 'cabin') {
      const { data } = await supabase
        .from('bookings')
        .select('cabin_id')
        .eq('id', bookingId)
        .maybeSingle();
      if (data?.cabin_id) {
        const { data: cabin } = await supabase
          .from('cabins')
          .select('created_by')
          .eq('id', data.cabin_id)
          .maybeSingle();
        return cabin?.created_by || null;
      }
    } else {
      const { data } = await supabase
        .from('hostel_bookings')
        .select('hostel_id')
        .eq('id', bookingId)
        .maybeSingle();
      if (data?.hostel_id) {
        const { data: hostel } = await supabase
          .from('hostels')
          .select('created_by')
          .eq('id', data.hostel_id)
          .maybeSingle();
        return hostel?.created_by || null;
      }
    }
  } catch (e) {
    console.error('Failed to resolve property owner:', e);
  }
  return null;
}

export const logBookingActivity = async ({
  bookingId,
  bookingType,
  activityType,
  serialNumber,
  details = {},
  propertyOwnerId,
}: LogActivityParams) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    // Resolve owner if not provided
    const ownerId = propertyOwnerId || await resolvePropertyOwnerId(bookingId, bookingType);

    await supabase.from('booking_activity_log' as any).insert({
      booking_id: bookingId,
      booking_type: bookingType,
      activity_type: activityType,
      performed_by: user?.id || null,
      serial_number: serialNumber || null,
      details,
      property_owner_id: ownerId,
    });
  } catch (e) {
    console.error('Failed to log booking activity:', e);
  }
};
