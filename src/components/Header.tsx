'use client';

import { Flame, Monitor, Moon, Settings, Share2, Sun } from 'lucide-react';
import { DoLogo } from './DoLogo';
import { useStore } from '@/lib/store';
import { useMultiplayer } from '@/lib/multiplayer';
import { soundEngine } from '@/lib/sound-utils';
import { hapticLight } from '@/lib/haptic-utils';
import { getPlayerColorStyles } from '@/lib/player-colors';

export function Header({ onOpenSettings, onOpenDuel }: { onOpenSettings: () => void; onOpenDuel?: () => void }) {
  const multiplayer = useMultiplayer();
  const {
    activePlayer,
    activePlayerSummary,
    activeHabits,
    isPartnerConnected,
    syncStatus,
    selectProfile,
    themePreference,
    effectiveTheme,
    toggleTheme,
  } = useStore();

  const isMaciek = activePlayer?.id === 'maciek';
  const rawPar = multiplayer.configured
    ? activeHabits.reduce((sum, habit) => sum + habit.points, 0)
    : 240;
  const dailyPar = rawPar > 0 ? rawPar : 240;
  const pct = Math.min(100, Math.round((activePlayerSummary.today / dailyPar) * 100));

  const handleProfileClick = () => {
    soundEngine.playClick();
    hapticLight();
    if (multiplayer.configured) {
      onOpenSettings();
    } else {
      selectProfile(isMaciek ? 'myrna' : 'maciek');
    }
  };

  return (
    <header className="sticky top-0 z-40 border-b border-black/[0.06] dark:border-zinc-800/80 bg-[#f6f7fa]/80 dark:bg-[#08090a]/90 px-4 py-2.5 backdrop-blur-xl safe-area-top transition-colors">
      <div className="flex w-full items-center justify-between gap-3">
        {/* Left: Brand + Player Identity + Streak & Live Status */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex lg:hidden items-center gap-2 shrink-0">
            <DoLogo size="xs" />
            <span className="text-sm font-semibold tracking-tight text-foreground">do it.</span>
          </div>

          <div className="w-[1px] h-4 bg-black/10 dark:bg-zinc-800 shrink-0 lg:hidden" />

          <button
            onClick={handleProfileClick}
            aria-label={multiplayer.configured ? 'Open profile and settings' : `Switch profile (current: ${activePlayer?.name || 'Player'})`}
            title={multiplayer.configured ? 'Open profile and settings' : 'Switch profile (Shortcut: P)'}
            className="flex items-center gap-2 min-w-0 group"
          >
            <span
              className="w-7 h-7 rounded-md flex items-center justify-center text-xs font-mono font-bold border transition-colors shrink-0 group-hover:brightness-125"
              style={activePlayer ? getPlayerColorStyles(activePlayer) : undefined}
            >
              {activePlayer?.name[0] || 'D'}
            </span>
            <span className="text-xs font-semibold text-foreground truncate">
              {activePlayer?.name}
            </span>
          </button>

          {activePlayerSummary.currentStreak > 0 && (
            <span
              className="inline-flex items-center gap-0.5 text-[10px] font-mono font-medium text-amber-500 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 shrink-0"
              title={`${activePlayerSummary.currentStreak}-day active streak`}
            >
              <Flame className="w-2.5 h-2.5" />
              {activePlayerSummary.currentStreak}d
            </span>
          )}

          {syncStatus === 'connected' && (
            <span
              title="Cloud sync connected"
              className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0"
            />
          )}
        </div>

        {/* Right: Score Telemetry + Theme & Settings Controls */}
        <div className="flex items-center gap-2 shrink-0">
          {multiplayer.configured && multiplayer.duel && !isPartnerConnected && onOpenDuel && (
            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                hapticLight();
                onOpenDuel();
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-player-500/30 bg-player-500/10 px-2.5 py-1.5 text-xs font-mono font-medium text-player-400 dark:text-player-300 hover:bg-player-500/20 transition-colors"
            >
              <Share2 size={13} />
              <span>Invite</span>
            </button>
          )}
          <div className="hidden sm:flex flex-col items-end mr-1">
            <div className="flex items-baseline gap-1 font-mono">
              <span className={`text-xs font-bold tabular-nums ${pct >= 100 ? 'text-emerald-500 dark:text-emerald-400' : 'text-foreground'}`}>
                {activePlayerSummary.today}
              </span>
              <span className="text-[10px] text-zinc-500">/ {dailyPar} pts</span>
            </div>
            <div className="w-16 h-1 rounded-full bg-black/10 dark:bg-zinc-800 mt-1 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  pct >= 100 ? 'bg-emerald-500 dark:bg-emerald-400' : 'bg-player-400'
                }`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>

          <button
            onClick={toggleTheme}
            aria-label={`Switch theme (current: ${themePreference === 'system' ? `system [${effectiveTheme}]` : themePreference})`}
            title={`Theme: ${themePreference === 'system' ? `System (${effectiveTheme})` : themePreference} (click to toggle)`}
            className="flex w-8 h-8 items-center justify-center rounded-lg border border-black/[0.08] dark:border-zinc-800 bg-black/[0.03] dark:bg-[#0e1013] text-zinc-600 dark:text-zinc-400 hover:text-foreground hover:border-black/20 dark:hover:border-zinc-700 transition-colors"
          >
            {themePreference === 'system' ? (
              <Monitor size={14} />
            ) : effectiveTheme === 'dark' ? (
              <Moon size={14} />
            ) : (
              <Sun size={14} />
            )}
          </button>

          <button
            onClick={onOpenSettings}
            aria-label="Open settings"
            title="Settings"
            className="flex w-8 h-8 items-center justify-center rounded-lg border border-black/[0.08] dark:border-zinc-800 bg-black/[0.03] dark:bg-[#0e1013] text-zinc-600 dark:text-zinc-400 hover:text-foreground hover:border-black/20 dark:hover:border-zinc-700 transition-colors"
          >
            <Settings size={14} />
          </button>
        </div>
      </div>
    </header>
  );
}
