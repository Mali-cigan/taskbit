import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PRO_PRICE_IDS = ["price_1Sqvy9KefwlQqUtJgM5mDtOr"]; // Pro monthly

type SyncRequest = {
  force?: boolean;
  sessionId?: string;
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

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
      console.error("Missing backend env vars for sync-subscription");
      throw new Error("Server is not configured");
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");

    // Validate user via anon client
    const authClient = createClient(supabaseUrl, supabaseAnonKey);
    const { data: userData, error: userError } = await authClient.auth.getUser(token);

    if (userError || !userData.user) {
      console.error("Auth error:", userError);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const user = userData.user;
    const email = user.email;
    if (!email) {
      throw new Error("User email not found");
    }

    const body: SyncRequest = await req.json().catch(() => ({}));

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Find (or create) customer
    const customers = await stripe.customers.list({ email, limit: 1 });
    let customerId: string;

    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    } else {
      const customer = await stripe.customers.create({
        email,
        metadata: { supabase_user_id: user.id },
      });
      customerId = customer.id;
    }

    let plan: "free" | "pro" = "free";
    let status: string = "inactive";
    let stripeSubscriptionId: string | null = null;
    let currentPeriodEndIso: string | null = null;

    const deriveFromSubscription = async (subscriptionId: string) => {
      const sub = await stripe.subscriptions.retrieve(subscriptionId, {
        expand: ["items.data.price"],
      });

      const hasProItem = sub.items.data.some((item) => {
        const priceId = typeof item.price === "string" ? item.price : item.price.id;
        return PRO_PRICE_IDS.includes(priceId);
      });

      const isActive = sub.status === "active" || sub.status === "trialing";

      if (hasProItem && isActive) {
        plan = "pro";
        status = sub.status;
      } else {
        plan = "free";
        status = sub.status;
      }

      stripeSubscriptionId = sub.id;
      currentPeriodEndIso = sub.current_period_end
        ? new Date(sub.current_period_end * 1000).toISOString()
        : null;
    };

    if (body.sessionId) {
      // If we have a checkout session id, use it to find the exact subscription.
      const session = await stripe.checkout.sessions.retrieve(body.sessionId, {
        expand: ["subscription"],
      });

      const subId =
        typeof session.subscription === "string"
          ? session.subscription
          : session.subscription?.id;

      if (subId) {
        await deriveFromSubscription(subId);
      }
    }

    // Fallback: find the latest active/trialing subscription for the customer
    if (!stripeSubscriptionId) {
      const subs = await stripe.subscriptions.list({
        customer: customerId,
        status: "all",
        limit: 10,
      });

      const preferred = subs.data.find((s) => s.status === "active" || s.status === "trialing") ?? subs.data[0];
      if (preferred) {
        await deriveFromSubscription(preferred.id);
      }
    }

    // Upsert subscription row (service role bypasses RLS; clients cannot write this table)
    const admin = createClient(supabaseUrl, supabaseServiceRoleKey);

    const { error: upsertError } = await admin
      .from("user_subscriptions")
      .upsert(
        {
          user_id: user.id,
          plan,
          status,
          stripe_customer_id: customerId,
          stripe_subscription_id: stripeSubscriptionId,
          current_period_end: currentPeriodEndIso,
        },
        { onConflict: "user_id" }
      );

    if (upsertError) {
      console.error("Failed to upsert user_subscriptions:", upsertError);
      throw new Error("Failed to update subscription");
    }

    return new Response(
      JSON.stringify({ plan, status, stripe_customer_id: customerId, stripe_subscription_id: stripeSubscriptionId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("sync-subscription error:", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
