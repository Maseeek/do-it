-- Apply after duels.sql, duels-extras.sql, and egress.sql.
-- Additive and idempotent: keeps existing wagers and history intact while
-- enforcing one active wager per period, validating compact JSONB payloads,
-- adding atomic no-op-safe wager RPCs, short-circuiting unchanged sync reads,
-- and trimming unused child tables from supabase_realtime to extend Supabase
-- free-tier egress, Realtime message, and compute limits.
begin;

-- 1. Deduplicate any pre-existing duplicate active wagers per (duel_id, period, periodKey)
-- without deleting history: keep the newest active wager per window and roll older duplicates over.
-- Keying by periodKey preserves a closed window's Final Call wager alongside the next open window's wager.
with ranked_active as (
  select
    duel_id,
    id,
    row_number() over (
      partition by duel_id, data->>'period', data->>'periodKey'
      order by coalesce(data->>'dueDate', '') desc, id desc
    ) as rn
  from public.duel_stakes
  where data->>'status' = 'active'
)
update public.duel_stakes s
set data = jsonb_set(s.data, '{status}', '"rolled_over"'::jsonb, true)
from ranked_active r
where s.duel_id = r.duel_id
  and s.id = r.id
  and r.rn > 1;

-- 2. Normalize any legacy stake rows that would violate compact payload bounds
-- before adding the table check constraint. Already-valid rows are untouched.
update public.duel_stakes
set data = jsonb_strip_nulls(
  jsonb_build_object(
    'id', id,
    'period', case when coalesce(data->>'period', '') in ('weekly', 'monthly', 'yearly') then data->>'period' else 'weekly' end,
    'periodKey', left(coalesce(nullif(trim(data->>'periodKey'), ''), to_char(now() at time zone 'utc', 'IYYY-"W"IW')), 32),
    'title', left(coalesce(nullif(trim(data->>'title'), ''), 'Wager'), 160),
    'description', left(coalesce(trim(data->>'description'), ''), 500),
    'status', case when coalesce(data->>'status', '') in ('active', 'completed', 'rolled_over') then data->>'status' else 'active' end,
    'winnerId', case when data->>'winnerId' in ('maciek', 'myrna', 'tie') then data->>'winnerId' else null end,
    'dueDate', case when coalesce(data->>'dueDate', '') ~ '^\d{4}-\d{2}-\d{2}$' then data->>'dueDate' else '' end,
    'acknowledged', case when jsonb_typeof(data->'acknowledged') = 'boolean' then data->'acknowledged' else null end
  )
)
where
  jsonb_typeof(data) <> 'object'
  or coalesce(data->>'period', '') not in ('weekly', 'monthly', 'yearly')
  or coalesce(data->>'status', '') not in ('active', 'completed', 'rolled_over')
  or (data->>'winnerId' is not null and data->>'winnerId' not in ('maciek', 'myrna', 'tie'))
  or char_length(coalesce(data->>'title', '')) not between 1 and 160
  or char_length(coalesce(data->>'description', '')) > 500
  or char_length(coalesce(data->>'periodKey', '')) not between 1 and 32
  or (coalesce(data->>'dueDate', '') <> '' and data->>'dueDate' !~ '^\d{4}-\d{2}-\d{2}$');

-- 3. Enforce at most one active wager per (duel_id, period, periodKey) and compact validated JSONB.
drop index if exists public.duel_stakes_one_active_per_period;
create unique index if not exists duel_stakes_one_active_per_period_key
  on public.duel_stakes (duel_id, (data->>'period'), (data->>'periodKey'))
  where data->>'status' = 'active';

do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.duel_stakes'::regclass and conname = 'duel_stakes_valid_data'
  ) then
    alter table public.duel_stakes add constraint duel_stakes_valid_data check (
      jsonb_typeof(data) = 'object'
      and coalesce(data->>'period', '') in ('weekly', 'monthly', 'yearly')
      and coalesce(data->>'status', '') in ('active', 'completed', 'rolled_over')
      and (data->>'winnerId' is null or data->>'winnerId' in ('maciek', 'myrna', 'tie'))
      and char_length(coalesce(data->>'title', '')) between 1 and 160
      and char_length(coalesce(data->>'description', '')) <= 500
      and char_length(coalesce(data->>'periodKey', '')) between 1 and 32
      and (coalesce(data->>'dueDate', '') = '' or data->>'dueDate' ~ '^\d{4}-\d{2}-\d{2}$')
    );
  end if;
end $$;

-- 4. Atomic, idempotent, no-op-safe wager save RPC.
-- Acquires the Duel advisory lock, strips unknown keys to keep storage/egress tiny,
-- resolves concurrent active-wager creation into the existing active row cleanly,
-- and avoids bumping duel_sync_heads or emitting Realtime traffic when unchanged.
create or replace function public.save_duel_stake(p_duel_id uuid, p_stake jsonb)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  v_prev_cursor bigint;
  v_new_cursor bigint;
  v_id text;
  v_target_id text;
  v_existing_active_id text;
  v_period text;
  v_period_key text;
  v_title text;
  v_description text;
  v_status text;
  v_winner_id text;
  v_due_date text;
  v_acknowledged jsonb;
  v_clean jsonb;
  v_existing_data jsonb;
  v_rows integer := 0;
begin
  if not exists (select 1 from public.duels where id = p_duel_id) then
    raise exception 'Duel unavailable' using errcode = '42501';
  end if;
  if jsonb_typeof(p_stake) <> 'object' then
    raise exception 'Invalid wager payload';
  end if;

  v_id := trim(coalesce(p_stake->>'id', ''));
  v_period := coalesce(p_stake->>'period', '');
  v_period_key := trim(coalesce(p_stake->>'periodKey', ''));
  v_title := trim(coalesce(p_stake->>'title', ''));
  v_description := trim(coalesce(p_stake->>'description', ''));
  v_status := coalesce(p_stake->>'status', '');
  v_winner_id := nullif(trim(coalesce(p_stake->>'winnerId', '')), '');
  v_due_date := trim(coalesce(p_stake->>'dueDate', ''));
  v_acknowledged := case when jsonb_typeof(p_stake->'acknowledged') = 'boolean' then p_stake->'acknowledged' else null end;

  if char_length(v_id) not between 1 and 80 then
    raise exception 'Invalid wager id';
  end if;
  if v_period not in ('weekly', 'monthly', 'yearly') then
    raise exception 'Invalid wager period';
  end if;
  if char_length(v_period_key) not between 1 and 32 then
    raise exception 'Invalid wager period key';
  end if;
  if char_length(v_title) not between 1 and 160 then
    raise exception 'Wager title must be 1 to 160 characters';
  end if;
  if char_length(v_description) > 500 then
    raise exception 'Wager description must be 500 characters or fewer';
  end if;
  if v_status not in ('active', 'completed', 'rolled_over') then
    raise exception 'Invalid wager status';
  end if;
  if v_winner_id is not null and v_winner_id not in ('maciek', 'myrna', 'tie') then
    raise exception 'Invalid wager winner';
  end if;
  if v_status = 'completed' and v_winner_id is null then
    raise exception 'Completed wager requires a winner';
  end if;
  if v_due_date <> '' and v_due_date !~ '^\d{4}-\d{2}-\d{2}$' then
    raise exception 'Invalid wager due date';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_duel_id::text, 0));

  select coalesce(revision, 0) into v_prev_cursor
  from public.duel_sync_heads
  where duel_id = p_duel_id;
  v_prev_cursor := coalesce(v_prev_cursor, 0);

  v_target_id := v_id;
  if v_status = 'active' then
    select id into v_existing_active_id
    from public.duel_stakes
    where duel_id = p_duel_id
      and data->>'period' = v_period
      and data->>'periodKey' = v_period_key
      and data->>'status' = 'active'
      and id <> v_id
    limit 1;
    if v_existing_active_id is not null then
      v_target_id := v_existing_active_id;
    end if;
  end if;

  v_clean := jsonb_strip_nulls(jsonb_build_object(
    'id', v_target_id,
    'period', v_period,
    'periodKey', v_period_key,
    'title', v_title,
    'description', v_description,
    'status', v_status,
    'winnerId', v_winner_id,
    'dueDate', v_due_date,
    'acknowledged', v_acknowledged
  ));

  -- Check existing row under the Duel advisory lock before writing so unchanged
  -- saves never fire BEFORE INSERT triggers, never bump duel_sync_heads, and
  -- never emit Realtime traffic.
  select data into v_existing_data
  from public.duel_stakes
  where duel_id = p_duel_id and id = v_target_id;

  if v_existing_data is not null then
    if v_existing_data is distinct from v_clean then
      update public.duel_stakes
      set data = v_clean
      where duel_id = p_duel_id and id = v_target_id;
      get diagnostics v_rows = row_count;
    end if;
  else
    insert into public.duel_stakes(duel_id, id, data)
    values (p_duel_id, v_target_id, v_clean);
    get diagnostics v_rows = row_count;
  end if;

  select coalesce(revision, 0) into v_new_cursor
  from public.duel_sync_heads
  where duel_id = p_duel_id;
  v_new_cursor := coalesce(v_new_cursor, 0);

  return jsonb_build_object(
    'cursor', v_new_cursor::text,
    'previousCursor', v_prev_cursor::text,
    'changed', v_rows > 0,
    'stake', v_clean
  );
end $$;

-- 5. Idempotent wager deletion RPC returning cursor metadata for local cache fast-forward.
create or replace function public.delete_duel_stake(p_duel_id uuid, p_id text)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  v_prev_cursor bigint;
  v_new_cursor bigint;
  v_rows integer := 0;
begin
  if not exists (select 1 from public.duels where id = p_duel_id) then
    raise exception 'Duel unavailable' using errcode = '42501';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_duel_id::text, 0));

  select coalesce(revision, 0) into v_prev_cursor
  from public.duel_sync_heads
  where duel_id = p_duel_id;
  v_prev_cursor := coalesce(v_prev_cursor, 0);

  delete from public.duel_stakes where duel_id = p_duel_id and id = p_id;
  get diagnostics v_rows = row_count;

  select coalesce(revision, 0) into v_new_cursor
  from public.duel_sync_heads
  where duel_id = p_duel_id;
  v_new_cursor := coalesce(v_new_cursor, 0);

  return jsonb_build_object(
    'cursor', v_new_cursor::text,
    'previousCursor', v_prev_cursor::text,
    'deleted', v_rows > 0
  );
end $$;

revoke all on function public.save_duel_stake(uuid, jsonb), public.delete_duel_stake(uuid, text) from public, anon;
grant execute on function public.save_duel_stake(uuid, jsonb), public.delete_duel_stake(uuid, text) to authenticated, service_role;

-- 6. Short-circuit sync_duel when p_after = revision so unchanged reopens and
-- periodic reconciliations skip the 6-table delta join completely.
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
    'changes', case when p_after is null or p_after >= revision then '[]'::jsonb else coalesce((
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
revoke all on function public.sync_duel(uuid, bigint) from public, anon;
grant execute on function public.sync_duel(uuid, bigint) to authenticated, service_role;

-- 7. Trim supabase_realtime publication to only duels and duel_sync_heads.
-- Clients only subscribe to those two lightweight tables; dropping the child
-- tables (including photo-bearing duel_check_ins) stops unnecessary WAL decoding
-- and prevents stale clients from burning Realtime quota.
do $$
declare relation text;
begin
  foreach relation in array array[
    'duel_habits', 'duel_check_ins', 'duel_stakes', 'duel_reactions', 'duel_rest_days',
    'habits', 'check_ins', 'stakes'
  ] loop
    if exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = relation
    ) then
      execute format('alter publication supabase_realtime drop table public.%I', relation);
    end if;
  end loop;
end $$;

notify pgrst, 'reload schema';
commit;
