'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
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
import { fireCelebrationConfetti } from '@/lib/confetti';
import { HabitCard } from './HabitCard';
import { DateNavigator } from './DateNavigator';
import dynamic from 'next/dynamic';

import { Habit } from '@/lib/types';
import { calculateHabitStreak } from '@/lib/score-calculator';

const ActivityFeed = dynamic(() => import('./ActivityFeed').then(module => module.ActivityFeed));
const ProofGalleryModal = dynamic(() => import('./ProofGalleryModal').then(module => module.ProofGalleryModal));

export function TodayView({ onOpenHabits, onOpenDuel }: { onOpenHabits: () => void; onOpenDuel?: () => void }) {
  const multiplayer = useMultiplayer();
  const {
    habits,
    activeHabits,
    isHabitSatisfiedOnDate,
    isHabitCompletedOnDate,
    getHabitCheckInOnDate,
    getWeeklyHabitCompletions,
    toggleHabit,
    updateCheckInNote,
    selectedDate,
    isTodaySelected,
    checkIns,
    restDays,
    activePlayer,
    isPartnerConnected,
    partnerId,
    players,
    partnerCleanSpaceCheckIn,
    partnerCleanSpaceHabit,
    isRestDay,
  } = useStore();
  const [activeSubTab, setActiveSubTab] = useState<'ritual' | 'feed'>('ritual');
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

  useEffect(() => {
    const lockTimers = lockTimersRef.current;
    const settleTimers = settleTimersRef.current;
    return () => {
      Object.values(lockTimers).forEach(clearTimeout);
      Object.values(settleTimers).forEach(clearTimeout);
      if (targetPulseTimerRef.current) clearTimeout(targetPulseTimerRef.current);
    };
  }, []);

  const context = `${activePlayer?.id}:${selectedDate}`;
  const points = checkIns
    .filter((checkIn) => checkIn.playerId === activePlayer?.id && checkIn.date === selectedDate)
    .reduce((sum, checkIn) => sum + checkIn.pointsEarned, 0);
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
  const partnerPoints = checkIns
    .filter((checkIn) => checkIn.playerId === partnerId && checkIn.date === selectedDate)
    .reduce((sum, checkIn) => sum + checkIn.pointsEarned, 0);
  const partnerRawPar = multiplayer.configured
    ? habits.filter((h) => h.playerId === partnerId && h.isActive).reduce((sum, h) => sum + h.points, 0)
    : par;
  const partnerPar = partnerRawPar > 0 ? partnerRawPar : par;
  const partnerPhotos = partnerCleanSpaceCheckIn?.proofUrls?.length
    ? partnerCleanSpaceCheckIn.proofUrls
    : partnerCleanSpaceCheckIn?.proofUrl
    ? [partnerCleanSpaceCheckIn.proofUrl]
    : [];
  const todayStr = getTodayDateString();
  const habitStreaks = useMemo(() => new Map(activeHabits.map(habit =>
    [habit.id, calculateHabitStreak(habit, checkIns, restDays, todayStr)]
  )), [activeHabits, checkIns, restDays, todayStr]);
  const getHabitCardProps = (habit: Habit) => ({
    habit,
    selectedDate,
    completed: isHabitCompletedOnDate(habit.id, selectedDate),
    checkIn: getHabitCheckInOnDate(habit.id, selectedDate),
    weeklyCompletions: getWeeklyHabitCompletions(habit.id, selectedDate),
    habitStreak: habitStreaks.get(habit.id) ?? 0,
    activePlayer,
    partnerPlayer: habit.category === 'environment' && habit.requiresProof ? partner : null,
    partnerCleanSpaceCheckIn: habit.category === 'environment' && habit.requiresProof ? partnerCleanSpaceCheckIn : undefined,
    partnerCleanSpaceHabit: habit.category === 'environment' && habit.requiresProof ? partnerCleanSpaceHabit : undefined,
    toggleHabit,
    updateCheckInNote,
  });

  const previous = useRef({ context, points, allDone });

  useEffect(() => {
    if (
      previous.current.context === context &&
      ((points >= par && previous.current.points < par) || (allDone && !previous.current.allDone))
    ) {
      soundEngine.playFanfare();
      fireCelebrationConfetti();
      hapticCelebration();
    }
    previous.current = { context, points, allDone };
  }, [context, points, allDone, par]);

  const formattedLongDate = parseDate(selectedDate).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  return (
    <div className="w-full space-y-4">
      {/* Top Header Row + Segmented View Switcher */}
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">
            {formattedLongDate}
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-white mt-0.5">
            {isTodaySelected ? 'Daily Ritual' : formatFriendlyDate(selectedDate)}
          </h1>
        </div>

        <div
          role="tablist"
          aria-label="Today views"
          className="flex p-0.5 rounded-lg bg-[#0e1013] border border-zinc-800"
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
              className={`px-3 py-1 rounded-md text-xs font-mono font-medium transition-colors ${
                activeSubTab === tab.id
                  ? 'bg-zinc-800/90 text-white shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeSubTab === 'feed' ? (
        <ActivityFeed />
      ) : (
        <div className="space-y-4">
          {/* Top Scrollable Calendar Strip */}
          <DateNavigator />

          {/* Rest Day Banner */}
          {isRest && (
            <div className="rounded-xl bg-indigo-950/30 border border-indigo-500/25 p-3.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-indigo-500/15 border border-indigo-500/25 flex items-center justify-center text-indigo-300 shrink-0">
                  <BedDouble className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-indigo-200">
                    Rest &amp; Recovery Day
                  </div>
                  <div className="text-[11px] font-mono text-indigo-300/70 truncate">
                    Streak protected for {formatFriendlyDate(selectedDate)}
                  </div>
                </div>
              </div>
              <span className="text-[10px] font-mono uppercase tracking-wider font-medium text-indigo-300 bg-indigo-500/15 px-2 py-0.5 rounded border border-indigo-500/25 shrink-0">
                Active
              </span>
            </div>
          )}

          {/* Daily Target Overview Card (Linear / Kinetic Telemetry Framing) */}
          <section
            key={activeTargetPulse ? `target-${activeTargetPulse.token}` : 'target-idle'}
            aria-label="Today progress"
            className={`relative rounded-xl bg-gradient-to-b from-[#12141a] to-[#0c0d10] border border-zinc-800/90 p-4 shadow-xs transition-colors ${
              activeTargetPulse
                ? progress >= 100
                  ? 'animate-target-pulse-emerald'
                  : 'animate-target-pulse-player'
                : ''
            }`}
          >
            <div className="flex items-start justify-between gap-4 mb-3">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">
                  {isTodaySelected ? 'Daily Target' : `Score · ${formatFriendlyDate(selectedDate)}`}
                </span>
                <div className="flex items-baseline gap-1.5 mt-0.5 flex-wrap">
                  <span
                    className={`text-3xl font-bold font-mono tracking-tight tabular-nums text-white ${
                      activeTargetPulse ? 'animate-target-score-bump' : ''
                    }`}
                  >
                    {points}
                  </span>
                  <span className="text-xs font-mono text-zinc-400">/ {par} pts</span>
                  {activeTargetPulse && activeTargetPulse.delta > 0 && (
                    <span
                      aria-hidden="true"
                      className={`inline-flex items-center gap-0.5 ml-1 px-1.5 py-0.5 rounded text-[11px] font-mono font-bold tracking-tight border animate-target-delta-flare ${
                        progress >= 100
                          ? 'bg-emerald-500/15 text-emerald-300 border-emerald-400/40 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                          : 'bg-player-500/15 text-player-300 border-player-400/40 shadow-[0_0_12px_color-mix(in_srgb,var(--player-base)_30%,transparent)]'
                      }`}
                    >
                      +{activeTargetPulse.delta} PTS
                    </span>
                  )}
                </div>
              </div>

              <div className="text-right">
                <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">
                  Habits Done
                </span>
                <div className="mt-1">
                  <span
                    className={`inline-flex items-center text-xs font-mono font-semibold px-2 py-0.5 rounded border tabular-nums transition-colors ${
                      activeTargetPulse
                        ? 'text-player-200 bg-player-500/15 border-player-400/40'
                        : 'text-white bg-zinc-900/90 border-zinc-800'
                    }`}
                  >
                    {satisfiedHabits.length} / {activeHabits.length}
                  </span>
                </div>
              </div>
            </div>

            {/* Linear progress bar with Kinetic Energy Surge */}
            <div
              role="progressbar"
              aria-label={`Today's progress: ${points} of ${par} points`}
              aria-valuenow={points}
              aria-valuemin={0}
              aria-valuemax={Math.max(1, par)}
              className="relative w-full h-2 rounded-full bg-zinc-800/90 overflow-hidden"
            >
              <div
                className={`relative h-full rounded-full transition-[width] duration-500 ease-out ${
                  progress >= 100
                    ? 'bg-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.6)]'
                    : 'bg-gradient-to-r from-player-600 via-player-500 to-player-400 shadow-[0_0_12px_color-mix(in_srgb,var(--player-base)_45%,transparent)]'
                }`}
                style={{ width: `${progress}%` }}
              >
                {activeTargetPulse && progress > 0 && (
                  <>
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-white/80 to-transparent animate-target-bar-surge"
                    />
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-white shadow-[0_0_10px_2px_rgba(255,255,255,0.95)]"
                    />
                  </>
                )}
              </div>
            </div>

            {allDone || progress >= 100 ? (
              <div className="mt-3 flex items-center justify-between gap-2 text-xs font-mono font-medium text-emerald-400 bg-emerald-500/10 py-1.5 px-2.5 rounded-lg border border-emerald-500/20">
                <span className="flex items-center gap-1.5 truncate">
                  <Trophy className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">
                    {allDone
                      ? 'Daily Par Complete · All habits checked in'
                      : `Daily Par Achieved (+${points} pts)`}
                  </span>
                </span>
                <span className="tabular-nums shrink-0">{progress}%</span>
              </div>
            ) : (
              <div className="mt-2.5 flex items-center justify-between text-[11px] text-zinc-400 font-mono">
                <span>{Math.max(0, par - points)} pts to daily par</span>
                <span className="tabular-nums text-zinc-300">{progress}%</span>
              </div>
            )}

            {/* Integrated Partner Accountability Row */}
            {partner ? (
              <div style={getPlayerThemeStyles(partner)} className="mt-3.5 pt-3 border-t border-zinc-800/80 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-6 h-6 rounded-md flex items-center justify-center text-[11px] font-mono font-bold border shrink-0 bg-player-500/10 border-player-500/25 text-player-300"
                  >
                    {partner.name[0]}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-200">
                      <span className="truncate">{partner.name}&apos;s day</span>
                      <span className="text-zinc-600">·</span>
                      <span className="font-mono text-[11px] text-zinc-400 tabular-nums">
                        {partnerPoints}/{partnerPar} pts
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {partnerPhotos.length > 0 ? (
                    <button
                      onClick={() => {
                        soundEngine.playClick();
                        hapticLight();
                        setProofIndex(0);
                      }}
                      className="inline-flex items-center gap-1 text-[10px] font-mono font-medium text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-500/25 transition-colors"
                    >
                      <Camera className="w-3 h-3" />
                      <span>Proof ({partnerPhotos.length})</span>
                      <ArrowUpRight className="w-3 h-3" />
                    </button>
                  ) : partnerCleanSpaceCheckIn ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      <CheckCircle2 className="w-3 h-3" />
                      Verified
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] font-mono text-zinc-400 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
                      <Clock className="w-3 h-3 text-zinc-500" />
                      Pending
                    </span>
                  )}
                </div>
              </div>
            ) : multiplayer.configured && multiplayer.duel && !isPartnerConnected ? (
              <div className="mt-3.5 pt-3 border-t border-zinc-800/80 flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-xs font-medium text-zinc-200">
                    No opponent account matched yet
                  </div>
                  <div className="text-[11px] font-mono text-zinc-400">
                    Invite someone with an account to join your duel
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
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
                    className="inline-flex items-center gap-1 text-[11px] font-mono font-semibold text-black bg-white hover:bg-zinc-200 px-2.5 py-1 rounded-lg transition-colors"
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
                      className="inline-flex items-center gap-1 text-[11px] font-mono text-zinc-300 bg-zinc-900 hover:bg-zinc-800 px-2.5 py-1 rounded-lg border border-zinc-800 transition-colors"
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
            <div className="space-y-4">
              <section aria-labelledby="pending-heading" className="space-y-2">
                <div className="flex items-center justify-between px-0.5">
                  <h2
                    id="pending-heading"
                    className="text-[11px] font-mono font-semibold uppercase tracking-wider text-zinc-400"
                  >
                    Incomplete ({pending.length})
                  </h2>
                  <button
                    onClick={onOpenHabits}
                    className="text-[11px] font-mono text-zinc-400 hover:text-white flex items-center gap-1 transition-colors"
                  >
                    <Plus className="w-3 h-3" />
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
                  <div className="flex items-center gap-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.06] px-4 py-3.5 text-xs font-mono text-emerald-300">
                    <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                    <span>All rituals completed for {isTodaySelected ? 'today' : formatFriendlyDate(selectedDate)}.</span>
                  </div>
                )}
              </section>

              {done.length > 0 && (
                <section aria-labelledby="done-heading" className="space-y-2 pt-1">
                  <div className="flex items-center gap-1.5 px-0.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-zinc-500" />
                    <h2
                      id="done-heading"
                      className="text-[11px] font-mono font-semibold uppercase tracking-wider text-zinc-500"
                    >
                      Completed ({done.length})
                    </h2>
                  </div>
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
            <div className="rounded-xl border border-zinc-800 bg-[#0e1013] px-5 py-7">
              <h2 className="text-sm font-semibold">Start with one habit.</h2>
              <p className="mt-1 text-xs text-zinc-400">Add something you want to do today.</p>
              <button onClick={onOpenHabits} className="control control-primary mt-5">
                <Plus size={15} /> Add a habit
              </button>
            </div>
          )}
        </div>
      )}

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
