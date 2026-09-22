'use client';

import React from 'react';
import { useStore } from '@/lib/store';
import { HabitCard } from './HabitCard';
import { CheckCircle2, Sparkles, Trophy } from 'lucide-react';

export function TodayView() {
  const { activeHabits, activePlayerSummary, isHabitCompletedToday, activePlayer } = useStore();

  const totalPossible = 240;
  const completedCount = activeHabits.filter((h) => isHabitCompletedToday(h.id)).length;
  const totalCount = activeHabits.length;
  const allDone = completedCount === totalCount && totalCount > 0;

  // Separate uncompleted and completed habits for crisp daily focus
  const pendingHabits = activeHabits.filter((h) => !isHabitCompletedToday(h.id));
  const doneHabits = activeHabits.filter((h) => isHabitCompletedToday(h.id));

  const isMaciek = activePlayer?.id === 'maciek';

  return (
    <div className="space-y-4 pb-24">
      {/* Daily Progress Overview Card */}
      <div className="rounded-2xl bg-gradient-to-b from-[#12141a] to-[#0c0d10] border border-zinc-800/80 p-5 shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <div>
            <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400">
              Daily Target
            </span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-3xl font-bold font-mono tracking-tight text-white">
                {activePlayerSummary.today}
              </span>
              <span className="text-sm font-mono text-zinc-400">/ {totalPossible} pts</span>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400">
              Habits Done
            </span>
            <div className="text-sm font-semibold text-white mt-0.5">
              {completedCount} of {totalCount}
            </div>
          </div>
        </div>

        {/* Linear progress track */}
        <div className="w-full h-1.5 rounded-full bg-zinc-800/80 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              isMaciek
                ? 'bg-gradient-to-r from-blue-500 to-indigo-400'
                : 'bg-gradient-to-r from-pink-500 to-rose-400'
            }`}
            style={{ width: `${Math.min(100, (activePlayerSummary.today / totalPossible) * 100)}%` }}
          />
        </div>

        {allDone ? (
          <div className="mt-3.5 flex items-center justify-center gap-1.5 text-xs font-medium text-emerald-400 bg-emerald-500/10 py-1.5 px-3 rounded-lg border border-emerald-500/20">
            <Trophy className="w-3.5 h-3.5" />
            Daily Par Complete! All habits checked in today.
          </div>
        ) : (
          <div className="mt-3 flex items-center justify-between text-[11px] text-zinc-400 font-mono">
            <span>{Math.max(0, totalPossible - activePlayerSummary.today)} pts to daily par</span>
            <span>{Math.round((activePlayerSummary.today / totalPossible) * 100)}%</span>
          </div>
        )}
      </div>

      {/* Habits to Complete */}
      {pendingHabits.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1 pt-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 font-mono">
              Incomplete ({pendingHabits.length})
            </span>
          </div>
          <div className="space-y-2">
            {pendingHabits.map((habit) => (
              <HabitCard key={habit.id} habit={habit} />
            ))}
          </div>
        </div>
      )}

      {/* Completed Habits */}
      {doneHabits.length > 0 && (
        <div className="space-y-2 pt-2">
          <div className="flex items-center gap-1.5 px-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-zinc-500" />
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 font-mono">
              Completed Today ({doneHabits.length})
            </span>
          </div>
          <div className="space-y-2">
            {doneHabits.map((habit) => (
              <HabitCard key={habit.id} habit={habit} />
            ))}
          </div>
        </div>
      )}

      {activeHabits.length === 0 && (
        <div className="rounded-2xl border border-zinc-800 bg-[#0e1013] p-8 text-center text-zinc-400">
          <Sparkles className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
          <p className="text-sm font-medium text-white">No habits configured yet</p>
          <p className="text-xs text-zinc-500 mt-1">Visit Vault to configure your daily habits.</p>
        </div>
      )}
    </div>
  );
}
