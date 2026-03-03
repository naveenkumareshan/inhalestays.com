
import { supabase } from '@/integrations/supabase/client';

export type PropertyType = 'reading_room' | 'hostel';

// ── Validation ──────────────────────────────────────────────

const READING_ROOM_REQUIRED = ['name', 'amount', 'startDate', 'endDate', 'seat_no', 'transaction_id'];
const HOSTEL_REQUIRED = ['name', 'amount', 'startDate', 'endDate', 'room_number', 'bed_number', 'transaction_id'];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function validateStudentRows(rows: any[], propertyType: PropertyType): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const required = propertyType === 'reading_room' ? READING_ROOM_REQUIRED : HOSTEL_REQUIRED;

  rows.forEach((row, idx) => {
    required.forEach(field => {
      if (!row[field] && row[field] !== 0) {
        errors.push(`Row ${idx + 1}: Missing ${field}`);
      }
    });

    if (row.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(row.email))) {
      errors.push(`Row ${idx + 1}: Invalid email format`);
    }

    if (row.phone && !/^\d{10}$/.test(String(row.phone).replace(/\D/g, ''))) {
      errors.push(`Row ${idx + 1}: Invalid phone format (${row.phone})`);
    }
  });

  return { valid: errors.length === 0, errors };
}

// ── Date helpers ────────────────────────────────────────────

export function parseExcelDate(value: unknown): Date | null {
  if (value === null || value === undefined) return null;

  // Already a Date
  if (value instanceof Date) return value;

  // Excel serial number
  const num = Number(value);
  if (!isNaN(num) && num > 10000 && num < 100000) {
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const millis = num * 86400 * 1000;
    return new Date(excelEpoch.getTime() + millis);
  }

  // String DD-MM-YYYY or DD/MM/YYYY
  const str = String(value).trim();
  const parts = str.split(/[-\/]/);
  if (parts.length === 3) {
    const [d, m, y] = parts.map(Number);
    if (d && m && y && y > 1900) {
      return new Date(Date.UTC(y, m - 1, d));
    }
  }

  // Fallback ISO parse
  const parsed = new Date(str);
  return isNaN(parsed.getTime()) ? null : parsed;
}

function toDateStr(d: Date): string {
  return d.toISOString().split('T')[0]; // YYYY-MM-DD
}

// ── Create user via edge function ───────────────────────────

async function createStudentUser(name: string, email: string, phone: string): Promise<{ userId: string; existing: boolean }> {
  const { data, error } = await supabase.functions.invoke('create-student', {
    body: { name, email, phone },
  });
  if (error) throw new Error(`Failed to create user for ${email}: ${error.message}`);
  if (data?.error) throw new Error(`Failed to create user for ${email}: ${data.error}`);
  return { userId: data.userId, existing: data.existing };
}

// ── Reading Room: process one row ───────────────────────────

export interface RRProcessResult {
  success: boolean;
  bookingId?: string;
  error?: string;
}

export async function processReadingRoomRow(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  row: any,
  cabinId: string,
  floorId: string | null
): Promise<RRProcessResult> {
  try {
    const email = row.email || `${String(row.phone).replace(/\D/g, '')}@autogen.local`;
    const { userId } = await createStudentUser(row.name, email, String(row.phone || ''));

    const startDate = parseExcelDate(row.startDate);
    const endDate = parseExcelDate(row.endDate);
    if (!startDate || !endDate) throw new Error('Invalid date');

    // Look up seat — use typed filters; cast to suppress deep-instantiation TS error
    // @ts-ignore – Supabase chained .eq() causes TS2589 on deeply nested generics
    const seatQueryBase = supabase.from('seats').select('id').eq('cabin_id', cabinId).eq('number', Number(row.seat_no));
    // @ts-ignore
    const { data: seat, error: seatErr } = await (floorId ? seatQueryBase.eq('floor_id', floorId) : seatQueryBase).maybeSingle();
    if (seatErr) throw new Error(`Seat lookup error: ${seatErr.message}`);
    if (!seat) throw new Error(`Seat #${row.seat_no} not found in this property/floor`);

    // Check availability via RPC
    const { data: isAvail } = await supabase.rpc('check_seat_available', {
      p_seat_id: seat.id,
      p_start_date: toDateStr(startDate),
      p_end_date: toDateStr(endDate),
    });
    if (isAvail === false) throw new Error(`Seat #${row.seat_no} is already booked for this period`);

    // Insert booking
    const { data: booking, error: bookErr } = await supabase
      .from('bookings')
      .insert({
        user_id: userId,
        cabin_id: cabinId,
        seat_id: seat.id,
        seat_number: Number(row.seat_no),
        start_date: toDateStr(startDate),
        end_date: toDateStr(endDate),
        total_price: Number(row.amount) || 0,
        locker_price: Number(row.key_deposite) || 0,
        locker_included: Number(row.key_deposite) > 0,
        payment_status: 'completed',
        payment_method: row.pay_mode || 'Cash',
        transaction_id: row.transaction_id || '',
        customer_name: row.name,
        booking_duration: 'monthly',
        duration_count: '1',
      })
      .select('id')
      .single();

    if (bookErr) throw new Error(`Booking insert error: ${bookErr.message}`);

    return { success: true, bookingId: booking.id };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// ── Hostel: process one row ─────────────────────────────────

export interface HostelProcessResult {
  success: boolean;
  bookingId?: string;
  error?: string;
}

export async function processHostelRow(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  row: any,
  hostelId: string
): Promise<HostelProcessResult> {
  try {
    const email = row.email || `${String(row.phone).replace(/\D/g, '')}@autogen.local`;
    const { userId } = await createStudentUser(row.name, email, String(row.phone || ''));

    const startDate = parseExcelDate(row.startDate);
    const endDate = parseExcelDate(row.endDate);
    if (!startDate || !endDate) throw new Error('Invalid date');

    // Look up room by room_number
    const { data: room, error: roomErr } = await supabase
      .from('hostel_rooms')
      .select('id')
      .eq('hostel_id', hostelId)
      .eq('room_number', String(row.room_number))
      .maybeSingle();

    if (roomErr) throw new Error(`Room lookup error: ${roomErr.message}`);
    if (!room) throw new Error(`Room "${row.room_number}" not found in this hostel`);

    // Look up bed by bed_number within that room
    const { data: bed, error: bedErr } = await supabase
      .from('hostel_beds')
      .select('id, sharing_option_id')
      .eq('room_id', room.id)
      .eq('bed_number', Number(row.bed_number))
      .maybeSingle();

    if (bedErr) throw new Error(`Bed lookup error: ${bedErr.message}`);
    if (!bed) throw new Error(`Bed #${row.bed_number} not found in room ${row.room_number}`);

    // Check availability via RPC
    const { data: isAvail } = await supabase.rpc('check_hostel_bed_available', {
      p_bed_id: bed.id,
      p_start_date: toDateStr(startDate),
      p_end_date: toDateStr(endDate),
    });
    if (isAvail === false) throw new Error(`Bed #${row.bed_number} in room ${row.room_number} is already booked`);

    // Insert hostel booking
    const { data: booking, error: bookErr } = await supabase
      .from('hostel_bookings')
      .insert({
        user_id: userId,
        hostel_id: hostelId,
        room_id: room.id,
        bed_id: bed.id,
        sharing_option_id: bed.sharing_option_id,
        start_date: toDateStr(startDate),
        end_date: toDateStr(endDate),
        total_price: Number(row.amount) || 0,
        security_deposit: Number(row.security_deposit) || 0,
        payment_status: 'completed',
        status: 'confirmed',
        payment_method: row.pay_mode || 'Cash',
        transaction_id: row.transaction_id || '',
        booking_duration: 'monthly',
        duration_count: 1,
      })
      .select('id')
      .single();

    if (bookErr) throw new Error(`Hostel booking insert error: ${bookErr.message}`);

    // Create receipt
    await supabase.from('hostel_receipts').insert({
      hostel_id: hostelId,
      booking_id: booking.id,
      user_id: userId,
      amount: Number(row.amount) || 0,
      payment_method: row.pay_mode || 'Cash',
      transaction_id: row.transaction_id || '',
      receipt_type: 'booking_payment',
      notes: row.receipt_no || '',
    });

    // Mark bed unavailable
    await supabase
      .from('hostel_beds')
      .update({ is_available: false })
      .eq('id', bed.id);

    return { success: true, bookingId: booking.id };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}
