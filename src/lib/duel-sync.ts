import type { SupabaseClient } from '@supabase/supabase-js';
import type { CheckIn, CouplesReaction, Habit, RestDay, Stake } from './types';

export async function fetchDuelRows<T>(client: SupabaseClient, table: string, duelId: string): Promise<T[]> {
  const rows: T[] = [];
  const pageSize = 1000;
  let totalCount: number | null = null;
  let offset = 0;

  function queryRange(start: number, countExact = false) {
    const options: { count?: 'exact' } = countExact ? { count: 'exact' } : {};
    return client.from(table).select('data', options).eq('duel_id', duelId)
      .order('id').range(start, start + pageSize - 1);
  }

  while (true) {
    const { data, count, error } = await queryRange(offset, totalCount === null);
    if (error) throw error;
    if (totalCount === null && typeof count === 'number' && Number.isInteger(count) && count >= 0) {
      totalCount = count;
    }
    const pageRows = (data || []).map(row => row.data as T);
    rows.push(...pageRows);
    if (!data?.length || (totalCount !== null && rows.length >= totalCount)) {
      return rows;
    }
    offset += data.length;

    // Once the exact count is known, read remaining pages in bounded parallel batches of up to 3.
    if (totalCount !== null) {
      const stride = data.length;
      let fellBackToSerial = false;

      while (offset < totalCount && !fellBackToSerial) {
        const batchStarts: number[] = [];
        for (let slot = 0; slot < 3 && offset + slot * stride < totalCount; slot++) {
          batchStarts.push(offset + slot * stride);
        }
        if (batchStarts.length === 0) break;

        const responses = await Promise.all(
          batchStarts.map(async start => {
            const res = await queryRange(start);
            if (res.error) throw res.error;
            return res;
          })
        );

        for (let i = 0; i < responses.length; i++) {
          const start = batchStarts[i];
          if (start !== offset) {
            // Unexpected gap or overlap: discard this and later speculative pages.
            fellBackToSerial = true;
            break;
          }
          const batchData = responses[i].data;
          if (!batchData?.length) {
            return rows;
          }
          rows.push(...batchData.map(row => row.data as T));
          offset += batchData.length;
          if (rows.length >= totalCount) {
            return rows;
          }
          if (batchData.length !== Math.min(stride, totalCount - start)) {
            // Changed page size: discard later speculative pages and fall back.
            fellBackToSerial = true;
            break;
          }
        }
      }

      // If an unexpected short page or gap occurred, complete remaining rows serially.
      while (offset < totalCount) {
        const { data: serialData, error: serialError } = await queryRange(offset);
        if (serialError) throw serialError;
        if (!serialData?.length) {
          return rows;
        }
        rows.push(...serialData.map(row => row.data as T));
        offset += serialData.length;
        if (rows.length >= totalCount) {
          return rows;
        }
      }

      return rows;
    }
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
