import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function refreshTokenIfNeeded(
  supabaseAdmin: any,
  integration: { user_id: string; access_token: string; refresh_token: string; token_expires_at: string },
  clientId: string,
  clientSecret: string
): Promise<string> {
  const expiresAt = new Date(integration.token_expires_at);
  const now = new Date();
  
  // Refresh if token expires in less than 5 minutes
  if (expiresAt.getTime() - now.getTime() > 5 * 60 * 1000) {
    return integration.access_token;
  }

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: integration.refresh_token,
      grant_type: "refresh_token",
    }),
  });

  const tokens = await tokenResponse.json();
  
  if (tokens.error) {
    throw new Error("Failed to refresh token");
  }

  const newExpiresAt = new Date(Date.now() + tokens.expires_in * 1000);

  await supabaseAdmin
    .from("google_integrations")
    .update({
      access_token: tokens.access_token,
      token_expires_at: newExpiresAt.toISOString(),
    })
    .eq("user_id", integration.user_id);

  return tokens.access_token;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
    const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");
    
    if (!clientId || !clientSecret) {
      throw new Error("Google OAuth credentials not configured");
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
      throw new Error("Unauthorized");
    }

    // Get user's Google integration
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: integration, error: integrationError } = await supabaseAdmin
      .from("google_integrations")
      .select("*")
      .eq("user_id", userData.user.id)
      .single();

    if (integrationError || !integration) {
      throw new Error("Google integration not connected");
    }

    if (!integration.gmail_enabled) {
      throw new Error("Gmail integration not enabled");
    }

    const accessToken = await refreshTokenIfNeeded(
      supabaseAdmin,
      integration,
      clientId,
      clientSecret
    );

    const url = new URL(req.url);
    let action = url.searchParams.get("action");
    
    // If not in URL, try to get from body
    if (!action) {
      try {
        const clonedReq = req.clone();
        const body = await clonedReq.json();
        action = body.action || "list";
      } catch {
        action = "list";
      }
    }

    if (action === "list") {
      // Get recent emails
      const response = await fetch(
        "https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=10",
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error.message);
      }

      // Fetch details for each message
      const messages = await Promise.all(
        (data.messages || []).map(async (msg: { id: string }) => {
          const msgResponse = await fetch(
            `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`,
            {
              headers: { Authorization: `Bearer ${accessToken}` },
            }
          );
          return msgResponse.json();
        })
      );

      const formattedMessages = messages.map((msg) => {
        const headers = msg.payload?.headers || [];
        return {
          id: msg.id,
          subject: headers.find((h: { name: string }) => h.name === "Subject")?.value || "(no subject)",
          from: headers.find((h: { name: string }) => h.name === "From")?.value || "",
          date: headers.find((h: { name: string }) => h.name === "Date")?.value || "",
          snippet: msg.snippet,
        };
      });

      return new Response(
        JSON.stringify({ messages: formattedMessages }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "read") {
      const messageId = url.searchParams.get("messageId");
      if (!messageId) {
        throw new Error("Message ID required");
      }

      const response = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      const message = await response.json();
      
      return new Response(
        JSON.stringify({ message }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    throw new Error("Invalid action");
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Gmail error:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }
});
