-- Apply after duels.sql. Persists cheers and rest days within each private duel.
create table if not exists public.duel_reactions (
  duel_id uuid not null references public.duels(id) on delete cascade,
  id text not null,
  player_slot text not null check (player_slot in ('maciek', 'myrna')),
  data jsonb not null,
  primary key (duel_id, id),
  check (data->>'id' = id and data->>'fromPlayerId' = player_slot)
);
create table if not exists public.duel_rest_days (
  duel_id uuid not null references public.duels(id) on delete cascade,
  id text not null,
  player_slot text not null check (player_slot in ('maciek', 'myrna')),
  date date not null,
  data jsonb not null,
  primary key (duel_id, id),
  unique (duel_id, player_slot, date),
  check (data->>'id' = id and data->>'playerId' = player_slot and data->>'date' = date::text)
);
alter table public.duel_reactions enable row level security;
alter table public.duel_rest_days enable row level security;

create policy "Members read reactions" on public.duel_reactions for select to authenticated
  using (exists (select 1 from public.duels d where d.id = duel_id and (d.owner_id = auth.uid() or d.guest_id = auth.uid())));
create policy "Players send own reactions" on public.duel_reactions for insert to authenticated
  with check (exists (select 1 from public.duels d where d.id = duel_id and ((player_slot = 'maciek' and d.owner_id = auth.uid()) or (player_slot = 'myrna' and d.guest_id = auth.uid()))));

create policy "Members read rest days" on public.duel_rest_days for select to authenticated
  using (exists (select 1 from public.duels d where d.id = duel_id and (d.owner_id = auth.uid() or d.guest_id = auth.uid())));
create policy "Players add own rest days" on public.duel_rest_days for insert to authenticated
  with check (exists (select 1 from public.duels d where d.id = duel_id and ((player_slot = 'maciek' and d.owner_id = auth.uid()) or (player_slot = 'myrna' and d.guest_id = auth.uid()))));
create policy "Players delete own rest days" on public.duel_rest_days for delete to authenticated
  using (exists (select 1 from public.duels d where d.id = duel_id and ((player_slot = 'maciek' and d.owner_id = auth.uid()) or (player_slot = 'myrna' and d.guest_id = auth.uid()))));

alter publication supabase_realtime add table public.duel_reactions, public.duel_rest_days;

-- A rapid repeat tap or retry cannot award points twice for one habit on one day.
create unique index if not exists duel_check_ins_one_per_habit_day
  on public.duel_check_ins (duel_id, habit_id, ((data->>'date')));
