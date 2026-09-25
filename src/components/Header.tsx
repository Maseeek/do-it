'use client';

import React from 'react';
import { useStore } from '@/lib/store';
import { formatFriendlyDate, getTodayDateString } from '@/lib/date-utils';
import { ArrowLeftRight, CheckCircle2, Cloud, Flame, Settings, Volume2, VolumeX } from 'lucide-react';

export function Header({ onOpenSettings }: { onOpenSettings: () => void }) {
  const {
    activePlayer,
    activePlayerSummary,
    syncStatus,
    selectProfile,
    soundEnabled,
    setSoundEnabled,
  } = useStore();

  const todayStr = getTodayDateString();
  const friendlyDate = formatFriendlyDate(todayStr);

  const dailyPar = 240;
  const pct = Math.min(100, Math.round((activePlayerSummary.today / dailyPar) * 100));
  const isParComplete = activePlayerSummary.today >= dailyPar;

  const isMaciek = activePlayer?.id === 'maciek';
  const partnerName = isMaciek ? 'Myrna' : 'Maciek';
  const partnerId = isMaciek ? 'myrna' : 'maciek';

  return (
    <header className="sticky top-0 z-40 glass-panel border-b border-white/[0.08] px-4 py-2.5 safe-area-top transition-colors">
      <div className="max-w-md mx-auto flex items-center justify-between">
        {/* Left: Interactive Character / Player Switcher Badge */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => selectProfile(partnerId)}
            title={`Switch active player to ${partnerName} (or press 'P')`}
            className={`group relative flex items-center gap-2 pl-1.5 pr-2.5 py-1 rounded-xl border text-xs font-medium transition-all duration-200 active:scale-95 focus:outline-none ${
              isMaciek
                ? 'bg-blue-500/10 border-blue-500/30 text-blue-300 hover:border-blue-400/60 hover:bg-blue-500/20 shadow-[0_0_12px_rgba(59,130,246,0.15)]'
                : 'bg-pink-500/10 border-pink-500/30 text-pink-300 hover:border-pink-400/60 hover:bg-pink-500/20 shadow-[0_0_12px_rgba(236,72,153,0.15)]'
            }`}
          >
            <div
              className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold font-mono transition-transform duration-200 group-hover:scale-105 ${
                isMaciek ? 'bg-blue-500 text-white' : 'bg-pink-500 text-white'
              }`}
            >
              {activePlayer?.name.charAt(0) || 'D'}
            </div>

            <div className="flex flex-col items-start leading-tight">
              <span className="font-semibold tracking-tight text-white flex items-center gap-1">
                {activePlayer?.name}
                <ArrowLeftRight className="w-2.5 h-2.5 text-zinc-400 group-hover:text-white transition-colors opacity-70 group-hover:opacity-100" />
              </span>
              <span className="text-[10px] font-mono text-zinc-400 group-hover:text-zinc-300">
                {friendlyDate.split(',')[0]}
              </span>
            </div>
          </button>

          {/* Streak Badge with Flame Pulse */}
          {activePlayerSummary.currentStreak > 0 && (
            <div
              className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/25 shadow-[0_0_8px_rgba(245,158,11,0.12)]"
              title={`${activePlayerSummary.currentStreak}-day habit streak`}
            >
              <Flame className="w-3 h-3 text-amber-400 animate-flame-pulse" />
              <span>{activePlayerSummary.currentStreak}d</span>
            </div>
          )}

          {/* Real-time Cloud Sync status dot */}
          {syncStatus === 'connected' && (
            <div
              className="flex items-center gap-1 text-[10px] font-mono text-emerald-400/90"
              title="Real-Time Cloud Sync connected"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399] animate-pulse" />
              <Cloud className="w-3 h-3 text-emerald-400/70" />
            </div>
          )}
        </div>

        {/* Right: Score Metric Meter + Audio Mute + Settings */}
        <div className="flex items-center gap-2">
          {/* Daily Par Progress Meter Card */}
          <div
            className={`px-2.5 py-1 rounded-xl border flex flex-col items-end transition-all ${
              isParComplete
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.15)]'
                : 'bg-zinc-900/60 border-white/[0.08]'
            }`}
          >
            <div className="flex items-baseline gap-1">
              {isParComplete && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
              <span className="text-xs font-mono font-bold tracking-tight text-white">
                {activePlayerSummary.today}
              </span>
              <span className="text-[10px] font-mono text-zinc-400">/{dailyPar}</span>
            </div>

            {/* Micro Progress Bar */}
            <div className="w-14 h-1 rounded-full bg-zinc-800/90 mt-1 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ease-out ${
                  isParComplete
                    ? 'bg-emerald-400 shadow-[0_0_6px_#34d399]'
                    : isMaciek
                    ? 'bg-blue-400 shadow-[0_0_6px_#60a5fa]'
                    : 'bg-pink-400 shadow-[0_0_6px_#f472b6]'
                }`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>

          {/* Sound FX Toggle Button */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            aria-label={soundEnabled ? 'Mute sound effects' : 'Enable sound effects'}
            title={soundEnabled ? 'Mute synthesized sound effects' : 'Enable synthesized sound effects'}
            className="p-1.5 rounded-xl border border-white/[0.06] bg-zinc-900/40 text-zinc-400 hover:text-white hover:border-white/20 transition-all focus:outline-none"
          >
            {soundEnabled ? (
              <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <VolumeX className="w-3.5 h-3.5 text-zinc-500" />
            )}
          </button>

          {/* Settings Button */}
          <button
            onClick={onOpenSettings}
            aria-label="Settings"
            title="Open Settings & Vault"
            className="p-1.5 rounded-xl border border-white/[0.06] bg-zinc-900/40 text-zinc-400 hover:text-white hover:border-white/20 transition-all focus:outline-none hover:rotate-45 duration-300"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
}
