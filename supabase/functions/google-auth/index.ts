import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/drive.readonly",
].join(" ");

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
    const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");

    if (!clientId || !clientSecret) {
      console.error("Missing Google OAuth credentials");
      throw new Error("Google OAuth credentials not configured");
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const url = new URL(req.url);
    let action = url.searchParams.get("action");

    // For callback, we don't require auth header (it's a redirect from Google)
    if (action === "callback") {
      const code = url.searchParams.get("code");
      const stateId = url.searchParams.get("state");
      const origin = req.headers.get("origin") || "https://taskbit.lovable.app";

      console.log("OAuth callback received, state_id:", stateId);

      if (!code) {
        throw new Error("No authorization code received");
      }

      if (!stateId) {
        throw new Error("Missing state parameter");
      }

      // Validate state from database
      const { data: stateData, error: stateError } = await supabaseAdmin
        .from("oauth_states")
        .select("user_id, expires_at")
        .eq("id", stateId)
        .single();

      if (stateError || !stateData) {
        console.error("Invalid state parameter - possible attack attempt");
        throw new Error("Invalid state parameter");
      }

      // Check expiry
      if (new Date(stateData.expires_at) < new Date()) {
        // Clean up expired state
        await supabaseAdmin.from("oauth_states").delete().eq("id", stateId);
        throw new Error("State expired. Please try again.");
      }

      // Delete used state (one-time use)
      await supabaseAdmin.from("oauth_states").delete().eq("id", stateId);

      const userId = stateData.user_id;
      console.log("State validated for user:", userId);

      const redirectUri = `${Deno.env.get("SUPABASE_URL")}/functions/v1/google-auth?action=callback`;

      // Exchange code for tokens
      const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          code,
          grant_type: "authorization_code",
          redirect_uri: redirectUri,
        }),
      });

      const tokens = await tokenResponse.json();

      if (tokens.error) {
        console.error("Token exchange error:", tokens);
        throw new Error(tokens.error_description || "Failed to exchange code for tokens");
      }

      console.log("Tokens received successfully");

      const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

      const { error: upsertError } = await supabaseAdmin
        .from("google_integrations")
        .upsert({
          user_id: userId,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          token_expires_at: expiresAt.toISOString(),
          scopes: GOOGLE_SCOPES.split(" "),
          gmail_enabled: true,
          calendar_enabled: true,
          drive_enabled: true,
        }, { onConflict: "user_id" });

      if (upsertError) {
        console.error("Database error:", upsertError);
        throw new Error("Failed to store integration tokens");
      }

      console.log("Integration stored successfully for user:", userId);

      return new Response(null, {
        status: 302,
        headers: { Location: `${origin}/settings?google=connected` },
      });
    }

    // All other actions require auth
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

    // Get action from body if not in URL
    if (!action) {
      try {
        const body = await req.json();
        action = body.action;
      } catch {}
    }

    const origin = req.headers.get("origin") || "https://taskbit.lovable.app";
    console.log("Google auth action:", action, "user:", userData.user.id);

    if (action === "authorize") {
      // Create a secure state entry in the database
      const { data: stateData, error: stateError } = await supabaseAdmin
        .from("oauth_states")
        .insert({ user_id: userData.user.id })
        .select("id")
        .single();

      if (stateError || !stateData) {
        console.error("Failed to create OAuth state:", stateError);
        throw new Error("Failed to initiate OAuth flow");
      }

      const redirectUri = `${Deno.env.get("SUPABASE_URL")}/functions/v1/google-auth?action=callback`;

      const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
      authUrl.searchParams.set("client_id", clientId);
      authUrl.searchParams.set("redirect_uri", redirectUri);
      authUrl.searchParams.set("response_type", "code");
      authUrl.searchParams.set("scope", GOOGLE_SCOPES);
      authUrl.searchParams.set("access_type", "offline");
      authUrl.searchParams.set("prompt", "consent");
      authUrl.searchParams.set("state", stateData.id);

      console.log("Generated auth URL for user:", userData.user.id);

      return new Response(
        JSON.stringify({ url: authUrl.toString() }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "disconnect") {
      const { error: deleteError } = await supabaseAdmin
        .from("google_integrations")
        .delete()
        .eq("user_id", userData.user.id);

      if (deleteError) {
        console.error("Delete error:", deleteError);
        throw new Error("Failed to disconnect integration");
      }

      console.log("Integration disconnected for user:", userData.user.id);

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "status") {
      // Return integration status without exposing tokens
      const { data: integration, error: intError } = await supabaseAdmin
        .from("google_integrations")
        .select("gmail_enabled, calendar_enabled, drive_enabled")
        .eq("user_id", userData.user.id)
        .single();

      if (intError || !integration) {
        return new Response(
          JSON.stringify({ connected: false }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({
          connected: true,
          gmail_enabled: integration.gmail_enabled,
          calendar_enabled: integration.calendar_enabled,
          drive_enabled: integration.drive_enabled,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    throw new Error("Invalid action. Use 'authorize', 'callback', 'disconnect', or 'status'");
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Google auth error:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }
});
