-- Fix recursive RLS causing workspace load failures
-- Replace policy subqueries on workspace/workspace_members with SECURITY DEFINER helpers

CREATE OR REPLACE FUNCTION public.is_workspace_owner(_workspace_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.workspaces
    WHERE id = _workspace_id
      AND owner_id = _user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.is_active_workspace_member(_workspace_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.workspace_members
    WHERE workspace_id = _workspace_id
      AND user_id = _user_id
      AND status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.has_workspace_role(_workspace_id uuid, _user_id uuid, _roles text[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.workspace_members
    WHERE workspace_id = _workspace_id
      AND user_id = _user_id
      AND status = 'active'
      AND role = ANY (_roles)
  );
$$;

-- pages
DROP POLICY IF EXISTS "Users can view pages they own or workspace pages" ON public.pages;
CREATE POLICY "Users can view pages they own or workspace pages"
ON public.pages
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR (
    workspace_id IS NOT NULL
    AND public.is_active_workspace_member(workspace_id, auth.uid())
  )
);

DROP POLICY IF EXISTS "Users can insert pages they own or in their workspaces" ON public.pages;
CREATE POLICY "Users can insert pages they own or in their workspaces"
ON public.pages
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND (
    workspace_id IS NULL
    OR public.is_active_workspace_member(workspace_id, auth.uid())
  )
);

DROP POLICY IF EXISTS "Users can update pages they own or workspace pages" ON public.pages;
CREATE POLICY "Users can update pages they own or workspace pages"
ON public.pages
FOR UPDATE
TO authenticated
USING (
  auth.uid() = user_id
  OR (
    workspace_id IS NOT NULL
    AND (
      public.is_workspace_owner(workspace_id, auth.uid())
      OR public.has_workspace_role(workspace_id, auth.uid(), ARRAY['owner','admin','member'])
    )
  )
)
WITH CHECK (
  auth.uid() = user_id
  OR (
    workspace_id IS NOT NULL
    AND (
      public.is_workspace_owner(workspace_id, auth.uid())
      OR public.has_workspace_role(workspace_id, auth.uid(), ARRAY['owner','admin','member'])
    )
  )
);

DROP POLICY IF EXISTS "Users can delete pages they own or workspace pages as admin" ON public.pages;
CREATE POLICY "Users can delete pages they own or workspace pages as admin"
ON public.pages
FOR DELETE
TO authenticated
USING (
  auth.uid() = user_id
  OR (
    workspace_id IS NOT NULL
    AND (
      public.is_workspace_owner(workspace_id, auth.uid())
      OR public.has_workspace_role(workspace_id, auth.uid(), ARRAY['owner','admin'])
    )
  )
);

-- blocks
DROP POLICY IF EXISTS "Users can view blocks they own or workspace blocks" ON public.blocks;
CREATE POLICY "Users can view blocks they own or workspace blocks"
ON public.blocks
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR (
    workspace_id IS NOT NULL
    AND public.is_active_workspace_member(workspace_id, auth.uid())
  )
);

DROP POLICY IF EXISTS "Users can insert blocks they own or in workspace" ON public.blocks;
CREATE POLICY "Users can insert blocks they own or in workspace"
ON public.blocks
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND (
    workspace_id IS NULL
    OR public.is_active_workspace_member(workspace_id, auth.uid())
  )
);

DROP POLICY IF EXISTS "Users can update blocks they own or workspace blocks" ON public.blocks;
CREATE POLICY "Users can update blocks they own or workspace blocks"
ON public.blocks
FOR UPDATE
TO authenticated
USING (
  auth.uid() = user_id
  OR (
    workspace_id IS NOT NULL
    AND (
      public.is_workspace_owner(workspace_id, auth.uid())
      OR public.has_workspace_role(workspace_id, auth.uid(), ARRAY['owner','admin','member'])
    )
  )
)
WITH CHECK (
  auth.uid() = user_id
  OR (
    workspace_id IS NOT NULL
    AND (
      public.is_workspace_owner(workspace_id, auth.uid())
      OR public.has_workspace_role(workspace_id, auth.uid(), ARRAY['owner','admin','member'])
    )
  )
);

DROP POLICY IF EXISTS "Users can delete blocks they own or workspace blocks as admin" ON public.blocks;
CREATE POLICY "Users can delete blocks they own or workspace blocks as admin"
ON public.blocks
FOR DELETE
TO authenticated
USING (
  auth.uid() = user_id
  OR (
    workspace_id IS NOT NULL
    AND (
      public.is_workspace_owner(workspace_id, auth.uid())
      OR public.has_workspace_role(workspace_id, auth.uid(), ARRAY['owner','admin'])
    )
  )
);

-- workspaces
DROP POLICY IF EXISTS "Users can view workspaces they own or are members of" ON public.workspaces;
CREATE POLICY "Users can view workspaces they own or are members of"
ON public.workspaces
FOR SELECT
TO authenticated
USING (
  auth.uid() = owner_id
  OR public.is_active_workspace_member(id, auth.uid())
);

DROP POLICY IF EXISTS "Owners and admins can update workspaces" ON public.workspaces;
CREATE POLICY "Owners and admins can update workspaces"
ON public.workspaces
FOR UPDATE
TO authenticated
USING (
  auth.uid() = owner_id
  OR public.has_workspace_role(id, auth.uid(), ARRAY['owner','admin'])
)
WITH CHECK (
  auth.uid() = owner_id
  OR public.has_workspace_role(id, auth.uid(), ARRAY['owner','admin'])
);

-- workspace_members
DROP POLICY IF EXISTS "Members can view workspace membership" ON public.workspace_members;
CREATE POLICY "Members can view workspace membership"
ON public.workspace_members
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR public.is_workspace_owner(workspace_id, auth.uid())
  OR public.has_workspace_role(workspace_id, auth.uid(), ARRAY['owner','admin'])
);

DROP POLICY IF EXISTS "Owners and admins can invite members" ON public.workspace_members;
CREATE POLICY "Owners and admins can invite members"
ON public.workspace_members
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_workspace_owner(workspace_id, auth.uid())
  OR public.has_workspace_role(workspace_id, auth.uid(), ARRAY['owner','admin'])
);

DROP POLICY IF EXISTS "Owners and admins can update members" ON public.workspace_members;
CREATE POLICY "Owners and admins can update members"
ON public.workspace_members
FOR UPDATE
TO authenticated
USING (
  public.is_workspace_owner(workspace_id, auth.uid())
  OR public.has_workspace_role(workspace_id, auth.uid(), ARRAY['owner','admin'])
)
WITH CHECK (
  public.is_workspace_owner(workspace_id, auth.uid())
  OR public.has_workspace_role(workspace_id, auth.uid(), ARRAY['owner','admin'])
);

DROP POLICY IF EXISTS "Owners and admins can remove members" ON public.workspace_members;
CREATE POLICY "Owners and admins can remove members"
ON public.workspace_members
FOR DELETE
TO authenticated
USING (
  public.is_workspace_owner(workspace_id, auth.uid())
  OR public.has_workspace_role(workspace_id, auth.uid(), ARRAY['owner','admin'])
);

-- team_subscriptions
DROP POLICY IF EXISTS "Users can view team subscriptions for their workspaces" ON public.team_subscriptions;
CREATE POLICY "Users can view team subscriptions for their workspaces"
ON public.team_subscriptions
FOR SELECT
TO authenticated
USING (
  auth.uid() = owner_id
  OR public.is_active_workspace_member(workspace_id, auth.uid())
);

-- workspace_sso_providers
DROP POLICY IF EXISTS "Workspace owners/admins can read sso config" ON public.workspace_sso_providers;
CREATE POLICY "Workspace owners/admins can read sso config"
ON public.workspace_sso_providers
FOR SELECT
TO authenticated
USING (
  public.is_workspace_owner(workspace_id, auth.uid())
  OR public.has_workspace_role(workspace_id, auth.uid(), ARRAY['admin'])
);

DROP POLICY IF EXISTS "Workspace owners/admins can create sso config" ON public.workspace_sso_providers;
CREATE POLICY "Workspace owners/admins can create sso config"
ON public.workspace_sso_providers
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_workspace_owner(workspace_id, auth.uid())
  OR public.has_workspace_role(workspace_id, auth.uid(), ARRAY['admin'])
);

DROP POLICY IF EXISTS "Workspace owners/admins can update sso config" ON public.workspace_sso_providers;
CREATE POLICY "Workspace owners/admins can update sso config"
ON public.workspace_sso_providers
FOR UPDATE
TO authenticated
USING (
  public.is_workspace_owner(workspace_id, auth.uid())
  OR public.has_workspace_role(workspace_id, auth.uid(), ARRAY['admin'])
)
WITH CHECK (
  public.is_workspace_owner(workspace_id, auth.uid())
  OR public.has_workspace_role(workspace_id, auth.uid(), ARRAY['admin'])
);

DROP POLICY IF EXISTS "Workspace owners/admins can delete sso config" ON public.workspace_sso_providers;
CREATE POLICY "Workspace owners/admins can delete sso config"
ON public.workspace_sso_providers
FOR DELETE
TO authenticated
USING (
  public.is_workspace_owner(workspace_id, auth.uid())
  OR public.has_workspace_role(workspace_id, auth.uid(), ARRAY['admin'])
);