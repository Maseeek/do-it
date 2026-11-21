'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '@/lib/store';
import { getPlayerThemeStyles } from '@/lib/player-colors';
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
import { ArrowUpRight, BedDouble, Check, ChevronDown, Sparkles, X } from 'lucide-react';

export interface HabitHeatmapProps {
  selectedHabitId?: string | null;
  onSelectHabitId?: (habitId: string | null) => void;
  onOpenDateInToday?: (dateStr: string) => void;
}

const WEEK_RANGES = [
  { weeks: 12, label: '12w', name: '12 weeks' },
  { weeks: 24, label: '24w', name: '24 weeks' },
  { weeks: 52, label: '52w', name: '52 weeks' },
] as const;

const WEEKDAY_LABELS: { row: number; label: string }[] = [
  { row: 0, label: 'Mon' },
  { row: 2, label: 'Wed' },
  { row: 4, label: 'Fri' },
  { row: 6, label: 'Sun' },
];

const heatmapDateFormatter = new Intl.DateTimeFormat('en-US', {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
});

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

  const calendarWeeks = useMemo(() => getHeatmapCalendarWeeks(weekCount, todayStr), [weekCount, todayStr]);
  const allVisibleDays = calendarWeeks.flatMap((w) => w.days).filter((d) => !d.isFuture);

  const rawPar = multiplayer.configured
    ? playerHabits.reduce((sum, h) => sum + h.points, 0)
    : 240;
  const dailyPar = filteredHabit ? Math.max(1, filteredHabit.points) : rawPar > 0 ? rawPar : 240;

  const restDaySet = useMemo(() => new Set(
    restDays.filter((r) => r.playerId === selectedPlayer).map((r) => r.date)
  ), [restDays, selectedPlayer]);

  const dayStatsMap = useMemo(() => {
    const stats: Record<string, { points: number; count: number; items: CheckIn[] }> = {};
    for (const checkIn of checkIns) {
      if (checkIn.playerId !== selectedPlayer || (activeHabitFilter && checkIn.habitId !== activeHabitFilter)) continue;
      const day = stats[checkIn.date] ?? (stats[checkIn.date] = { points: 0, count: 0, items: [] });
      day.points += checkIn.pointsEarned;
      day.count++;
      day.items.push(checkIn);
    }
    return stats;
  }, [checkIns, selectedPlayer, activeHabitFilter]);

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

  const getFillOpacity = (points: number) => Math.min(1, 0.15 + (points / dailyPar) * 0.85);

  const getIntensityClass = (points: number, isRest: boolean, isFuture: boolean) => {
    if (isFuture) {
      return 'bg-[var(--surface-2)] opacity-40 cursor-default';
    }
    if (points === 0) {
      if (isRest) {
        return 'bg-indigo-100 dark:bg-indigo-950/70 border border-indigo-300 dark:border-indigo-500/40 hover:bg-indigo-200 dark:hover:bg-indigo-900/70';
      }
      return 'bg-[var(--surface-3)] hover:bg-[var(--border-strong)]';
    }
    return 'bg-[var(--surface-3)]';
  };

  const canSwitchPlayers = !multiplayer.configured || isPartnerConnected;
  const inspectedDateStr = selectedDayStr || todayStr;
  const inspectedStats = dayStatsMap[inspectedDateStr] || { points: 0, count: 0, items: [] };
  const inspectedIsRest = restDaySet.has(inspectedDateStr);
  const inspectedCalendarDate = heatmapDateFormatter.format(parseDate(inspectedDateStr));
  const inspectedLabel = formatFriendlyDate(inspectedDateStr);

  // Recent weeks sit on the right; keep them in view when the range widens.
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [weekCount]);

  const playerOptions: { id: PlayerId; tone: string }[] = [
    { id: 'maciek', tone: 'text-owner-300' },
    { id: 'myrna', tone: 'text-guest-300' },
  ];

  return (
    <section style={getPlayerThemeStyles(players[selectedPlayer])}
      aria-label="Consistency contribution calendar"
      className="surface surface-pad space-y-5"
    >
      {/* Title + habit filter */}
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-headline text-foreground">Consistency</h2>
        {playerHabits.length > 0 && (
          <div className="relative min-w-0 max-w-[60%]">
            <select
              aria-label="Filter calendar by habit"
              value={activeHabitFilter ?? ''}
              onChange={(event) => {
                soundEngine.playClick();
                hapticLight();
                setHabitFilter(event.target.value || null);
              }}
              className={`min-h-11 w-full appearance-none truncate rounded-[var(--radius-control)] border border-[var(--border-subtle)] bg-[var(--surface-2)] py-2 pl-3 pr-8 text-label ${
                filteredHabit ? 'text-player-300' : 'text-foreground'
              }`}
            >
              <option value="">All habits</option>
              {playerHabits.map((habit) => (
                <option key={habit.id} value={habit.id}>
                  {habit.title}
                </option>
              ))}
            </select>
            <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
          </div>
        )}
      </div>

      {/* Range + player, one row */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div
          role="group"
          aria-label="Select calendar timeframe"
          className="flex rounded-[var(--radius-control)] bg-[var(--surface-2)] p-0.5"
        >
          {WEEK_RANGES.map((range) => (
            <button
              key={range.weeks}
              type="button"
              aria-pressed={weekCount === range.weeks}
              aria-label={range.name}
              onClick={() => {
                if (weekCount !== range.weeks) {
                  soundEngine.playClick();
                  hapticLight();
                  setWeekCount(range.weeks);
                }
              }}
              className={`h-10 min-w-11 rounded-[10px] px-2.5 text-label num transition-colors ${
                weekCount === range.weeks
                  ? 'bg-[var(--surface-1)] text-foreground font-semibold shadow-xs'
                  : 'text-secondary hover:text-foreground'
              }`}
            >
              {range.label}
            </button>
          ))}
        </div>

        {canSwitchPlayers && (
          <div
            role="tablist"
            aria-label="Select player for consistency heatmap"
            className="flex rounded-[var(--radius-control)] bg-[var(--surface-2)] p-0.5"
          >
            {playerOptions.map(({ id, tone }) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={selectedPlayer === id}
                onClick={() => {
                  if (selectedPlayer !== id) {
                    soundEngine.playClick();
                    hapticLight();
                    setSelectedPlayer(id);
                  }
                }}
                className={`h-10 max-w-28 truncate rounded-[10px] px-3 text-label transition-colors ${
                  selectedPlayer === id
                    ? `bg-[var(--surface-1)] font-semibold shadow-xs ${tone}`
                    : 'text-secondary hover:text-foreground'
                }`}
              >
                {players[id].name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Summary numbers, inline */}
      <dl className="grid grid-cols-4 gap-2">
        <Stat label="Active days" value={<>{activeDaysCount}<span className="text-label font-normal text-muted">/{allVisibleDays.length}</span></>} />
        <Stat label={filteredHabit ? 'Full target' : 'Par days'} value={parDaysCount} accent />
        <Stat label="Best run" value={`${bestWindowStreak}d`} />
        <Stat label="Points" value={windowTotalPoints.toLocaleString()} />
      </dl>

      {/* Calendar matrix (month headers + weekday axis + week columns) */}
      <div ref={scrollRef} className="-mx-1 overflow-x-auto px-1 pb-1">
        <div className="inline-flex min-w-full justify-center">
          <div className="inline-flex flex-col gap-1.5">
            <div aria-hidden="true" className="flex items-center gap-1.5 pl-9">
              {calendarWeeks.map((week) => (
                <div
                  key={`month-${week.startDateStr}`}
                  className="relative h-4 w-4 text-caption text-muted select-none"
                >
                  {week.monthLabel && (
                    <span className="absolute left-0 top-0 whitespace-nowrap">
                      {week.monthLabel}
                    </span>
                  )}
                </div>
              ))}
            </div>

            <div className="flex items-start gap-2">
              <div
                aria-hidden="true"
                className="grid w-7 grid-rows-7 gap-1.5 text-caption text-muted select-none"
              >
                {Array.from({ length: 7 }, (_, rowIdx) => {
                  const found = WEEKDAY_LABELS.find((w) => w.row === rowIdx);
                  return (
                    <div key={rowIdx} className="flex h-4 items-center justify-end leading-none">
                      {found ? found.label : ''}
                    </div>
                  );
                })}
              </div>

              <div className="flex items-start gap-1.5">
                {calendarWeeks.map((week) => (
                  <div key={week.startDateStr} className="grid grid-rows-7 gap-1.5">
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
                          aria-pressed={isSelected && !d.isFuture}
                          className={`relative size-4 rounded-[4px] transition-[transform,box-shadow,background-color] duration-150 ${getIntensityClass(
                            stats.points,
                            isRest,
                            d.isFuture
                          )} ${
                            isSelected && !d.isFuture
                              ? 'z-10 scale-110 ring-2 ring-foreground'
                              : d.isToday
                              ? 'ring-1 ring-[var(--border-strong)] hover:scale-110'
                              : !d.isFuture
                              ? 'hover:scale-110'
                              : ''
                          }`}
                          title={
                            d.isFuture
                              ? `${d.dateStr} (Upcoming)`
                              : `${formatFriendlyDate(d.dateStr)}: ${stats.points} pts (${stats.count} habits)${isRest ? ' · Rest Day' : ''}`
                          }
                        >
                          {stats.points > 0 && !d.isFuture && (
                            <span
                              aria-hidden="true"
                              className="pointer-events-none absolute inset-0 rounded-[4px] bg-player-500"
                              style={{ opacity: getFillOpacity(stats.points) }}
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div aria-hidden="true" className="-mt-1 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-caption text-muted">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-[3px] bg-indigo-100 dark:bg-indigo-950/70 border border-indigo-300 dark:border-indigo-500/40" />
            Rest
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-[3px] bg-[var(--surface-3)] ring-1 ring-[var(--border-strong)]" />
            Today
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span className="mr-0.5">Less</span>
          <span className="size-2.5 rounded-[3px] bg-[var(--surface-3)]" />
          {[0.0625, 0.3125, 0.625, 1].map((ratio) => (
            <span
              key={ratio}
              className="size-2.5 rounded-[3px] bg-player-500"
              style={{ opacity: getFillOpacity(dailyPar * ratio) }}
            />
          ))}
          <span className="ml-0.5 num">{dailyPar} par</span>
        </div>
      </div>

      {/* Selected day */}
      <div className="border-t border-[var(--border-subtle)] pt-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-baseline gap-x-2">
              <span className="text-label font-semibold text-foreground">{inspectedLabel}</span>
              {inspectedLabel !== inspectedCalendarDate && (
                <span className="text-caption text-muted">{inspectedCalendarDate}</span>
              )}
            </div>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-caption">
              <span className="num font-semibold text-player-300">
                {inspectedStats.points} / {dailyPar} pts
              </span>
              {inspectedStats.points >= dailyPar && (
                <span className="inline-flex items-center gap-1 text-player-300">
                  <Sparkles className="size-3" />
                  {filteredHabit ? 'Completed' : 'Par Hit'}
                </span>
              )}
              {inspectedIsRest && (
                <span className="inline-flex items-center gap-1 text-indigo-500 dark:text-indigo-300">
                  <BedDouble className="size-3" />
                  Rest Day
                </span>
              )}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            {selectedDayStr && selectedDayStr !== todayStr && (
              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  setSelectedDayStr(todayStr);
                }}
                aria-label="Reset to today"
                className="flex size-11 items-center justify-center rounded-xl text-muted hover:text-foreground transition-colors"
                title="Reset to today"
              >
                <X className="size-4" />
              </button>
            )}
            {onOpenDateInToday && selectedPlayer === activePlayerId && (
              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  hapticLight();
                  onOpenDateInToday(inspectedDateStr);
                }}
                className="control"
              >
                Open day
                <ArrowUpRight className="size-4" />
              </button>
            )}
          </div>
        </div>

        {inspectedStats.items.length > 0 ? (
          <ul className="space-y-1.5">
            {inspectedStats.items.map((item) => {
              const habit = habits.find((h) => h.id === item.habitId);
              if (!habit) return null;
              return (
                <li key={item.id} className="flex items-center gap-2 text-label text-foreground">
                  <Check className="size-3.5 shrink-0 text-player-400" />
                  <span className="min-w-0 flex-1 truncate font-normal">
                    {habit.title}
                    {typeof item.quantity === 'number' && (
                      <span className="text-muted">
                        {' '}({item.quantity}{habit.quantityUnit ? ` ${habit.quantityUnit}` : ''})
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 num font-semibold text-player-300">+{item.pointsEarned}</span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-caption text-muted">
            {inspectedIsRest
              ? 'Recovery day active — streak protected with no penalty.'
              : 'No check-ins on this date. Tap any square to inspect another day.'}
          </p>
        )}
      </div>
    </section>
  );
}

function Stat({ label, value, accent = false }: { label: string; value: React.ReactNode; accent?: boolean }) {
  return (
    <div className="flex min-w-0 flex-col-reverse">
      <dt className="mt-0.5 truncate text-caption text-muted">{label}</dt>
      <dd className={`text-headline num ${accent ? 'text-player-300' : 'text-foreground'}`}>{value}</dd>
    </div>
  );
}
