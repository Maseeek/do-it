import type { Habit, HabitCategory, PlayerId } from './types';

export const HABIT_SECTIONS: { title: string; categories: HabitCategory[] }[] = [
  { title: 'Health', categories: ['foundation', 'physical', 'cardio', 'nutrition'] },
  { title: 'Education', categories: ['intellect', 'language'] },
  { title: 'Studying', categories: ['skills', 'deep_work'] },
  { title: 'Self-improvement', categories: ['mind', 'environment'] },
  { title: 'Finance', categories: ['finance'] },
];

const CATALOG: Omit<Habit, 'id' | 'playerId' | 'order' | 'isActive'>[] = [
  { title: 'Consistent bedtime', description: 'Follow a sleep schedule', category: 'foundation', points: 25, iconName: 'Moon' },
  { title: 'Move your body', description: 'Walk, cycle, dance or stretch', category: 'physical', points: 20, iconName: 'Activity' },
  { title: 'Workout', description: 'Complete a planned workout', category: 'physical', points: 35, iconName: 'Dumbbell', frequency: 'weekly', weeklyTargetDays: 3 },
  { title: 'Cardio session', description: 'Raise your heart rate on purpose', category: 'cardio', points: 30, iconName: 'Heart', frequency: 'weekly', weeklyTargetDays: 3 },
  { title: 'Eat a balanced meal', description: 'Make one nourishing choice', category: 'nutrition', points: 15, iconName: 'Apple' },
  { title: 'Read for learning', description: 'Read a book or long-form article', category: 'intellect', points: 20, iconName: 'BookOpen' },
  { title: 'Take a lesson', description: 'Complete a structured lesson', category: 'intellect', points: 20, iconName: 'BookOpen' },
  { title: 'Practise a language', description: 'Listen, speak or write', category: 'language', points: 15, iconName: 'Globe' },
  { title: 'Review notes', description: 'Revisit and recall what you learned', category: 'skills', points: 15, iconName: 'BookOpen' },
  { title: 'Focused study block', description: 'Study without distractions', category: 'deep_work', points: 30, iconName: 'Target' },
  { title: 'Practice a skill', description: 'Deliberate practice with feedback', category: 'skills', points: 25, iconName: 'Target' },
  { title: 'Make progress on a project', description: 'Finish a meaningful work block', category: 'deep_work', points: 30, iconName: 'Briefcase' },
  { title: 'Pause and reflect', description: 'Journal, meditate or pray', category: 'mind', points: 15, iconName: 'Sparkles' },
  { title: 'Tidy one space', description: 'Reset a room or work area', category: 'environment', points: 15, iconName: 'CheckCircle2' },
  { title: 'Plan tomorrow', description: 'Choose tomorrow’s priorities', category: 'mind', points: 10, iconName: 'Target' },
  { title: 'Track spending', description: 'Review and record today’s spending', category: 'finance', points: 10, iconName: 'Briefcase' },
  { title: 'Save or invest', description: 'Make a planned contribution to a financial goal', category: 'finance', points: 25, iconName: 'Briefcase', frequency: 'weekly', weeklyTargetDays: 1 },
  { title: 'Learn about money', description: 'Read or complete a personal finance lesson', category: 'finance', points: 20, iconName: 'BookOpen', frequency: 'weekly', weeklyTargetDays: 2 },
];

export function catalogHabits(playerId: PlayerId): Habit[] {
  return CATALOG.map((habit, index) => ({ ...habit, id: `catalog-${playerId}-${index}`, playerId, order: index + 1, isActive: false }));
}

export function weeklySessions(habit: Habit): number {
  return habit.frequency === 'weekly' || habit.weeklyTargetDays
    ? Math.min(7, Math.max(1, habit.weeklyTargetDays || 1))
    : 7;
}

export function maximumHabitPoints(habit: Habit): number {
  return Math.min(100, habit.isQuantitative ? (habit.maxQuantity || 25) * (habit.pointsPerUnit || 1) : 100);
}

export function weeklyPointPotential(habits: Habit[]): number {
  return habits.filter(habit => habit.isActive).reduce((sum, habit) => sum + habit.points * weeklySessions(habit), 0);
}

export function balanceHabitPlan(habits: Habit[], target: number): Habit[] | null {
  const active = habits.filter(habit => habit.isActive);
  if (!active.length || !Number.isInteger(target) || target <= 0) return null;
  const minimums = active.map(habit => 5 * weeklySessions(habit));
  const maximums = active.map(habit => maximumHabitPoints(habit) * weeklySessions(habit));
  if (target < minimums.reduce((a, b) => a + b, 0) || target > maximums.reduce((a, b) => a + b, 0)) return null;
  type Candidate = { cost: number; weights: number[] };
  let reachable = new Map<number, Candidate>([[0, { cost: 0, weights: [] }]]);
  active.forEach((habit, index) => {
    const next = new Map<number, Candidate>();
    const remainingMin = minimums.slice(index + 1).reduce((a, b) => a + b, 0);
    const remainingMax = maximums.slice(index + 1).reduce((a, b) => a + b, 0);
    for (const [sum, candidate] of reachable) {
      for (let points = 5; points <= maximumHabitPoints(habit); points++) {
        const nextSum = sum + points * weeklySessions(habit);
        if (nextSum + remainingMin > target || nextSum + remainingMax < target) continue;
        const cost = candidate.cost + Math.abs(points - habit.points);
        if (!next.has(nextSum) || cost < next.get(nextSum)!.cost) next.set(nextSum, { cost, weights: [...candidate.weights, points] });
      }
    }
    reachable = next;
  });
  const weights = reachable.get(target)?.weights;
  if (!weights) return null;
  let index = 0;
  return habits.map(habit => habit.isActive ? { ...habit, points: weights[index++] } : habit);
}
