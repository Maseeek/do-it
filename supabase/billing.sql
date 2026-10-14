-- Additive billing rollout. Existing habit/check-in policies remain unchanged.
-- Apply only to the project configured for this deployment.
create table public.duel_billing (
  duel_id uuid not null references public.duels(id) on delete restrict,
  livemode boolean not null,
  state jsonb not null,
  lease_token uuid,
  lease_until timestamptz,
  updated_at timestamptz not null default now(),
  primary key (duel_id, livemode),
  check (jsonb_typeof(state) = 'object')
);
create unique index duel_billing_customer on public.duel_billing ((state->'customer'->>'id'));
create table public.billing_events (
  event_id text primary key,
  duel_id uuid not null,
  livemode boolean not null,
  processed_at timestamptz not null default now(),
  foreign key (duel_id, livemode) references public.duel_billing(duel_id, livemode) on delete restrict
);
alter table public.duel_billing enable row level security;
alter table public.billing_events enable row level security;
-- Clients have no read/write privileges. Authenticated server endpoints return
-- only the member's billing summary; Stripe IDs and locks stay on the server.
revoke all on public.duel_billing, public.billing_events from anon, authenticated;
grant all on public.duel_billing, public.billing_events to service_role;

create function public.billing_acquire(p_duel uuid, p_live boolean, p_token uuid, p_initial jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare result jsonb;
begin
  insert into public.duel_billing(duel_id, livemode, state)
    values(p_duel, p_live, p_initial) on conflict do nothing;
  update public.duel_billing set lease_token = p_token, lease_until = clock_timestamp() + interval '180 seconds'
    where duel_id = p_duel and livemode = p_live
      and (lease_until is null or lease_until < clock_timestamp())
    returning state into result;
  return result;
end $$;

create function public.billing_save(p_duel uuid, p_live boolean, p_token uuid, p_state jsonb, p_event text default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.duel_billing set state = p_state, updated_at = clock_timestamp()
    where duel_id = p_duel and livemode = p_live and lease_token = p_token and lease_until > clock_timestamp();
  if not found then raise exception 'Billing lease expired'; end if;
  if p_event is not null then
    insert into public.billing_events(event_id, duel_id, livemode) values(p_event, p_duel, p_live) on conflict do nothing;
  end if;
end $$;

create function public.billing_release(p_duel uuid, p_live boolean, p_token uuid)
returns void language sql security definer set search_path = '' as $$
  update public.duel_billing set lease_token = null, lease_until = null
    where duel_id = p_duel and livemode = p_live and lease_token = p_token;
$$;
revoke all on function public.billing_acquire(uuid, boolean, uuid, jsonb) from public, anon, authenticated;
revoke all on function public.billing_save(uuid, boolean, uuid, jsonb, text) from public, anon, authenticated;
revoke all on function public.billing_release(uuid, boolean, uuid) from public, anon, authenticated;
grant execute on function public.billing_acquire(uuid, boolean, uuid, jsonb) to service_role;
grant execute on function public.billing_save(uuid, boolean, uuid, jsonb, text) to service_role;
grant execute on function public.billing_release(uuid, boolean, uuid) to service_role;
