'use client';

import React from 'react';
import { useStore } from '@/lib/store';
import { addDays, formatFriendlyDate, getCurrentWeekDays, getTodayDateString, isFutureDate } from '@/lib/date-utils';
import { BedDouble, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import { soundEngine } from '@/lib/sound-utils';
import { hapticLight } from '@/lib/haptic-utils';

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

  const handleSelectDay = (dateStr: string) => {
    soundEngine.playClick();
    hapticLight();
    setSelectedDate(dateStr);
  };

  const handleToggleRest = () => {
    soundEngine.playClick();
    hapticLight();
    toggleRestDay(selectedDate);
  };

  const isRest = isRestDay(selectedDate);
  const isFuture = isFutureDate(addDays(selectedDate, 1));

  return (
    <div className="space-y-2">
      {/* Top Header Controls */}
      <div className="flex items-center justify-between px-0.5">
        <div className="flex items-center gap-1.5">
          <button
            onClick={handlePrevDay}
            className="p-1.5 rounded-xl border border-white/[0.08] bg-zinc-900/50 text-zinc-400 hover:text-white hover:border-white/20 transition-all focus:outline-none active:scale-95"
            title="Previous day"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>

          <div className="flex items-baseline gap-1.5 px-1">
            <span className="text-xs font-mono font-bold tracking-tight text-white">
              {formatFriendlyDate(selectedDate)}
            </span>
            {isTodaySelected && (
              <span className="text-[9px] font-mono uppercase tracking-wider text-blue-400 font-semibold bg-blue-500/10 px-1.5 py-0.2 rounded border border-blue-500/20">
                Today
              </span>
            )}
          </div>

          <button
            onClick={handleNextDay}
            disabled={isFuture}
            className="p-1.5 rounded-xl border border-white/[0.08] bg-zinc-900/50 text-zinc-400 hover:text-white hover:border-white/20 disabled:opacity-20 disabled:pointer-events-none transition-all focus:outline-none active:scale-95"
            title="Next day"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Rest Day Toggle */}
          <button
            onClick={handleToggleRest}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-mono font-medium border transition-all active:scale-95 ${
              isRest
                ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300 shadow-[0_0_10px_rgba(99,102,241,0.2)]'
                : 'bg-zinc-900/40 border-white/[0.08] text-zinc-400 hover:text-zinc-200 hover:border-white/20'
            }`}
            title="Declare scheduled rest day (protects streak)"
          >
            <BedDouble className="w-3 h-3 text-indigo-400" />
            <span>{isRest ? 'Rest Day' : 'Rest'}</span>
          </button>

          {/* Jump to Today Button */}
          {!isTodaySelected && (
            <button
              onClick={() => {
                soundEngine.playClick();
                setSelectedDate(todayStr);
              }}
              className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-300 text-[10px] font-mono font-medium hover:bg-blue-500/25 transition-all shadow-sm active:scale-95"
              title="Return to today"
            >
              <RotateCcw className="w-2.5 h-2.5" />
              <span>Today [T]</span>
            </button>
          )}
        </div>
      </div>

      {/* 7-Day Horizontal Week Strip */}
      <div className="grid grid-cols-7 gap-1 p-1 rounded-2xl glass-card border border-white/[0.08] shadow-lg">
        {weekDays.map((day) => {
          const isSelected = day.dateStr === selectedDate;
          const isToday = day.isToday;
          const dayRest = isRestDay(day.dateStr);

          // Calculate completed habits & par for this day
          const dayLogs = checkIns.filter(
            (c) => c.playerId === activePlayerId && c.date === day.dateStr
          );
          const completedCount = dayLogs.length;
          const totalPoints = dayLogs.reduce((acc, c) => acc + c.pointsEarned, 0);
          const isParAchieved = totalPoints >= 240;

          return (
            <button
              key={day.dateStr}
              onClick={() => !day.isFuture && handleSelectDay(day.dateStr)}
              disabled={day.isFuture}
              className={`relative flex flex-col items-center justify-between py-2 rounded-xl transition-all duration-200 focus:outline-none ${
                day.isFuture
                  ? 'opacity-20 cursor-not-allowed'
                  : isSelected
                  ? 'bg-white/[0.12] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.15)] ring-1 ring-white/30 scale-[1.03] z-10'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'
              }`}
            >
              {/* Day Label (Mon, Tue) */}
              <span
                className={`text-[9px] font-mono uppercase tracking-wider ${
                  isSelected ? 'font-bold text-white' : 'text-zinc-500'
                }`}
              >
                {day.dayName}
              </span>

              {/* Day Number */}
              <span
                className={`text-xs font-mono font-bold my-1 ${
                  isToday
                    ? 'text-blue-400 drop-shadow-[0_0_4px_rgba(96,165,250,0.5)]'
                    : isSelected
                    ? 'text-white'
                    : 'text-zinc-300'
                }`}
              >
                {day.dayNumber}
              </span>

              {/* Status Indicator Dot / Arc */}
              <div className="h-2 flex items-center justify-center">
                {dayRest ? (
                  <span
                    className="w-1.5 h-1.5 rounded-full bg-indigo-400 shadow-[0_0_4px_rgba(129,140,248,0.6)]"
                    title="Rest & Recovery Day"
                  />
                ) : isParAchieved ? (
                  <span
                    className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]"
                    title={`Daily Par Achieved! (${totalPoints} pts)`}
                  />
                ) : completedCount > 0 ? (
                  <span
                    className="w-1.5 h-1.5 rounded-full bg-blue-400/80 shadow-[0_0_4px_rgba(96,165,250,0.4)]"
                    title={`${completedCount} habits logged (${totalPoints} pts)`}
                  />
                ) : (
                  <span className="w-1 h-1 rounded-full bg-zinc-800" />
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Historical date indicator banner */}
      {!isTodaySelected && (
        <div className="flex items-center justify-between py-1 px-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs font-mono shadow-sm">
          <div className="flex items-center gap-1.5 truncate">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            <span className="truncate">Viewing history: {selectedDate}</span>
          </div>
          <button
            onClick={() => {
              soundEngine.playClick();
              setSelectedDate(todayStr);
            }}
            className="text-[11px] underline hover:text-white flex-shrink-0 ml-2"
          >
            Jump to Today
          </button>
        </div>
      )}
    </div>
  );
}
