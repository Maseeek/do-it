import type { Habit, HabitCategory } from './types';
import { applySleepTarget, getSleepTarget, isSleepHabit, resolveSleepTarget } from './health-rewards';

export const HABIT_ICON_NAMES = [
  'Activity', 'Moon', 'Sun', 'Dumbbell', 'Heart', 'Footprints', 'Flame', 'Zap', 'Apple', 'Coffee',
  'BookOpen', 'Globe', 'Code', 'Briefcase', 'Target', 'Sparkles', 'CheckCircle2',
] as const;

export const HABIT_TITLE_MAX = 70;
export const HABIT_DESCRIPTION_MAX = 140;

export interface HabitDetails {
  title: string;
  description: string;
  category: HabitCategory;
  iconName: string;
  requiresProof: boolean;
  sleepTarget?: number;
}

export function habitDetails(habit: Habit): HabitDetails {
  return {
    title: habit.title,
    description: habit.description,
    category: habit.category,
    iconName: habit.iconName,
    requiresProof: Boolean(habit.requiresProof),
    ...(isSleepHabit(habit) ? { sleepTarget: getSleepTarget(habit) } : {}),
  };
}

/**
 * Applies descriptive edits to a habit while keeping its id, points and schedule,
 * so existing check-ins and the duel's point parity are untouched.
 */
export function applyHabitDetails(habit: Habit, details: HabitDetails): Habit {
  const title = details.title.trim();
  const description = details.description.trim();
  if (!title) throw new Error('Give your habit a name.');
  if (title.length > HABIT_TITLE_MAX) throw new Error(`Name must be ${HABIT_TITLE_MAX} characters or fewer.`);
  if (description.length > HABIT_DESCRIPTION_MAX) throw new Error(`Description must be ${HABIT_DESCRIPTION_MAX} characters or fewer.`);
  const iconName = (HABIT_ICON_NAMES as readonly string[]).includes(details.iconName) ? details.iconName : habit.iconName;
  let updated: Habit = { ...habit, title, description, category: details.category, iconName, requiresProof: details.requiresProof };
  if (isSleepHabit(habit) && details.sleepTarget !== undefined) {
    const nextTarget = resolveSleepTarget(details.sleepTarget);
    const titleUnchanged = title === habit.title.trim();
    const descriptionUnchanged = description === habit.description.trim();
    if (nextTarget !== getSleepTarget(habit) && (titleUnchanged || descriptionUnchanged)) {
      const withTarget = applySleepTarget(updated, nextTarget);
      updated = {
        ...withTarget,
        title: titleUnchanged ? withTarget.title : title,
        description: descriptionUnchanged ? withTarget.description : description,
      };
    } else {
      updated = { ...updated, automation: { metric: 'sleep', target: nextTarget } };
    }
  }
  return updated;
}

export function habitDetailsChanged(habit: Habit, details: HabitDetails): boolean {
  const current = habitDetails(habit);
  return current.title !== details.title.trim()
    || current.description !== details.description.trim()
    || current.category !== details.category
    || current.iconName !== details.iconName
    || current.requiresProof !== details.requiresProof
    || (isSleepHabit(habit) && details.sleepTarget !== undefined && current.sleepTarget !== resolveSleepTarget(details.sleepTarget));
}
