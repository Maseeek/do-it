'use client';

import { CheckCircle2, Flame, SlidersHorizontal, Settings, ArrowUpRight, Heart, Cloud, HardDrive } from 'lucide-react';
import { TabType } from './BottomNav';
import { DoLogo } from './DoLogo';
import { useStore } from '@/lib/store';

export function DesktopSidebar({ activeTab, onChangeTab, onOpenSettings }: { activeTab: TabType; onChangeTab: (tab: TabType) => void; onOpenSettings: () => void }) {
  const { activePlayer, activePlayerSummary, syncStatus, activeWeeklyStake } = useStore();
  const tabs = [
    { id: 'today' as const, label: 'Today', description: 'Small steps, every day', icon: CheckCircle2 },
    { id: 'duel' as const, label: 'The duel', description: 'Better together', icon: Flame },
    { id: 'vault' as const, label: 'Your vault', description: 'Progress worth keeping', icon: SlidersHorizontal },
  ];
  return (
    <aside className="hidden lg:flex fixed inset-y-0 left-0 w-60 border-r border-white/[0.07] bg-[#0b0c0e] flex-col p-6 z-40">
      <div className="flex items-center gap-3 mb-12"><DoLogo size="sm" /><div><span className="text-base font-semibold tracking-tight">do it.</span><p className="text-[10px] text-zinc-500 mt-0.5 tracking-widest uppercase">A little, every day</p></div></div>
      <p className="text-[10px] font-semibold tracking-[0.18em] uppercase text-zinc-500 mb-3">Your space</p>
      <nav aria-label="Desktop navigation" className="space-y-2">
        {tabs.map(({ id, label, description, icon: Icon }, index) => <button key={id} onClick={() => onChangeTab(id)} aria-current={activeTab === id ? 'page' : undefined} className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-colors ${activeTab === id ? 'bg-white/[0.08] text-white' : 'text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-200'}`}><Icon size={18}/><div className="flex-1"><div className="text-sm font-medium">{label}</div><div className="text-[10px] mt-0.5 text-zinc-500">{description}</div></div><span className="text-[10px] text-zinc-600 font-mono">{index + 1}</span></button>)}
      </nav>
      {activeWeeklyStake && <button onClick={() => onChangeTab('duel')} className="mt-10 rounded-2xl p-4 border border-amber-300/10 bg-amber-300/[0.03] text-left hover:border-amber-300/25"><div className="flex justify-between text-amber-200/70"><Heart size={16}/><ArrowUpRight size={14}/></div><p className="text-[10px] tracking-wider uppercase text-zinc-500 mt-4">This week’s stake</p><p className="text-sm font-medium text-zinc-200 mt-1.5">{activeWeeklyStake.title}</p></button>}
      <div className="mt-auto space-y-5">
        <div className="border-t border-white/[0.07] pt-5"><p className="text-[11px] text-zinc-500">Keep showing up, {activePlayer?.name}.</p><div className="flex items-baseline gap-1.5 mt-2"><span className="text-2xl font-semibold tabular-nums">{activePlayerSummary.karma.toLocaleString()}</span><span className="text-xs text-zinc-500">lifetime karma</span></div></div>
        <button onClick={onOpenSettings} className="flex items-center gap-2 text-xs text-zinc-400 hover:text-white"><Settings size={15}/>Settings</button>
        <div className="flex items-center gap-2 text-[10px] text-zinc-500">{syncStatus === 'connected' ? <Cloud size={13} className="text-emerald-400"/> : <HardDrive size={13}/>}<span>{syncStatus === 'connected' ? 'Cloud connected' : syncStatus === 'syncing' ? 'Connecting to cloud…' : syncStatus === 'offline' ? 'Cloud unavailable' : 'Saved on this device'}</span></div>
      </div>
    </aside>
  );
}
