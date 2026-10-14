import type { SupabaseClient } from '@supabase/supabase-js';
import { applyDuelDelta, checkInPatch, type DuelDelta, type DuelSnapshot } from './duel-data';
import type { CheckIn, CouplesReaction, Habit, RestDay, Stake } from './types';

export async function syncDuelData(client: SupabaseClient, duelId: string, previous: DuelSnapshot | null) {
  const { data, error } = await client.rpc('sync_duel', { p_duel_id: duelId, p_after: previous?.cursor ?? null });
  if (error) {
    if (error.code === 'PGRST202') throw new Error('Duel synchronization needs its database update. Please try again after the update.');
    throw error;
  }
  if (!data || typeof data.cursor !== 'string' || !Array.isArray(data.changes)) throw new Error('Your Duel is unavailable.');
  return applyDuelDelta(previous, data as DuelDelta);
}
export async function loadDuelData(client: SupabaseClient, duelId: string) {
  return (await syncDuelData(client, duelId, null)).data;
}
export async function loadDuelProof(client: SupabaseClient, duelId: string, id: string): Promise<string[]> {
  const { data, error } = await client.rpc('duel_check_in_proof', { p_duel_id: duelId, p_id: id });
  if (error) throw error;
  if (!Array.isArray(data) || !data.every(value => typeof value === 'string')) throw new Error('These proof photos are unavailable.');
  return data;
}

export async function saveDuelHabit(client: SupabaseClient, duelId: string, habit: Habit) {
  const { error } = await client.from('duel_habits').upsert({ duel_id: duelId, id: habit.id, player_slot: habit.playerId, data: habit });
  if (error) throw error;
}
export async function deleteDuelHabit(client: SupabaseClient, duelId: string, id: string) {
  const { error } = await client.from('duel_habits').delete().eq('duel_id', duelId).eq('id', id);
  if (error) throw error;
}
export async function saveDuelCheckIns(client: SupabaseClient, duelId: string, checkIns: CheckIn[]) {
  const unique = [...new Map(checkIns.map(checkIn => [checkIn.id, checkInPatch(checkIn)])).values()];
  for (let offset = 0; offset < unique.length; offset += 100) {
    const { error } = await client.rpc('save_duel_check_ins', { p_duel_id: duelId, p_check_ins: unique.slice(offset, offset + 100) });
    if (error) throw error;
  }
}
export async function saveDuelCheckIn(client: SupabaseClient, duelId: string, checkIn: CheckIn) {
  await saveDuelCheckIns(client, duelId, [checkIn]);
}
export async function deleteDuelCheckIn(client: SupabaseClient, duelId: string, id: string) {
  const { error } = await client.rpc('delete_duel_check_in', { p_duel_id: duelId, p_id: id });
  if (error) throw error;
}
export async function saveDuelStake(client: SupabaseClient, duelId: string, stake: Stake) {
  const { error } = await client.from('duel_stakes').upsert({ duel_id: duelId, id: stake.id, data: stake });
  if (error) throw error;
}
export async function deleteDuelStake(client: SupabaseClient, duelId: string, id: string) {
  const { error } = await client.from('duel_stakes').delete().eq('duel_id', duelId).eq('id', id);
  if (error) throw error;
}
export async function saveDuelReaction(client: SupabaseClient, duelId: string, reaction: CouplesReaction) {
  const { error } = await client.from('duel_reactions').insert({ duel_id: duelId, id: reaction.id, player_slot: reaction.fromPlayerId, data: reaction });
  if (error) throw error;
}
export async function saveDuelRestDay(client: SupabaseClient, duelId: string, restDay: RestDay) {
  const { error } = await client.from('duel_rest_days').insert({ duel_id: duelId, id: restDay.id, player_slot: restDay.playerId, date: restDay.date, data: restDay });
  if (error) throw error;
}
export async function deleteDuelRestDay(client: SupabaseClient, duelId: string, id: string) {
  const { error } = await client.from('duel_rest_days').delete().eq('duel_id', duelId).eq('id', id);
  if (error) throw error;
}
