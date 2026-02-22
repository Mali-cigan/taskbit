-- Fix 1: Workspace-aware RLS for pages
DROP POLICY IF EXISTS "Users can view their own pages" ON public.pages;
DROP POLICY IF EXISTS "Users can insert their own pages" ON public.pages;
DROP POLICY IF EXISTS "Users can update their own pages" ON public.pages;
DROP POLICY IF EXISTS "Users can delete their own pages" ON public.pages;

CREATE POLICY "Users can view pages they own or workspace pages"
  ON public.pages FOR SELECT
  USING (
    auth.uid() = user_id
    OR (
      workspace_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.workspace_members
        WHERE workspace_members.workspace_id = pages.workspace_id
        AND workspace_members.user_id = auth.uid()
        AND workspace_members.status = 'active'
      )
    )
  );

CREATE POLICY "Users can insert pages they own or in their workspaces"
  ON public.pages FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND (
      workspace_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.workspace_members
        WHERE workspace_members.workspace_id = pages.workspace_id
        AND workspace_members.user_id = auth.uid()
        AND workspace_members.status = 'active'
      )
    )
  );

CREATE POLICY "Users can update pages they own or workspace pages"
  ON public.pages FOR UPDATE
  USING (
    auth.uid() = user_id
    OR (
      workspace_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.workspace_members
        WHERE workspace_members.workspace_id = pages.workspace_id
        AND workspace_members.user_id = auth.uid()
        AND workspace_members.status = 'active'
        AND workspace_members.role IN ('owner', 'admin', 'member')
      )
    )
  );

CREATE POLICY "Users can delete pages they own or workspace pages as admin"
  ON public.pages FOR DELETE
  USING (
    auth.uid() = user_id
    OR (
      workspace_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.workspace_members
        WHERE workspace_members.workspace_id = pages.workspace_id
        AND workspace_members.user_id = auth.uid()
        AND workspace_members.status = 'active'
        AND workspace_members.role IN ('owner', 'admin')
      )
    )
  );

-- Fix 1b: Workspace-aware RLS for blocks
DROP POLICY IF EXISTS "Users can view their own blocks" ON public.blocks;
DROP POLICY IF EXISTS "Users can insert their own blocks" ON public.blocks;
DROP POLICY IF EXISTS "Users can update their own blocks" ON public.blocks;
DROP POLICY IF EXISTS "Users can delete their own blocks" ON public.blocks;

CREATE POLICY "Users can view blocks they own or workspace blocks"
  ON public.blocks FOR SELECT
  USING (
    auth.uid() = user_id
    OR (
      workspace_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.workspace_members
        WHERE workspace_members.workspace_id = blocks.workspace_id
        AND workspace_members.user_id = auth.uid()
        AND workspace_members.status = 'active'
      )
    )
  );

CREATE POLICY "Users can insert blocks they own or in workspace"
  ON public.blocks FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND (
      workspace_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.workspace_members
        WHERE workspace_members.workspace_id = blocks.workspace_id
        AND workspace_members.user_id = auth.uid()
        AND workspace_members.status = 'active'
      )
    )
  );

CREATE POLICY "Users can update blocks they own or workspace blocks"
  ON public.blocks FOR UPDATE
  USING (
    auth.uid() = user_id
    OR (
      workspace_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.workspace_members
        WHERE workspace_members.workspace_id = blocks.workspace_id
        AND workspace_members.user_id = auth.uid()
        AND workspace_members.status = 'active'
        AND workspace_members.role IN ('owner', 'admin', 'member')
      )
    )
  );

CREATE POLICY "Users can delete blocks they own or workspace blocks as admin"
  ON public.blocks FOR DELETE
  USING (
    auth.uid() = user_id
    OR (
      workspace_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.workspace_members
        WHERE workspace_members.workspace_id = blocks.workspace_id
        AND workspace_members.user_id = auth.uid()
        AND workspace_members.status = 'active'
        AND workspace_members.role IN ('owner', 'admin')
      )
    )
  );

-- Fix 2: Remove client SELECT access to sensitive token columns
-- Replace the broad SELECT policy with one that only allows edge functions (service role) to see tokens
-- Client can only see integration status fields
DROP POLICY IF EXISTS "Users can view their own integrations" ON public.google_integrations;

-- Create a safe view for client access (no tokens)
CREATE OR REPLACE VIEW public.google_integrations_status AS
SELECT 
  id, user_id, 
  gmail_enabled, calendar_enabled, drive_enabled,
  token_expires_at,
  created_at, updated_at
FROM public.google_integrations;

-- RLS on the base table: no SELECT for anon/authenticated roles
-- Edge functions use service_role which bypasses RLS
-- We still need INSERT/UPDATE/DELETE policies for disconnect flow via edge functions

-- Fix 3: Create oauth_states table for secure state validation
CREATE TABLE IF NOT EXISTS public.oauth_states (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '10 minutes')
);

ALTER TABLE public.oauth_states ENABLE ROW LEVEL SECURITY;
-- No client access needed - only edge functions with service role use this table