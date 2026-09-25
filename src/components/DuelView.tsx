'use client';

import React, { useState } from 'react';
import { useStore } from '@/lib/store';
import { LeaderboardTier, Habit, CheckIn, Player, PlayerId } from '@/lib/types';
import { getCategoryBreakdown, getStakesRecord, getWeeklyDailyDuelPoints } from '@/lib/score-calculator';
import { getDaysRemainingInMonth, getDaysRemainingInWeek, getTodayDateString } from '@/lib/date-utils';
import {
  Camera,
  Check,
  Clock,
  Crown,
  Sliders,
  Trash2,
  Trophy,
  X,
} from 'lucide-react';
import { ProofGalleryModal } from './ProofGalleryModal';

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

  const activeStake =
    selectedTier === 'monthly'
      ? activeMonthlyStake
      : selectedTier === 'weekly'
      ? activeWeeklyStake
      : null;

  const maciekHabits = habits.filter((h) => h.playerId === 'maciek' && h.isActive);
  const myrnaHabits = habits.filter((h) => h.playerId === 'myrna' && h.isActive);

  const dailyDuelPoints = getWeeklyDailyDuelPoints(checkIns);
  const categoryBreakdown = getCategoryBreakdown(
    checkIns,
    habits,
    selectedTier === 'karma' ? 'karma' : 'weekly'
  );
  const stakesRecord = getStakesRecord(stakes);

  const handleResolveStake = (winner: PlayerId | 'tie') => {
    if (!activeStake) return;
    updateStake({
      ...activeStake,
      status: 'completed',
      winnerId: winner,
    });
    setIsResolvingStake(false);
  };

  return (
    <div className="space-y-4">
      {/* Tier Switcher Pill (Apple Segmented Control) */}
      <div className="flex p-1 rounded-full bg-[#1c1c1e] border border-white/[0.08]">
        {(['weekly', 'monthly', 'yearly', 'karma'] as LeaderboardTier[]).map((tier) => (
          <button
            key={tier}
            onClick={() => setSelectedTier(tier)}
            className={`flex-1 py-1.5 rounded-full text-xs font-medium capitalize transition-all ${
              selectedTier === tier
                ? 'bg-[#2c2c2e] text-white shadow-sm font-semibold'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            {tier}
          </button>
        ))}
      </div>

      {/* Main Apple Fitness Competition Card */}
      <div className="rounded-2xl bg-[#1c1c1e] border border-white/[0.08] p-4 space-y-4">
        {/* Top: Tier Name + Countdown */}
        <div className="flex items-center justify-between text-xs font-medium">
          <span className="text-zinc-400 uppercase tracking-wider text-[11px]">
            {selectedTier === 'karma' ? 'Lifetime Karma' : `${selectedTier} Duel`}
          </span>

          {selectedTier === 'weekly' && (
            <span className="text-zinc-400 flex items-center gap-1 text-[11px]">
              <Clock className="w-3 h-3 text-zinc-500" />
              {weekRemaining.days}d {weekRemaining.hours}h left
            </span>
          )}

          {selectedTier === 'monthly' && (
            <span className="text-zinc-400 flex items-center gap-1 text-[11px]">
              <Clock className="w-3 h-3 text-zinc-500" />
              {monthRemainingDays}d left
            </span>
          )}
        </div>

        {/* Head-to-Head Scores */}
        <div className="flex items-center justify-between">
          {/* Maciek */}
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              <span className="text-xs font-semibold text-zinc-300">Maciek</span>
            </div>
            <div className="text-3xl font-bold tracking-tight text-white tabular-nums">
              {comparison.maciekScore.toLocaleString()}
            </div>
          </div>

          {/* Lead Pill */}
          <div className="text-center">
            <span
              className={`inline-block px-3 py-1 rounded-full text-xs font-semibold border ${
                comparison.leader === 'maciek'
                  ? 'bg-blue-500/15 border-blue-500/30 text-blue-400'
                  : comparison.leader === 'myrna'
                  ? 'bg-pink-500/15 border-pink-500/30 text-pink-400'
                  : 'bg-white/[0.06] border-white/[0.08] text-zinc-400'
              }`}
            >
              {comparison.leader === 'maciek' && `+${comparison.delta}`}
              {comparison.leader === 'myrna' && `+${comparison.delta}`}
              {comparison.leader === 'tie' && 'Tied'}
            </span>
          </div>

          {/* Myrna */}
          <div className="text-right">
            <div className="flex items-center justify-end gap-1.5 mb-1">
              <span className="text-xs font-semibold text-zinc-300">Myrna</span>
              <span className="w-2 h-2 rounded-full bg-pink-500" />
            </div>
            <div className="text-3xl font-bold tracking-tight text-white tabular-nums">
              {comparison.myrnaScore.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Apple Style Dual Progress Bar */}
        <div className="space-y-1">
          <div className="h-2 w-full rounded-full bg-zinc-800 overflow-hidden flex">
            <div
              className="h-full bg-blue-500 transition-all duration-500"
              style={{ width: `${comparison.maciekPct}%` }}
            />
            <div
              className="h-full bg-pink-500 transition-all duration-500"
              style={{ width: `${comparison.myrnaPct}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-zinc-500 font-medium tabular-nums">
            <span>{comparison.maciekPct}%</span>
            <span>{comparison.myrnaPct}%</span>
          </div>
        </div>
      </div>

      {/* Duel Sub-Tabs: Daily | Categories | Wagers */}
      <div className="flex p-1 rounded-full bg-[#1c1c1e] border border-white/[0.08]">
        <button
          onClick={() => setActiveDuelTab('standings')}
          className={`flex-1 py-1.5 rounded-full text-xs font-medium transition-all ${
            activeDuelTab === 'standings' ? 'bg-[#2c2c2e] text-white shadow-sm font-semibold' : 'text-zinc-400 hover:text-white'
          }`}
        >
          Daily Battles
        </button>
        <button
          onClick={() => setActiveDuelTab('analytics')}
          className={`flex-1 py-1.5 rounded-full text-xs font-medium transition-all ${
            activeDuelTab === 'analytics' ? 'bg-[#2c2c2e] text-white shadow-sm font-semibold' : 'text-zinc-400 hover:text-white'
          }`}
        >
          Categories
        </button>
        <button
          onClick={() => setActiveDuelTab('history')}
          className={`flex-1 py-1.5 rounded-full text-xs font-medium transition-all ${
            activeDuelTab === 'history' ? 'bg-[#2c2c2e] text-white shadow-sm font-semibold' : 'text-zinc-400 hover:text-white'
          }`}
        >
          Wagers ({stakesRecord.totalCompleted})
        </button>
      </div>

      {/* VIEW 1: STANDINGS & DAILY BATTLES */}
      {activeDuelTab === 'standings' && (
        <div className="space-y-3">
          {/* Active Wager Card */}
          {activeStake && (
            <div className="rounded-2xl bg-[#1c1c1e] border border-amber-500/20 p-4 space-y-2.5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 flex-shrink-0">
                    <Trophy className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] uppercase font-semibold text-amber-400 tracking-wider">
                      {activeStake.period} Wager
                    </div>
                    <div className="text-sm font-bold text-white mt-0.5 truncate">{activeStake.title}</div>
                    <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed">{activeStake.description}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => setIsResolvingStake(true)}
                    className="px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-medium hover:bg-amber-500/25 transition-colors"
                  >
                    Resolve
                  </button>
                  <button
                    onClick={() => {
                      setEditTitle(activeStake.title);
                      setEditDesc(activeStake.description);
                      setIsEditingStake(true);
                    }}
                    className="p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors"
                    title="Edit wager"
                  >
                    <Sliders className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => deleteStake(activeStake.id)}
                    className="p-1.5 rounded-full text-zinc-500 hover:text-red-400 hover:bg-white/[0.06] transition-colors"
                    title="Delete wager"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Daily Battles */}
          <div className="rounded-2xl bg-[#1c1c1e] border border-white/[0.08] p-4 space-y-3">
            <div className="text-xs font-semibold text-zinc-300">
              Weekly Battles
            </div>

            <div className="space-y-2">
              {dailyDuelPoints.map((point) => {
                const total = point.maciekPoints + point.myrnaPoints;
                const mPct = total === 0 ? 50 : Math.round((point.maciekPoints / total) * 100);
                const yPct = total === 0 ? 50 : 100 - mPct;

                return (
                  <div
                    key={point.dateStr}
                    className={`p-2.5 rounded-xl border transition-colors ${
                      point.isToday
                        ? 'bg-[#2c2c2e] border-white/[0.12]'
                        : point.isFuture
                        ? 'bg-transparent border-transparent opacity-30'
                        : 'bg-white/[0.02] border-white/[0.04]'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className={`font-medium ${point.isToday ? 'text-white font-semibold' : 'text-zinc-400'}`}>
                        {point.dayName} {point.isToday && '· Today'}
                      </span>
                      <div className="flex items-center gap-2 font-medium tabular-nums">
                        <span className="text-blue-400">{point.maciekPoints}</span>
                        <span className="text-zinc-600">:</span>
                        <span className="text-pink-400">{point.myrnaPoints}</span>
                      </div>
                    </div>

                    <div className="h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden flex">
                      <div
                        className="h-full bg-blue-500 transition-all duration-300"
                        style={{ width: `${mPct}%` }}
                      />
                      <div
                        className="h-full bg-pink-500 transition-all duration-300"
                        style={{ width: `${yPct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Today's Live Parity */}
          <div className="rounded-2xl bg-[#1c1c1e] border border-white/[0.08] p-4 space-y-3">
            <div className="text-xs font-semibold text-zinc-300">
              Today&apos;s Checked Habits
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              {/* Maciek */}
              <div className="space-y-1.5">
                <div className="text-[11px] font-semibold text-blue-400 pb-1 border-b border-white/[0.06]">
                  Maciek ({maciekSummary.today} pts)
                </div>
                {maciekHabits.map((h) => {
                  const checkIn = checkIns.find((c) => c.habitId === h.id && c.date === todayStr);
                  const done = !!checkIn;
                  const photos = checkIn?.proofUrls && checkIn.proofUrls.length > 0
                    ? checkIn.proofUrls
                    : checkIn?.proofUrl
                    ? [checkIn.proofUrl]
                    : [];

                  return (
                    <div
                      key={h.id}
                      className={`flex items-center gap-1.5 p-1.5 rounded-xl border text-[11px] ${
                        done
                          ? 'bg-blue-500/10 border-blue-500/20 text-white'
                          : 'bg-white/[0.02] border-white/[0.04] text-zinc-500'
                      }`}
                    >
                      <div
                        className={`w-3.5 h-3.5 rounded-full flex items-center justify-center flex-shrink-0 ${
                          done ? 'bg-blue-500 text-white' : 'border border-zinc-700'
                        }`}
                      >
                        {done && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                      </div>
                      <span className="truncate flex-1">{h.title}</span>

                      {photos.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setActiveProofView({ habit: h, checkIn: checkIn!, player: players.maciek })}
                          className="text-emerald-400 p-0.5"
                          title="View proof photos"
                        >
                          <Camera className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Myrna */}
              <div className="space-y-1.5">
                <div className="text-[11px] font-semibold text-pink-400 pb-1 border-b border-white/[0.06]">
                  Myrna ({myrnaSummary.today} pts)
                </div>
                {myrnaHabits.map((h) => {
                  const checkIn = checkIns.find((c) => c.habitId === h.id && c.date === todayStr);
                  const done = !!checkIn;
                  const photos = checkIn?.proofUrls && checkIn.proofUrls.length > 0
                    ? checkIn.proofUrls
                    : checkIn?.proofUrl
                    ? [checkIn.proofUrl]
                    : [];

                  return (
                    <div
                      key={h.id}
                      className={`flex items-center gap-1.5 p-1.5 rounded-xl border text-[11px] ${
                        done
                          ? 'bg-pink-500/10 border-pink-500/20 text-white'
                          : 'bg-white/[0.02] border-white/[0.04] text-zinc-500'
                      }`}
                    >
                      <div
                        className={`w-3.5 h-3.5 rounded-full flex items-center justify-center flex-shrink-0 ${
                          done ? 'bg-pink-500 text-white' : 'border border-zinc-700'
                        }`}
                      >
                        {done && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                      </div>
                      <span className="truncate flex-1">{h.title}</span>

                      {photos.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setActiveProofView({ habit: h, checkIn: checkIn!, player: players.myrna })}
                          className="text-emerald-400 p-0.5"
                          title="View proof photos"
                        >
                          <Camera className="w-3 h-3" />
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

      {/* VIEW 2: CATEGORY MATRIX */}
      {activeDuelTab === 'analytics' && (
        <div className="rounded-2xl bg-[#1c1c1e] border border-white/[0.08] p-4 space-y-3">
          <div className="text-xs font-semibold text-zinc-300">
            Category Breakdown ({selectedTier})
          </div>

          <div className="space-y-2 pt-1">
            {categoryBreakdown.map((cat) => {
              const total = cat.maciekPoints + cat.myrnaPoints;
              const mPct = total === 0 ? 50 : Math.round((cat.maciekPoints / total) * 100);
              const yPct = total === 0 ? 50 : 100 - mPct;

              return (
                <div key={cat.category} className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04] space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-white">{cat.label}</span>
                    <div className="flex items-center gap-2 tabular-nums">
                      <span className="text-blue-400 font-semibold">{cat.maciekPoints}</span>
                      <span className="text-zinc-600">:</span>
                      <span className="text-pink-400 font-semibold">{cat.myrnaPoints}</span>
                    </div>
                  </div>

                  <div className="h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden flex">
                    <div
                      className="h-full bg-blue-500 transition-all duration-300"
                      style={{ width: `${mPct}%` }}
                    />
                    <div
                      className="h-full bg-pink-500 transition-all duration-300"
                      style={{ width: `${yPct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW 3: WAGERS HISTORY */}
      {activeDuelTab === 'history' && (
        <div className="space-y-3">
          {/* Win / Loss Cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-[#1c1c1e] border border-blue-500/20 p-4 text-center">
              <span className="text-[10px] font-semibold uppercase text-zinc-400">Maciek Won</span>
              <div className="text-3xl font-bold text-blue-400 mt-1 tabular-nums">
                {stakesRecord.maciekWins}
              </div>
            </div>
            <div className="rounded-2xl bg-[#1c1c1e] border border-pink-500/20 p-4 text-center">
              <span className="text-[10px] font-semibold uppercase text-zinc-400">Myrna Won</span>
              <div className="text-3xl font-bold text-pink-400 mt-1 tabular-nums">
                {stakesRecord.myrnaWins}
              </div>
            </div>
          </div>

          {/* Completed Stakes List */}
          <div className="rounded-2xl bg-[#1c1c1e] border border-white/[0.08] p-4 space-y-2.5">
            <div className="text-xs font-semibold text-zinc-300">
              Completed Wagers
            </div>

            {stakesRecord.history.length === 0 ? (
              <p className="text-xs text-zinc-500 py-3 text-center">
                No completed wagers yet.
              </p>
            ) : (
              stakesRecord.history.map((stake) => {
                const winner = stake.winnerId ? players[stake.winnerId as PlayerId] : null;
                const isMaciek = stake.winnerId === 'maciek';

                return (
                  <div
                    key={stake.id}
                    className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-white truncate">{stake.title}</span>
                      {winner ? (
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                            isMaciek
                              ? 'bg-blue-500/10 border-blue-500/20 text-blue-300'
                              : 'bg-pink-500/10 border-pink-500/20 text-pink-300'
                          }`}
                        >
                          {winner.name} won
                        </span>
                      ) : (
                        <span className="text-[10px] text-zinc-400">Tied</span>
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

      {/* Resolve Stake Modal (Apple Sheet style) */}
      {isResolvingStake && activeStake && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md px-4">
          <div className="w-full max-w-sm rounded-3xl bg-[#1c1c1e] border border-white/[0.12] p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Crown className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-semibold text-white">Resolve Wager</h3>
              </div>
              <button onClick={() => setIsResolvingStake(false)} className="text-zinc-400 hover:text-white p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-zinc-300">
              Who won <span className="text-white font-semibold">&ldquo;{activeStake.title}&rdquo;</span>?
            </p>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleResolveStake('maciek')}
                className="p-3 rounded-2xl bg-blue-500/15 border border-blue-500/30 hover:bg-blue-500/25 text-blue-300 font-medium text-xs flex flex-col items-center gap-1 transition-colors"
              >
                <span>⚡ Maciek</span>
              </button>
              <button
                onClick={() => handleResolveStake('myrna')}
                className="p-3 rounded-2xl bg-pink-500/15 border border-pink-500/30 hover:bg-pink-500/25 text-pink-300 font-medium text-xs flex flex-col items-center gap-1 transition-colors"
              >
                <span>✨ Myrna</span>
              </button>
            </div>

            <button
              onClick={() => handleResolveStake('tie')}
              className="w-full py-2.5 rounded-2xl bg-[#2c2c2e] text-zinc-300 hover:text-white text-xs font-medium transition-colors"
            >
              Tied
            </button>
          </div>
        </div>
      )}

      {/* Edit Stake Modal (Apple Sheet style) */}
      {isEditingStake && activeStake && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md px-4">
          <div className="w-full max-w-sm rounded-3xl bg-[#1c1c1e] border border-white/[0.12] p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">Edit Wager</h3>
              <button onClick={() => setIsEditingStake(false)} className="text-zinc-400 hover:text-white p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!editTitle.trim()) return;
                updateStake({
                  ...activeStake,
                  title: editTitle,
                  description: editDesc,
                });
                setIsEditingStake(false);
              }}
              className="space-y-3"
            >
              <div>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="Wager title"
                  className="w-full px-3 py-2 rounded-xl bg-[#2c2c2e] border border-white/[0.08] text-white text-xs focus:outline-none focus:border-zinc-400"
                  required
                />
              </div>

              <div>
                <textarea
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  rows={2}
                  placeholder="Terms and reward"
                  className="w-full px-3 py-2 rounded-xl bg-[#2c2c2e] border border-white/[0.08] text-white text-xs focus:outline-none focus:border-zinc-400"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsEditingStake(false)}
                  className="flex-1 py-2 rounded-xl border border-white/[0.08] text-zinc-400 text-xs font-medium hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-white text-black text-xs font-semibold hover:bg-zinc-200"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Proof Gallery Modal */}
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
