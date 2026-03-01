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
      subscriptionId,
      testMode,
    } = await req.json();

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Test mode: directly activate
    if (testMode) {
      const { error: updateError } = await adminClient
        .from("property_subscriptions")
        .update({
          status: "active",
          payment_status: "completed",
          razorpay_payment_id: `test_pay_${Date.now()}`,
        })
        .eq("id", subscriptionId);

      if (updateError) {
        console.error("Error updating subscription in test mode:", updateError);
        return new Response(
          JSON.stringify({ error: "Failed to activate subscription" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, testMode: true, message: "Subscription activated (test mode)" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Real mode
    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature || !subscriptionId) {
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

    const { error: updateError } = await adminClient
      .from("property_subscriptions")
      .update({
        status: "active",
        payment_status: "completed",
        razorpay_payment_id,
      })
      .eq("id", subscriptionId)
      .eq("razorpay_order_id", razorpay_order_id);

    if (updateError) {
      console.error("Error updating subscription:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to activate subscription" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: "Subscription payment verified and activated" }),
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
