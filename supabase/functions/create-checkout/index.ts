import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      console.error("STRIPE_SECRET_KEY is not configured");
      throw new Error("Stripe is not configured");
    }

    // Get user from auth header
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !userData.user) {
      console.error("Auth error:", userError);
      throw new Error("Unauthorized");
    }

    const user = userData.user;
    const email = user.email;

    if (!email) {
      throw new Error("User email not found");
    }

    console.log("Creating checkout session for user:", email);

    const stripe = new Stripe(stripeKey, {
      apiVersion: "2023-10-16",
    });

    // Check if customer already exists
    const customers = await stripe.customers.list({
      email: email,
      limit: 1,
    });

    let customerId: string;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      console.log("Found existing customer:", customerId);
    } else {
      const customer = await stripe.customers.create({
        email: email,
        metadata: {
          supabase_user_id: user.id,
        },
      });
      customerId = customer.id;
      console.log("Created new customer:", customerId);
    }

    // Whitelist of allowed price IDs to prevent price manipulation attacks
    const ALLOWED_PRICE_IDS = [
      'price_1Sqvy9KefwlQqUtJgM5mDtOr', // Pro plan monthly
    ];

    // Get request body for price ID and optional promo code
    const { priceId, promoCode } = await req.json();
    
    if (!priceId) {
      throw new Error("Price ID is required");
    }

    // Validate price ID against whitelist
    if (!ALLOWED_PRICE_IDS.includes(priceId)) {
      console.error("Invalid price ID attempted:", priceId);
      throw new Error("Invalid price ID");
    }

    console.log("Creating checkout session with price:", priceId);

    // Get the origin for success/cancel URLs
    const origin = req.headers.get("origin") || "https://taskbit.lovable.app";

    // Build checkout session options
    const sessionOptions: Stripe.Checkout.SessionCreateParams = {
      customer: customerId,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      // Return users to pricing so we can sync entitlements immediately
      success_url: `${origin}/pricing?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/pricing?canceled=true`,
      allow_promotion_codes: true, // Always allow promo codes
    };

    // If a specific promo code was provided, apply it directly
    if (promoCode) {
      console.log("Applying promo code:", promoCode);
      // Look up the promotion code in Stripe
      const promoCodes = await stripe.promotionCodes.list({
        code: promoCode,
        active: true,
        limit: 1,
      });
      
      if (promoCodes.data.length > 0) {
        sessionOptions.discounts = [{ promotion_code: promoCodes.data[0].id }];
        delete sessionOptions.allow_promotion_codes; // Can't use both
      } else {
        console.log("Promo code not found or inactive:", promoCode);
        throw new Error("Invalid promo code");
      }
    }

    const session = await stripe.checkout.sessions.create(sessionOptions);


    console.log("Checkout session created:", session.id);

    return new Response(
      JSON.stringify({ url: session.url }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error creating checkout session:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
