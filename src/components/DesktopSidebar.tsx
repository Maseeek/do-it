'use client';

import { CheckCircle2, Flame, ChartNoAxesColumn } from 'lucide-react';
import { TabType } from './BottomNav';
import { useStore } from '@/lib/store';

export function DesktopSidebar({ activeTab, onChangeTab }: { activeTab: TabType; onChangeTab: (tab: TabType) => void }) {
  const { activePlayer, activePlayerSummary } = useStore();
  const tabs = [
    { id: 'today' as const, label: 'Today', icon: CheckCircle2, shortcut: '1' },
    { id: 'duel' as const, label: 'Duel', icon: Flame, shortcut: '2' },
    { id: 'progress' as const, label: 'Progress', icon: ChartNoAxesColumn, shortcut: '3' },
  ];
  return (
    <aside className="hidden lg:flex fixed inset-y-0 left-0 w-60 border-r border-black/[0.07] dark:border-zinc-800/80 bg-white dark:bg-[#0b0c0e] flex-col p-5 z-40 transition-colors">
      <nav aria-label="Desktop navigation" className="space-y-1">
        {tabs.map(({ id, label, icon: Icon, shortcut }) => (
          <button
            key={id}
            onClick={() => onChangeTab(id)}
            aria-current={activeTab === id ? 'page' : undefined}
            className={`w-full min-h-10 flex items-center justify-between gap-3 px-3 py-2 rounded-lg text-left transition-colors border ${
              activeTab === id
                ? 'bg-player-500/15 border-player-500/30 text-player-400 font-semibold shadow-xs'
                : 'border-transparent text-zinc-500 hover:bg-black/[0.03] dark:hover:bg-zinc-900/40 hover:text-foreground'
            }`}
          >
            <span className="flex items-center gap-2.5">
              <Icon size={16} />
              <span className="text-xs font-medium">{label}</span>
            </span>
            <kbd className="text-[10px] font-mono text-zinc-500 bg-black/[0.05] dark:bg-zinc-900 px-1.5 py-0.2 rounded border border-black/10 dark:border-zinc-800">
              {shortcut}
            </kbd>
          </button>
        ))}
      </nav>
      <div className="mt-auto border-t border-black/[0.07] dark:border-zinc-800/80 pt-4 px-1">
        <p className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">
          {activePlayer?.name} · Lifetime Karma
        </p>
        <div className="flex items-baseline gap-1.5 mt-1">
          <span className="text-xl font-bold font-mono tabular-nums text-player-400">
            {activePlayerSummary.karma.toLocaleString()}
          </span>
          <span className="text-[11px] font-mono text-zinc-500">pts</span>
        </div>
      </div>
    </aside>
  );
}
