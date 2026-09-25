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
    <div className="space-y-2">
      {/* Top Header Controls */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-1.5">
          <button
            onClick={handlePrevDay}
            className="w-7 h-7 rounded-full bg-[#1c1c1e] border border-white/[0.08] text-zinc-400 hover:text-white flex items-center justify-center transition-colors active:scale-95"
            aria-label="Previous day"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <span className="text-xs font-semibold text-white px-1">
            {formatFriendlyDate(selectedDate)}
          </span>

          <button
            onClick={handleNextDay}
            disabled={isFuture}
            className="w-7 h-7 rounded-full bg-[#1c1c1e] border border-white/[0.08] text-zinc-400 hover:text-white flex items-center justify-center disabled:opacity-20 disabled:pointer-events-none transition-colors active:scale-95"
            aria-label="Next day"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Rest day toggle */}
          <button
            onClick={() => toggleRestDay(selectedDate)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all active:scale-95 border ${
              isRest
                ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300'
                : 'bg-[#1c1c1e] border-white/[0.08] text-zinc-400 hover:text-white'
            }`}
            title="Toggle Rest Day"
          >
            <BedDouble className="w-3 h-3" />
            <span>Rest</span>
          </button>

          {/* Jump to Today Button */}
          {!isTodaySelected && (
            <button
              onClick={() => setSelectedDate(todayStr)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-400 text-[11px] font-medium hover:bg-blue-500/25 transition-colors active:scale-95"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Today</span>
            </button>
          )}
        </div>
      </div>

      {/* 7-Day Apple Calendar Style Week Strip */}
      <div className="grid grid-cols-7 gap-1 p-1 rounded-2xl bg-[#1c1c1e] border border-white/[0.08]">
        {weekDays.map((day) => {
          const isSelected = day.dateStr === selectedDate;
          const isToday = day.isToday;
          const dayRest = isRestDay(day.dateStr);

          // Calculate points for indicator
          const dayLogs = checkIns.filter(
            (c) => c.playerId === activePlayerId && c.date === day.dateStr
          );
          const totalPoints = dayLogs.reduce((acc, c) => acc + c.pointsEarned, 0);
          const isParAchieved = totalPoints >= 240;

          // Single-letter day name (M, T, W, T, F, S, S)
          const singleLetter = day.dayName.charAt(0);

          return (
            <button
              key={day.dateStr}
              onClick={() => !day.isFuture && setSelectedDate(day.dateStr)}
              disabled={day.isFuture}
              className={`flex flex-col items-center justify-between py-2 rounded-xl transition-all relative ${
                day.isFuture
                  ? 'opacity-25 cursor-not-allowed'
                  : isSelected
                  ? 'bg-white text-black shadow-md'
                  : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <span className={`text-[10px] font-medium ${isSelected ? 'text-zinc-700' : 'text-zinc-500'}`}>
                {singleLetter}
              </span>

              <span className={`text-xs my-0.5 ${
                isSelected
                  ? 'font-bold text-black'
                  : isToday
                  ? 'font-bold text-blue-400'
                  : 'font-medium'
              }`}>
                {day.dayNumber}
              </span>

              {/* Status indicator dot */}
              <div className="h-1.5 flex items-center justify-center">
                {dayRest ? (
                  <span className={`w-1 h-1 rounded-full ${isSelected ? 'bg-indigo-600' : 'bg-indigo-400'}`} />
                ) : isParAchieved ? (
                  <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-emerald-600' : 'bg-emerald-400'}`} />
                ) : totalPoints > 0 ? (
                  <span className={`w-1 h-1 rounded-full ${isSelected ? 'bg-zinc-800' : 'bg-zinc-500'}`} />
                ) : (
                  <span className="w-1 h-1 rounded-full opacity-0" />
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
