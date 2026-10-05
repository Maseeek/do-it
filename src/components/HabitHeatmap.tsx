'use client';

import React, { useState } from 'react';
import { useStore } from '@/lib/store';
import { useMultiplayer } from '@/lib/multiplayer';
import {
  formatFriendlyDate,
  getHeatmapCalendarWeeks,
  getTodayDateString,
  parseDate,
} from '@/lib/date-utils';
import { CheckIn, PlayerId } from '@/lib/types';
import { soundEngine } from '@/lib/sound-utils';
import { hapticLight } from '@/lib/haptic-utils';
import { ArrowUpRight, BedDouble, Calendar, CheckCircle2, Sparkles, X } from 'lucide-react';
import { HabitIcon } from './HabitIcon';

export interface HabitHeatmapProps {
  selectedHabitId?: string | null;
  onSelectHabitId?: (habitId: string | null) => void;
  onOpenDateInToday?: (dateStr: string) => void;
}

const WEEK_RANGES = [
  { weeks: 12, label: '12W' },
  { weeks: 24, label: '24W' },
  { weeks: 52, label: '52W' },
] as const;

const WEEKDAY_LABELS: { row: number; label: string }[] = [
  { row: 0, label: 'Mon' },
  { row: 2, label: 'Wed' },
  { row: 4, label: 'Fri' },
  { row: 6, label: 'Sun' },
];

export function HabitHeatmap({
  selectedHabitId: controlledHabitId,
  onSelectHabitId,
  onOpenDateInToday,
}: HabitHeatmapProps = {}) {
  const multiplayer = useMultiplayer();
  const {
    checkIns,
    activePlayerId,
    players,
    habits,
    restDays,
    isPartnerConnected,
  } = useStore();

  const todayStr = getTodayDateString();
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerId>(activePlayerId || 'maciek');
  const [prevActivePlayerId, setPrevActivePlayerId] = useState<PlayerId | null>(activePlayerId);
  const [weekCount, setWeekCount] = useState<12 | 24 | 52>(12);
  const [internalHabitId, setInternalHabitId] = useState<string | null>(null);
  const [selectedDayStr, setSelectedDayStr] = useState<string | null>(todayStr);

  if (activePlayerId !== prevActivePlayerId) {
    setPrevActivePlayerId(activePlayerId);
    if (activePlayerId) {
      setSelectedPlayer(activePlayerId);
    }
  }

  const playerHabits = habits.filter((h) => h.playerId === selectedPlayer && h.isActive);
  const rawHabitFilter = controlledHabitId !== undefined ? controlledHabitId : internalHabitId;
  const activeHabitFilter = playerHabits.some((h) => h.id === rawHabitFilter)
    ? rawHabitFilter
    : null;
  const filteredHabit = activeHabitFilter
    ? playerHabits.find((h) => h.id === activeHabitFilter) || null
    : null;

  const setHabitFilter = (nextHabitId: string | null) => {
    if (onSelectHabitId) {
      onSelectHabitId(nextHabitId);
    } else {
      setInternalHabitId(nextHabitId);
    }
  };

  const calendarWeeks = getHeatmapCalendarWeeks(weekCount, todayStr);
  const allVisibleDays = calendarWeeks.flatMap((w) => w.days).filter((d) => !d.isFuture);

  const rawPar = multiplayer.configured
    ? playerHabits.reduce((sum, h) => sum + h.points, 0)
    : 240;
  const dailyPar = filteredHabit ? Math.max(1, filteredHabit.points) : rawPar > 0 ? rawPar : 240;

  const restDaySet = new Set(
    restDays.filter((r) => r.playerId === selectedPlayer).map((r) => r.date)
  );

  const dayStatsMap: Record<
    string,
    { points: number; count: number; items: CheckIn[] }
  > = {};

  checkIns
    .filter(
      (c) =>
        c.playerId === selectedPlayer &&
        (!activeHabitFilter || c.habitId === activeHabitFilter)
    )
    .forEach((c) => {
      const existing = dayStatsMap[c.date] || { points: 0, count: 0, items: [] };
      dayStatsMap[c.date] = {
        points: existing.points + c.pointsEarned,
        count: existing.count + 1,
        items: [...existing.items, c],
      };
    });

  // Compute summary metrics across visible window
  let windowTotalPoints = 0;
  let activeDaysCount = 0;
  let parDaysCount = 0;
  let bestWindowStreak = 0;
  let runningStreak = 0;

  for (const day of allVisibleDays) {
    const stat = dayStatsMap[day.dateStr];
    const pts = stat?.points || 0;
    const isRest = restDaySet.has(day.dateStr);
    windowTotalPoints += pts;

    if (pts > 0) {
      activeDaysCount += 1;
      runningStreak += 1;
      if (runningStreak > bestWindowStreak) {
        bestWindowStreak = runningStreak;
      }
    } else if (!isRest) {
      runningStreak = 0;
    }

    if (pts >= dailyPar) {
      parDaysCount += 1;
    }
  }

  const isMaciek = selectedPlayer === 'maciek';
  const highThreshold = Math.max(1, Math.round(dailyPar * 0.625));
  const midThreshold = Math.max(1, Math.round(dailyPar * 0.3125));

  const getIntensityClass = (points: number, isRest: boolean, isFuture: boolean) => {
    if (isFuture) {
      return 'bg-[#14161a]/60 border border-dashed border-zinc-800/50 opacity-30 cursor-default';
    }
    if (points === 0) {
      if (isRest) {
        return 'bg-indigo-950/70 border border-indigo-500/40 hover:bg-indigo-900/70';
      }
      return 'bg-[#22252b] border border-white/[0.04] hover:bg-[#2c3038]';
    }
    if (isMaciek) {
      if (points >= dailyPar) {
        return 'bg-blue-400 border border-blue-300/80 hover:bg-blue-300 shadow-[0_0_8px_rgba(96,165,250,0.55)]';
      }
      if (points >= highThreshold) {
        return 'bg-blue-600 border border-blue-500/80 hover:bg-blue-500';
      }
      if (points >= midThreshold) {
        return 'bg-blue-800 border border-blue-700/70 hover:bg-blue-700';
      }
      return 'bg-blue-950 border border-blue-900/70 hover:bg-blue-900';
    } else {
      if (points >= dailyPar) {
        return 'bg-purple-400 border border-purple-300/80 hover:bg-purple-300 shadow-[0_0_8px_rgba(192,132,252,0.55)]';
      }
      if (points >= highThreshold) {
        return 'bg-purple-600 border border-purple-500/80 hover:bg-purple-500';
      }
      if (points >= midThreshold) {
        return 'bg-purple-800 border border-purple-700/70 hover:bg-purple-700';
      }
      return 'bg-purple-950 border border-purple-900/70 hover:bg-purple-900';
    }
  };

  const canSwitchPlayers = !multiplayer.configured || isPartnerConnected;
  const inspectedDateStr = selectedDayStr || todayStr;
  const inspectedStats = dayStatsMap[inspectedDateStr] || { points: 0, count: 0, items: [] };
  const inspectedIsRest = restDaySet.has(inspectedDateStr);
  const inspectedCalendarDate = parseDate(inspectedDateStr).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  return (
    <section
      aria-label="Consistency contribution calendar"
      className="rounded-xl bg-[#0e1013] border border-zinc-800/90 p-4 space-y-3.5"
    >
      {/* Top Header Row: Title + Range Selector + Player Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Calendar className={`w-4 h-4 shrink-0 ${isMaciek ? 'text-blue-400' : 'text-purple-400'}`} />
            <h2 className="text-xs font-mono font-semibold uppercase tracking-wider text-zinc-200 truncate">
              {filteredHabit ? filteredHabit.title : 'Consistency Graph'}
            </h2>
          </div>
          <p className="text-[11px] font-mono text-zinc-400 mt-0.5">
            {filteredHabit
              ? `${activeDaysCount} check-ins in the last ${weekCount} weeks`
              : `${windowTotalPoints.toLocaleString()} pts across ${activeDaysCount} active days (${weekCount}w)`}
          </p>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Week Horizon Selector (12W / 24W / 52W) */}
          <div
            role="group"
            aria-label="Select calendar timeframe"
            className="flex p-0.5 rounded-lg bg-[#08090a] border border-zinc-800/90 text-[11px] font-mono"
          >
            {WEEK_RANGES.map((range) => (
              <button
                key={range.weeks}
                type="button"
                aria-pressed={weekCount === range.weeks}
                onClick={() => {
                  if (weekCount !== range.weeks) {
                    soundEngine.playClick();
                    hapticLight();
                    setWeekCount(range.weeks);
                  }
                }}
                className={`px-2 py-0.5 rounded-md transition-colors ${
                  weekCount === range.weeks
                    ? 'bg-zinc-800 text-white font-semibold'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {range.label}
              </button>
            ))}
          </div>

          {/* Player Toggle */}
          {canSwitchPlayers && (
            <div
              role="tablist"
              aria-label="Select player for consistency heatmap"
              className="flex p-0.5 rounded-lg bg-[#08090a] border border-zinc-800/90 text-xs font-mono"
            >
              <button
                type="button"
                role="tab"
                aria-selected={selectedPlayer === 'maciek'}
                onClick={() => {
                  if (selectedPlayer !== 'maciek') {
                    soundEngine.playClick();
                    hapticLight();
                    setSelectedPlayer('maciek');
                  }
                }}
                className={`px-2.5 py-0.5 rounded-md border transition-colors ${
                  selectedPlayer === 'maciek'
                    ? 'bg-blue-500/20 border-blue-500/35 text-blue-300 font-semibold'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {players.maciek.name}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={selectedPlayer === 'myrna'}
                onClick={() => {
                  if (selectedPlayer !== 'myrna') {
                    soundEngine.playClick();
                    hapticLight();
                    setSelectedPlayer('myrna');
                  }
                }}
                className={`px-2.5 py-0.5 rounded-md border transition-colors ${
                  selectedPlayer === 'myrna'
                    ? 'bg-purple-500/20 border-purple-500/35 text-purple-300 font-semibold'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {players.myrna.name}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Habit Filter Strip */}
      {playerHabits.length > 0 && (
        <div
          role="group"
          aria-label="Filter calendar by habit"
          className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5"
        >
          <button
            type="button"
            aria-pressed={activeHabitFilter === null}
            onClick={() => {
              soundEngine.playClick();
              hapticLight();
              setHabitFilter(null);
            }}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-mono shrink-0 transition-colors ${
              activeHabitFilter === null
                ? isMaciek
                  ? 'bg-blue-500/20 border-blue-500/40 text-blue-200 font-semibold'
                  : 'bg-purple-500/20 border-purple-500/40 text-purple-200 font-semibold'
                : 'bg-[#08090a] border-zinc-800/80 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <span>All Habits</span>
          </button>
          {playerHabits.map((habit) => {
            const isSelected = activeHabitFilter === habit.id;
            return (
              <button
                key={habit.id}
                type="button"
                aria-pressed={isSelected}
                onClick={() => {
                  soundEngine.playClick();
                  hapticLight();
                  setHabitFilter(isSelected ? null : habit.id);
                }}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-mono shrink-0 transition-colors ${
                  isSelected
                    ? isMaciek
                      ? 'bg-blue-500/20 border-blue-500/40 text-blue-200 font-semibold'
                      : 'bg-purple-500/20 border-purple-500/40 text-purple-200 font-semibold'
                    : 'bg-[#08090a] border-zinc-800/80 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <HabitIcon
                  name={habit.iconName}
                  className={`w-3 h-3 ${
                    isSelected
                      ? isMaciek
                        ? 'text-blue-300'
                        : 'text-purple-300'
                      : 'text-zinc-500'
                  }`}
                />
                <span>{habit.title}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Summary Telemetry Strip */}
      <div className="grid grid-cols-4 gap-2">
        <div className="rounded-lg bg-[#08090a] border border-zinc-800/80 px-2.5 py-2">
          <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">
            Active Days
          </div>
          <div className="mt-0.5 text-xs sm:text-sm font-mono font-bold tabular-nums text-zinc-200">
            {activeDaysCount}{' '}
            <span className="text-[10px] font-normal text-zinc-500">/ {allVisibleDays.length}</span>
          </div>
        </div>
        <div className="rounded-lg bg-[#08090a] border border-zinc-800/80 px-2.5 py-2">
          <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">
            {filteredHabit ? 'Full Target' : 'Par Days'}
          </div>
          <div
            className={`mt-0.5 text-xs sm:text-sm font-mono font-bold tabular-nums ${
              isMaciek ? 'text-blue-300' : 'text-purple-300'
            }`}
          >
            {parDaysCount}
          </div>
        </div>
        <div className="rounded-lg bg-[#08090a] border border-zinc-800/80 px-2.5 py-2">
          <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">
            Best Run
          </div>
          <div className="mt-0.5 text-xs sm:text-sm font-mono font-bold tabular-nums text-zinc-200">
            {bestWindowStreak}d
          </div>
        </div>
        <div className="rounded-lg bg-[#08090a] border border-zinc-800/80 px-2.5 py-2">
          <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">
            Window Pts
          </div>
          <div className="mt-0.5 text-xs sm:text-sm font-mono font-bold tabular-nums text-zinc-200">
            {windowTotalPoints.toLocaleString()}
          </div>
        </div>
      </div>

      {/* GitHub-Style Calendar Matrix (Month headers + Weekday axis + Week columns) */}
      <div className="overflow-x-auto no-scrollbar">
        <div className="inline-flex min-w-full justify-center">
          <div className="inline-flex flex-col gap-1.5 p-3 rounded-lg bg-[#08090a] border border-zinc-800/80">
            {/* Month Labels Row */}
            <div className="flex items-center gap-1.5 pl-8">
              {calendarWeeks.map((week) => (
                <div
                  key={`month-${week.startDateStr}`}
                  className="w-4 sm:w-4.5 relative h-3.5 text-[10px] font-mono text-zinc-400 select-none"
                >
                  {week.monthLabel && (
                    <span className="absolute left-0 top-0 whitespace-nowrap">
                      {week.monthLabel}
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* Grid Body: Left Weekday Labels + Week Columns */}
            <div className="flex items-start gap-2">
              {/* Weekday Labels (Mon, Wed, Fri, Sun) */}
              <div
                aria-hidden="true"
                className="grid grid-rows-7 gap-1.5 pr-0.5 text-[10px] font-mono text-zinc-500 select-none"
              >
                {Array.from({ length: 7 }, (_, rowIdx) => {
                  const found = WEEKDAY_LABELS.find((w) => w.row === rowIdx);
                  return (
                    <div
                      key={rowIdx}
                      className="h-4 sm:h-4.5 flex items-center justify-end leading-none"
                    >
                      {found ? found.label : ''}
                    </div>
                  );
                })}
              </div>

              {/* Week Columns (Monday = row 0 .. Sunday = row 6) */}
              <div className="flex items-start gap-1.5">
                {calendarWeeks.map((week) => (
                  <div
                    key={week.startDateStr}
                    className="grid grid-rows-7 gap-1.5"
                  >
                    {week.days.map((d) => {
                      const stats = dayStatsMap[d.dateStr] || {
                        points: 0,
                        count: 0,
                        items: [],
                      };
                      const isRest = restDaySet.has(d.dateStr);
                      const isSelected = inspectedDateStr === d.dateStr;

                      return (
                        <button
                          key={d.dateStr}
                          type="button"
                          disabled={d.isFuture}
                          onClick={() => {
                            if (d.isFuture) return;
                            soundEngine.playClick();
                            hapticLight();
                            setSelectedDayStr(
                              selectedDayStr === d.dateStr ? null : d.dateStr
                            );
                          }}
                          aria-label={`${formatFriendlyDate(d.dateStr)} (${d.dateStr}): ${stats.points} points, ${stats.count} habits${isRest ? ', Rest Day' : ''}`}
                          className={`w-4 h-4 sm:w-4.5 sm:h-4.5 rounded-[3px] transition-all duration-150 focus:outline-none ${getIntensityClass(
                            stats.points,
                            isRest,
                            d.isFuture
                          )} ${
                            isSelected && !d.isFuture
                              ? 'scale-110 ring-2 ring-white shadow-lg z-10'
                              : d.isToday
                              ? 'ring-1 ring-zinc-300/70 hover:scale-110'
                              : !d.isFuture
                              ? 'hover:scale-110'
                              : ''
                          }`}
                          title={
                            d.isFuture
                              ? `${d.dateStr} (Upcoming)`
                              : `${formatFriendlyDate(d.dateStr)}: ${stats.points} pts (${stats.count} habits)${isRest ? ' · Rest Day' : ''}`
                          }
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Legend Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono text-zinc-500">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-[2px] bg-indigo-950/80 border border-indigo-500/40" />
            <span>Rest day</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-[2px] bg-[#22252b] ring-1 ring-zinc-300/70" />
            <span>Today</span>
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <span>Less</span>
          <span className="w-2.5 h-2.5 rounded-[2px] bg-[#22252b] border border-white/[0.06]" />
          <span
            className={`w-2.5 h-2.5 rounded-[2px] ${
              isMaciek
                ? 'bg-blue-950 border border-blue-900/70'
                : 'bg-purple-950 border border-purple-900/70'
            }`}
          />
          <span
            className={`w-2.5 h-2.5 rounded-[2px] ${
              isMaciek ? 'bg-blue-800' : 'bg-purple-800'
            }`}
          />
          <span
            className={`w-2.5 h-2.5 rounded-[2px] ${
              isMaciek ? 'bg-blue-600' : 'bg-purple-600'
            }`}
          />
          <span
            className={`w-2.5 h-2.5 rounded-[2px] ${
              isMaciek ? 'bg-blue-400' : 'bg-purple-400'
            }`}
          />
          <span>{dailyPar} Par</span>
        </div>
      </div>

      {/* Interactive Day Inspector Panel */}
      <div className="rounded-lg bg-[#08090a] border border-zinc-800/80 p-3 space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-wrap">
            <span className="text-xs font-mono font-semibold text-zinc-200">
              {formatFriendlyDate(inspectedDateStr)}
            </span>
            {inspectedDateStr === todayStr && (
              <span className="text-[10px] font-mono text-zinc-500">
                ({inspectedCalendarDate})
              </span>
            )}
            <span
              className={`text-xs font-mono font-bold tabular-nums ${
                isMaciek ? 'text-blue-300' : 'text-purple-300'
              }`}
            >
              {inspectedStats.points} / {dailyPar} pts
            </span>
            {inspectedStats.points >= dailyPar && (
              <span
                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold border ${
                  isMaciek
                    ? 'bg-blue-500/15 border-blue-500/35 text-blue-300'
                    : 'bg-purple-500/15 border-purple-500/35 text-purple-300'
                }`}
              >
                <Sparkles className="w-2.5 h-2.5" />
                {filteredHabit ? 'Completed' : 'Par Hit'}
              </span>
            )}
            {inspectedIsRest && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-indigo-500/15 border border-indigo-500/30 text-indigo-300">
                <BedDouble className="w-2.5 h-2.5" />
                Rest Day
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {onOpenDateInToday && selectedPlayer === activePlayerId && (
              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  hapticLight();
                  onOpenDateInToday(inspectedDateStr);
                }}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-[11px] font-mono text-zinc-300 hover:text-white transition-colors"
              >
                <span>Open day</span>
                <ArrowUpRight className="w-3 h-3" />
              </button>
            )}
            {selectedDayStr && selectedDayStr !== todayStr && (
              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  setSelectedDayStr(todayStr);
                }}
                aria-label="Reset to today"
                className="text-zinc-500 hover:text-zinc-300 p-1 rounded transition-colors"
                title="Reset to today"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Completed habits chips for the inspected day */}
        {inspectedStats.items.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {inspectedStats.items.map((item) => {
              const habit = habits.find((h) => h.id === item.habitId);
              if (!habit) return null;
              return (
                <div
                  key={item.id}
                  className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-[#12141a] border border-zinc-800/90 text-[11px] font-mono text-zinc-200"
                >
                  <CheckCircle2
                    className={`w-3 h-3 shrink-0 ${
                      isMaciek ? 'text-blue-400' : 'text-purple-400'
                    }`}
                  />
                  <span className="truncate max-w-44">{habit.title}</span>
                  {typeof item.quantity === 'number' && (
                    <span className="text-zinc-400">
                      ({item.quantity}{habit.quantityUnit ? ` ${habit.quantityUnit}` : ''})
                    </span>
                  )}
                  <span
                    className={`font-semibold tabular-nums ${
                      isMaciek ? 'text-blue-300' : 'text-purple-300'
                    }`}
                  >
                    +{item.pointsEarned}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-[11px] font-mono text-zinc-500">
            {inspectedIsRest
              ? 'Recovery day active — streak protected with no penalty.'
              : 'No habit check-ins recorded on this date. Tap any square above to inspect.'}
          </p>
        )}
      </div>
    </section>
  );
}
