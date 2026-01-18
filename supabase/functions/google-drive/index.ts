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

    if (!integration.drive_enabled) {
      throw new Error("Drive integration not enabled");
    }

    const accessToken = await refreshTokenIfNeeded(
      supabaseAdmin,
      integration,
      clientId,
      clientSecret
    );

    const url = new URL(req.url);
    const action = url.searchParams.get("action") || "list";

    if (action === "list") {
      const folderId = url.searchParams.get("folderId") || "root";
      const pageToken = url.searchParams.get("pageToken");

      let apiUrl = `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents&fields=files(id,name,mimeType,modifiedTime,size,webViewLink,iconLink),nextPageToken&pageSize=20&orderBy=modifiedTime+desc`;
      
      if (pageToken) {
        apiUrl += `&pageToken=${pageToken}`;
      }

      const response = await fetch(apiUrl, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error.message);
      }

      const files = (data.files || []).map((file: {
        id: string;
        name: string;
        mimeType: string;
        modifiedTime?: string;
        size?: string;
        webViewLink?: string;
        iconLink?: string;
      }) => ({
        id: file.id,
        name: file.name,
        type: file.mimeType,
        isFolder: file.mimeType === "application/vnd.google-apps.folder",
        modifiedTime: file.modifiedTime,
        size: file.size,
        webViewLink: file.webViewLink,
        iconLink: file.iconLink,
      }));

      return new Response(
        JSON.stringify({ files, nextPageToken: data.nextPageToken }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "search") {
      const query = url.searchParams.get("q");
      if (!query) {
        throw new Error("Search query required");
      }

      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=name+contains+'${encodeURIComponent(query)}'&fields=files(id,name,mimeType,modifiedTime,size,webViewLink,iconLink)&pageSize=20`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error.message);
      }

      const files = (data.files || []).map((file: {
        id: string;
        name: string;
        mimeType: string;
        modifiedTime?: string;
        size?: string;
        webViewLink?: string;
        iconLink?: string;
      }) => ({
        id: file.id,
        name: file.name,
        type: file.mimeType,
        isFolder: file.mimeType === "application/vnd.google-apps.folder",
        modifiedTime: file.modifiedTime,
        size: file.size,
        webViewLink: file.webViewLink,
        iconLink: file.iconLink,
      }));

      return new Response(
        JSON.stringify({ files }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    throw new Error("Invalid action");
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Drive error:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }
});
