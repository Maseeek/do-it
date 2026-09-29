import { CheckIn, Habit, PlayerId } from './types';

export function prepareQuickCheckIn(habitId: string, player: PlayerId, habits: Habit[], checkIns: CheckIn[], date: string) {
  const habit = habits.find((item) => item.id === habitId && item.isActive);
  if (!habit) return { message: 'This habit is no longer available.' };
  if (habit.playerId !== player) return { message: `Switch to ${habit.playerId === 'maciek' ? 'Maciek' : 'Myrna'} to check in this habit.` };
  if (checkIns.some((item) => item.habitId === habitId && item.date === date)) return { message: `${habit.title} is already checked in today.` };
  if (habit.requiresProof || habit.isQuantitative) return { message: `Open ${habit.title} to add ${habit.requiresProof ? 'proof' : 'your quantity'}.` };
  return { habit, message: `Checked in: ${habit.title}` };
}
