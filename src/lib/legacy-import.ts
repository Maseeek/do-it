import type { SupabaseClient } from '@supabase/supabase-js';
import type { CheckIn, Habit, PlayerId } from './types';
import { isValidDateString } from './date-utils';
import { rowToCheckIn, rowToHabit } from './supabase-sync';

export function canImportLegacyDatabase(playerId: PlayerId | null, email: string | undefined): boolean {
  if (playerId === 'maciek') return email?.toLowerCase() === 'maciekgeneja@gmail.com';
  return playerId === 'myrna' && email?.toLowerCase() === 'myrnamarsh@icloud.com';
}

export function planLegacyReplacement(
  playerId: PlayerId,
  legacyHabits: Habit[],
  legacyCheckIns: CheckIn[],
  currentHabits: Habit[],
  currentCheckIns: CheckIn[],
) {
  const { missingHabits, missingCheckIns } = prepareLegacyImport(playerId, legacyHabits, legacyCheckIns, currentHabits, currentCheckIns);
  const ownHabits = currentHabits.filter(habit => habit.playerId === playerId);
  const existingById = new Map(ownHabits.map(habit => [habit.id, habit]));
  const missingById = new Map(missingHabits.map(habit => [habit.id, habit]));
  const restored = legacyHabits.filter(habit => habit.playerId === playerId).map(habit => {
    const saved = existingById.get(habit.id) || missingById.get(habit.id) || missingById.get(`legacy-${playerId}-${habit.id}`) || habit;
    return { ...saved, isActive: habit.isActive, isArchived: false };
  });
  const catalog = ownHabits.filter(habit => habit.id.startsWith(`catalog-${playerId}-`));
  return {
    habitsToSave: [...restored, ...catalog.map(habit => ({ ...habit, isActive: false, isArchived: true }))],
    missingCheckIns,
  };
}

export function needsLegacyReplacement(playerId: PlayerId, currentHabits: Habit[]): boolean {
  const own = currentHabits.filter(habit => habit.playerId === playerId);
  if (own.length === 0) return true;
  const catalog = own.some(habit => habit.id.startsWith(`catalog-${playerId}-`));
  const activePrevious = own.some(habit => habit.id.startsWith(`${playerId}-`) && habit.isActive);
  return catalog && !activePrevious;
}

export async function restoreLegacyDuelProgress(
  client: SupabaseClient,
  duelId: string,
  playerId: PlayerId,
  currentHabits: Habit[],
  currentCheckIns: CheckIn[],
): Promise<boolean> {
  const previous = await readLegacyProgress(client, playerId);
  if (previous.habits.length === 0) return false;
  const { habitsToSave, missingCheckIns } = planLegacyReplacement(
    playerId, previous.habits, previous.checkIns, currentHabits, currentCheckIns,
  );
  for (let offset = 0; offset < habitsToSave.length; offset += 50) {
    const rows = habitsToSave.slice(offset, offset + 50).map(habit => ({ duel_id: duelId, id: habit.id, player_slot: playerId, data: habit }));
    const { error } = await client.from('duel_habits').upsert(rows, { onConflict: 'duel_id,id' });
    if (error) throw error;
  }
  for (let offset = 0; offset < missingCheckIns.length; offset += 10) {
    const rows = missingCheckIns.slice(offset, offset + 10).map(checkIn => ({ duel_id: duelId, id: checkIn.id, habit_id: checkIn.habitId, player_slot: playerId, data: checkIn }));
    const { error } = await client.from('duel_check_ins').upsert(rows, { onConflict: 'duel_id,id', ignoreDuplicates: true });
    if (error) throw error;
  }
  return true;
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
