'use client';

import React from 'react';
import { useStore } from '@/lib/store';
import { addDays, formatFriendlyDate, getCurrentWeekDays, getTodayDateString, isFutureDate } from '@/lib/date-utils';
import { BedDouble, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';

export function DateNavigator() {
  const {
    selectedDate,
    setSelectedDate,
    isTodaySelected,
    checkIns,
    activePlayerId,
    isRestDay,
    toggleRestDay,
  } = useStore();

  const todayStr = getTodayDateString();
  const weekDays = getCurrentWeekDays(selectedDate);

  const handlePrevDay = () => {
    setSelectedDate(addDays(selectedDate, -1));
  };

  const handleNextDay = () => {
    const nextDate = addDays(selectedDate, 1);
    if (!isFutureDate(nextDate)) {
      setSelectedDate(nextDate);
    }
  };

  const isRest = isRestDay(selectedDate);
  const isFuture = isFutureDate(addDays(selectedDate, 1));

  return (
    <div className="space-y-2.5">
      {/* Top Header: Day Selector with Chevron Controls */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrevDay}
            className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700 transition-colors"
            title="Previous day"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex items-baseline gap-1.5">
            <span className="text-sm font-bold font-mono text-white">
              {formatFriendlyDate(selectedDate)}
            </span>
            <span className="text-[11px] font-mono text-zinc-500">
              ({selectedDate})
            </span>
          </div>

          <button
            onClick={handleNextDay}
            disabled={isFuture}
            className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700 disabled:opacity-30 disabled:pointer-events-none transition-colors"
            title="Next day"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Rest day toggle */}
          <button
            onClick={() => toggleRestDay(selectedDate)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-mono font-medium border transition-colors ${
              isRest
                ? 'bg-indigo-500/15 border-indigo-500/30 text-indigo-300'
                : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
            }`}
            title="Declare scheduled rest day (protects streak)"
          >
            <BedDouble className="w-3 h-3" />
            <span>{isRest ? 'Rest Day' : 'Rest'}</span>
          </button>

          {/* Jump to Today Button (when viewing past date) */}
          {!isTodaySelected && (
            <button
              onClick={() => setSelectedDate(todayStr)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-500/15 border border-blue-500/30 text-blue-300 text-[10px] font-mono font-medium hover:bg-blue-500/25 transition-colors"
            >
              <RotateCcw className="w-2.5 h-2.5" />
              <span>Today</span>
            </button>
          )}
        </div>
      </div>

      {/* 7-Day Horizontal Week Strip */}
      <div className="grid grid-cols-7 gap-1.5 p-1 rounded-2xl bg-zinc-900/80 border border-zinc-800/90 shadow-sm">
        {weekDays.map((day) => {
          const isSelected = day.dateStr === selectedDate;
          const isToday = day.isToday;
          const dayRest = isRestDay(day.dateStr);

          // Calculate completed habits for this day
          const dayLogs = checkIns.filter(
            (c) => c.playerId === activePlayerId && c.date === day.dateStr
          );
          const completedCount = dayLogs.length;
          const totalPoints = dayLogs.reduce((acc, c) => acc + c.pointsEarned, 0);
          const isParAchieved = totalPoints >= 240;

          return (
            <button
              key={day.dateStr}
              onClick={() => !day.isFuture && setSelectedDate(day.dateStr)}
              disabled={day.isFuture}
              className={`flex flex-col items-center justify-between py-2 rounded-xl transition-all relative ${
                day.isFuture
                  ? 'opacity-30 cursor-not-allowed'
                  : isSelected
                  ? 'bg-zinc-800 text-white shadow-sm ring-1 ring-zinc-600'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
              }`}
            >
              {/* Day Label (Mon, Tue) */}
              <span className={`text-[10px] font-mono ${
                isSelected ? 'font-bold text-white' : 'text-zinc-500'
              }`}>
                {day.dayName}
              </span>

              {/* Day Number */}
              <span className={`text-xs font-mono my-0.5 ${
                isToday ? 'font-extrabold text-blue-400' : 'font-medium'
              }`}>
                {day.dayNumber}
              </span>

              {/* Status Indicator Dot / Badge */}
              <div className="h-2 flex items-center justify-center">
                {dayRest ? (
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" title="Rest Day" />
                ) : isParAchieved ? (
                  <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-xs" title="Daily Par Achieved" />
                ) : completedCount > 0 ? (
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400/80" title={`${completedCount} habits logged`} />
                ) : (
                  <span className="w-1 h-1 rounded-full bg-zinc-700" />
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Retroactive notice banner when past date is selected */}
      {!isTodaySelected && (
        <div className="flex items-center justify-between py-1.5 px-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-mono">
          <div className="flex items-center gap-1.5 truncate">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
            <span className="truncate">Viewing historical date: {selectedDate}</span>
          </div>
          <button
            onClick={() => setSelectedDate(todayStr)}
            className="text-[11px] underline hover:text-white flex-shrink-0 ml-2"
          >
            Return to Today
          </button>
        </div>
      )}
    </div>
  );
}
