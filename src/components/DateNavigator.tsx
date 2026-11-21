'use client';

import React, { useEffect, useMemo, useRef } from 'react';
import { useStore } from '@/lib/store';
import { useMultiplayer } from '@/lib/multiplayer';
import {
  addDays,
  CalendarWeekDay,
  formatFriendlyDate,
  getCurrentWeekDays,
  getTodayDateString,
  isFutureDate,
  parseDate,
} from '@/lib/date-utils';
import { BedDouble, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import { soundEngine } from '@/lib/sound-utils';
import { hapticLight } from '@/lib/haptic-utils';

export function DateNavigator() {
  const multiplayer = useMultiplayer();
  const {
    selectedDate,
    setSelectedDate,
    isTodaySelected,
    checkIns,
    activeHabits,
    activePlayerId,
    isRestDay,
    toggleRestDay,
  } = useStore();

  const todayStr = getTodayDateString();
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const selectedWeekMondayRef = useRef<HTMLButtonElement | null>(null);

  const dailyPar = useMemo(() => {
    if (multiplayer.configured) {
      const total = activeHabits.reduce((sum, habit) => sum + habit.points, 0);
      return total > 0 ? total : 240;
    }
    return 240;
  }, [multiplayer.configured, activeHabits]);

  const dailyStats = useMemo(() => {
    const stats = new Map<string, { count: number; points: number }>();
    for (const checkIn of checkIns) {
      if (checkIn.playerId !== activePlayerId) continue;
      let day = stats.get(checkIn.date);
      if (!day) {
        day = { count: 0, points: 0 };
        stats.set(checkIn.date, day);
      }
      day.count++;
      day.points += checkIn.pointsEarned;
    }
    return stats;
  }, [checkIns, activePlayerId]);

  const selectedWeekMonday = useMemo(
    () => getCurrentWeekDays(selectedDate)[0].dateStr,
    [selectedDate]
  );

  // Build a scrollable 28-day window (3 prior weeks + current/selected week) so users can scroll or step between dates
  const scrollableDays = useMemo(() => {
    const currentWeekMonday = getCurrentWeekDays(todayStr)[0].dateStr;
    const earliestAnchor = selectedWeekMonday < addDays(currentWeekMonday, -21)
      ? selectedWeekMonday
      : addDays(currentWeekMonday, -21);

    const days: CalendarWeekDay[] = [];
    let cursor = earliestAnchor;
    while (cursor <= currentWeekMonday) {
      days.push(...getCurrentWeekDays(cursor));
      cursor = addDays(cursor, 7);
    }
    return days;
  }, [todayStr, selectedWeekMonday]);

  useEffect(() => {
    if (selectedWeekMondayRef.current && scrollContainerRef.current) {
      selectedWeekMondayRef.current.scrollIntoView({
        behavior: 'smooth',
        inline: 'start',
        block: 'nearest',
      });
    }
  }, [selectedWeekMonday]);

  const handlePrevDay = () => {
    soundEngine.playClick();
    hapticLight();
    setSelectedDate(addDays(selectedDate, -1));
  };

  const handleNextDay = () => {
    const nextDate = addDays(selectedDate, 1);
    if (!isFutureDate(nextDate)) {
      soundEngine.playClick();
      hapticLight();
      setSelectedDate(nextDate);
    }
  };

  const handleToggleRest = () => {
    soundEngine.playClick();
    hapticLight();
    toggleRestDay(selectedDate);
  };

  const handleJumpToday = () => {
    soundEngine.playClick();
    hapticLight();
    setSelectedDate(todayStr);
  };

  const handleSelectDay = (dateStr: string, isFuture: boolean) => {
    if (!isFuture && dateStr !== selectedDate) {
      soundEngine.playClick();
      hapticLight();
      setSelectedDate(dateStr);
    }
  };

  const isRest = isRestDay(selectedDate);
  const isFuture = isFutureDate(addDays(selectedDate, 1));

  const monthLabel = parseDate(selectedDate).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
  const iconButton =
    'flex size-11 items-center justify-center rounded-full text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-2)] hover:text-foreground active:scale-95 disabled:pointer-events-none disabled:opacity-30';

  return (
    <div className="space-y-1">
      {/* One quiet control row: month, rest toggle, back-to-today, day stepping */}
      <div className="-mx-2 flex items-center justify-between gap-1">
        <span className="truncate px-2 text-label text-[var(--text-secondary)]">
          {monthLabel}
          <span className="sr-only">, {isTodaySelected ? 'today' : formatFriendlyDate(selectedDate)} selected</span>
        </span>

        <div className="flex shrink-0 items-center">
          {/* Rest day toggle */}
          <button
            onClick={handleToggleRest}
            aria-pressed={isRest}
            aria-label={isRest ? 'Disable rest day' : 'Enable rest day'}
            className={`flex min-h-11 items-center gap-1.5 rounded-full px-3 text-label transition-colors active:scale-95 ${
              isRest
                ? 'bg-indigo-500/12 text-indigo-600 dark:text-indigo-300'
                : 'text-[var(--text-secondary)] hover:bg-[var(--surface-2)] hover:text-foreground'
            }`}
            title="Declare scheduled rest day (protects streak)"
          >
            <BedDouble className="size-4 text-indigo-500 dark:text-indigo-400" aria-hidden="true" />
            <span>{isRest ? 'Rest day' : 'Rest'}</span>
          </button>

          {/* Jump to Today Button */}
          {!isTodaySelected && (
            <button
              onClick={handleJumpToday}
              aria-label="Jump to today"
              className="flex min-h-11 items-center gap-1.5 rounded-full px-3 text-label font-semibold text-player-600 transition-colors hover:bg-player-500/10 active:scale-95 dark:text-player-300"
              title="Return to today (Shortcut: T)"
            >
              <RotateCcw className="size-3.5" aria-hidden="true" />
              <span>Today</span>
            </button>
          )}

          <button
            onClick={handlePrevDay}
            className={iconButton}
            aria-label="Previous day"
            title="Previous day"
          >
            <ChevronLeft className="size-5" />
          </button>
          <button
            onClick={handleNextDay}
            disabled={isFuture}
            className={iconButton}
            aria-label="Next day"
            title="Next day"
          >
            <ChevronRight className="size-5" />
          </button>
        </div>
      </div>

      {/* Scrollable multi-week strip: no frame, the selected day carries the emphasis */}
      <div
        ref={scrollContainerRef}
        role="tablist"
        aria-label="Calendar dates"
        className="-mx-1 flex snap-x snap-mandatory gap-1 overflow-x-auto bg-transparent! scroll-smooth px-1 py-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {scrollableDays.map((day) => {
          const isSelected = day.dateStr === selectedDate;
          const isToday = day.isToday;
          const dayRest = isRestDay(day.dateStr);

          // Calculate points for indicator
          const completedCount = dailyStats.get(day.dateStr)?.count ?? 0;
          const totalPoints = dailyStats.get(day.dateStr)?.points ?? 0;
          const isParAchieved = totalPoints >= dailyPar;
          const parsed = parseDate(day.dateStr);
          const showMonthTag = day.dayNumber === 1;

          return (
            <button
              key={day.dateStr}
              ref={day.dateStr === selectedWeekMonday ? selectedWeekMondayRef : null}
              role="tab"
              aria-selected={isSelected}
              aria-label={`${day.dayName}, ${day.dateStr}${isSelected ? ', selected' : ''}${isToday ? ', today' : ''}${dayRest ? ', rest day' : ''}${isParAchieved ? ', par achieved' : ''}`}
              onClick={() => handleSelectDay(day.dateStr, day.isFuture)}
              disabled={day.isFuture}
              className={`${day.dayName === 'Mon' ? 'snap-start' : ''} relative flex min-h-16 min-w-[calc((100%-1.5rem)/7)] shrink-0 flex-col items-center justify-center gap-1 rounded-[var(--radius-control)] py-2 transition-colors ${
                day.isFuture
                  ? 'cursor-not-allowed opacity-30'
                  : isSelected
                  ? 'bg-foreground text-background'
                  : 'text-foreground hover:bg-[var(--surface-2)]'
              }`}
            >
              <span
                className={`text-caption ${
                  isSelected ? 'font-medium opacity-80' : 'text-[var(--text-muted)]'
                }`}
              >
                {showMonthTag
                  ? parsed.toLocaleDateString('en-US', { month: 'short' })
                  : day.dayName}
              </span>

              <span
                className={`num text-body leading-none ${
                  isSelected
                    ? 'font-semibold'
                    : isToday
                    ? 'font-semibold text-player-600 dark:text-player-300'
                    : 'font-medium'
                }`}
              >
                {day.dayNumber}
              </span>

              {/* Status dot */}
              <span className="flex h-1.5 items-center justify-center" aria-hidden="true">
                {dayRest ? (
                  <span className="size-1.5 rounded-full bg-indigo-400" title="Rest Day" />
                ) : isParAchieved ? (
                  <span
                    className="size-1.5 rounded-full bg-emerald-400"
                    title={`Daily Par Achieved (${totalPoints} pts)`}
                  />
                ) : completedCount > 0 ? (
                  <span
                    className="size-1.5 rounded-full bg-player-400"
                    title={`${completedCount} logged (${totalPoints} pts)`}
                  />
                ) : (
                  <span className={`size-1 rounded-full ${isSelected ? 'bg-current opacity-30' : 'bg-[var(--border-strong)]'}`} />
                )}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
