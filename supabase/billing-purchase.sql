-- Apply after billing.sql. Purchase tokens are browser secrets; only their
-- SHA-256 hash is stored, and only server service-role calls can access rows.
create table public.billing_purchases (
  token_hash text not null check (token_hash ~ '^[a-f0-9]{64}$'),
  livemode boolean not null,
  state jsonb not null check (jsonb_typeof(state) = 'object'),
  lease_token uuid,
  lease_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (token_hash, livemode)
);
create unique index billing_purchase_id on public.billing_purchases ((state->>'id'));
create unique index billing_purchase_session on public.billing_purchases ((state->'attempt'->>'sessionId'));
alter table public.billing_purchases enable row level security;
revoke all on public.billing_purchases from anon, authenticated;
grant all on public.billing_purchases to service_role;

create function public.billing_purchase_acquire(p_hash text, p_live boolean, p_token uuid, p_initial jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare result jsonb;
begin
  insert into public.billing_purchases(token_hash, livemode, state)
    values(p_hash, p_live, p_initial) on conflict (token_hash, livemode) do nothing;
  update public.billing_purchases set lease_token = p_token, lease_until = clock_timestamp() + interval '180 seconds'
    where token_hash = p_hash and livemode = p_live
      and (lease_until is null or lease_until < clock_timestamp())
    returning state into result;
  return result;
end $$;
create function public.billing_purchase_save(p_hash text, p_live boolean, p_token uuid, p_state jsonb)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.billing_purchases set state = p_state, updated_at = clock_timestamp()
    where token_hash = p_hash and livemode = p_live and lease_token = p_token and lease_until > clock_timestamp();
  if not found then raise exception 'Membership lease expired'; end if;
end $$;
create function public.billing_purchase_release(p_hash text, p_live boolean, p_token uuid)
returns void language sql security definer set search_path = '' as $$
  update public.billing_purchases set lease_token = null, lease_until = null
    where token_hash = p_hash and livemode = p_live and lease_token = p_token;
$$;
create function public.billing_purchase_claim(
  p_hash text, p_live boolean, p_token uuid, p_duel uuid, p_user uuid, p_state jsonb, p_billing_token uuid
)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not exists(select 1 from public.duels where id = p_duel and owner_id = p_user) then
    raise exception 'Only the Duel owner can activate membership';
  end if;
  -- A retry after a lost response returns success only for the same binding
  -- while holding fresh leases for both rows.
  if exists(select 1 from public.billing_purchases
      where token_hash = p_hash and livemode = p_live and lease_token = p_token and lease_until > clock_timestamp()
        and state->'claimed' = jsonb_build_object('userId', p_user, 'duelId', p_duel))
    and exists(select 1 from public.duel_billing
      where duel_id = p_duel and livemode = p_live and lease_token = p_billing_token and lease_until > clock_timestamp()
        and state->'customer' = p_state->'customer') then
    return;
  end if;
  update public.billing_purchases
    set state = jsonb_set(state, '{claimed}', jsonb_build_object('userId', p_user, 'duelId', p_duel)), updated_at = clock_timestamp()
    where token_hash = p_hash and livemode = p_live and lease_token = p_token and lease_until > clock_timestamp()
      and (state->'claimed' = 'null'::jsonb);
  if not found then raise exception 'Membership claim is unavailable'; end if;
  update public.duel_billing set state = p_state, updated_at = clock_timestamp()
    where duel_id = p_duel and livemode = p_live and lease_token = p_billing_token and lease_until > clock_timestamp()
      and state->'customer' = 'null'::jsonb and state->'customerAttempt' = 'null'::jsonb
      and state->'checkout' = 'null'::jsonb and state->'subscription' = 'null'::jsonb;
  if not found then raise exception 'Duel billing claim is unavailable'; end if;
end $$;
revoke all on function public.billing_purchase_acquire(text, boolean, uuid, jsonb) from public, anon, authenticated;
revoke all on function public.billing_purchase_save(text, boolean, uuid, jsonb) from public, anon, authenticated;
revoke all on function public.billing_purchase_release(text, boolean, uuid) from public, anon, authenticated;
revoke all on function public.billing_purchase_claim(text, boolean, uuid, uuid, uuid, jsonb, uuid) from public, anon, authenticated;
grant execute on function public.billing_purchase_acquire(text, boolean, uuid, jsonb) to service_role;
grant execute on function public.billing_purchase_save(text, boolean, uuid, jsonb) to service_role;
grant execute on function public.billing_purchase_release(text, boolean, uuid) to service_role;
grant execute on function public.billing_purchase_claim(text, boolean, uuid, uuid, uuid, jsonb, uuid) to service_role;
