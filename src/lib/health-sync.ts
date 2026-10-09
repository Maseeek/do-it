import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { CheckIn, Habit, PlayerId } from './types';
import { decryptToken, healthDatabase, localDate } from './health-server';
import { healthEnabled } from './health-access';
import { sleepHours, workouts, type HealthDataPoint } from './health-data';
import { rebalanceWeeklyHabitCheckIns } from './weekly-utils';
import { getWeekKey } from './date-utils';

const activityScope = 'https://www.googleapis.com/auth/googlehealth.activity_and_fitness.readonly';
const sleepScope = 'https://www.googleapis.com/auth/googlehealth.sleep.readonly';
export const healthScopes = { activity: activityScope, sleep: sleepScope };
const base = 'https://health.googleapis.com/v4/users/me/dataTypes';
type Connection = { user_id: string; encrypted_refresh_token: string; scopes: string[]; time_zone: string };

function nextDate(date: string) {
  return new Date(Date.parse(`${date}T12:00:00Z`) + 86400000).toISOString().slice(0, 10);
}
function civil(date: string) {
  const [year, month, day] = date.split('-').map(Number);
  return { date: { year, month, day }, time: { hours: 0, minutes: 0, seconds: 0, nanos: 0 } };
}
async function jsonResponse(response: Response) {
  if (!response.ok) throw new Error(response.status === 401 || response.status === 403 ? 'Google Health permission needs attention. Reconnect to continue.' : `Google Health could not be checked (${response.status}).`);
  return response.json();
}
async function accessToken(connection: Connection) {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: process.env.GOOGLE_CLIENT_ID || '', client_secret: process.env.GOOGLE_CLIENT_SECRET || '', refresh_token: decryptToken(connection.encrypted_refresh_token), grant_type: 'refresh_token' }),
    cache: 'no-store',
  });
  const data = await jsonResponse(response);
  if (!data.access_token) throw new Error('Google Health permission needs attention. Reconnect to continue.');
  return data.access_token as string;
}
async function reconciled(type: 'sleep' | 'exercise', date: string, token: string): Promise<HealthDataPoint[]> {
  const field = type === 'sleep' ? 'civil_end_time' : 'civil_start_time';
  const start = type === 'sleep' ? date : date;
  const end = nextDate(date);
  const points: HealthDataPoint[] = [];
  let pageToken = '';
  for (let page = 0; page < 50; page++) {
    const url = new URL(`${base}/${type}/dataPoints:reconcile`);
    url.searchParams.set('filter', `${type}.interval.${field} >= "${start}" AND ${type}.interval.${field} < "${end}"`);
    url.searchParams.set('dataSourceFamily', 'users/me/dataSourceFamilies/all-sources');
    url.searchParams.set('pageSize', '25');
    if (pageToken) url.searchParams.set('pageToken', pageToken);
    const data = await jsonResponse(await fetch(url, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }, cache: 'no-store' }));
    points.push(...(data.dataPoints || []));
    pageToken = data.nextPageToken || '';
    if (!pageToken) return points;
  }
  throw new Error('Google Health returned too many pages. Try again later.');
}
async function stepsForDay(date: string, token: string): Promise<number | null> {
  const data = await jsonResponse(await fetch(`${base}/steps/dataPoints:dailyRollUp`, {
    method: 'POST', headers: { Authorization: `Bearer ${token}`, Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ range: { start: civil(date), end: civil(nextDate(date)) }, windowSizeDays: 1, dataSourceFamily: 'users/me/dataSourceFamilies/all-sources' }), cache: 'no-store',
  }));
  const record = (data.rollupDataPoints || []).find((point: { civilStartTime?: { date?: { year: number; month: number; day: number } } }) => {
    const d = point.civilStartTime?.date;
    return d && `${d.year}-${String(d.month).padStart(2, '0')}-${String(d.day).padStart(2, '0')}` === date;
  });
  return record?.steps?.countSum === undefined ? null : Number(record.steps.countSum);
}

async function applyResults(db: SupabaseClient, duelId: string, slot: PlayerId, habits: Habit[], date: string, values: { sleep: number | null; steps: number | null; exercise: ReturnType<typeof workouts>; exerciseObserved: boolean }) {
  const { data: rows, error } = await db.from('duel_check_ins').select('id,habit_id,data').eq('duel_id', duelId).eq('player_slot', slot).eq('data->>date', date);
  if (error) throw error;
  let changed = 0;
  for (const habit of habits) {
    const automation = habit.automation;
    if (!automation) continue;
    const existing = rows?.find(row => row.habit_id === habit.id);
    if (existing && (existing.data as CheckIn).source !== 'google_health') continue;
    const hasData = automation.metric === 'sleep' ? values.sleep !== null : automation.metric === 'steps' ? values.steps !== null : values.exerciseObserved;
    const settled = date < new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString().slice(0, 10);
    if (!hasData && !settled) continue;
    let detail: string | null = null;
    if (automation.metric === 'sleep' && values.sleep !== null && values.sleep >= automation.target) detail = `${values.sleep.toFixed(1)} h sleep`;
    if (automation.metric === 'steps' && values.steps !== null && values.steps >= automation.target) detail = `${values.steps.toLocaleString('en-GB')} steps`;
    if (automation.metric === 'workout' || automation.metric === 'cardio') {
      const matched = values.exercise.filter(item => item.metric === automation.metric && item.minutes >= automation.target).sort((a, b) => b.minutes - a.minutes)[0];
      if (matched) detail = `${matched.label} · ${Math.round(matched.minutes)} min`;
    }
    if (!detail) {
      if (existing) { const { error: deleteError } = await db.from('duel_check_ins').delete().eq('duel_id', duelId).eq('id', existing.id); if (deleteError) throw deleteError; changed++; }
      continue;
    }
    const checkIn: CheckIn = { id: existing?.id || `health-${habit.id}-${date}`, habitId: habit.id, playerId: slot, date, pointsEarned: habit.points, completedAt: (existing?.data as CheckIn | undefined)?.completedAt || new Date().toISOString(), source: 'google_health', note: detail };
    if (existing) {
      const prior = existing.data as CheckIn;
      if (prior.note === checkIn.note && prior.pointsEarned === checkIn.pointsEarned && prior.source === checkIn.source) continue;
    }
    const { error: saveError } = await db.from('duel_check_ins').upsert({ duel_id: duelId, id: checkIn.id, habit_id: habit.id, player_slot: slot, data: checkIn });
    if (saveError) throw saveError;
    changed++;
  }
  // Weekly habits only award their configured number of sessions. Keep point totals aligned with manual check-ins.
  for (const habit of habits.filter(item => item.weeklyTargetDays)) {
    const { data: weekRows, error: weekError } = await db.from('duel_check_ins').select('id,data').eq('duel_id', duelId).eq('habit_id', habit.id);
    if (weekError) throw weekError;
    const all = (weekRows || []).map(row => row.data as CheckIn);
    const balanced = rebalanceWeeklyHabitCheckIns(all, habit, getWeekKey(date));
    for (const entry of balanced) {
      const prior = all.find(item => item.id === entry.id);
      if (prior && prior.pointsEarned !== entry.pointsEarned) {
        const { error: updateError } = await db.from('duel_check_ins').update({ data: entry }).eq('duel_id', duelId).eq('id', entry.id);
        if (updateError) throw updateError;
      }
    }
  }
  return changed;
}

export async function syncUserHealth(userId: string, requestedDate?: string) {
  if (!healthEnabled(userId)) throw new Error('Google Health is not available yet.');
  const db = healthDatabase();
  const { data: connection, error: connectionError } = await db.from('health_connections').select('*').eq('user_id', userId).maybeSingle();
  if (connectionError) throw connectionError;
  if (!connection) throw new Error('Google Health is not connected.');
  const { data: duel, error: duelError } = await db.from('duels').select('*').or(`owner_id.eq.${userId},guest_id.eq.${userId}`).limit(1).maybeSingle();
  if (duelError || !duel) throw new Error('Your duel is unavailable.');
  const slot: PlayerId = duel.owner_id === userId ? 'maciek' : 'myrna';
  const date = requestedDate || localDate(connection.time_zone);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date > localDate(connection.time_zone)) throw new Error('Choose a valid day up to today.');
  const { data: rows, error: habitError } = await db.from('duel_habits').select('data').eq('duel_id', duel.id).eq('player_slot', slot);
  if (habitError) throw habitError;
  const habits = (rows || []).map(row => row.data as Habit).filter(habit => habit.isActive && !habit.isArchived && habit.automation);
  try {
    const token = await accessToken(connection as Connection);
    const needsSleep = habits.some(habit => habit.automation?.metric === 'sleep');
    const needsActivity = habits.some(habit => habit.automation?.metric !== 'sleep');
    const canSleep = connection.scopes.includes(sleepScope);
    const canActivity = connection.scopes.includes(activityScope);
    const [sleepPoints, exercisePoints, steps] = await Promise.all([
      needsSleep && canSleep ? reconciled('sleep', date, token) : Promise.resolve(null),
      needsActivity && canActivity ? reconciled('exercise', date, token) : Promise.resolve(null),
      habits.some(habit => habit.automation?.metric === 'steps') && canActivity ? stepsForDay(date, token) : Promise.resolve(null),
    ]);
    const usable = habits.filter(habit => habit.automation?.metric === 'sleep' ? canSleep : canActivity);
    const changed = await applyResults(db, duel.id, slot, usable, date, { sleep: sleepPoints?.length ? sleepHours(sleepPoints) : null, steps, exercise: exercisePoints === null ? [] : workouts(exercisePoints), exerciseObserved: !!exercisePoints?.length });
    await db.from('health_connections').update({ last_checked_at: new Date().toISOString(), last_error: null, updated_at: new Date().toISOString() }).eq('user_id', userId);
    return { success: true, date, changed, needsAttention: habits.length > usable.length, message: habits.length > usable.length ? 'Some health permissions are missing. Reconnect to sync all automatic habits.' : 'Google Health checked.' };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Health sync failed.';
    await db.from('health_connections').update({ last_checked_at: new Date().toISOString(), last_error: message, updated_at: new Date().toISOString() }).eq('user_id', userId);
    throw error;
  }
}
