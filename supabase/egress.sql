-- Apply after duels.sql and duels-extras.sql. Additive: existing progress and proofs stay in place.
begin;

create or replace function public.duel_check_in_metadata(value jsonb)
returns jsonb language sql immutable set search_path = '' as $$
  select (value - 'proofUrl' - 'proofUrls') || jsonb_build_object(
    'proofCount', case when jsonb_typeof(value->'proofUrls') = 'array' and jsonb_array_length(value->'proofUrls') > 0
      then jsonb_array_length(value->'proofUrls') when coalesce(value->>'proofUrl', '') <> '' then 1 else 0 end,
    'proofVersion', md5(coalesce((value->'proofUrls')::text, '') || coalesce(value->>'proofUrl', '')));
$$;
create or replace view public.duel_check_ins_metadata with (security_invoker = true) as
  select duel_id, id, habit_id, player_slot, public.duel_check_in_metadata(data) as data from public.duel_check_ins;
grant select on public.duel_check_ins_metadata to authenticated, service_role;

create table if not exists public.duel_sync_heads (
  duel_id uuid primary key references public.duels(id) on delete cascade,
  revision bigint not null default 0
);
create table if not exists public.duel_sync_changes (
  duel_id uuid not null references public.duels(id) on delete cascade,
  table_name text not null,
  row_id text not null,
  revision bigint not null,
  deleted boolean not null,
  primary key (duel_id, table_name, row_id)
);
create index if not exists duel_sync_changes_revision on public.duel_sync_changes(duel_id, revision);
create index if not exists duel_check_ins_player_date on public.duel_check_ins(duel_id, player_slot, (data->>'date'));
insert into public.duel_sync_heads(duel_id) select id from public.duels on conflict do nothing;
alter table public.duel_sync_heads enable row level security;
alter table public.duel_sync_changes enable row level security;
drop policy if exists "Members read sync heads" on public.duel_sync_heads;
create policy "Members read sync heads" on public.duel_sync_heads for select to authenticated
  using (exists (select 1 from public.duels d where d.id = duel_id and (d.owner_id = auth.uid() or d.guest_id = auth.uid())));
drop policy if exists "Members read sync changes" on public.duel_sync_changes;
create policy "Members read sync changes" on public.duel_sync_changes for select to authenticated
  using (exists (select 1 from public.duels d where d.id = duel_id and (d.owner_id = auth.uid() or d.guest_id = auth.uid())));
revoke all on public.duel_sync_heads, public.duel_sync_changes from public, anon, authenticated;
grant select on public.duel_sync_heads, public.duel_sync_changes to authenticated;
grant all on public.duel_sync_heads, public.duel_sync_changes to service_role;

-- Acquire a transaction lock before tuple locks for authenticated multi-row writes.
create or replace function public.lock_duel_sync_statement()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare duel uuid;
begin
  for duel in select id from public.duels where owner_id = auth.uid() or guest_id = auth.uid() order by id loop
    perform pg_advisory_xact_lock(hashtextextended(duel::text, 0));
  end loop;
  return null;
end $$;
revoke all on function public.lock_duel_sync_statement() from public, anon, authenticated;

-- Lock the Duel revision before changing any row, so commit order cannot skip a delta.
create or replace function public.track_duel_sync_before()
returns trigger language plpgsql security definer set search_path = '' as $$
declare duel uuid := case when TG_OP = 'DELETE' then OLD.duel_id else NEW.duel_id end;
begin
  if exists (select 1 from public.duels where id = duel) then
    insert into public.duel_sync_heads(duel_id, revision) values (duel, 1)
      on conflict (duel_id) do update set revision = public.duel_sync_heads.revision + 1;
  end if;
  if TG_OP = 'DELETE' then return OLD; end if;
  return NEW;
end $$;
create or replace function public.track_duel_sync_after()
returns trigger language plpgsql security definer set search_path = '' as $$
declare duel uuid := case when TG_OP = 'DELETE' then OLD.duel_id else NEW.duel_id end;
declare row_key text := case when TG_OP = 'DELETE' then OLD.id else NEW.id end;
begin
  if exists (select 1 from public.duels where id = duel) then
    insert into public.duel_sync_changes(duel_id, table_name, row_id, revision, deleted)
      select duel, TG_TABLE_NAME, row_key, revision, TG_OP = 'DELETE' from public.duel_sync_heads where duel_id = duel
      on conflict (duel_id, table_name, row_id) do update set revision = excluded.revision, deleted = excluded.deleted;
  end if;
  return null;
end $$;
revoke all on function public.track_duel_sync_before(), public.track_duel_sync_after() from public, anon, authenticated;
do $$ declare relation text; begin
  foreach relation in array array['duel_habits','duel_check_ins','duel_stakes','duel_reactions','duel_rest_days'] loop
    execute format('drop trigger if exists duel_sync_lock on public.%I', relation);
    execute format('create trigger duel_sync_lock before insert or update or delete on public.%I for each statement execute function public.lock_duel_sync_statement()', relation);
    execute format('drop trigger if exists duel_sync_before on public.%I', relation);
    execute format('create trigger duel_sync_before before insert or update or delete on public.%I for each row execute function public.track_duel_sync_before()', relation);
    execute format('drop trigger if exists duel_sync_after on public.%I', relation);
    execute format('create trigger duel_sync_after after insert or update or delete on public.%I for each row execute function public.track_duel_sync_after()', relation);
  end loop;
end $$;

-- One statement gives the cursor and its snapshot/delta the same MVCC view.
create or replace function public.sync_duel(p_duel_id uuid, p_after bigint default null)
returns jsonb language sql stable security invoker set search_path = '' as $$
  with head as (
    select coalesce(h.revision, 0) as revision from public.duels d
    left join public.duel_sync_heads h on h.duel_id = d.id where d.id = p_duel_id
  )
  select jsonb_build_object('cursor', revision::text,
    'snapshot', case when p_after is null or p_after > revision then jsonb_build_object(
      'habits', coalesce((select jsonb_agg(data order by id) from public.duel_habits where duel_id = p_duel_id), '[]'::jsonb),
      'checkIns', coalesce((select jsonb_agg(data order by id) from public.duel_check_ins_metadata where duel_id = p_duel_id), '[]'::jsonb),
      'stakes', coalesce((select jsonb_agg(data order by id) from public.duel_stakes where duel_id = p_duel_id), '[]'::jsonb),
      'reactions', coalesce((select jsonb_agg(data order by id) from public.duel_reactions where duel_id = p_duel_id), '[]'::jsonb),
      'restDays', coalesce((select jsonb_agg(data order by id) from public.duel_rest_days where duel_id = p_duel_id), '[]'::jsonb)) else null end,
    'changes', case when p_after is null or p_after > revision then '[]'::jsonb else coalesce((
      select jsonb_agg(jsonb_build_object('table', c.table_name, 'id', c.row_id, 'deleted', c.deleted,
        'data', case c.table_name when 'duel_habits' then h.data when 'duel_check_ins' then public.duel_check_in_metadata(ci.data)
        when 'duel_stakes' then s.data when 'duel_reactions' then r.data when 'duel_rest_days' then rd.data end) order by c.revision)
      from public.duel_sync_changes c
      left join public.duel_habits h on c.table_name = 'duel_habits' and h.duel_id = c.duel_id and h.id = c.row_id
      left join public.duel_check_ins ci on c.table_name = 'duel_check_ins' and ci.duel_id = c.duel_id and ci.id = c.row_id
      left join public.duel_stakes s on c.table_name = 'duel_stakes' and s.duel_id = c.duel_id and s.id = c.row_id
      left join public.duel_reactions r on c.table_name = 'duel_reactions' and r.duel_id = c.duel_id and r.id = c.row_id
      left join public.duel_rest_days rd on c.table_name = 'duel_rest_days' and rd.duel_id = c.duel_id and rd.id = c.row_id
      where c.duel_id = p_duel_id and c.revision > p_after), '[]'::jsonb) end)
  from head;
$$;
create or replace function public.duel_check_in_proof(p_duel_id uuid, p_id text)
returns jsonb language sql stable security invoker set search_path = '' as $$
  select case when jsonb_typeof(data->'proofUrls') = 'array' and jsonb_array_length(data->'proofUrls') > 0
    then data->'proofUrls' when coalesce(data->>'proofUrl', '') <> '' then jsonb_build_array(data->>'proofUrl') else '[]'::jsonb end
  from public.duel_check_ins where duel_id = p_duel_id and id = p_id;
$$;
-- Merge only supplied fields. Metadata-only edits must never remove omitted proofs.
create or replace function public.save_duel_check_ins(p_duel_id uuid, p_check_ins jsonb)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  if not exists (select 1 from public.duels where id = p_duel_id) then raise exception 'Duel unavailable' using errcode = '42501'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_duel_id::text, 0));
  if jsonb_typeof(p_check_ins) <> 'array' or jsonb_array_length(p_check_ins) > 100 then raise exception 'Invalid check-in batch'; end if;
  insert into public.duel_check_ins(duel_id, id, habit_id, player_slot, data)
    select p_duel_id, value->>'id', value->>'habitId', value->>'playerId', value - 'proofCount' - 'proofVersion'
    from jsonb_array_elements(p_check_ins)
    on conflict (duel_id, id) do update set data = public.duel_check_ins.data || excluded.data
    where public.duel_check_ins.data is distinct from (public.duel_check_ins.data || excluded.data);
end $$;
create or replace function public.delete_duel_check_in(p_duel_id uuid, p_id text)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  if not exists (select 1 from public.duels where id = p_duel_id) then raise exception 'Duel unavailable' using errcode = '42501'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_duel_id::text, 0));
  delete from public.duel_check_ins where duel_id = p_duel_id and id = p_id;
end $$;
revoke all on function public.delete_duel_check_in(uuid,text) from public, anon;
grant execute on function public.delete_duel_check_in(uuid,text) to authenticated, service_role;
revoke all on function public.sync_duel(uuid,bigint), public.duel_check_in_proof(uuid,text), public.save_duel_check_ins(uuid,jsonb) from public, anon;
grant execute on function public.sync_duel(uuid,bigint), public.duel_check_in_proof(uuid,text), public.save_duel_check_ins(uuid,jsonb) to authenticated, service_role;
do $$ begin
  alter publication supabase_realtime add table public.duel_sync_heads;
exception when duplicate_object then null; end $$;
notify pgrst, 'reload schema';
commit;
