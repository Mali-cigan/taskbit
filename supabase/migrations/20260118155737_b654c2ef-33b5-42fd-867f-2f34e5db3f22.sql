-- Enable realtime for pages and blocks tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.pages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.blocks;

-- Add workspace_id to support team shared workspaces
ALTER TABLE public.pages 
ADD COLUMN IF NOT EXISTS workspace_id uuid;

ALTER TABLE public.blocks 
ADD COLUMN IF NOT EXISTS workspace_id uuid;

-- Create workspaces table for team collaboration
CREATE TABLE IF NOT EXISTS public.workspaces (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL DEFAULT 'My Workspace',
  owner_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on workspaces
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

-- Create workspace_members table for team permissions
CREATE TABLE IF NOT EXISTS public.workspace_members (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'inactive')),
  invited_at timestamp with time zone NOT NULL DEFAULT now(),
  joined_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, email)
);

-- Enable RLS on workspace_members
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;

-- Create team_subscriptions table for team billing
CREATE TABLE IF NOT EXISTS public.team_subscriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL,
  plan text NOT NULL DEFAULT 'team' CHECK (plan IN ('team', 'enterprise')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'trialing', 'past_due', 'canceled', 'incomplete')),
  seat_count integer NOT NULL DEFAULT 1,
  stripe_subscription_id text,
  stripe_customer_id text,
  current_period_end timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(workspace_id)
);

-- Enable RLS on team_subscriptions
ALTER TABLE public.team_subscriptions ENABLE ROW LEVEL SECURITY;

-- Workspace policies
CREATE POLICY "Users can view workspaces they own or are members of" 
ON public.workspaces FOR SELECT 
USING (
  auth.uid() = owner_id 
  OR EXISTS (
    SELECT 1 FROM public.workspace_members 
    WHERE workspace_members.workspace_id = workspaces.id 
    AND workspace_members.user_id = auth.uid()
    AND workspace_members.status = 'active'
  )
);

CREATE POLICY "Users can create workspaces" 
ON public.workspaces FOR INSERT 
WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners and admins can update workspaces" 
ON public.workspaces FOR UPDATE 
USING (
  auth.uid() = owner_id 
  OR EXISTS (
    SELECT 1 FROM public.workspace_members 
    WHERE workspace_members.workspace_id = workspaces.id 
    AND workspace_members.user_id = auth.uid()
    AND workspace_members.role IN ('owner', 'admin')
    AND workspace_members.status = 'active'
  )
);

CREATE POLICY "Owners can delete workspaces" 
ON public.workspaces FOR DELETE 
USING (auth.uid() = owner_id);

-- Workspace members policies
CREATE POLICY "Members can view workspace membership" 
ON public.workspace_members FOR SELECT 
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.workspaces 
    WHERE workspaces.id = workspace_members.workspace_id 
    AND workspaces.owner_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.workspace_members wm 
    WHERE wm.workspace_id = workspace_members.workspace_id 
    AND wm.user_id = auth.uid()
    AND wm.role IN ('owner', 'admin')
    AND wm.status = 'active'
  )
);

CREATE POLICY "Owners and admins can invite members" 
ON public.workspace_members FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.workspaces 
    WHERE workspaces.id = workspace_members.workspace_id 
    AND workspaces.owner_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.workspace_members wm 
    WHERE wm.workspace_id = workspace_members.workspace_id 
    AND wm.user_id = auth.uid()
    AND wm.role IN ('owner', 'admin')
    AND wm.status = 'active'
  )
);

CREATE POLICY "Owners and admins can update members" 
ON public.workspace_members FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.workspaces 
    WHERE workspaces.id = workspace_members.workspace_id 
    AND workspaces.owner_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.workspace_members wm 
    WHERE wm.workspace_id = workspace_members.workspace_id 
    AND wm.user_id = auth.uid()
    AND wm.role IN ('owner', 'admin')
    AND wm.status = 'active'
  )
);

CREATE POLICY "Owners and admins can remove members" 
ON public.workspace_members FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.workspaces 
    WHERE workspaces.id = workspace_members.workspace_id 
    AND workspaces.owner_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.workspace_members wm 
    WHERE wm.workspace_id = workspace_members.workspace_id 
    AND wm.user_id = auth.uid()
    AND wm.role IN ('owner', 'admin')
    AND wm.status = 'active'
  )
);

-- Team subscription policies
CREATE POLICY "Users can view team subscriptions for their workspaces" 
ON public.team_subscriptions FOR SELECT 
USING (
  auth.uid() = owner_id
  OR EXISTS (
    SELECT 1 FROM public.workspace_members 
    WHERE workspace_members.workspace_id = team_subscriptions.workspace_id 
    AND workspace_members.user_id = auth.uid()
    AND workspace_members.status = 'active'
  )
);