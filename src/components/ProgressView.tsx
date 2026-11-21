'use client';

import { useMemo, useState, type ReactNode } from 'react';
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

  const completionCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const checkIn of checkIns) {
      if (checkIn.playerId === activePlayerId) counts.set(checkIn.habitId, (counts.get(checkIn.habitId) ?? 0) + 1);
    }
    return counts;
  }, [checkIns, activePlayerId]);

  if (planner) return <HabitOnboarding onDone={() => setPlanner(false)} />;

  const toggleHabit = (habitId: string, isSelected: boolean) => {
    soundEngine.playClick();
    hapticLight();
    setSelectedHabitId(isSelected ? null : habitId);
  };

  return (
    <div className="mx-auto w-full max-w-2xl stack-section">
      <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-title-lg text-foreground">Progress</h1>
        <button className="control" onClick={() => setPlanner(true)}>
          <Pencil size={15} />
          Edit plan
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatTile label="Day streak" icon={<Flame size={16} />} value={activePlayerSummary.currentStreak} />
        <StatTile label="This week" icon={<TrendingUp size={16} />} value={`${activePlayerSummary.completionRateWeekly}%`} />
      </div>
      </div>

      <HabitHeatmap
        selectedHabitId={selectedHabitId}
        onSelectHabitId={setSelectedHabitId}
        onOpenDateInToday={onOpenDateInToday}
      />

      <section aria-labelledby="progress-habits-title">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div className="min-w-0">
            <h2 id="progress-habits-title" className="text-headline text-foreground">
              Your habits
            </h2>
            <p className="text-caption text-muted mt-0.5">Tap a habit to filter the calendar</p>
          </div>
          <button
            onClick={() => setPlanner(true)}
            className="-mr-2 flex min-h-11 shrink-0 items-center gap-0.5 rounded-xl px-2 text-label text-secondary hover:text-foreground transition-colors"
          >
            Manage <ChevronRight size={16} />
          </button>
        </div>

        <ul className="surface overflow-hidden divide-y divide-[var(--border-subtle)]">
          {activeHabits.map((habit) => {
            const isSelected = selectedHabitId === habit.id;
            const totalCompletions = completionCounts.get(habit.id) ?? 0;
            const meta = [
              habit.automation ? 'Auto' : null,
              `${habit.points} pts`,
              habit.weeklyTargetDays ? `${habit.weeklyTargetDays}×/wk` : null,
              habit.automation?.metric === 'steps' && totalCompletions > 0 ? `${totalCompletions} ${totalCompletions === 1 ? 'check-in' : 'check-ins'}` : null,
            ].filter(Boolean).join(' · ');

            return (
              <li
                key={habit.id}
                className={`flex items-center gap-2 pr-3 transition-colors ${isSelected ? 'bg-player-500/10' : ''}`}
              >
                <button
                  type="button"
                  onClick={() => toggleHabit(habit.id, isSelected)}
                  aria-pressed={isSelected}
                  className="flex min-h-15 min-w-0 flex-1 items-center gap-3 py-2.5 pl-4 text-left hover:bg-[var(--surface-2)]/40 transition-colors"
                >
                  <span
                    aria-hidden="true"
                    className={`flex size-9 shrink-0 items-center justify-center rounded-full transition-colors ${
                      isSelected ? 'bg-player-500/20 text-player-300' : 'bg-[var(--surface-2)] text-player-400'
                    }`}
                  >
                    <HabitIcon name={habit.iconName} className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={`block truncate text-body font-medium ${isSelected ? 'text-player-300' : 'text-foreground'}`}>
                      {habit.title}
                    </span>
                    <span className="block truncate text-caption text-muted num">{meta}</span>
                  </span>
                  {habit.automation?.metric !== 'steps' && totalCompletions > 0 && (
                    <span className="shrink-0 text-right text-caption text-muted num">
                      {totalCompletions} {totalCompletions === 1 ? 'check-in' : 'check-ins'}
                    </span>
                  )}
                </button>
                {habit.automation?.metric === 'steps' && (
                  <select
                    aria-label="Step goal"
                    className="min-h-11 shrink-0 rounded-[var(--radius-control)] border border-[var(--border-subtle)] bg-[var(--surface-2)] px-2.5 text-label text-foreground num"
                    value={habit.automation.target}
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
                )}
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

function StatTile({ label, icon, value }: { label: string; icon: ReactNode; value: ReactNode }) {
  return (
    <div className="surface surface-pad">
      <div className="flex items-center justify-between text-secondary">
        <span className="text-label">{label}</span>
        <span className="text-player-400">{icon}</span>
      </div>
      <div className="mt-2 text-title-lg num text-player-300">{value}</div>
    </div>
  );
}
