'use client';

import { CheckCircle2, Flame, ChartNoAxesColumn } from 'lucide-react';
import { TabType } from './BottomNav';
import { DoLogo } from './DoLogo';

export function DesktopSidebar({ activeTab, onChangeTab }: { activeTab: TabType; onChangeTab: (tab: TabType) => void }) {
  const tabs = [\
    { id: 'today' as const, label: 'Today', icon: CheckCircle2 },
    { id: 'duel' as const, label: 'Duel', icon: Flame },
    { id: 'progress' as const, label: 'Progress', icon: ChartNoAxesColumn },
  ];
  return (
    <aside className="hidden lg:flex fixed inset-y-0 left-0 w-60 border-r border-black/[0.07] dark:border-white/[0.07] bg-white dark:bg-[#0b0c0e] flex-col p-6 z-40 transition-colors">
      <div className="flex items-center gap-3 mb-12">
        <DoLogo size="sm" />
        <span className="text-base font-semibold tracking-tight text-foreground">do it.</span>
      </div>
      <nav aria-label="Desktop navigation" className="space-y-2">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => onChangeTab(id)}
            aria-current={activeTab === id ? 'page' : undefined}
            className={`w-full min-h-11 flex items-center gap-3 p-3 rounded-xl text-left transition-all ${
              activeTab === id
                ? 'bg-black/[0.06] dark:bg-white/[0.08] text-foreground font-semibold shadow-xs'
                : 'text-zinc-500 hover:bg-black/[0.03] dark:hover:bg-white/[0.04] hover:text-foreground'
            }`}
          >
            <Icon size={18} />
            <span className="text-sm font-medium">{label}</span>
          </button>
        ))}
      </nav>
    </aside>
  );
}
