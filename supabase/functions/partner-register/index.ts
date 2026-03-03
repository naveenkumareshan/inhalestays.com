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
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { name, email, phone, password, propertyTypes } = await req.json();

    if (!name || !email || !phone || !password) {
      return new Response(
        JSON.stringify({ error: "Name, email, phone and password are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate email
    if (!/\S+@\S+\.\S+/.test(email)) {
      return new Response(
        JSON.stringify({ error: "Invalid email address" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate phone
    if (!/^\d{10}$/.test(phone)) {
      return new Response(
        JSON.stringify({ error: "Invalid phone number. Must be 10 digits." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create user
    const { data: newUser, error: createError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name },
      });

    if (createError) {
      if (createError.message?.includes("already been registered")) {
        return new Response(
          JSON.stringify({ error: "This email is already registered. Please login instead." }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw createError;
    }

    const userId = newUser.user.id;

    // Change role from default 'student' to 'vendor'
    await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", userId)
      .eq("role", "student");

    await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: userId, role: "vendor" });

    // Update profile with phone
    await supabaseAdmin
      .from("profiles")
      .update({ name, phone })
      .eq("id", userId);

    // Create minimal partner record for admin follow-up
    const partnerData: any = {
      user_id: userId,
      business_name: name,
      business_type: "individual",
      contact_person: name,
      email,
      phone,
      status: "pending",
      address: {
        street: "",
        city: "",
        state: "",
        pincode: "",
        country: "India",
      },
    };

    // Store interested property types in business_details
    if (propertyTypes && Array.isArray(propertyTypes) && propertyTypes.length > 0) {
      partnerData.business_details = { interested_property_types: propertyTypes };
    }

    const { error: partnerError } = await supabaseAdmin
      .from("partners")
      .insert(partnerData);

    if (partnerError) {
      console.error("Failed to create partner record:", partnerError);
    }

    return new Response(
      JSON.stringify({ success: true, userId, email }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("partner-register error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Registration failed. Please try again.",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
