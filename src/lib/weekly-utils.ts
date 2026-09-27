import { CheckIn, Habit } from './types';
import { getWeekKey } from './date-utils';

/**
 * Rebalances a habit's check-ins for a given calendar week so that only the first
 * `habit.weeklyTargetDays` check-ins earn points, and any additional check-ins earn 0 points.
 */
export function rebalanceWeeklyHabitCheckIns(
  checkIns: CheckIn[],
  habit: Habit,
  weekKey: string
): CheckIn[] {
  if (!habit.weeklyTargetDays || habit.weeklyTargetDays <= 0) return checkIns;

  // Filter check-ins for this habit in this calendar week
  const weekLogs = checkIns.filter(
    (c) => c.habitId === habit.id && getWeekKey(c.date) === weekKey
  );
  if (weekLogs.length === 0) return checkIns;

  // Sort chronologically by date ascending, then completedAt / loggedAt / id
  const sorted = [...weekLogs].sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    const timeA = a.completedAt || a.loggedAt || a.id;
    const timeB = b.completedAt || b.loggedAt || b.id;
    return timeA.localeCompare(timeB);
  });

  const updatedMap = new Map<string, CheckIn>();
  sorted.forEach((log, index) => {
    const isEligibleForPoints = index < habit.weeklyTargetDays!;
    let targetPoints = 0;
    if (isEligibleForPoints) {
      if (habit.isQuantitative && log.quantity !== undefined) {
        targetPoints = Math.min(
          habit.points,
          Math.max(1, Math.round(log.quantity * (habit.pointsPerUnit || 1)))
        );
      } else {
        targetPoints = habit.points;
      }
    } else {
      targetPoints = 0; // Extra sessions beyond weekly target earn 0 points
    }

    if (log.pointsEarned !== targetPoints) {
      updatedMap.set(log.id, { ...log, pointsEarned: targetPoints });
    }
  });

  if (updatedMap.size === 0) return checkIns;
  return checkIns.map((c) => updatedMap.get(c.id) || c);
}

/**
 * Rebalances all check-ins across all weekly habits and all calendar weeks.
 */
export function rebalanceAllWeeklyCheckIns(
  checkIns: CheckIn[],
  habits: Habit[]
): CheckIn[] {
  let result = checkIns;
  habits.forEach((habit) => {
    if (habit.weeklyTargetDays && habit.weeklyTargetDays > 0) {
      const weekKeys = new Set(
        result
          .filter((c) => c.habitId === habit.id)
          .map((c) => getWeekKey(c.date))
      );
      weekKeys.forEach((wk) => {
        result = rebalanceWeeklyHabitCheckIns(result, habit, wk);
      });
    }
  });
  return result;
}

/**
 * Counts unique check-in dates for a habit in the calendar week of `dateStr`.
 */
export function getWeeklyHabitCompletionsCount(
  habitId: string,
  dateStr: string,
  checkIns: CheckIn[]
): number {
  const targetWeekKey = getWeekKey(dateStr);
  const distinctDates = new Set(
    checkIns
      .filter((c) => c.habitId === habitId && getWeekKey(c.date) === targetWeekKey)
      .map((c) => c.date)
  );
  return distinctDates.size;
}

/**
 * Returns true if a weekly habit has reached or exceeded its weekly target for the calendar week of `dateStr`.
 */
export function isWeeklyHabitTargetMet(
  habit: Habit,
  dateStr: string,
  checkIns: CheckIn[]
): boolean {
  if (!habit.weeklyTargetDays || habit.weeklyTargetDays <= 0) return false;
  return getWeeklyHabitCompletionsCount(habit.id, dateStr, checkIns) >= habit.weeklyTargetDays;
}
