'use client';

import React, { useState } from 'react';
import { useStore } from '@/lib/store';
import { LeaderboardTier, Habit, CheckIn, Player, PlayerId } from '@/lib/types';
import { getCategoryBreakdown, getStakesRecord, getWeeklyDailyDuelPoints } from '@/lib/score-calculator';
import { getDaysRemainingInMonth, getDaysRemainingInWeek, getTodayDateString } from '@/lib/date-utils';
import {
  Award,
  BarChart3,
  Camera,
  Check,
  Clock,
  Crown,
  Flame,
  PieChart,
  Sliders,
  Sparkles,
  Trash2,
  Trophy,
  X,
  Zap,
} from 'lucide-react';
import { ProofGalleryModal } from './ProofGalleryModal';
import { fireCelebrationConfetti } from '@/lib/confetti';
import { soundEngine } from '@/lib/sound-utils';
import { hapticCelebration, hapticLight } from '@/lib/haptic-utils';

export function DuelView() {
  const [selectedTier, setSelectedTier] = useState<LeaderboardTier>('weekly');
  const [activeDuelTab, setActiveDuelTab] = useState<'standings' | 'analytics' | 'history'>('standings');
  const [isEditingStake, setIsEditingStake] = useState(false);
  const [isResolvingStake, setIsResolvingStake] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [activeProofView, setActiveProofView] = useState<{
    habit: Habit;
    checkIn: CheckIn;
    player: Player;
  } | null>(null);

  const {
    maciekSummary,
    myrnaSummary,
    getComparison,
    activeWeeklyStake,
    activeMonthlyStake,
    updateStake,
    deleteStake,
    habits,
    checkIns,
    stakes,
    players,
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

  // Deep Analytics calculations
  const dailyDuelPoints = getWeeklyDailyDuelPoints(checkIns);
  const categoryBreakdown = getCategoryBreakdown(
    checkIns,
    habits,
    selectedTier === 'karma' ? 'karma' : 'weekly'
  );
  const stakesRecord = getStakesRecord(stakes);

  // Resolve stake handler with celebration audio & confetti
  const handleResolveStake = (winner: PlayerId | 'tie') => {
    if (!activeStake) return;
    soundEngine.playFanfare();
    hapticCelebration();
    fireCelebrationConfetti();

    updateStake({
      ...activeStake,
      status: 'completed',
      winnerId: winner,
    });
    setIsResolvingStake(false);
  };

  const handleTabChange = (tab: 'standings' | 'analytics' | 'history') => {
    soundEngine.playClick();
    hapticLight();
    setActiveDuelTab(tab);
  };

  const handleTierChange = (tier: LeaderboardTier) => {
    soundEngine.playClick();
    hapticLight();
    setSelectedTier(tier);
  };

  return (
    <div className="space-y-3.5 pb-24">
      {/* Tier Switcher Pill */}
      <div className="flex p-1 rounded-2xl glass-panel bg-zinc-900/60 border border-white/[0.08]">
        {(['weekly', 'monthly', 'yearly', 'karma'] as LeaderboardTier[]).map((tier) => (
          <button
            key={tier}
            onClick={() => handleTierChange(tier)}
            className={`flex-1 py-1.5 rounded-xl text-xs font-mono font-medium capitalize transition-all duration-200 ${
              selectedTier === tier
                ? 'bg-white/[0.1] text-white shadow-sm font-semibold'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {tier === 'karma' ? 'Karma ✨' : tier}
          </button>
        ))}
      </div>

      {/* Main Duel Arena Card */}
      <div className="rounded-2xl glass-card border border-white/[0.09] p-4.5 shadow-2xl relative overflow-hidden">
        {/* Ambient colored lighting behind players */}
        <div className="absolute top-0 left-0 w-36 h-36 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-0 right-0 w-36 h-36 bg-pink-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header with Countdown */}
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/[0.07] relative z-10">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-400 drop-shadow-[0_0_6px_rgba(245,158,11,0.5)]" />
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-200 font-mono">
              {selectedTier === 'karma' ? 'All-Time Karma Arena' : `${selectedTier} Duel`}
            </span>
          </div>

          {selectedTier === 'weekly' && (
            <div className="flex items-center gap-1.5 text-[10px] font-mono text-zinc-300 bg-zinc-900/80 px-2.5 py-1 rounded-lg border border-white/[0.08]">
              <Clock className="w-3 h-3 text-amber-400" />
              <span>
                {weekRemaining.days}d {weekRemaining.hours}h left
              </span>
            </div>
          )}

          {selectedTier === 'monthly' && (
            <div className="flex items-center gap-1.5 text-[10px] font-mono text-zinc-300 bg-zinc-900/80 px-2.5 py-1 rounded-lg border border-white/[0.08]">
              <Clock className="w-3 h-3 text-amber-400" />
              <span>{monthRemainingDays} days left</span>
            </div>
          )}
        </div>

        {/* Head to Head Numbers */}
        <div className="grid grid-cols-2 gap-4 items-center mb-4 relative z-10">
          {/* Maciek Card */}
          <div className="text-left p-3 rounded-2xl bg-blue-500/[0.06] border border-blue-500/20 shadow-sm">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-6 h-6 rounded-lg bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-300 shadow-[0_0_8px_rgba(59,130,246,0.3)]">
                <Zap className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs font-bold text-zinc-200">Maciek</span>
            </div>
            <div className="text-3xl font-extrabold font-mono text-white tracking-tight drop-shadow-sm">
              {comparison.maciekScore.toLocaleString()}
            </div>
            <span className="text-[10px] font-mono text-blue-400/80 font-medium tracking-wider uppercase">
              POINTS EARNED
            </span>
          </div>

          {/* Myrna Card */}
          <div className="text-right p-3 rounded-2xl bg-pink-500/[0.06] border border-pink-500/20 shadow-sm">
            <div className="flex items-center justify-end gap-2 mb-1.5">
              <span className="text-xs font-bold text-zinc-200">Myrna</span>
              <div className="w-6 h-6 rounded-lg bg-pink-500/20 border border-pink-500/40 flex items-center justify-center text-pink-300 shadow-[0_0_8px_rgba(236,72,153,0.3)]">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-3xl font-extrabold font-mono text-white tracking-tight drop-shadow-sm">
              {comparison.myrnaScore.toLocaleString()}
            </div>
            <span className="text-[10px] font-mono text-pink-400/80 font-medium tracking-wider uppercase">
              POINTS EARNED
            </span>
          </div>
        </div>

        {/* Split Comparison Tug-of-War Bar */}
        <div className="space-y-1.5 mb-4 relative z-10">
          <div className="relative h-3 w-full rounded-full bg-zinc-900/90 overflow-hidden flex p-0.5 border border-white/[0.08] shadow-inner">
            <div
              className="h-full rounded-l-full bg-gradient-to-r from-blue-600 to-blue-400 transition-all duration-700 shadow-[0_0_8px_rgba(59,130,246,0.5)]"
              style={{ width: `${comparison.maciekPct}%` }}
            />
            <div
              className="h-full rounded-r-full bg-gradient-to-r from-pink-400 to-pink-600 transition-all duration-700 shadow-[0_0_8px_rgba(236,72,153,0.5)]"
              style={{ width: `${comparison.myrnaPct}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] font-mono text-zinc-400 font-semibold px-0.5">
            <span className="text-blue-400">{comparison.maciekPct}%</span>
            <span className="text-pink-400">{comparison.myrnaPct}%</span>
          </div>
        </div>

        {/* Status Callout Pill */}
        <div
          className={`py-2 px-3.5 rounded-xl border flex items-center justify-center gap-2 text-xs font-semibold font-mono relative z-10 transition-all ${
            comparison.leader === 'maciek'
              ? 'bg-blue-500/10 border-blue-500/30 text-blue-200 shadow-[0_0_12px_rgba(59,130,246,0.15)]'
              : comparison.leader === 'myrna'
              ? 'bg-pink-500/10 border-pink-500/30 text-pink-200 shadow-[0_0_12px_rgba(236,72,153,0.15)]'
              : 'bg-zinc-900 border-white/[0.08] text-zinc-300'
          }`}
        >
          {comparison.leader === 'maciek' && (
            <>
              <Zap className="w-3.5 h-3.5 text-blue-400 drop-shadow-[0_0_4px_#60a5fa]" />
              <span>Maciek leads by {comparison.delta} pts</span>
            </>
          )}
          {comparison.leader === 'myrna' && (
            <>
              <Sparkles className="w-3.5 h-3.5 text-pink-400 drop-shadow-[0_0_4px_#f472b6]" />
              <span>Myrna leads by {comparison.delta} pts</span>
            </>
          )}
          {comparison.leader === 'tie' && (
            <>
              <Flame className="w-3.5 h-3.5 text-amber-400 animate-flame-pulse" />
              <span>Dead heat — exactly tied!</span>
            </>
          )}
        </div>
      </div>

      {/* Duel Sub-Tabs */}
      <div className="flex p-1 rounded-2xl glass-panel bg-zinc-900/60 border border-white/[0.08]">
        <button
          onClick={() => handleTabChange('standings')}
          className={`flex-1 py-1.5 rounded-xl text-xs font-mono font-medium transition-all ${
            activeDuelTab === 'standings' ? 'bg-white/[0.1] text-white shadow-sm font-semibold' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          Daily Battles
        </button>
        <button
          onClick={() => handleTabChange('analytics')}
          className={`flex-1 py-1.5 rounded-xl text-xs font-mono font-medium transition-all ${
            activeDuelTab === 'analytics' ? 'bg-white/[0.1] text-white shadow-sm font-semibold' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          Categories
        </button>
        <button
          onClick={() => handleTabChange('history')}
          className={`flex-1 py-1.5 rounded-xl text-xs font-mono font-medium transition-all ${
            activeDuelTab === 'history' ? 'bg-white/[0.1] text-white shadow-sm font-semibold' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          Wagers ({stakesRecord.totalCompleted})
        </button>
      </div>

      {/* VIEW 1: STANDINGS & ACTIVE STAKE */}
      {activeDuelTab === 'standings' && (
        <div className="space-y-3.5">
          {/* Active Stake / Wager Banner */}
          {activeStake && (
            <div className="rounded-2xl bg-gradient-to-b from-[#181410] to-[#0c0d10] border border-amber-500/30 p-4 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-28 h-28 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
              <div className="flex items-start justify-between gap-3 relative z-10">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 flex-shrink-0 shadow-[0_0_10px_rgba(245,158,11,0.25)]">
                    <Trophy className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                      Active {activeStake.period} Wager
                    </span>
                    <h3 className="text-sm font-bold text-white mt-1.5 truncate">{activeStake.title}</h3>
                    <p className="text-xs text-zinc-300 mt-1 leading-relaxed">
                      {activeStake.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => {
                      soundEngine.playClick();
                      setIsResolvingStake(true);
                    }}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-500 text-black text-xs font-mono font-bold hover:bg-amber-400 transition-all shadow-md active:scale-95"
                    title="Resolve winner for this wager"
                  >
                    <Crown className="w-3.5 h-3.5" />
                    <span>Resolve</span>
                  </button>
                  <button
                    onClick={() => {
                      soundEngine.playClick();
                      setEditTitle(activeStake.title);
                      setEditDesc(activeStake.description);
                      setIsEditingStake(true);
                    }}
                    className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/[0.05] transition-colors"
                    title="Edit active stake"
                  >
                    <Sliders className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      soundEngine.playClick();
                      deleteStake(activeStake.id);
                    }}
                    className="p-1.5 rounded-xl text-zinc-500 hover:text-red-400 hover:bg-white/[0.05] transition-colors"
                    title="Delete active stake"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Resolve Stake Celebration Modal */}
          {isResolvingStake && activeStake && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md px-4">
              <div className="w-full max-w-sm rounded-2xl glass-panel bg-zinc-950 border border-amber-500/30 p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Crown className="w-5 h-5 text-amber-400 drop-shadow-[0_0_8px_rgba(245,158,11,0.6)]" />
                    <h3 className="text-sm font-bold text-white font-mono">Resolve Wager Winner</h3>
                  </div>
                  <button onClick={() => setIsResolvingStake(false)} className="text-zinc-500 hover:text-white p-1">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <p className="text-xs text-zinc-300 leading-relaxed">
                  Who claimed victory for <span className="text-amber-300 font-bold">&ldquo;{activeStake.title}&rdquo;</span>?
                </p>

                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    onClick={() => handleResolveStake('maciek')}
                    className="p-3.5 rounded-xl bg-blue-500/15 border border-blue-500/40 hover:bg-blue-500/25 text-blue-200 font-bold text-xs flex flex-col items-center gap-1.5 transition-all active:scale-95 shadow-[0_0_12px_rgba(59,130,246,0.2)]"
                  >
                    <span className="text-xl">⚡</span>
                    <span>Maciek Won!</span>
                  </button>
                  <button
                    onClick={() => handleResolveStake('myrna')}
                    className="p-3.5 rounded-xl bg-pink-500/15 border border-pink-500/40 hover:bg-pink-500/25 text-pink-200 font-bold text-xs flex flex-col items-center gap-1.5 transition-all active:scale-95 shadow-[0_0_12px_rgba(236,72,153,0.2)]"
                  >
                    <span className="text-xl">✨</span>
                    <span>Myrna Won!</span>
                  </button>
                </div>

                <button
                  onClick={() => handleResolveStake('tie')}
                  className="w-full py-2.5 rounded-xl bg-zinc-900 border border-white/[0.08] text-zinc-400 hover:text-white text-xs font-mono transition-colors"
                >
                  It was an exact Tie 🤝
                </button>
              </div>
            </div>
          )}

          {/* Edit Stake Modal */}
          {isEditingStake && activeStake && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md px-4">
              <div className="w-full max-w-sm rounded-2xl glass-panel bg-zinc-950 border border-white/[0.1] p-5 shadow-2xl">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-white font-mono">Edit {activeStake.period} Wager</h3>
                  <button onClick={() => setIsEditingStake(false)} className="text-zinc-500 hover:text-white p-1">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!editTitle.trim()) return;
                    soundEngine.playClick();
                    updateStake({
                      ...activeStake,
                      title: editTitle,
                      description: editDesc,
                    });
                    setIsEditingStake(false);
                  }}
                  className="space-y-3.5"
                >
                  <div>
                    <label className="block text-[10px] font-mono text-zinc-400 mb-1 uppercase font-semibold">
                      Wager Title
                    </label>
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-white/[0.08] text-white text-xs focus:outline-none focus:border-zinc-400"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono text-zinc-400 mb-1 uppercase font-semibold">
                      Terms & Stakes
                    </label>
                    <textarea
                      value={editDesc}
                      onChange={(e) => setEditDesc(e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-white/[0.08] text-white text-xs focus:outline-none focus:border-zinc-400"
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.playClick();
                        deleteStake(activeStake.id);
                        setIsEditingStake(false);
                      }}
                      className="p-2.5 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 text-xs transition-colors"
                      title="Delete this wager"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditingStake(false)}
                      className="flex-1 py-2.5 rounded-xl border border-white/[0.08] text-zinc-400 text-xs hover:bg-zinc-900"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-2.5 rounded-xl bg-white text-black text-xs font-semibold hover:bg-zinc-200 shadow-sm"
                    >
                      Update Wager
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Weekly Day-by-Day Battles Bar Chart */}
          <div className="rounded-2xl glass-card border border-white/[0.08] p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-zinc-400" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-300 font-mono">
                  Weekly Daily Battles
                </h4>
              </div>
              <div className="flex items-center gap-3 text-[10px] font-mono font-semibold">
                <span className="flex items-center gap-1 text-blue-400">
                  <span className="w-2 h-2 rounded-full bg-blue-500" /> Maciek
                </span>
                <span className="flex items-center gap-1 text-pink-400">
                  <span className="w-2 h-2 rounded-full bg-pink-500" /> Myrna
                </span>
              </div>
            </div>

            {/* Daily Bars */}
            <div className="space-y-2">
              {dailyDuelPoints.map((point) => {
                const total = point.maciekPoints + point.myrnaPoints;
                const mPct = total === 0 ? 50 : Math.round((point.maciekPoints / total) * 100);
                const yPct = total === 0 ? 50 : 100 - mPct;
                const winner =
                  point.maciekPoints > point.myrnaPoints
                    ? 'maciek'
                    : point.myrnaPoints > point.maciekPoints
                    ? 'myrna'
                    : 'tie';

                return (
                  <div
                    key={point.dateStr}
                    className={`p-2.5 rounded-xl border transition-all ${
                      point.isToday
                        ? 'bg-zinc-900/90 border-white/[0.15] shadow-xs'
                        : point.isFuture
                        ? 'bg-zinc-900/20 border-transparent opacity-30'
                        : 'bg-zinc-900/40 border-white/[0.04]'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px] font-mono mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className={`font-semibold ${point.isToday ? 'text-white' : 'text-zinc-400'}`}>
                          {point.dayName} {point.isToday && '(Today)'}
                        </span>
                        {!point.isFuture && total > 0 && (
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                              winner === 'maciek'
                                ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                : winner === 'myrna'
                                ? 'bg-pink-500/10 text-pink-400 border border-pink-500/20'
                                : 'text-zinc-500'
                            }`}
                          >
                            {winner === 'maciek' ? '⚡ Maciek' : winner === 'myrna' ? '✨ Myrna' : 'Tie'}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 font-mono font-semibold">
                        <span className="text-blue-400">{point.maciekPoints} pts</span>
                        <span className="text-zinc-600">:</span>
                        <span className="text-pink-400">{point.myrnaPoints} pts</span>
                      </div>
                    </div>

                    {/* Progress track */}
                    <div className="h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden flex">
                      <div
                        className="h-full bg-blue-500 transition-all duration-500"
                        style={{ width: `${mPct}%` }}
                      />
                      <div
                        className="h-full bg-pink-500 transition-all duration-500"
                        style={{ width: `${yPct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Live Mutual Today Activity */}
          <div className="rounded-2xl glass-card border border-white/[0.08] p-4 shadow-sm">
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-300 font-mono mb-3">
              Today&apos;s Real-Time Habit Parity
            </h4>

            <div className="grid grid-cols-2 gap-2 text-xs">
              {/* Maciek Column */}
              <div className="space-y-1.5">
                <div className="text-[11px] font-mono text-blue-400 font-bold pb-1 border-b border-white/[0.06] flex items-center justify-between">
                  <span>⚡ Maciek</span>
                  <span>{maciekSummary.today} pts</span>
                </div>
                {maciekHabits.map((h) => {
                  const checkIn = checkIns.find((c) => c.habitId === h.id && c.date === todayStr);
                  const done = !!checkIn;
                  const proofPhotos = checkIn?.proofUrls && checkIn.proofUrls.length > 0
                    ? checkIn.proofUrls
                    : checkIn?.proofUrl
                    ? [checkIn.proofUrl]
                    : [];

                  return (
                    <div
                      key={h.id}
                      className={`flex items-center gap-1.5 p-1.5 rounded-xl border text-[11px] transition-colors ${
                        done
                          ? 'bg-blue-500/10 border-blue-500/20 text-white'
                          : 'bg-zinc-900/40 border-white/[0.04] text-zinc-500'
                      }`}
                    >
                      <div
                        className={`w-3.5 h-3.5 rounded flex items-center justify-center flex-shrink-0 ${
                          done ? 'bg-blue-500 text-white shadow-xs' : 'border border-zinc-700'
                        }`}
                      >
                        {done && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                      </div>
                      <span className="truncate flex-1">{h.title}</span>

                      {proofPhotos.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            soundEngine.playClick();
                            setActiveProofView({ habit: h, checkIn: checkIn!, player: players.maciek });
                          }}
                          className="flex items-center gap-1 text-[9px] font-mono text-emerald-400 hover:text-emerald-300 bg-emerald-500/15 hover:bg-emerald-500/25 px-1.5 py-0.5 rounded border border-emerald-500/30 flex-shrink-0 transition-colors"
                          title="View Maciek's proof photos"
                        >
                          <Camera className="w-2.5 h-2.5" />
                          <span>{proofPhotos.length > 1 ? proofPhotos.length : 'Proof'}</span>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Myrna Column */}
              <div className="space-y-1.5">
                <div className="text-[11px] font-mono text-pink-400 font-bold pb-1 border-b border-white/[0.06] flex items-center justify-between">
                  <span>✨ Myrna</span>
                  <span>{myrnaSummary.today} pts</span>
                </div>
                {myrnaHabits.map((h) => {
                  const checkIn = checkIns.find((c) => c.habitId === h.id && c.date === todayStr);
                  const done = !!checkIn;
                  const proofPhotos = checkIn?.proofUrls && checkIn.proofUrls.length > 0
                    ? checkIn.proofUrls
                    : checkIn?.proofUrl
                    ? [checkIn.proofUrl]
                    : [];

                  return (
                    <div
                      key={h.id}
                      className={`flex items-center gap-1.5 p-1.5 rounded-xl border text-[11px] transition-colors ${
                        done
                          ? 'bg-pink-500/10 border-pink-500/20 text-white'
                          : 'bg-zinc-900/40 border-white/[0.04] text-zinc-500'
                      }`}
                    >
                      <div
                        className={`w-3.5 h-3.5 rounded flex items-center justify-center flex-shrink-0 ${
                          done ? 'bg-pink-500 text-white shadow-xs' : 'border border-zinc-700'
                        }`}
                      >
                        {done && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                      </div>
                      <span className="truncate flex-1">{h.title}</span>

                      {proofPhotos.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            soundEngine.playClick();
                            setActiveProofView({ habit: h, checkIn: checkIn!, player: players.myrna });
                          }}
                          className="flex items-center gap-1 text-[9px] font-mono text-emerald-400 hover:text-emerald-300 bg-emerald-500/15 hover:bg-emerald-500/25 px-1.5 py-0.5 rounded border border-emerald-500/30 flex-shrink-0 transition-colors"
                          title="View Myrna's proof photos"
                        >
                          <Camera className="w-2.5 h-2.5" />
                          <span>{proofPhotos.length > 1 ? proofPhotos.length : 'Proof'}</span>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: CATEGORY DOMINANCE MATRIX */}
      {activeDuelTab === 'analytics' && (
        <div className="space-y-3">
          <div className="rounded-2xl glass-card border border-white/[0.08] p-4 space-y-3 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-200 font-mono">
                  Category Dominance Matrix
                </h4>
                <p className="text-[11px] text-zinc-400 font-mono">
                  Points by habit discipline ({selectedTier})
                </p>
              </div>
              <PieChart className="w-4 h-4 text-zinc-500" />
            </div>

            <div className="space-y-2.5 pt-1">
              {categoryBreakdown.map((cat) => {
                const total = cat.maciekPoints + cat.myrnaPoints;
                const mPct = total === 0 ? 50 : Math.round((cat.maciekPoints / total) * 100);
                const yPct = total === 0 ? 50 : 100 - mPct;

                return (
                  <div key={cat.category} className="p-2.5 rounded-xl bg-zinc-900/60 border border-white/[0.06] space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="font-semibold text-zinc-200">{cat.label}</span>
                      <div className="flex items-center gap-2 font-bold">
                        <span className="text-blue-400">{cat.maciekPoints}</span>
                        <span className="text-zinc-600">:</span>
                        <span className="text-pink-400">{cat.myrnaPoints}</span>
                      </div>
                    </div>

                    <div className="h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden flex">
                      <div
                        className="h-full bg-blue-500 transition-all duration-500"
                        style={{ width: `${mPct}%` }}
                      />
                      <div
                        className="h-full bg-pink-500 transition-all duration-500"
                        style={{ width: `${yPct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* VIEW 3: STAKES & WAGERS LEDGER */}
      {activeDuelTab === 'history' && (
        <div className="space-y-3.5">
          {/* Win / Loss Head-to-Head Banner */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl glass-card border border-blue-500/25 p-4 text-center shadow-sm">
              <span className="text-[10px] font-mono uppercase font-bold text-zinc-400">⚡ Maciek Wagers Won</span>
              <div className="text-3xl font-extrabold font-mono text-blue-400 mt-1">
                {stakesRecord.maciekWins}
              </div>
            </div>
            <div className="rounded-2xl glass-card border border-pink-500/25 p-4 text-center shadow-sm">
              <span className="text-[10px] font-mono uppercase font-bold text-zinc-400">✨ Myrna Wagers Won</span>
              <div className="text-3xl font-extrabold font-mono text-pink-400 mt-1">
                {stakesRecord.myrnaWins}
              </div>
            </div>
          </div>

          {/* Completed Stakes List */}
          <div className="rounded-2xl glass-card border border-white/[0.08] p-4 space-y-2.5 shadow-sm">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-200 font-mono">
                Stakes Hall of Champions
              </h4>
              <Award className="w-4 h-4 text-amber-400" />
            </div>

            {stakesRecord.history.length === 0 ? (
              <p className="text-xs text-zinc-500 py-4 text-center font-mono">
                No past stakes completed yet. Current stakes are still active!
              </p>
            ) : (
              stakesRecord.history.map((stake) => {
                const winner = stake.winnerId ? players[stake.winnerId as PlayerId] : null;
                const isMaciek = stake.winnerId === 'maciek';

                return (
                  <div
                    key={stake.id}
                    className="p-3 rounded-xl bg-zinc-900/50 border border-white/[0.06] space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white truncate">{stake.title}</span>
                      {winner ? (
                        <span
                          className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                            isMaciek
                              ? 'bg-blue-500/10 border-blue-500/25 text-blue-300'
                              : 'bg-pink-500/10 border-pink-500/25 text-pink-300'
                          }`}
                        >
                          Winner: {winner.name} {winner.avatar}
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono text-zinc-500">Tie 🤝</span>
                      )}
                    </div>
                    <p className="text-[11px] text-zinc-400">{stake.description}</p>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Proof Gallery Lightbox Modal */}
      {activeProofView && (
        <ProofGalleryModal
          isOpen={activeProofView !== null}
          onClose={() => setActiveProofView(null)}
          playerName={activeProofView.player.name}
          playerAvatar={activeProofView.player.avatar}
          habitTitle={activeProofView.habit.title}
          images={
            activeProofView.checkIn.proofUrls && activeProofView.checkIn.proofUrls.length > 0
              ? activeProofView.checkIn.proofUrls
              : activeProofView.checkIn.proofUrl
              ? [activeProofView.checkIn.proofUrl]
              : []
          }
          date={activeProofView.checkIn.date}
          completedAt={activeProofView.checkIn.completedAt}
        />
      )}
    </div>
  );
}
