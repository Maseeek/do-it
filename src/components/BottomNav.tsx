'use client';

import React from 'react';
import { CheckCircle2, Flame, ChartNoAxesColumn } from 'lucide-react';

import { soundEngine } from '@/lib/sound-utils';
import { hapticLight } from '@/lib/haptic-utils';

export type TabType = 'today' | 'duel' | 'progress';

interface BottomNavProps {
  activeTab: TabType;
  onChangeTab: (tab: TabType) => void;
  onWarmTab?: (tab: TabType) => void;
}

export function BottomNav({ activeTab, onChangeTab, onWarmTab }: BottomNavProps) {
  const tabs = [
    { id: 'today' as TabType, label: 'Today', icon: CheckCircle2 },
    { id: 'duel' as TabType, label: 'Duel', icon: Flame },
    { id: 'progress' as TabType, label: 'Progress', icon: ChartNoAxesColumn },
  ];

  const handleTabClick = (tabId: TabType) => {
    if (activeTab !== tabId) {
      soundEngine.playClick();
      hapticLight();
      onChangeTab(tabId);
    }
  };

  return (
    <nav
      aria-label="Main navigation"
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-[var(--border-subtle)] bg-[#f6f7fa]/90 px-4 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur-2xl transition-colors dark:bg-[#08090a]/90"
    >
      <div className="mx-auto grid max-w-md grid-cols-3">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              onPointerEnter={() => onWarmTab?.(tab.id)}
              onFocus={() => onWarmTab?.(tab.id)}
              aria-label={tab.label}
              aria-current={isActive ? 'page' : undefined}
              className={`group flex min-h-12 flex-col items-center justify-center gap-1 rounded-[var(--radius-control)] transition-colors ${
                isActive ? 'text-player-600 dark:text-player-300' : 'text-[var(--text-muted)] hover:text-foreground'
              }`}
            >
              <span
                className={`flex h-7 w-14 items-center justify-center rounded-full transition-[background-color,transform] group-active:scale-95 ${
                  isActive ? 'bg-player-500/15' : ''
                }`}
              >
                <Icon className="size-5" strokeWidth={isActive ? 2.25 : 1.75} aria-hidden="true" />
              </span>
              <span className={`text-caption ${isActive ? 'font-semibold' : 'font-medium'}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
