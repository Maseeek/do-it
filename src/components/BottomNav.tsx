'use client';

import React from 'react';
import { CheckCircle2, Flame, ChartNoAxesColumn } from 'lucide-react';

import { soundEngine } from '@/lib/sound-utils';
import { hapticLight } from '@/lib/haptic-utils';

export type TabType = 'today' | 'duel' | 'progress';

interface BottomNavProps {
  activeTab: TabType;
  onChangeTab: (tab: TabType) => void;
}

export function BottomNav({ activeTab, onChangeTab }: BottomNavProps) {
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
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#08090a]/90 backdrop-blur-2xl border-t border-zinc-800/80 py-1.5 px-6 safe-area-bottom"
    >
      <div className="max-w-md mx-auto flex items-center justify-around gap-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              aria-label={tab.label}
              aria-current={isActive ? 'page' : undefined}
              className={`flex min-h-11 min-w-16 flex-col items-center justify-center gap-1 py-1 px-3 rounded-lg transition-all active:scale-95 ${
                isActive
                  ? 'bg-zinc-900/80 text-white'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'stroke-[2.2]' : 'stroke-[1.75]'}`} />
              <span className={`text-[10px] font-mono tracking-tight ${isActive ? 'font-semibold text-white' : 'font-medium'}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
