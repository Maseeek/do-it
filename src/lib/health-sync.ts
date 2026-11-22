import 'server-only';
import { saveDuelCheckIn, saveDuelCheckIns, deleteDuelCheckIn } from './duel-sync';
import { getCurrentWeekDays, getWeekKey } from './date-utils';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { CheckIn, GoogleHealthSyncResult, Habit, HealthTelemetryRecord, PlayerId } from './types';
import { decryptToken, encryptToken, healthDatabase, localDate, validTimeZone } from './health-server';
import { healthEnabled } from './health-access';
import {
  HEALTH_AUTO_SYNC_COOLDOWN_MS,
  isHealthCooldownActive,
  needsHealthReconnect,
  nextDate,
  resolveSyncDates,
  shiftDate,
} from './health-auto-sync';
import { sleepHours, workouts, type HealthDataPoint } from './health-data';
import { rebalanceWeeklyHabitCheckIns } from './weekly-utils';
import { calculateSleepRewardRatio, createSleepCheckIn } from './health-rewards';

const activityScope = 'https://www.googleapis.com/auth/googlehealth.activity_and_fitness.readonly';
const sleepScope = 'https://www.googleapis.com/auth/googlehealth.sleep.readonly';
export const healthScopes = { activity: activityScope, sleep: sleepScope };
const base = 'https://health.googleapis.com/v4/users/me/dataTypes';
type Connection = {
  user_id: string;
  encrypted_refresh_token: string;
  scopes: string[];
  time_zone: string;
  last_checked_at: string | null;
  last_error: string | null;
};

export interface SyncUserHealthOptions {
  date?: string;
  dates?: string[];
  auto?: boolean;
  timeZone?: string;
  cooldownMs?: number;
  skipIfAuthError?: boolean;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function civil(date: string) {
  const [year, month, day] = date.split('-').map(Number);
  return { date: { year, month, day }, time: { hours: 0, minutes: 0, seconds: 0, nanos: 0 } };
}
async function jsonResponse(response: Response) {
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error('Google Health permission needs attention. Reconnect to continue.');
    }
    if (response.status === 429) {
      throw new Error('Google Health is busy right now. Try again shortly.');
    }
    throw new Error(`Google Health could not be checked (${response.status}).`);
  }
  return response.json();
}
async function exchangeAccessToken(connection: Connection): Promise<{ accessToken: string; refreshToken?: string }> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID || '',
      client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
      refresh_token: decryptToken(connection.encrypted_refresh_token),
      grant_type: 'refresh_token',
    }),
    cache: 'no-store',
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (
      response.status === 401 ||
      response.status === 403 ||
      (response.status === 400 && data?.error === 'invalid_grant')
    ) {
      throw new Error('Google Health permission needs attention. Reconnect to continue.');
    }
    if (response.status === 429) {
      throw new Error('Google Health is busy right now. Try again shortly.');
    }
    throw new Error(`Google Health could not be checked (${response.status}).`);
  }
  if (typeof data?.access_token !== 'string' || !data.access_token) {
    throw new Error('Google Health permission needs attention. Reconnect to continue.');
  }
  return {
    accessToken: data.access_token,
    refreshToken: typeof data.refresh_token === 'string' && data.refresh_token ? data.refresh_token : undefined,
  };
}
async function reconciled(type: 'sleep' | 'exercise', date: string, token: string): Promise<HealthDataPoint[]> {
  const field = type === 'sleep' ? 'civil_end_time' : 'civil_start_time';
  const start = date;
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

async function applyResults(
  db: SupabaseClient,
  duelId: string,
  slot: PlayerId,
  habits: Habit[],
  date: string,
  today: string,
  values: { sleep: number | null; steps: number | null; exercise: ReturnType<typeof workouts>; exerciseObserved: boolean },
) {
  const { data: rows, error } = await db.from('duel_check_ins_metadata').select('id,habit_id,data').eq('duel_id', duelId).eq('player_slot', slot).eq('data->>date', date);
  if (error) throw error;
  let changed = 0;
  const telemetry: HealthTelemetryRecord[] = [];
  const settledCutoff = shiftDate(today, -2);

  for (const habit of habits) {
    const automation = habit.automation;
    if (!automation) continue;

    let measuredValue: number | null = null;
    let unit = 'hrs';
    if (automation.metric === 'sleep') {
      measuredValue = values.sleep;
      unit = 'hrs';
    } else if (automation.metric === 'steps') {
      measuredValue = values.steps;
      unit = 'steps';
    } else if (automation.metric === 'workout' || automation.metric === 'cardio') {
      if (values.exerciseObserved) {
        const matched = values.exercise.filter(item => item.metric === automation.metric).sort((a, b) => b.minutes - a.minutes)[0];
        measuredValue = matched ? matched.minutes : 0;
      }
      unit = 'min';
    }

    if (measuredValue !== null) {
      telemetry.push({
        habitId: habit.id,
        playerId: slot,
        date,
        metric: automation.metric,
        value: measuredValue,
        target: automation.target,
        unit,
        recordedAt: new Date().toISOString(),
        source: 'google_health',
      });
    }

    const existing = rows?.find(row => row.habit_id === habit.id);
    if (existing && (existing.data as CheckIn).source !== 'google_health' &&
        (automation.metric !== 'sleep' || measuredValue === null)) continue;
    const hasData = automation.metric === 'sleep' ? values.sleep !== null : automation.metric === 'steps' ? values.steps !== null : values.exerciseObserved;
    const settled = date < settledCutoff;
    if (!hasData && !settled) continue;
    let detail: string | null = null;
    if (automation.metric === 'sleep' && values.sleep !== null && calculateSleepRewardRatio(values.sleep) > 0) detail = `${values.sleep.toFixed(2)} h sleep`;
    if (automation.metric === 'steps' && values.steps !== null && values.steps >= automation.target) detail = `${values.steps.toLocaleString('en-GB')} steps`;
    if (automation.metric === 'workout' || automation.metric === 'cardio') {
      const matched = values.exercise.filter(item => item.metric === automation.metric && item.minutes >= automation.target).sort((a, b) => b.minutes - a.minutes)[0];
      if (matched) detail = `${matched.label} · ${Math.round(matched.minutes)} min`;
    }
    if (!detail) {
      if (existing) { await deleteDuelCheckIn(db, duelId, existing.id); changed++; }
      continue;
    }
    const priorCheckIn: CheckIn | undefined = existing?.data;
    const sleepCheckIn = automation.metric === 'sleep' && values.sleep !== null
      ? createSleepCheckIn(habit, date, values.sleep, priorCheckIn)
      : null;
    const checkIn: CheckIn = sleepCheckIn ?? {
      id: existing?.id || `health-${habit.id}-${date}`,
      habitId: habit.id,
      playerId: slot,
      date,
      pointsEarned: habit.points,
      completedAt: (existing?.data as CheckIn | undefined)?.completedAt || new Date().toISOString(),
      source: 'google_health',
      healthValue: measuredValue ?? undefined,
      note: detail,
    };
    if (existing) {
      const prior = existing.data as CheckIn;
      if (prior.note === checkIn.note && prior.pointsEarned === checkIn.pointsEarned && prior.source === checkIn.source && prior.healthValue === checkIn.healthValue) continue;
    }
    await saveDuelCheckIn(db, duelId, checkIn);
    changed++;
  }
  // Weekly habits only award their configured number of sessions. Keep point totals aligned with manual check-ins.
  for (const habit of habits.filter(item => item.weeklyTargetDays)) {
    const week = getCurrentWeekDays(date);
    const { data: weekRows, error: weekError } = await db.from('duel_check_ins_metadata').select('id,data').eq('duel_id', duelId).eq('habit_id', habit.id).gte('data->>date', week[0].dateStr).lte('data->>date', week[6].dateStr);
    if (weekError) throw weekError;
    const all = (weekRows || []).map(row => row.data as CheckIn);
    const balanced = rebalanceWeeklyHabitCheckIns(all, habit, getWeekKey(date));
    const rebalanced: CheckIn[] = [];
    for (const entry of balanced) {
      const prior = all.find(item => item.id === entry.id);
      if (prior && prior.pointsEarned !== entry.pointsEarned) {
        rebalanced.push(entry);
      }
    }
    if (rebalanced.length > 0) {
      await saveDuelCheckIns(db, duelId, rebalanced);
      changed += rebalanced.length;
    }
  }
  return { changed, telemetry };
}

export async function syncUserHealth(
  userId: string,
  requestedDateOrOptions?: string | SyncUserHealthOptions,
): Promise<GoogleHealthSyncResult> {
  const options: SyncUserHealthOptions = typeof requestedDateOrOptions === 'string'
    ? { date: requestedDateOrOptions }
    : (requestedDateOrOptions ?? {});
  const isAuto = Boolean(options.auto);

  if (!healthEnabled(userId)) {
    if (isAuto) {
      return {
        success: true,
        available: false,
        connected: false,
        skipped: true,
        reason: 'unavailable',
        date: '',
        changed: 0,
        telemetry: [],
        message: 'Google Health is not available yet.',
      };
    }
    throw new Error('Google Health is not available yet.');
  }

  const db = healthDatabase();
  const { data: connectionRow, error: connectionError } = await db.from('health_connections').select('*').eq('user_id', userId).maybeSingle();
  if (connectionError) throw connectionError;
  if (!connectionRow) {
    if (isAuto) {
      return {
        success: true,
        available: true,
        connected: false,
        skipped: true,
        reason: 'not_connected',
        date: '',
        changed: 0,
        telemetry: [],
        message: 'Google Health is not connected.',
      };
    }
    throw new Error('Google Health is not connected.');
  }

  const connection = connectionRow as Connection;
  const effectiveTimeZone = options.timeZone && validTimeZone(options.timeZone)
    ? options.timeZone
    : (connection.time_zone && validTimeZone(connection.time_zone) ? connection.time_zone : 'UTC');
  const today = localDate(effectiveTimeZone);

  if ((isAuto || options.skipIfAuthError) && needsHealthReconnect(connection.last_error)) {
    return {
      success: true,
      available: true,
      connected: true,
      skipped: true,
      reason: 'needs_attention',
      needsAttention: true,
      date: today,
      changed: 0,
      telemetry: [],
      lastCheckedAt: connection.last_checked_at,
      message: connection.last_error || 'Google Health permission needs attention. Reconnect to continue.',
    };
  }

  const cooldownMs = options.cooldownMs ?? HEALTH_AUTO_SYNC_COOLDOWN_MS;
  if (isAuto && isHealthCooldownActive(connection.last_checked_at, Date.now(), cooldownMs)) {
    return {
      success: true,
      available: true,
      connected: true,
      skipped: true,
      reason: 'cooldown',
      date: today,
      changed: 0,
      telemetry: [],
      lastCheckedAt: connection.last_checked_at,
      message: 'Google Health was checked recently.',
    };
  }

  const rawDates = options.dates?.length
    ? [...new Set(options.dates)]
    : resolveSyncDates(today, options.date, isAuto || !options.date || options.date === today);
  const dates = [...rawDates].sort();
  if (!dates.length || dates.some(date => !DATE_RE.test(date) || date > today)) {
    throw new Error('Choose a valid day up to today.');
  }
  const primaryDate = dates[dates.length - 1];

  const { data: duel, error: duelError } = await db.from('duels').select('*').or(`owner_id.eq.${userId},guest_id.eq.${userId}`).limit(1).maybeSingle();
  if (duelError || !duel) throw new Error('Your duel is unavailable.');
  const slot: PlayerId = duel.owner_id === userId ? 'maciek' : 'myrna';
  const { data: rows, error: habitError } = await db.from('duel_habits').select('data').eq('duel_id', duel.id).eq('player_slot', slot);
  if (habitError) throw habitError;
  const habits = (rows || []).map(row => row.data as Habit).filter(habit => habit.isActive && !habit.isArchived && habit.automation);

  if (isAuto && habits.length === 0) {
    return {
      success: true,
      available: true,
      connected: true,
      skipped: true,
      reason: 'no_habits',
      date: primaryDate,
      changed: 0,
      telemetry: [],
      lastCheckedAt: connection.last_checked_at,
      message: 'No active automatic habits.',
    };
  }

  // Atomically claim the sync slot for automatic checks so concurrent tabs/workers do not duplicate Google API calls.
  if (isAuto) {
    const claimTime = new Date().toISOString();
    let claimQuery = db
      .from('health_connections')
      .update({
        last_checked_at: claimTime,
        updated_at: claimTime,
        ...(effectiveTimeZone !== connection.time_zone ? { time_zone: effectiveTimeZone } : {}),
      })
      .eq('user_id', userId);
    claimQuery = connection.last_checked_at
      ? claimQuery.eq('last_checked_at', connection.last_checked_at)
      : claimQuery.is('last_checked_at', null);
    const { data: claimed, error: claimError } = await claimQuery.select('user_id').maybeSingle();
    if (claimError) throw claimError;
    if (!claimed) {
      return {
        success: true,
        available: true,
        connected: true,
        skipped: true,
        reason: 'in_flight',
        date: primaryDate,
        changed: 0,
        telemetry: [],
        lastCheckedAt: claimTime,
        message: 'Google Health check already in progress.',
      };
    }
  }

  try {
    const { accessToken: token, refreshToken } = await exchangeAccessToken(connection);
    const needsSleep = habits.some(habit => habit.automation?.metric === 'sleep');
    const needsActivity = habits.some(habit => habit.automation?.metric !== 'sleep');
    const needsSteps = habits.some(habit => habit.automation?.metric === 'steps');
    const canSleep = connection.scopes.includes(sleepScope);
    const canActivity = connection.scopes.includes(activityScope);
    const usable = habits.filter(habit => habit.automation?.metric === 'sleep' ? canSleep : canActivity);

    const fetchedByDate = await Promise.all(
      dates.map(async (date) => {
        const [sleepPoints, exercisePoints, steps] = await Promise.all([
          needsSleep && canSleep ? reconciled('sleep', date, token) : Promise.resolve(null),
          needsActivity && canActivity ? reconciled('exercise', date, token) : Promise.resolve(null),
          needsSteps && canActivity ? stepsForDay(date, token) : Promise.resolve(null),
        ]);
        return {
          date,
          values: {
            sleep: sleepPoints?.length ? sleepHours(sleepPoints) : null,
            steps,
            exercise: exercisePoints === null ? [] : workouts(exercisePoints),
            exerciseObserved: !!exercisePoints?.length,
          },
        };
      }),
    );

    let totalChanged = 0;
    const allTelemetry: HealthTelemetryRecord[] = [];
    for (const entry of fetchedByDate) {
      const { changed, telemetry } = await applyResults(db, duel.id, slot, usable, entry.date, today, entry.values);
      totalChanged += changed;
      allTelemetry.push(...telemetry);
    }

    const checkedAt = new Date().toISOString();
    const updatePayload: Record<string, unknown> = {
      last_checked_at: checkedAt,
      last_error: null,
      time_zone: effectiveTimeZone,
      updated_at: checkedAt,
    };
    if (refreshToken) {
      updatePayload.encrypted_refresh_token = encryptToken(refreshToken);
    }
    await db.from('health_connections').update(updatePayload).eq('user_id', userId);

    return {
      success: true,
      available: true,
      connected: true,
      date: primaryDate,
      dates,
      changed: totalChanged,
      telemetry: allTelemetry,
      lastCheckedAt: checkedAt,
      needsAttention: habits.length > usable.length,
      message: habits.length > usable.length ? 'Some health permissions are missing. Reconnect to sync all automatic habits.' : 'Google Health checked.',
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Health sync failed.';
    const failedAt = new Date().toISOString();
    await db.from('health_connections').update({
      last_checked_at: failedAt,
      last_error: message,
      time_zone: effectiveTimeZone,
      updated_at: failedAt,
    }).eq('user_id', userId);
    throw error;
  }
}
