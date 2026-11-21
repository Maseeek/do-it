'use client';

// PROTOTYPE variant B of Today: "Scoreboard + tiles".
// Leads with today's head-to-head score, then a 2-column board of habit tiles that fill in place when checked.
import React, { useEffect, useRef, useState } from 'react';
import {
  Activity,
  BedDouble,
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  Lock,
  Pencil,
  Swords,
} from 'lucide-react';
import type { TodayVariantProps } from './TodayPrototype';
import { QuantitySheet } from './TodayVariantB.QuantitySheet';
import { useStore } from '@/lib/store';
import { useMultiplayer } from '@/lib/multiplayer';
import { getPlayerThemeStyles } from '@/lib/player-colors';
import { proofPhotos as getProofPhotos } from '@/lib/duel-data';
import { addDays, getCurrentWeekDays, getTodayDateString, parseDate } from '@/lib/date-utils';
import { getHealthProgressDetails, type HealthProgressDetails } from '@/lib/health-correlation';
import { calculateHealthPoints } from '@/lib/health-rewards';
import { soundEngine } from '@/lib/sound-utils';
import { hapticCelebration, hapticLight, hapticSuccess } from '@/lib/haptic-utils';
import { fireCelebrationConfetti } from '@/lib/confetti';
import { HabitIcon } from '@/components/HabitIcon';
import { createDeferredView } from '@/components/DeferredView';
import type { CheckIn, Habit } from '@/lib/types';

const { View: ProofModal } = createDeferredView(() => import('@/components/ProofModal').then(m => m.ProofModal), null);

export const name = 'Scoreboard + tiles';

type TileModel = {
  habit: Habit;
  completed: boolean;
  checkIn: CheckIn | undefined;
  weeklyDone: number;
  weeklyMet: boolean;
  health: HealthProgressDetails | null;
  locked: boolean;
  points: number;
};

export function VariantB({ onOpenHabits, onOpenDuel }: TodayVariantProps) {
  const multiplayer = useMultiplayer();
  const {
    habits,
    activeHabits,
    checkIns,
    activePlayer,
    activePlayerId,
    partnerId,
    players,
    selectedDate,
    setSelectedDate,
    isTodaySelected,
    isHabitCompletedOnDate,
    getHabitCheckInOnDate,
    getWeeklyHabitCompletions,
    getHealthTelemetryOnDate,
    toggleHabit,
    isRestDay,
    toggleRestDay,
  } = useStore();

  const [qtyHabit, setQtyHabit] = useState<Habit | null>(null);
  const [proofHabit, setProofHabit] = useState<Habit | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [flash, setFlash] = useState<{ delta: number; token: number } | null>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (flashTimer.current) clearTimeout(flashTimer.current);
    if (toastTimer.current) clearTimeout(toastTimer.current);
  }, []);

  // ---- Scores -------------------------------------------------------------
  const partner = partnerId ? players[partnerId] : null;
  const sumFor = (playerId: string | null | undefined, date: string) =>
    checkIns.filter(c => c.playerId === playerId && c.date === date).reduce((s, c) => s + c.pointsEarned, 0);
  const myPoints = sumFor(activePlayerId, selectedDate);
  const partnerPoints = sumFor(partnerId, selectedDate);
  const rawPar = multiplayer.configured ? activeHabits.reduce((s, h) => s + h.points, 0) : 240;
  const par = rawPar > 0 ? rawPar : 240;
  const partnerHabits = habits.filter(h => h.playerId === partnerId && h.isActive);
  const partnerRawPar = multiplayer.configured ? partnerHabits.reduce((s, h) => s + h.points, 0) : par;
  const partnerPar = partnerRawPar > 0 ? partnerRawPar : par;
  const partnerDoneCount = new Set(
    checkIns.filter(c => c.playerId === partnerId && c.date === selectedDate).map(c => c.habitId)
  ).size;
  const lead = myPoints - partnerPoints;
  const isRest = isRestDay(selectedDate);

  // ---- Tiles --------------------------------------------------------------
  const tiles: TileModel[] = activeHabits.map(habit => {
    const completed = isHabitCompletedOnDate(habit.id, selectedDate);
    const checkIn = getHabitCheckInOnDate(habit.id, selectedDate);
    const weeklyDone = getWeeklyHabitCompletions(habit.id, selectedDate);
    const weeklyMet = Boolean(habit.weeklyTargetDays && weeklyDone >= habit.weeklyTargetDays);
    const health = getHealthProgressDetails(habit, getHealthTelemetryOnDate(habit.id, selectedDate), checkIn);
    const locked = Boolean(health && (health.metric === 'sleep' || (health.isLocked && !completed)));
    const available = health ? calculateHealthPoints(habit, health.value) : habit.points;
    const points = completed ? checkIn?.pointsEarned ?? habit.points : weeklyMet ? 0 : available || habit.points;
    return { habit, completed, checkIn, weeklyDone, weeklyMet, health, locked, points };
  });
  const doneCount = tiles.filter(t => t.completed || t.weeklyMet).length;
  const leftCount = tiles.length - doneCount;
  const allDone = tiles.length > 0 && leftCount === 0;

  // Celebrate crossing par (same trigger as production Today).
  const context = `${activePlayerId}:${selectedDate}`;
  const previous = useRef({ context, myPoints, allDone });
  useEffect(() => {
    const prev = previous.current;
    if (prev.context === context && ((myPoints >= par && prev.myPoints < par) || (allDone && !prev.allDone))) {
      soundEngine.playFanfare();
      fireCelebrationConfetti();
      hapticCelebration();
    }
    previous.current = { context, myPoints, allDone };
  }, [context, myPoints, allDone, par]);

  const showToast = (message: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(message);
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  };

  const flashDelta = (delta: number) => {
    if (delta <= 0) return;
    if (flashTimer.current) clearTimeout(flashTimer.current);
    setFlash(prev => ({ delta, token: (prev?.token ?? 0) + 1 }));
    flashTimer.current = setTimeout(() => setFlash(null), 900);
  };

  const handleTile = (tile: TileModel) => {
    const { habit, completed, locked, health, weeklyMet, points } = tile;
    if (locked && health) {
      soundEngine.playUncheck();
      hapticLight();
      showToast(health.lockReason);
      return;
    }
    if (completed) {
      soundEngine.playUncheck();
      hapticLight();
      toggleHabit(habit.id, undefined, undefined, undefined, selectedDate);
      return;
    }
    if (habit.isQuantitative) {
      soundEngine.playClick();
      hapticLight();
      setQtyHabit(habit);
      return;
    }
    if (habit.requiresProof && getProofPhotos(tile.checkIn).length === 0) {
      soundEngine.playClick();
      hapticLight();
      setProofHabit(habit);
      return;
    }
    soundEngine.playCheck();
    hapticSuccess();
    flashDelta(weeklyMet ? 0 : points);
    toggleHabit(habit.id, undefined, undefined, undefined, selectedDate);
  };

  const dateLabel = parseDate(selectedDate).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

  return (
    <div className="w-full stack-cards pb-24">
      <style>{`
        @keyframes varb-bump { 0% { transform: scale(1) } 40% { transform: scale(1.08) } 100% { transform: scale(1) } }
        @keyframes varb-rise { 0% { opacity: 0; transform: translateY(6px) } 25% { opacity: 1 } 100% { opacity: 0; transform: translateY(-14px) } }
        @keyframes varb-pop { 0% { transform: scale(.4); opacity: 0 } 60% { transform: scale(1.15); opacity: 1 } 100% { transform: scale(1) } }
        @media (prefers-reduced-motion: reduce) { [class*="animate-[varb"] { animation: none !important } }
      `}</style>
      {/* ---- Scoreboard ---- */}
      <section aria-label="Today's score" className="surface overflow-hidden rounded-3xl">
        <div className="flex items-center justify-between gap-3 px-4 pt-3.5">
          <p className="text-eyebrow text-muted truncate">
            {isTodaySelected ? 'Today' : dateLabel.split(',')[0]} · <span className="num">{dateLabel.split(', ')[1]}</span>
          </p>
          <button
            onClick={onOpenDuel}
            className="-mr-2 flex h-9 items-center gap-1 rounded-full px-2.5 text-label text-secondary hover:bg-[var(--surface-2)] transition-colors"
          >
            <Swords className="h-3.5 w-3.5" /> Duel
          </button>
        </div>

        <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2 px-4 pt-1">
          <ScoreSide
            align="left"
            label="You"
            name={activePlayer?.name ?? 'You'}
            color={activePlayer?.color}
            points={myPoints}
            flash={flash}
          />
          <div className="pb-3 text-center">
            <LeadPill lead={lead} hasPartner={Boolean(partner)} partnerName={partner?.name} />
          </div>
          {partner ? (
            <ScoreSide align="right" label={partner.name} name={partner.name} color={partner.color} points={partnerPoints} />
          ) : (
            <div className="flex flex-col items-end pb-3">
              <button onClick={onOpenDuel} className="text-label text-player-300 underline-offset-4 hover:underline">
                Invite a partner
              </button>
            </div>
          )}
        </div>

        <SplitBar
          me={{ points: myPoints, par, color: activePlayer?.color }}
          them={partner ? { points: partnerPoints, par: partnerPar, color: partner.color } : null}
          par={par}
        />

        <div className="flex items-center justify-between gap-3 px-4 pb-3.5 pt-2 text-caption text-muted">
          <span className="num">
            {myPoints >= par ? <span className="font-semibold text-emerald-500">Par hit</span> : <>{par - myPoints} to par</>}
            <span className="mx-1.5 opacity-50">·</span>
            {doneCount}/{tiles.length} done
          </span>
          {partner && (
            <span className="num text-right">
              {partnerDoneCount}/{partnerHabits.length} done
              <span className="mx-1.5 opacity-50">·</span>
              {partnerPoints >= partnerPar ? (
                <span className="font-semibold text-emerald-500">Par hit</span>
              ) : (
                <>{partnerPar - partnerPoints} to par</>
              )}
            </span>
          )}
        </div>

        {isRest && (
          <div className="flex items-center gap-2 border-t border-[var(--border-subtle)] bg-indigo-500/[0.08] px-4 py-2.5 text-label text-indigo-600 dark:text-indigo-300">
            <BedDouble className="h-4 w-4" /> Rest day · streaks are protected
          </div>
        )}
      </section>

      {/* ---- Day strip ---- */}
      <DayStrip
        selectedDate={selectedDate}
        onSelect={date => {
          soundEngine.playClick();
          hapticLight();
          setSelectedDate(date);
        }}
        pointsFor={date => sumFor(activePlayerId, date)}
        par={par}
        isRestDay={isRestDay}
      />

      {/* ---- Board ---- */}
      <section aria-labelledby="board-heading" className="pt-1">
        <div className="mb-2.5 flex items-center justify-between px-0.5">
          <h2 id="board-heading" className="text-headline">
            {allDone ? 'Board cleared' : <><span className="num">{leftCount}</span> left</>}
          </h2>
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                soundEngine.playClick();
                hapticLight();
                toggleRestDay(selectedDate);
              }}
              aria-pressed={isRest}
              className={`flex h-9 items-center gap-1.5 rounded-full px-3 text-label transition-colors ${
                isRest
                  ? 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-300'
                  : 'text-secondary hover:bg-[var(--surface-2)]'
              }`}
            >
              <BedDouble className="h-3.5 w-3.5" /> {isRest ? 'Resting' : 'Rest'}
            </button>
            <button
              onClick={onOpenHabits}
              className="flex h-9 items-center gap-1.5 rounded-full px-3 text-label text-secondary hover:bg-[var(--surface-2)] transition-colors"
            >
              <Pencil className="h-3.5 w-3.5" /> Edit
            </button>
          </div>
        </div>

        {toast && (
          <div role="status" className="mb-2.5 flex items-center gap-2 rounded-2xl bg-[var(--surface-2)] px-3.5 py-2.5 text-label text-secondary">
            <Lock className="h-3.5 w-3.5 shrink-0" />
            <span>{toast}</span>
          </div>
        )}

        {tiles.length > 0 ? (
          <div className="grid grid-cols-2 gap-2.5">
            {tiles.map(tile => (
              <HabitTile key={`${context}:${tile.habit.id}`} tile={tile} onTap={() => handleTile(tile)} />
            ))}
          </div>
        ) : (
          <div className="surface surface-pad rounded-3xl text-center">
            <p className="text-headline">Your board is empty</p>
            <p className="mt-1 text-body text-muted">Add one habit to start scoring.</p>
            <button onClick={onOpenHabits} className="control control-primary mt-4">Add a habit</button>
          </div>
        )}
      </section>

      {qtyHabit && (
        <QuantitySheet
          habit={qtyHabit}
          onClose={() => setQtyHabit(null)}
          onLog={quantity => {
            const pts = Math.min(qtyHabit.points, Math.max(1, Math.round(quantity * (qtyHabit.pointsPerUnit || 1))));
            soundEngine.playCheck();
            hapticSuccess();
            flashDelta(pts);
            toggleHabit(qtyHabit.id, undefined, quantity, undefined, selectedDate);
            setQtyHabit(null);
          }}
        />
      )}

      {proofHabit && (
        <ProofModal
          habit={proofHabit}
          isOpen
          onClose={() => setProofHabit(null)}
          onConfirm={(urls?: string[]) => {
            soundEngine.playCheck();
            hapticSuccess();
            flashDelta(proofHabit.points);
            toggleHabit(proofHabit.id, urls, undefined, undefined, selectedDate);
            setProofHabit(null);
          }}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

function ScoreSide({
  align,
  label,
  name,
  color,
  points,
  flash,
}: {
  align: 'left' | 'right';
  label: string;
  name: string;
  color?: string;
  points: number;
  flash?: { delta: number; token: number } | null;
}) {
  const right = align === 'right';
  return (
    <div style={color ? getPlayerThemeStyles({ color }) : undefined} className={`min-w-0 ${right ? 'text-right' : ''}`}>
      <div className={`flex items-center gap-1.5 ${right ? 'justify-end' : ''}`}>
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-player-500 text-[11px] font-bold text-white">
          {name[0]}
        </span>
        <span className="truncate text-label text-secondary">{label}</span>
      </div>
      <div className={`relative flex items-baseline gap-1 ${right ? 'justify-end' : ''}`}>
        <span
          key={flash?.token ?? 'idle'}
          className={`num text-[52px] leading-[1.05] font-bold tracking-[-0.04em] text-player-400 ${flash ? 'animate-[varb-bump_420ms_cubic-bezier(.2,.8,.2,1)]' : ''}`}
        >
          {points}
        </span>
        {flash && (
          <span
            key={`d-${flash.token}`}
            aria-hidden="true"
            className="absolute -top-1 left-[calc(100%-0.5rem)] num text-label font-bold text-player-300 animate-[varb-rise_900ms_ease-out_forwards]"
          >
            +{flash.delta}
          </span>
        )}
      </div>
    </div>
  );
}

function LeadPill({ lead, hasPartner, partnerName }: { lead: number; hasPartner: boolean; partnerName?: string }) {
  if (!hasPartner) return <span className="text-caption text-muted">solo</span>;
  const text = lead === 0 ? 'Tied' : lead > 0 ? `You lead by ${lead}` : `${partnerName ?? 'They'} +${-lead}`;
  return (
    <span
      className={`inline-flex max-w-[7.5rem] items-center rounded-full px-2.5 py-1 text-caption font-semibold num whitespace-nowrap ${
        lead === 0
          ? 'bg-[var(--surface-2)] text-secondary'
          : lead > 0
          ? 'bg-emerald-500/12 text-emerald-600 dark:text-emerald-400'
          : 'bg-amber-500/12 text-amber-700 dark:text-amber-400'
      }`}
    >
      {text}
    </span>
  );
}

// Tug-of-war bar: each half fills from the outside toward the centre notch; reaching the notch = Daily Par.
function SplitBar({
  me,
  them,
  par,
}: {
  me: { points: number; par: number; color?: string };
  them: { points: number; par: number; color?: string } | null;
  par: number;
}) {
  const pct = (p: number, of: number) => Math.min(100, Math.round((p / Math.max(1, of)) * 100));
  return (
    <div className="px-4 pt-2">
      <div
        role="img"
        aria-label={`You ${me.points} of ${me.par}${them ? `, partner ${them.points} of ${them.par}` : ''} points toward par`}
        className="relative flex h-3 gap-[3px]"
      >
        <div className="relative flex-1 overflow-hidden rounded-l-full bg-[var(--surface-2)]">
          <div
            style={{ width: `${pct(me.points, me.par)}%`, ...(me.color ? getPlayerThemeStyles({ color: me.color }) : {}) }}
            className="h-full rounded-l-full bg-player-500 transition-[width] duration-500 ease-out"
          />
        </div>
        <div className="relative flex-1 overflow-hidden rounded-r-full bg-[var(--surface-2)]">
          {them && (
            <div
              style={{ width: `${pct(them.points, them.par)}%`, ...(them.color ? getPlayerThemeStyles({ color: them.color }) : {}) }}
              className="ml-auto h-full rounded-r-full bg-player-500 transition-[width] duration-500 ease-out"
            />
          )}
        </div>
      </div>
      <div className="mt-1 flex justify-center">
        <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">
          Par <span className="num">{par}</span>
        </span>
      </div>
    </div>
  );
}

function DayStrip({
  selectedDate,
  onSelect,
  pointsFor,
  par,
  isRestDay,
}: {
  selectedDate: string;
  onSelect: (date: string) => void;
  pointsFor: (date: string) => number;
  par: number;
  isRestDay: (date: string) => boolean;
}) {
  const today = getTodayDateString();
  const days = getCurrentWeekDays(selectedDate);
  const canGoNext = days[6].dateStr < today;
  return (
    <nav aria-label="Choose day" className="flex items-center gap-0.5">
      <button
        onClick={() => onSelect(addDays(selectedDate, -7))}
        aria-label="Previous week"
        className="flex h-11 w-7 shrink-0 items-center justify-center rounded-full text-muted hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <div className="grid flex-1 grid-cols-7">
        {days.map(day => {
          const selected = day.dateStr === selectedDate;
          const pts = day.isFuture ? 0 : pointsFor(day.dateStr);
          const pct = Math.min(100, Math.round((pts / par) * 100));
          const hitPar = pts >= par;
          const rest = isRestDay(day.dateStr);
          return (
            <button
              key={day.dateStr}
              disabled={day.isFuture}
              onClick={() => onSelect(day.dateStr)}
              aria-current={selected ? 'date' : undefined}
              aria-label={`${day.dayName} ${day.dayNumber}, ${pts} points${rest ? ', rest day' : ''}`}
              className="flex min-h-[52px] flex-col items-center justify-center gap-1 disabled:opacity-30"
            >
              <span className={`text-[11px] font-semibold ${day.isToday ? 'text-player-300' : 'text-muted'}`}>
                {day.dayName[0]}
              </span>
              <span
                className={`relative flex h-8 w-8 items-center justify-center rounded-full p-[2.5px] transition-shadow ${
                  selected ? 'ring-2 ring-foreground ring-offset-2 ring-offset-[var(--background)]' : ''
                }`}
                style={{
                  background: hitPar
                    ? 'var(--player-base)'
                    : `conic-gradient(var(--player-base) ${pct}%, var(--surface-3) 0)`,
                }}
              >
                <span
                  className={`flex h-full w-full items-center justify-center rounded-full text-[12px] font-semibold num ${
                    hitPar ? 'bg-transparent text-white' : 'bg-[var(--background)] text-foreground'
                  }`}
                >
                  {rest && !hitPar ? <BedDouble className="h-3.5 w-3.5 text-indigo-500" /> : hitPar ? <Check className="h-4 w-4" strokeWidth={3} /> : day.dayNumber}
                </span>
              </span>
            </button>
          );
        })}
      </div>
      <button
        onClick={() => onSelect(addDays(selectedDate, 7) > today ? today : addDays(selectedDate, 7))}
        disabled={!canGoNext}
        aria-label="Next week"
        className="flex h-11 w-7 shrink-0 items-center justify-center rounded-full text-muted hover:text-foreground disabled:opacity-25"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </nav>
  );
}

function HabitTile({ tile, onTap }: { tile: TileModel; onTap: () => void }) {
  const { habit, completed, weeklyDone, weeklyMet, health, locked, points, checkIn } = tile;
  const isWeekly = Boolean(habit.weeklyTargetDays);
  const filled = completed;
  const softDone = !completed && weeklyMet;

  const label = locked
    ? `${habit.title}: ${health?.lockReason ?? 'tracked automatically'}`
    : completed
    ? `${habit.title}, done, ${points} points. Tap to undo.`
    : `Check in ${habit.title} for ${points} points`;

  const sub = completed && checkIn?.quantity
    ? `${checkIn.quantity} ${habit.quantityUnit ?? ''}`.trim()
    : health && !completed
    ? `${health.formattedValue} / ${health.formattedTarget}`
    : null;

  return (
    <button
      onClick={onTap}
      aria-pressed={completed}
      aria-label={label}
      className={`group relative flex min-h-[118px] flex-col overflow-hidden rounded-3xl border p-3.5 text-left transition-[background-color,border-color,transform,box-shadow] duration-200 ease-out active:scale-[0.97] ${
        filled
          ? 'border-transparent bg-player-500 text-white shadow-[0_8px_24px_-12px_var(--player-base)]'
          : softDone
          ? 'border-emerald-500/30 bg-emerald-500/[0.07]'
          : 'border-[var(--border-subtle)] bg-[var(--surface-1)] hover:border-[var(--border-medium)]'
      }`}
    >
      {filled && (
        // Light mode: deepen the fill a touch so white text keeps contrast on pale player colors.
        <span aria-hidden="true" className="pointer-events-none absolute inset-0 bg-black/[0.16] dark:bg-transparent" />
      )}
      {filled && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_80%_at_0%_0%,rgba(255,255,255,0.22),transparent_60%)]"
        />
      )}

      <div className="relative flex items-start justify-between">
        <span
          className={`flex h-9 w-9 items-center justify-center rounded-xl ${
            filled ? 'bg-white/20 text-white' : 'bg-[var(--surface-2)] text-secondary'
          }`}
        >
          <HabitIcon name={habit.iconName} className="h-[18px] w-[18px]" />
        </span>

        {filled ? (
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-player-600 animate-[varb-pop_320ms_cubic-bezier(.2,.8,.2,1)]">
            <Check className="h-4 w-4" strokeWidth={3} />
          </span>
        ) : locked ? (
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--surface-2)] text-muted">
            <Lock className="h-3.5 w-3.5" />
          </span>
        ) : softDone ? (
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
            <Check className="h-4 w-4" strokeWidth={3} />
          </span>
        ) : (
          <span className="h-7 w-7 rounded-full border-2 border-[var(--border-strong)] transition-colors group-hover:border-player-400" />
        )}
      </div>

      <p className={`relative mt-auto pt-2.5 text-label font-semibold leading-snug line-clamp-2 ${filled ? 'text-white' : 'text-foreground'}`}>
        {habit.title}
      </p>

      <div className="relative mt-1.5 flex items-center gap-1.5">
        <span
          className={`num text-headline font-bold leading-none ${
            filled ? 'text-white' : softDone ? 'text-emerald-600 dark:text-emerald-400' : 'text-player-300'
          }`}
        >
          {softDone ? 'Week met' : `+${points}`}
        </span>
        <span className="ml-auto flex items-center gap-1">
          {isWeekly && (
            <Pill filled={filled} tone={weeklyMet ? 'good' : 'plain'}>
              <span className="num">{weeklyDone}/{habit.weeklyTargetDays}</span>
            </Pill>
          )}
          {habit.automation && (
            <Pill filled={filled}>
              <Activity className="h-3 w-3" /> Auto
            </Pill>
          )}
          {habit.requiresProof && !completed && (
            <Pill filled={filled}>
              <Camera className="h-3 w-3" />
            </Pill>
          )}
          {sub && !habit.automation && (
            <Pill filled={filled}>
              <span className="num">{sub}</span>
            </Pill>
          )}
        </span>
      </div>
      {sub && habit.automation && (
        <p className={`relative mt-1 text-caption num ${filled ? 'text-white/80' : 'text-muted'}`}>{sub}</p>
      )}
    </button>
  );
}

function Pill({ children, filled, tone = 'plain' }: { children: React.ReactNode; filled: boolean; tone?: 'plain' | 'good' }) {
  return (
    <span
      className={`inline-flex h-5 items-center gap-0.5 rounded-full px-1.5 text-[11px] font-semibold ${
        filled
          ? 'bg-white/20 text-white'
          : tone === 'good'
          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
          : 'bg-[var(--surface-2)] text-secondary'
      }`}
    >
      {children}
    </span>
  );
}
