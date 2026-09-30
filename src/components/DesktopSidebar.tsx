'use client';

import { CheckCircle2, Flame, ChartNoAxesColumn } from 'lucide-react';
import { TabType } from './BottomNav';
import { DoLogo } from './DoLogo';

export function DesktopSidebar({ activeTab, onChangeTab }: { activeTab: TabType; onChangeTab: (tab: TabType) => void }) {
  const tabs = [
    { id: 'today' as const, label: 'Today', icon: CheckCircle2 },
    { id: 'duel' as const, label: 'Duel', icon: Flame },
    { id: 'progress' as const, label: 'Progress', icon: ChartNoAxesColumn },
  ];
  return (
    <aside className="hidden lg:flex fixed inset-y-0 left-0 w-60 border-r border-white/[0.07] bg-[#0b0c0e] flex-col p-6 z-40">
      <div className="flex items-center gap-3 mb-12"><DoLogo size="sm" /><span className="text-base font-semibold tracking-tight">do it.</span></div>
      <nav aria-label="Desktop navigation" className="space-y-2">
        {tabs.map(({ id, label, icon: Icon }) => <button key={id} onClick={() => onChangeTab(id)} aria-current={activeTab === id ? 'page' : undefined} className={`w-full min-h-11 flex items-center gap-3 p-3 rounded-xl text-left transition-colors ${activeTab === id ? 'bg-white/[0.08] text-white' : 'text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-200'}`}><Icon size={18}/><span className="text-sm font-medium">{label}</span></button>)}
      </nav>
    </aside>
  );
}
