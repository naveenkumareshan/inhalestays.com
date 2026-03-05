import { startOfDay, endOfDay, subDays, startOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths, subYears } from 'date-fns';

export function getDateRangeFromFilter(
  filter: string,
  customStart?: Date,
  customEnd?: Date
): { from: Date | undefined; to: Date | undefined } {
  const now = new Date();
  switch (filter) {
    case 'today':
      return { from: startOfDay(now), to: endOfDay(now) };
    case 'yesterday': {
      const y = subDays(now, 1);
      return { from: startOfDay(y), to: endOfDay(y) };
    }
    case '7days':
      return { from: startOfDay(subDays(now, 6)), to: endOfDay(now) };
    case 'this_week':
      return { from: startOfWeek(now, { weekStartsOn: 1 }), to: endOfDay(now) };
    case 'this_month':
      return { from: startOfMonth(now), to: endOfDay(now) };
    case 'last_month': {
      const lm = subMonths(now, 1);
      return { from: startOfMonth(lm), to: endOfMonth(lm) };
    }
    case 'this_year':
      return { from: startOfYear(now), to: endOfDay(now) };
    case 'last_year': {
      const ly = subYears(now, 1);
      return { from: startOfYear(ly), to: endOfYear(ly) };
    }
    case 'custom':
      return { from: customStart, to: customEnd };
    default:
      return { from: undefined, to: undefined };
  }
}
