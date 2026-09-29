'use client';

import { useEffect, useRef, useState } from 'react';
import { useStore } from '@/lib/store';
import { HabitCard } from './HabitCard';
import { ProofGalleryModal } from './ProofGalleryModal';
import { DateNavigator } from './DateNavigator';
import { ActivityFeed } from './ActivityFeed';
import { BedDouble, Camera, CheckCircle2, Flame, ArrowUpRight, Sparkles } from 'lucide-react';
import { soundEngine } from '@/lib/sound-utils';
import { hapticCelebration } from '@/lib/haptic-utils';
import { fireCelebrationConfetti } from '@/lib/confetti';
import { formatFriendlyDate, parseDate } from '@/lib/date-utils';
import { useMultiplayer } from '@/lib/multiplayer';

export function TodayView() {
  const multiplayer = useMultiplayer();
  const { habits, activeHabits, isHabitSatisfiedOnDate, selectedDate, checkIns, activePlayer, activePlayerSummary, partnerId, players, partnerCleanSpaceCheckIn, partnerCleanSpaceHabit, isRestDay } = useStore();
  const [activeSubTab, setActiveSubTab] = useState<'ritual' | 'feed'>('ritual');
  const [proofIndex, setProofIndex] = useState<number | null>(null);
  const points = checkIns.filter((c) => c.playerId === activePlayer?.id && c.date === selectedDate).reduce((sum, c) => sum + c.pointsEarned, 0);
  const par = multiplayer.configured ? activeHabits.reduce((sum, habit) => sum + habit.points, 0) : 240;
  const pct = par > 0 ? Math.min(100, Math.round(points / par * 100)) : 0;
  const pending = activeHabits.filter((h) => !isHabitSatisfiedOnDate(h.id, selectedDate));
  const done = activeHabits.filter((h) => isHabitSatisfiedOnDate(h.id, selectedDate));
  const allDone = activeHabits.length > 0 && !pending.length;
  const isRest = isRestDay(selectedDate);
  const isMaciek = activePlayer?.id === 'maciek';
  const partner = partnerId ? players[partnerId] : null;
  const partnerPoints = checkIns.filter((c) => c.playerId === partnerId && c.date === selectedDate).reduce((sum, c) => sum + c.pointsEarned, 0);
  const partnerPar = multiplayer.configured ? habits.filter((h) => h.playerId === partnerId && h.isActive).reduce((sum, h) => sum + h.points, 0) : par;
  const photos = partnerCleanSpaceCheckIn?.proofUrls?.length ? partnerCleanSpaceCheckIn.proofUrls : partnerCleanSpaceCheckIn?.proofUrl ? [partnerCleanSpaceCheckIn.proofUrl] : [];
  const context = `${activePlayer?.id}:${selectedDate}`;
  const previous = useRef({ context, points, allDone });
  useEffect(() => {
    if (previous.current.context === context && ((points >= par && previous.current.points < par) || (allDone && !previous.current.allDone))) {
      soundEngine.playFanfare(); fireCelebrationConfetti(); hapticCelebration();
    }
    previous.current = { context, points, allDone };
  }, [context, points, allDone, par]);
  const circumference = 2 * Math.PI * 55;

  return <div className="space-y-6">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div><p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-medium mb-2">{parseDate(selectedDate).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</p><h1 className="text-3xl lg:text-4xl font-semibold tracking-tight">Make a little progress.</h1><p className="text-sm text-zinc-400 mt-2">Your daily rituals. A stronger you, together.</p></div>
      <div role="tablist" aria-label="Today views" className="flex rounded-xl border border-white/[0.08] bg-[#141518] p-1">
        {([{ id: 'ritual', label: 'Daily Ritual' }, { id: 'feed', label: 'Activity' }] as const).map((tab) => <button key={tab.id} role="tab" aria-selected={activeSubTab === tab.id} onClick={() => setActiveSubTab(tab.id)} className={`min-h-10 px-4 rounded-lg text-xs font-medium ${activeSubTab === tab.id ? 'bg-white/[0.1] text-white' : 'text-zinc-400'}`}>{tab.label}</button>)}
      </div>
    </div>
    {activeSubTab === 'feed' ? <div className="max-w-2xl"><ActivityFeed /></div> : <div className="grid lg:grid-cols-[minmax(240px,0.75fr)_minmax(340px,1.25fr)] gap-5 lg:gap-8 items-start">
      <div className="space-y-4 lg:sticky lg:top-24">
        <section className="rounded-2xl border border-white/[0.09] bg-[#141518] p-5 lg:p-6 overflow-hidden relative">
          <div className="flex items-center justify-between"><h2 className="text-xs font-medium text-zinc-300">{formatFriendlyDate(selectedDate)} at a glance</h2><span className={`w-1.5 h-1.5 rounded-full ${isMaciek ? 'bg-blue-400' : 'bg-pink-400'}`} /></div>
          <div className="flex items-center gap-5 py-6 lg:flex-col lg:text-center">
            <div role="progressbar" aria-valuenow={Math.min(points, par)} aria-valuemin={0} aria-valuemax={Math.max(1, par)} aria-label={`${points} of ${par} daily par points`} className="relative w-36 h-36 shrink-0 flex items-center justify-center">
              <svg viewBox="0 0 128 128" className="absolute inset-0 -rotate-90" aria-hidden="true"><circle cx="64" cy="64" r="55" fill="none" stroke="white" strokeOpacity=".06" strokeWidth="7"/><circle cx="64" cy="64" r="55" fill="none" stroke="currentColor" strokeWidth="7" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={circumference * (1 - pct / 100)} className={`transition-all duration-700 ${par > 0 && pct >= 100 ? 'text-emerald-400' : isMaciek ? 'text-blue-400' : 'text-pink-400'}`}/></svg><div><p className="text-4xl font-semibold tracking-tight tabular-nums">{points}</p><p className="text-[10px] text-zinc-500 mt-1">of {par} points</p></div>
            </div>
            <div><p className="text-base font-medium">{allDone ? 'You showed up. All done.' : isRest ? 'Room to recharge.' : points === 0 ? 'A fresh start.' : pct >= 100 ? 'Daily par, achieved.' : 'Keep your momentum.'}</p><p className="text-xs text-zinc-500 mt-1.5">{done.length} of {activeHabits.length} rituals complete</p></div>
          </div>
          <div className="grid grid-cols-2 border-t border-white/[0.07] pt-4 gap-3"><div><p className="text-[10px] text-zinc-500 uppercase tracking-wider">Current streak</p><p className="mt-1 text-sm font-semibold flex items-center gap-1.5"><Flame size={14} className="text-amber-400"/>{activePlayerSummary.currentStreak} days</p></div><div><p className="text-[10px] text-zinc-500 uppercase tracking-wider">To daily par</p><p className="mt-1 text-sm font-semibold tabular-nums">{Math.max(0, par - points)} <span className="font-normal text-zinc-500">points</span></p></div></div>
        </section>
        {isRest && <div className="rounded-xl border border-indigo-400/20 bg-indigo-400/[0.06] p-4 flex items-center gap-3 text-indigo-200"><BedDouble size={19}/><div><p className="text-xs font-medium">Rest & recovery day</p><p className="text-[11px] opacity-60 mt-1">Your streak is protected.</p></div></div>}
        {partner && <section className="rounded-2xl border border-white/[0.08] p-5 bg-[#101113]"><div className="flex justify-between items-center"><div className="flex items-center gap-2 text-xs font-medium"><span className={`w-7 h-7 rounded-full flex items-center justify-center ${isMaciek ? 'bg-pink-400/10 text-pink-300' : 'bg-blue-400/10 text-blue-300'}`}>{partner.name[0]}</span>{partner.name}&apos;s day</div><span className="text-xs text-zinc-400 tabular-nums">{partnerPoints} pts</span></div><div className="h-1 rounded-full bg-white/[0.06] my-4 overflow-hidden"><div style={{ width: `${partnerPar > 0 ? Math.min(100, partnerPoints / partnerPar * 100) : 0}%` }} className={`h-full rounded-full ${isMaciek ? 'bg-pink-400' : 'bg-blue-400'}`}/></div><div className="flex items-center justify-between text-[11px] text-zinc-500"><span className="flex gap-1.5 items-center"><Camera size={13}/>Clean space proof</span><span className={photos.length ? 'text-emerald-400' : ''}>{photos.length ? 'Added' : partnerCleanSpaceCheckIn ? 'Checked in' : 'Not yet'}</span></div>{photos.length > 0 && <button onClick={() => setProofIndex(0)} className="control mt-3 w-full">View proof <ArrowUpRight size={14}/></button>}</section>}
        <p className="hidden lg:block text-[11px] text-zinc-600 leading-relaxed px-1">Consistency beats perfection. Weekly habits count toward your target across the whole week.</p>
      </div>
      <div className="space-y-5 min-w-0">
        <DateNavigator />
        <div><div className="flex justify-between items-center mb-3"><h2 className="text-xs font-semibold text-zinc-300">Your rituals</h2><span className="text-[11px] text-zinc-500">{pending.length} remaining</span></div><div className="space-y-2">{pending.map((habit) => <HabitCard key={`${context}:${habit.id}`} habit={habit}/>)}</div></div>
        {allDone && <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/[0.05] p-5 flex items-center gap-3 text-emerald-300"><CheckCircle2 size={22}/><div><p className="text-sm font-medium">A day well done.</p><p className="text-xs opacity-70 mt-1">Every small effort adds up.</p></div></div>}
        {!!done.length && <div><h2 className="text-[10px] text-zinc-500 uppercase tracking-wider mb-3">Completed ? {done.length}</h2><div className="space-y-2">{done.map((habit) => <HabitCard key={`${context}:${habit.id}`} habit={habit}/>)}</div></div>}
        {!activeHabits.length && <div className="settings-panel text-center py-10"><Sparkles size={28} className="mx-auto mb-3 text-zinc-500"/><h2>Your next chapter starts here.</h2><p>Add a habit in Vault ? Habits to start your daily ritual.</p></div>}
      </div>
    </div>}
    {proofIndex !== null && partner && photos.length > 0 && <ProofGalleryModal isOpen onClose={() => setProofIndex(null)} playerName={partner.name} playerAvatar={partner.avatar} habitTitle={partnerCleanSpaceHabit?.title || 'Clean Space'} images={photos} date={partnerCleanSpaceCheckIn?.date} completedAt={partnerCleanSpaceCheckIn?.completedAt} initialIndex={proofIndex}/>}
  </div>;
}
