import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claims?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const {
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature,
      bookingId,
      bookingType,
      testMode,
    } = await req.json();

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const isHostel = bookingType === "hostel";
    const isLaundry = bookingType === "laundry";
    const tableName = isHostel ? "hostel_bookings" : isLaundry ? "laundry_orders" : "bookings";

    // Helper: insert receipt only if no duplicate exists
    async function insertReceiptIfNotExists(
      table: string,
      matchKey: string,
      matchValue: string,
      transactionId: string,
      receiptData: Record<string, any>
    ) {
      const { data: existing } = await adminClient
        .from(table)
        .select("id")
        .eq(matchKey, matchValue)
        .eq("transaction_id", transactionId)
        .maybeSingle();

      if (!existing) {
        await adminClient.from(table).insert(receiptData);
      }
    }

    // Test mode: skip signature verification, directly confirm booking
    if (testMode) {
      const testTxnId = `test_pay_${Date.now()}`;
      const updateData: Record<string, any> = { payment_status: "completed" };
      if (isHostel || isLaundry) {
        updateData.status = "confirmed";
      }

      const { error: updateError } = await adminClient
        .from(tableName)
        .update(updateData)
        .eq("id", bookingId);

      if (updateError) {
        console.error("Error updating booking in test mode:", updateError);
        return new Response(
          JSON.stringify({ error: "Failed to update booking status" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Create receipt for reading room/cabin bookings in test mode
      if (!isHostel && !isLaundry) {
        const { data: booking } = await adminClient
          .from("bookings")
          .select("cabin_id, seat_id, user_id, total_price")
          .eq("id", bookingId)
          .single();

        if (booking) {
          await insertReceiptIfNotExists("receipts", "booking_id", bookingId, testTxnId, {
            booking_id: bookingId,
            user_id: booking.user_id,
            cabin_id: booking.cabin_id,
            seat_id: booking.seat_id,
            amount: booking.total_price,
            payment_method: "online",
            transaction_id: testTxnId,
            receipt_type: "booking_payment",
            collected_by_name: "InhaleStays.com",
          });
        }
      }

      // Create hostel receipt in test mode
      if (isHostel) {
        const { data: booking } = await adminClient
          .from("hostel_bookings")
          .select("hostel_id, user_id, advance_amount, total_price")
          .eq("id", bookingId)
          .single();

        if (booking) {
          await insertReceiptIfNotExists("hostel_receipts", "booking_id", bookingId, testTxnId, {
            booking_id: bookingId,
            user_id: booking.user_id,
            hostel_id: booking.hostel_id,
            amount: booking.advance_amount > 0 ? booking.advance_amount : booking.total_price,
            payment_method: "online",
            transaction_id: testTxnId,
            receipt_type: "booking_payment",
            collected_by_name: "InhaleStays.com",
          });
        }
      }

      // Create laundry receipt in test mode
      if (isLaundry) {
        const { data: order } = await adminClient
          .from("laundry_orders")
          .select("user_id, partner_id, total_amount")
          .eq("id", bookingId)
          .single();

        if (order) {
          await insertReceiptIfNotExists("laundry_receipts", "order_id", bookingId, testTxnId, {
            order_id: bookingId,
            user_id: order.user_id,
            partner_id: order.partner_id,
            amount: order.total_amount,
            payment_method: "online",
            transaction_id: testTxnId,
            receipt_type: "laundry_payment",
            collected_by_name: "InhaleStays.com",
          });
        }
      }

      return new Response(
        JSON.stringify({ success: true, testMode: true, message: "Test payment confirmed" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Real mode
    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature || !bookingId) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const RAZORPAY_KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET");
    if (!RAZORPAY_KEY_SECRET) {
      return new Response(JSON.stringify({ error: "Razorpay secret not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const encoder = new TextEncoder();
    const data = encoder.encode(`${razorpay_order_id}|${razorpay_payment_id}`);
    const key = encoder.encode(RAZORPAY_KEY_SECRET);

    const cryptoKey = await crypto.subtle.importKey(
      "raw", key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
    );

    const signatureBuffer = await crypto.subtle.sign("HMAC", cryptoKey, data);
    const generatedSignature = Array.from(new Uint8Array(signatureBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    if (generatedSignature !== razorpay_signature) {
      return new Response(
        JSON.stringify({ error: "Payment signature verification failed" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update booking in the correct table
    const updateData: Record<string, any> = {
      payment_status: "completed",
      razorpay_payment_id,
      razorpay_signature,
    };

    if (isHostel || isLaundry) {
      updateData.status = "confirmed";
    }

    // For hostel bookings with advance, check if it's advance_paid
    if (isHostel) {
      const { data: booking } = await adminClient
        .from("hostel_bookings")
        .select("advance_amount, total_price")
        .eq("id", bookingId)
        .single();

      if (booking && booking.advance_amount > 0 && booking.advance_amount < booking.total_price) {
        updateData.payment_status = "advance_paid";
      }
    }

    const { error: updateError } = await adminClient
      .from(tableName)
      .update(updateData)
      .eq("id", bookingId)
      .eq("razorpay_order_id", razorpay_order_id);

    if (updateError) {
      console.error("Error updating booking:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to update booking status" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create hostel receipt on successful payment (with duplicate check)
    if (isHostel) {
      const { data: booking } = await adminClient
        .from("hostel_bookings")
        .select("hostel_id, user_id, advance_amount, total_price")
        .eq("id", bookingId)
        .single();

      if (booking) {
        await insertReceiptIfNotExists("hostel_receipts", "booking_id", bookingId, razorpay_payment_id, {
          booking_id: bookingId,
          user_id: booking.user_id,
          hostel_id: booking.hostel_id,
          amount: booking.advance_amount > 0 ? booking.advance_amount : booking.total_price,
          payment_method: "online",
          transaction_id: razorpay_payment_id,
          receipt_type: "booking_payment",
          collected_by_name: "InhaleStays.com",
        });
      }
    }

    // Create laundry receipt on successful payment (with duplicate check)
    if (isLaundry) {
      const { data: order } = await adminClient
        .from("laundry_orders")
        .select("user_id, partner_id, total_amount")
        .eq("id", bookingId)
        .single();

      if (order) {
        await insertReceiptIfNotExists("laundry_receipts", "order_id", bookingId, razorpay_payment_id, {
          order_id: bookingId,
          user_id: order.user_id,
          partner_id: order.partner_id,
          amount: order.total_amount,
          payment_method: "online",
          transaction_id: razorpay_payment_id,
          receipt_type: "laundry_payment",
          collected_by_name: "InhaleStays.com",
        });
      }
    }

    // Create receipt for reading room/cabin bookings (with duplicate check)
    if (!isHostel && !isLaundry) {
      const { data: booking } = await adminClient
        .from("bookings")
        .select("cabin_id, seat_id, user_id, total_price")
        .eq("id", bookingId)
        .single();

      if (booking) {
        await insertReceiptIfNotExists("receipts", "booking_id", bookingId, razorpay_payment_id, {
          booking_id: bookingId,
          user_id: booking.user_id,
          cabin_id: booking.cabin_id,
          seat_id: booking.seat_id,
          amount: booking.total_price,
          payment_method: "online",
          transaction_id: razorpay_payment_id,
          receipt_type: "booking_payment",
          collected_by_name: "InhaleStays.com",
        });
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: "Payment verified and booking confirmed" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
