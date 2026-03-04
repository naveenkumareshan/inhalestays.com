import { addDays, addMonths, subDays } from 'date-fns';

/**
 * Calculate booking end date based on duration type and count.
 * - Daily: end = start + (count - 1) days (1 day = same day)
 * - Weekly: end = start + (count * 7 - 1) days (1 week from Mar 1 = Mar 7)
 * - Monthly: end = addMonths(start, count) - 1 day (Mar 1 + 1mo = Mar 31; Mar 21 + 1mo = Apr 20)
 */
export function calculateBookingEndDate(
  startDate: Date,
  durationType: string,
  count: number
): Date {
  if (durationType === 'daily') {
    return addDays(startDate, Math.max(0, count - 1));
  }
  if (durationType === 'weekly') {
    return addDays(startDate, count * 7 - 1);
  }
  // monthly (default)
  return subDays(addMonths(startDate, count), 1);
}
