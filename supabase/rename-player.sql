-- Run in the Supabase SQL editor for existing deployments before enabling name changes.
-- Also included in duels.sql for new deployments.
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
