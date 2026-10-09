'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';
import { extractInviteCode } from '@/lib/invite-navigation';
import { LeaderboardTier, Habit, CheckIn, Player, PlayerId, StakePeriod } from '@/lib/types';
import { getCategoryBreakdown, getStakesRecord, getWeeklyDailyDuelPoints } from '@/lib/score-calculator';
import { getDaysRemainingInMonth, getDaysRemainingInWeek, getMonthKey, getTodayDateString, getWeekKey } from '@/lib/date-utils';
import {
  Camera,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Crown,
  Plus,
  Share2,
  Sliders,
  Trash2,
  Trophy,
  X,
} from 'lucide-react';
import { ProofGalleryModal } from './ProofGalleryModal';
import { soundEngine } from '@/lib/sound-utils';
import { hapticLight, hapticSuccess, hapticCelebration } from '@/lib/haptic-utils';
import { fireCelebrationConfetti } from '@/lib/confetti';
import { shareScorecardImage } from '@/lib/scorecard-image';
import { useMultiplayer } from '@/lib/multiplayer';

type DuelSubsegment = 'habits' | 'battles' | 'categories';

export function DuelView() {
  const multiplayer = useMultiplayer();
  const router = useRouter();
  const [inviteStatus, setInviteStatus] = useState<string | null>(null);
  const [inviteLink, setInviteLink] = useState('');
  const [joinLinkInput, setJoinLinkInput] = useState('');
  const [showInvitePanel, setShowInvitePanel] = useState(false);

  useEffect(() => {
    setInviteLink(multiplayer.duel ? `${window.location.origin}/?invite=${multiplayer.duel.invite_code}` : '');
  }, [multiplayer.duel]);

  const [selectedTier, setSelectedTier] = useState<LeaderboardTier>('weekly');
  const [activeSubsegment, setActiveSubsegment] = useState<DuelSubsegment>('habits');
  const [selectedBattleDayDate, setSelectedBattleDayDate] = useState<string | null>(null);
  const [showInactiveCategories, setShowInactiveCategories] = useState(false);

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
    isPartnerConnected,
  } = useStore();

  const ownerDisplayName = multiplayer.duel?.owner_name ?? players.maciek.name;
  const guestDisplayName = multiplayer.duel?.guest_name ?? players.myrna.name;
  const partnerDisplayName = multiplayer.slot === 'maciek' ? guestDisplayName : ownerDisplayName;
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

  const activeCategories = useMemo(
    () => categoryBreakdown.filter((cat) => cat.maciekPoints > 0 || cat.myrnaPoints > 0),
    [categoryBreakdown]
  );
  const inactiveCategories = useMemo(
    () => categoryBreakdown.filter((cat) => cat.maciekPoints === 0 && cat.myrnaPoints === 0),
    [categoryBreakdown]
  );

  const selectedBattleDay = useMemo(() => {
    if (!selectedBattleDayDate) {
      return dailyDuelPoints.find((p) => p.isToday) || dailyDuelPoints[0];
    }
    return dailyDuelPoints.find((p) => p.dateStr === selectedBattleDayDate) || dailyDuelPoints[0];
  }, [dailyDuelPoints, selectedBattleDayDate]);

  const handleSelectTier = (tier: LeaderboardTier) => {
    if (selectedTier !== tier) {
      soundEngine.playClick();
      hapticLight();
      setSelectedTier(tier);
      if (tier === 'weekly') {
        setActiveSubsegment('habits');
      } else {
        setActiveSubsegment('categories');
      }
    }
  };

  const subsegmentOptions = useMemo(() => {
    if (selectedTier === 'weekly') {
      return [
        { id: 'habits' as const, label: "Today's Habits" },
        { id: 'battles' as const, label: 'Daily Battles' },
        { id: 'categories' as const, label: 'Categories' },
      ];
    }
    return [
      { id: 'habits' as const, label: "Today's Habits" },
      { id: 'categories' as const, label: 'Categories' },
    ];
  }, [selectedTier]);

  const handleResolveStake = (winner: PlayerId | 'tie') => {
    if (!activeStake) return;
    soundEngine.playFanfare();
    fireCelebrationConfetti();
    hapticCelebration();
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

  const [shareCardStatus, setShareCardStatus] = useState<string | null>(null);

  const handleShareScorecardCard = async () => {
    soundEngine.playClick();
    hapticLight();
    const weekKey = getWeekKey(todayStr);
    const leader =
      maciekSummary.weekly > myrnaSummary.weekly
        ? players.maciek.name
        : myrnaSummary.weekly > maciekSummary.weekly
        ? players.myrna.name
        : 'Tied';
    const delta = Math.abs(maciekSummary.weekly - myrnaSummary.weekly);

    try {
      setShareCardStatus('Generating...');
      const res = await shareScorecardImage({
        weekKey,
        maciekName: players.maciek.name,
        myrnaName: players.myrna.name,
        maciekScore: maciekSummary.weekly,
        myrnaScore: myrnaSummary.weekly,
        maciekStreak: maciekSummary.currentStreak,
        myrnaStreak: myrnaSummary.currentStreak,
        stakeTitle: activeWeeklyStake?.title,
        leaderName: leader,
        pointDiff: delta,
      });

      soundEngine.playCheck();
      hapticSuccess();
      setShareCardStatus(res.action === 'copied' ? 'Copied!' : 'Saved!');
      setTimeout(() => setShareCardStatus(null), 3000);
    } catch (e) {
      console.error(e);
      setShareCardStatus('Failed');
      setTimeout(() => setShareCardStatus(null), 3000);
    }
  };

  const maciekDoneHabitsCount = maciekHabits.filter((h) =>
    checkIns.some((c) => c.habitId === h.id && c.date === todayStr)
  ).length;

  const myrnaDoneHabitsCount = myrnaHabits.filter((h) =>
    checkIns.some((c) => c.habitId === h.id && c.date === todayStr)
  ).length;

  return (
    <div className="w-full space-y-4">
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <p className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">
              {isPartnerConnected ? 'Head to Head Duel' : 'Head to Head'}
            </p>
            {multiplayer.duel && isPartnerConnected && (
              <button
                type="button"
                onClick={() => setShowInvitePanel((prev) => !prev)}
                className="text-[10px] font-mono text-zinc-500 hover:text-zinc-300 underline underline-offset-2 transition-colors"
              >
                {showInvitePanel ? 'Hide invite' : 'Invite details'}
              </button>
            )}
          </div>
          {selectedTier === 'weekly' && (
            <button
              onClick={handleShareScorecardCard}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-zinc-800 bg-[#0e1013] text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-white sm:w-auto sm:px-2.5"
              aria-label={shareCardStatus || 'Share scorecard'}
              title="Export & Share Scorecard"
            >
              <Share2 className="h-3.5 w-3.5 text-blue-400" />
              <span className="hidden sm:inline">{shareCardStatus || 'Share'}</span>
            </button>
          )}
        </div>

        {isPartnerConnected ? (
          <h1 className="grid min-h-[82px] w-full grid-cols-[minmax(0,1fr)_34px_minmax(0,1fr)] items-center px-1">
            <span className="min-w-0">
              <span aria-hidden="true" className="mb-2.5 block h-0.5 w-[26px] rounded bg-blue-500" />
              <span className="block truncate text-[clamp(21px,6.3vw,26px)] font-bold tracking-[-0.045em] text-blue-400">
                {ownerDisplayName}
              </span>
            </span>
            <span className="relative flex h-full items-center justify-center font-mono text-[9px] text-zinc-400">
              <span aria-hidden="true" className="absolute inset-y-[15px] left-1/2 w-px -translate-x-1/2 bg-zinc-800" />
              <span className="relative bg-[#08090a] px-1 py-1">VS</span>
            </span>
            <span className="min-w-0 text-right">
              <span aria-hidden="true" className="mb-2.5 ml-auto block h-0.5 w-[26px] rounded bg-purple-500" />
              <span className="block truncate text-[clamp(21px,6.3vw,26px)] font-bold tracking-[-0.045em] text-purple-400">
                {guestDisplayName}
              </span>
            </span>
          </h1>
        ) : (
          <h1 className="min-h-[82px] pt-3 text-2xl font-semibold tracking-tight text-white">Duel</h1>
        )}

        <div
          role="tablist"
          aria-label="Leaderboard timeframe"
          className="grid w-full grid-cols-3 gap-0.5 rounded-lg border border-zinc-800 bg-[#0e1013] p-[3px]"
        >
          {(
            [
              { id: 'weekly', label: 'Week' },
              { id: 'monthly', label: 'Month' },
              { id: 'karma', label: 'All-Time' },
            ] as { id: LeaderboardTier; label: string }[]
          ).map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={selectedTier === t.id}
              onClick={() => handleSelectTier(t.id)}
              className={`min-h-9 rounded-md px-2 text-xs font-mono font-medium transition-colors ${
                selectedTier === t.id
                  ? 'bg-zinc-800/90 text-white shadow-xs font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Invite Panel (when requested or unpaired) */}
      {multiplayer.duel && (!isPartnerConnected || showInvitePanel) && (
        <section className="rounded-xl border border-blue-500/25 bg-[#0e1013] p-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-white">{isPartnerConnected ? `${ownerDisplayName} vs ${guestDisplayName}` : `Duel invite for ${ownerDisplayName}`}</h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                {isPartnerConnected
                  ? `Paired with ${partnerDisplayName}. You can also join a different invitation link below.`
                  : 'No opponent account is matched to this duel yet. Share your private invitation link so your partner can sign in and join.'}
              </p>
              {multiplayer.user?.email && (
                <p className="text-[11px] font-mono text-zinc-400 mt-1">
                  Your matched account: <span className="text-zinc-200">{multiplayer.user.email}</span>
                </p>
              )}
            </div>
            {isPartnerConnected && (
              <button
                type="button"
                onClick={() => setShowInvitePanel(false)}
                className="text-xs text-zinc-400 hover:text-white"
              >
                Close
              </button>
            )}
          </div>
          <label className="block text-xs font-mono text-zinc-400">
            Invitation link
            <input
              readOnly
              value={inviteLink}
              onFocus={(event) => event.currentTarget.select()}
              className="mt-1 w-full rounded-lg border border-zinc-800 bg-black/60 p-2 text-xs font-mono text-white"
            />
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={!inviteLink}
              className="rounded-lg bg-white text-black px-3.5 py-1.5 text-xs font-mono font-semibold disabled:opacity-50 hover:bg-zinc-200 transition-colors"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(inviteLink);
                  setInviteStatus('Invitation link copied');
                } catch {
                  setInviteStatus('Select and copy the invitation link above.');
                }
              }}
            >
              Copy invitation link
            </button>
            {typeof navigator !== 'undefined' && 'share' in navigator && inviteLink && (
              <button
                type="button"
                className="rounded-lg border border-zinc-800 px-3.5 py-1.5 text-xs font-mono font-medium text-white hover:bg-zinc-800 transition-colors"
                onClick={async () => {
                  try {
                    await navigator.share({ title: multiplayer.duel?.guest_name ? `${ownerDisplayName} vs ${guestDisplayName} Duel on do` : `Join ${ownerDisplayName}'s duel on do`, url: inviteLink });
                  } catch {
                    // user cancelled
                  }
                }}
              >
                Share link
              </button>
            )}
          </div>
          {inviteStatus && <p role="status" className="text-xs font-mono text-blue-300">{inviteStatus}</p>}
          <form
            onSubmit={(event) => {
              event.preventDefault();
              const code = extractInviteCode(joinLinkInput);
              router.push(`/?invite=${encodeURIComponent(code ?? '')}`);
            }}
            className="pt-2 border-t border-zinc-800/80 space-y-2"
          >
            <label className="block text-xs font-mono text-zinc-400">
              Have an opponent&apos;s invitation link or code?
              <div className="mt-1 flex flex-wrap gap-2">
                <input
                  type="text"
                  placeholder="Paste invite link or code…"
                  value={joinLinkInput}
                  onChange={(event) => setJoinLinkInput(event.target.value)}
                  className="min-w-0 flex-1 rounded-lg border border-zinc-800 bg-black/60 p-2 text-xs font-mono text-white"
                />
                <button
                  type="submit"
                  className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-mono font-semibold text-white hover:bg-zinc-800 transition-colors"
                >
                  Open invite
                </button>
              </div>
            </label>
          </form>
        </section>
      )}

      {/* Onboarding Empty State */}
      {multiplayer.duel && habits.length === 0 && (
        <section className="rounded-xl border border-zinc-800 bg-[#0e1013] p-4">
          <h2 className="text-sm font-semibold text-white">Start with a habit</h2>
          <p className="text-xs text-zinc-400 mt-1">
            Each player adds their own habits. Check-ins will appear here as you go.
          </p>
          <Link
            className="inline-block mt-3 rounded-lg bg-white text-black px-4 py-2 text-xs font-semibold hover:bg-zinc-200 transition-colors"
            href="/?tab=progress&section=habits"
          >
            Add your first habit
          </Link>
        </section>
      )}

      {/* Main Head-to-Head Competition Card */}
      <div className="rounded-xl bg-[#0e1013] border border-zinc-800 p-4 space-y-4">
        {/* Top: Tier Name + Countdown */}
        <div className="flex items-center justify-between text-xs">
          <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-semibold">
            {selectedTier === 'karma'
              ? 'All-Time Karma'
              : `${selectedTier === 'weekly' ? 'Weekly' : 'Monthly'} Duel`}
          </span>

          {selectedTier === 'weekly' && (
            <span className="text-zinc-400 flex items-center gap-1 text-[11px] font-mono">
              <Clock className="w-3 h-3 text-zinc-500" />
              {weekRemaining.days}d {weekRemaining.hours}h left
            </span>
          )}

          {selectedTier === 'monthly' && (
            <span className="text-zinc-400 flex items-center gap-1 text-[11px] font-mono">
              <Clock className="w-3 h-3 text-zinc-500" />
              {monthRemainingDays}d left
            </span>
          )}
        </div>

        {/* Head-to-Head Scores */}
        <div className="flex items-center justify-between">
          {/* Maciek (Blue) */}
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              <span className="text-xs font-mono font-semibold text-zinc-300">
                {players.maciek.name}
              </span>
            </div>
            <div className="text-3xl font-bold font-mono tracking-tight text-blue-400 tabular-nums">
              {comparison.maciekScore.toLocaleString()}
            </div>
          </div>

          {/* Lead Delta Pill */}
          <div className="text-center">
            <span
              className={`inline-block px-3 py-1 rounded-full text-xs font-mono font-semibold border ${
                comparison.leader === 'maciek'
                  ? 'bg-blue-500/15 border-blue-500/30 text-blue-300'
                  : comparison.leader === 'myrna'
                  ? 'bg-purple-500/15 border-purple-500/30 text-purple-300'
                  : 'bg-zinc-800 border-zinc-700 text-zinc-400'
              }`}
            >
              {comparison.leader === 'maciek' && `+${comparison.delta} pts`}
              {comparison.leader === 'myrna' && `+${comparison.delta} pts`}
              {comparison.leader === 'tie' && 'Tied'}
            </span>
          </div>

          {/* Myrna (Purple) */}
          <div className="text-right">
            <div className="flex items-center justify-end gap-1.5 mb-1">
              <span className="text-xs font-mono font-semibold text-zinc-300">
                {players.myrna.name}
              </span>
              <span className="w-2 h-2 rounded-full bg-purple-500" />
            </div>
            <div className="text-3xl font-bold font-mono tracking-tight text-purple-400 tabular-nums">
              {comparison.myrnaScore.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Two-tone Telemetry Bar */}
        <div className="space-y-1">
          <div
            role="meter"
            aria-label="Score share"
            aria-valuenow={comparison.maciekPct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuetext={`${players.maciek.name} ${comparison.maciekPct}%, ${players.myrna.name} ${comparison.myrnaPct}%`}
            className="h-2 w-full rounded-full bg-zinc-800 overflow-hidden flex"
          >
            <div
              className="h-full bg-blue-500 transition-all duration-500"
              style={{ width: `${comparison.maciekPct}%` }}
            />
            <div
              className="h-full bg-purple-500 transition-all duration-500"
              style={{ width: `${comparison.myrnaPct}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] font-mono text-zinc-500 font-medium tabular-nums">
            <span>{comparison.maciekPct}%</span>
            <span>{comparison.myrnaPct}%</span>
          </div>
        </div>
      </div>

      {/* Wager Card (Ultra-compact inline when empty, full card when active) */}
      {!activeStake ? (
        <div className="rounded-xl border border-zinc-800 bg-[#0e1013] p-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Trophy className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="text-xs font-mono text-zinc-400 truncate">
              No active wager for this {selectedTier === 'monthly' ? 'month' : 'week'}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="hidden sm:inline text-[10px] font-mono text-zinc-500 tabular-nums">
              Wins: {players.maciek.name} {stakesRecord.maciekWins} · {players.myrna.name} {stakesRecord.myrnaWins}
            </span>
            <button
              onClick={() => {
                soundEngine.playClick();
                hapticLight();
                setIsCreatingStake(true);
              }}
              aria-label="Set new wager"
              className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-mono font-medium transition-colors"
            >
              <Plus className="w-3 h-3" />
              <span>Set wager</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-zinc-800 bg-[#0e1013] p-3.5 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-400" />
              <span className="text-[10px] font-mono uppercase tracking-wider font-semibold text-amber-400">
                {activeStake.period === 'weekly' ? 'Weekly' : 'Monthly'} Wager
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-zinc-500 tabular-nums">
                Wins: {players.maciek.name} {stakesRecord.maciekWins} · {players.myrna.name} {stakesRecord.myrnaWins}
              </span>
            </div>
          </div>

          <div className="flex items-start justify-between gap-3 pt-0.5">
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-white truncate">{activeStake.title}</div>
              {activeStake.description && (
                <p className="text-xs text-zinc-400 mt-0.5 line-clamp-2">{activeStake.description}</p>
              )}
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => {
                  soundEngine.playClick();
                  hapticLight();
                  setIsResolvingStake(true);
                }}
                aria-label="Resolve wager"
                className="px-2.5 py-1 rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-mono font-medium hover:bg-amber-500/25 transition-colors"
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
                aria-label="Edit wager"
                className="p-1 rounded-md text-zinc-400 hover:text-white transition-colors"
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
                aria-label="Delete wager"
                className="p-1 rounded-md text-zinc-500 hover:text-red-400 transition-colors"
                title="Delete wager"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Subsegment Switcher Pills */}
      <div
        role="tablist"
        aria-label="Duel sections"
        className="flex p-0.5 rounded-lg bg-[#0e1013] border border-zinc-800"
      >
        {subsegmentOptions.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeSubsegment === tab.id}
            onClick={() => {
              soundEngine.playClick();
              hapticLight();
              setActiveSubsegment(tab.id);
            }}
            className={`flex-1 py-1.5 px-3 rounded-md text-xs font-mono font-medium transition-colors text-center ${
              activeSubsegment === tab.id
                ? 'bg-zinc-800/90 text-white shadow-xs font-semibold'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Subsegment View 1: Today's Habits */}
      {activeSubsegment === 'habits' && (
        <div className="rounded-xl bg-[#0e1013] border border-zinc-800 p-4 space-y-3">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold">
              Today&apos;s Habits Parity
            </span>
            <span className="text-zinc-500 text-[11px]">{todayStr}</span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            {/* Maciek */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between pb-1.5 border-b border-zinc-800 text-[11px] font-mono">
                <span className="font-semibold text-blue-400">{players.maciek.name}</span>
                <span className="text-zinc-400 tabular-nums">
                  {maciekDoneHabitsCount}/{maciekHabits.length} · {maciekSummary.today} pts
                </span>
              </div>
              {maciekHabits.map((h) => {
                const checkIn = checkIns.find((c) => c.habitId === h.id && c.date === todayStr);
                const done = !!checkIn;
                const photos =
                  checkIn?.proofUrls && checkIn.proofUrls.length > 0
                    ? checkIn.proofUrls
                    : checkIn?.proofUrl
                    ? [checkIn.proofUrl]
                    : [];

                return (
                  <div
                    key={h.id}
                    className={`flex items-center gap-2 p-2 rounded-lg border text-xs transition-colors ${
                      done
                        ? 'bg-blue-500/10 border-blue-500/25 text-white'
                        : 'bg-zinc-900/30 border-zinc-800/60 text-zinc-400'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${
                        done ? 'bg-blue-500 text-white' : 'border border-zinc-700'
                      }`}
                    >
                      {done && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                    </div>
                    <span className="truncate flex-1 font-medium">{h.title}</span>

                    {photos.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          soundEngine.playClick();
                          hapticLight();
                          setActiveProofView({ habit: h, checkIn: checkIn!, player: players.maciek });
                        }}
                        aria-label={`View proof photos for ${h.title}`}
                        className="text-emerald-400 p-0.5 hover:text-emerald-300 transition-colors"
                        title="View proof photos"
                      >
                        <Camera className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
              {maciekHabits.length === 0 && (
                <div className="p-2.5 rounded-lg border border-zinc-800 text-[11px] font-mono text-zinc-500">
                  No active habits.
                </div>
              )}
            </div>

            {/* Myrna */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between pb-1.5 border-b border-zinc-800 text-[11px] font-mono">
                <span className="font-semibold text-purple-400">{players.myrna.name}</span>
                <span className="text-zinc-400 tabular-nums">
                  {myrnaDoneHabitsCount}/{myrnaHabits.length} · {myrnaSummary.today} pts
                </span>
              </div>
              {myrnaHabits.map((h) => {
                const checkIn = checkIns.find((c) => c.habitId === h.id && c.date === todayStr);
                const done = !!checkIn;
                const photos =
                  checkIn?.proofUrls && checkIn.proofUrls.length > 0
                    ? checkIn.proofUrls
                    : checkIn?.proofUrl
                    ? [checkIn.proofUrl]
                    : [];

                return (
                  <div
                    key={h.id}
                    className={`flex items-center gap-2 p-2 rounded-lg border text-xs transition-colors ${
                      done
                        ? 'bg-purple-500/10 border-purple-500/25 text-white'
                        : 'bg-zinc-900/30 border-zinc-800/60 text-zinc-400'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${
                        done ? 'bg-purple-500 text-white' : 'border border-zinc-700'
                      }`}
                    >
                      {done && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                    </div>
                    <span className="truncate flex-1 font-medium">{h.title}</span>

                    {photos.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          soundEngine.playClick();
                          hapticLight();
                          setActiveProofView({ habit: h, checkIn: checkIn!, player: players.myrna });
                        }}
                        aria-label={`View proof photos for ${h.title}`}
                        className="text-emerald-400 p-0.5 hover:text-emerald-300 transition-colors"
                        title="View proof photos"
                      >
                        <Camera className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
              {myrnaHabits.length === 0 && (
                <div className="p-2.5 rounded-lg border border-zinc-800 text-[11px] font-mono text-zinc-500">
                  {isPartnerConnected
                    ? 'No active habits added yet.'
                    : 'Waiting for opponent account to join.'}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Subsegment View 2: Daily Battles (Horizontal 7-Day Strip + Inspector) */}
      {activeSubsegment === 'battles' && selectedTier === 'weekly' && (
        <div className="rounded-xl bg-[#0e1013] border border-zinc-800 p-4 space-y-3">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold">
              Weekly Daily Battles
            </span>
            <span className="text-[11px] text-zinc-500">Tap day to inspect</span>
          </div>

          {/* 7-Column Strip */}
          <div className="grid grid-cols-7 gap-1.5">
            {dailyDuelPoints.map((point) => {
              const total = point.maciekPoints + point.myrnaPoints;
              const isSelected = selectedBattleDay?.dateStr === point.dateStr;
              const maciekWon = point.maciekPoints > point.myrnaPoints;
              const myrnaWon = point.myrnaPoints > point.maciekPoints;

              return (
                <button
                  key={point.dateStr}
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    hapticLight();
                    setSelectedBattleDayDate(point.dateStr);
                  }}
                  className={`p-2 rounded-lg border text-center transition-all ${
                    isSelected
                      ? 'border-zinc-500 bg-zinc-800/80 shadow-xs'
                      : point.isToday
                      ? 'border-zinc-700 bg-zinc-900/60'
                      : point.isFuture
                      ? 'border-zinc-800/40 bg-zinc-900/10 opacity-40'
                      : 'border-zinc-800/70 bg-zinc-900/30 hover:border-zinc-700'
                  }`}
                >
                  <div
                    className={`text-[10px] font-mono uppercase font-semibold ${
                      point.isToday ? 'text-white' : 'text-zinc-400'
                    }`}
                  >
                    {point.dayName}
                  </div>

                  <div className="my-1.5 flex items-center justify-center">
                    {point.isFuture ? (
                      <span className="w-2 h-2 rounded-full bg-zinc-700/50" />
                    ) : total === 0 ? (
                      <span className="w-2 h-2 rounded-full bg-zinc-600" />
                    ) : maciekWon ? (
                      <span className="w-2 h-2 rounded-full bg-blue-500 shadow-xs shadow-blue-500/50" />
                    ) : myrnaWon ? (
                      <span className="w-2 h-2 rounded-full bg-purple-500 shadow-xs shadow-purple-500/50" />
                    ) : (
                      <span className="w-2 h-2 rounded-full bg-zinc-400" />
                    )}
                  </div>

                  <div className="text-[10px] font-mono text-zinc-400 tabular-nums truncate">
                    {point.isFuture ? '—' : `${point.maciekPoints}:${point.myrnaPoints}`}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Inspector Detail for Selected Day */}
          {selectedBattleDay && (
            <div className="rounded-lg bg-zinc-900/40 border border-zinc-800 p-2.5 space-y-1.5">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="font-semibold text-white">
                  {selectedBattleDay.dayName} · {selectedBattleDay.dateStr}
                  {selectedBattleDay.isToday && ' (Today)'}
                </span>
                <div className="flex items-center gap-2 tabular-nums">
                  <span className="text-blue-400 font-semibold">{selectedBattleDay.maciekPoints} pts</span>
                  <span className="text-zinc-600">:</span>
                  <span className="text-purple-400 font-semibold">{selectedBattleDay.myrnaPoints} pts</span>
                </div>
              </div>

              {selectedBattleDay.maciekPoints + selectedBattleDay.myrnaPoints > 0 ? (
                <div className="h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden flex">
                  <div
                    className="h-full bg-blue-500 transition-all duration-300"
                    style={{
                      width: `${Math.round(
                        (selectedBattleDay.maciekPoints /
                          (selectedBattleDay.maciekPoints + selectedBattleDay.myrnaPoints)) *
                          100
                      )}%`,
                    }}
                  />
                  <div
                    className="h-full bg-purple-500 transition-all duration-300"
                    style={{
                      width: `${
                        100 -
                        Math.round(
                          (selectedBattleDay.maciekPoints /
                            (selectedBattleDay.maciekPoints + selectedBattleDay.myrnaPoints)) *
                            100
                        )
                      }%`,
                    }}
                  />
                </div>
              ) : (
                <div className="text-[11px] font-mono text-zinc-500">
                  {selectedBattleDay.isFuture ? 'Future battle day' : 'No points scored yet'}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Subsegment View 3: Categories (Active categories + collapsible inactive) */}
      {activeSubsegment === 'categories' && (
        <div className="rounded-xl bg-[#0e1013] border border-zinc-800 p-4 space-y-3">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold">
              Category Breakdown ({selectedTier === 'karma' ? 'All-Time' : selectedTier})
            </span>
            <span className="text-zinc-500 text-[11px]">
              {activeCategories.length} active
            </span>
          </div>

          {activeCategories.length > 0 ? (
            <div className="space-y-2">
              {activeCategories.map((cat) => {
                const total = cat.maciekPoints + cat.myrnaPoints;
                const mPct = total === 0 ? 50 : Math.round((cat.maciekPoints / total) * 100);
                const yPct = total === 0 ? 50 : 100 - mPct;

                return (
                  <div
                    key={cat.category}
                    className="p-2.5 rounded-lg bg-zinc-900/30 border border-zinc-800/80 space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-white">{cat.label}</span>
                      <div className="flex items-center gap-2 font-mono tabular-nums text-xs">
                        <span className="text-blue-400 font-semibold">{cat.maciekPoints}</span>
                        <span className="text-zinc-600">:</span>
                        <span className="text-purple-400 font-semibold">{cat.myrnaPoints}</span>
                      </div>
                    </div>

                    <div
                      role="meter"
                      aria-label={`${cat.label} score share`}
                      aria-valuenow={cat.maciekPoints}
                      aria-valuemin={0}
                      aria-valuemax={Math.max(1, total)}
                      className="h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden flex"
                    >
                      <div
                        className="h-full bg-blue-500 transition-all duration-300"
                        style={{ width: `${mPct}%` }}
                      />
                      <div
                        className="h-full bg-purple-500 transition-all duration-300"
                        style={{ width: `${yPct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-3 rounded-lg border border-zinc-800 text-xs font-mono text-zinc-500">
              No category points logged in this timeframe yet.
            </div>
          )}

          {/* Collapsible Inactive Categories Toggle */}
          {inactiveCategories.length > 0 && (
            <div className="pt-1">
              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  hapticLight();
                  setShowInactiveCategories((prev) => !prev);
                }}
                className="flex items-center gap-1.5 text-xs font-mono text-zinc-400 hover:text-white transition-colors"
              >
                {showInactiveCategories ? (
                  <>
                    <ChevronUp className="w-3.5 h-3.5" />
                    <span>Hide {inactiveCategories.length} inactive categories</span>
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-3.5 h-3.5" />
                    <span>+ {inactiveCategories.length} inactive categories</span>
                  </>
                )}
              </button>

              {showInactiveCategories && (
                <div className="mt-2 space-y-1.5 border-t border-zinc-800/80 pt-2">
                  {inactiveCategories.map((cat) => (
                    <div
                      key={cat.category}
                      className="flex items-center justify-between p-2 rounded-md bg-zinc-900/20 text-xs text-zinc-500 font-mono"
                    >
                      <span>{cat.label}</span>
                      <span>0 : 0</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

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
            role="dialog"
            aria-modal="true"
            aria-labelledby="resolve-wager-title"
            className="w-full max-w-sm rounded-2xl bg-[#0e1013] border border-zinc-800 p-5 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Crown className="w-4 h-4 text-amber-400" />
                <h3 id="resolve-wager-title" className="text-sm font-semibold text-white">
                  Resolve Wager
                </h3>
              </div>
              <button
                onClick={() => {
                  soundEngine.playClick();
                  hapticLight();
                  setIsResolvingStake(false);
                }}
                aria-label="Close dialog"
                className="text-zinc-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1">
              <div className="text-xs text-zinc-400">Award victory for:</div>
              <div className="text-sm font-medium text-white">{activeStake.title}</div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleResolveStake('maciek')}
                className="py-2.5 px-3 rounded-xl bg-blue-500/15 border border-blue-500/30 hover:bg-blue-500/25 text-blue-300 text-xs font-mono font-semibold transition-colors"
              >
                {players.maciek.name} Won
              </button>
              <button
                onClick={() => handleResolveStake('myrna')}
                className="py-2.5 px-3 rounded-xl bg-purple-500/15 border border-purple-500/30 hover:bg-purple-500/25 text-purple-300 text-xs font-mono font-semibold transition-colors"
              >
                {players.myrna.name} Won
              </button>
            </div>

            <button
              onClick={() => handleResolveStake('tie')}
              className="w-full py-2 rounded-xl border border-zinc-800 text-zinc-400 text-xs font-mono hover:text-white hover:bg-zinc-800 transition-colors"
            >
              Mark as Draw / Push
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
            role="dialog"
            aria-modal="true"
            aria-labelledby="stake-modal-title"
            className="w-full max-w-sm rounded-2xl bg-[#0e1013] border border-zinc-800 p-5 shadow-2xl space-y-3.5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 id="stake-modal-title" className="text-sm font-semibold text-white">
                {isEditingStake ? 'Edit Wager' : 'New Wager'}
              </h3>
              <button
                onClick={() => {
                  soundEngine.playClick();
                  hapticLight();
                  setIsEditingStake(false);
                  setIsCreatingStake(false);
                }}
                aria-label="Close wager dialog"
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
                    onClick={() => setStakePeriod('weekly')}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-mono font-medium border transition-colors ${
                      stakePeriod === 'weekly'
                        ? 'bg-zinc-800 text-white border-zinc-700 font-semibold'
                        : 'bg-zinc-900/50 text-zinc-400 border-zinc-800'
                    }`}
                  >
                    Weekly
                  </button>
                  <button
                    type="button"
                    onClick={() => setStakePeriod('monthly')}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-mono font-medium border transition-colors ${
                      stakePeriod === 'monthly'
                        ? 'bg-zinc-800 text-white border-zinc-700 font-semibold'
                        : 'bg-zinc-900/50 text-zinc-400 border-zinc-800'
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
                className="w-full px-3 py-2 rounded-lg bg-black/60 border border-zinc-800 text-white text-xs placeholder:text-zinc-500 focus:outline-none focus:border-zinc-500"
                required
              />

              <textarea
                value={stakeDesc}
                onChange={(e) => setStakeDesc(e.target.value)}
                rows={2}
                placeholder="Terms and reward"
                className="w-full px-3 py-2 rounded-lg bg-black/60 border border-zinc-800 text-white text-xs placeholder:text-zinc-500 focus:outline-none focus:border-zinc-500"
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
                  className="flex-1 py-2 rounded-lg border border-zinc-800 text-zinc-400 text-xs font-mono font-medium hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-lg bg-white text-black text-xs font-mono font-semibold hover:bg-zinc-200"
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
