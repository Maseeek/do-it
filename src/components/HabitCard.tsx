'use client';

import { proofPhotos as getProofPhotos } from '@/lib/duel-data';

import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { CheckIn, Habit, HealthTelemetryRecord, Player } from '@/lib/types';
import { getHealthProgressDetails, getManualSleepHours } from '@/lib/health-correlation';
import { applySleepTarget, calculateHealthPoints, getSleepTarget, isAutoSleepNote, isSleepHabit } from '@/lib/health-rewards';
import { createDeferredView } from './DeferredView';
import { SleepSlider } from './SleepSlider';


import {
  Activity,
  BookOpen,
  Camera,
  Flame,
  Lock,
  MessageSquare,
  MessageSquarePlus,
  Minus,
  Plus,
  X,
} from 'lucide-react';
import { soundEngine } from '@/lib/sound-utils';
import { hapticLight, hapticSuccess } from '@/lib/haptic-utils';

const { View: ProofModal } = createDeferredView(() => import('./ProofModal').then(module => module.ProofModal), null, { prefetch: true });
const { View: ProofGalleryModal } = createDeferredView(() => import('./ProofGalleryModal').then(module => module.ProofGalleryModal), null, { prefetch: true });

interface HabitCardProps {
  habit: Habit;
  selectedDate: string;
  completed: boolean;
  checkIn: CheckIn | undefined;
  telemetry?: HealthTelemetryRecord;
  weeklyCompletions: number;
  habitStreak: number;
  activePlayer: Player | null;
  partnerPlayer: Player | null;
  partnerCleanSpaceCheckIn: CheckIn | undefined;
  partnerCleanSpaceHabit: Habit | undefined;
  toggleHabit: (habitId: string, proofUrl?: string | string[], quantity?: number, note?: string, targetDate?: string) => void;
  logSleepHours?: (habitId: string, hours: number, targetDate?: string) => void;
  updateHabit?: (habit: Habit) => void;
  updateCheckInNote: (checkInId: string, note: string) => void;
  isGoogleHealthConnected?: boolean;
  isLocking?: boolean;
  justSettled?: boolean;
  onCheckIn?: (habitId: string, pointsEarned: number, wasAlreadySatisfied: boolean) => void;
  onUncheck?: (habitId: string) => void;
}

export const HabitCard = React.memo(function HabitCard({
  habit,
  selectedDate,
  completed,
  checkIn,
  telemetry,
  weeklyCompletions,
  habitStreak,
  activePlayer,
  partnerPlayer,
  partnerCleanSpaceCheckIn,
  partnerCleanSpaceHabit,
  toggleHabit,
  logSleepHours,
  updateHabit,
  updateCheckInNote,
  isGoogleHealthConnected = false,
  isLocking = false,
  justSettled = false,
  onCheckIn,
  onUncheck,
}: HabitCardProps) {

  const [isProofModalOpen, setIsProofModalOpen] = useState(false);
  const [showFullProof, setShowFullProof] = useState(false);
  const [showPartnerProof, setShowPartnerProof] = useState(false);
  const [showQtyLogger, setShowQtyLogger] = useState(false);
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [localPulse, setLocalPulse] = useState<{ points: number; token: number } | null>(null);
  const pulseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [lockedAlertMessage, setLockedAlertMessage] = useState<string | null>(null);

  const healthProgress = React.useMemo(
    () => getHealthProgressDetails(habit, telemetry, checkIn),
    [habit, telemetry, checkIn]
  );
  const sleepHabit = isSleepHabit(habit);
  const sleepTarget = sleepHabit ? getSleepTarget(habit) : 8.5;
  const showManualSleepSlider = Boolean(sleepHabit && !isGoogleHealthConnected && !healthProgress && logSleepHours);
  const manualSleepHours = showManualSleepSlider ? getManualSleepHours(habit, checkIn) : null;
  const isHealthLocked = Boolean(healthProgress && (healthProgress.metric === 'sleep' || (healthProgress.isLocked && !completed)));
  const availablePoints = healthProgress ? calculateHealthPoints(habit, healthProgress.value) : habit.points;

  useEffect(() => {
    if (!lockedAlertMessage) return;
    const timer = setTimeout(() => {
      setLockedAlertMessage(null);
    }, 4500);
    return () => clearTimeout(timer);
  }, [lockedAlertMessage]);

  // Also runs when another section hides Today; don't leave the pulse stuck.
  useLayoutEffect(() => {
    return () => {
      if (pulseTimerRef.current) clearTimeout(pulseTimerRef.current);
      setLocalPulse(null);
    };
  }, []);

  const isWeeklyHabit = Boolean(habit.weeklyTargetDays && habit.weeklyTargetDays > 0);
  const isWeeklyTargetMet = isWeeklyHabit && weeklyCompletions >= habit.weeklyTargetDays!;
  const satisfied = completed || isWeeklyTargetMet;
  const isPulsing = Boolean(isLocking || localPulse);
  const pulsePoints = localPulse?.points ?? checkIn?.pointsEarned ?? (isWeeklyTargetMet ? 0 : availablePoints);

  const proofPhotos = getProofPhotos(checkIn);

  const partnerProofPhotos = getProofPhotos(partnerCleanSpaceCheckIn);

  const isCleanSpace = habit.category === 'environment' && habit.requiresProof;
  const [quantity, setQuantity] = useState<number>(checkIn?.quantity || habit.maxQuantity || 25);

  const triggerKineticPulse = (earnedPts: number) => {
    if (pulseTimerRef.current) clearTimeout(pulseTimerRef.current);
    setLocalPulse((prev) => ({ points: earnedPts, token: (prev?.token ?? 0) + 1 }));
    onCheckIn?.(habit.id, earnedPts, satisfied);
    pulseTimerRef.current = setTimeout(() => {
      setLocalPulse(null);
    }, 520);
  };

  const clearKineticPulse = () => {
    if (pulseTimerRef.current) clearTimeout(pulseTimerRef.current);
    setLocalPulse(null);
    onUncheck?.(habit.id);
  };

  const handleToggle = () => {
    if (isHealthLocked && healthProgress) {
      soundEngine.playUncheck();
      hapticLight();
      setLockedAlertMessage(healthProgress.lockReason);
      return;
    }

    if (showManualSleepSlider && logSleepHours) {
      if (completed) {
        clearKineticPulse();
        logSleepHours(habit.id, 0, selectedDate);
      } else if (habit.requiresProof && proofPhotos.length === 0) {
        soundEngine.playClick();
        hapticLight();
        setIsProofModalOpen(true);
      } else {
        const earnedPts = isWeeklyTargetMet ? 0 : habit.points;
        triggerKineticPulse(earnedPts);
        logSleepHours(habit.id, sleepTarget, selectedDate);
      }
      return;
    }

    if (habit.isQuantitative) {
      soundEngine.playClick();
      hapticLight();
      if (completed) {
        clearKineticPulse();
        toggleHabit(habit.id, undefined, undefined, undefined, selectedDate);
      } else {
        setShowQtyLogger(true);
      }
      return;
    }

    if (completed) {
      soundEngine.playUncheck();
      hapticLight();
      clearKineticPulse();
      toggleHabit(habit.id, undefined, undefined, undefined, selectedDate);
    } else {
      if (habit.requiresProof && proofPhotos.length === 0) {
        soundEngine.playClick();
        hapticLight();
        setIsProofModalOpen(true);
      } else {
        const earnedPts = isWeeklyTargetMet ? 0 : availablePoints;
        soundEngine.playCheck();
        hapticSuccess();
        triggerKineticPulse(earnedPts);
        toggleHabit(habit.id, undefined, undefined, undefined, selectedDate);
      }
    }
  };

  const handleCommitSleepHours = (hours: number) => {
    if (!logSleepHours) return;
    const earnedPts = isWeeklyTargetMet && !completed ? 0 : calculateHealthPoints(habit, hours);
    const prevPts = completed ? (checkIn?.pointsEarned ?? 0) : 0;
    if (earnedPts > 0) {
      if (!completed) {
        triggerKineticPulse(earnedPts);
      } else if (earnedPts > prevPts) {
        triggerKineticPulse(earnedPts - prevPts);
      }
    } else if (completed) {
      clearKineticPulse();
    }
    logSleepHours(habit.id, hours, selectedDate);
  };

  const handleUpdateSleepTarget = (nextTarget: number) => {
    updateHabit?.(applySleepTarget(habit, nextTarget));
  };

  const handleProofConfirmed = (proofUrls?: string[]) => {
    const earnedPts = completed ? 0 : isWeeklyTargetMet ? 0 : availablePoints;
    soundEngine.playCheck();
    hapticSuccess();
    triggerKineticPulse(earnedPts);
    toggleHabit(habit.id, proofUrls, undefined, undefined, selectedDate);
  };

  const handleLogQuantity = (qty: number) => {
    const clampedQty = Math.min(habit.maxQuantity || qty, Math.max(1, Math.floor(qty)));
    const newPts = isWeeklyTargetMet
      ? 0
      : Math.min(habit.points, Math.max(1, Math.round(clampedQty * (habit.pointsPerUnit || 1))));
    const prevPts = completed ? (checkIn?.pointsEarned ?? 0) : 0;
    const earnedPts = Math.max(0, newPts - prevPts) || newPts;

    soundEngine.playCheck();
    hapticSuccess();
    setQuantity(qty);
    triggerKineticPulse(earnedPts);
    toggleHabit(habit.id, undefined, qty, undefined, selectedDate);
    setShowQtyLogger(false);
  };

  const handleSaveNote = (e: React.FormEvent) => {
    e.preventDefault();
    soundEngine.playClick();
    hapticLight();
    if (checkIn) {
      updateCheckInNote(checkIn.id, noteText.trim());
    } else {
      if (isHealthLocked) {
        setLockedAlertMessage(healthProgress?.lockReason ?? null);
        return;
      }
      const earnedPts = isWeeklyTargetMet ? 0 : availablePoints;
      triggerKineticPulse(earnedPts);
      toggleHabit(habit.id, undefined, undefined, noteText.trim(), selectedDate);
    }
    setIsEditingNote(false);
  };

  const hasDisplayNote = Boolean(checkIn?.note && !(showManualSleepSlider && isAutoSleepNote(checkIn.note)));

  const openNoteEditor = () => {
    soundEngine.playClick();
    hapticLight();
    setNoteText(hasDisplayNote ? (checkIn?.note || '') : '');
    setIsEditingNote(true);
  };

  const weeklyLabel = isWeeklyHabit
    ? isWeeklyTargetMet
      ? `Weekly goal met · ${weeklyCompletions}/${habit.weeklyTargetDays}`
      : `${weeklyCompletions} of ${habit.weeklyTargetDays} this week`
    : null;
  const detailLabel = completed && checkIn?.quantity
    ? `Logged ${checkIn.quantity} ${habit.quantityUnit || 'units'}`
    : habit.description;
  const secondaryLine = [weeklyLabel, detailLabel].filter(Boolean).join(' · ');
  const pointsLabel = completed
    ? checkIn && checkIn.pointsEarned === 0
      ? '+0'
      : `+${checkIn?.pointsEarned ?? habit.points}`
    : isWeeklyTargetMet
    ? 'Goal met'
    : `+${availablePoints}`;
  const pointsTitle =
    completed && checkIn?.pointsEarned === 0
      ? 'Weekly target reached · 0 pts awarded'
      : isWeeklyTargetMet && !completed
      ? 'Weekly goal met · Target reached'
      : habit.isQuantitative && completed
      ? 'Edit pages'
      : undefined;
  const pointsTone = isPulsing
    ? 'text-player-600 dark:text-player-300'
    : completed
    ? checkIn?.pointsEarned === 0
      ? 'text-[var(--text-muted)]'
      : 'text-player-600 dark:text-player-300'
    : isHealthLocked
    ? healthProgress?.classes.text
    : isWeeklyTargetMet
    ? 'text-emerald-600 dark:text-emerald-400'
    : 'text-[var(--text-muted)]';

  return (
    <>
      {/* The check button's ::before stretches over the whole card, so one tap anywhere checks in.
          Secondary controls sit above it with `relative`. */}
      <div
        className={`group relative rounded-[var(--radius-card)] border py-2 pl-2 pr-1 transition-[background-color,border-color,box-shadow] duration-200 ${
          isPulsing
            ? 'z-10 border-player-400/90 bg-player-500/10 animate-kinetic-card-player'
            : satisfied
            ? `border-transparent bg-[var(--surface-2)]/60 ${justSettled ? 'animate-kinetic-settle' : ''}`
            : isHealthLocked
            ? `bg-[var(--surface-1)] ${healthProgress?.classes.border}`
            : 'border-[var(--border-subtle)] bg-[var(--surface-1)] hover:border-[var(--border-medium)]'
        }`}
      >
        {/* Kinetic Score Pulse Surface Overlay (Laser Sweep + Edge Highlight) */}
        {isPulsing && (
          <div
            key={localPulse?.token ?? 'locking'}
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]"
          >
            <div className="absolute inset-y-0 w-1/2 animate-kinetic-laser-sweep bg-gradient-to-r from-transparent via-player-400/22 to-transparent" />
            <div className="absolute inset-x-4 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-player-300/90 to-transparent" />
          </div>
        )}

        <div className="flex items-center gap-1">
          <button
            onClick={handleToggle}
            aria-label={
              isHealthLocked
                ? healthProgress?.lockReason
                : completed
                ? `Mark ${habit.title} uncompleted for today`
                : isWeeklyTargetMet
                ? `Weekly goal reached (${weeklyCompletions}/${habit.weeklyTargetDays}). Click to log an extra session.`
                : `Mark ${habit.title} completed`
            }
            title={isHealthLocked ? healthProgress?.lockReason : undefined}
            aria-disabled={isHealthLocked}
            className={`group/check flex size-11 shrink-0 items-center justify-center rounded-full before:absolute before:inset-0 before:rounded-[var(--radius-card)] before:content-[''] ${
              isHealthLocked ? 'cursor-not-allowed' : ''
            }`}
          >
            <span
              className={`relative flex size-7 items-center justify-center rounded-full transition-[transform,background-color,border-color] duration-150 ${
                isHealthLocked ? '' : 'group-active/check:scale-90'
              } ${isPulsing ? 'animate-kinetic-box-snap ' : ''}${
                isHealthLocked
                  ? `border-2 ${healthProgress?.classes.border} ${healthProgress?.classes.bg} ${healthProgress?.classes.text}`
                  : completed
                  ? 'bg-player-500 text-white'
                  : isWeeklyTargetMet
                  ? 'border-2 border-emerald-500/60 text-emerald-600 dark:text-emerald-400'
                  : 'border-2 border-[var(--border-strong)] text-[var(--text-muted)] group-hover:border-[var(--text-muted)]'
              }`}
            >
              {isPulsing && (
                <span
                  key={`ring-${localPulse?.token ?? 'lock'}`}
                  aria-hidden="true"
                  className="pointer-events-none absolute -inset-0.5 rounded-full border-2 border-player-400 animate-kinetic-ring"
                />
              )}
              {isHealthLocked ? (
                <Lock className="size-3.5" />
              ) : (
                <svg
                  viewBox="0 0 20 20"
                  fill="none"
                  aria-hidden="true"
                  className={`size-4 ${
                    !completed && !isWeeklyTargetMet
                      ? 'opacity-0 transition-opacity duration-150 group-hover:opacity-50'
                      : 'opacity-100'
                  }`}
                >
                  <path
                    d="M5 10.5L8.5 14L15 6.5"
                    stroke="currentColor"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={isPulsing ? 'animate-kinetic-check-draw' : ''}
                  />
                </svg>
              )}
            </span>
          </button>

          {/* Title + one secondary line. Taps fall through to the stretched check button. */}
          <div className="pointer-events-none min-w-0 flex-1 py-1 pl-1">
            <div className="flex min-w-0 items-center gap-2">
              <span
                className={`relative truncate text-body font-medium transition-colors ${
                  isPulsing
                    ? 'text-foreground'
                    : satisfied
                    ? 'text-[var(--text-muted)] line-through decoration-[var(--border-strong)]'
                    : 'text-foreground'
                }`}
              >
                {habit.title}
                {isPulsing && (
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute left-0 right-0 top-1/2 h-[1.5px] -translate-y-1/2 rounded-full bg-gradient-to-r from-player-400 via-player-300 to-player-200 animate-kinetic-strike"
                  />
                )}
              </span>
              {habitStreak >= 2 && (
                <span
                  className="num inline-flex shrink-0 items-center gap-0.5 text-label text-amber-600 dark:text-amber-400"
                  title={`${habitStreak}-day habit streak`}
                >
                  <Flame className="size-3.5" aria-hidden="true" />
                  {habitStreak}
                  <span className="sr-only"> day streak</span>
                </span>
              )}
            </div>

            {secondaryLine && (
              <p
                className={`mt-0.5 truncate text-label font-normal ${
                  isWeeklyTargetMet && !completed
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : satisfied && !isPulsing
                    ? 'text-[var(--text-muted)]'
                    : 'text-[var(--text-secondary)]'
                }`}
              >
                {secondaryLine}
              </p>
            )}

            {hasDisplayNote && (
              <p className="mt-1 flex min-w-0 items-center gap-1.5 text-label font-normal italic text-[var(--text-secondary)]">
                <MessageSquare className="size-3.5 shrink-0 text-player-500" aria-hidden="true" />
                <span className="truncate">{checkIn?.note}</span>
              </p>
            )}

            {/* Google Health progress: one quiet line and a thin bar */}
            {healthProgress && (
              <div className="mt-2 space-y-1.5 pr-2">
                <div className="flex items-center justify-between gap-2 text-caption text-[var(--text-secondary)]">
                  <span className="flex min-w-0 items-center gap-1.5 truncate">
                    <Activity className={`size-3.5 shrink-0 ${healthProgress.classes.text}`} aria-hidden="true" />
                    <span className="truncate">
                      Google Health · <span className={`num font-medium ${healthProgress.classes.text}`}>{healthProgress.formattedValue}</span> / {healthProgress.formattedTarget}
                    </span>
                  </span>
                  <span className={`num shrink-0 font-medium ${healthProgress.classes.text}`}>
                    {healthProgress.percentage}% · {healthProgress.label}
                  </span>
                </div>
                <div role="progressbar" aria-label={healthProgress.metric === 'sleep' ? 'Sleep points earned' : 'Health goal progress'} aria-valuenow={healthProgress.barPercentage} aria-valuemin={0} aria-valuemax={100} className="h-1 w-full overflow-hidden rounded-full bg-[var(--surface-3)]">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${healthProgress.classes.bar}`}
                    style={{ width: `${healthProgress.barPercentage}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Right: quiet points + secondary actions */}
          <div className="relative flex shrink-0 items-center">
            {isPulsing && pulsePoints > 0 && (
              <span
                key={`pts-${localPulse?.token ?? 'lock'}`}
                aria-hidden="true"
                className="num pointer-events-none absolute -top-3 right-2 z-20 whitespace-nowrap rounded-full bg-player-500 px-2 py-0.5 text-caption font-semibold text-white shadow-lg shadow-player-500/30 animate-kinetic-pts-launch"
              >
                +{pulsePoints} pts
              </span>
            )}

            {habit.isQuantitative ? (
              <button
                onClick={() => {
                  soundEngine.playClick();
                  hapticLight();
                  setShowQtyLogger(true);
                }}
                aria-label={`Log quantity for ${habit.title}`}
                title={pointsTitle}
                className={`num relative flex min-h-11 items-center rounded-full px-2 text-label transition-colors hover:text-foreground ${pointsTone} ${isPulsing ? 'animate-kinetic-badge-ignite' : ''}`}
              >
                {pointsLabel}
              </button>
            ) : (
              <span
                title={pointsTitle}
                className={`num px-2 text-label ${pointsTone} ${isPulsing ? 'animate-kinetic-badge-ignite' : ''}`}
              >
                {pointsLabel}
                <span className="sr-only"> points</span>
              </span>
            )}

            {proofPhotos.length > 0 && (
              <button
                onClick={() => {
                  soundEngine.playClick();
                  hapticLight();
                  setShowFullProof(true);
                }}
                aria-label={`View ${proofPhotos.length} proof photos for ${habit.title}`}
                className="num relative flex min-h-11 items-center gap-1 rounded-full px-2 text-label text-emerald-600 transition-colors hover:text-emerald-500 dark:text-emerald-400"
                title="View proof photos"
              >
                <Camera className="size-4" aria-hidden="true" />
                <span>{proofPhotos.length}</span>
              </button>
            )}

            <button
              onClick={openNoteEditor}
              aria-label={hasDisplayNote ? `Edit note for ${habit.title}` : `Add note for ${habit.title}`}
              className={`relative flex size-11 items-center justify-center rounded-full transition-colors ${
                hasDisplayNote
                  ? 'text-player-500'
                  : 'text-[var(--text-muted)] hover:bg-[var(--surface-2)] hover:text-foreground'
              }`}
              title={hasDisplayNote ? 'Edit note' : 'Add note'}
            >
              {hasDisplayNote ? (
                <MessageSquare className="size-4" />
              ) : (
                <MessageSquarePlus className="size-4" />
              )}
            </button>
          </div>
        </div>

        {/* Interactive manual sleep slider when Google Health is not connected */}
        {showManualSleepSlider && (
          <SleepSlider
            habit={habit}
            target={sleepTarget}
            loggedHours={manualSleepHours}
            isWeeklyTargetMet={isWeeklyTargetMet}
            onCommitSleep={handleCommitSleepHours}
            onUpdateTarget={handleUpdateSleepTarget}
          />
        )}

        {/* Inline warning alert when user attempts to check off a locked habit */}
        {lockedAlertMessage && (
          <div
            role="alert"
            className="relative mx-1 mt-2 flex items-start justify-between gap-2 rounded-[var(--radius-control)] bg-orange-500/10 py-2 pl-3 text-label font-normal text-orange-700 animate-in fade-in duration-150 dark:text-orange-200"
          >
            <div className="flex min-w-0 items-start gap-2 pt-0.5">
              <Lock className="mt-0.5 size-3.5 shrink-0 text-orange-500" aria-hidden="true" />
              <span>{lockedAlertMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setLockedAlertMessage(null)}
              aria-label="Dismiss alert"
              className="-my-2 flex size-11 shrink-0 items-center justify-center text-orange-500 hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          </div>
        )}

        {/* Inline Micro-Note Editor */}
        {isEditingNote && (
          <form onSubmit={handleSaveNote} className="relative mx-1 mt-2 flex gap-2 border-t border-[var(--border-subtle)] pb-1 pt-3">
            <input
              type="text"
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Add reflection or workout details..."
              aria-label={`Reflection note for ${habit.title}`}
              autoFocus
              className="field min-w-0 flex-1"
            />
            <button type="submit" className="control control-primary">
              Save
            </button>
            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                hapticLight();
                setIsEditingNote(false);
              }}
              aria-label="Cancel note edit"
              className="flex size-11 shrink-0 items-center justify-center rounded-[var(--radius-control)] border border-[var(--border-medium)] text-[var(--text-secondary)] transition-colors hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          </form>
        )}

        {/* Clean Space Partner Proof Quick Link */}
        {isCleanSpace && partnerCleanSpaceCheckIn && partnerProofPhotos.length > 0 && (
          <div className="relative mx-1 mt-2 flex items-center justify-between gap-2 border-t border-[var(--border-subtle)] pl-1 pt-1 text-label font-normal">
            <span className="flex min-w-0 items-center gap-1.5 truncate text-[var(--text-secondary)]">
              <span aria-hidden="true">{partnerPlayer?.avatar}</span>
              <span className="truncate">{partnerPlayer?.name} checked in Clean Space</span>
            </span>
            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                hapticLight();
                setShowPartnerProof(true);
              }}
              className="num flex min-h-11 shrink-0 items-center gap-1.5 rounded-full px-2 font-medium text-player-600 transition-colors hover:text-player-500 dark:text-player-300"
            >
              <Camera className="size-4" aria-hidden="true" />
              <span>Photos ({partnerProofPhotos.length})</span>
            </button>
          </div>
        )}

        {/* Inline Quantitative Stepper Logger */}
        {showQtyLogger && habit.isQuantitative && (
          <div className="relative mx-1 mt-2 space-y-3 border-t border-[var(--border-subtle)] pb-1 pt-3">
            <div className="flex items-center justify-between gap-2 text-label">
              <span className="flex items-center gap-1.5 text-foreground">
                <BookOpen className="size-4 text-player-500" aria-hidden="true" />
                How many pages did you read?
              </span>
              <span className="num shrink-0 text-player-600 dark:text-player-300">
                +{Math.min(habit.points, quantity)} pts
              </span>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {[10, 15, 20, 25].map((pages) => (
                <button
                  key={pages}
                  onClick={() => handleLogQuantity(pages)}
                  className={`num min-h-11 rounded-[var(--radius-control)] border text-label transition-colors ${
                    quantity === pages
                      ? 'border-player-500/50 bg-player-500/15 text-player-600 dark:text-player-300'
                      : 'border-[var(--border-subtle)] bg-[var(--surface-2)] text-[var(--text-secondary)] hover:text-foreground'
                  }`}
                >
                  {pages}p
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center rounded-[var(--radius-control)] border border-[var(--border-medium)] bg-[var(--surface-2)]">
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    hapticLight();
                    setQuantity((q) => Math.max(1, q - 1));
                  }}
                  aria-label="Decrease quantity"
                  className="flex size-11 items-center justify-center text-[var(--text-secondary)] hover:text-foreground"
                >
                  <Minus className="size-4" />
                </button>
                <input
                  type="number"
                  min="1"
                  max={habit.maxQuantity || 25}
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  aria-label="Quantity value"
                  className="num w-10 bg-transparent text-center text-base font-semibold text-foreground focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    hapticLight();
                    setQuantity((q) => Math.min(habit.maxQuantity || 25, q + 1));
                  }}
                  aria-label="Increase quantity"
                  className="flex size-11 items-center justify-center text-[var(--text-secondary)] hover:text-foreground"
                >
                  <Plus className="size-4" />
                </button>
              </div>

              <button
                onClick={() => handleLogQuantity(quantity)}
                className="min-h-11 min-w-0 flex-1 rounded-[var(--radius-control)] bg-player-500 px-3 text-label font-semibold text-white transition-[filter] hover:brightness-110"
              >
                Log {quantity} Pages
              </button>

              <button
                onClick={() => {
                  soundEngine.playClick();
                  hapticLight();
                  setShowQtyLogger(false);
                }}
                className="min-h-11 rounded-[var(--radius-control)] border border-[var(--border-medium)] px-3 text-label text-[var(--text-secondary)] transition-colors hover:text-foreground"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Proof Modal */}
      {isProofModalOpen && <ProofModal
        habit={habit}
        isOpen={isProofModalOpen}
        onClose={() => setIsProofModalOpen(false)}
        onConfirm={handleProofConfirmed}
        initialPhotos={proofPhotos}
      />}

      {/* Own Proof Gallery Lightbox */}
      {showFullProof && proofPhotos.length > 0 && (
        <ProofGalleryModal
          isOpen={showFullProof}
          onClose={() => setShowFullProof(false)}
          playerName={activePlayer?.name || 'You'}
          playerAvatar={activePlayer?.avatar || '⚡'}
          habitTitle={habit.title}
          images={proofPhotos}
          date={checkIn?.date}
          completedAt={checkIn?.completedAt}
        />
      )}

      {/* Partner Proof Gallery Lightbox */}
      {showPartnerProof && partnerProofPhotos.length > 0 && (
        <ProofGalleryModal
          isOpen={showPartnerProof}
          onClose={() => setShowPartnerProof(false)}
          playerName={partnerPlayer?.name || 'Partner'}
          playerAvatar={partnerPlayer?.avatar || '✨'}
          habitTitle={partnerCleanSpaceHabit?.title || 'Clean Space'}
          images={partnerProofPhotos}
          date={partnerCleanSpaceCheckIn?.date}
          completedAt={partnerCleanSpaceCheckIn?.completedAt}
        />
      )}
    </>
  );
});
