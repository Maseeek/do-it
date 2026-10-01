-- Run in the Supabase SQL editor for the project configured in .env.local.
-- These tables are separate from the older public two-profile schema.
create extension if not exists pgcrypto;

create table if not exists public.duels (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  guest_id uuid unique references auth.users(id) on delete cascade,
  owner_name text not null check (char_length(owner_name) between 1 and 40),
  guest_name text check (guest_name is null or char_length(guest_name) between 1 and 40),
  invite_code uuid not null unique default gen_random_uuid(),
  created_at timestamptz not null default now(),
  check (guest_id is null or guest_id <> owner_id)
);
create unique index if not exists duels_owner_unique on public.duels(owner_id);

create table if not exists public.duel_habits (
  duel_id uuid not null references public.duels(id) on delete cascade,
  id text not null,
  player_slot text not null check (player_slot in ('maciek', 'myrna')),
  data jsonb not null,
  primary key (duel_id, id),
  check (data->>'id' = id and data->>'playerId' = player_slot)
);
create table if not exists public.duel_check_ins (
  duel_id uuid not null,
  id text not null,
  habit_id text not null,
  player_slot text not null check (player_slot in ('maciek', 'myrna')),
  data jsonb not null,
  primary key (duel_id, id),
  foreign key (duel_id, habit_id) references public.duel_habits(duel_id, id) on delete cascade,
  check (data->>'id' = id and data->>'habitId' = habit_id and data->>'playerId' = player_slot)
);
create table if not exists public.duel_stakes (
  duel_id uuid not null references public.duels(id) on delete cascade,
  id text not null,
  data jsonb not null,
  primary key (duel_id, id),
  check (data->>'id' = id)
);

alter table public.duels enable row level security;
alter table public.duel_habits enable row level security;
alter table public.duel_check_ins enable row level security;
alter table public.duel_stakes enable row level security;

create policy "Members read duel" on public.duels for select to authenticated
  using (auth.uid() = owner_id or auth.uid() = guest_id);

create policy "Members read habits" on public.duel_habits for select to authenticated
  using (exists (select 1 from public.duels d where d.id = duel_id and (d.owner_id = auth.uid() or d.guest_id = auth.uid())));
create policy "Players write own habits" on public.duel_habits for insert to authenticated
  with check (exists (select 1 from public.duels d where d.id = duel_id and ((player_slot = 'maciek' and d.owner_id = auth.uid()) or (player_slot = 'myrna' and d.guest_id = auth.uid()))));
create policy "Players update own habits" on public.duel_habits for update to authenticated
  using (exists (select 1 from public.duels d where d.id = duel_id and ((player_slot = 'maciek' and d.owner_id = auth.uid()) or (player_slot = 'myrna' and d.guest_id = auth.uid()))))
  with check (exists (select 1 from public.duels d where d.id = duel_id and ((player_slot = 'maciek' and d.owner_id = auth.uid()) or (player_slot = 'myrna' and d.guest_id = auth.uid()))));
create policy "Players delete own habits" on public.duel_habits for delete to authenticated
  using (exists (select 1 from public.duels d where d.id = duel_id and ((player_slot = 'maciek' and d.owner_id = auth.uid()) or (player_slot = 'myrna' and d.guest_id = auth.uid()))));

create policy "Members read check ins" on public.duel_check_ins for select to authenticated
  using (exists (select 1 from public.duels d where d.id = duel_id and (d.owner_id = auth.uid() or d.guest_id = auth.uid())));
create policy "Players write own check ins" on public.duel_check_ins for insert to authenticated
  with check (exists (select 1 from public.duels d join public.duel_habits h on h.duel_id = d.id and h.id = habit_id where d.id = duel_id and h.player_slot = player_slot and ((player_slot = 'maciek' and d.owner_id = auth.uid()) or (player_slot = 'myrna' and d.guest_id = auth.uid()))));
create policy "Players update own check ins" on public.duel_check_ins for update to authenticated
  using (exists (select 1 from public.duels d where d.id = duel_id and ((player_slot = 'maciek' and d.owner_id = auth.uid()) or (player_slot = 'myrna' and d.guest_id = auth.uid()))))
  with check (exists (select 1 from public.duels d join public.duel_habits h on h.duel_id = d.id and h.id = habit_id where d.id = duel_id and h.player_slot = player_slot and ((player_slot = 'maciek' and d.owner_id = auth.uid()) or (player_slot = 'myrna' and d.guest_id = auth.uid()))));
create policy "Players delete own check ins" on public.duel_check_ins for delete to authenticated
  using (exists (select 1 from public.duels d where d.id = duel_id and ((player_slot = 'maciek' and d.owner_id = auth.uid()) or (player_slot = 'myrna' and d.guest_id = auth.uid()))));

create policy "Members read stakes" on public.duel_stakes for select to authenticated
  using (exists (select 1 from public.duels d where d.id = duel_id and (d.owner_id = auth.uid() or d.guest_id = auth.uid())));
create policy "Members write stakes" on public.duel_stakes for insert to authenticated
  with check (exists (select 1 from public.duels d where d.id = duel_id and (d.owner_id = auth.uid() or d.guest_id = auth.uid())));
create policy "Members update stakes" on public.duel_stakes for update to authenticated
  using (exists (select 1 from public.duels d where d.id = duel_id and (d.owner_id = auth.uid() or d.guest_id = auth.uid())))
  with check (exists (select 1 from public.duels d where d.id = duel_id and (d.owner_id = auth.uid() or d.guest_id = auth.uid())));
create policy "Members delete stakes" on public.duel_stakes for delete to authenticated
  using (exists (select 1 from public.duels d where d.id = duel_id and (d.owner_id = auth.uid() or d.guest_id = auth.uid())));

create or replace function public.create_duel(display_name text)
returns public.duels language plpgsql security definer set search_path = '' as $$
declare result public.duels;
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  if char_length(trim(display_name)) not between 1 and 40 then raise exception 'Name must be 1 to 40 characters'; end if;
  if exists (select 1 from public.duels where owner_id = auth.uid() or guest_id = auth.uid()) then raise exception 'You already have a duel'; end if;
  insert into public.duels(owner_id, owner_name) values (auth.uid(), trim(display_name)) returning * into result;
  return result;
end $$;

create or replace function public.accept_duel(code uuid, display_name text)
returns public.duels language plpgsql security definer set search_path = '' as $$
declare result public.duels;
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  if char_length(trim(display_name)) not between 1 and 40 then raise exception 'Name must be 1 to 40 characters'; end if;
  if exists (select 1 from public.duels where owner_id = auth.uid() or guest_id = auth.uid()) then raise exception 'You already have a duel'; end if;
  update public.duels set guest_id = auth.uid(), guest_name = trim(display_name)
    where invite_code = code and guest_id is null and owner_id <> auth.uid()
    returning * into result;
  if result.id is null then raise exception 'This invitation is invalid or already used'; end if;
  return result;
end $$;
revoke all on function public.create_duel(text) from public, anon;
revoke all on function public.accept_duel(uuid, text) from public, anon;
grant execute on function public.create_duel(text) to authenticated;
grant execute on function public.accept_duel(uuid, text) to authenticated;

-- Atomically replace an unpaired solo duel when its owner accepts another invitation.
-- Child data is deleted by the duels foreign keys, so callers must confirm first.
create or replace function public.replace_solo_duel_with_invite(code uuid, display_name text)
returns public.duels language plpgsql security definer set search_path = '' as $$
declare result public.duels;
declare solo_id uuid;
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  if char_length(trim(display_name)) not between 1 and 40 then raise exception 'Name must be 1 to 40 characters'; end if;

  select id into solo_id from public.duels
    where owner_id = auth.uid() and guest_id is null for update;
  if solo_id is null then raise exception 'Only an unpaired solo duel can be replaced'; end if;

  update public.duels set guest_id = auth.uid(), guest_name = trim(display_name)
    where invite_code = code and guest_id is null and owner_id <> auth.uid()
    returning * into result;
  if result.id is null then raise exception 'This invitation is invalid or already used'; end if;

  delete from public.duels where id = solo_id;
  return result;
end $$;
revoke all on function public.replace_solo_duel_with_invite(uuid, text) from public, anon;
grant execute on function public.replace_solo_duel_with_invite(uuid, text) to authenticated;

-- Each member can change only their own display name.
create or replace function public.update_duel_player_name(display_name text)
returns public.duels language plpgsql security definer set search_path = '' as $$
declare result public.duels;
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  if char_length(trim(display_name)) not between 1 and 40 then raise exception 'Name must be 1 to 40 characters'; end if;
  update public.duels
    set owner_name = case when owner_id = auth.uid() then trim(display_name) else owner_name end,
        guest_name = case when guest_id = auth.uid() then trim(display_name) else guest_name end
    where owner_id = auth.uid() or guest_id = auth.uid()
    returning * into result;
  if result.id is null then raise exception 'Join a duel before changing your name'; end if;
  return result;
end $$;
revoke all on function public.update_duel_player_name(text) from public, anon;
grant execute on function public.update_duel_player_name(text) to authenticated;

do $$ begin
  alter publication supabase_realtime add table public.duels;
  alter publication supabase_realtime add table public.duel_habits;
  alter publication supabase_realtime add table public.duel_check_ins;
  alter publication supabase_realtime add table public.duel_stakes;
exception when duplicate_object then null;
end $$;
