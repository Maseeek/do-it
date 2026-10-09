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
  const isMaciek = activePlayerId === 'maciek';

  return (
    <div className="space-y-2">
      {/* Top Header Controls */}
      <div className="flex items-center justify-between gap-2 px-0.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <button
            onClick={handlePrevDay}
            className="w-7 h-7 rounded-md bg-[#0e1013] border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700 flex items-center justify-center transition-colors active:scale-95 shrink-0"
            aria-label="Previous day"
            title="Previous day"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>

          <div className="flex items-baseline gap-1.5 px-1 truncate">
            <span className="text-xs font-mono font-bold tracking-tight text-white truncate">
              {isTodaySelected
                ? parseDate(selectedDate).toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                  })
                : formatFriendlyDate(selectedDate)}
            </span>
            <span className="hidden sm:inline text-[11px] font-mono text-zinc-500">
              ({selectedDate})
            </span>
            {isTodaySelected && (
              <span
                className={`text-[9px] font-mono uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded border ${
                  isMaciek
                    ? 'text-blue-400 bg-blue-500/10 border-blue-500/25'
                    : 'text-purple-400 bg-purple-500/10 border-purple-500/25'
                }`}
              >
                Today
              </span>
            )}
          </div>

          <button
            onClick={handleNextDay}
            disabled={isFuture}
            className="w-7 h-7 rounded-md bg-[#0e1013] border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700 flex items-center justify-center disabled:opacity-25 disabled:pointer-events-none transition-colors active:scale-95 shrink-0"
            aria-label="Next day"
            title="Next day"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Rest day toggle */}
          <button
            onClick={handleToggleRest}
            aria-pressed={isRest}
            aria-label={isRest ? 'Disable rest day' : 'Enable rest day'}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-mono font-medium transition-all active:scale-95 border ${
              isRest
                ? 'bg-indigo-500/15 border-indigo-500/35 text-indigo-300'
                : 'bg-[#0e1013] border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
            }`}
            title="Declare scheduled rest day (protects streak)"
          >
            <BedDouble className="w-3 h-3 text-indigo-400" />
            <span>{isRest ? 'Rest Day' : 'Rest'}</span>
          </button>

          {/* Jump to Today Button */}
          {!isTodaySelected && (
            <button
              onClick={handleJumpToday}
              aria-label="Jump to today"
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-mono font-medium transition-colors active:scale-95 border ${
                isMaciek
                  ? 'bg-blue-500/15 border-blue-500/30 text-blue-300 hover:bg-blue-500/25'
                  : 'bg-purple-500/15 border-purple-500/30 text-purple-300 hover:bg-purple-500/25'
              }`}
              title="Return to today (Shortcut: T)"
            >
              <RotateCcw className="w-2.5 h-2.5" />
              <span>Today [T]</span>
            </button>
          )}
        </div>
      </div>

      {/* Scrollable Horizontal Multi-Week Strip */}
      <div
        ref={scrollContainerRef}
        role="tablist"
        aria-label="Calendar dates"
        className="flex gap-1.5 p-1.5 rounded-xl bg-[#0e1013] border border-zinc-800/90 overflow-x-auto snap-x snap-mandatory scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {scrollableDays.map((day) => {
          const isSelected = day.dateStr === selectedDate;
          const isToday = day.isToday;
          const dayRest = isRestDay(day.dateStr);

          // Calculate points for indicator
          const dayLogs = checkIns.filter(
            (c) => c.playerId === activePlayerId && c.date === day.dateStr
          );
          const completedCount = dayLogs.length;
          const totalPoints = dayLogs.reduce((acc, c) => acc + c.pointsEarned, 0);
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
              className={`${day.dayName === 'Mon' ? 'snap-start' : ''} shrink-0 min-w-[calc((100%-2.25rem)/7)] flex flex-col items-center justify-between py-2 px-1 rounded-lg transition-all relative border ${
                day.isFuture
                  ? 'opacity-25 cursor-not-allowed border-transparent'
                  : isSelected
                  ? 'bg-zinc-800/90 border-zinc-600 text-white shadow-xs'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/70 hover:border-zinc-800/80'
              }`}
            >
              <span
                className={`text-[9px] font-mono uppercase tracking-wider ${
                  isSelected ? 'font-bold text-zinc-200' : 'text-zinc-500'
                }`}
              >
                {showMonthTag
                  ? parsed.toLocaleDateString('en-US', { month: 'short' })
                  : day.dayName}
              </span>

              <span
                className={`text-xs font-mono tabular-nums my-0.5 ${
                  isToday
                    ? isMaciek
                      ? 'font-extrabold text-blue-400'
                      : 'font-extrabold text-purple-400'
                    : isSelected
                    ? 'font-bold text-white'
                    : 'font-medium text-zinc-300'
                }`}
              >
                {day.dayNumber}
              </span>

              {/* Linear-style status bar / dot */}
              <div className="h-1.5 flex items-center justify-center">
                {dayRest ? (
                  <span
                    className="w-2.5 h-1 rounded-xs bg-indigo-400"
                    title="Rest Day"
                  />
                ) : isParAchieved ? (
                  <span
                    className="w-3 h-1 rounded-xs bg-emerald-400"
                    title={`Daily Par Achieved (${totalPoints} pts)`}
                  />
                ) : completedCount > 0 ? (
                  <span
                    className={`w-2 h-1 rounded-xs ${
                      isMaciek ? 'bg-blue-400/80' : 'bg-purple-400/80'
                    }`}
                    title={`${completedCount} logged (${totalPoints} pts)`}
                  />
                ) : (
                  <span className="w-1 h-1 rounded-xs bg-zinc-800" />
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Historical date notice bar */}
      {!isTodaySelected && (
        <div className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] font-mono">
          <div className="flex items-center gap-2 truncate">
            <span className="w-1.5 h-1.5 rounded-xs bg-amber-400 animate-pulse shrink-0" />
            <span className="truncate">Viewing historical date: {selectedDate}</span>
          </div>
          <button
            onClick={handleJumpToday}
            className="text-[11px] underline hover:text-white shrink-0 ml-2"
          >
            Return to Today
          </button>
        </div>
      )}
    </div>
  );
}
