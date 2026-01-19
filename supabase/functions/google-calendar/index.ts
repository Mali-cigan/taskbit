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

    if (!integration.calendar_enabled) {
      throw new Error("Calendar integration not enabled");
    }

    const accessToken = await refreshTokenIfNeeded(
      supabaseAdmin,
      integration,
      clientId,
      clientSecret
    );

    let action = "list";
    let requestBody: { action?: string; title?: string; start?: string; end?: string; description?: string; location?: string } = {};
    
    // Try to get action from body first
    try {
      const clonedReq = req.clone();
      requestBody = await clonedReq.json();
      action = requestBody.action || "list";
    } catch {
      // If body parsing fails, check URL params
      const url = new URL(req.url);
      action = url.searchParams.get("action") || "list";
    }

    if (action === "list") {
      // Get upcoming events
      const timeMin = new Date().toISOString();
      const timeMax = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days

      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${timeMin}&timeMax=${timeMax}&maxResults=20&singleEvents=true&orderBy=startTime`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error.message);
      }

      const events = (data.items || []).map((event: {
        id: string;
        summary?: string;
        start?: { dateTime?: string; date?: string };
        end?: { dateTime?: string; date?: string };
        location?: string;
        description?: string;
      }) => ({
        id: event.id,
        title: event.summary || "(No title)",
        start: event.start?.dateTime || event.start?.date,
        end: event.end?.dateTime || event.end?.date,
        location: event.location,
        description: event.description,
      }));

      return new Response(
        JSON.stringify({ events }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "create") {
      const { title, start, end, description, location } = requestBody;

      if (!title || !start || !end) {
        throw new Error("Title, start, and end are required");
      }

      const response = await fetch(
        "https://www.googleapis.com/calendar/v3/calendars/primary/events",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            summary: title,
            start: { dateTime: start },
            end: { dateTime: end },
            description,
            location,
          }),
        }
      );

      const event = await response.json();
      
      if (event.error) {
        throw new Error(event.error.message);
      }

      return new Response(
        JSON.stringify({ event }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    throw new Error("Invalid action");
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Calendar error:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }
});
