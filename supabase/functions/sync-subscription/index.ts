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

    let plan: "free" | "pro" | "team" = "free";
    let status: string = "inactive";
    let stripeSubscriptionId: string | null = null;
    let currentPeriodEndIso: string | null = null;

    const deriveFromSubscription = async (subscriptionId: string) => {
      const sub = await stripe.subscriptions.retrieve(subscriptionId, {
        expand: ["items.data.price"],
      });

      const hasProItem = sub.items.data.some((item: Stripe.SubscriptionItem) => {
        const priceId = typeof item.price === "string" ? item.price : item.price.id;
        return PRO_PRICE_IDS.includes(priceId);
      });

      const isActive = sub.status === "active" || sub.status === "trialing";

      // Check if this is a team subscription via metadata
      const isTeamSub = sub.metadata?.owner_id !== undefined || 
                        (sub as any).metadata?.seat_count !== undefined;

      if (isActive) {
        if (isTeamSub) {
          plan = "team";
        } else if (hasProItem) {
          plan = "pro";
        } else {
          plan = "free";
        }
        status = sub.status;
      } else {
        plan = "free";
        status = sub.status;
      }

      stripeSubscriptionId = sub.id;
      currentPeriodEndIso = sub.current_period_end
        ? new Date(sub.current_period_end * 1000).toISOString()
        : null;

      // If team subscription, also upsert team_subscriptions table
      if (isTeamSub && isActive && sub.metadata?.owner_id) {
        const admin = createClient(supabaseUrl, supabaseServiceRoleKey);
        
        // Find or create workspace for the owner
        const ownerId = sub.metadata.owner_id;
        const workspaceName = sub.metadata.workspace_name || "Team Workspace";
        const seatCount = parseInt(sub.metadata.seat_count || "2", 10);
        
        let workspaceId: string | null = null;
        
        // Check if a workspace already exists for this subscription
        const { data: existingTeamSub } = await admin
          .from("team_subscriptions")
          .select("workspace_id")
          .eq("stripe_subscription_id", sub.id)
          .maybeSingle();
        
        if (existingTeamSub?.workspace_id) {
          workspaceId = existingTeamSub.workspace_id;
        } else {
          // Check if owner already has a workspace
          const { data: existingWorkspace } = await admin
            .from("workspaces")
            .select("id")
            .eq("owner_id", ownerId)
            .maybeSingle();
          
          if (existingWorkspace) {
            workspaceId = existingWorkspace.id;
            // Update workspace name
            await admin
              .from("workspaces")
              .update({ name: workspaceName })
              .eq("id", workspaceId);
          } else {
            // Create new workspace
            const { data: newWorkspace, error: wsError } = await admin
              .from("workspaces")
              .insert({ owner_id: ownerId, name: workspaceName })
              .select("id")
              .single();
            
            if (!wsError && newWorkspace) {
              workspaceId = newWorkspace.id;
            }
          }
        }
        
        if (workspaceId) {
          // Upsert team_subscriptions
          await admin
            .from("team_subscriptions")
            .upsert(
              {
                workspace_id: workspaceId,
                owner_id: ownerId,
                seat_count: seatCount,
                plan: "team",
                status: sub.status,
                stripe_customer_id: customerId,
                stripe_subscription_id: sub.id,
                current_period_end: currentPeriodEndIso,
              },
              { onConflict: "workspace_id" }
            );
          
          // Add team members
          if (sub.metadata.team_emails) {
            try {
              const teamEmails: string[] = JSON.parse(sub.metadata.team_emails);
              for (const memberEmail of teamEmails) {
                if (!memberEmail?.trim()) continue;
                // Check if already exists
                const { data: existingMember } = await admin
                  .from("workspace_members")
                  .select("id")
                  .eq("workspace_id", workspaceId)
                  .eq("email", memberEmail)
                  .maybeSingle();
                
                if (!existingMember) {
                  await admin.from("workspace_members").insert({
                    workspace_id: workspaceId,
                    user_id: ownerId, // placeholder until they join
                    email: memberEmail,
                    role: "member",
                    status: "pending",
                  });
                }
              }
            } catch (e) {
              console.error("Error parsing team_emails metadata:", e);
            }
          }
          
          // Also update the user's personal subscription to team
          plan = "team";
        }
      }
    };

    if (body.sessionId) {
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

    // Fallback: find the latest active/trialing subscription
    if (!stripeSubscriptionId) {
      const subs = await stripe.subscriptions.list({
        customer: customerId,
        status: "all",
        limit: 10,
      });

      const preferred = subs.data.find(
        (s: Stripe.Subscription) => s.status === "active" || s.status === "trialing"
      ) ?? subs.data[0];
      if (preferred) {
        await deriveFromSubscription(preferred.id);
      }
    }

    // Upsert user_subscriptions (service role bypasses RLS)
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
