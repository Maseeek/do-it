'use client';

// PROTOTYPE variant A of Today: "Calm list". Reminders/Things-style inset grouped list.
// Big date title, one compact progress summary, one quiet partner line, pending habits in a
// single grouped list, completed habits collapsed under "Done". Uses real store data.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, Lock, MessageSquare, Plus } from 'lucide-react';
import type { TodayVariantProps } from './TodayPrototype';
import { useStore } from '@/lib/store';
import { useMultiplayer } from '@/lib/multiplayer';
import { getPlayerThemeStyles } from '@/lib/player-colors';
import { addDays, getTodayDateString, isFutureDate, parseDate } from '@/lib/date-utils';
import { getHealthProgressDetails } from '@/lib/health-correlation';
import { calculateHealthPoints } from '@/lib/health-rewards';
import { proofPhotos as getProofPhotos } from '@/lib/duel-data';
import { soundEngine } from '@/lib/sound-utils';
import { hapticCelebration, hapticLight, hapticSuccess } from '@/lib/haptic-utils';
import { fireCelebrationConfetti } from '@/lib/confetti';
import { createDeferredView } from '@/components/DeferredView';
import type { CheckIn, Habit, HealthTelemetryRecord } from '@/lib/types';

const { View: ProofModal } = createDeferredView(
  () => import('@/components/ProofModal').then(module => module.ProofModal),
  null,
);

export const name = 'Calm list';

// How long a freshly checked row stays in place before it moves to "Done".
const SETTLE_MS = 650;

function joinMeta(parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' · ');
}

function ProgressRing({ value, done }: { value: number; done: boolean }) {
  const size = 44;
  const stroke = 5;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - Math.min(1, Math.max(0, value)));
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true" className="shrink-0 -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-3)" strokeWidth={stroke} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={done ? 'var(--par-emerald)' : 'var(--player-base, #71717a)'}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={offset}
        className="transition-[stroke-dashoffset,stroke] duration-500 ease-out motion-reduce:transition-none"
      />
    </svg>
  );
}

function CheckCircle({ checked, locked, auto }: { checked: boolean; locked: boolean; auto: boolean }) {
  if (locked) {
    return (
      <span className="flex size-[26px] items-center justify-center rounded-full border-[1.5px] border-dashed border-[var(--border-strong)] text-muted">
        <Lock className="size-3" strokeWidth={2.25} />
      </span>
    );
  }
  return (
    <span
      className={`relative flex size-[26px] items-center justify-center rounded-full transition-[background-color,border-color,transform] duration-200 ease-out group-active:scale-90 motion-reduce:transition-none ${
        checked
          ? 'border-[1.5px] border-transparent bg-player-500 bg-[var(--player-base)] text-white'
          : `border-[1.5px] ${auto ? 'border-dashed' : ''} border-[var(--border-strong)] text-transparent`
      }`}
    >
      <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="size-[15px]">
        <path
          d="M5 10.5l3.25 3.25L15 7"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          pathLength={1}
          strokeDasharray={1}
          strokeDashoffset={checked ? 0 : 1}
          className="transition-[stroke-dashoffset] duration-300 ease-out motion-reduce:transition-none"
        />
      </svg>
    </span>
  );
}

type RowProps = {
  habit: Habit;
  selectedDate: string;
  completed: boolean;
  checkIn: CheckIn | undefined;
  telemetry: HealthTelemetryRecord | undefined;
  weeklyCompletions: number;
  settling: boolean;
  isLast: boolean;
  onChecked: (habitId: string) => void;
  onUnchecked: (habitId: string) => void;
};

function HabitRow({
  habit,
  selectedDate,
  completed,
  checkIn,
  telemetry,
  weeklyCompletions,
  settling,
  isLast,
  onChecked,
  onUnchecked,
}: RowProps) {
  const { toggleHabit, updateCheckInNote } = useStore();
  const [panel, setPanel] = useState<'none' | 'qty' | 'note' | 'locked'>('none');
  const [proofOpen, setProofOpen] = useState(false);
  const [noteText, setNoteText] = useState('');

  const health = useMemo(() => getHealthProgressDetails(habit, telemetry, checkIn), [habit, telemetry, checkIn]);
  const isLocked = Boolean(health && (health.metric === 'sleep' || (health.isLocked && !completed)));
  const availablePoints = health ? calculateHealthPoints(habit, health.value) : habit.points;
  const target = habit.weeklyTargetDays ?? 0;
  const weeklyMet = target > 0 && weeklyCompletions >= target;
  const visuallyChecked = completed || settling || weeklyMet;
  const proofs = getProofPhotos(checkIn);

  const meta = (() => {
    if (completed) {
      return joinMeta([
        checkIn?.quantity ? `${checkIn.quantity} ${habit.quantityUnit || 'units'}` : null,
        checkIn && checkIn.pointsEarned === 0 ? 'No pts, weekly cap' : `+${checkIn?.pointsEarned ?? habit.points} pts`,
        target > 0 && `${weeklyCompletions} of ${target} this week`,
        habit.automation && checkIn?.source === 'google_health' && 'Auto',
        proofs.length > 0 && `${proofs.length} photo${proofs.length > 1 ? 's' : ''}`,
      ]);
    }
    if (weeklyMet) return joinMeta([`Weekly goal met`, `${weeklyCompletions} of ${target}`]);
    return joinMeta([
      habit.isQuantitative ? `Up to ${habit.points} pts` : `${availablePoints} pts`,
      target > 0 && `${weeklyCompletions} of ${target} this week`,
      habit.automation && (health ? `Auto · ${health.formattedValue} of ${health.formattedTarget}` : 'Auto'),
      habit.requiresProof && 'Photo',
    ]);
  })();

  const commit = (proof?: string[], qty?: number) => {
    soundEngine.playCheck();
    hapticSuccess();
    if (!completed) onChecked(habit.id);
    toggleHabit(habit.id, proof, qty, undefined, selectedDate);
  };

  const handleTap = () => {
    if (isLocked && health) {
      soundEngine.playUncheck();
      hapticLight();
      setPanel(p => (p === 'locked' ? 'none' : 'locked'));
      return;
    }
    if (completed) {
      soundEngine.playUncheck();
      hapticLight();
      onUnchecked(habit.id);
      setPanel('none');
      toggleHabit(habit.id, undefined, undefined, undefined, selectedDate);
      return;
    }
    if (habit.isQuantitative) {
      soundEngine.playClick();
      hapticLight();
      setPanel(p => (p === 'qty' ? 'none' : 'qty'));
      return;
    }
    if (habit.requiresProof && proofs.length === 0) {
      soundEngine.playClick();
      hapticLight();
      setProofOpen(true);
      return;
    }
    commit();
  };

  const max = habit.maxQuantity || 25;
  const presets = Array.from(new Set([Math.round(max * 0.4), Math.round(max * 0.6), Math.round(max * 0.8), max]))
    .filter(n => n > 0);

  const label = isLocked
    ? health?.lockReason
    : completed
      ? `${habit.title}, done. Tap to undo.`
      : weeklyMet
        ? `${habit.title}, weekly goal met. Tap to log an extra session.`
        : `Check in ${habit.title}`;

  return (
    <li className="relative">
      <div className="flex items-stretch">
        <button
          type="button"
          onClick={handleTap}
          aria-label={label}
          aria-pressed={completed}
          aria-disabled={isLocked || undefined}
          className="group flex min-h-[60px] flex-1 items-center gap-3.5 py-3 pl-4 pr-2 text-left transition-colors active:bg-[var(--surface-2)] rounded-[inherit] focus-visible:outline-offset-[-2px]"
        >
          <CheckCircle checked={visuallyChecked} locked={isLocked} auto={Boolean(habit.automation)} />
          <span className="min-w-0 flex-1">
            <span
              className={`block truncate text-body font-medium transition-colors duration-300 ${
                completed || weeklyMet ? 'text-muted' : 'text-foreground'
              }`}
            >
              {habit.title}
            </span>
            <span className="mt-0.5 block truncate text-caption text-secondary num">{meta}</span>
            {checkIn?.note && panel !== 'note' && (
              <span className="mt-1 flex items-center gap-1.5 text-caption text-muted">
                <MessageSquare className="size-3 shrink-0" />
                <span className="truncate italic">{checkIn.note}</span>
              </span>
            )}
          </span>
        </button>
        {completed && (
          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              hapticLight();
              setNoteText(checkIn?.note || '');
              setPanel(p => (p === 'note' ? 'none' : 'note'));
            }}
            aria-label={checkIn?.note ? `Edit note for ${habit.title}` : `Add note to ${habit.title}`}
            className="flex w-12 shrink-0 items-center justify-center text-muted opacity-70 transition-[color,opacity] hover:text-foreground hover:opacity-100"
          >
            <MessageSquare className="size-[18px]" strokeWidth={1.75} />
          </button>
        )}
      </div>

      {panel === 'locked' && health && (
        <p role="status" className="pb-3 pl-[58px] pr-4 text-caption text-secondary">
          {health.lockReason}
        </p>
      )}

      {panel === 'qty' && (
        <div className="pb-3.5 pl-[58px] pr-4">
          <p className="mb-2 text-caption text-secondary">How many {habit.quantityUnit || 'units'}?</p>
          <div className="flex gap-2">
            {presets.map(qty => (
              <button
                key={qty}
                type="button"
                onClick={() => {
                  setPanel('none');
                  commit(undefined, qty);
                }}
                className="h-11 flex-1 rounded-full bg-[var(--surface-2)] text-label num text-foreground transition-colors active:bg-[var(--surface-3)]"
              >
                {qty}
              </button>
            ))}
          </div>
        </div>
      )}

      {panel === 'note' && checkIn && (
        <form
          className="flex gap-2 pb-3.5 pl-[58px] pr-4"
          onSubmit={e => {
            e.preventDefault();
            updateCheckInNote(checkIn.id, noteText.trim());
            setPanel('none');
          }}
        >
          <input
            autoFocus
            value={noteText}
            onChange={e => setNoteText(e.target.value)}
            placeholder="Add a note"
            aria-label={`Note for ${habit.title}`}
            className="h-11 min-w-0 flex-1 rounded-xl bg-[var(--surface-2)] px-3 text-body text-foreground placeholder:text-muted focus:outline-none"
          />
          <button type="submit" className="h-11 rounded-xl px-3 text-label text-player-400">
            Save
          </button>
        </form>
      )}

      {!isLast && <div aria-hidden="true" className="ml-[58px] h-px bg-[var(--border-subtle)]" />}

      {proofOpen && (
        <ProofModal
          habit={habit}
          isOpen
          onClose={() => setProofOpen(false)}
          onConfirm={urls => {
            setProofOpen(false);
            commit(urls);
          }}
          initialPhotos={proofs}
        />
      )}
    </li>
  );
}

export function VariantA({ onOpenHabits, onOpenDuel }: TodayVariantProps) {
  const multiplayer = useMultiplayer();
  const {
    habits,
    activeHabits,
    activePlayerId,
    checkIns,
    selectedDate,
    setSelectedDate,
    isTodaySelected,
    partnerId,
    players,
    isHabitSatisfiedOnDate,
    isHabitCompletedOnDate,
    getHabitCheckInOnDate,
    getHealthTelemetryOnDate,
    getWeeklyHabitCompletions,
    isRestDay,
    toggleRestDay,
  } = useStore();

  const context = selectedDate;
  const [settling, setSettling] = useState<Record<string, string>>({});
  const [doneOpen, setDoneOpen] = useState(false);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    const pending = timers.current;
    return () => Object.values(pending).forEach(clearTimeout);
  }, []);

  const handleChecked = useCallback(
    (habitId: string) => {
      if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      clearTimeout(timers.current[habitId]);
      setSettling(s => ({ ...s, [habitId]: context }));
      timers.current[habitId] = setTimeout(() => {
        setSettling(s => {
          const next = { ...s };
          delete next[habitId];
          return next;
        });
      }, SETTLE_MS);
    },
    [context],
  );

  const handleUnchecked = useCallback((habitId: string) => {
    clearTimeout(timers.current[habitId]);
    setSettling(s => {
      if (!s[habitId]) return s;
      const next = { ...s };
      delete next[habitId];
      return next;
    });
  }, []);

  const points = useMemo(
    () =>
      checkIns
        .filter(c => c.playerId === activePlayerId && c.date === selectedDate)
        .reduce((sum, c) => sum + c.pointsEarned, 0),
    [checkIns, activePlayerId, selectedDate],
  );
  const rawPar = multiplayer.configured ? activeHabits.reduce((sum, h) => sum + h.points, 0) : 240;
  const par = rawPar > 0 ? rawPar : 240;

  const isSettling = (id: string) => settling[id] === context;
  const pending = activeHabits.filter(h => !isHabitSatisfiedOnDate(h.id, selectedDate) || isSettling(h.id));
  const done = activeHabits.filter(h => isHabitSatisfiedOnDate(h.id, selectedDate) && !isSettling(h.id));
  const satisfiedCount = activeHabits.filter(h => isHabitSatisfiedOnDate(h.id, selectedDate)).length;
  const allDone = activeHabits.length > 0 && satisfiedCount === activeHabits.length;
  const parReached = points >= par;

  const partner = partnerId ? players[partnerId] : null;
  const partnerPoints = useMemo(
    () => checkIns.filter(c => c.playerId === partnerId && c.date === selectedDate).reduce((s, c) => s + c.pointsEarned, 0),
    [checkIns, partnerId, selectedDate],
  );
  const partnerDone = useMemo(() => {
    const ids = new Set(habits.filter(h => h.playerId === partnerId && h.isActive).map(h => h.id));
    return new Set(checkIns.filter(c => c.date === selectedDate && ids.has(c.habitId)).map(c => c.habitId)).size;
  }, [habits, checkIns, partnerId, selectedDate]);

  // Celebrate crossing Daily Par or finishing everything, same as the production view.
  const previous = useRef({ context, points, allDone });
  useEffect(() => {
    const prev = previous.current;
    if (prev.context === context && ((points >= par && prev.points < par) || (allDone && !prev.allDone))) {
      soundEngine.playFanfare();
      fireCelebrationConfetti();
      hapticCelebration();
    }
    previous.current = { context, points, allDone };
  }, [context, points, allDone, par]);

  const date = parseDate(selectedDate);
  const weekday = date.toLocaleDateString('en-US', { weekday: 'long' });
  const longDate = date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
  const canGoForward = !isFutureDate(addDays(selectedDate, 1));
  const isRest = isRestDay(selectedDate);
  const isYesterday = selectedDate === addDays(getTodayDateString(), -1);

  const go = (days: number) => {
    soundEngine.playClick();
    hapticLight();
    setSelectedDate(addDays(selectedDate, days));
  };

  const rowProps = (habit: Habit, index: number, list: Habit[]) => ({
    habit,
    selectedDate,
    completed: isHabitCompletedOnDate(habit.id, selectedDate),
    checkIn: getHabitCheckInOnDate(habit.id, selectedDate),
    telemetry: getHealthTelemetryOnDate(habit.id, selectedDate),
    weeklyCompletions: getWeeklyHabitCompletions(habit.id, selectedDate),
    settling: isSettling(habit.id),
    isLast: index === list.length - 1,
    onChecked: handleChecked,
    onUnchecked: handleUnchecked,
  });

  return (
    <div className="mx-auto w-full max-w-xl pb-16">
      {/* Date title + day browsing */}
      <header className="flex items-start justify-between gap-3 pt-1">
        <div className="min-w-0">
          <h1 className="text-display text-foreground">{weekday}</h1>
          <p className="mt-0.5 text-body text-secondary">
            {longDate}
            {!isTodaySelected && (
              <>
                {isYesterday && <span className="text-muted"> · Yesterday</span>}
                <span className="text-muted"> · </span>
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    hapticLight();
                    setSelectedDate(getTodayDateString());
                  }}
                  className="font-medium text-player-400"
                >
                  Back to today
                </button>
              </>
            )}
          </p>
        </div>
        <div className="-mr-2 flex shrink-0 items-center pt-1.5">
          <button
            type="button"
            onClick={() => go(-1)}
            aria-label="Previous day"
            className="flex size-11 items-center justify-center rounded-full text-secondary transition-colors active:bg-[var(--surface-2)]"
          >
            <ChevronLeft className="size-[22px]" strokeWidth={2} />
          </button>
          <button
            type="button"
            onClick={() => canGoForward && go(1)}
            disabled={!canGoForward}
            aria-label="Next day"
            className="flex size-11 items-center justify-center rounded-full text-secondary transition-colors active:bg-[var(--surface-2)] disabled:opacity-30"
          >
            <ChevronRight className="size-[22px]" strokeWidth={2} />
          </button>
        </div>
      </header>

      {/* Progress summary */}
      <section aria-label="Today's progress" className="mt-6 flex items-center gap-3.5">
        <div
          role="progressbar"
          aria-label={`${points} of ${par} points`}
          aria-valuenow={points}
          aria-valuemin={0}
          aria-valuemax={par}
        >
          <ProgressRing value={points / par} done={parReached} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-headline text-foreground num">
            {points}
            <span className="font-normal text-muted"> / {par} pts</span>
          </p>
          <p className="text-caption text-secondary num">
            {allDone
              ? 'Everything done'
              : `${satisfiedCount} of ${activeHabits.length} done`}
            {parReached ? ' · Par reached' : ` · ${par - points} to par`}
          </p>
        </div>
      </section>

      {/* Partner, one quiet line */}
      {partner && (
        <button
          type="button"
          onClick={() => {
            soundEngine.playClick();
            hapticLight();
            onOpenDuel();
          }}
          style={getPlayerThemeStyles(partner)}
          className="-mx-2 mt-3 flex min-h-11 w-[calc(100%+1rem)] items-center gap-2.5 rounded-xl px-2 text-left transition-colors active:bg-[var(--surface-2)]"
        >
          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--player-base)_22%,transparent)] text-[11px] font-semibold text-player-400">
            {partner.name[0]}
          </span>
          <span className="min-w-0 flex-1 truncate text-label text-secondary num">
            <span className="text-foreground">{partner.name}</span> · {partnerPoints} pts {isTodaySelected ? 'today' : ''}
            {partnerDone > 0 && <span className="text-muted"> · {partnerDone} done</span>}
          </span>
          <ChevronRight className="size-4 shrink-0 text-muted" />
        </button>
      )}

      {isRest && (
        <p className="mt-3 text-label text-secondary">
          Rest day. Your streaks are protected, no points today.
        </p>
      )}

      {/* Pending list */}
      <section aria-label="To do" className="mt-6">
        {activeHabits.length === 0 ? (
          <div className="rounded-2xl bg-[var(--surface-1)] px-5 py-7">
            <h2 className="text-headline text-foreground">Start with one habit.</h2>
            <p className="mt-1 text-body text-secondary">Add something you want to do today.</p>
            <button type="button" onClick={onOpenHabits} className="control control-primary mt-5">
              <Plus size={15} /> Add a habit
            </button>
          </div>
        ) : pending.length > 0 ? (
          <ul className="overflow-hidden rounded-2xl bg-[var(--surface-1)] shadow-[0_0_0_1px_var(--border-subtle)] dark:shadow-none">
            {pending.map((habit, i) => (
              <HabitRow key={`${context}:${habit.id}`} {...rowProps(habit, i, pending)} />
            ))}
          </ul>
        ) : (
          <div className="rounded-2xl bg-[var(--surface-1)] px-5 py-6 text-center shadow-[0_0_0_1px_var(--border-subtle)] dark:shadow-none">
            <p className="text-headline text-foreground">All done{isTodaySelected ? ' for today' : ''}.</p>
            <p className="mt-1 text-body text-secondary">Nothing left on your list.</p>
          </div>
        )}
      </section>

      {/* Done disclosure */}
      {done.length > 0 && (
        <section className="mt-5">
          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              hapticLight();
              setDoneOpen(o => !o);
            }}
            aria-expanded={doneOpen}
            className="-mx-2 flex min-h-11 items-center gap-1.5 rounded-xl px-2 text-label text-secondary transition-colors active:bg-[var(--surface-2)]"
          >
            <span>Done</span>
            <span className="text-muted num">· {done.length}</span>
            <ChevronDown
              className={`size-4 text-muted transition-transform duration-200 motion-reduce:transition-none ${doneOpen ? 'rotate-180' : ''}`}
            />
          </button>
          {doneOpen && (
            <ul className="mt-1 overflow-hidden rounded-2xl bg-[var(--surface-1)] shadow-[0_0_0_1px_var(--border-subtle)] dark:shadow-none">
              {done.map((habit, i) => (
                <HabitRow key={`${context}:${habit.id}`} {...rowProps(habit, i, done)} />
              ))}
            </ul>
          )}
        </section>
      )}

      {/* Quiet footer actions */}
      <div className="mt-8 flex items-center justify-between">
        <button
          type="button"
          onClick={onOpenHabits}
          className="-ml-2 flex min-h-11 items-center gap-1.5 rounded-xl px-2 text-label text-secondary transition-colors active:bg-[var(--surface-2)]"
        >
          <Plus className="size-4" /> Edit habits
        </button>
        <button
          type="button"
          onClick={() => {
            soundEngine.playClick();
            hapticLight();
            toggleRestDay(selectedDate);
          }}
          className="-mr-2 min-h-11 rounded-xl px-2 text-label text-muted transition-colors active:bg-[var(--surface-2)]"
        >
          {isRest ? 'Cancel rest day' : 'Take a rest day'}
        </button>
      </div>
    </div>
  );
}
