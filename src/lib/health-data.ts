import type { HealthMetric } from './types';

export type HealthDataPoint = {
  sleep?: { summary?: { minutesAsleep?: string }; interval?: { startTime?: string; endTime?: string }; stages?: Array<{ type?: string; startTime?: string; endTime?: string }> };
  exercise?: { interval?: { startTime?: string; endTime?: string }; exerciseType?: string; displayName?: string; activeDuration?: string };
};

export function sleepHours(points: HealthDataPoint[]) {
  return points.reduce((sum, point) => {
    const sleep = point.sleep;
    if (!sleep) return sum;
    const reported = Number(sleep.summary?.minutesAsleep);
    if (Number.isFinite(reported) && reported >= 0 && sleep.summary?.minutesAsleep !== undefined) return sum + reported;
    const stages = sleep.stages?.filter(stage => stage.type !== 'AWAKE') || [];
    if (stages.length) return sum + stages.reduce((minutes, stage) => minutes + Math.max(0, (Date.parse(stage.endTime || '') - Date.parse(stage.startTime || '')) / 60000 || 0), 0);
    // Time in bed is not evidence of time asleep.
    return sum;
  }, 0) / 60;
}

export function workouts(points: HealthDataPoint[]) {
  return points.flatMap(point => {
    const value = point.exercise;
    if (!value) return [];
    const minutes = value.activeDuration ? Number.parseFloat(value.activeDuration) / 60 : (Date.parse(value.interval?.endTime || '') - Date.parse(value.interval?.startTime || '')) / 60000;
    if (!Number.isFinite(minutes) || minutes <= 0) return [];
    const type = (value.exerciseType || '').toUpperCase();
    const metric: HealthMetric | null = /STRENGTH|WEIGHT|LIFT|GYM/.test(type) ? 'workout' : /RUN|BIK|CYCL|AEROBIC|SWIM|ROW|CARDIO|WALK|HIIT|ELLIPTICAL/.test(type) ? 'cardio' : null;
    return metric ? [{ metric, minutes, label: value.displayName || type.replaceAll('_', ' ').toLowerCase() }] : [];
  });
}
