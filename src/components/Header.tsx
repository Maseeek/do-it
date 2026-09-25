'use client';

import React from 'react';
import { useStore } from '@/lib/store';
import { formatFriendlyDate, getTodayDateString } from '@/lib/date-utils';
import { Flame, Settings } from 'lucide-react';
import { soundEngine } from '@/lib/sound-utils';
import { hapticLight } from '@/lib/haptic-utils';

export function Header({ onOpenSettings }: { onOpenSettings: () => void }) {
  const { activePlayer, activePlayerSummary, syncStatus, selectProfile } = useStore();
  const todayStr = getTodayDateString();
  const friendlyDate = formatFriendlyDate(todayStr);

  const dailyPar = 240;
  const pct = Math.min(100, Math.round((activePlayerSummary.today / dailyPar) * 100));
  const isMaciek = activePlayer?.id === 'maciek';

  const handleProfileSwitch = () => {
    soundEngine.playClick();
    hapticLight();
    selectProfile(isMaciek ? 'myrna' : 'maciek');
  };

  // Apple Activity style circular ring parameters
  const radius = 13;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (pct / 100) * circumference;

  return (
    <header className="sticky top-0 z-40 bg-black/80 backdrop-blur-xl border-b border-white/[0.08] px-4 py-2.5 safe-area-top">
      <div className="max-w-md mx-auto flex items-center justify-between">
        {/* Left: Player Profile & Date */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleProfileSwitch}
            title={`Switch to ${isMaciek ? 'Myrna' : 'Maciek'}`}
            className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-transform active:scale-95 border ${
              isMaciek
                ? 'bg-blue-500/15 border-blue-500/30 text-blue-400 hover:border-blue-400/50'
                : 'bg-pink-500/15 border-pink-500/30 text-pink-400 hover:border-pink-400/50'
            }`}
          >
            {activePlayer?.name.charAt(0) || 'D'}
          </button>

          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-semibold text-white tracking-tight">
                {activePlayer?.name}
              </span>

              {activePlayerSummary.currentStreak > 0 && (
                <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded-full border border-amber-400/20">
                  <Flame className="w-2.5 h-2.5" />
                  {activePlayerSummary.currentStreak}d
                </span>
              )}

              {syncStatus === 'connected' && (
                <span
                  title="Cloud sync connected"
                  className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse ml-0.5"
                />
              )}
            </div>

            <p className="text-[11px] text-zinc-400 font-normal mt-0.5">
              {friendlyDate}
            </p>
          </div>
        </div>

        {/* Right: Apple Activity Ring & Settings */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-2 bg-[#1c1c1e] px-2.5 py-1 rounded-full border border-white/[0.08]">
            {/* Circular Ring */}
            <div className="relative w-7 h-7 flex items-center justify-center">
              <svg className="w-7 h-7 -rotate-90" viewBox="0 0 32 32">
                <circle
                  cx="16"
                  cy="16"
                  r={radius}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  className="text-white/[0.08]"
                />
                <circle
                  cx="16"
                  cy="16"
                  r={radius}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  className={`transition-all duration-500 ${
                    isMaciek ? 'text-blue-500' : 'text-pink-500'
                  }`}
                />
              </svg>
            </div>

            <div className="flex items-baseline gap-1 pr-1">
              <span className="text-xs font-semibold text-white tabular-nums">
                {activePlayerSummary.today}
              </span>
              <span className="text-[10px] text-zinc-400">/{dailyPar}</span>
            </div>
          </div>

          <button
            onClick={() => {
              soundEngine.playClick();
              hapticLight();
              onOpenSettings();
            }}
            aria-label="Settings"
            className="w-8 h-8 rounded-full bg-[#1c1c1e] border border-white/[0.08] text-zinc-400 hover:text-white flex items-center justify-center transition-colors active:scale-95"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
