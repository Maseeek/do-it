'use client';

import React, { useMemo, useRef, useState } from 'react';
import { Minus, Moon, Plus, SlidersHorizontal } from 'lucide-react';
import type { Habit } from '@/lib/types';
import { calculateHealthProgress } from '@/lib/health-correlation';
import {
  calculateHealthPoints,
  formatSleepHours,
  MAX_SLEEP_TARGET_HOURS,
  MIN_SLEEP_TARGET_HOURS,
  SLEEP_QUICK_TARGET_PRESETS,
  sleepMinimumRewardHours,
} from '@/lib/health-rewards';
import { soundEngine } from '@/lib/sound-utils';
import { hapticLight } from '@/lib/haptic-utils';

interface SleepSliderProps {
  habit: Habit;
  target: number;
  loggedHours: number | null;
  isWeeklyTargetMet: boolean;
  onCommitSleep: (hours: number) => void;
  onUpdateTarget: (newTarget: number) => void;
}

export function SleepSlider({
  habit,
  target,
  loggedHours,
  isWeeklyTargetMet,
  onCommitSleep,
  onUpdateTarget,
}: SleepSliderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [draftHours, setDraftHours] = useState<number>(0);
  const [belowCutoffHours, setBelowCutoffHours] = useState<number | null>(null);
  const [showGoalEditor, setShowGoalEditor] = useState(false);

  const isPointerDraggingRef = useRef(false);
  const latestDraftRef = useRef<number>(0);

  const minRewardHours = sleepMinimumRewardHours(target);
  const maxHours = Math.max(12, Math.ceil(target + 2));

  // Derive visible hours without effects: dragging overrides loggedHours, and a sub-threshold
  // manual slide stays visible until the user logs a qualifying value or slides back to 0.
  const displayHours = isDragging
    ? draftHours
    : loggedHours !== null
    ? loggedHours
    : belowCutoffHours;

  const sliderValue = displayHours ?? 0;

  const progress = useMemo(
    () => (displayHours !== null && displayHours > 0 ? calculateHealthProgress(displayHours, target, 'sleep') : null),
    [displayHours, target]
  );

  const previewPoints = useMemo(() => {
    if (displayHours === null || displayHours <= 0) return 0;
    if (isWeeklyTargetMet && loggedHours === null) return 0;
    return calculateHealthPoints(habit, displayHours);
  }, [displayHours, habit, isWeeklyTargetMet, loggedHours]);

  const fillPercent = Math.min(100, Math.max(0, (sliderValue / maxHours) * 100));
  const targetPercent = Math.min(100, Math.max(0, (target / maxHours) * 100));
  const minPercent = Math.min(100, Math.max(0, (minRewardHours / maxHours) * 100));

  const commitValue = (hours: number) => {
    const normalized = Math.round(Math.min(maxHours, Math.max(0, hours)) * 100) / 100;
    if (normalized <= 0) {
      setBelowCutoffHours(null);
      onCommitSleep(0);
      return;
    }
    if (normalized < minRewardHours) {
      setBelowCutoffHours(normalized);
      onCommitSleep(normalized);
      return;
    }
    setBelowCutoffHours(null);
    onCommitSleep(normalized);
  };

  const handlePointerDown = () => {
    isPointerDraggingRef.current = true;
    latestDraftRef.current = sliderValue;
    setDraftHours(sliderValue);
    setIsDragging(true);
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextValue = Number(event.target.value);
    if (!Number.isFinite(nextValue)) return;
    latestDraftRef.current = nextValue;
    setDraftHours(nextValue);

    if (!isPointerDraggingRef.current) {
      commitValue(nextValue);
    }
  };

  const handlePointerFinish = () => {
    if (!isPointerDraggingRef.current) return;
    isPointerDraggingRef.current = false;
    setIsDragging(false);
    commitValue(latestDraftRef.current);
  };

  const handleSelectTarget = (nextTarget: number) => {
    const clamped = Math.min(MAX_SLEEP_TARGET_HOURS, Math.max(MIN_SLEEP_TARGET_HOURS, Math.round(nextTarget * 2) / 2));
    if (clamped === target) return;
    soundEngine.playClick();
    hapticLight();
    onUpdateTarget(clamped);
  };

  const toneText = progress ? progress.classes.text : 'text-[var(--text-muted)]';
  const trackBarColor = progress ? progress.classes.bar : 'bg-[var(--border-strong)]';
  const thumbBorderColor = progress ? progress.classes.border : 'border-[var(--border-strong)]';

  const statusText = (() => {
    if (displayHours === null || displayHours <= 0 || !progress) {
      return `Min ${formatSleepHours(minRewardHours)}h`;
    }
    if (progress.ratio === 0) {
      return `Below ${formatSleepHours(minRewardHours)}h · 0 pts`;
    }
    if (progress.qualified) {
      return `100% · +${previewPoints} pts`;
    }
    return `${progress.percentage}% · +${previewPoints} pts`;
  })();

  return (
    <div
      className="relative z-10 mx-1 mt-2 border-t border-[var(--border-subtle)] px-2 pb-1.5 pt-2.5"
      onClick={(event) => event.stopPropagation()}
    >
      {/* Readout row + clickable target goal pill */}
      <div className="flex items-center justify-between gap-2 text-caption">
        <div className="flex min-w-0 items-center gap-1.5">
          <Moon className={`size-3.5 shrink-0 transition-colors duration-150 ${toneText}`} aria-hidden="true" />
          <span className="truncate text-[var(--text-secondary)]">
            {displayHours !== null && displayHours > 0 ? (
              <>
                <span className={`num font-semibold transition-colors duration-150 ${toneText}`}>
                  {formatSleepHours(displayHours)} hrs
                </span>
                <span className="text-[var(--text-muted)]"> / </span>
              </>
            ) : (
              <span className="text-[var(--text-muted)]">Slide sleep · </span>
            )}
          </span>
          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              hapticLight();
              setShowGoalEditor((open) => !open);
            }}
            aria-expanded={showGoalEditor}
            aria-label={`Target sleep goal: ${formatSleepHours(target)} hours. Tap to adjust`}
            className={`num relative inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-caption font-medium transition-colors before:absolute before:-inset-y-2 before:-inset-x-1 before:content-[''] ${
              showGoalEditor
                ? 'bg-player-500/15 text-player-600 dark:text-player-300'
                : 'bg-[var(--surface-2)] text-[var(--text-secondary)] hover:text-foreground'
            }`}
          >
            <span>Goal {formatSleepHours(target)}h</span>
            <SlidersHorizontal className="size-3" aria-hidden="true" />
          </button>
        </div>

        <span className={`num shrink-0 font-medium transition-colors duration-150 ${toneText}`}>
          {statusText}
        </span>
      </div>

      {/* Tactile range slider with native input overlay */}
      <div className="mt-1 px-2">
        <div className="relative flex h-10 items-center select-none">
          {/* Background track */}
          <div className="relative h-2 w-full overflow-hidden rounded-full bg-[var(--surface-3)]">
            {/* Active fill */}
            <div
              className={`h-full rounded-full transition-colors duration-150 ${trackBarColor}`}
              style={{ width: `${fillPercent}%` }}
            />
            {/* Partial points threshold tick */}
            {minPercent > 0 && minPercent < 100 && (
              <span
                aria-hidden="true"
                className="pointer-events-none absolute top-0 bottom-0 w-px bg-[var(--foreground)]/20"
                style={{ left: `${minPercent}%` }}
              />
            )}
            {/* Target sleep goal tick */}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute top-0 bottom-0 w-0.5 bg-foreground/55"
              style={{ left: `${targetPercent}%` }}
            />
          </div>

          {/* Native accessible range input */}
          <input
            type="range"
            min={0}
            max={maxHours}
            step={0.25}
            value={sliderValue}
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerFinish}
            onPointerCancel={handlePointerFinish}
            onChange={handleChange}
            aria-label={`Sleep duration for ${habit.title}`}
            aria-valuetext={
              sliderValue > 0
                ? `${formatSleepHours(sliderValue)} hours of ${formatSleepHours(target)} hour goal, ${previewPoints} points`
                : 'Not logged'
            }
            style={{ touchAction: 'pan-y' }}
            className="peer absolute inset-0 z-20 m-0 h-full w-full cursor-pointer opacity-0"
          />

          {/* Visual thumb */}
          <span
            aria-hidden="true"
            className={`pointer-events-none absolute top-1/2 z-10 flex size-5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 bg-[var(--surface-1)] shadow-sm transition-transform duration-150 peer-focus-visible:ring-2 peer-focus-visible:ring-player-400 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-[var(--surface-1)] ${thumbBorderColor} ${
              isDragging ? 'scale-115 shadow-md' : ''
            }`}
            style={{ left: `${fillPercent}%` }}
          >
            <span className={`size-2 rounded-full transition-colors duration-150 ${trackBarColor}`} />
          </span>
        </div>

        {/* Quiet scale anchors */}
        <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)] num">
          <span>0h</span>
          <span>Goal {formatSleepHours(target)}h</span>
          <span>{maxHours}h</span>
        </div>
      </div>

      {/* Inline target sleep goal editor */}
      {showGoalEditor && (
        <div className="mt-2.5 space-y-2.5 rounded-[var(--radius-control)] border border-[var(--border-subtle)] bg-[var(--surface-2)] p-3">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-label text-foreground">Target sleep goal</span>
            <span className="text-caption text-[var(--text-muted)] num">
              Partial from {formatSleepHours(minRewardHours)}h
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Target sleep goal presets">
            {SLEEP_QUICK_TARGET_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                aria-pressed={target === preset}
                onClick={() => handleSelectTarget(preset)}
                className={`num min-h-9 rounded-full px-3 text-label transition-colors active:scale-[0.96] ${
                  target === preset
                    ? 'bg-foreground text-background'
                    : 'border border-[var(--border-subtle)] bg-[var(--surface-1)] text-foreground hover:border-[var(--border-medium)]'
                }`}
              >
                {formatSleepHours(preset)}h
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center rounded-[var(--radius-control)] border border-[var(--border-medium)] bg-[var(--surface-1)]">
              <button
                type="button"
                disabled={target <= MIN_SLEEP_TARGET_HOURS}
                onClick={() => handleSelectTarget(target - 0.5)}
                aria-label="Decrease target sleep goal"
                className="flex size-10 items-center justify-center text-[var(--text-secondary)] transition-colors hover:text-foreground disabled:opacity-40"
              >
                <Minus className="size-4" />
              </button>
              <span className="num min-w-16 text-center text-label font-semibold text-foreground">
                {formatSleepHours(target)} hrs
              </span>
              <button
                type="button"
                disabled={target >= MAX_SLEEP_TARGET_HOURS}
                onClick={() => handleSelectTarget(target + 0.5)}
                aria-label="Increase target sleep goal"
                className="flex size-10 items-center justify-center text-[var(--text-secondary)] transition-colors hover:text-foreground disabled:opacity-40"
              >
                <Plus className="size-4" />
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                hapticLight();
                setShowGoalEditor(false);
              }}
              className="min-h-10 rounded-[var(--radius-control)] border border-[var(--border-medium)] bg-[var(--surface-1)] px-3.5 text-label text-foreground transition-colors hover:bg-[var(--surface-3)]"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
