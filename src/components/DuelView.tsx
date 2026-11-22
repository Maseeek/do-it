'use client';

import { proofPhotos as getProofPhotos } from '@/lib/duel-data';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';
import { extractInviteCode } from '@/lib/invite-navigation';
import { LeaderboardTier, Habit, CheckIn, Player, PlayerId, Stake, StakePeriod } from '@/lib/types';
import { getCategoryBreakdown, getStakesRecord, getWeeklyDailyDuelPoints } from '@/lib/score-calculator';
import { getDaysRemainingInMonth, getDaysRemainingInWeek, getMonthKey, getTodayDateString, getWeekKey } from '@/lib/date-utils';
import {
  Camera,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Share2,
  UserPlus,
} from 'lucide-react';
import { ProofGalleryModal } from './ProofGalleryModal';
import { WagerSection } from './WagerSection';
import { soundEngine } from '@/lib/sound-utils';
import { hapticLight, hapticSuccess } from '@/lib/haptic-utils';
import { shareScorecardImage } from '@/lib/scorecard-image';
import { useMultiplayer } from '@/lib/multiplayer';

type DuelSubsegment = 'habits' | 'battles' | 'categories';

const SEGMENT_TRACK =
  'grid w-full gap-0.5 rounded-[var(--radius-control)] border border-[var(--border-subtle)] bg-[var(--surface-2)] p-0.5';
const SEGMENT_BASE =
  'min-h-10 min-w-0 truncate whitespace-nowrap rounded-[10px] px-2 text-label transition-colors focus-visible:outline-offset-0';
const SEGMENT_ON =
  'bg-[var(--surface-1)] font-semibold text-foreground shadow-[0_1px_2px_rgba(0,0,0,0.12)] dark:bg-[var(--surface-3)]';
const SEGMENT_OFF = 'text-secondary hover:text-foreground';

/** Compact iOS-style segmented control. Labels never wrap. */
function SegmentedTabs<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { id: T; label: string }[];
  value: T;
  onChange: (id: T) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className={SEGMENT_TRACK}
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          role="tab"
          aria-selected={value === option.id}
          onClick={() => onChange(option.id)}
          className={`${SEGMENT_BASE} ${value === option.id ? SEGMENT_ON : SEGMENT_OFF}`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

const ICON_BUTTON =
  'flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-secondary transition-colors hover:bg-[var(--surface-2)] hover:text-foreground';

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

  const maciekHabits = habits.filter((h) => h.playerId === 'maciek' && h.isActive);
  const myrnaHabits = habits.filter((h) => h.playerId === 'myrna' && h.isActive);

  const dailyDuelPoints = useMemo(() => getWeeklyDailyDuelPoints(checkIns, todayStr), [checkIns, todayStr]);
  const categoryBreakdown = useMemo(() => getCategoryBreakdown(
    checkIns,
    habits,
    selectedTier === 'karma' ? 'karma' : 'weekly',
    todayStr
  ), [checkIns, habits, selectedTier, todayStr]);
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
        { id: 'habits' as const, label: 'Today' },
        { id: 'battles' as const, label: 'Battles' },
        { id: 'categories' as const, label: 'Categories' },
      ];
    }
    return [
      { id: 'habits' as const, label: 'Today' },
      { id: 'categories' as const, label: 'Categories' },
    ];
  }, [selectedTier]);

  const handleResolveStake = (stakeItem: Stake, winner: PlayerId | 'tie') => {
    updateStake({
      ...stakeItem,
      status: 'completed',
      winnerId: winner,
    });
  };

  const handleCreateStake = ({
    period,
    title,
    description,
  }: {
    period: StakePeriod;
    title: string;
    description: string;
  }) => {
    const periodKey = period === 'weekly' ? getWeekKey(todayStr) : getMonthKey(todayStr);
    addStake({
      period,
      periodKey,
      title: title.trim(),
      description: description.trim(),
      status: 'active',
      dueDate: todayStr,
    });
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

  const tierLabel =
    selectedTier === 'karma' ? 'All-time karma' : selectedTier === 'weekly' ? 'Weekly duel' : 'Monthly duel';
  const timeLeft =
    selectedTier === 'weekly'
      ? `${weekRemaining.days}d ${weekRemaining.hours}h left`
      : selectedTier === 'monthly'
      ? `${monthRemainingDays}d left`
      : null;

  const renderParityColumn = (playerId: PlayerId) => {
    const isOwner = playerId === 'maciek';
    const player = isOwner ? players.maciek : players.myrna;
    const columnHabits = isOwner ? maciekHabits : myrnaHabits;
    const doneCount = isOwner ? maciekDoneHabitsCount : myrnaDoneHabitsCount;
    const todayPoints = isOwner ? maciekSummary.today : myrnaSummary.today;

    return (
      <div className="min-w-0">
        <div className="flex items-baseline justify-between gap-2 border-b border-[var(--border-subtle)] pb-2">
          <span className={`truncate text-label font-semibold ${isOwner ? 'text-owner-300' : 'text-guest-300'}`}>
            {player.name}
          </span>
          <span className="num shrink-0 text-caption text-muted">
            {doneCount}/{columnHabits.length} · {todayPoints} pts
          </span>
        </div>
        {columnHabits.length > 0 ? (
          <ul className="divide-y divide-[var(--border-subtle)]">
            {columnHabits.map((h) => {
              const checkIn = checkIns.find((c) => c.habitId === h.id && c.date === todayStr);
              const done = !!checkIn;
              const photos = getProofPhotos(checkIn);

              return (
                <li key={h.id} className="flex min-h-11 items-center gap-2">
                  <span
                    aria-hidden="true"
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${
                      done
                        ? `${isOwner ? 'bg-owner-500' : 'bg-guest-500'} text-white`
                        : 'border-[1.5px] border-[var(--border-strong)]'
                    }`}
                  >
                    {done && <Check className="h-2.5 w-2.5 stroke-[3]" />}
                  </span>
                  <span className={`relative min-w-0 flex-1 truncate text-label ${done ? 'text-foreground' : 'text-secondary'}`}>
                    {h.title}
                    <span className="sr-only">{done ? ' (done)' : ' (pending)'}</span>
                  </span>

                  {photos.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.playClick();
                        hapticLight();
                        setActiveProofView({ habit: h, checkIn: checkIn!, player });
                      }}
                      aria-label={`View proof photos for ${h.title}`}
                      className="-mr-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-emerald-600 transition-colors hover:bg-[var(--surface-2)] dark:text-emerald-400"
                      title="View proof photos"
                    >
                      <Camera className="h-4 w-4" />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="pt-3 text-caption text-muted">
            {isOwner
              ? 'No active habits.'
              : isPartnerConnected
              ? 'No active habits added yet.'
              : 'Waiting for opponent account to join.'}
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="w-full stack-section">
      <div className="stack-cards">
        {/* Scoreboard: names, scores, split bar, time left, period switch */}
        <section aria-label="Scoreboard" className="surface surface-pad">
          <div className="flex min-h-11 items-center justify-between gap-2">
            <p className="text-eyebrow text-muted">{tierLabel}</p>
            <div className="-mr-2 flex items-center gap-1">
              {timeLeft && (
                <span className="num mr-1 flex items-center gap-1 text-caption text-secondary">
                  <Clock aria-hidden="true" className="h-3.5 w-3.5" />
                  {timeLeft}
                </span>
              )}
              {multiplayer.duel && isPartnerConnected && (
                <button
                  type="button"
                  onClick={() => setShowInvitePanel((prev) => !prev)}
                  aria-label={showInvitePanel ? 'Hide invite' : 'Invite details'}
                  aria-expanded={showInvitePanel}
                  title={showInvitePanel ? 'Hide invite' : 'Invite details'}
                  className={ICON_BUTTON}
                >
                  <UserPlus className="h-[18px] w-[18px]" />
                </button>
              )}
              {selectedTier === 'weekly' && (
                <button
                  type="button"
                  onClick={handleShareScorecardCard}
                  className={`${ICON_BUTTON} sm:w-auto sm:gap-1.5 sm:px-3 sm:text-label`}
                  aria-label={shareCardStatus || 'Share scorecard'}
                  title="Export & Share Scorecard"
                >
                  <Share2 className="h-[18px] w-[18px]" />
                  <span className="hidden sm:inline">{shareCardStatus || 'Share'}</span>
                </button>
              )}
            </div>
          </div>

          {isPartnerConnected ? (
            <h1 className="mt-3 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-baseline gap-3 text-headline">
              <span className="truncate text-owner-300">{ownerDisplayName}</span>
              <span className="text-caption font-normal text-muted">vs</span>
              <span className="truncate text-right text-guest-300">{guestDisplayName}</span>
            </h1>
          ) : (
            <h1 className="mt-3 text-title text-foreground">Duel</h1>
          )}

          <div className="mt-1 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3">
            <div className="min-w-0">
              {!isPartnerConnected && (
                <p className="truncate text-label text-secondary">{players.maciek.name}</p>
              )}
              <p className="num truncate text-display text-owner-400">{comparison.maciekScore.toLocaleString()}</p>
            </div>
            <span
              className={`num rounded-full px-2.5 py-1 text-caption font-semibold ${
                comparison.leader === 'maciek'
                  ? 'bg-owner-500/15 text-owner-300'
                  : comparison.leader === 'myrna'
                  ? 'bg-guest-500/15 text-guest-300'
                  : 'bg-[var(--surface-2)] text-secondary'
              }`}
            >
              {comparison.leader === 'tie' ? 'Tied' : `+${comparison.delta} pts`}
            </span>
            <div className="min-w-0 text-right">
              {!isPartnerConnected && (
                <p className="truncate text-label text-secondary">{players.myrna.name}</p>
              )}
              <p className="num truncate text-display text-guest-400">{comparison.myrnaScore.toLocaleString()}</p>
            </div>
          </div>

          <div
            role="meter"
            aria-label="Score share"
            aria-valuenow={comparison.maciekPct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuetext={`${players.maciek.name} ${comparison.maciekPct}%, ${players.myrna.name} ${comparison.myrnaPct}%`}
            className="mt-4 flex h-2 w-full gap-0.5 overflow-hidden rounded-full"
          >
            <div
              className="h-full rounded-l-full bg-owner-500 transition-all duration-500"
              style={{ width: `${comparison.maciekPct}%` }}
            />
            <div
              className="h-full rounded-r-full bg-guest-500 transition-all duration-500"
              style={{ width: `${comparison.myrnaPct}%` }}
            />
          </div>
          <div className="mt-5">
            <SegmentedTabs
              label="Leaderboard timeframe"
              value={selectedTier}
              onChange={handleSelectTier}
              options={[
                { id: 'weekly', label: 'Week' },
                { id: 'monthly', label: 'Month' },
                { id: 'karma', label: 'All-time' },
              ]}
            />
          </div>
        </section>

        {/* Invite Panel (when requested or unpaired) */}
        {multiplayer.duel && (!isPartnerConnected || showInvitePanel) && (
          <section className="surface surface-pad space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 space-y-1">
                <h2 className="text-headline text-foreground">
                  {isPartnerConnected ? `${ownerDisplayName} vs ${guestDisplayName}` : `Duel invite for ${ownerDisplayName}`}
                </h2>
                <p className="text-body text-secondary">
                  {isPartnerConnected
                    ? `Paired with ${partnerDisplayName}. You can also join a different invitation link below.`
                    : 'No opponent account is matched to this duel yet. Share your private invitation link so your partner can sign in and join.'}
                </p>
                {multiplayer.user?.email && (
                  <p className="text-caption text-muted">
                    Your matched account: <span className="text-secondary">{multiplayer.user.email}</span>
                  </p>
                )}
              </div>
              {isPartnerConnected && (
                <button
                  type="button"
                  onClick={() => setShowInvitePanel(false)}
                  className="-mr-2 -mt-2 min-h-11 shrink-0 rounded-full px-3 text-label text-secondary hover:text-foreground"
                >
                  Close
                </button>
              )}
            </div>
            <label className="block text-label text-secondary">
              Invitation link
              <input
                readOnly
                value={inviteLink}
                onFocus={(event) => event.currentTarget.select()}
                className="field mt-1.5"
              />
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={!inviteLink}
                className="control control-primary"
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
                  className="control"
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
            {inviteStatus && <p role="status" className="text-label text-player-300">{inviteStatus}</p>}
            <form
              onSubmit={(event) => {
                event.preventDefault();
                const code = extractInviteCode(joinLinkInput);
                router.push(`/?invite=${encodeURIComponent(code ?? '')}`);
              }}
              className="border-t border-[var(--border-subtle)] pt-4"
            >
              <label className="block text-label text-secondary">
                Have an opponent&apos;s invitation link or code?
                <div className="mt-1.5 flex flex-wrap gap-2">
                  <input
                    type="text"
                    placeholder="Paste invite link or code…"
                    value={joinLinkInput}
                    onChange={(event) => setJoinLinkInput(event.target.value)}
                    className="field min-w-0 flex-1 !w-auto"
                  />
                  <button type="submit" className="control">
                    Open invite
                  </button>
                </div>
              </label>
            </form>
          </section>
        )}

        {/* Onboarding Empty State */}
        {multiplayer.duel && habits.length === 0 && (
          <section className="surface surface-pad">
            <h2 className="text-headline text-foreground">Start with a habit</h2>
            <p className="mt-1 text-body text-secondary">
              Each player adds their own habits. Check-ins will appear here as you go.
            </p>
            <Link className="control control-primary mt-4" href="/?tab=progress&section=habits">
              Add your first habit
            </Link>
          </section>
        )}

        {/* Wager */}
        <WagerSection
          selectedTier={selectedTier}
          activeWeeklyStake={activeWeeklyStake}
          activeMonthlyStake={activeMonthlyStake}
          stakes={stakes}
          stakesRecord={stakesRecord}
          players={players}
          comparison={comparison}
          countdownLabel={
            selectedTier === 'weekly'
              ? `${weekRemaining.days}d ${weekRemaining.hours}h left`
              : selectedTier === 'monthly'
                ? `${monthRemainingDays}d left`
                : 'All-Time'
          }
          onCreateStake={handleCreateStake}
          onUpdateStake={updateStake}
          onResolveStake={handleResolveStake}
          onDeleteStake={deleteStake}
        />
      </div>

      <div className="stack-cards">
        <SegmentedTabs
          label="Duel sections"
          value={activeSubsegment}
          onChange={(id) => {
            soundEngine.playClick();
            hapticLight();
            setActiveSubsegment(id);
          }}
          options={subsegmentOptions}
        />

        {/* Today: side-by-side parity list */}
        {activeSubsegment === 'habits' && (
          <section aria-label="Today's habits" className="surface surface-pad">
            <div className="grid grid-cols-2 gap-x-5">
              {renderParityColumn('maciek')}
              {renderParityColumn('myrna')}
            </div>
          </section>
        )}

        {/* Battles: 7-day strip + selected day */}
        {activeSubsegment === 'battles' && selectedTier === 'weekly' && (
          <section aria-label="Daily battles this week" className="surface surface-pad">
            <p className="text-caption text-muted">Tap a day to see its score</p>

            <div className="mt-3 grid grid-cols-7 gap-1">
              {dailyDuelPoints.map((point) => {
                const total = point.maciekPoints + point.myrnaPoints;
                const isSelected = selectedBattleDay?.dateStr === point.dateStr;
                const maciekWon = point.maciekPoints > point.myrnaPoints;
                const myrnaWon = point.myrnaPoints > point.maciekPoints;

                return (
                  <button
                    key={point.dateStr}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => {
                      soundEngine.playClick();
                      hapticLight();
                      setSelectedBattleDayDate(point.dateStr);
                    }}
                    className={`flex min-h-[72px] min-w-0 flex-col items-center justify-center gap-1.5 rounded-xl text-center transition-colors ${
                      isSelected
                        ? 'bg-[var(--surface-2)] ring-1 ring-[var(--border-medium)]'
                        : 'hover:bg-[var(--surface-2)]'
                    } ${point.isFuture ? 'opacity-40' : ''}`}
                  >
                    <span
                      className={`text-caption ${point.isToday ? 'font-semibold text-foreground' : 'text-secondary'}`}
                    >
                      {point.dayName}
                    </span>
                    {point.isFuture ? (
                      <span className="h-2 w-2 rounded-full bg-[var(--surface-3)]" />
                    ) : total === 0 ? (
                      <span className="h-2 w-2 rounded-full bg-[var(--border-strong)]" />
                    ) : maciekWon ? (
                      <span className="h-2 w-2 rounded-full bg-owner-500" />
                    ) : myrnaWon ? (
                      <span className="h-2 w-2 rounded-full bg-guest-500" />
                    ) : (
                      <span className="h-2 w-2 rounded-full bg-[var(--text-muted)]" />
                    )}
                    <span className="num max-w-full truncate text-caption text-muted">
                      {point.isFuture ? '—' : `${point.maciekPoints}:${point.myrnaPoints}`}
                    </span>
                  </button>
                );
              })}
            </div>

            {selectedBattleDay && (
              <div className="mt-4 space-y-2 border-t border-[var(--border-subtle)] pt-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-label text-foreground">
                    {selectedBattleDay.dayName} · <span className="num">{selectedBattleDay.dateStr}</span>
                    {selectedBattleDay.isToday && ' (Today)'}
                  </span>
                  <span className="num flex items-center gap-1.5 text-label font-semibold">
                    <span className="text-owner-300">{selectedBattleDay.maciekPoints} pts</span>
                    <span className="text-muted">:</span>
                    <span className="text-guest-300">{selectedBattleDay.myrnaPoints} pts</span>
                  </span>
                </div>

                {selectedBattleDay.maciekPoints + selectedBattleDay.myrnaPoints > 0 ? (
                  <div className="flex h-1.5 w-full gap-0.5 overflow-hidden rounded-full">
                    <div
                      className="h-full rounded-l-full bg-owner-500 transition-all duration-300"
                      style={{
                        width: `${Math.round(
                          (selectedBattleDay.maciekPoints /
                            (selectedBattleDay.maciekPoints + selectedBattleDay.myrnaPoints)) *
                            100
                        )}%`,
                      }}
                    />
                    <div
                      className="h-full rounded-r-full bg-guest-500 transition-all duration-300"
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
                  <p className="text-caption text-muted">
                    {selectedBattleDay.isFuture ? 'Future battle day' : 'No points scored yet'}
                  </p>
                )}
              </div>
            )}
          </section>
        )}

        {/* Categories: active categories + collapsible inactive */}
        {activeSubsegment === 'categories' && (
          <section aria-label="Category breakdown" className="surface surface-pad">
            <p className="text-caption text-muted">
              {activeCategories.length} active ·{' '}
              {selectedTier === 'karma' ? 'all time' : selectedTier === 'monthly' ? 'this month' : 'this week'}
            </p>

            {activeCategories.length > 0 ? (
              <ul className="mt-1 divide-y divide-[var(--border-subtle)]">
                {activeCategories.map((cat) => {
                  const total = cat.maciekPoints + cat.myrnaPoints;
                  const mPct = total === 0 ? 50 : Math.round((cat.maciekPoints / total) * 100);
                  const yPct = total === 0 ? 50 : 100 - mPct;

                  return (
                    <li key={cat.category} className="space-y-2 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <span className="truncate text-label text-foreground">{cat.label}</span>
                        <span className="num flex shrink-0 items-center gap-1.5 text-label font-semibold">
                          <span className="text-owner-300">{cat.maciekPoints}</span>
                          <span className="text-muted">:</span>
                          <span className="text-guest-300">{cat.myrnaPoints}</span>
                        </span>
                      </div>

                      <div
                        role="meter"
                        aria-label={`${cat.label} score share`}
                        aria-valuenow={cat.maciekPoints}
                        aria-valuemin={0}
                        aria-valuemax={Math.max(1, total)}
                        className="flex h-1.5 w-full gap-0.5 overflow-hidden rounded-full"
                      >
                        <div
                          className="h-full rounded-l-full bg-owner-500 transition-all duration-300"
                          style={{ width: `${mPct}%` }}
                        />
                        <div
                          className="h-full rounded-r-full bg-guest-500 transition-all duration-300"
                          style={{ width: `${yPct}%` }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="mt-3 text-label font-normal text-secondary">No category points logged in this timeframe yet.</p>
            )}

            {inactiveCategories.length > 0 && (
              <div className="mt-1 border-t border-[var(--border-subtle)] pt-1">
                <button
                  type="button"
                  aria-expanded={showInactiveCategories}
                  onClick={() => {
                    soundEngine.playClick();
                    hapticLight();
                    setShowInactiveCategories((prev) => !prev);
                  }}
                  className="-ml-1 flex min-h-11 items-center gap-1.5 px-1 text-label text-secondary transition-colors hover:text-foreground"
                >
                  {showInactiveCategories ? (
                    <>
                      <ChevronUp aria-hidden="true" className="h-4 w-4" />
                      <span>Hide {inactiveCategories.length} inactive categories</span>
                    </>
                  ) : (
                    <>
                      <ChevronDown aria-hidden="true" className="h-4 w-4" />
                      <span>+ {inactiveCategories.length} inactive categories</span>
                    </>
                  )}
                </button>

                {showInactiveCategories && (
                  <ul className="divide-y divide-[var(--border-subtle)]">
                    {inactiveCategories.map((cat) => (
                      <li key={cat.category} className="flex min-h-10 items-center justify-between text-label text-muted">
                        <span>{cat.label}</span>
                        <span className="num">0 : 0</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </section>
        )}
      </div>

      {/* Proof Gallery Modal */}
      {activeProofView && (
        <ProofGalleryModal
          isOpen={activeProofView !== null}
          onClose={() => setActiveProofView(null)}
          playerName={activeProofView.player.name}
          playerAvatar={activeProofView.player.avatar}
          habitTitle={activeProofView.habit.title}
          images={
            getProofPhotos(activeProofView.checkIn)
          }
          date={activeProofView.checkIn.date}
          completedAt={activeProofView.checkIn.completedAt}
        />
      )}
    </div>
  );
}
