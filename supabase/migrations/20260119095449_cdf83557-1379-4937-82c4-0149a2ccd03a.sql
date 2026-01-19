-- Storage bucket for workspace image uploads
insert into storage.buckets (id, name, public)
values ('workspace-images', 'workspace-images', false)
on conflict (id) do update set public = excluded.public;

-- Storage RLS policies for user-scoped folders (user_id/...) in workspace-images bucket
-- Allow authenticated users to read their own objects
create policy "Users can read their own workspace images"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'workspace-images'
  and auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow authenticated users to upload to their own folder
create policy "Users can upload their own workspace images"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'workspace-images'
  and auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow authenticated users to update their own objects
create policy "Users can update their own workspace images"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'workspace-images'
  and auth.uid()::text = (storage.foldername(name))[1]
)
with check (
  bucket_id = 'workspace-images'
  and auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow authenticated users to delete their own objects
create policy "Users can delete their own workspace images"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'workspace-images'
  and auth.uid()::text = (storage.foldername(name))[1]
);

-- Workspace SSO provider configurations (enterprise)
create table if not exists public.workspace_sso_providers (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  provider_type text not null check (provider_type in ('saml', 'oauth')),
  enabled boolean not null default false,
  domain text,
  -- SAML
  saml_metadata_xml text,
  saml_metadata_url text,
  -- OAuth/OIDC (enterprise)
  oauth_client_id text,
  oauth_client_secret text,
  oauth_authorize_url text,
  oauth_token_url text,
  oauth_scopes text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

alter table public.workspace_sso_providers enable row level security;

create policy "Workspace owners/admins can read sso config"
on public.workspace_sso_providers
for select
to authenticated
using (
  exists (
    select 1 from public.workspaces w
    where w.id = workspace_id and w.owner_id = auth.uid()
  )
  or exists (
    select 1 from public.workspace_members m
    where m.workspace_id = workspace_id
      and m.user_id = auth.uid()
      and m.role = 'admin'
  )
);

create policy "Workspace owners/admins can create sso config"
on public.workspace_sso_providers
for insert
to authenticated
with check (
  exists (
    select 1 from public.workspaces w
    where w.id = workspace_id and w.owner_id = auth.uid()
  )
  or exists (
    select 1 from public.workspace_members m
    where m.workspace_id = workspace_id
      and m.user_id = auth.uid()
      and m.role = 'admin'
  )
);

create policy "Workspace owners/admins can update sso config"
on public.workspace_sso_providers
for update
to authenticated
using (
  exists (
    select 1 from public.workspaces w
    where w.id = workspace_id and w.owner_id = auth.uid()
  )
  or exists (
    select 1 from public.workspace_members m
    where m.workspace_id = workspace_id
      and m.user_id = auth.uid()
      and m.role = 'admin'
  )
)
with check (
  exists (
    select 1 from public.workspaces w
    where w.id = workspace_id and w.owner_id = auth.uid()
  )
  or exists (
    select 1 from public.workspace_members m
    where m.workspace_id = workspace_id
      and m.user_id = auth.uid()
      and m.role = 'admin'
  )
);

create policy "Workspace owners/admins can delete sso config"
on public.workspace_sso_providers
for delete
to authenticated
using (
  exists (
    select 1 from public.workspaces w
    where w.id = workspace_id and w.owner_id = auth.uid()
  )
  or exists (
    select 1 from public.workspace_members m
    where m.workspace_id = workspace_id
      and m.user_id = auth.uid()
      and m.role = 'admin'
  )
);

-- updated_at trigger
drop trigger if exists update_workspace_sso_providers_updated_at on public.workspace_sso_providers;
create trigger update_workspace_sso_providers_updated_at
before update on public.workspace_sso_providers
for each row
execute function public.update_updated_at_column();
