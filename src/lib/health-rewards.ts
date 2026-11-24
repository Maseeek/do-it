import type { CheckIn, Habit, HealthTelemetryRecord } from './types';

export const SLEEP_FULL_POINTS_HOURS = 8.5;
export const MIN_SLEEP_TARGET_HOURS = 4;
export const MAX_SLEEP_TARGET_HOURS = 12;
export const SLEEP_TARGET_OPTIONS = [5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10, 10.5, 11, 12] as const;
export const SLEEP_QUICK_TARGET_PRESETS = [6.5, 7, 7.5, 8, 8.5, 9] as const;

const SLEEP_MILESTONE_OFFSETS = [
  { offset: -2, ratio: 0.2 },
  { offset: -1.5, ratio: 0.4 },
  { offset: -1, ratio: 0.6 },
  { offset: -0.5, ratio: 0.9 },
  { offset: 0, ratio: 1 },
] as const;

const AUTO_SLEEP_TITLE_RE = /^Sleep\s+\d+(?:\.\d+)?(\+?)\s*(hours?)$/i;
const AUTO_SLEEP_DESCRIPTION_RE = /^Full points at \d+(?:\.\d+)? hours?; partial points from \d+(?:\.\d+)? hours?$/i;
const AUTO_SLEEP_NOTE_RE = /^\s*\d+(?:\.\d+)?\s*h\s+sleep\s*$/i;

export function resolveSleepTarget(target?: number): number {
  if (typeof target !== 'number' || !Number.isFinite(target) || target <= 0) {
    return SLEEP_FULL_POINTS_HOURS;
  }
  const clamped = Math.min(MAX_SLEEP_TARGET_HOURS, Math.max(MIN_SLEEP_TARGET_HOURS, target));
  return Math.round(clamped * 4) / 4;
}

export function sleepMinimumRewardHours(target?: number): number {
  return Math.max(0, Math.round((resolveSleepTarget(target) - 2) * 4) / 4);
}

export function isSleepHabit(habit: Pick<Habit, 'id' | 'automation'>): boolean {
  return habit.automation?.metric === 'sleep' || habit.id.endsWith('-sleep');
}

export function getSleepTarget(habit: Pick<Habit, 'id' | 'automation'>): number {
  return resolveSleepTarget(habit.automation?.metric === 'sleep' ? habit.automation.target : undefined);
}

export function formatSleepHours(hours: number): string {
  return String(Number(hours.toFixed(2)));
}

export function formatSleepNote(hours: number): string {
  return `${formatSleepHours(hours)} h sleep`;
}

export function isAutoSleepNote(note?: string): boolean {
  return Boolean(note && AUTO_SLEEP_NOTE_RE.test(note));
}

export function sleepGoalDescription(target: number): string {
  const safeTarget = resolveSleepTarget(target);
  const minHours = sleepMinimumRewardHours(safeTarget);
  return `Full points at ${formatSleepHours(safeTarget)} hours; partial points from ${formatSleepHours(minHours)} hours`;
}

export function applySleepTarget(habit: Habit, target: number): Habit {
  const safeTarget = resolveSleepTarget(target);
  const titleMatch = habit.title.match(AUTO_SLEEP_TITLE_RE);
  const nextTitle = titleMatch
    ? `Sleep ${formatSleepHours(safeTarget)}${titleMatch[1]} ${titleMatch[2]}`
    : habit.title;
  const nextDescription = AUTO_SLEEP_DESCRIPTION_RE.test(habit.description)
    ? sleepGoalDescription(safeTarget)
    : habit.description;

  return {
    ...habit,
    title: nextTitle,
    description: nextDescription,
    automation: { metric: 'sleep', target: safeTarget },
  };
}

export function calculateSleepRewardRatio(hours: number, target = SLEEP_FULL_POINTS_HOURS): number {
  const fullHours = resolveSleepTarget(target);
  const minHours = fullHours - 2;
  if (!Number.isFinite(hours) || hours < minHours) return 0;
  if (hours >= fullHours) return 1;

  for (let i = 1; i < SLEEP_MILESTONE_OFFSETS.length; i++) {
    const lowerHours = fullHours + SLEEP_MILESTONE_OFFSETS[i - 1].offset;
    const upperHours = fullHours + SLEEP_MILESTONE_OFFSETS[i].offset;
    if (hours <= upperHours) {
      const lowerRatio = SLEEP_MILESTONE_OFFSETS[i - 1].ratio;
      const upperRatio = SLEEP_MILESTONE_OFFSETS[i].ratio;
      const fraction = (hours - lowerHours) / (upperHours - lowerHours);
      return lowerRatio + fraction * (upperRatio - lowerRatio);
    }
  }
  return 1;
}

export function calculateHealthPoints(habit: Habit, value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (isSleepHabit(habit)) {
    return Math.round(habit.points * calculateSleepRewardRatio(value, getSleepTarget(habit)));
  }
  if (!habit.automation) return 0;
  return value >= habit.automation.target ? habit.points : 0;
}

/** Recorded sleep replaces a manual reward once a reading is available. */
export function createSleepCheckIn(
  habit: Habit,
  date: string,
  hours: number,
  existing?: CheckIn,
  completedAt = new Date().toISOString(),
): CheckIn | null {
  if (!isSleepHabit(habit) || calculateSleepRewardRatio(hours, getSleepTarget(habit)) === 0) return null;
  return {
    ...existing,
    id: existing?.id || `health-${habit.id}-${date}`,
    habitId: habit.id,
    playerId: habit.playerId,
    date,
    pointsEarned: calculateHealthPoints(habit, hours),
    completedAt: existing?.completedAt || completedAt,
    source: 'google_health',
    healthValue: hours,
    note: formatSleepNote(hours),
  };
}

/** Creates or updates a manual sleep check-in (e.g. from the sleep slider) without locking it to Google Health. */
export function createManualSleepCheckIn(
  habit: Habit,
  date: string,
  hours: number,
  existing?: CheckIn,
  options?: { completedAt?: string; loggedAt?: string; today?: string; id?: string },
): CheckIn | null {
  if (!isSleepHabit(habit) || !Number.isFinite(hours) || hours <= 0) return null;
  if (calculateSleepRewardRatio(hours, getSleepTarget(habit)) === 0) return null;
  const roundedHours = Math.round(hours * 100) / 100;
  const nowIso = options?.loggedAt ?? new Date().toISOString();
  const isRetroactive = options?.today ? date !== options.today : existing?.isRetroactive;
  const preserveCustomNote = existing?.note && !isAutoSleepNote(existing.note);
  const completedAt = existing?.completedAt
    ?? options?.completedAt
    ?? (options?.today && date !== options.today ? `${date}T20:00:00.000Z` : nowIso);

  const next: CheckIn = {
    ...existing,
    id: existing?.id || options?.id || `c-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    habitId: habit.id,
    playerId: habit.playerId,
    date,
    pointsEarned: calculateHealthPoints(habit, roundedHours),
    completedAt,
    healthValue: roundedHours,
    note: preserveCustomNote ? existing.note : formatSleepNote(roundedHours),
    isRetroactive,
    loggedAt: existing?.loggedAt || nowIso,
  };
  delete next.source;
  return next;
}

export function reconcileSleepTelemetry(
  checkIns: CheckIn[],
  habit: Habit,
  telemetry: HealthTelemetryRecord,
): CheckIn[] {
  if (!isSleepHabit(habit) || telemetry.metric !== 'sleep' ||
      telemetry.habitId !== habit.id || telemetry.playerId !== habit.playerId ||
      !Number.isFinite(telemetry.value)) return checkIns;
  const existing = checkIns.find(entry => entry.habitId === habit.id && entry.date === telemetry.date);
  const next = createSleepCheckIn(habit, telemetry.date, telemetry.value, existing);
  if (existing) {
    return next
      ? checkIns.map(entry => entry.id === existing.id ? next : entry)
      : checkIns.filter(entry => entry.id !== existing.id);
  }
  return next ? [...checkIns, next] : checkIns;
}
