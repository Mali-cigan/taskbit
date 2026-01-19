import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TEAM_PRICE_PER_SEAT = 2000; // $20 per seat per month in cents

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      console.error("STRIPE_SECRET_KEY is not configured");
      throw new Error("Stripe is not configured");
    }

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

    const body = await req.json();
    const { seatCount, workspaceName, members } = body;

    // Support both old (teamEmails) and new (members) format
    const teamEmails: string[] = members 
      ? members.map((m: { email: string }) => m.email).filter((e: string) => e?.trim())
      : body.teamEmails || [];

    const actualSeatCount = seatCount || Math.max(teamEmails.length + 1, 1);

    if (actualSeatCount < 1 || actualSeatCount > 100) {
      throw new Error("Seat count must be between 1 and 100");
    }

    // Validate emails if provided
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    for (const teamEmail of teamEmails) {
      if (teamEmail && !emailRegex.test(teamEmail)) {
        throw new Error(`Invalid email: ${teamEmail}`);
      }
    }

    console.log("Creating team checkout session for user:", email, "seats:", actualSeatCount);

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

    const origin = req.headers.get("origin") || "https://taskbit.lovable.app";

    // Create or retrieve the team price
    let teamPrice: Stripe.Price;
    const existingPrices = await stripe.prices.list({
      lookup_keys: ["team_per_seat"],
      limit: 1,
    });

    if (existingPrices.data.length > 0) {
      teamPrice = existingPrices.data[0];
    } else {
      // Create a new product and price for team seats
      const product = await stripe.products.create({
        name: "Taskbit Team",
        description: "Team workspace subscription with shared access",
      });

      teamPrice = await stripe.prices.create({
        product: product.id,
        unit_amount: TEAM_PRICE_PER_SEAT,
        currency: "usd",
        recurring: { interval: "month" },
        lookup_key: "team_per_seat",
      });
    }

    // Store team info in metadata for the webhook to use later
    const teamMetadata = {
      owner_id: user.id,
      owner_email: email,
      workspace_name: workspaceName || "Team Workspace",
      team_emails: JSON.stringify(teamEmails),
      seat_count: actualSeatCount.toString(),
    };

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [
        {
          price: teamPrice.id,
          quantity: actualSeatCount,
        },
      ],
      mode: "subscription",
      success_url: `${origin}/pricing?success=true&session_id={CHECKOUT_SESSION_ID}&team=true`,
      cancel_url: `${origin}/pricing?canceled=true`,
      subscription_data: {
        metadata: teamMetadata,
      },
      metadata: teamMetadata,
    });

    console.log("Team checkout session created:", session.id, "seats:", actualSeatCount);

    return new Response(
      JSON.stringify({ 
        url: session.url,
        totalAmount: TEAM_PRICE_PER_SEAT * actualSeatCount,
        seatCount: actualSeatCount,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error creating team checkout session:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
