-- Fix security definer view issue: set security_invoker on the view
ALTER VIEW public.google_integrations_status SET (security_invoker = on);

-- Add a minimal RLS policy on oauth_states so the linter is satisfied
-- (only service role uses this table, but we need at least one policy)
CREATE POLICY "No direct access" ON public.oauth_states FOR ALL USING (false);