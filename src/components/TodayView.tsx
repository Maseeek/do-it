'use client';

import { proofPhotos as getProofPhotos } from '@/lib/duel-data';

import { Activity, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  Activity as ActivityIcon,
  ArrowUpRight,
  BedDouble,
  Camera,
  CheckCircle2,
  Clock,
  Plus,
  Trophy,
} from 'lucide-react';
import { useStore } from '@/lib/store';
import { getPlayerThemeStyles } from '@/lib/player-colors';
import { useMultiplayer } from '@/lib/multiplayer';
import { formatFriendlyDate, getTodayDateString, parseDate } from '@/lib/date-utils';
import { soundEngine } from '@/lib/sound-utils';
import { hapticCelebration, hapticLight } from '@/lib/haptic-utils';
import { HabitCard } from './HabitCard';
import { DateNavigator } from './DateNavigator';
import { createDeferredView } from './DeferredView';

import { Habit } from '@/lib/types';

const { View: ActivityFeed, useReady: useActivityFeedReady } = createDeferredView(() => import('./ActivityFeed').then(module => module.ActivityFeed), undefined, { prefetch: true });
const { View: ProofGalleryModal } = createDeferredView(() => import('./ProofGalleryModal').then(module => module.ProofGalleryModal), null, { prefetch: true });

export function TodayView({
  onOpenHabits,
  onOpenDuel,
  onOpenSettings,
}: {
  onOpenHabits: () => void;
  onOpenDuel?: () => void;
  onOpenSettings?: () => void;
}) {
  const multiplayer = useMultiplayer();
  const {
    habits,
    activeHabits,
    isHabitSatisfiedOnDate,
    isHabitCompletedOnDate,
    getHabitCheckInOnDate,
    getWeeklyHabitCompletions,
    toggleHabit,
    logSleepHours,
    updateHabit,
    updateCheckInNote,
    selectedDate,
    isTodaySelected,
    checkIns,
    getHabitStreak,
    activePlayer,
    isPartnerConnected,
    partnerId,
    players,
    partnerCleanSpaceCheckIn,
    partnerCleanSpaceHabit,
    isRestDay,
    getHealthTelemetryOnDate,
    healthAttentionMessage,
    wearableConfig,
  } = useStore();
  const [activeSubTab, setActiveSubTab] = useState<'ritual' | 'feed'>('ritual');
  const activityFeedReady = useActivityFeedReady();
  const [proofIndex, setProofIndex] = useState<number | null>(null);
  const [inviteCopied, setInviteCopied] = useState(false);
  const [lockingMap, setLockingMap] = useState<Record<string, string>>({});
  const [settledMap, setSettledMap] = useState<Record<string, string>>({});
  const [targetPulse, setTargetPulse] = useState<{
    context: string;
    token: number;
    delta: number;
  } | null>(null);

  const lockTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const settleTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const targetPulseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Runs when another section hides Today, too: stopping the timers would
  // otherwise leave check-in animations frozen until Today is shown again.
  useLayoutEffect(() => {
    const lockTimers = lockTimersRef.current;
    const settleTimers = settleTimersRef.current;
    return () => {
      Object.values(lockTimers).forEach(clearTimeout);
      Object.values(settleTimers).forEach(clearTimeout);
      if (targetPulseTimerRef.current) clearTimeout(targetPulseTimerRef.current);
      setLockingMap(prev => (Object.keys(prev).length ? {} : prev));
      setSettledMap(prev => (Object.keys(prev).length ? {} : prev));
      setTargetPulse(null);
    };
  }, []);

  const context = `${activePlayer?.id}:${selectedDate}`;
  const points = useMemo(() => checkIns
    .filter((checkIn) => checkIn.playerId === activePlayer?.id && checkIn.date === selectedDate)
    .reduce((sum, checkIn) => sum + checkIn.pointsEarned, 0), [checkIns, activePlayer?.id, selectedDate]);
  const rawPar = multiplayer.configured
    ? activeHabits.reduce((sum, habit) => sum + habit.points, 0)
    : 240;
  const par = rawPar > 0 ? rawPar : 240;
  const satisfiedHabits = activeHabits.filter((habit) =>
    isHabitSatisfiedOnDate(habit.id, selectedDate)
  );
  const pending = activeHabits.filter(
    (habit) =>
      !isHabitSatisfiedOnDate(habit.id, selectedDate) || lockingMap[habit.id] === context
  );
  const done = activeHabits.filter(
    (habit) =>
      isHabitSatisfiedOnDate(habit.id, selectedDate) && lockingMap[habit.id] !== context
  );
  const allDone = activeHabits.length > 0 && satisfiedHabits.length === activeHabits.length;
  const progress = par > 0 ? Math.min(100, Math.round((points / par) * 100)) : 0;
  const isRest = isRestDay(selectedDate);
  const activeTargetPulse =
    targetPulse && targetPulse.context === context ? targetPulse : null;

  const handleHabitCheckIn = useCallback((habitId: string, pointsEarned: number, wasAlreadySatisfied: boolean) => {
    const reducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (pointsEarned > 0) {
      if (targetPulseTimerRef.current) clearTimeout(targetPulseTimerRef.current);
      setTargetPulse((prev) => ({
        context,
        token: (prev?.token ?? 0) + 1,
        delta: pointsEarned,
      }));
      targetPulseTimerRef.current = setTimeout(() => {
        setTargetPulse(null);
      }, 720);
    }

    if (!reducedMotion && !wasAlreadySatisfied) {
      if (lockTimersRef.current[habitId]) clearTimeout(lockTimersRef.current[habitId]);
      if (settleTimersRef.current[habitId]) clearTimeout(settleTimersRef.current[habitId]);

      setLockingMap((prev) => ({ ...prev, [habitId]: context }));

      lockTimersRef.current[habitId] = setTimeout(() => {
        setLockingMap((prev) => {
          const next = { ...prev };
          delete next[habitId];
          return next;
        });
        setSettledMap((prev) => ({ ...prev, [habitId]: context }));

        settleTimersRef.current[habitId] = setTimeout(() => {
          setSettledMap((prev) => {
            const next = { ...prev };
            delete next[habitId];
            return next;
          });
        }, 320);
      }, 480);
    }
  }, [context]);

  const handleHabitUncheck = useCallback((habitId: string) => {
    if (lockTimersRef.current[habitId]) clearTimeout(lockTimersRef.current[habitId]);
    if (settleTimersRef.current[habitId]) clearTimeout(settleTimersRef.current[habitId]);
    setLockingMap((prev) => {
      if (!prev[habitId]) return prev;
      const next = { ...prev };
      delete next[habitId];
      return next;
    });
    setSettledMap((prev) => {
      if (!prev[habitId]) return prev;
      const next = { ...prev };
      delete next[habitId];
      return next;
    });
  }, []);

  const partner = partnerId ? players[partnerId] : null;
  const partnerPoints = useMemo(() => checkIns
    .filter((checkIn) => checkIn.playerId === partnerId && checkIn.date === selectedDate)
    .reduce((sum, checkIn) => sum + checkIn.pointsEarned, 0), [checkIns, partnerId, selectedDate]);
  const partnerRawPar = multiplayer.configured
    ? habits.filter((h) => h.playerId === partnerId && h.isActive).reduce((sum, h) => sum + h.points, 0)
    : par;
  const partnerPar = partnerRawPar > 0 ? partnerRawPar : par;
  const partnerPhotos = getProofPhotos(partnerCleanSpaceCheckIn);
  const todayStr = getTodayDateString();
  const habitStreaks = useMemo(() => new Map(activeHabits.map(habit =>
    [habit.id, getHabitStreak(habit, todayStr)]
  )), [activeHabits, getHabitStreak, todayStr]);
  const getHabitCardProps = (habit: Habit) => ({
    habit,
    selectedDate,
    completed: isHabitCompletedOnDate(habit.id, selectedDate),
    checkIn: getHabitCheckInOnDate(habit.id, selectedDate),
    telemetry: getHealthTelemetryOnDate(habit.id, selectedDate),
    weeklyCompletions: getWeeklyHabitCompletions(habit.id, selectedDate),
    habitStreak: habitStreaks.get(habit.id) ?? 0,
    activePlayer,
    partnerPlayer: habit.category === 'environment' && habit.requiresProof ? partner : null,
    partnerCleanSpaceCheckIn: habit.category === 'environment' && habit.requiresProof ? partnerCleanSpaceCheckIn : undefined,
    partnerCleanSpaceHabit: habit.category === 'environment' && habit.requiresProof ? partnerCleanSpaceHabit : undefined,
    toggleHabit,
    logSleepHours,
    updateHabit,
    updateCheckInNote,
    isGoogleHealthConnected: Boolean(wearableConfig?.googleConnected),
  });

  const previous = useRef<{ context: string; points: number; allDone: boolean } | null>({ context, points, allDone });

  useEffect(() => {
    const last = previous.current;
    if (
      last?.context === context &&
      ((points >= par && last.points < par) || (allDone && !last.allDone))
    ) {
      soundEngine.playFanfare();
      hapticCelebration();
    }
    previous.current = { context, points, allDone };
  }, [context, points, allDone, par]);

  // Check-ins synced while Today was hidden should not celebrate on return.
  useEffect(() => () => { previous.current = null; }, []);

  const formattedLongDate = parseDate(selectedDate).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
  const isComplete = allDone || progress >= 100;
  const pointsToGo = Math.max(0, par - points);

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      {/* Page title + view switcher */}
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-label text-[var(--text-secondary)]">{formattedLongDate}</p>
          <h1 className="mt-0.5 truncate text-title-lg text-foreground">
            {isTodaySelected ? 'Today' : formatFriendlyDate(selectedDate)}
          </h1>
        </div>

        <div
          role="tablist"
          aria-label="Today views"
          className="flex shrink-0 rounded-full bg-[var(--surface-2)] p-0.5"
        >
          {([
            { id: 'ritual', label: 'Ritual' },
            { id: 'feed', label: 'Activity' },
          ] as const).map((tab) => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeSubTab === tab.id}
              onClick={() => {
                soundEngine.playClick();
                hapticLight();
                setActiveSubTab(tab.id);
              }}
              className={`min-h-9 rounded-full px-3.5 text-label transition-colors ${
                activeSubTab === tab.id
                  ? 'bg-[var(--surface-1)] text-foreground shadow-xs'
                  : 'text-[var(--text-secondary)] hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Both views stay mounted, so switching between them only reveals one. */}
      <div>
      <Activity mode={activeSubTab === 'feed' ? 'visible' : 'hidden'}>
        {(activeSubTab === 'feed' || activityFeedReady) && <ActivityFeed />}
      </Activity>
      <Activity mode={activeSubTab === 'ritual' ? 'visible' : 'hidden'}>
        <div className="space-y-6">
          <DateNavigator />

          {/* Google Health attention notice (only when a check reports an expired token, missing scope, or failure) */}
          {healthAttentionMessage && (
            <div
              role="status"
              className="flex items-center justify-between gap-3 rounded-[var(--radius-card)] border border-amber-400/25 bg-amber-400/[0.08] px-4 py-3 text-label text-amber-700 dark:text-amber-200"
            >
              <span className="flex min-w-0 items-center gap-2.5">
                <ActivityIcon className="size-4 shrink-0" aria-hidden="true" />
                <span className="min-w-0 font-normal">{healthAttentionMessage}</span>
              </span>
              {onOpenSettings && (
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    hapticLight();
                    onOpenSettings();
                  }}
                  className="shrink-0 font-medium underline underline-offset-2"
                >
                  Settings
                </button>
              )}
            </div>
          )}

          {/* Rest Day note */}
          {isRest && (
            <div className="flex items-center gap-3 rounded-[var(--radius-card)] bg-indigo-500/10 px-4 py-3">
              <BedDouble className="size-4 shrink-0 text-indigo-500 dark:text-indigo-300" aria-hidden="true" />
              <p className="min-w-0 text-label">
                <span className="text-indigo-700 dark:text-indigo-200">Rest &amp; Recovery Day</span>
                <span className="font-normal text-[var(--text-secondary)]"> · streak protected for {isTodaySelected ? 'today' : formatFriendlyDate(selectedDate)}</span>
              </p>
            </div>
          )}

          {/* Daily target: one number, one bar, one line; partner as a single row */}
          <section
            key={activeTargetPulse ? `target-${activeTargetPulse.token}` : 'target-idle'}
            aria-label="Today progress"
            className={`surface surface-pad relative transition-colors ${
              activeTargetPulse
                ? progress >= 100
                  ? 'animate-target-pulse-emerald'
                  : 'animate-target-pulse-player'
                : ''
            }`}
          >
            <div className="flex items-baseline gap-1.5">
              <span
                className={`num text-display text-foreground ${
                  activeTargetPulse ? 'animate-target-score-bump' : ''
                }`}
              >
                {points}
              </span>
              <span className="num text-body text-[var(--text-secondary)]">/ {par} pts</span>
              {activeTargetPulse && activeTargetPulse.delta > 0 && (
                <span
                  aria-hidden="true"
                  className={`num ml-1 rounded-full px-2 py-0.5 text-caption font-semibold animate-target-delta-flare ${
                    progress >= 100
                      ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300'
                      : 'bg-player-500/15 text-player-600 dark:text-player-300'
                  }`}
                >
                  +{activeTargetPulse.delta}
                </span>
              )}
            </div>

            <div
              role="progressbar"
              aria-label={`Today's progress: ${points} of ${par} points`}
              aria-valuenow={points}
              aria-valuemin={0}
              aria-valuemax={Math.max(1, par)}
              className="relative mt-3 h-2 w-full overflow-hidden rounded-full bg-[var(--surface-3)]"
            >
              <div
                className={`relative h-full rounded-full transition-[width] duration-500 ease-out ${
                  progress >= 100 ? 'bg-emerald-500' : 'bg-player-500'
                }`}
                style={{ width: `${progress}%` }}
              >
                {activeTargetPulse && progress > 0 && (
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-white/70 to-transparent animate-target-bar-surge"
                  />
                )}
              </div>
            </div>

            <p
              className={`mt-3 flex items-center gap-1.5 text-label font-normal ${
                isComplete ? 'text-emerald-600 dark:text-emerald-400' : 'text-[var(--text-secondary)]'
              }`}
            >
              {isComplete && <Trophy className="size-4 shrink-0" aria-hidden="true" />}
              <span className="num truncate">
                {allDone
                  ? 'Daily par complete · all habits checked in'
                  : progress >= 100
                  ? `Daily par achieved · ${satisfiedHabits.length} of ${activeHabits.length} habits`
                  : `${pointsToGo} pts to daily par · ${satisfiedHabits.length} of ${activeHabits.length} habits`}
              </span>
            </p>

            {/* Partner, one line */}
            {partner ? (
              <div
                style={getPlayerThemeStyles(partner)}
                className="-mb-2 mt-4 flex items-center justify-between gap-3 border-t border-[var(--border-subtle)] pt-2"
              >
                <div className="flex min-w-0 items-center gap-2.5 py-2.5">
                  <span
                    aria-hidden="true"
                    className="flex size-6 shrink-0 items-center justify-center rounded-full bg-player-500/15 text-caption font-semibold text-player-600 dark:text-player-300"
                  >
                    {partner.name[0]}
                  </span>
                  <p className="min-w-0 truncate text-label">
                    <span className="text-foreground">{partner.name}</span>
                    <span className="num font-normal text-[var(--text-secondary)]"> · {partnerPoints}/{partnerPar} pts</span>
                  </p>
                </div>

                {partnerPhotos.length > 0 ? (
                  <button
                    onClick={() => {
                      soundEngine.playClick();
                      hapticLight();
                      setProofIndex(0);
                    }}
                    className="-mr-2 flex min-h-11 shrink-0 items-center gap-1.5 rounded-full px-2 text-label text-emerald-600 transition-colors hover:bg-emerald-500/10 dark:text-emerald-400"
                  >
                    <Camera className="size-4" aria-hidden="true" />
                    <span className="num">Proof ({partnerPhotos.length})</span>
                    <ArrowUpRight className="size-3.5" aria-hidden="true" />
                  </button>
                ) : partnerCleanSpaceCheckIn ? (
                  <span className="flex shrink-0 items-center gap-1.5 text-label font-normal text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="size-4" aria-hidden="true" />
                    Verified
                  </span>
                ) : (
                  <span className="flex shrink-0 items-center gap-1.5 text-label font-normal text-[var(--text-muted)]">
                    <Clock className="size-4" aria-hidden="true" />
                    Pending
                  </span>
                )}
              </div>
            ) : multiplayer.configured && multiplayer.duel && !isPartnerConnected ? (
              <div className="mt-4 space-y-3 border-t border-[var(--border-subtle)] pt-4">
                <p className="text-label">
                  <span className="text-foreground">No opponent account matched yet</span>
                  <span className="block font-normal text-[var(--text-secondary)]">
                    Invite someone with an account to join your duel
                  </span>
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      soundEngine.playClick();
                      hapticLight();
                      const url = `${window.location.origin}/?invite=${multiplayer.duel?.invite_code}`;
                      try {
                        await navigator.clipboard.writeText(url);
                        setInviteCopied(true);
                        setTimeout(() => setInviteCopied(false), 2500);
                      } catch {
                        if (onOpenDuel) onOpenDuel();
                      }
                    }}
                    className="control control-primary"
                  >
                    <span>{inviteCopied ? 'Invite copied!' : 'Copy invite link'}</span>
                  </button>
                  {onOpenDuel && (
                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.playClick();
                        hapticLight();
                        onOpenDuel();
                      }}
                      className="control"
                    >
                      <span>Invite options</span>
                    </button>
                  )}
                </div>
              </div>
            ) : null}
          </section>

          {/* Habits Lists */}
          {activeHabits.length > 0 ? (
            <div className="space-y-6">
              <section aria-labelledby="pending-heading" className="space-y-2">
                <div className="flex items-center justify-between">
                  <h2 id="pending-heading" className="text-headline text-foreground">
                    Incomplete{' '}
                    <span className="num font-normal text-[var(--text-muted)]">{pending.length}</span>
                  </h2>
                  <button
                    onClick={onOpenHabits}
                    className="-mr-3 flex min-h-11 items-center gap-1 rounded-full px-3 text-label text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-2)] hover:text-foreground"
                  >
                    <Plus className="size-4" aria-hidden="true" />
                    <span>Manage</span>
                  </button>
                </div>

                {pending.length > 0 ? (
                  <div className="space-y-2">
                    {pending.map((habit) => (
                      <HabitCard
                        key={`${context}:${habit.id}`}
                        {...getHabitCardProps(habit)}
                        isLocking={lockingMap[habit.id] === context}
                        onCheckIn={handleHabitCheckIn}
                        onUncheck={handleHabitUncheck}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="flex items-center gap-2.5 rounded-[var(--radius-card)] bg-emerald-500/10 px-4 py-3.5 text-label font-normal text-emerald-700 dark:text-emerald-300">
                    <CheckCircle2 className="size-4 shrink-0 text-emerald-500" aria-hidden="true" />
                    <span>All rituals completed for {isTodaySelected ? 'today' : formatFriendlyDate(selectedDate)}.</span>
                  </p>
                )}
              </section>

              {done.length > 0 && (
                <section aria-labelledby="done-heading" className="space-y-2">
                  <h2 id="done-heading" className="flex min-h-11 items-center text-headline text-[var(--text-secondary)]">
                    Completed&nbsp;
                    <span className="num font-normal text-[var(--text-muted)]">{done.length}</span>
                  </h2>
                  <div className="space-y-2">
                    {done.map((habit) => (
                      <HabitCard
                        key={`${context}:${habit.id}`}
                        {...getHabitCardProps(habit)}
                        justSettled={settledMap[habit.id] === context}
                        onCheckIn={handleHabitCheckIn}
                        onUncheck={handleHabitUncheck}
                      />
                    ))}
                  </div>
                </section>
              )}
            </div>
          ) : (
            <div className="surface px-5 py-7">
              <h2 className="text-headline">Start with one habit.</h2>
              <p className="mt-1 text-body text-[var(--text-secondary)]">Add something you want to do today.</p>
              <button onClick={onOpenHabits} className="control control-primary mt-5">
                <Plus size={16} /> Add a habit
              </button>
            </div>
          )}
        </div>
      </Activity>
      </div>

      {proofIndex !== null && partner && partnerPhotos.length > 0 && (
        <ProofGalleryModal
          isOpen
          onClose={() => setProofIndex(null)}
          playerName={partner.name}
          playerAvatar={partner.avatar}
          habitTitle={partnerCleanSpaceHabit?.title || 'Clean Space'}
          images={partnerPhotos}
          date={partnerCleanSpaceCheckIn?.date}
          completedAt={partnerCleanSpaceCheckIn?.completedAt}
          initialIndex={proofIndex}
        />
      )}
    </div>
  );
}
