'use client';

// PROTOTYPE variant C: the focus card and its all-done state.
import React, { useMemo, useRef, useState } from 'react';
import { Activity, ArrowRight, BookOpen, Camera, Check, Flame, Lock, Trophy } from 'lucide-react';
import type { CheckIn, Habit, HealthTelemetryRecord, Player } from '@/lib/types';
import { getHealthProgressDetails } from '@/lib/health-correlation';
import { calculateHealthPoints } from '@/lib/health-rewards';
import { getPlayerThemeStyles } from '@/lib/player-colors';
import { soundEngine } from '@/lib/sound-utils';
import { hapticLight, hapticSuccess } from '@/lib/haptic-utils';
import { HabitIcon } from '@/components/HabitIcon';
import { createDeferredView } from '@/components/DeferredView';

const { View: ProofModal } = createDeferredView(() => import('@/components/ProofModal').then((m) => m.ProofModal), null);

type ToggleHabit = (habitId: string, proofUrl?: string | string[], quantity?: number, note?: string, targetDate?: string) => void;

interface FocusCardProps {
  habit: Habit;
  selectedDate: string;
  checkIn: CheckIn | undefined;
  telemetry: HealthTelemetryRecord | undefined;
  weeklyCompletions: number;
  streak: number;
  canDefer: boolean;
  onLater: () => void;
  toggleHabit: ToggleHabit;
}

const COMMIT_DELAY_MS = 360;

export function FocusCard({
  habit,
  selectedDate,
  checkIn,
  telemetry,
  weeklyCompletions,
  streak,
  canDefer,
  onLater,
  toggleHabit,
}: FocusCardProps) {
  const [mode, setMode] = useState<'idle' | 'qty' | 'note'>('idle');
  const [note, setNote] = useState('');
  const [proofOpen, setProofOpen] = useState(false);
  const [lockedMsg, setLockedMsg] = useState<string | null>(null);
  const [committed, setCommitted] = useState<number | null>(null);
  const committing = useRef(false);

  const health = useMemo(() => getHealthProgressDetails(habit, telemetry, checkIn), [habit, telemetry, checkIn]);
  const locked = Boolean(health && (health.metric === 'sleep' || health.isLocked));
  const available = health ? calculateHealthPoints(habit, health.value) : habit.points;
  const weeklyTarget = habit.weeklyTargetDays ?? 0;

  // Show the confirmed state briefly, then hand the habit to the store so the next one slides in.
  const commit = (earned: number, proofUrls?: string[], quantity?: number, noteText?: string) => {
    if (committing.current) return;
    committing.current = true;
    soundEngine.playCheck();
    hapticSuccess();
    const run = () => toggleHabit(habit.id, proofUrls, quantity, noteText, selectedDate);
    const reduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return run();
    setCommitted(earned);
    setTimeout(run, COMMIT_DELAY_MS);
  };

  const handleDone = () => {
    if (locked && health) {
      soundEngine.playUncheck();
      hapticLight();
      setLockedMsg(health.lockReason);
      return;
    }
    if (habit.isQuantitative) {
      soundEngine.playClick();
      hapticLight();
      setMode('qty');
      return;
    }
    if (habit.requiresProof) {
      soundEngine.playClick();
      hapticLight();
      setProofOpen(true);
      return;
    }
    commit(available);
  };

  const logQuantity = (qty: number) => {
    const earned = Math.min(habit.points, Math.max(1, Math.round(qty * (habit.pointsPerUnit || 1))));
    commit(earned, undefined, qty);
  };

  const saveNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (locked) {
      setLockedMsg(health?.lockReason ?? null);
      return;
    }
    commit(available, undefined, undefined, note.trim() || undefined);
  };

  const doneLabel = locked
    ? 'Waiting for Google Health'
    : habit.isQuantitative
    ? `Log ${habit.quantityUnit || 'amount'}`
    : habit.requiresProof
    ? 'Done · add photo'
    : 'Done';

  const maxQty = habit.maxQuantity || 25;
  const presets = [0.4, 0.6, 0.8, 1].map((r) => Math.max(1, Math.round(maxQty * r)));

  return (
    <article
      aria-labelledby={`c-focus-${habit.id}`}
      className="c-focus-in rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-1)] p-5"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="flex min-w-0 items-center gap-2 text-eyebrow text-player-400">
          <HabitIcon name={habit.iconName} className="h-4 w-4 shrink-0" />
          <span className="truncate">Next up · {habit.category.replace('_', ' ')}</span>
        </span>
        <span className="num shrink-0 text-headline text-player-400">
          +{available}
          <span className="ml-0.5 text-caption text-muted">pts</span>
        </span>
      </div>

      <h2 id={`c-focus-${habit.id}`} className="mt-4 text-title-lg text-balance">
        {habit.title}
      </h2>
      {habit.description && <p className="mt-1.5 text-body text-secondary">{habit.description}</p>}

      {(weeklyTarget > 0 || streak >= 2 || habit.automation || habit.requiresProof || habit.isQuantitative) && (
        <ul className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-caption text-muted">
          {weeklyTarget > 0 && (
            <li className="flex items-center gap-2">
              <span aria-hidden="true" className="flex gap-1">
                {Array.from({ length: weeklyTarget }, (_, i) => (
                  <span
                    key={i}
                    className={`h-1.5 w-1.5 rounded-full ${i < weeklyCompletions ? 'bg-player-500' : 'bg-[var(--surface-3)]'}`}
                  />
                ))}
              </span>
              <span className="num">
                {weeklyCompletions} of {weeklyTarget} this week
              </span>
            </li>
          )}
          {streak >= 2 && (
            <li className="flex items-center gap-1">
              <Flame className="h-3.5 w-3.5 text-[var(--stake-amber)]" />
              <span className="num">{streak}-day streak</span>
            </li>
          )}
          {habit.automation && !health && (
            <li className="flex items-center gap-1">
              <Activity className="h-3.5 w-3.5" />
              Auto via Google Health, or check in yourself
            </li>
          )}
          {habit.requiresProof && (
            <li className="flex items-center gap-1">
              <Camera className="h-3.5 w-3.5" />
              Photo proof
            </li>
          )}
          {habit.isQuantitative && (
            <li className="flex items-center gap-1">
              <BookOpen className="h-3.5 w-3.5" />
              <span className="num">
                Up to {maxQty} {habit.quantityUnit || 'units'}
              </span>
            </li>
          )}
        </ul>
      )}

      {health && (
        <div className="mt-4">
          <div className="flex items-baseline justify-between text-caption">
            <span className="flex items-center gap-1 text-muted">
              <Activity className="h-3.5 w-3.5" /> Google Health
            </span>
            <span className="num text-secondary">
              <span className={health.classes.text}>{health.formattedValue}</span> / {health.formattedTarget}
            </span>
          </div>
          <div className="mt-1.5 h-1 rounded-full bg-[var(--surface-3)]">
            <div className={`h-full rounded-full ${health.classes.bar}`} style={{ width: `${health.barPercentage}%` }} />
          </div>
        </div>
      )}

      {lockedMsg && (
        <p role="alert" className="mt-4 flex items-start gap-2 text-label text-secondary">
          <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {lockedMsg}
        </p>
      )}

      {/* Primary action area */}
      <div className="mt-6">
        {mode === 'qty' && committed === null ? (
          <div>
            <p className="text-label text-secondary">How many {habit.quantityUnit || 'units'}?</p>
            <div className="mt-2 grid grid-cols-4 gap-2">
              {presets.map((qty) => (
                <button
                  key={qty}
                  type="button"
                  onClick={() => logQuantity(qty)}
                  className="flex h-14 flex-col items-center justify-center rounded-[var(--radius-control)] bg-[var(--surface-2)] transition-colors hover:bg-[var(--surface-3)] active:scale-[0.97] motion-reduce:active:scale-100"
                >
                  <span className="num text-headline">{qty}</span>
                  <span className="num text-caption text-muted">
                    +{Math.min(habit.points, Math.max(1, Math.round(qty * (habit.pointsPerUnit || 1))))}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : mode === 'note' && committed === null ? (
          <form onSubmit={saveNote} className="flex flex-col gap-2">
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="How did it go?"
              aria-label={`Note for ${habit.title}`}
              autoFocus
              className="h-12 rounded-[var(--radius-control)] border border-[var(--border-subtle)] bg-[var(--surface-2)] px-4 text-body text-foreground placeholder:text-[var(--text-muted)] focus:border-[var(--border-strong)] focus:outline-none"
            />
            <button
              type="submit"
              className="flex h-14 w-full items-center justify-center gap-2 rounded-[var(--radius-control)] bg-player-500 text-headline text-white"
            >
              <Check className="h-5 w-5" strokeWidth={2.5} /> Done with note
            </button>
          </form>
        ) : (
          <button
            type="button"
            onClick={handleDone}
            aria-disabled={locked}
            aria-label={locked ? health?.lockReason : `${doneLabel}: ${habit.title}, ${available} points`}
            className={`relative flex h-14 w-full items-center justify-center gap-2 overflow-hidden rounded-[var(--radius-control)] text-headline transition-[transform,background-color] duration-150 active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100 ${
              locked
                ? 'bg-[var(--surface-2)] text-secondary'
                : committed !== null
                ? 'bg-[var(--par-emerald)] text-[#fff]'
                : 'bg-player-500 text-white shadow-[0_8px_24px_-12px_var(--player-base)]'
            }`}
          >
            {committed !== null ? (
              <>
                <Check className="h-5 w-5" strokeWidth={3} />
                <span className="num">+{committed} pts</span>
              </>
            ) : (
              <>
                {locked ? <Lock className="h-4 w-4" /> : habit.requiresProof ? <Camera className="h-5 w-5" /> : <Check className="h-5 w-5" strokeWidth={2.5} />}
                {doneLabel}
              </>
            )}
          </button>
        )}

        <div className="-mb-2 mt-2 flex items-center justify-center gap-1">
          {mode !== 'idle' ? (
            <button
              type="button"
              onClick={() => setMode('idle')}
              className="h-11 px-4 text-label text-muted transition-colors hover:text-foreground"
            >
              Cancel
            </button>
          ) : (
            <>
              {canDefer && (
                <button
                  type="button"
                  onClick={onLater}
                  className="h-11 px-4 text-label text-muted transition-colors hover:text-foreground"
                >
                  Later
                </button>
              )}
              {!habit.isQuantitative && !locked && (
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    hapticLight();
                    setMode('note');
                  }}
                  className="h-11 px-4 text-label text-muted transition-colors hover:text-foreground"
                >
                  Add a note
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {proofOpen && (
        <ProofModal
          habit={habit}
          isOpen
          onClose={() => setProofOpen(false)}
          onConfirm={(urls?: string[]) => {
            setProofOpen(false);
            commit(available, urls);
          }}
        />
      )}
    </article>
  );
}

export function ParReached({
  points,
  par,
  habitCount,
  weekday,
  partner,
  partnerPoints,
  onOpenDuel,
}: {
  points: number;
  par: number;
  habitCount: number;
  weekday: string;
  partner: Player | null;
  partnerPoints: number;
  onOpenDuel: () => void;
}) {
  const reached = points >= par;
  const ahead = partner ? points - partnerPoints : 0;
  return (
    <article className="c-focus-in rounded-[var(--radius-card)] bg-[var(--par-emerald-glow)] p-6 text-center">
      <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[var(--par-emerald)] text-[#fff]">
        <Trophy className="h-6 w-6" />
      </span>
      <h2 className="mt-5 text-title-lg">{reached ? 'Par reached.' : 'Everything checked off.'}</h2>
      <p className="num mt-1.5 text-body text-secondary">
        {habitCount} of {habitCount} habits{reached && points > par ? `, ${points - par} over par` : ''}. Enjoy the rest of your {weekday}.
      </p>
      {partner && (
        <button
          type="button"
          onClick={() => {
            soundEngine.playClick();
            hapticLight();
            onOpenDuel();
          }}
          style={getPlayerThemeStyles(partner)}
          className="mx-auto mt-5 flex h-11 items-center gap-2 rounded-full bg-[var(--surface-1)] px-4 text-label text-foreground"
        >
          <span aria-hidden="true" className="h-2 w-2 rounded-full bg-player-500" />
          <span className="num">
            {partner.name} is at {partnerPoints}
            {ahead > 0 ? ` · you lead by ${ahead}` : ahead < 0 ? ` · ${-ahead} behind` : ''}
          </span>
          <ArrowRight className="h-4 w-4 text-muted" />
        </button>
      )}
    </article>
  );
}
