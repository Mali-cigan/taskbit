import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Google OAuth scopes for integrations
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

    // Get action from URL query params or request body
    const url = new URL(req.url);
    let action = url.searchParams.get("action");
    
    // If not in URL, try to get from body
    if (!action) {
      try {
        const body = await req.json();
        action = body.action;
      } catch {
        // Body might be empty or not JSON
      }
    }

    const origin = req.headers.get("origin") || "https://taskbit.lovable.app";
    console.log("Google auth action:", action, "user:", userData.user.id);

    if (action === "authorize") {
      // Generate Google OAuth URL
      const redirectUri = `${Deno.env.get("SUPABASE_URL")}/functions/v1/google-auth?action=callback`;
      const state = userData.user.id; // Use user ID as state for verification
      
      const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
      authUrl.searchParams.set("client_id", clientId);
      authUrl.searchParams.set("redirect_uri", redirectUri);
      authUrl.searchParams.set("response_type", "code");
      authUrl.searchParams.set("scope", GOOGLE_SCOPES);
      authUrl.searchParams.set("access_type", "offline");
      authUrl.searchParams.set("prompt", "consent");
      authUrl.searchParams.set("state", state);

      console.log("Generated auth URL for user:", userData.user.id);
      
      return new Response(
        JSON.stringify({ url: authUrl.toString() }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "callback") {
      // Handle OAuth callback
      const code = url.searchParams.get("code");
      const state = url.searchParams.get("state");
      
      console.log("OAuth callback received, state (user_id):", state);
      
      if (!code) {
        console.error("No authorization code received");
        throw new Error("No authorization code received");
      }

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

      // Store tokens in database using service role
      const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );

      const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

      const { error: upsertError } = await supabaseAdmin
        .from("google_integrations")
        .upsert({
          user_id: state,
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

      console.log("Integration stored successfully for user:", state);

      // Redirect back to settings page
      return new Response(null, {
        status: 302,
        headers: { Location: `${origin}/settings?google=connected` },
      });
    }

    if (action === "disconnect") {
      // Remove integration
      const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );

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

    throw new Error("Invalid action. Use 'authorize', 'callback', or 'disconnect'");
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Google auth error:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }
});
