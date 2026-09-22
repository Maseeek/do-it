'use client';

import React, { useState } from 'react';
import { useStore } from '@/lib/store';
import { LeaderboardTier } from '@/lib/types';
import { getDaysRemainingInMonth, getDaysRemainingInWeek, getTodayDateString } from '@/lib/date-utils';
import { Check, Clock, Flame, Sparkles, Trophy, Zap } from 'lucide-react';

export function DuelView() {
  const [selectedTier, setSelectedTier] = useState<LeaderboardTier>('weekly');
  const {
    maciekSummary,
    myrnaSummary,
    getComparison,
    activeWeeklyStake,
    activeMonthlyStake,
    habits,
    checkIns,
  } = useStore();

  const comparison = getComparison(selectedTier);
  const weekRemaining = getDaysRemainingInWeek();
  const monthRemainingDays = getDaysRemainingInMonth();

  const todayStr = getTodayDateString();

  // Active stake based on selected tier
  const activeStake =
    selectedTier === 'monthly'
      ? activeMonthlyStake
      : selectedTier === 'weekly'
      ? activeWeeklyStake
      : null;

  // Filter habits for side-by-side today comparison
  const maciekHabits = habits.filter((h) => h.playerId === 'maciek' && h.isActive);
  const myrnaHabits = habits.filter((h) => h.playerId === 'myrna' && h.isActive);

  const isCompletedToday = (habitId: string) => {
    return checkIns.some((c) => c.habitId === habitId && c.date === todayStr);
  };

  return (
    <div className="space-y-4 pb-24">
      {/* Tier Switcher Pill */}
      <div className="flex p-1 rounded-xl bg-zinc-900 border border-zinc-800">
        {(['weekly', 'monthly', 'yearly', 'karma'] as LeaderboardTier[]).map((tier) => (
          <button
            key={tier}
            onClick={() => setSelectedTier(tier)}
            className={`flex-1 py-1.5 rounded-lg text-xs font-mono font-medium capitalize transition-all duration-200 ${
              selectedTier === tier
                ? 'bg-zinc-800 text-white shadow-sm'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {tier === 'karma' ? 'Karma ✨' : tier}
          </button>
        ))}
      </div>

      {/* Main Duel Arena Card */}
      <div className="rounded-2xl bg-gradient-to-b from-[#111317] to-[#0c0d10] border border-zinc-800/90 p-5 shadow-xl">
        {/* Header with Countdown */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-zinc-800/60">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-300 font-mono">
              {selectedTier === 'karma' ? 'All-Time Karma Standings' : `${selectedTier} Duel`}
            </span>
          </div>

          {selectedTier === 'weekly' && (
            <div className="flex items-center gap-1.5 text-[11px] font-mono text-zinc-400 bg-zinc-900/80 px-2 py-0.5 rounded-md border border-zinc-800">
              <Clock className="w-3 h-3 text-zinc-500" />
              <span>
                {weekRemaining.days}d {weekRemaining.hours}h left
              </span>
            </div>
          )}

          {selectedTier === 'monthly' && (
            <div className="flex items-center gap-1.5 text-[11px] font-mono text-zinc-400 bg-zinc-900/80 px-2 py-0.5 rounded-md border border-zinc-800">
              <Clock className="w-3 h-3 text-zinc-500" />
              <span>{monthRemainingDays} days left</span>
            </div>
          )}
        </div>

        {/* Head to Head Numbers */}
        <div className="grid grid-cols-2 gap-4 items-center mb-6">
          {/* Maciek */}
          <div className="text-left">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-6 h-6 rounded-md bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
                <Zap className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs font-semibold text-zinc-300">Maciek</span>
            </div>
            <div className="text-3xl font-extrabold font-mono text-white tracking-tight">
              {comparison.maciekScore.toLocaleString()}
            </div>
            <span className="text-[10px] font-mono text-zinc-500">POINTS EARNED</span>
          </div>

          {/* Myrna */}
          <div className="text-right">
            <div className="flex items-center justify-end gap-2 mb-1.5">
              <span className="text-xs font-semibold text-zinc-300">Myrna</span>
              <div className="w-6 h-6 rounded-md bg-pink-500/10 border border-pink-500/30 flex items-center justify-center text-pink-400">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-3xl font-extrabold font-mono text-white tracking-tight">
              {comparison.myrnaScore.toLocaleString()}
            </div>
            <span className="text-[10px] font-mono text-zinc-500">POINTS EARNED</span>
          </div>
        </div>

        {/* Split Comparison Tug-of-War Bar */}
        <div className="space-y-1.5 mb-6">
          <div className="relative h-2.5 w-full rounded-full bg-zinc-900 overflow-hidden flex p-0.5 border border-zinc-800">
            <div
              className="h-full rounded-l-full bg-blue-500 transition-all duration-700"
              style={{ width: `${comparison.maciekPct}%` }}
            />
            <div
              className="h-full rounded-r-full bg-pink-500 transition-all duration-700"
              style={{ width: `${comparison.myrnaPct}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] font-mono text-zinc-500">
            <span>{comparison.maciekPct}%</span>
            <span>{comparison.myrnaPct}%</span>
          </div>
        </div>

        {/* Status Callout Pill */}
        <div
          className={`py-2 px-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-medium font-mono ${
            comparison.leader === 'maciek'
              ? 'bg-blue-500/10 border-blue-500/30 text-blue-300'
              : comparison.leader === 'myrna'
              ? 'bg-pink-500/10 border-pink-500/30 text-pink-300'
              : 'bg-zinc-900 border-zinc-800 text-zinc-400'
          }`}
        >
          {comparison.leader === 'maciek' && (
            <>
              <Zap className="w-3.5 h-3.5 text-blue-400" />
              <span>Maciek is leading by {comparison.delta} pts</span>
            </>
          )}
          {comparison.leader === 'myrna' && (
            <>
              <Sparkles className="w-3.5 h-3.5 text-pink-400" />
              <span>Myrna is leading by {comparison.delta} pts</span>
            </>
          )}
          {comparison.leader === 'tie' && (
            <>
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              <span>Dead heat — exactly tied!</span>
            </>
          )}
        </div>
      </div>

      {/* Active Stake / Wager Banner */}
      {activeStake && (
        <div className="rounded-2xl bg-[#0e1013] border border-amber-500/20 p-4 shadow-md relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 flex-shrink-0">
              <Trophy className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-semibold">
                Active {activeStake.period} Stake
              </span>
              <h3 className="text-sm font-bold text-white mt-0.5">{activeStake.title}</h3>
              <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                {activeStake.description}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Live Mutual Today Activity */}
      <div className="rounded-2xl bg-[#0c0d10] border border-zinc-800/80 p-4">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 font-mono mb-3">
          Today&apos;s Real-Time Habit Parity
        </h4>

        <div className="grid grid-cols-2 gap-2 text-xs">
          {/* Maciek column */}
          <div className="space-y-1.5">
            <div className="text-[11px] font-mono text-blue-400 font-medium pb-1 border-b border-zinc-800">
              Maciek ({maciekSummary.today} pts)
            </div>
            {maciekHabits.map((h) => {
              const done = isCompletedToday(h.id);
              return (
                <div
                  key={h.id}
                  className={`flex items-center gap-1.5 p-1.5 rounded-lg border text-[11px] truncate ${
                    done
                      ? 'bg-blue-500/10 border-blue-500/20 text-white'
                      : 'bg-zinc-900/40 border-zinc-800/40 text-zinc-500'
                  }`}
                >
                  <div
                    className={`w-3.5 h-3.5 rounded flex items-center justify-center flex-shrink-0 ${
                      done ? 'bg-blue-500 text-white' : 'border border-zinc-700'
                    }`}
                  >
                    {done && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                  </div>
                  <span className="truncate">{h.title}</span>
                </div>
              );
            })}
          </div>

          {/* Myrna column */}
          <div className="space-y-1.5">
            <div className="text-[11px] font-mono text-pink-400 font-medium pb-1 border-b border-zinc-800">
              Myrna ({myrnaSummary.today} pts)
            </div>
            {myrnaHabits.map((h) => {
              const done = isCompletedToday(h.id);
              return (
                <div
                  key={h.id}
                  className={`flex items-center gap-1.5 p-1.5 rounded-lg border text-[11px] truncate ${
                    done
                      ? 'bg-pink-500/10 border-pink-500/20 text-white'
                      : 'bg-zinc-900/40 border-zinc-800/40 text-zinc-500'
                  }`}
                >
                  <div
                    className={`w-3.5 h-3.5 rounded flex items-center justify-center flex-shrink-0 ${
                      done ? 'bg-pink-500 text-white' : 'border border-zinc-700'
                    }`}
                  >
                    {done && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                  </div>
                  <span className="truncate">{h.title}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
