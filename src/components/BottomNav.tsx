'use client';

import React from 'react';
import { CheckSquare, Flame, Shield } from 'lucide-react';

export type TabType = 'today' | 'duel' | 'vault';

interface BottomNavProps {
  activeTab: TabType;
  onChangeTab: (tab: TabType) => void;
}

export function BottomNav({ activeTab, onChangeTab }: BottomNavProps) {
  const tabs = [
    { id: 'today' as TabType, label: 'Today', icon: CheckSquare },
    { id: 'duel' as TabType, label: 'Duel', icon: Flame },
    { id: 'vault' as TabType, label: 'Vault', icon: Shield },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#08090a]/95 backdrop-blur-xl border-t border-zinc-900/90 py-2.5 px-6 safe-area-bottom">
      <div className="max-w-md mx-auto flex items-center justify-around">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onChangeTab(tab.id)}
              className={`flex flex-col items-center gap-1.5 py-1 px-5 rounded-xl transition-all duration-200 ${
                isActive
                  ? 'text-white scale-105'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
              <span className={`text-[10px] font-mono tracking-wider ${isActive ? 'font-bold text-white' : 'font-medium'}`}>
                {tab.label}
              </span>
              {isActive && (
                <div className="w-1 h-1 rounded-full bg-white -mt-0.5 shadow-sm" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
