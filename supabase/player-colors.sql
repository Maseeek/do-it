-- Apply after duels.sql. Existing profiles keep the blue creator / purple opponent defaults.
alter table public.duels
  add column if not exists owner_color text not null default 'blue'
    check (owner_color in ('blue', 'purple', 'teal', 'orange', 'pink', 'green', 'rainbow', 'gold'));
alter table public.duels
  add column if not exists guest_color text not null default 'purple'
    check (guest_color in ('blue', 'purple', 'teal', 'orange', 'pink', 'green', 'rainbow', 'gold'));
alter table public.duels
  add column if not exists owner_invites integer not null default 0;
alter table public.duels
  add column if not exists guest_invites integer not null default 0;

-- Compatibility for older clients: sharing is not a completed referral.
create or replace function public.record_app_invite()
returns public.duels language plpgsql security definer set search_path = '' as $$
declare target_duel public.duels;
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  select d.* into target_duel from public.duels d
    where d.owner_id = auth.uid() or d.guest_id = auth.uid()
    order by d.created_at limit 1;
  if target_duel.id is null then raise exception 'Join a duel first'; end if;
  return target_duel;
end;
$$;
revoke all on function public.record_app_invite() from public, anon;
grant execute on function public.record_app_invite() to authenticated;

-- Repair an existing shared palette before enforcing distinct paired colours.
update public.duels set guest_color = case when owner_color = 'blue' then 'purple' else 'blue' end
where guest_id is not null and owner_color = guest_color;
do $$ begin
  if not exists (select 1 from pg_constraint where conrelid = 'public.duels'::regclass and conname = 'duels_distinct_player_colors') then
    alter table public.duels add constraint duels_distinct_player_colors
      check (guest_id is null or owner_color <> guest_color);
  end if;
end $$;

-- Joining a solo Duel must not inherit the owner's already chosen palette.
create or replace function public.assign_distinct_guest_color()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.guest_id is not null and (tg_op = 'INSERT' or old.guest_id is null)
     and new.guest_color = new.owner_color then
    new.guest_color := case when new.owner_color = 'blue' then 'purple' else 'blue' end;
  end if;
  return new;
end;
$$;
revoke all on function public.assign_distinct_guest_color() from public, anon, authenticated;
drop trigger if exists assign_distinct_guest_color on public.duels;
create trigger assign_distinct_guest_color before insert or update of guest_id on public.duels
for each row execute function public.assign_distinct_guest_color();

-- Enforce point unlocks or invite unlocks in the database and update only the caller's player slot.
create or replace function public.set_player_color(requested_color text)
returns public.duels
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_duel public.duels;
  v_player_slot text;
  lifetime_points numeric;
  required_points integer;
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;

  required_points := case requested_color
    when 'blue' then 0
    when 'purple' then 0
    when 'teal' then 250
    when 'orange' then 500
    when 'pink' then 1000
    when 'green' then 2500
    when 'rainbow' then 10000
    when 'gold' then 0
    else null
  end;
  if required_points is null then raise exception 'Unknown player color'; end if;

  select d.* into target_duel
    from public.duels d
    where d.owner_id = auth.uid() or d.guest_id = auth.uid()
    order by d.created_at
    limit 1
    for update;
  if target_duel.id is null then raise exception 'Join a duel before changing your color'; end if;

  v_player_slot := case when target_duel.owner_id = auth.uid() then 'maciek' else 'myrna' end;

  if target_duel.guest_id is not null and requested_color =
    (case when v_player_slot = 'maciek' then target_duel.guest_color else target_duel.owner_color end) then
    raise exception 'Your opponent is already using that colour. Choose another.';
  end if;

  if requested_color = 'gold' then
    if (v_player_slot = 'maciek' and coalesce(target_duel.owner_invites, 0) < 1) or
       (v_player_slot = 'myrna' and coalesce(target_duel.guest_invites, 0) < 1) then
      raise exception 'A new friend must create and confirm an account through your recommendation link to unlock Gold';
    end if;
  else
    select coalesce(sum(
      case when jsonb_typeof(c.data->'pointsEarned') = 'number'
        then (c.data->>'pointsEarned')::numeric else 0 end
    ), 0)
      into lifetime_points
      from public.duel_check_ins c
      where c.duel_id = target_duel.id and c.player_slot = v_player_slot;
    if lifetime_points < required_points then raise exception 'Earn more lifetime points to unlock this color'; end if;
  end if;

  if v_player_slot = 'maciek' then
    update public.duels set owner_color = requested_color where id = target_duel.id returning * into target_duel;
  else
    update public.duels set guest_color = requested_color where id = target_duel.id returning * into target_duel;
  end if;
  return target_duel;
end;
$$;

revoke all on function public.set_player_color(text) from public, anon;
grant execute on function public.set_player_color(text) to authenticated;
