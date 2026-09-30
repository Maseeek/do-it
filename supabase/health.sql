-- Apply after duels.sql and duels-extras.sql. Existing Google grants must reconnect.
-- The old table exposed OAuth credentials through a public RLS policy.
drop table if exists public.oauth_tokens;
-- Retire unauthenticated legacy profile data before opening the app publicly.
do $$
declare name text;
begin
  foreach name in array array['players', 'habits', 'check_ins', 'stakes'] loop
    if to_regclass('public.' || name) is not null then
      execute format('drop policy if exists %I on public.%I', 'Allow public access to ' || name, name);
      execute format('revoke all on public.%I from public, anon, authenticated', name);
    end if;
  end loop;
end $$;

create table if not exists public.health_connections (
  user_id uuid primary key references auth.users(id) on delete cascade,
  encrypted_refresh_token text not null,
  scopes text[] not null default '{}',
  time_zone text not null default 'UTC',
  last_checked_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.health_connections enable row level security;
revoke all on public.health_connections from public, anon, authenticated;
grant select, insert, update, delete on public.health_connections to service_role;
-- No client policies: only the service role may read or write refresh tokens.
