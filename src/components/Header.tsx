'use client';

import React from 'react';
import { useStore } from '@/lib/store';
import { formatFriendlyDate, getTodayDateString } from '@/lib/date-utils';
import { ArrowLeftRight, Cloud, Flame, Settings } from 'lucide-react';

export function Header({ onOpenSettings }: { onOpenSettings: () => void }) {
  const { activePlayer, activePlayerSummary, syncStatus, selectProfile } = useStore();
  const todayStr = getTodayDateString();
  const friendlyDate = formatFriendlyDate(todayStr);

  const dailyPar = 240;
  const pct = Math.min(100, Math.round((activePlayerSummary.today / dailyPar) * 100));

  const isMaciek = activePlayer?.id === 'maciek';

  return (
    <header className="sticky top-0 z-40 bg-[#08090a]/90 backdrop-blur-md border-b border-zinc-900/80 px-4 py-3">
      <div className="max-w-md mx-auto flex items-center justify-between">
        {/* Left: Player + Date + Sync Status */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => selectProfile(isMaciek ? 'myrna' : 'maciek')}
            title={`Switch player to ${isMaciek ? 'Myrna' : 'Maciek'}`}
            className={`group relative w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold border transition-all hover:scale-105 active:scale-95 focus:outline-none ${
              isMaciek
                ? 'bg-blue-500/10 border-blue-500/30 text-blue-400 hover:border-blue-400 hover:bg-blue-500/20'
                : 'bg-pink-500/10 border-pink-500/30 text-pink-400 hover:border-pink-400 hover:bg-pink-500/20'
            }`}
          >
            <span>{activePlayer?.name.charAt(0) || 'D'}</span>
            <span className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-zinc-900 border border-zinc-700 flex items-center justify-center text-[7px] text-zinc-400 group-hover:text-white transition-colors">
              <ArrowLeftRight className="w-1.5 h-1.5" />
            </span>
          </button>

          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-white tracking-tight">
                {activePlayer?.name}
              </span>
              {activePlayerSummary.currentStreak > 0 && (
                <span className="inline-flex items-center gap-0.5 text-[10px] font-mono text-amber-400 font-medium bg-amber-400/10 px-1.5 py-0.2 rounded border border-amber-400/20">
                  <Flame className="w-2.5 h-2.5" />
                  {activePlayerSummary.currentStreak}d
                </span>
              )}
              {/* Cloud Sync Status Indicator */}
              {syncStatus === 'connected' && (
                <span
                  title="Supabase Real-Time Live Sync Active"
                  className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"
                />
              )}
              {syncStatus === 'syncing' && (
                <span
                  title="Syncing with Supabase..."
                  className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping"
                />
              )}
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <p className="text-[11px] text-zinc-400 font-mono">{friendlyDate}</p>
              {syncStatus === 'connected' && (
                <span className="inline-flex items-center gap-0.5 text-[9px] font-mono text-emerald-400/80">
                  <Cloud className="w-2.5 h-2.5" />
                  Live
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right: Daily Score Bar & Settings */}
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-end">
            <div className="flex items-baseline gap-1">
              <span className="text-xs font-bold font-mono text-white tracking-tight">
                {activePlayerSummary.today}
              </span>
              <span className="text-[10px] font-mono text-zinc-400">/ {dailyPar} pts</span>
            </div>
            {/* Micro progress bar */}
            <div className="w-16 h-1 rounded-full bg-zinc-800 mt-1 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  isMaciek ? 'bg-blue-400' : 'bg-pink-400'
                }`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>

          <button
            onClick={onOpenSettings}
            aria-label="Settings"
            className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800/60 transition-colors focus:outline-none"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
