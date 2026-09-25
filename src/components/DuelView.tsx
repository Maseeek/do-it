'use client';

import React, { useState } from 'react';
import { useStore } from '@/lib/store';
import { LeaderboardTier, Habit, CheckIn, Player, PlayerId, StakePeriod } from '@/lib/types';
import { getCategoryBreakdown, getStakesRecord, getWeeklyDailyDuelPoints } from '@/lib/score-calculator';
import { getDaysRemainingInMonth, getDaysRemainingInWeek, getMonthKey, getTodayDateString, getWeekKey } from '@/lib/date-utils';
import {
  Camera,
  Check,
  Clock,
  Crown,
  Plus,
  Sliders,
  Trash2,
  Trophy,
  X,
} from 'lucide-react';
import { ProofGalleryModal } from './ProofGalleryModal';
import { soundEngine } from '@/lib/sound-utils';
import { hapticLight, hapticSuccess } from '@/lib/haptic-utils';
import { fireCelebrationConfetti } from '@/lib/confetti';

export function DuelView() {
  const [selectedTier, setSelectedTier] = useState<LeaderboardTier>('weekly');
  const [isEditingStake, setIsEditingStake] = useState(false);
  const [isCreatingStake, setIsCreatingStake] = useState(false);
  const [isResolvingStake, setIsResolvingStake] = useState(false);
  const [stakeTitle, setStakeTitle] = useState('');
  const [stakeDesc, setStakeDesc] = useState('');
  const [stakePeriod, setStakePeriod] = useState<StakePeriod>('weekly');
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
    addStake,
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
    soundEngine.playFanfare();
    fireCelebrationConfetti();
    hapticSuccess();
    updateStake({
      ...activeStake,
      status: 'completed',
      winnerId: winner,
    });
    setIsResolvingStake(false);
  };

  const handleSaveNewStake = (e: React.FormEvent) => {
    e.preventDefault();
    if (!stakeTitle.trim()) return;

    soundEngine.playCheck();
    hapticSuccess();
    const periodKey = stakePeriod === 'weekly' ? getWeekKey(todayStr) : getMonthKey(todayStr);
    addStake({
      period: stakePeriod,
      periodKey,
      title: stakeTitle.trim(),
      description: stakeDesc.trim(),
      status: 'active',
      dueDate: todayStr,
    });

    setStakeTitle('');
    setStakeDesc('');
    setIsCreatingStake(false);
  };

  return (
    <div className="space-y-4">
      {/* Timeframe Segmented Control (Apple 3-Pill) */}
      <div className="flex p-1 rounded-full bg-[#1c1c1e] border border-white/[0.08]">
        {(
          [
            { id: 'weekly', label: 'Week' },
            { id: 'monthly', label: 'Month' },
            { id: 'karma', label: 'All-Time' },
          ] as { id: LeaderboardTier; label: string }[]
        ).map((t) => (
          <button
            key={t.id}
            onClick={() => {
              if (selectedTier !== t.id) {
                soundEngine.playClick();
                hapticLight();
                setSelectedTier(t.id);
              }
            }}
            className={`flex-1 py-1.5 rounded-full text-xs font-medium transition-all ${
              selectedTier === t.id
                ? 'bg-[#2c2c2e] text-white shadow-sm font-semibold'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Main Apple Fitness Competition Card */}
      <div className="rounded-2xl bg-[#1c1c1e] border border-white/[0.08] p-4 space-y-4">
        {/* Top: Tier Name + Countdown */}
        <div className="flex items-center justify-between text-xs font-medium">
          <span className="text-zinc-400 uppercase tracking-wider text-[11px]">
            {selectedTier === 'karma' ? 'All-Time Karma' : `${selectedTier === 'weekly' ? 'Weekly' : 'Monthly'} Duel`}
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

        {/* Apple Dual Activity Bar */}
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

      {/* Wager Card */}
      <div className="rounded-2xl bg-[#1c1c1e] border border-white/[0.08] p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-semibold text-zinc-300">
              {activeStake ? `${activeStake.period === 'weekly' ? 'Weekly' : 'Monthly'} Wager` : 'Wagers'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-zinc-500 tabular-nums">
              Wins: Maciek {stakesRecord.maciekWins} · Myrna {stakesRecord.myrnaWins}
            </span>
            {!activeStake && (
              <button
                onClick={() => {
                  soundEngine.playClick();
                  hapticLight();
                  setIsCreatingStake(true);
                }}
                className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white text-black font-semibold text-[11px] hover:bg-zinc-200 transition-colors"
              >
                <Plus className="w-3 h-3" />
                <span>Set</span>
              </button>
            )}
          </div>
        </div>

        {activeStake ? (
          <div className="flex items-start justify-between gap-3 pt-1">
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-white truncate">{activeStake.title}</div>
              {activeStake.description && (
                <p className="text-xs text-zinc-400 mt-0.5">{activeStake.description}</p>
              )}
            </div>

            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button
                onClick={() => {
                  soundEngine.playClick();
                  hapticLight();
                  setIsResolvingStake(true);
                }}
                className="px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-medium hover:bg-amber-500/25 transition-colors"
              >
                Resolve
              </button>
              <button
                onClick={() => {
                  soundEngine.playClick();
                  hapticLight();
                  setStakeTitle(activeStake.title);
                  setStakeDesc(activeStake.description);
                  setIsEditingStake(true);
                }}
                className="p-1.5 rounded-full text-zinc-400 hover:text-white"
                title="Edit wager"
              >
                <Sliders className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => {
                  if (confirm('Delete this wager?')) {
                    soundEngine.playClick();
                    hapticLight();
                    deleteStake(activeStake.id);
                  }
                }}
                className="p-1.5 rounded-full text-zinc-500 hover:text-red-400"
                title="Delete wager"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : (
          <div className="text-xs text-zinc-400">
            No active wager set for this period.
          </div>
        )}
      </div>

      {/* Today's Checked Habits Parity */}
      <div className="rounded-2xl bg-[#1c1c1e] border border-white/[0.08] p-4 space-y-3">
        <div className="text-xs font-semibold text-zinc-300">
          Today&apos;s Habits
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
                      onClick={() => {
                        soundEngine.playClick();
                        hapticLight();
                        setActiveProofView({ habit: h, checkIn: checkIn!, player: players.maciek });
                      }}
                      className="text-emerald-400 p-0.5 hover:text-emerald-300 transition-colors"
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
                      onClick={() => {
                        soundEngine.playClick();
                        hapticLight();
                        setActiveProofView({ habit: h, checkIn: checkIn!, player: players.myrna });
                      }}
                      className="text-emerald-400 p-0.5 hover:text-emerald-300 transition-colors"
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

      {/* Weekly Daily Battles */}
      <div className="rounded-2xl bg-[#1c1c1e] border border-white/[0.08] p-4 space-y-3">
        <div className="text-xs font-semibold text-zinc-300">
          Daily Battles
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

      {/* Category Breakdown */}
      <div className="rounded-2xl bg-[#1c1c1e] border border-white/[0.08] p-4 space-y-3">
        <div className="text-xs font-semibold text-zinc-300">
          Categories ({selectedTier === 'karma' ? 'All-Time' : selectedTier})
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

      {/* Resolve Wager Modal */}
      {isResolvingStake && activeStake && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md px-4"
          onClick={() => {
            soundEngine.playClick();
            hapticLight();
            setIsResolvingStake(false);
          }}
        >
          <div
            className="w-full max-w-sm rounded-3xl bg-[#1c1c1e] border border-white/[0.12] p-5 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Crown className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-semibold text-white">Resolve Wager</h3>
              </div>
              <button
                onClick={() => {
                  soundEngine.playClick();
                  hapticLight();
                  setIsResolvingStake(false);
                }}
                className="text-zinc-400 hover:text-white p-1"
              >
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

      {/* Edit / New Stake Modal */}
      {(isEditingStake || isCreatingStake) && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md px-4"
          onClick={() => {
            soundEngine.playClick();
            hapticLight();
            setIsEditingStake(false);
            setIsCreatingStake(false);
          }}
        >
          <div
            className="w-full max-w-sm rounded-3xl bg-[#1c1c1e] border border-white/[0.12] p-5 shadow-2xl space-y-3.5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">
                {isEditingStake ? 'Edit Wager' : 'New Wager'}
              </h3>
              <button
                onClick={() => {
                  soundEngine.playClick();
                  hapticLight();
                  setIsEditingStake(false);
                  setIsCreatingStake(false);
                }}
                className="text-zinc-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                if (isEditingStake && activeStake) {
                  e.preventDefault();
                  if (!stakeTitle.trim()) return;
                  soundEngine.playCheck();
                  hapticSuccess();
                  updateStake({
                    ...activeStake,
                    title: stakeTitle,
                    description: stakeDesc,
                  });
                  setIsEditingStake(false);
                } else {
                  handleSaveNewStake(e);
                }
              }}
              className="space-y-3"
            >
              {isCreatingStake && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playClick();
                      hapticLight();
                      setStakePeriod('weekly');
                    }}
                    className={`flex-1 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
                      stakePeriod === 'weekly'
                        ? 'bg-zinc-700 text-white border-zinc-600 font-semibold'
                        : 'bg-[#2c2c2e] text-zinc-400 border-transparent'
                    }`}
                  >
                    Weekly
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playClick();
                      hapticLight();
                      setStakePeriod('monthly');
                    }}
                    className={`flex-1 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
                      stakePeriod === 'monthly'
                        ? 'bg-zinc-700 text-white border-zinc-600 font-semibold'
                        : 'bg-[#2c2c2e] text-zinc-400 border-transparent'
                    }`}
                  >
                    Monthly
                  </button>
                </div>
              )}

              <input
                type="text"
                value={stakeTitle}
                onChange={(e) => setStakeTitle(e.target.value)}
                placeholder="Title (e.g. Sunday Dinner Date)"
                className="w-full px-3 py-2 rounded-xl bg-[#2c2c2e] border border-white/[0.08] text-white text-xs placeholder:text-zinc-500 focus:outline-none focus:border-zinc-400"
                required
              />

              <textarea
                value={stakeDesc}
                onChange={(e) => setStakeDesc(e.target.value)}
                rows={2}
                placeholder="Terms and reward"
                className="w-full px-3 py-2 rounded-xl bg-[#2c2c2e] border border-white/[0.08] text-white text-xs placeholder:text-zinc-500 focus:outline-none focus:border-zinc-400"
              />

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    hapticLight();
                    setIsEditingStake(false);
                    setIsCreatingStake(false);
                  }}
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
