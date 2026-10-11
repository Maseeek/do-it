import { CheckIn, Habit, HealthMetric, HealthTelemetryRecord } from './types';
import { calculateSleepRewardRatio, SLEEP_FULL_POINTS_HOURS } from './health-rewards';

export type HealthProgressTier = 'perfect' | 'almost' | 'halfway' | 'low' | 'critical';
export type HealthColorName = 'green' | 'lime' | 'yellow' | 'dark-orange' | 'red';

export interface HealthProgressDetails {
  metric: HealthMetric;
  value: number;
  target: number;
  ratio: number;
  percentage: number;
  barPercentage: number;
  unit: string;
  qualified: boolean;
  isLocked: boolean;
  tier: HealthProgressTier;
  colorName: HealthColorName;
  hexColor: string;
  label: string;
  formattedValue: string;
  formattedTarget: string;
  summaryText: string;
  lockReason: string;
  classes: {
    bg: string;
    border: string;
    text: string;
    bar: string;
    glow: string;
  };
}

export function formatHealthMetricValue(value: number, metric: HealthMetric): string {
  if (metric === 'sleep') {
    // Do not round a reading below a scoring cutoff up to that cutoff.
    return `${Math.floor(value * 100) / 100} hrs`;
  }
  if (metric === 'steps') {
    return `${Math.round(value).toLocaleString('en-GB')} steps`;
  }
  return `${Math.round(value)} min`;
}

export function parseHealthValueFromNote(note?: string, metric?: HealthMetric): number | null {
  if (!note) return null;
  if (metric === 'sleep') {
    const match = note.match(/([\d.]+)\s*(?:h|hr|hrs|hours)(?:\s+sleep)?/i);
    if (match) {
      const parsed = parseFloat(match[1]);
      return Number.isFinite(parsed) ? parsed : null;
    }
  }
  if (metric === 'steps') {
    const match = note.match(/([\d,]+)\s*steps/i);
    if (match) {
      const parsed = parseInt(match[1].replace(/,/g, ''), 10);
      return Number.isFinite(parsed) ? parsed : null;
    }
  }
  if (metric === 'workout' || metric === 'cardio') {
    const match = note.match(/([\d.]+)\s*min/i);
    if (match) {
      const parsed = parseFloat(match[1]);
      return Number.isFinite(parsed) ? parsed : null;
    }
  }
  return null;
}

export function calculateHealthProgress(
  value: number,
  target: number,
  metric: HealthMetric
): HealthProgressDetails {
  const safeTarget = metric === 'sleep' ? SLEEP_FULL_POINTS_HOURS : target > 0 ? target : 1;
  const ratio = metric === 'sleep' ? calculateSleepRewardRatio(value) : Math.max(0, value / safeTarget);
  // Sleep colors describe the measured hours, independently of the points curve.
  const colorRatio = metric === 'sleep'
    ? value >= 8.5 ? 1 : value >= 7.5 ? 0.75 : value >= 7 ? 0.5 : value >= 3 ? 0.3 : 0
    : ratio;
  const percentage = Math.round(ratio * 100);
  const barPercentage = Math.min(100, Math.max(0, percentage));
  const qualified = ratio >= 1.0;
  const isLocked = !qualified;

  let tier: HealthProgressTier;
  let colorName: HealthColorName;
  let hexColor: string;
  let label: string;
  let classes: HealthProgressDetails['classes'];

  if (colorRatio >= 1.0) {
    tier = 'perfect';
    colorName = 'green';
    hexColor = '#10b981';
    label = 'Goal Met';
    classes = {
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/30',
      text: 'text-emerald-400',
      bar: 'bg-emerald-500',
      glow: 'shadow-[0_0_10px_rgba(16,185,129,0.35)]',
    };
  } else if (colorRatio >= 0.75) {
    tier = 'almost';
    colorName = 'lime';
    hexColor = '#84cc16';
    label = 'Almost There';
    classes = {
      bg: 'bg-lime-500/10',
      border: 'border-lime-500/30',
      text: 'text-lime-400',
      bar: 'bg-lime-500',
      glow: 'shadow-[0_0_10px_rgba(132,204,22,0.35)]',
    };
  } else if (colorRatio >= 0.5) {
    tier = 'halfway';
    colorName = 'yellow';
    hexColor = '#eab308';
    label = 'Halfway';
    classes = {
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/30',
      text: 'text-amber-400',
      bar: 'bg-amber-500',
      glow: 'shadow-[0_0_10px_rgba(245,158,11,0.35)]',
    };
  } else if (colorRatio >= 0.3) {
    tier = 'low';
    colorName = 'dark-orange';
    hexColor = '#ea580c';
    label = 'Far Below Goal';
    classes = {
      bg: 'bg-orange-600/15',
      border: 'border-orange-600/50',
      text: 'text-orange-400',
      bar: 'bg-orange-600',
      glow: 'shadow-[0_0_10px_rgba(234,88,12,0.4)]',
    };
  } else {
    tier = 'critical';
    colorName = 'red';
    hexColor = '#ef4444';
    label = 'Goal Not Met';
    classes = {
      bg: 'bg-red-600/15',
      border: 'border-red-600/50',
      text: 'text-red-400',
      bar: 'bg-red-600',
      glow: 'shadow-[0_0_10px_rgba(239,68,68,0.4)]',
    };
  }

  const formattedValue = formatHealthMetricValue(value, metric);
  if (metric === 'sleep') label = qualified ? 'Full points' : ratio > 0 ? 'Partial points' : 'No points';
  const formattedTarget = formatHealthMetricValue(safeTarget, metric);
  const summaryText = `${formattedValue} / ${formattedTarget} (${percentage}%${metric === 'sleep' ? ' of points' : ''})`;
  const lockReason = metric === 'sleep'
    ? `Google Health recorded ${formattedValue}, earning ${percentage}% of this habit's points. Recorded sleep determines your reward; manual check-in cannot change it.`
    : `Google Health recorded ${formattedValue} (goal: ${formattedTarget}). You cannot check off this habit because your recorded health data did not reach the daily target.`;

  return {
    metric,
    value,
    target: safeTarget,
    ratio,
    percentage,
    barPercentage,
    unit: metric === 'sleep' ? 'hrs' : metric === 'steps' ? 'steps' : 'min',
    qualified,
    isLocked,
    tier,
    colorName,
    hexColor,
    label,
    formattedValue,
    formattedTarget,
    summaryText,
    lockReason,
    classes,
  };
}

/**
 * Returns health progress details for a habit.
 * If NO health data has been recorded for this habit on this date (e.g. user did not wear watch to sleep),
 * this returns null so the UI leaves it blank and allows manual check-in.
 */
export function getHealthProgressDetails(
  habit: Habit,
  telemetry: HealthTelemetryRecord | undefined,
  checkIn?: CheckIn
): HealthProgressDetails | null {
  if (!habit.automation) return null;
  const metric = habit.automation.metric;
  const target = habit.automation.target;

  // 1. Explicit telemetry record from sync or simulation
  if (telemetry && Number.isFinite(telemetry.value)) {
    return calculateHealthProgress(telemetry.value, target, metric);
  }

  // 2. Existing check-in imported from Google Health
  if (checkIn && checkIn.source === 'google_health') {
    const value =
      checkIn.healthValue ??
      parseHealthValueFromNote(checkIn.note, metric);
    return value !== null && Number.isFinite(value) ? calculateHealthProgress(value, target, metric) : null;
  }

  // 3. No health data recorded (e.g. watch was not worn to sleep)
  // Return null to leave completely blank and allow manual check-in!
  return null;
}
