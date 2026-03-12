import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const today = new Date();
    const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const firstOfMonthStr = firstOfMonth.toISOString().split("T")[0];

    // 1. Get all monthly_cycle hostels
    const { data: hostels, error: hostelsErr } = await supabase
      .from("hostels")
      .select("id, payment_window_days")
      .eq("billing_type", "monthly_cycle");

    if (hostelsErr) throw hostelsErr;
    if (!hostels || hostels.length === 0) {
      return new Response(
        JSON.stringify({ message: "No monthly_cycle hostels found", generated: 0, overdue_marked: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const hostelIds = hostels.map((h: any) => h.id);
    const hostelMap = new Map(hostels.map((h: any) => [h.id, h]));

    // 2. Get active bookings for these hostels that overlap with current month
    const { data: bookings, error: bookingsErr } = await supabase
      .from("hostel_bookings")
      .select("id, hostel_id, user_id, room_id, bed_id, sharing_option_id, start_date, end_date, total_price, booking_duration, duration_count, food_opted, food_amount")
      .in("hostel_id", hostelIds)
      .eq("status", "confirmed")
      .gte("end_date", firstOfMonthStr);

    if (bookingsErr) throw bookingsErr;

    // 3. Get sharing option prices for monthly rent
    const sharingOptionIds = [...new Set((bookings || []).map((b: any) => b.sharing_option_id))];
    let sharingPrices = new Map<string, number>();
    if (sharingOptionIds.length > 0) {
      const { data: options } = await supabase
        .from("hostel_sharing_options")
        .select("id, price_monthly")
        .in("id", sharingOptionIds);
      (options || []).forEach((o: any) => sharingPrices.set(o.id, Number(o.price_monthly || 0)));
    }

    // 4. Check existing dues for this month to avoid duplicates
    const bookingIds = (bookings || []).map((b: any) => b.id);
    let existingDuesSet = new Set<string>();
    if (bookingIds.length > 0) {
      const { data: existingDues } = await supabase
        .from("hostel_dues")
        .select("booking_id")
        .in("booking_id", bookingIds)
        .eq("billing_month", firstOfMonthStr);
      (existingDues || []).forEach((d: any) => existingDuesSet.add(d.booking_id));
    }

    // 5. Generate dues for bookings that don't have one for this month
    const inserts: any[] = [];
    for (const booking of bookings || []) {
      if (existingDuesSet.has(booking.id)) continue;

      // Only generate if booking started before or during this month
      const startDate = new Date(booking.start_date);
      if (startDate > new Date(today.getFullYear(), today.getMonth() + 1, 0)) continue;

      const hostel = hostelMap.get(booking.hostel_id);
      if (!hostel) continue;

      const monthlyRent = sharingPrices.get(booking.sharing_option_id) || 0;
      const foodAmount = booking.food_opted ? Number(booking.food_amount || 0) : 0;
      const totalMonthly = monthlyRent + foodAmount;

      // Calculate due_date = 1st of month + payment_window_days
      const dueDate = new Date(firstOfMonth);
      dueDate.setDate(dueDate.getDate() + (hostel.payment_window_days || 5));
      const dueDateStr = dueDate.toISOString().split("T")[0];

      inserts.push({
        user_id: booking.user_id,
        hostel_id: booking.hostel_id,
        room_id: booking.room_id,
        bed_id: booking.bed_id,
        booking_id: booking.id,
        total_fee: totalMonthly,
        advance_paid: 0,
        due_amount: totalMonthly,
        due_date: dueDateStr,
        status: "pending",
        billing_month: firstOfMonthStr,
        is_prorated: false,
        auto_generated: true,
        food_amount: foodAmount,
      });
    }

    let generated = 0;
    if (inserts.length > 0) {
      const { error: insertErr } = await supabase
        .from("hostel_dues")
        .insert(inserts);
      if (insertErr) {
        console.error("Insert error:", insertErr);
        // Some may fail due to unique constraint — that's OK
      } else {
        generated = inserts.length;
      }
    }

    // 6. Mark overdue: pending dues with paid_amount = 0, past due_date, with billing_month set
    const todayStr = today.toISOString().split("T")[0];
    const { data: overdueResult, error: overdueErr } = await supabase
      .from("hostel_dues")
      .update({ status: "overdue" })
      .eq("status", "pending")
      .eq("paid_amount", 0)
      .lt("due_date", todayStr)
      .not("billing_month", "is", null)
      .select("id");

    const overdue_marked = overdueResult?.length || 0;
    if (overdueErr) console.error("Overdue update error:", overdueErr);

    return new Response(
      JSON.stringify({ message: "Monthly dues processed", generated, overdue_marked }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
