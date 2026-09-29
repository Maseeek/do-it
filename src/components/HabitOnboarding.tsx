'use client';

import { useEffect, useState } from 'react';
import { Check, Plus, X } from 'lucide-react';
import { useStore } from '@/lib/store';
import { balanceHabitPlan, catalogHabits, HABIT_SECTIONS, maximumHabitPoints, weeklyPointPotential } from '@/lib/habit-catalog';
import type { Habit, HabitCategory } from '@/lib/types';
import { HabitIcon } from './HabitIcon';
import { useMultiplayer } from '@/lib/multiplayer';
import { getSupabaseClient } from '@/lib/supabase';
import { rowToHabit } from '@/lib/supabase-sync';
import { canImportLegacyDatabase } from '@/lib/legacy-import';

export function HabitOnboarding({ onDone, firstRun = false }: { onDone: () => void; firstRun?: boolean }) {
  const { activePlayer, habits, applyHabitPlan } = useStore();
  const multiplayer = useMultiplayer();
  const playerId = activePlayer?.id || 'maciek';
  const existing = habits.filter(habit => habit.playerId === playerId && !habit.isArchived);
  const partnerTotal = weeklyPointPotential(habits.filter(habit => habit.playerId !== playerId));
  const [plan, setPlan] = useState<Habit[]>(() => {
    const catalog = catalogHabits(playerId);
    return [...catalog.map(habit => existing.find(item => item.id === habit.id) || habit), ...existing.filter(habit => !catalog.some(item => item.id === habit.id))];
  });
  const [customTitle, setCustomTitle] = useState('');
  const [customCategory, setCustomCategory] = useState<HabitCategory>('skills');
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

  return <main className="min-h-screen bg-black text-white px-4 py-8 lg:py-12">
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div><p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 mb-2">{firstRun ? 'Welcome to do' : 'Your habits'}</p>
          <h1 className="text-3xl font-semibold tracking-tight">Choose your habits.</h1>
          <p className="text-sm text-zinc-400 mt-2">Pick what fits your life. Suggested points are a starting weight; adjust them to match the effort.</p></div>
        {!firstRun && <button aria-label="Close habit planner" onClick={onDone} className="p-2 rounded-full bg-white/5 text-zinc-400 hover:text-white"><X size={18}/></button>}
      </div>
      {importedCount > 0 && <p role="status" className="text-xs text-emerald-300">Found {importedCount} of your previous habits. Review them below, then save to your account.</p>}

      <div className="sticky top-0 z-10 rounded-2xl border border-white/10 bg-[#1c1c1e]/95 backdrop-blur p-4 flex items-center justify-between gap-4">
        <div><div className="text-xs text-zinc-400">Weekly potential · {activeCount} habits</div><div className="text-2xl font-semibold tabular-nums">{total} <span className="text-sm text-zinc-500">pts</span></div></div>
        <div className={`text-right text-xs font-medium tabular-nums ${partnerTotal > 0 && difference === 0 ? 'text-emerald-300' : 'text-zinc-300'}`}>{partnerTotal > 0 ? <>{difference === 0 ? 'Matched' : difference > 0 ? `${difference} pts below` : `${-difference} pts above`}<span className="block text-zinc-500 font-normal">Partner: {partnerTotal} pts</span></> : <span className="text-zinc-400">You set the first total</span>}</div>
      </div>
      {partnerTotal > 0 && difference !== 0 && activeCount > 0 && <button type="button" onClick={balance} className="w-full rounded-xl border border-white/20 bg-white/[0.06] py-2.5 text-sm font-medium">Balance points for me</button>}

      {sections.filter(section => section.entries.length > 0).map(section => {
        return <section key={section.title} className="space-y-2" aria-labelledby={`section-${section.title.replaceAll(' ', '-')}`}>
          <h2 id={`section-${section.title.replaceAll(' ', '-')}`} className="text-xs font-semibold uppercase tracking-widest text-zinc-400 px-1">{section.title}</h2>
          <div className="space-y-2">{section.entries.map(habit => <div key={habit.id} className={`rounded-xl border p-3 flex items-center gap-3 ${habit.isActive ? 'border-white/20 bg-[#1c1c1e]' : 'border-white/[0.07] bg-white/[0.02]'}`}>
            <button type="button" aria-label={`${habit.isActive ? 'Remove' : 'Select'} ${habit.title}`} aria-pressed={habit.isActive} onClick={() => changeHabit(habit.id, { isActive: !habit.isActive })} className={`w-8 h-8 shrink-0 rounded-lg border flex items-center justify-center ${habit.isActive ? 'bg-white text-black border-white' : 'border-white/20 text-zinc-500'}`}>{habit.isActive ? <Check size={16}/> : <Plus size={16}/>}</button>
            <HabitIcon name={habit.iconName} className="w-4 h-4 text-zinc-400 shrink-0"/>
            <div className="min-w-0 flex-1"><div className="text-sm font-medium truncate">{habit.title}</div><div className="flex items-center gap-1.5 min-w-0"><select aria-label={`Frequency for ${habit.title}`} disabled={!habit.isActive} value={habit.weeklyTargetDays || 7} onChange={event => { const days = Number(event.target.value); changeHabit(habit.id, { weeklyTargetDays: days === 7 ? undefined : days, frequency: days === 7 ? 'daily' : 'weekly' }); }} className="max-w-20 shrink-0 bg-transparent text-[11px] text-zinc-400 disabled:opacity-60"><option value={7}>Daily</option>{[1, 2, 3, 4, 5, 6].map(days => <option key={days} value={days}>{days}×/week</option>)}</select>{habit.description && <span className="text-[11px] text-zinc-500 truncate">· {habit.description}</span>}</div></div>
            {habit.isActive && <label className="flex items-center gap-1 shrink-0 text-xs text-zinc-400"><span className="sr-only">Points for {habit.title}</span><input type="number" min={5} max={maximumHabitPoints(habit)} step={1} value={habit.points} onChange={event => changeHabit(habit.id, { points: Number(event.target.value) })} className="w-14 rounded-lg border border-white/15 bg-black px-2 py-1.5 text-right text-white tabular-nums"/><span>pts</span></label>}
          </div>)}</div>
        </section>;
      })}

      <form onSubmit={addCustom} className="rounded-2xl border border-white/10 bg-[#1c1c1e] p-4 space-y-3">
        <h2 className="text-sm font-semibold">Add your own</h2>
        <div className="flex gap-2"><input aria-label="New habit name" value={customTitle} onChange={event => setCustomTitle(event.target.value)} maxLength={70} placeholder="A habit that matters to you" className="min-w-0 flex-1 rounded-xl border border-white/15 bg-black px-3 py-2 text-sm"/><button className="rounded-xl bg-white/10 px-3 text-sm font-medium">Add</button></div>
        <select aria-label="New habit category" value={customCategory} onChange={event => setCustomCategory(event.target.value as HabitCategory)} className="rounded-lg bg-black border border-white/15 px-2 py-1 text-xs text-zinc-300">{HABIT_SECTIONS.flatMap(section => section.categories).map(category => <option key={category} value={category}>{category.replaceAll('_', ' ')}</option>)}</select>
      </form>

      <div className="pb-8 space-y-3">{error && <p role="alert" className="text-sm text-red-300">{error}</p>}
        <button onClick={() => void save()} disabled={saving || checkingPrevious || activeCount === 0 || (partnerTotal > 0 && difference !== 0)} className="w-full rounded-xl bg-white py-3 text-sm font-semibold text-black disabled:opacity-40">{checkingPrevious ? 'Checking previous habits…' : saving ? 'Saving your plan…' : firstRun ? 'Start with these habits' : 'Save habit plan'}</button>
        <p className="text-center text-xs text-zinc-500">Daily habits count seven times; weekly habits count their target sessions. {partnerTotal > 0 ? 'Match your partner’s weekly potential.' : 'Your partner will match the weekly potential you choose.'} Past check-ins stay in your history.</p>
      </div>
    </div>
  </main>;
}
