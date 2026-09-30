'use client';

import { useState } from 'react';
import { Pencil, ChevronRight } from 'lucide-react';
import { useStore } from '@/lib/store';
import { HabitOnboarding } from './HabitOnboarding';
import { HabitIcon } from './HabitIcon';
import { getTodayDateString } from '@/lib/date-utils';

export function ProgressView({ openPlanner = false }: { openPlanner?: boolean }) {
  const { activePlayerId, activeHabits, activePlayerSummary, checkIns, updateHabit } = useStore();
  const [planner, setPlanner] = useState(openPlanner);
  if (planner) return <HabitOnboarding onDone={() => setPlanner(false)} />;
  const days = Array.from({ length: 7 }, (_, i) => { const day = new Date(`${getTodayDateString()}T12:00:00`); day.setDate(day.getDate() - (6 - i)); const year = day.getFullYear(); const month = String(day.getMonth() + 1).padStart(2, '0'); const date = String(day.getDate()).padStart(2, '0'); return `${year}-${month}-${date}`; });
  const totals = days.map(date => checkIns.filter(item => item.playerId === activePlayerId && item.date === date).reduce((sum, item) => sum + item.pointsEarned, 0));
  const max = Math.max(1, ...totals);
  return <div className="mx-auto max-w-2xl space-y-6">
    <div className="flex items-center justify-between"><h1 className="text-3xl font-semibold tracking-tight">Progress</h1><button className="control min-h-11" onClick={() => setPlanner(true)}><Pencil size={15}/>Edit plan</button></div>
    <div className="grid grid-cols-2 gap-3"><div className="rounded-2xl border border-white/[0.08] bg-[#17181b] p-4"><div className="text-2xl font-semibold">{activePlayerSummary.currentStreak}</div><div className="text-xs text-zinc-400">Day streak</div></div><div className="rounded-2xl border border-white/[0.08] bg-[#17181b] p-4"><div className="text-2xl font-semibold">{activePlayerSummary.completionRateWeekly}%</div><div className="text-xs text-zinc-400">This week</div></div></div>
    <section className="rounded-2xl border border-white/[0.08] bg-[#17181b] p-4"><h2 className="text-sm font-semibold">Last 7 days</h2><div className="mt-4 flex h-24 items-end justify-between gap-2">{days.map((date, i) => <div key={date} className="flex flex-1 flex-col items-center gap-1"><div title={`${totals[i]} points`} className="w-full max-w-10 rounded-t-md bg-emerald-400/70" style={{ height: `${Math.max(3, totals[i] / max * 72)}px` }}/><span className="text-[10px] text-zinc-500">{new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { weekday: 'short' }).slice(0, 2)}</span></div>)}</div></section>
    <section><div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-semibold">Your habits</h2><button onClick={() => setPlanner(true)} className="flex min-h-11 items-center gap-1 text-xs text-zinc-400 hover:text-white">Manage <ChevronRight size={14}/></button></div><div className="space-y-2">{activeHabits.map(habit => <div key={habit.id} className="flex min-h-14 items-center gap-3 rounded-xl border border-white/[0.07] bg-[#17181b] px-3"><HabitIcon name={habit.iconName} className="size-4 text-zinc-400"/><span className="flex-1 text-sm">{habit.title}</span>{habit.automation?.metric === 'steps' ? <select aria-label="Step goal" className="rounded-lg bg-zinc-800 p-2 text-xs" value={habit.automation.target} onChange={event => updateHabit({ ...habit, automation: { metric: 'steps', target: Number(event.target.value) } })}>{[6000, 10000, 14000].map(target => <option key={target} value={target}>{target.toLocaleString()} steps</option>)}</select> : habit.automation ? <span className="text-[11px] text-emerald-300">Auto</span> : null}</div>)}</div></section>
  </div>;
}
