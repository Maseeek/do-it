'use client';

import React from 'react';
import { CheckCircle2, Flame, SlidersHorizontal } from 'lucide-react';

export type TabType = 'today' | 'duel' | 'vault';

interface BottomNavProps {
  activeTab: TabType;
  onChangeTab: (tab: TabType) => void;
}

export function BottomNav({ activeTab, onChangeTab }: BottomNavProps) {
  const tabs = [
    { id: 'today' as TabType, label: 'Today', icon: CheckCircle2 },
    { id: 'duel' as TabType, label: 'Duel', icon: Flame },
    { id: 'vault' as TabType, label: 'Vault', icon: SlidersHorizontal },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-black/85 backdrop-blur-2xl border-t border-white/[0.08] py-2 px-6 safe-area-bottom">
      <div className="max-w-md mx-auto flex items-center justify-around">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onChangeTab(tab.id)}
              className={`flex flex-col items-center gap-1 py-1 px-5 rounded-2xl transition-all active:scale-95 ${
                isActive
                  ? 'text-white'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
              <span className={`text-[10px] tracking-tight ${isActive ? 'font-semibold text-white' : 'font-medium'}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
