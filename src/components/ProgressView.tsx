'use client';

import { useState } from 'react';
import { Pencil, ChevronRight, Flame, TrendingUp } from 'lucide-react';
import { useStore } from '@/lib/store';
import { soundEngine } from '@/lib/sound-utils';
import { hapticLight } from '@/lib/haptic-utils';
import { HabitOnboarding } from './HabitOnboarding';
import { HabitIcon } from './HabitIcon';
import { HabitHeatmap } from './HabitHeatmap';

export function ProgressView({
  openPlanner = false,
  onOpenDateInToday,
}: {
  openPlanner?: boolean;
  onOpenDateInToday?: (dateStr: string) => void;
}) {
  const { activePlayerId, activeHabits, activePlayerSummary, checkIns, updateHabit } = useStore();
  const [planner, setPlanner] = useState(openPlanner);
  const [selectedHabitId, setSelectedHabitId] = useState<string | null>(null);

  if (planner) return <HabitOnboarding onDone={() => setPlanner(false)} />;
  const isMaciek = (activePlayerId || 'maciek') === 'maciek';

  return (
    <div className="w-full space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold tracking-tight">Progress</h1>
        <button className="control min-h-11" onClick={() => setPlanner(true)}>
          <Pencil size={15} />
          Edit plan
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-purple-500/25 bg-[#0e1013] p-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">
              Day streak
            </span>
            <Flame className="w-3.5 h-3.5 text-purple-400" />
          </div>
          <div className="mt-1 text-2xl font-bold font-mono tabular-nums text-purple-300">
            {activePlayerSummary.currentStreak}
          </div>
        </div>

        <div className="rounded-xl border border-red-500/25 bg-[#0e1013] p-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">
              This week
            </span>
            <TrendingUp className="w-3.5 h-3.5 text-red-400" />
          </div>
          <div className="mt-1 text-2xl font-bold font-mono tabular-nums text-red-300">
            {activePlayerSummary.completionRateWeekly}%
          </div>
        </div>
      </div>

      <HabitHeatmap
        selectedHabitId={selectedHabitId}
        onSelectHabitId={setSelectedHabitId}
        onOpenDateInToday={onOpenDateInToday}
      />

      <section>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-xs font-mono font-semibold uppercase tracking-wider text-zinc-300">
              Your habits
            </h2>
            <p className="text-[11px] font-mono text-zinc-500">
              Tap a habit to filter its contribution calendar above
            </p>
          </div>
          <button
            onClick={() => setPlanner(true)}
            className="flex min-h-11 items-center gap-1 text-xs font-mono text-zinc-400 hover:text-white"
          >
            Manage <ChevronRight size={14} />
          </button>
        </div>
        <div className="space-y-2">
          {activeHabits.map((habit) => {
            const isSelected = selectedHabitId === habit.id;
            const totalCompletions = checkIns.filter(
              (c) => c.playerId === activePlayerId && c.habitId === habit.id
            ).length;

            return (
              <div
                key={habit.id}
                onClick={() => {
                  soundEngine.playClick();
                  hapticLight();
                  setSelectedHabitId(isSelected ? null : habit.id);
                }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    soundEngine.playClick();
                    setSelectedHabitId(isSelected ? null : habit.id);
                  }
                }}
                aria-pressed={isSelected}
                className={`flex min-h-14 items-center gap-3 rounded-xl border bg-[#0e1013] px-3.5 cursor-pointer transition-colors ${
                  isSelected
                    ? isMaciek
                      ? 'border-purple-500/50 bg-purple-500/5'
                      : 'border-red-500/50 bg-red-500/5'
                    : 'border-zinc-800/90 hover:border-zinc-700'
                }`}
              >
                <HabitIcon
                  name={habit.iconName}
                  className={`size-4 ${isMaciek ? 'text-purple-400' : 'text-red-400'}`}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm truncate">{habit.title}</div>
                  <div className="text-[10px] font-mono text-zinc-500">
                    {totalCompletions} {totalCompletions === 1 ? 'check-in' : 'check-ins'} logged
                  </div>
                </div>
                {habit.automation?.metric === 'steps' ? (
                  <select
                    aria-label="Step goal"
                    className="rounded-lg border border-zinc-800 bg-zinc-900 p-2 text-xs font-mono"
                    value={habit.automation.target}
                    onClick={(event) => event.stopPropagation()}
                    onChange={(event) =>
                      updateHabit({
                        ...habit,
                        automation: { metric: 'steps', target: Number(event.target.value) },
                      })
                    }
                  >
                    {[6000, 10000, 14000].map((target) => (
                      <option key={target} value={target}>
                        {target.toLocaleString()} steps
                      </option>
                    ))}
                  </select>
                ) : habit.automation ? (
                  <span
                    className={`rounded border px-1.5 py-0.5 text-[10px] font-mono ${
                      isMaciek
                        ? 'border-purple-500/30 bg-purple-500/10 text-purple-300'
                        : 'border-red-500/30 bg-red-500/10 text-red-300'
                    }`}
                  >
                    Auto
                  </span>
                ) : (
                  <span className="text-xs font-mono text-zinc-400 tabular-nums">
                    {habit.points} pts{habit.weeklyTargetDays ? ` · ${habit.weeklyTargetDays}×/wk` : ''}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
