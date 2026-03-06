

# Analysis: Can Current Implementation Handle 2000+ Seats?

## Answer: No — There Are Two Critical Limits Still Present

### Issue 1: Supabase 1000-Row Default Limit (CRITICAL)
The seats query on line 276 does `supabase.from('seats').select(...)` with **no explicit row limit override**. Supabase/PostgREST returns a maximum of **1000 rows by default**. With 2000 seats, you'd silently lose half your seats — they simply won't appear.

The same applies to the bookings query (line 307) — if a partner has many active bookings across cabins, results get truncated at 1000.

### Issue 2: 40 Parallel Requests for seat_block_history
With 2000 seats batched at 50 per request, that's **40 simultaneous HTTP requests** in `Promise.all`. This can trigger rate limiting or connection pool exhaustion on Supabase, causing random failures.

### Issue 3: Dues query also uses `.in()` with potentially many IDs
The `advancePaidIds` array (line 347) could also grow large and hit URL limits.

## Fix Plan

### 1. Add `.limit(10000)` to the seats query (`vendorSeatsService.ts`)
Override the default 1000-row limit so all seats are returned. Apply the same to the bookings query.

### 2. Increase batch size from 50 to 200 for seat_block_history
Each UUID is ~36 chars. 200 UUIDs ≈ 7.2KB in the URL — safely under the 8KB limit. This reduces 2000 seats from 40 requests down to 10.

### 3. Batch the dues query too
The `.in('booking_id', advancePaidIds)` can also exceed URL limits with many advance-paid bookings. Apply the same batching pattern.

### 4. Add `.limit(10000)` to bookings query
Ensure all active bookings are returned, not just the first 1000.

## Files Changed
- **`src/api/vendorSeatsService.ts`** — Add row limits, increase batch size, batch dues query

