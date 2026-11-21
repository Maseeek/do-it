-- Apply after player-colors.sql. Referral attribution is fixed at account creation.
-- Sharing/copying/visiting links and existing-account logins never earn credit.
create table if not exists public.player_recommendation_codes (
  player_id uuid primary key references auth.users(id) on delete cascade,
  code uuid not null unique default gen_random_uuid()
);
create table if not exists public.player_referrals (
  -- Keep the unique signup receipt if the referred account is later deleted.
  referred_id uuid primary key,
  referrer_id uuid not null references auth.users(id) on delete cascade,
  referred_email text not null unique,
  confirmed_at timestamptz,
  check (referred_id <> referrer_id)
);
create index if not exists player_referrals_referrer on public.player_referrals(referrer_id) where confirmed_at is not null;
alter table public.player_recommendation_codes enable row level security;
alter table public.player_referrals enable row level security;
revoke all on public.player_recommendation_codes, public.player_referrals from public, anon, authenticated;
grant select on public.player_recommendation_codes to authenticated;
drop policy if exists "Players read own recommendation code" on public.player_recommendation_codes;
create policy "Players read own recommendation code" on public.player_recommendation_codes
for select to authenticated using (player_id = auth.uid());

create or replace function public.get_recommendation_code()
returns uuid language plpgsql security definer set search_path = '' as $$
declare result uuid;
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  if not exists (select 1 from auth.users where id = auth.uid() and not coalesce(is_anonymous,false)) then
    raise exception 'Create an account first';
  end if;
  insert into public.player_recommendation_codes(player_id) values (auth.uid())
    on conflict (player_id) do nothing;
  select code into result from public.player_recommendation_codes where player_id = auth.uid();
  return result;
end;
$$;
revoke all on function public.get_recommendation_code() from public, anon;
grant execute on function public.get_recommendation_code() to authenticated;

-- Read rewards from the ledger: a confirmation concurrent with first joining
-- a Duel can leave its cached invite counters behind the committed receipt.
create or replace function public.get_player_duel_profile()
returns public.duels language plpgsql security definer set search_path = '' as $$
declare result public.duels;
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  select d.* into result from public.duels d
    where d.owner_id = auth.uid() or d.guest_id = auth.uid()
    order by d.created_at limit 1;
  if result.id is null then return null; end if;
  select count(*) filter (where referrer_id = result.owner_id),
    count(*) filter (where referrer_id = result.guest_id)
    into result.owner_invites, result.guest_invites
    from public.player_referrals where confirmed_at is not null
      and referrer_id in (result.owner_id, result.guest_id);
  return result;
end;
$$;
revoke all on function public.get_player_duel_profile() from public, anon;
grant execute on function public.get_player_duel_profile() to authenticated;

create or replace function public.capture_player_referral()
returns trigger language plpgsql security definer set search_path = '' as $$
declare referral_code text; credited_player uuid;
begin
  if tg_op = 'INSERT' then
    referral_code := new.raw_user_meta_data->>'recommendation_code';
    -- Invalid or stale links must not prevent signup.
    if referral_code is null or referral_code !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      or nullif(trim(new.email),'') is null or coalesce(new.is_anonymous,false) then return new; end if;
    select c.player_id into credited_player from public.player_recommendation_codes c
      join auth.users u on u.id = c.player_id
      where c.code = referral_code::uuid and c.player_id <> new.id
      and lower(trim(u.email)) <> lower(trim(new.email));
    if credited_player is null then return new; end if;
    insert into public.player_referrals(referred_id,referrer_id,referred_email)
      values (new.id,credited_player,lower(trim(new.email))) on conflict do nothing;
  end if;
  -- Use the immutable attribution captured on INSERT, never editable user metadata.
  if new.email_confirmed_at is not null and not coalesce(new.is_anonymous,false) then
    update public.player_referrals set confirmed_at = new.email_confirmed_at
      where referred_id = new.id and confirmed_at is null
      and referred_email = lower(trim(new.email))
      returning referrer_id into credited_player;
    if credited_player is not null then
      -- Lock each Duel row before incrementing to preserve simultaneous confirmations.
      update public.duels set
        owner_invites = owner_invites + case when owner_id = credited_player then 1 else 0 end,
        guest_invites = guest_invites + case when guest_id = credited_player then 1 else 0 end
      where owner_id = credited_player or guest_id = credited_player;
    end if;
  end if;
  return new;
end;
$$;
revoke all on function public.capture_player_referral() from public, anon, authenticated;
drop trigger if exists capture_player_referral on auth.users;
create trigger capture_player_referral after insert or update of email_confirmed_at on auth.users
for each row execute function public.capture_player_referral();

-- Populate a Player's earned credit when they first create or join a Duel.
create or replace function public.load_player_referral_counts()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  select count(*) into new.owner_invites from public.player_referrals
    where referrer_id = new.owner_id and confirmed_at is not null;
  select count(*) into new.guest_invites from public.player_referrals
    where referrer_id = new.guest_id and confirmed_at is not null;
  return new;
end;
$$;
revoke all on function public.load_player_referral_counts() from public, anon, authenticated;
drop trigger if exists load_player_referral_counts on public.duels;
create trigger load_player_referral_counts before insert or update of owner_id,guest_id on public.duels
for each row execute function public.load_player_referral_counts();

-- Replace the old share counts with verified account counts. Unearned Gold relocks.
update public.duels d set
  owner_invites = (select count(*) from public.player_referrals r where r.referrer_id = d.owner_id and r.confirmed_at is not null),
  guest_invites = (select count(*) from public.player_referrals r where r.referrer_id = d.guest_id and r.confirmed_at is not null);
update public.duels set owner_color = case when guest_color = 'blue' then 'purple' else 'blue' end
  where owner_color = 'gold' and owner_invites = 0;
update public.duels set guest_color = case when owner_color = 'purple' then 'blue' else 'purple' end
  where guest_color = 'gold' and guest_invites = 0;
