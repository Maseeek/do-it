import { performance } from 'node:perf_hooks';
import { getInitialState } from '../src/lib/seed';
import { addDays, getTodayDateString, getWeekKey } from '../src/lib/date-utils';
import { calculatePlayerScores } from '../src/lib/score-calculator';
import { rebalanceAllWeeklyCheckIns, rebalanceWeeklyHabitCheckIns } from '../src/lib/weekly-utils';
import type { CheckIn } from '../src/lib/types';

const state = getInitialState();
const today = getTodayDateString();
const checkIns: CheckIn[] = [];
for (let day = 0; day < 730; day++) {
  const date = addDays(today, -day);
  for (const habit of state.habits) {
    checkIns.push({
      id: `${habit.id}-${date}`,
      habitId: habit.id,
      playerId: habit.playerId,
      date,
      pointsEarned: habit.points,
      completedAt: `${date}T12:00:00Z`,
    });
  }
}

function bench(name: string, run: () => unknown) {
  run();
  const times: number[] = [];
  for (let sample = 0; sample < 5; sample++) {
    const start = performance.now();
    run();
    times.push(performance.now() - start);
  }
  times.sort((a, b) => a - b);
  console.log(JSON.stringify({ name, checkIns: checkIns.length, medianMs: +times[2].toFixed(2) }));
}

bench('both player summaries', () => {
  calculatePlayerScores('maciek', checkIns, state.habits);
  calculatePlayerScores('myrna', checkIns, state.habits);
});
bench('hydrate weekly rebalance', () => rebalanceAllWeeklyCheckIns(checkIns, state.habits));

const habit = state.habits.find(habit => habit.weeklyTargetDays);
if (!habit) throw new Error('The benchmark needs a weekly habit');
bench('weekly check-in diff', () => {
  const rebalanced = rebalanceWeeklyHabitCheckIns(checkIns, habit, getWeekKey(today));
  return rebalanced.filter((checkIn, index) => checkIns[index].pointsEarned !== checkIn.pointsEarned);
});
