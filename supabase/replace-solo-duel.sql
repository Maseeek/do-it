-- Apply to existing deployments that have already run duels.sql.
-- Replaces a player's unpaired duel and its child data only after they confirm in the app.
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
