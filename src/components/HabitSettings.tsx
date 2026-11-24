'use client';

import { useState } from 'react';
import { ListChecks, Pencil } from 'lucide-react';
import { useStore } from '@/lib/store';
import { categoryForSection, HABIT_SECTIONS, habitSectionTitle } from '@/lib/habit-catalog';
import {
  applyHabitDetails,
  HABIT_DESCRIPTION_MAX,
  HABIT_ICON_NAMES,
  HABIT_TITLE_MAX,
  habitDetails,
  habitDetailsChanged,
  type HabitDetails,
} from '@/lib/habit-details';
import { formatSleepHours, isSleepHabit, SLEEP_TARGET_OPTIONS, sleepMinimumRewardHours } from '@/lib/health-rewards';
import type { Habit } from '@/lib/types';
import { HabitIcon } from './HabitIcon';

const inputClass = 'field outline-none focus:border-player-400';

export function HabitSettings({ onChooseHabits }: { onChooseHabits?: () => void }) {
  const { activeHabits, updateHabit } = useStore();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  return (
    <section className="settings-panel flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2">
          <ListChecks size={18} className="text-secondary" /> Habits
        </h2>
        {onChooseHabits && (
          <button type="button" className="control min-h-11" onClick={onChooseHabits}>
            Points &amp; schedule
          </button>
        )}
      </div>
      <p>
        Rename or describe a habit without losing its check-ins. Points and frequency stay in your habit plan.
      </p>
      {activeHabits.length === 0 ? (
        <p className="text-xs text-zinc-400">No active habits yet.</p>
      ) : (
        <ul className="space-y-2">
          {activeHabits.map(habit => (
            <li key={habit.id}>
              {editingId === habit.id ? (
                <HabitDetailsForm
                  habit={habit}
                  onCancel={() => setEditingId(null)}
                  onSave={updated => {
                    updateHabit(updated);
                    setEditingId(null);
                    setMessage(`Saved “${updated.title}”.`);
                  }}
                />
              ) : (
                <div className="flex min-h-14 items-center gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-2)] px-3.5">
                  <HabitIcon name={habit.iconName} className="size-4 shrink-0 text-player-400" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm text-foreground">{habit.title}</div>
                    {habit.description && <div className="truncate text-[11px] text-zinc-500">{habit.description}</div>}
                  </div>
                  <button
                    type="button"
                    className="flex size-11 shrink-0 items-center justify-center rounded-xl text-zinc-400 hover:text-foreground"
                    aria-label={`Edit ${habit.title}`}
                    onClick={() => { setEditingId(habit.id); setMessage(null); }}
                  >
                    <Pencil size={15} />
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      {message && <p role="status" className="text-xs text-zinc-300">{message}</p>}
    </section>
  );
}

function HabitDetailsForm({ habit, onSave, onCancel }: { habit: Habit; onSave: (habit: Habit) => void; onCancel: () => void }) {
  const [details, setDetails] = useState<HabitDetails>(() => habitDetails(habit));
  const [error, setError] = useState<string | null>(null);
  const change = (patch: Partial<HabitDetails>) => { setDetails(current => ({ ...current, ...patch })); setError(null); };
  const idPrefix = `habit-edit-${habit.id}`;

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      onSave(applyHabitDetails(habit, details));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save this habit.');
    }
  };

  return (
    <form
      onSubmit={submit}
      onKeyDown={event => { if (event.key === 'Escape') onCancel(); }}
      className="space-y-3 rounded-xl border border-player-500/40 bg-[var(--surface-2)] p-3.5"
    >
      <div className="space-y-1">
        <label htmlFor={`${idPrefix}-title`} className="block text-xs text-zinc-400">Name</label>
        <input
          id={`${idPrefix}-title`}
          autoFocus
          value={details.title}
          maxLength={HABIT_TITLE_MAX}
          onChange={event => change({ title: event.target.value })}
          className={inputClass}
        />
      </div>
      <div className="space-y-1">
        <label htmlFor={`${idPrefix}-description`} className="block text-xs text-zinc-400">Description</label>
        <input
          id={`${idPrefix}-description`}
          value={details.description}
          maxLength={HABIT_DESCRIPTION_MAX}
          placeholder="Optional"
          onChange={event => change({ description: event.target.value })}
          className={inputClass}
        />
      </div>
      <div className="space-y-1">
        <label htmlFor={`${idPrefix}-category`} className="block text-xs text-zinc-400">Category</label>
        <select
          id={`${idPrefix}-category`}
          value={habitSectionTitle(details.category)}
          onChange={event => change({ category: categoryForSection(event.target.value, details.category) })}
          className={inputClass}
        >
          {HABIT_SECTIONS.map(section => (
            <option key={section.title} value={section.title}>{section.title}</option>
          ))}
        </select>
      </div>
      {isSleepHabit(habit) && details.sleepTarget !== undefined && (
        <div className="space-y-1">
          <label htmlFor={`${idPrefix}-sleep-target`} className="block text-xs text-zinc-400">
            Target sleep goal (partial points from {formatSleepHours(sleepMinimumRewardHours(details.sleepTarget))} hrs)
          </label>
          <select
            id={`${idPrefix}-sleep-target`}
            value={details.sleepTarget}
            onChange={event => change({ sleepTarget: Number(event.target.value) })}
            className={`${inputClass} num`}
          >
            {SLEEP_TARGET_OPTIONS.map(target => (
              <option key={target} value={target}>
                {formatSleepHours(target)} hours
              </option>
            ))}
          </select>
        </div>
      )}
      <fieldset className="space-y-1">
        <legend className="mb-1 text-xs text-zinc-400">Icon</legend>
        <div className="flex flex-wrap gap-1.5">
          {HABIT_ICON_NAMES.map(name => (
            <button
              key={name}
              type="button"
              aria-label={name}
              aria-pressed={details.iconName === name}
              onClick={() => change({ iconName: name })}
              className={`flex size-11 items-center justify-center rounded-lg border ${
                details.iconName === name
                  ? 'border-player-400 bg-player-500/15 text-player-400'
                  : 'border-black/10 dark:border-white/[0.1] text-zinc-400 hover:text-foreground'
              }`}
            >
              <HabitIcon name={name} className="size-4" />
            </button>
          ))}
        </div>
      </fieldset>
      <label className="flex min-h-11 items-center gap-2 text-xs text-zinc-300">
        <input
          type="checkbox"
          checked={details.requiresProof}
          onChange={event => change({ requiresProof: event.target.checked })}
          className="size-4 accent-current"
        />
        Require a photo to check off this habit
      </label>
      {error && <p role="alert" className="text-xs text-amber-300">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <button type="submit" className="control control-primary min-h-11" disabled={!habitDetailsChanged(habit, details)}>
          Save habit
        </button>
        <button type="button" className="control min-h-11" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}
