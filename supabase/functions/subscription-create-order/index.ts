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

    const userId = claims.claims.sub as string;
    const { planId, propertyId, propertyType, capacityUpgrades = 0, couponCode } = await req.json();

    if (!planId || !propertyType) {
      return new Response(JSON.stringify({ error: "Missing planId or propertyType" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get partner
    const { data: partner, error: partnerError } = await adminClient
      .from("partners")
      .select("id")
      .eq("user_id", userId)
      .single();

    if (partnerError || !partner) {
      return new Response(JSON.stringify({ error: "Partner not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify partner owns the property (skip for universal plans)
    if (propertyType !== 'universal' && propertyId) {
      const propertyTable = propertyType === "hostel" ? "hostels" : "cabins";
      const { data: property, error: propError } = await adminClient
        .from(propertyTable)
        .select("id, created_by")
        .eq("id", propertyId)
        .single();

      if (propError || !property || property.created_by !== userId) {
        return new Response(JSON.stringify({ error: "Property not found or not owned by you" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Get plan
    const { data: plan, error: planError } = await adminClient
      .from("subscription_plans")
      .select("*")
      .eq("id", planId)
      .eq("is_active", true)
      .single();

    if (planError || !plan) {
      return new Response(JSON.stringify({ error: "Plan not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check no downgrade: current active subscription must have lower display_order
    let currentSub: any = null;
    if (propertyType !== 'universal' && propertyId) {
      const { data } = await adminClient
        .from("property_subscriptions")
        .select("plan_id, subscription_plans(display_order)")
        .eq("property_id", propertyId)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      currentSub = data;
    }

    if (currentSub) {
      const currentOrder = (currentSub as any).subscription_plans?.display_order || 0;
      if (plan.display_order <= currentOrder) {
        return new Response(JSON.stringify({ error: "Cannot downgrade. Only upgrades are allowed." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Calculate amount with discount
    let basePrice = plan.price_yearly;
    let discountAmount = 0;
    if (plan.discount_active && plan.discount_percentage > 0) {
      discountAmount = Math.round(basePrice * plan.discount_percentage / 100);
      basePrice = basePrice - discountAmount;
    }
    let totalAmount = basePrice;
    let capacityUpgradeAmount = 0;
    if (capacityUpgrades > 0 && plan.capacity_upgrade_enabled) {
      capacityUpgradeAmount = capacityUpgrades * plan.capacity_upgrade_price * 12;
      totalAmount += capacityUpgradeAmount;
    }

    // Validate and apply coupon if provided
    let couponId: string | null = null;
    let couponDiscountAmount = 0;
    if (couponCode) {
      const { data: coupon, error: couponError } = await adminClient
        .from("coupons")
        .select("*")
        .eq("code", couponCode.toUpperCase())
        .eq("is_active", true)
        .single();

      if (couponError || !coupon) {
        return new Response(JSON.stringify({ error: "Invalid or expired coupon code" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const now = new Date();
      if (now < new Date(coupon.start_date) || now > new Date(coupon.end_date)) {
        return new Response(JSON.stringify({ error: "Coupon has expired" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const applicableFor = coupon.applicable_for || ['all'];
      if (!applicableFor.includes('all') && !applicableFor.includes('subscription')) {
        return new Response(JSON.stringify({ error: "Coupon not applicable for subscriptions" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (coupon.min_order_amount && totalAmount < coupon.min_order_amount) {
        return new Response(JSON.stringify({ error: `Minimum order amount is ₹${coupon.min_order_amount}` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (coupon.usage_limit && (coupon.usage_count || 0) >= coupon.usage_limit) {
        return new Response(JSON.stringify({ error: "Coupon usage limit reached" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Calculate coupon discount
      if (coupon.type === 'percentage') {
        couponDiscountAmount = Math.round(totalAmount * coupon.value / 100);
        if (coupon.max_discount_amount && couponDiscountAmount > coupon.max_discount_amount) {
          couponDiscountAmount = coupon.max_discount_amount;
        }
      } else {
        couponDiscountAmount = Math.min(coupon.value, totalAmount);
      }
      couponDiscountAmount = Math.round(couponDiscountAmount);
      couponId = coupon.id;
      totalAmount = Math.max(0, totalAmount - couponDiscountAmount);

      // Increment usage count
      await adminClient
        .from("coupons")
        .update({ usage_count: (coupon.usage_count || 0) + 1 })
        .eq("id", coupon.id);
    }

    // Create subscription row
    const insertData: any = {
      partner_id: partner.id,
      property_type: propertyType,
      property_id: propertyType === 'universal' ? null : propertyId,
      plan_id: planId,
      status: "pending_payment",
      amount_paid: totalAmount,
      capacity_upgrades: capacityUpgrades,
      capacity_upgrade_amount: capacityUpgradeAmount,
      payment_status: "pending",
      previous_plan_id: currentSub?.plan_id || null,
      start_date: new Date().toISOString().split("T")[0],
      end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    };
    if (couponId) {
      insertData.coupon_id = couponId;
      insertData.coupon_discount = couponDiscountAmount;
    }

    const { data: subscription, error: subError } = await adminClient
      .from("property_subscriptions")
      .insert(insertData)
      .select()
      .single();

    if (subError || !subscription) {
      console.error("Error creating subscription:", subError);
      return new Response(JSON.stringify({ error: "Failed to create subscription" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const RAZORPAY_KEY_ID = Deno.env.get("RAZORPAY_KEY_ID");
    const RAZORPAY_KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET");

    // Test mode
    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
      return new Response(
        JSON.stringify({
          testMode: true,
          id: `test_order_${Date.now()}`,
          amount: Math.round(totalAmount * 100),
          currency: "INR",
          subscriptionId: subscription.id,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Razorpay order
    const orderResponse = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Basic " + btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`),
      },
      body: JSON.stringify({
        amount: Math.round(totalAmount * 100),
        currency: "INR",
        receipt: `sub_${subscription.id}`,
        notes: {
          subscriptionId: subscription.id,
          planName: plan.name,
          propertyType,
          propertyId,
          userId,
        },
      }),
    });

    if (!orderResponse.ok) {
      const errorText = await orderResponse.text();
      console.error("Razorpay order creation failed:", errorText);
      return new Response(JSON.stringify({ error: "Failed to create Razorpay order" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const order = await orderResponse.json();

    // Update subscription with razorpay order id
    await adminClient
      .from("property_subscriptions")
      .update({ razorpay_order_id: order.id })
      .eq("id", subscription.id);

    return new Response(
      JSON.stringify({
        id: order.id,
        amount: order.amount,
        currency: order.currency,
        KEY_ID: RAZORPAY_KEY_ID,
        subscriptionId: subscription.id,
      }),
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
