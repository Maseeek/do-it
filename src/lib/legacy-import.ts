import type { SupabaseClient } from '@supabase/supabase-js';
import type { CheckIn, Habit, PlayerId } from './types';
import { isValidDateString } from './date-utils';
import { rowToCheckIn, rowToHabit } from './supabase-sync';

export function canImportLegacyDatabase(playerId: PlayerId | null, email: string | undefined, guestName: string | null | undefined): boolean {
  if (playerId === 'maciek') return email?.toLowerCase() === 'maciekgeneja@gmail.com';
  return playerId === 'myrna' && /^(mina|myrna)(\s|$)/i.test(guestName?.trim() || '');
}

async function fetchLegacyRows(client: SupabaseClient, table: 'habits' | 'check_ins', playerId: PlayerId) {
  const rows: Record<string, unknown>[] = [];
  const pageSize = 200;
  for (let offset = 0; ;) {
    const { data, error } = await client.from(table).select('*').eq('player_id', playerId).order('id').range(offset, offset + pageSize - 1);
    if (error) throw new Error(`Could not read previous ${table === 'habits' ? 'habits' : 'check-ins'}: ${error.message}`);
    rows.push(...(data || []));
    if (!data || data.length < pageSize) return rows;
    offset += data.length;
  }
}

export async function readLegacyProgress(client: SupabaseClient, playerId: PlayerId) {
  const [habitRows, checkInRows] = await Promise.all([
    fetchLegacyRows(client, 'habits', playerId),
    fetchLegacyRows(client, 'check_ins', playerId),
  ]);
  return { habits: habitRows.map(rowToHabit), checkIns: checkInRows.map(rowToCheckIn) };
}

export function prepareLegacyImport(
  playerId: PlayerId,
  legacyHabits: Habit[],
  legacyCheckIns: CheckIn[],
  currentHabits: Habit[],
  currentCheckIns: CheckIn[],
) {
  const usedHabitIds = new Set(currentHabits.map(habit => habit.id));
  const currentOwnIds = new Set(currentHabits.filter(habit => habit.playerId === playerId).map(habit => habit.id));
  const idMap = new Map<string, string>();
  const missingHabits: Habit[] = [];
  for (const habit of legacyHabits) {
    if (habit.playerId !== playerId || !habit.id || idMap.has(habit.id)) continue;
    const id = currentOwnIds.has(habit.id) ? habit.id : usedHabitIds.has(habit.id) ? `legacy-${playerId}-${habit.id}` : habit.id;
    idMap.set(habit.id, id);
    if (currentOwnIds.has(id)) continue;
    missingHabits.push({ ...habit, id, isActive: false });
    usedHabitIds.add(id);
  }

  const existingDates = new Set(currentCheckIns.filter(checkIn => checkIn.playerId === playerId).map(checkIn => `${checkIn.habitId}:${checkIn.date}`));
  const usedCheckInIds = new Set(currentCheckIns.map(checkIn => checkIn.id));
  const missingCheckIns: CheckIn[] = [];
  const sourceByDate = new Map<string, CheckIn>();
  let duplicatesConsolidated = 0;
  for (const checkIn of legacyCheckIns) {
    const habitId = idMap.get(checkIn.habitId);
    if (checkIn.playerId !== playerId || !habitId || !isValidDateString(checkIn.date) || !Number.isFinite(checkIn.pointsEarned) || checkIn.pointsEarned < 0) continue;
    const dateKey = `${habitId}:${checkIn.date}`;
    const candidate = { ...checkIn, habitId };
    const previous = sourceByDate.get(dateKey);
    if (previous) {
      duplicatesConsolidated++;
      const proofCount = (value: CheckIn) => value.proofUrls?.length || (value.proofUrl ? 1 : 0);
      const comparison = proofCount(candidate) - proofCount(previous) || candidate.pointsEarned - previous.pointsEarned || (candidate.quantity || 0) - (previous.quantity || 0) || Date.parse(candidate.completedAt) - Date.parse(previous.completedAt);
      if (comparison > 0) sourceByDate.set(dateKey, candidate);
    } else sourceByDate.set(dateKey, candidate);
  }
  for (const [dateKey, checkIn] of sourceByDate) {
    if (existingDates.has(dateKey)) continue;
    let id = `legacy-${playerId}-${checkIn.id}`;
    if (usedCheckInIds.has(id)) id = `legacy-${playerId}-${checkIn.id}-${checkIn.date}`;
    if (usedCheckInIds.has(id)) continue;
    missingCheckIns.push({ ...checkIn, id });
    existingDates.add(dateKey);
    usedCheckInIds.add(id);
  }
  return { missingHabits, missingCheckIns, duplicatesConsolidated };
}
