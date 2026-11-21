'use client';

import Link from 'next/link';
import { CheckCircle2, Flame, ChartNoAxesColumn, Compass } from 'lucide-react';
import { TabType } from './BottomNav';
import { useStore } from '@/lib/store';

export function DesktopSidebar({ activeTab, onChangeTab, onWarmTab }: {
  activeTab: TabType;
  onChangeTab: (tab: TabType) => void;
  onWarmTab?: (tab: TabType) => void;
}) {
  const { activePlayer, activePlayerSummary } = useStore();
  const tabs = [
    { id: 'today' as const, label: 'Today', icon: CheckCircle2, shortcut: '1' },
    { id: 'duel' as const, label: 'Duel', icon: Flame, shortcut: '2' },
    { id: 'progress' as const, label: 'Progress', icon: ChartNoAxesColumn, shortcut: '3' },
  ];
  const inviteCount = activePlayer?.inviteCount ?? 0;

  return (
    <aside className="hidden lg:flex fixed inset-y-0 left-0 z-40 w-60 flex-col border-r border-[var(--border-subtle)] bg-[var(--surface-1)] px-3 py-5 transition-colors">
      <nav aria-label="Desktop navigation" className="space-y-1">
        {tabs.map(({ id, label, icon: Icon, shortcut }) => (
          <button
            key={id}
            onClick={() => onChangeTab(id)}
            onPointerEnter={() => onWarmTab?.(id)}
            onFocus={() => onWarmTab?.(id)}
            aria-current={activeTab === id ? 'page' : undefined}
            className={`flex min-h-11 w-full items-center justify-between gap-3 rounded-[var(--radius-control)] px-3 text-left transition-colors ${
              activeTab === id
                ? 'bg-player-500/12 text-player-600 dark:text-player-300'
                : 'text-[var(--text-secondary)] hover:bg-[var(--surface-2)] hover:text-foreground'
            }`}
          >
            <span className="flex items-center gap-3">
              <Icon size={18} strokeWidth={activeTab === id ? 2.25 : 1.75} aria-hidden="true" />
              <span className={`text-body ${activeTab === id ? 'font-semibold' : 'font-medium'}`}>{label}</span>
            </span>
            <kbd className="num rounded-md bg-[var(--surface-2)] px-1.5 text-caption text-[var(--text-muted)]">
              {shortcut}
            </kbd>
          </button>
        ))}

        <div className="mt-2 border-t border-[var(--border-subtle)] pt-2">
          <Link
            href="/welcome"
            className="flex min-h-11 w-full items-center gap-3 rounded-[var(--radius-control)] px-3 text-left text-label text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-2)] hover:text-foreground"
          >
            <Compass size={18} strokeWidth={1.75} aria-hidden="true" />
            <span>Membership & Billing</span>
          </Link>
        </div>
      </nav>

      <div className="mt-auto space-y-3 border-t border-[var(--border-subtle)] px-3 pt-4">
        <div>
          <p className="truncate text-caption text-[var(--text-secondary)]">
            {activePlayer?.name} &middot; Lifetime Karma
          </p>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="num text-title text-player-600 dark:text-player-300">
              {activePlayerSummary.karma.toLocaleString()}
            </span>
            <span className="text-caption text-[var(--text-muted)]">pts</span>
          </div>
        </div>
        <div className="flex items-center justify-between text-label font-normal text-[var(--text-secondary)]">
          <span>Invites</span>
          <span className="num font-semibold text-foreground">{inviteCount}</span>
        </div>
      </div>
    </aside>
  );
}
