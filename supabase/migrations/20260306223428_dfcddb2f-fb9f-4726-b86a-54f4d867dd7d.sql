
-- Fix pages policies: drop restrictive, recreate as permissive
DROP POLICY IF EXISTS "Users can view pages they own or workspace pages" ON public.pages;
DROP POLICY IF EXISTS "Users can insert pages they own or in their workspaces" ON public.pages;
DROP POLICY IF EXISTS "Users can update pages they own or workspace pages" ON public.pages;
DROP POLICY IF EXISTS "Users can delete pages they own or workspace pages as admin" ON public.pages;

CREATE POLICY "Users can view pages they own or workspace pages" ON public.pages FOR SELECT TO authenticated
USING ((auth.uid() = user_id) OR ((workspace_id IS NOT NULL) AND (EXISTS (SELECT 1 FROM workspace_members WHERE workspace_members.workspace_id = pages.workspace_id AND workspace_members.user_id = auth.uid() AND workspace_members.status = 'active'))));

CREATE POLICY "Users can insert pages they own or in their workspaces" ON public.pages FOR INSERT TO authenticated
WITH CHECK ((auth.uid() = user_id) AND ((workspace_id IS NULL) OR (EXISTS (SELECT 1 FROM workspace_members WHERE workspace_members.workspace_id = pages.workspace_id AND workspace_members.user_id = auth.uid() AND workspace_members.status = 'active'))));

CREATE POLICY "Users can update pages they own or workspace pages" ON public.pages FOR UPDATE TO authenticated
USING ((auth.uid() = user_id) OR ((workspace_id IS NOT NULL) AND (EXISTS (SELECT 1 FROM workspace_members WHERE workspace_members.workspace_id = pages.workspace_id AND workspace_members.user_id = auth.uid() AND workspace_members.status = 'active' AND workspace_members.role = ANY (ARRAY['owner','admin','member'])))));

CREATE POLICY "Users can delete pages they own or workspace pages as admin" ON public.pages FOR DELETE TO authenticated
USING ((auth.uid() = user_id) OR ((workspace_id IS NOT NULL) AND (EXISTS (SELECT 1 FROM workspace_members WHERE workspace_members.workspace_id = pages.workspace_id AND workspace_members.user_id = auth.uid() AND workspace_members.status = 'active' AND workspace_members.role = ANY (ARRAY['owner','admin'])))));

-- Fix blocks policies
DROP POLICY IF EXISTS "Users can view blocks they own or workspace blocks" ON public.blocks;
DROP POLICY IF EXISTS "Users can insert blocks they own or in workspace" ON public.blocks;
DROP POLICY IF EXISTS "Users can update blocks they own or workspace blocks" ON public.blocks;
DROP POLICY IF EXISTS "Users can delete blocks they own or workspace blocks as admin" ON public.blocks;

CREATE POLICY "Users can view blocks they own or workspace blocks" ON public.blocks FOR SELECT TO authenticated
USING ((auth.uid() = user_id) OR ((workspace_id IS NOT NULL) AND (EXISTS (SELECT 1 FROM workspace_members WHERE workspace_members.workspace_id = blocks.workspace_id AND workspace_members.user_id = auth.uid() AND workspace_members.status = 'active'))));

CREATE POLICY "Users can insert blocks they own or in workspace" ON public.blocks FOR INSERT TO authenticated
WITH CHECK ((auth.uid() = user_id) AND ((workspace_id IS NULL) OR (EXISTS (SELECT 1 FROM workspace_members WHERE workspace_members.workspace_id = blocks.workspace_id AND workspace_members.user_id = auth.uid() AND workspace_members.status = 'active'))));

CREATE POLICY "Users can update blocks they own or workspace blocks" ON public.blocks FOR UPDATE TO authenticated
USING ((auth.uid() = user_id) OR ((workspace_id IS NOT NULL) AND (EXISTS (SELECT 1 FROM workspace_members WHERE workspace_members.workspace_id = blocks.workspace_id AND workspace_members.user_id = auth.uid() AND workspace_members.status = 'active' AND workspace_members.role = ANY (ARRAY['owner','admin','member'])))));

CREATE POLICY "Users can delete blocks they own or workspace blocks as admin" ON public.blocks FOR DELETE TO authenticated
USING ((auth.uid() = user_id) OR ((workspace_id IS NOT NULL) AND (EXISTS (SELECT 1 FROM workspace_members WHERE workspace_members.workspace_id = blocks.workspace_id AND workspace_members.user_id = auth.uid() AND workspace_members.status = 'active' AND workspace_members.role = ANY (ARRAY['owner','admin'])))));

-- Fix profiles policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Fix user_subscriptions policies
DROP POLICY IF EXISTS "Users can view their own subscription" ON public.user_subscriptions;
CREATE POLICY "Users can view their own subscription" ON public.user_subscriptions FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Fix google_integrations policies (also add missing SELECT)
DROP POLICY IF EXISTS "Users can update their own integrations" ON public.google_integrations;
DROP POLICY IF EXISTS "Users can insert their own integrations" ON public.google_integrations;
DROP POLICY IF EXISTS "Users can delete their own integrations" ON public.google_integrations;

CREATE POLICY "Users can view their own integrations" ON public.google_integrations FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own integrations" ON public.google_integrations FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own integrations" ON public.google_integrations FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own integrations" ON public.google_integrations FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Fix workspace-related policies
DROP POLICY IF EXISTS "Users can view workspaces they own or are members of" ON public.workspaces;
DROP POLICY IF EXISTS "Users can create workspaces" ON public.workspaces;
DROP POLICY IF EXISTS "Owners and admins can update workspaces" ON public.workspaces;
DROP POLICY IF EXISTS "Owners can delete workspaces" ON public.workspaces;

CREATE POLICY "Users can view workspaces they own or are members of" ON public.workspaces FOR SELECT TO authenticated
USING ((auth.uid() = owner_id) OR (EXISTS (SELECT 1 FROM workspace_members WHERE workspace_members.workspace_id = workspaces.id AND workspace_members.user_id = auth.uid() AND workspace_members.status = 'active')));

CREATE POLICY "Users can create workspaces" ON public.workspaces FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners and admins can update workspaces" ON public.workspaces FOR UPDATE TO authenticated
USING ((auth.uid() = owner_id) OR (EXISTS (SELECT 1 FROM workspace_members WHERE workspace_members.workspace_id = workspaces.id AND workspace_members.user_id = auth.uid() AND workspace_members.role = ANY (ARRAY['owner','admin']) AND workspace_members.status = 'active')));

CREATE POLICY "Owners can delete workspaces" ON public.workspaces FOR DELETE TO authenticated USING (auth.uid() = owner_id);

-- Fix workspace_members policies
DROP POLICY IF EXISTS "Members can view workspace membership" ON public.workspace_members;
DROP POLICY IF EXISTS "Owners and admins can invite members" ON public.workspace_members;
DROP POLICY IF EXISTS "Owners and admins can update members" ON public.workspace_members;
DROP POLICY IF EXISTS "Owners and admins can remove members" ON public.workspace_members;

CREATE POLICY "Members can view workspace membership" ON public.workspace_members FOR SELECT TO authenticated
USING ((user_id = auth.uid()) OR (EXISTS (SELECT 1 FROM workspaces WHERE workspaces.id = workspace_members.workspace_id AND workspaces.owner_id = auth.uid())) OR (EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = workspace_members.workspace_id AND wm.user_id = auth.uid() AND wm.role = ANY (ARRAY['owner','admin']) AND wm.status = 'active')));

CREATE POLICY "Owners and admins can invite members" ON public.workspace_members FOR INSERT TO authenticated
WITH CHECK ((EXISTS (SELECT 1 FROM workspaces WHERE workspaces.id = workspace_members.workspace_id AND workspaces.owner_id = auth.uid())) OR (EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = workspace_members.workspace_id AND wm.user_id = auth.uid() AND wm.role = ANY (ARRAY['owner','admin']) AND wm.status = 'active')));

CREATE POLICY "Owners and admins can update members" ON public.workspace_members FOR UPDATE TO authenticated
USING ((EXISTS (SELECT 1 FROM workspaces WHERE workspaces.id = workspace_members.workspace_id AND workspaces.owner_id = auth.uid())) OR (EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = workspace_members.workspace_id AND wm.user_id = auth.uid() AND wm.role = ANY (ARRAY['owner','admin']) AND wm.status = 'active')));

CREATE POLICY "Owners and admins can remove members" ON public.workspace_members FOR DELETE TO authenticated
USING ((EXISTS (SELECT 1 FROM workspaces WHERE workspaces.id = workspace_members.workspace_id AND workspaces.owner_id = auth.uid())) OR (EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = workspace_members.workspace_id AND wm.user_id = auth.uid() AND wm.role = ANY (ARRAY['owner','admin']) AND wm.status = 'active')));

-- Fix team_subscriptions policies
DROP POLICY IF EXISTS "Users can view team subscriptions for their workspaces" ON public.team_subscriptions;
CREATE POLICY "Users can view team subscriptions for their workspaces" ON public.team_subscriptions FOR SELECT TO authenticated
USING ((auth.uid() = owner_id) OR (EXISTS (SELECT 1 FROM workspace_members WHERE workspace_members.workspace_id = team_subscriptions.workspace_id AND workspace_members.user_id = auth.uid() AND workspace_members.status = 'active')));

-- Fix oauth_states policies
DROP POLICY IF EXISTS "No direct access" ON public.oauth_states;
CREATE POLICY "No direct access" ON public.oauth_states FOR ALL TO authenticated USING (false);

-- Fix workspace_sso_providers policies
DROP POLICY IF EXISTS "Workspace owners/admins can read sso config" ON public.workspace_sso_providers;
DROP POLICY IF EXISTS "Workspace owners/admins can create sso config" ON public.workspace_sso_providers;
DROP POLICY IF EXISTS "Workspace owners/admins can update sso config" ON public.workspace_sso_providers;
DROP POLICY IF EXISTS "Workspace owners/admins can delete sso config" ON public.workspace_sso_providers;

CREATE POLICY "Workspace owners/admins can read sso config" ON public.workspace_sso_providers FOR SELECT TO authenticated
USING ((EXISTS (SELECT 1 FROM workspaces w WHERE w.id = workspace_sso_providers.workspace_id AND w.owner_id = auth.uid())) OR (EXISTS (SELECT 1 FROM workspace_members m WHERE m.workspace_id = workspace_sso_providers.workspace_id AND m.user_id = auth.uid() AND m.role = 'admin')));

CREATE POLICY "Workspace owners/admins can create sso config" ON public.workspace_sso_providers FOR INSERT TO authenticated
WITH CHECK ((EXISTS (SELECT 1 FROM workspaces w WHERE w.id = workspace_sso_providers.workspace_id AND w.owner_id = auth.uid())) OR (EXISTS (SELECT 1 FROM workspace_members m WHERE m.workspace_id = workspace_sso_providers.workspace_id AND m.user_id = auth.uid() AND m.role = 'admin')));

CREATE POLICY "Workspace owners/admins can update sso config" ON public.workspace_sso_providers FOR UPDATE TO authenticated
USING ((EXISTS (SELECT 1 FROM workspaces w WHERE w.id = workspace_sso_providers.workspace_id AND w.owner_id = auth.uid())) OR (EXISTS (SELECT 1 FROM workspace_members m WHERE m.workspace_id = workspace_sso_providers.workspace_id AND m.user_id = auth.uid() AND m.role = 'admin')));

CREATE POLICY "Workspace owners/admins can delete sso config" ON public.workspace_sso_providers FOR DELETE TO authenticated
USING ((EXISTS (SELECT 1 FROM workspaces w WHERE w.id = workspace_sso_providers.workspace_id AND w.owner_id = auth.uid())) OR (EXISTS (SELECT 1 FROM workspace_members m WHERE m.workspace_id = workspace_sso_providers.workspace_id AND m.user_id = auth.uid() AND m.role = 'admin')));
