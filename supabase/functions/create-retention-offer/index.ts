import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-RETENTION-OFFER] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");
    
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !user) throw new Error("Authentication failed");
    logStep("User authenticated", { userId: user.id });

    // Get request body
    const { currentPlan, discountPercent = 30, durationMonths = 3 } = await req.json();
    logStep("Request received", { currentPlan, discountPercent, durationMonths });

    // Get user email
    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (!profile) throw new Error("User profile not found");

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Get customer
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    if (customers.data.length === 0) {
      throw new Error("No Stripe customer found");
    }
    const customerId = customers.data[0].id;
    logStep("Stripe customer found", { customerId });

    // Create a unique coupon code for this retention offer
    const couponCode = `RETENTION_${user.id.slice(0, 8).toUpperCase()}_${Date.now()}`;
    
    // Create coupon in Stripe
    const coupon = await stripe.coupons.create({
      percent_off: discountPercent,
      duration: 'repeating',
      duration_in_months: durationMonths,
      name: `Oferta de Retenção - ${discountPercent}% OFF`,
      metadata: {
        user_id: user.id,
        retention_offer: 'true',
        original_plan: currentPlan,
      },
    });

    logStep("Coupon created", { couponId: coupon.id });

    // Create a promotion code (user-friendly code)
    const promotionCode = await stripe.promotionCodes.create({
      coupon: coupon.id,
      code: couponCode,
      max_redemptions: 1,
      expires_at: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60), // 7 days
      metadata: {
        user_id: user.id,
        retention_offer: 'true',
      },
    });

    logStep("Promotion code created", { code: promotionCode.code });

    return new Response(
      JSON.stringify({
        success: true,
        couponCode: promotionCode.code,
        discountPercent,
        durationMonths,
        expiresIn: '7 dias',
        message: `Desconto de ${discountPercent}% criado com sucesso!`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }
});
