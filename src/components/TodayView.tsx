'use client';

import { useEffect, useRef } from 'react';
import { BedDouble, CheckCircle2, Plus } from 'lucide-react';
import { useStore } from '@/lib/store';
import { useMultiplayer } from '@/lib/multiplayer';
import { formatFriendlyDate, getTodayDateString } from '@/lib/date-utils';
import { soundEngine } from '@/lib/sound-utils';
import { hapticCelebration } from '@/lib/haptic-utils';
import { fireCelebrationConfetti } from '@/lib/confetti';
import { HabitCard } from './HabitCard';
import { DateNavigator } from './DateNavigator';

export function TodayView({ onOpenHabits }: { onOpenHabits: () => void }) {
  const multiplayer = useMultiplayer();
  const {
    activeHabits, isHabitSatisfiedOnDate, selectedDate, checkIns, activePlayer,
    isRestDay,
  } = useStore();
  const points = checkIns
    .filter((checkIn) => checkIn.playerId === activePlayer?.id && checkIn.date === selectedDate)
    .reduce((sum, checkIn) => sum + checkIn.pointsEarned, 0);
  const par = multiplayer.configured ? activeHabits.reduce((sum, habit) => sum + habit.points, 0) : 240;
  const pending = activeHabits.filter((habit) => !isHabitSatisfiedOnDate(habit.id, selectedDate));
  const done = activeHabits.filter((habit) => isHabitSatisfiedOnDate(habit.id, selectedDate));
  const allDone = activeHabits.length > 0 && pending.length === 0;
  const progress = par > 0 ? Math.min(100, Math.round((points / par) * 100)) : 0;
  const isRest = isRestDay(selectedDate);
  const context = `${activePlayer?.id}:${selectedDate}`;
  const previous = useRef({ context, points, allDone });

  useEffect(() => {
    if (previous.current.context === context && ((points >= par && previous.current.points < par) || (allDone && !previous.current.allDone))) {
      soundEngine.playFanfare();
      fireCelebrationConfetti();
      hapticCelebration();
    }
    previous.current = { context, points, allDone };
  }, [context, points, allDone, par]);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-end justify-between gap-4"><h1 className="text-3xl font-semibold tracking-tight">{selectedDate === getTodayDateString() ? 'Today' : formatFriendlyDate(selectedDate)}</h1><span className="text-xs tabular-nums text-zinc-500">{done.length}/{activeHabits.length}</span></div>
      <div className="space-y-2" aria-label="Today progress">
        <div className="flex items-center justify-between text-xs text-zinc-500">
          <span>{done.length} of {activeHabits.length} habits</span>
          <span className="tabular-nums">{points} / {par} pts</span>
        </div>
        <div
          role="progressbar"
          aria-label={`Today's progress: ${points} of ${par} points`}
          aria-valuenow={points}
          aria-valuemin={0}
          aria-valuemax={Math.max(1, par)}
          className="h-2 overflow-hidden rounded-full bg-white/[0.08]"
        >
          <div
            className={`h-full rounded-full transition-[width] duration-500 ${progress >= 100 ? 'bg-emerald-400' : 'bg-white/80'}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
      <div className="space-y-5">

          {isRest && (
            <div className="flex items-center gap-2.5 text-xs text-indigo-300">
              <BedDouble size={16} /> Rest day · Your streak is protected
            </div>
          )}

          {activeHabits.length > 0 ? (
            <>
              <section aria-labelledby="pending-heading">
                <h2 id="pending-heading" className="mb-3 text-sm font-semibold text-zinc-200">To do</h2>
                {pending.length > 0 ? (
                  <div className="space-y-2">{pending.map((habit) => <HabitCard key={`${context}:${habit.id}`} habit={habit} />)}</div>
                ) : (
                  <div className="flex items-center gap-2.5 rounded-2xl border border-emerald-400/15 bg-emerald-400/[0.05] px-4 py-4 text-sm text-emerald-300">
                    <CheckCircle2 size={18} /> All done for the day.
                  </div>
                )}
              </section>

              {done.length > 0 && (
                <details><summary className="min-h-11 flex cursor-pointer items-center text-xs font-medium text-zinc-400">Completed · {done.length}</summary><div className="space-y-2">{done.map((habit) => <HabitCard key={`${context}:${habit.id}`} habit={habit} />)}</div></details>
              )}
            </>
          ) : (
            <div className="rounded-2xl border border-white/[0.08] bg-[#141518] px-5 py-7">
              <h2 className="text-sm font-semibold">Start with one habit.</h2>
              <p className="mt-1 text-xs text-zinc-400">Add something you want to do today.</p>
              <button onClick={onOpenHabits} className="control control-primary mt-5"><Plus size={15} /> Add a habit</button>
            </div>
          )}

          <details><summary className="min-h-11 cursor-pointer text-xs text-zinc-500">Choose another day</summary><DateNavigator /></details>
      </div>
    </div>
  );
}
