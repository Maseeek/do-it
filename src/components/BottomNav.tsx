'use client';

import React from 'react';
import { CheckSquare, Flame, Shield } from 'lucide-react';
import { soundEngine } from '@/lib/sound-utils';
import { hapticLight } from '@/lib/haptic-utils';

export type TabType = 'today' | 'duel' | 'vault';

interface BottomNavProps {
  activeTab: TabType;
  onChangeTab: (tab: TabType) => void;
}

export function BottomNav({ activeTab, onChangeTab }: BottomNavProps) {
  const tabs = [
    { id: 'today' as TabType, label: 'Today', icon: CheckSquare, keyHint: '1' },
    { id: 'duel' as TabType, label: 'Duel', icon: Flame, keyHint: '2' },
    { id: 'vault' as TabType, label: 'Vault', icon: Shield, keyHint: '3' },
  ];

  const handleTabClick = (tabId: TabType) => {
    soundEngine.playClick();
    hapticLight();
    onChangeTab(tabId);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 pointer-events-none safe-area-bottom pb-3 px-4">
      <nav className="pointer-events-auto max-w-md mx-auto rounded-2xl glass-panel bg-[#0c0e13]/90 backdrop-blur-2xl border border-white/[0.1] shadow-[0_12px_32px_rgba(0,0,0,0.7)] p-1.5 transition-all">
        <div className="grid grid-cols-3 gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                className={`group relative flex flex-col items-center justify-center py-2 px-3 rounded-xl transition-all duration-200 focus:outline-none ${
                  isActive
                    ? 'bg-white/[0.08] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]'
                    : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.03]'
                }`}
              >
                <div className="relative">
                  <Icon
                    className={`w-4 h-4 transition-transform duration-200 group-hover:scale-110 ${
                      isActive ? 'text-white stroke-[2.4]' : 'text-zinc-400 stroke-[1.8]'
                    }`}
                  />
                  {isActive && (
                    <span className="absolute -top-1 -right-1 w-1.5 h-1.5 rounded-full bg-blue-400 shadow-[0_0_6px_#60a5fa]" />
                  )}
                </div>

                <div className="flex items-center gap-1 mt-1">
                  <span
                    className={`text-[11px] font-mono tracking-wider transition-colors ${
                      isActive ? 'font-bold text-white' : 'font-medium text-zinc-400'
                    }`}
                  >
                    {tab.label}
                  </span>
                  <span className="hidden sm:inline-block text-[9px] font-mono text-zinc-600 opacity-60">
                    [{tab.keyHint}]
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
