'use client';

// PROTOTYPE variant C of Today: "Next up". One habit in focus at a time, the rest queued behind it.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { BedDouble, Check, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { useStore } from '@/lib/store';
import { useMultiplayer } from '@/lib/multiplayer';
import { getPlayerThemeStyles } from '@/lib/player-colors';
import { addDays, getTodayDateString, isFutureDate, parseDate } from '@/lib/date-utils';
import { soundEngine } from '@/lib/sound-utils';
import { hapticCelebration, hapticLight } from '@/lib/haptic-utils';
import { fireCelebrationConfetti } from '@/lib/confetti';
import { HabitIcon } from '@/components/HabitIcon';
import type { Habit } from '@/lib/types';
import type { TodayVariantProps } from './TodayPrototype';
import { FocusCard, ParReached } from './TodayVariantC.focus';

export const name = 'Next up';

export function VariantC(props: TodayVariantProps) {
  const { activePlayerId, selectedDate } = useStore();
  // Queue order and focus are per player and per day; remount to reset them.
  return <NextUp key={`${activePlayerId}:${selectedDate}`} {...props} />;
}

function NextUp({ onOpenHabits, onOpenDuel }: TodayVariantProps) {
  const multiplayer = useMultiplayer();
  const {
    habits,
    activeHabits,
    checkIns,
    activePlayer,
    partnerId,
    players,
    selectedDate,
    setSelectedDate,
    isTodaySelected,
    isHabitSatisfiedOnDate,
    isHabitCompletedOnDate,
    getHabitCheckInOnDate,
    getWeeklyHabitCompletions,
    getHabitStreak,
    getHealthTelemetryOnDate,
    toggleHabit,
    isRestDay,
    toggleRestDay,
  } = useStore();

  const [deferred, setDeferred] = useState<string[]>([]);
  const [focusId, setFocusId] = useState<string | null>(null);

  const points = useMemo(
    () =>
      checkIns
        .filter((c) => c.playerId === activePlayer?.id && c.date === selectedDate)
        .reduce((sum, c) => sum + c.pointsEarned, 0),
    [checkIns, activePlayer?.id, selectedDate],
  );
  const rawPar = multiplayer.configured ? activeHabits.reduce((s, h) => s + h.points, 0) : 240;
  const par = rawPar > 0 ? rawPar : 240;

  const partner = partnerId ? players[partnerId] : null;
  const partnerPoints = useMemo(
    () =>
      checkIns
        .filter((c) => c.playerId === partnerId && c.date === selectedDate)
        .reduce((sum, c) => sum + c.pointsEarned, 0),
    [checkIns, partnerId, selectedDate],
  );
  const partnerRawPar = multiplayer.configured
    ? habits.filter((h) => h.playerId === partnerId && h.isActive).reduce((s, h) => s + h.points, 0)
    : par;
  const partnerPar = partnerRawPar > 0 ? partnerRawPar : par;

  const pendingInOrder = activeHabits.filter((h) => !isHabitSatisfiedOnDate(h.id, selectedDate));
  const done = activeHabits.filter((h) => isHabitSatisfiedOnDate(h.id, selectedDate));
  const queue: Habit[] = [
    ...pendingInOrder.filter((h) => !deferred.includes(h.id)),
    ...deferred.map((id) => pendingInOrder.find((h) => h.id === id)).filter((h): h is Habit => Boolean(h)),
  ];
  const focused = queue.find((h) => h.id === focusId) ?? queue[0] ?? null;
  const upNext = queue.filter((h) => h !== focused);
  const allDone = activeHabits.length > 0 && queue.length === 0;
  const parReached = points >= par;
  const progress = Math.min(100, Math.round((points / par) * 100));
  const partnerProgress = Math.min(100, Math.round((partnerPoints / partnerPar) * 100));
  const isRest = isRestDay(selectedDate);
  const todayStr = getTodayDateString();

  // Celebrate the moment par or a clean sweep is reached, not on mount.
  const previous = useRef({ points, allDone });
  useEffect(() => {
    const prev = previous.current;
    if ((points >= par && prev.points < par) || (allDone && !prev.allDone)) {
      soundEngine.playFanfare();
      fireCelebrationConfetti();
      hapticCelebration();
    }
    previous.current = { points, allDone };
  }, [points, allDone, par]);

  const tap = () => {
    soundEngine.playClick();
    hapticLight();
  };

  const later = (id: string) => {
    tap();
    setDeferred((prev) => [...prev.filter((x) => x !== id), id]);
    setFocusId(null);
  };

  const bringIntoFocus = (id: string) => {
    tap();
    setFocusId(id);
  };

  const undo = (habit: Habit) => {
    soundEngine.playUncheck();
    hapticLight();
    toggleHabit(habit.id, undefined, undefined, undefined, selectedDate);
    setFocusId(habit.id);
  };

  const dateLabel = parseDate(selectedDate).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
  const nextDisabled = isFutureDate(addDays(selectedDate, 1));
  const left = queue.length;
  const toPar = Math.max(0, par - points);

  return (
    <div className="w-full pb-24">
      <style>{MOTION_CSS}</style>

      {/* Slim context line: date browsing + partner glance */}
      <div className="-mx-2 flex h-11 items-center justify-between gap-2 text-label">
        <div className="flex min-w-0 items-center">
          <button
            type="button"
            onClick={() => {
              tap();
              setSelectedDate(addDays(selectedDate, -1));
            }}
            aria-label="Previous day"
            className="grid h-11 w-9 place-items-center rounded-full text-muted transition-colors hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          {isTodaySelected ? (
            <span className="truncate text-foreground">{dateLabel}</span>
          ) : (
            <button
              type="button"
              onClick={() => {
                tap();
                setSelectedDate(todayStr);
              }}
              className="flex h-11 items-center gap-1.5 truncate text-foreground"
              aria-label={`${dateLabel}. Jump back to today`}
            >
              {dateLabel}
              <span className="text-caption text-player-400">Today ›</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              tap();
              setSelectedDate(addDays(selectedDate, 1));
            }}
            disabled={nextDisabled}
            aria-label="Next day"
            className="grid h-11 w-9 place-items-center rounded-full text-muted transition-colors hover:text-foreground disabled:opacity-25"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {partner && (
          <button
            type="button"
            onClick={() => {
              tap();
              onOpenDuel();
            }}
            style={getPlayerThemeStyles(partner)}
            aria-label={`${partner.name} has ${partnerPoints} of ${partnerPar} points. Open Duel`}
            className="flex h-11 shrink-0 items-center gap-2 rounded-full px-2 text-secondary transition-colors hover:text-foreground"
          >
            <span aria-hidden="true" className="h-2 w-2 rounded-full bg-player-500" />
            <span className="text-foreground">{partner.name}</span>
            <span className="num">{partnerPoints} pts</span>
          </button>
        )}
      </div>

      {activeHabits.length === 0 ? (
        <section className="pt-10">
          <h1 className="text-display text-balance">Nothing on the list yet.</h1>
          <p className="mt-3 text-body text-secondary">Add one habit you want to do today. One is enough.</p>
          <button
            type="button"
            onClick={onOpenHabits}
            className="mt-8 flex h-14 w-full items-center justify-center gap-2 rounded-[var(--radius-control)] bg-foreground text-headline text-[var(--background)]"
          >
            <Plus className="h-5 w-5" /> Add a habit
          </button>
        </section>
      ) : (
        <>
          {/* Editorial headline */}
          <header className="pt-5 pb-7">
            <h1 className="text-display text-balance">
              {isRest ? (
                <>
                  Rest day. <span className="block text-muted">Your streak is safe.</span>
                </>
              ) : allDone ? (
                <>
                  That&apos;s everything. <span className="block text-muted num">{points} points {isTodaySelected ? 'today' : 'logged'}.</span>
                </>
              ) : parReached ? (
                <>
                  Par reached. <span className="block text-muted num">{left} more for extra credit.</span>
                </>
              ) : (
                <>
                  <span className="num">{left}</span> {left === 1 ? 'habit' : 'habits'} left.{' '}
                  <span className="block text-muted">
                    <span className="num">{toPar}</span> points to par.
                  </span>
                </>
              )}
            </h1>

            {/* Points vs par, with the partner as a quiet tick on the same track */}
            <div className="mt-5">
              <div
                role="progressbar"
                aria-label={`${points} of ${par} points`}
                aria-valuenow={points}
                aria-valuemin={0}
                aria-valuemax={par}
                className="relative h-1.5 rounded-full bg-[var(--surface-3)]"
              >
                <div
                  className={`h-full rounded-full transition-[width] duration-500 ease-out motion-reduce:transition-none ${
                    parReached ? 'bg-[var(--par-emerald)]' : 'bg-player-500'
                  }`}
                  style={{ width: `${progress}%` }}
                />
                {partner && (
                  <span
                    aria-hidden="true"
                    style={{ ...getPlayerThemeStyles(partner), left: `${partnerProgress}%` }}
                    className="absolute top-1/2 h-3.5 w-[3px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-player-500 ring-2 ring-[var(--background)]"
                  />
                )}
              </div>
              <div className="mt-2 flex items-center justify-between text-caption text-muted">
                <span className="num">
                  <span className="text-foreground">{points}</span> / {par} pts
                </span>
                {partner && (
                  <span className="num" style={getPlayerThemeStyles(partner)}>
                    <span className="text-player-400">▍</span>
                    {partner.name}
                  </span>
                )}
              </div>
            </div>
          </header>

          {/* Hero: the one thing to do now */}
          {focused ? (
            <FocusCard
              key={focused.id}
              habit={focused}
              selectedDate={selectedDate}
              checkIn={getHabitCheckInOnDate(focused.id, selectedDate)}
              telemetry={getHealthTelemetryOnDate(focused.id, selectedDate)}
              weeklyCompletions={getWeeklyHabitCompletions(focused.id, selectedDate)}
              streak={getHabitStreak(focused, todayStr)}
              canDefer={queue.length > 1}
              onLater={() => later(focused.id)}
              toggleHabit={toggleHabit}
            />
          ) : (
            <ParReached points={points} par={par} habitCount={done.length} weekday={parseDate(selectedDate).toLocaleDateString('en-US', { weekday: 'long' })} partner={partner} partnerPoints={partnerPoints} onOpenDuel={onOpenDuel} />
          )}

          {/* Up next scroller */}
          {upNext.length > 0 && (
            <section aria-labelledby="c-upnext" className="mt-9">
              <div className="flex items-baseline justify-between">
                <h2 id="c-upnext" className="text-eyebrow text-muted">
                  Up next <span className="num">· {upNext.length}</span>
                </h2>
                <button type="button" onClick={onOpenHabits} className="-my-3 py-3 text-label text-muted hover:text-foreground">
                  Manage
                </button>
              </div>
              <ul className="c-scroller -mx-4 mt-3 flex snap-x snap-mandatory scroll-px-4 gap-2 overflow-x-auto px-4 pb-1">
                {upNext.map((habit) => {
                  const weekly = habit.weeklyTargetDays ? getWeeklyHabitCompletions(habit.id, selectedDate) : null;
                  return (
                    <li key={habit.id} className="snap-start">
                      <button
                        type="button"
                        onClick={() => bringIntoFocus(habit.id)}
                        aria-label={`Focus ${habit.title}, ${habit.points} points`}
                        className="flex h-[88px] w-[136px] flex-col justify-between rounded-2xl bg-[var(--surface-2)] p-3 text-left transition-colors hover:bg-[var(--surface-3)] active:scale-[0.97] motion-reduce:active:scale-100"
                      >
                        <span className="flex items-center justify-between text-muted">
                          <HabitIcon name={habit.iconName} className="h-4 w-4" />
                          <span className="num text-caption">
                            {weekly !== null ? `${weekly}/${habit.weeklyTargetDays} wk · ` : ''}+{habit.points}
                          </span>
                        </span>
                        <span className="line-clamp-2 text-label text-foreground">{habit.title}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {/* Done today */}
          {done.length > 0 && (
            <section aria-labelledby="c-done" className="mt-8">
              <h2 id="c-done" className="text-eyebrow text-muted">
                Done {isTodaySelected ? 'today' : ''} <span className="num">· {done.length}</span>
              </h2>
              <ul className="c-scroller -mx-4 mt-3 flex gap-2 overflow-x-auto px-4">
                {done.map((habit) => {
                  const completed = isHabitCompletedOnDate(habit.id, selectedDate);
                  const checkIn = getHabitCheckInOnDate(habit.id, selectedDate);
                  const label = completed ? `+${checkIn?.pointsEarned ?? habit.points}` : 'week met';
                  return (
                    <li key={habit.id} className="shrink-0">
                      <button
                        type="button"
                        disabled={!completed}
                        onClick={() => undo(habit)}
                        aria-label={completed ? `Undo ${habit.title}` : `${habit.title}: weekly target met`}
                        title={completed ? 'Tap to undo' : undefined}
                        className="group flex h-11 items-center gap-2 rounded-full border border-[var(--border-subtle)] pr-3.5 pl-2 text-label text-secondary transition-colors hover:text-foreground disabled:cursor-default"
                      >
                        <span
                          className={`grid h-6 w-6 place-items-center rounded-full ${
                            completed ? 'bg-player-500 text-white' : 'bg-[var(--par-emerald)]/15 text-[var(--par-emerald)]'
                          }`}
                        >
                          <Check className="h-3.5 w-3.5" strokeWidth={3} />
                        </span>
                        <span className="max-w-[8rem] truncate">{habit.title}</span>
                        <span className="num text-caption text-muted">{label}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {/* Rest day, tucked out of the way */}
          <div className="mt-10 flex justify-center">
            <button
              type="button"
              onClick={() => {
                tap();
                toggleRestDay(selectedDate);
              }}
              aria-pressed={isRest}
              className="flex h-11 items-center gap-2 px-3 text-label text-muted transition-colors hover:text-foreground"
            >
              <BedDouble className="h-4 w-4" />
              {isRest ? 'Rest day on · undo' : 'Taking today off? Mark a rest day'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

const MOTION_CSS = `
.c-scroller { scrollbar-width: none; }
.c-scroller::-webkit-scrollbar { display: none; }
@media (prefers-reduced-motion: no-preference) {
  @keyframes c-focus-in {
    from { opacity: 0; transform: translateY(8px) scale(0.99); }
    to { opacity: 1; transform: none; }
  }
  .c-focus-in { animation: c-focus-in 320ms cubic-bezier(0.2, 0.8, 0.2, 1) both; }
}
`;
