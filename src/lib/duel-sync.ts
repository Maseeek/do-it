import type { SupabaseClient } from '@supabase/supabase-js';
import type { CheckIn, CouplesReaction, Habit, RestDay, Stake } from './types';

async function fetchDuelRows<T>(client: SupabaseClient, table: string, duelId: string): Promise<T[]> {
  const rows: T[] = [];
  const pageSize = 1000;
  for (let offset = 0; ;) {
    const { data, count, error } = await client.from(table).select('data', { count: 'exact' }).eq('duel_id', duelId)
      .order('id').range(offset, offset + pageSize - 1);
    if (error) throw error;
    rows.push(...(data || []).map(row => row.data as T));
    if (!data?.length || (count !== null && rows.length >= count) || (count === null && data.length < pageSize)) return rows;
    offset += data.length;
  }
}

export async function loadDuelData(client: SupabaseClient, duelId: string) {
  const [habits, checkIns, stakes, reactions, restDays] = await Promise.all([
    fetchDuelRows<Habit>(client, 'duel_habits', duelId),
    fetchDuelRows<CheckIn>(client, 'duel_check_ins', duelId),
    fetchDuelRows<Stake>(client, 'duel_stakes', duelId),
    fetchDuelRows<CouplesReaction>(client, 'duel_reactions', duelId),
    fetchDuelRows<RestDay>(client, 'duel_rest_days', duelId),
  ]);
  return { habits, checkIns, stakes, reactions, restDays };
}

export async function saveDuelHabit(client: SupabaseClient, duelId: string, habit: Habit) {
  const { error } = await client.from('duel_habits').upsert({ duel_id: duelId, id: habit.id, player_slot: habit.playerId, data: habit });
  if (error) throw error;
}
export async function deleteDuelHabit(client: SupabaseClient, duelId: string, id: string) {
  const { error } = await client.from('duel_habits').delete().eq('duel_id', duelId).eq('id', id);
  if (error) throw error;
}
export async function saveDuelCheckIn(client: SupabaseClient, duelId: string, checkIn: CheckIn) {
  const { error } = await client.from('duel_check_ins').upsert({ duel_id: duelId, id: checkIn.id, habit_id: checkIn.habitId, player_slot: checkIn.playerId, data: checkIn });
  if (error) throw error;
}
export async function deleteDuelCheckIn(client: SupabaseClient, duelId: string, id: string) {
  const { error } = await client.from('duel_check_ins').delete().eq('duel_id', duelId).eq('id', id);
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
