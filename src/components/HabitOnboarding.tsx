'use client';

import { useEffect, useState } from 'react';
import { Check, Plus, X } from 'lucide-react';
import { useStore } from '@/lib/store';
import { balanceHabitPlan, catalogHabits, categoryForSection, HABIT_SECTIONS, habitSectionTitle, maximumHabitPoints, weeklyPointPotential } from '@/lib/habit-catalog';
import type { Habit, HabitCategory } from '@/lib/types';
import { HabitIcon } from './HabitIcon';
import { useMultiplayer } from '@/lib/multiplayer';
import { getSupabaseClient } from '@/lib/supabase';
import { rowToHabit } from '@/lib/supabase-sync';
import { canImportLegacyDatabase } from '@/lib/legacy-import';

export function HabitOnboarding({ onDone, firstRun = false }: { onDone: () => void; firstRun?: boolean }) {
  const { activePlayer, habits, applyHabitPlan, isPartnerConnected } = useStore();
  const multiplayer = useMultiplayer();
  const playerId = activePlayer?.id || 'maciek';
  const existing = habits.filter(habit => habit.playerId === playerId && !habit.isArchived);
  const partnerTotal = isPartnerConnected ? weeklyPointPotential(habits.filter(habit => habit.playerId !== playerId)) : 0;
  const [plan, setPlan] = useState<Habit[]>(() => {
    const catalog = catalogHabits(playerId);
    return [...catalog.map(habit => existing.find(item => item.id === habit.id) || habit), ...existing.filter(habit => !catalog.some(item => item.id === habit.id))];
  });
  const [customTitle, setCustomTitle] = useState('');
  const [showMore, setShowMore] = useState(false);
  const [customCategory, setCustomCategory] = useState<HabitCategory>('other');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [checkingPrevious, setCheckingPrevious] = useState(firstRun);
  const [importedCount, setImportedCount] = useState(0);

  useEffect(() => {
    if (!firstRun || existing.length > 0) return;
    let cancelled = false;
    const client = getSupabaseClient();
    if (!client || !canImportLegacyDatabase(playerId, multiplayer.user?.email)) {
      setCheckingPrevious(false);
      return;
    }
    void client.from('habits').select('*').eq('player_id', playerId).then(({ data, error }) => {
      if (cancelled) return;
      if (error) {
        setError('Could not read your previous Supabase habits. You can import them from Settings after connecting.');
      } else if (data?.length) {
        const saved = data.map(rowToHabit);
        setPlan(current => {
          const ids = new Set(saved.map(habit => habit.id));
          return [...saved, ...current.filter(habit => !ids.has(habit.id)).map(habit => ({ ...habit, isActive: false }))];
        });
        setImportedCount(saved.length);
      }
      setCheckingPrevious(false);
    });
    return () => { cancelled = true; };
  }, [firstRun, playerId, multiplayer.user?.email, existing.length]);
  const total = weeklyPointPotential(plan);
  const difference = partnerTotal - total;
  const activeCount = plan.filter(habit => habit.isActive).length;
  const catalogIds = new Set(catalogHabits(playerId).map(habit => habit.id));
  const sections = [
    { title: 'Your habits', entries: plan.filter(habit => !catalogIds.has(habit.id)) },
    ...HABIT_SECTIONS.map(section => ({ title: section.title, entries: plan.filter(habit => catalogIds.has(habit.id) && section.categories.includes(habit.category)) })),
  ];
  const starterTitles = new Set(['Sleep 8 hours', 'Step goal', 'Workout', 'Cardio session', 'Move your body', 'Read for learning']);
  const visibleSections = firstRun && !showMore
    ? [{ title: 'Start here', entries: plan.filter(habit => habit.isActive || starterTitles.has(habit.title)) }]
    : sections;

  function changeHabit(id: string, changes: Partial<Habit>) {
    setError(null);
    setPlan(current => current.map(habit => habit.id === id ? { ...habit, ...changes } : habit));
  }

  function balance() {
    const balanced = balanceHabitPlan(plan, partnerTotal);
    if (!balanced) {
      setError('This selection cannot reach your partner’s weekly total. Add another habit or change a weekly target in Habits.');
      return;
    }
    setPlan(balanced);
    setError(null);
  }

  function addCustom(event: React.FormEvent) {
    event.preventDefault();
    const title = customTitle.trim();
    if (!title) return;
    setPlan(current => [...current, {
      id: `habit-${crypto.randomUUID()}`, playerId, title, description: '', category: customCategory,
      points: 20, iconName: 'Activity', order: current.length + 1, isActive: true,
    }]);
    setCustomTitle('');
    setError(null);
  }

  async function save() {
    setError(null);
    setSaving(true);
    try {
      const savedIds = new Set(existing.map(habit => habit.id));
      await applyHabitPlan(plan.filter(habit => !catalogIds.has(habit.id) || habit.isActive || savedIds.has(habit.id)));
      onDone();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save your habits. Try again.');
    } finally {
      setSaving(false);
    }
  }

  const collapsed = firstRun && !showMore;
  const Root = firstRun ? 'main' : 'div';
  const saveDisabled = saving || checkingPrevious || activeCount === 0 || (partnerTotal > 0 && difference !== 0);
  const saveLabel = checkingPrevious ? 'Checking previous habits…' : saving ? 'Saving your plan…' : firstRun ? 'Start with these habits' : 'Save habit plan';

  return (
    <Root className={firstRun ? 'relative z-10 min-h-dvh bg-background text-foreground px-4 pt-10 lg:pt-16 transition-colors' : 'w-full text-foreground'}>
      <div className="mx-auto max-w-xl flex flex-col gap-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className={`${firstRun ? 'text-display' : 'text-title-lg'} text-foreground`}>
              Choose your habits.
            </h1>
            <p className="text-body text-secondary mt-2">
              Start with one habit. You can add more later.
            </p>
          </div>
          {!firstRun && (
            <button
              aria-label="Close habit planner"
              onClick={onDone}
              className="-mr-1 flex size-11 shrink-0 items-center justify-center rounded-full bg-[var(--surface-2)] text-secondary hover:text-foreground transition-colors"
            >
              <X size={18} />
            </button>
          )}
        </div>
        {importedCount > 0 && (
          <p role="status" className="text-label text-emerald-600 dark:text-emerald-400">
            Found {importedCount} of your previous habits. Review them below, then save to your account.
          </p>
        )}

        {(!firstRun || partnerTotal > 0) && (
          <div className="sticky top-2 z-10 flex items-center justify-between gap-4 rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-1)]/95 px-4 py-3 shadow-sm backdrop-blur">
            <div>
              <div className="text-caption text-muted">Weekly potential · {activeCount} habits</div>
              <div className="text-title num text-foreground">{total} <span className="text-label font-normal text-muted">pts</span></div>
            </div>
            <div className={`text-right text-label num ${partnerTotal > 0 && difference === 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-secondary'}`}>
              {partnerTotal > 0 ? (
                <>
                  {difference === 0 ? 'Matched' : difference > 0 ? `${difference} pts below` : `${-difference} pts above`}
                  <span className="block text-caption text-muted">Partner: {partnerTotal} pts</span>
                </>
              ) : (
                <span>You set the first total</span>
              )}
            </div>
          </div>
        )}
        {partnerTotal > 0 && difference !== 0 && activeCount > 0 && (
          <button type="button" onClick={balance} className="control w-full">
            Balance points for me
          </button>
        )}

        {visibleSections.filter(section => section.entries.length > 0).map(section => {
          const headingId = `section-${section.title.replaceAll(' ', '-')}`;
          return (
            <section key={section.title} aria-labelledby={headingId}>
              <h2 id={headingId} className={collapsed ? 'sr-only' : 'mb-2 px-1 text-eyebrow text-muted'}>
                {section.title}
              </h2>
              <ul className="surface overflow-hidden divide-y divide-[var(--border-subtle)]">
                {section.entries.map(habit => (
                  <li key={habit.id}>
                    <button
                      type="button"
                      aria-label={`${habit.isActive ? 'Remove' : 'Select'} ${habit.title}`}
                      aria-pressed={habit.isActive}
                      onClick={() => changeHabit(habit.id, { isActive: !habit.isActive })}
                      className="flex min-h-16 w-full items-center gap-3 px-4 py-3 text-left hover:bg-[var(--surface-2)]/50 transition-colors"
                    >
                      <span
                        aria-hidden="true"
                        className={`flex size-10 shrink-0 items-center justify-center rounded-full transition-colors ${
                          habit.isActive ? 'bg-player-500/15 text-player-400' : 'bg-[var(--surface-2)] text-secondary'
                        }`}
                      >
                        <HabitIcon name={habit.iconName} className="size-5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-body font-medium text-foreground">{habit.title}</span>
                        {habit.description && <span className="block truncate text-caption text-muted">{habit.description}</span>}
                      </span>
                      <span
                        aria-hidden="true"
                        className={`flex size-7 shrink-0 items-center justify-center rounded-full border transition-colors ${
                          habit.isActive
                            ? 'border-transparent bg-foreground text-background'
                            : 'border-[var(--border-strong)] text-muted'
                        }`}
                      >
                        {habit.isActive ? <Check size={15} strokeWidth={2.5} /> : <Plus size={15} />}
                      </span>
                    </button>

                    {habit.isActive && (!firstRun || habit.automation?.metric === 'steps') && (
                      <div className="-mt-1 flex flex-wrap items-center gap-2 pb-3 pl-[4.25rem] pr-4">
                        {!firstRun && (
                          <select
                            aria-label={`Frequency for ${habit.title}`}
                            disabled={!habit.isActive}
                            value={habit.weeklyTargetDays || 7}
                            onChange={event => {
                              const days = Number(event.target.value);
                              changeHabit(habit.id, { weeklyTargetDays: days === 7 ? undefined : days, frequency: days === 7 ? 'daily' : 'weekly' });
                            }}
                            className="min-h-11 rounded-[var(--radius-control)] border border-[var(--border-subtle)] bg-[var(--surface-2)] px-2.5 text-label text-foreground disabled:opacity-60"
                          >
                            <option value={7}>Daily</option>
                            {[1, 2, 3, 4, 5, 6].map(days => <option key={days} value={days}>{days}×/week</option>)}
                          </select>
                        )}
                        {!firstRun && (
                          <label className="flex items-center gap-1.5 text-label text-secondary">
                            <span className="sr-only">Points for {habit.title}</span>
                            <input
                              type="number"
                              min={5}
                              max={maximumHabitPoints(habit)}
                              step={1}
                              value={habit.points}
                              onChange={event => changeHabit(habit.id, { points: Number(event.target.value) })}
                              className="min-h-11 w-16 rounded-[var(--radius-control)] border border-[var(--border-subtle)] bg-[var(--surface-2)] px-2 text-right text-body text-foreground num"
                            />
                            <span>pts</span>
                          </label>
                        )}
                        {habit.automation?.metric === 'steps' && (
                          <div className="flex gap-1.5" role="group" aria-label="Daily step goal">
                            {[6000, 10000, 14000].map(target => (
                              <button
                                key={target}
                                type="button"
                                onClick={() => changeHabit(habit.id, { automation: { metric: 'steps', target } })}
                                aria-pressed={habit.automation?.target === target}
                                className={`min-h-11 min-w-12 rounded-full px-3 text-label num transition-colors ${habit.automation?.target === target ? 'bg-foreground text-background' : 'bg-[var(--surface-2)] text-foreground'}`}
                              >
                                {target / 1000}k
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
        {collapsed && (
          <button
            type="button"
            onClick={() => setShowMore(true)}
            className="-mt-2 flex min-h-11 items-center justify-center gap-1 self-center rounded-xl px-3 text-label text-secondary hover:text-foreground transition-colors"
          >
            <Plus size={15} /> See more habits
          </button>
        )}

        {!collapsed && (
          <form onSubmit={addCustom} className="surface surface-pad flex flex-col gap-3">
            <h2 className="text-headline text-foreground">Add your own</h2>
            <div className="flex gap-2">
              <input
                aria-label="New habit name"
                value={customTitle}
                onChange={event => setCustomTitle(event.target.value)}
                maxLength={70}
                placeholder="A habit that matters to you"
                className="field min-w-0 flex-1 outline-none focus:border-blue-500"
              />
              <button className="control shrink-0">
                Add
              </button>
            </div>
            <select
              aria-label="New habit category"
              value={habitSectionTitle(customCategory)}
              onChange={event => setCustomCategory(categoryForSection(event.target.value, customCategory))}
              className="min-h-11 self-start rounded-[var(--radius-control)] border border-[var(--border-subtle)] bg-[var(--surface-2)] px-2.5 text-label text-foreground"
            >
              {HABIT_SECTIONS.map(section => (
                <option key={section.title} value={section.title}>{section.title}</option>
              ))}
            </select>
          </form>
        )}

        <p className="px-1 text-caption text-muted">
          Daily habits count seven times; weekly habits count their target sessions. {partnerTotal > 0 ? 'Match your partner’s weekly potential.' : 'Your partner will match the weekly potential you choose.'} Past check-ins stay in your history.
        </p>

        <div className={firstRun
          ? 'sticky bottom-0 z-10 -mx-4 mt-auto flex flex-col gap-2 bg-gradient-to-t from-background from-70% to-transparent px-4 pt-6 pb-[max(1.25rem,env(safe-area-inset-bottom))]'
          : 'flex flex-col gap-2 pb-4'}
        >
          {error && <p role="alert" className="text-label text-red-600 dark:text-red-400">{error}</p>}
          <button
            onClick={() => void save()}
            disabled={saveDisabled}
            className="control control-primary w-full !min-h-13 !text-[0.9375rem]"
          >
            {saveLabel}
          </button>
        </div>
      </div>
    </Root>
  );
}
