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

  const updatedMap = new Map<string, CheckIn>();
  collectRebalancedCheckIns(weekLogs, habit, updatedMap);
  if (updatedMap.size === 0) return checkIns;
  return checkIns.map((c) => updatedMap.get(c.id) || c);
}

function collectRebalancedCheckIns(
  weekLogs: CheckIn[],
  habit: Habit,
  updatedMap: Map<string, CheckIn>
) {
  // Sort chronologically by date ascending, then completedAt / loggedAt / id
  const sorted = [...weekLogs].sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    const timeA = a.completedAt || a.loggedAt || a.id;
    const timeB = b.completedAt || b.loggedAt || b.id;
    return timeA.localeCompare(timeB);
  });

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
}

/**
 * Rebalances all check-ins across all weekly habits and all calendar weeks.
 */
export function rebalanceAllWeeklyCheckIns(
  checkIns: CheckIn[],
  habits: Habit[]
): CheckIn[] {
  const weeklyHabits = new Map(habits
    .filter(habit => habit.weeklyTargetDays && habit.weeklyTargetDays > 0)
    .map(habit => [habit.id, habit]));
  if (weeklyHabits.size === 0) return checkIns;

  const groups = new Map<string, Map<string, CheckIn[]>>();
  const weekKeys = new Map<string, string>();
  for (const checkIn of checkIns) {
    if (!weeklyHabits.has(checkIn.habitId)) continue;
    let weekKey = weekKeys.get(checkIn.date);
    if (!weekKey) {
      weekKey = getWeekKey(checkIn.date);
      weekKeys.set(checkIn.date, weekKey);
    }
    let habitWeeks = groups.get(checkIn.habitId);
    if (!habitWeeks) {
      habitWeeks = new Map();
      groups.set(checkIn.habitId, habitWeeks);
    }
    const logs = habitWeeks.get(weekKey);
    if (logs) logs.push(checkIn);
    else habitWeeks.set(weekKey, [checkIn]);
  }

  const updatedMap = new Map<string, CheckIn>();
  for (const [habitId, weeks] of groups) {
    const habit = weeklyHabits.get(habitId)!;
    for (const logs of weeks.values()) collectRebalancedCheckIns(logs, habit, updatedMap);
  }
  return updatedMap.size === 0 ? checkIns : checkIns.map(c => updatedMap.get(c.id) || c);
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
