import type { CheckIn, Habit, HealthTelemetryRecord } from './types';

export const SLEEP_FULL_POINTS_HOURS = 8.5;
const sleepMilestones = [
  { hours: 6.5, ratio: 0.2 },
  { hours: 7, ratio: 0.4 },
  { hours: 7.5, ratio: 0.6 },
  { hours: 8, ratio: 0.9 },
  { hours: SLEEP_FULL_POINTS_HOURS, ratio: 1 },
];

export function calculateSleepRewardRatio(hours: number): number {
  if (!Number.isFinite(hours) || hours < 6.5) return 0;
  if (hours >= SLEEP_FULL_POINTS_HOURS) return 1;

  for (let i = 1; i < sleepMilestones.length; i++) {
    const lower = sleepMilestones[i - 1];
    const upper = sleepMilestones[i];
    if (hours <= upper.hours) {
      const fraction = (hours - lower.hours) / (upper.hours - lower.hours);
      return lower.ratio + fraction * (upper.ratio - lower.ratio);
    }
  }
  return 1;
}

export function calculateHealthPoints(habit: Habit, value: number): number {
  if (!habit.automation || !Number.isFinite(value)) return 0;
  const ratio = habit.automation.metric === 'sleep'
    ? calculateSleepRewardRatio(value)
    : value >= habit.automation.target ? 1 : 0;
  return Math.round(habit.points * ratio);
}

/** Recorded sleep replaces a manual reward once a reading is available. */
export function createSleepCheckIn(
  habit: Habit,
  date: string,
  hours: number,
  existing?: CheckIn,
  completedAt = new Date().toISOString(),
): CheckIn | null {
  if (habit.automation?.metric !== 'sleep' || calculateSleepRewardRatio(hours) === 0) return null;
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
    note: `${Number(hours.toFixed(2))} h sleep`,
  };
}

export function reconcileSleepTelemetry(
  checkIns: CheckIn[],
  habit: Habit,
  telemetry: HealthTelemetryRecord,
): CheckIn[] {
  if (habit.automation?.metric !== 'sleep' || telemetry.metric !== 'sleep' ||
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
