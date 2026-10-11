import { CheckIn, Habit, HealthMetric, HealthTelemetryRecord } from './types';

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
    return `${Number(value.toFixed(1))} hrs`;
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
  const safeTarget = target > 0 ? target : 1;
  const ratio = Math.max(0, value / safeTarget);
  const percentage = Math.round(ratio * 100);
  const barPercentage = Math.min(100, Math.max(0, percentage));
  const qualified = ratio >= 1.0;
  const isLocked = !qualified;

  let tier: HealthProgressTier;
  let colorName: HealthColorName;
  let hexColor: string;
  let label: string;
  let classes: HealthProgressDetails['classes'];

  if (ratio >= 1.0) {
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
  } else if (ratio >= 0.75) {
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
  } else if (ratio >= 0.5) {
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
  } else if (ratio >= 0.3) {
    // e.g. 3 hours sleep out of 8 hours (37.5%) -> dark orange
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
    // e.g. 0 to 2 hours sleep out of 8 hours (<= 25%) -> red ("horrible")
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
  const formattedTarget = formatHealthMetricValue(target, metric);
  const summaryText = `${formattedValue} / ${formattedTarget} (${percentage}%)`;
  const lockReason = `Google Health recorded ${formattedValue} (goal: ${formattedTarget}). You cannot check off this habit because your recorded health data did not reach the daily target.`;

  return {
    metric,
    value,
    target,
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
      parseHealthValueFromNote(checkIn.note, metric) ??
      target;
    return calculateHealthProgress(value, target, metric);
  }

  // 3. No health data recorded (e.g. watch was not worn to sleep)
  // Return null to leave completely blank and allow manual check-in!
  return null;
}
