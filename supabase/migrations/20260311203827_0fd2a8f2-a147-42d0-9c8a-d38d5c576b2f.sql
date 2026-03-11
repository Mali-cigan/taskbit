-- Fix workspace loading by replacing restrictive RLS policies with permissive ones
-- Pages
DROP POLICY IF EXISTS "Users can view pages they own or workspace pages" ON public.pages;
CREATE POLICY "Users can view pages they own or workspace pages"
ON public.pages
FOR SELECT
TO authenticated
USING (
  (auth.uid() = user_id)
  OR (
    workspace_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.workspace_members
      WHERE workspace_members.workspace_id = pages.workspace_id
        AND workspace_members.user_id = auth.uid()
        AND workspace_members.status = 'active'
    )
  )
);

DROP POLICY IF EXISTS "Users can insert pages they own or in their workspaces" ON public.pages;
CREATE POLICY "Users can insert pages they own or in their workspaces"
ON public.pages
FOR INSERT
TO authenticated
WITH CHECK (
  (auth.uid() = user_id)
  AND (
    workspace_id IS NULL
    OR EXISTS (
      SELECT 1
      FROM public.workspace_members
      WHERE workspace_members.workspace_id = pages.workspace_id
        AND workspace_members.user_id = auth.uid()
        AND workspace_members.status = 'active'
    )
  )
);

DROP POLICY IF EXISTS "Users can update pages they own or workspace pages" ON public.pages;
CREATE POLICY "Users can update pages they own or workspace pages"
ON public.pages
FOR UPDATE
TO authenticated
USING (
  (auth.uid() = user_id)
  OR (
    workspace_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.workspace_members
      WHERE workspace_members.workspace_id = pages.workspace_id
        AND workspace_members.user_id = auth.uid()
        AND workspace_members.status = 'active'
        AND workspace_members.role = ANY (ARRAY['owner'::text, 'admin'::text, 'member'::text])
    )
  )
)
WITH CHECK (
  (auth.uid() = user_id)
  OR (
    workspace_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.workspace_members
      WHERE workspace_members.workspace_id = pages.workspace_id
        AND workspace_members.user_id = auth.uid()
        AND workspace_members.status = 'active'
        AND workspace_members.role = ANY (ARRAY['owner'::text, 'admin'::text, 'member'::text])
    )
  )
);

DROP POLICY IF EXISTS "Users can delete pages they own or workspace pages as admin" ON public.pages;
CREATE POLICY "Users can delete pages they own or workspace pages as admin"
ON public.pages
FOR DELETE
TO authenticated
USING (
  (auth.uid() = user_id)
  OR (
    workspace_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.workspace_members
      WHERE workspace_members.workspace_id = pages.workspace_id
        AND workspace_members.user_id = auth.uid()
        AND workspace_members.status = 'active'
        AND workspace_members.role = ANY (ARRAY['owner'::text, 'admin'::text])
    )
  )
);

-- Blocks
DROP POLICY IF EXISTS "Users can view blocks they own or workspace blocks" ON public.blocks;
CREATE POLICY "Users can view blocks they own or workspace blocks"
ON public.blocks
FOR SELECT
TO authenticated
USING (
  (auth.uid() = user_id)
  OR (
    workspace_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.workspace_members
      WHERE workspace_members.workspace_id = blocks.workspace_id
        AND workspace_members.user_id = auth.uid()
        AND workspace_members.status = 'active'
    )
  )
);

DROP POLICY IF EXISTS "Users can insert blocks they own or in workspace" ON public.blocks;
CREATE POLICY "Users can insert blocks they own or in workspace"
ON public.blocks
FOR INSERT
TO authenticated
WITH CHECK (
  (auth.uid() = user_id)
  AND (
    workspace_id IS NULL
    OR EXISTS (
      SELECT 1
      FROM public.workspace_members
      WHERE workspace_members.workspace_id = blocks.workspace_id
        AND workspace_members.user_id = auth.uid()
        AND workspace_members.status = 'active'
    )
  )
);

DROP POLICY IF EXISTS "Users can update blocks they own or workspace blocks" ON public.blocks;
CREATE POLICY "Users can update blocks they own or workspace blocks"
ON public.blocks
FOR UPDATE
TO authenticated
USING (
  (auth.uid() = user_id)
  OR (
    workspace_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.workspace_members
      WHERE workspace_members.workspace_id = blocks.workspace_id
        AND workspace_members.user_id = auth.uid()
        AND workspace_members.status = 'active'
        AND workspace_members.role = ANY (ARRAY['owner'::text, 'admin'::text, 'member'::text])
    )
  )
)
WITH CHECK (
  (auth.uid() = user_id)
  OR (
    workspace_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.workspace_members
      WHERE workspace_members.workspace_id = blocks.workspace_id
        AND workspace_members.user_id = auth.uid()
        AND workspace_members.status = 'active'
        AND workspace_members.role = ANY (ARRAY['owner'::text, 'admin'::text, 'member'::text])
    )
  )
);

DROP POLICY IF EXISTS "Users can delete blocks they own or workspace blocks as admin" ON public.blocks;
CREATE POLICY "Users can delete blocks they own or workspace blocks as admin"
ON public.blocks
FOR DELETE
TO authenticated
USING (
  (auth.uid() = user_id)
  OR (
    workspace_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.workspace_members
      WHERE workspace_members.workspace_id = blocks.workspace_id
        AND workspace_members.user_id = auth.uid()
        AND workspace_members.status = 'active'
        AND workspace_members.role = ANY (ARRAY['owner'::text, 'admin'::text])
    )
  )
);

-- Profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- User subscriptions
DROP POLICY IF EXISTS "Users can view their own subscription" ON public.user_subscriptions;
CREATE POLICY "Users can view their own subscription"
ON public.user_subscriptions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Google integrations
DROP POLICY IF EXISTS "Users can view their own integrations" ON public.google_integrations;
CREATE POLICY "Users can view their own integrations"
ON public.google_integrations
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own integrations" ON public.google_integrations;
CREATE POLICY "Users can update their own integrations"
ON public.google_integrations
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own integrations" ON public.google_integrations;
CREATE POLICY "Users can insert their own integrations"
ON public.google_integrations
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own integrations" ON public.google_integrations;
CREATE POLICY "Users can delete their own integrations"
ON public.google_integrations
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Workspaces
DROP POLICY IF EXISTS "Users can view workspaces they own or are members of" ON public.workspaces;
CREATE POLICY "Users can view workspaces they own or are members of"
ON public.workspaces
FOR SELECT
TO authenticated
USING (
  (auth.uid() = owner_id)
  OR EXISTS (
    SELECT 1
    FROM public.workspace_members
    WHERE workspace_members.workspace_id = workspaces.id
      AND workspace_members.user_id = auth.uid()
      AND workspace_members.status = 'active'
  )
);

DROP POLICY IF EXISTS "Users can create workspaces" ON public.workspaces;
CREATE POLICY "Users can create workspaces"
ON public.workspaces
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Owners and admins can update workspaces" ON public.workspaces;
CREATE POLICY "Owners and admins can update workspaces"
ON public.workspaces
FOR UPDATE
TO authenticated
USING (
  (auth.uid() = owner_id)
  OR EXISTS (
    SELECT 1
    FROM public.workspace_members
    WHERE workspace_members.workspace_id = workspaces.id
      AND workspace_members.user_id = auth.uid()
      AND workspace_members.role = ANY (ARRAY['owner'::text, 'admin'::text])
      AND workspace_members.status = 'active'
  )
)
WITH CHECK (
  (auth.uid() = owner_id)
  OR EXISTS (
    SELECT 1
    FROM public.workspace_members
    WHERE workspace_members.workspace_id = workspaces.id
      AND workspace_members.user_id = auth.uid()
      AND workspace_members.role = ANY (ARRAY['owner'::text, 'admin'::text])
      AND workspace_members.status = 'active'
  )
);

DROP POLICY IF EXISTS "Owners can delete workspaces" ON public.workspaces;
CREATE POLICY "Owners can delete workspaces"
ON public.workspaces
FOR DELETE
TO authenticated
USING (auth.uid() = owner_id);

-- Workspace members
DROP POLICY IF EXISTS "Members can view workspace membership" ON public.workspace_members;
CREATE POLICY "Members can view workspace membership"
ON public.workspace_members
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.workspaces
    WHERE workspaces.id = workspace_members.workspace_id
      AND workspaces.owner_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1
    FROM public.workspace_members wm
    WHERE wm.workspace_id = workspace_members.workspace_id
      AND wm.user_id = auth.uid()
      AND wm.role = ANY (ARRAY['owner'::text, 'admin'::text])
      AND wm.status = 'active'
  )
);

DROP POLICY IF EXISTS "Owners and admins can invite members" ON public.workspace_members;
CREATE POLICY "Owners and admins can invite members"
ON public.workspace_members
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.workspaces
    WHERE workspaces.id = workspace_members.workspace_id
      AND workspaces.owner_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1
    FROM public.workspace_members wm
    WHERE wm.workspace_id = workspace_members.workspace_id
      AND wm.user_id = auth.uid()
      AND wm.role = ANY (ARRAY['owner'::text, 'admin'::text])
      AND wm.status = 'active'
  )
);

DROP POLICY IF EXISTS "Owners and admins can update members" ON public.workspace_members;
CREATE POLICY "Owners and admins can update members"
ON public.workspace_members
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.workspaces
    WHERE workspaces.id = workspace_members.workspace_id
      AND workspaces.owner_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1
    FROM public.workspace_members wm
    WHERE wm.workspace_id = workspace_members.workspace_id
      AND wm.user_id = auth.uid()
      AND wm.role = ANY (ARRAY['owner'::text, 'admin'::text])
      AND wm.status = 'active'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.workspaces
    WHERE workspaces.id = workspace_members.workspace_id
      AND workspaces.owner_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1
    FROM public.workspace_members wm
    WHERE wm.workspace_id = workspace_members.workspace_id
      AND wm.user_id = auth.uid()
      AND wm.role = ANY (ARRAY['owner'::text, 'admin'::text])
      AND wm.status = 'active'
  )
);

DROP POLICY IF EXISTS "Owners and admins can remove members" ON public.workspace_members;
CREATE POLICY "Owners and admins can remove members"
ON public.workspace_members
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.workspaces
    WHERE workspaces.id = workspace_members.workspace_id
      AND workspaces.owner_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1
    FROM public.workspace_members wm
    WHERE wm.workspace_id = workspace_members.workspace_id
      AND wm.user_id = auth.uid()
      AND wm.role = ANY (ARRAY['owner'::text, 'admin'::text])
      AND wm.status = 'active'
  )
);

-- Team subscriptions
DROP POLICY IF EXISTS "Users can view team subscriptions for their workspaces" ON public.team_subscriptions;
CREATE POLICY "Users can view team subscriptions for their workspaces"
ON public.team_subscriptions
FOR SELECT
TO authenticated
USING (
  (auth.uid() = owner_id)
  OR EXISTS (
    SELECT 1
    FROM public.workspace_members
    WHERE workspace_members.workspace_id = team_subscriptions.workspace_id
      AND workspace_members.user_id = auth.uid()
      AND workspace_members.status = 'active'
  )
);

-- Workspace SSO providers
DROP POLICY IF EXISTS "Workspace owners/admins can read sso config" ON public.workspace_sso_providers;
CREATE POLICY "Workspace owners/admins can read sso config"
ON public.workspace_sso_providers
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.workspaces w
    WHERE w.id = workspace_sso_providers.workspace_id
      AND w.owner_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1
    FROM public.workspace_members m
    WHERE m.workspace_id = workspace_sso_providers.workspace_id
      AND m.user_id = auth.uid()
      AND m.role = 'admin'
  )
);

DROP POLICY IF EXISTS "Workspace owners/admins can create sso config" ON public.workspace_sso_providers;
CREATE POLICY "Workspace owners/admins can create sso config"
ON public.workspace_sso_providers
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.workspaces w
    WHERE w.id = workspace_sso_providers.workspace_id
      AND w.owner_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1
    FROM public.workspace_members m
    WHERE m.workspace_id = workspace_sso_providers.workspace_id
      AND m.user_id = auth.uid()
      AND m.role = 'admin'
  )
);

DROP POLICY IF EXISTS "Workspace owners/admins can update sso config" ON public.workspace_sso_providers;
CREATE POLICY "Workspace owners/admins can update sso config"
ON public.workspace_sso_providers
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.workspaces w
    WHERE w.id = workspace_sso_providers.workspace_id
      AND w.owner_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1
    FROM public.workspace_members m
    WHERE m.workspace_id = workspace_sso_providers.workspace_id
      AND m.user_id = auth.uid()
      AND m.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.workspaces w
    WHERE w.id = workspace_sso_providers.workspace_id
      AND w.owner_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1
    FROM public.workspace_members m
    WHERE m.workspace_id = workspace_sso_providers.workspace_id
      AND m.user_id = auth.uid()
      AND m.role = 'admin'
  )
);

DROP POLICY IF EXISTS "Workspace owners/admins can delete sso config" ON public.workspace_sso_providers;
CREATE POLICY "Workspace owners/admins can delete sso config"
ON public.workspace_sso_providers
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.workspaces w
    WHERE w.id = workspace_sso_providers.workspace_id
      AND w.owner_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1
    FROM public.workspace_members m
    WHERE m.workspace_id = workspace_sso_providers.workspace_id
      AND m.user_id = auth.uid()
      AND m.role = 'admin'
  )
);