'use client';

import { Flame, Settings } from 'lucide-react';
import { DoLogo } from './DoLogo';
import { useStore } from '@/lib/store';
import { useMultiplayer } from '@/lib/multiplayer';
import { soundEngine } from '@/lib/sound-utils';
import { hapticLight } from '@/lib/haptic-utils';
import { getPlayerColorStyles } from '@/lib/player-colors';

export function Header({ onOpenSettings }: { onOpenSettings: () => void }) {
  const multiplayer = useMultiplayer();
  const { activePlayer, activePlayerSummary, selectProfile } = useStore();

  const isMaciek = activePlayer?.id === 'maciek';

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
        <div className="flex min-w-0 items-center gap-2 shrink-0">
          <DoLogo size="xs" />
          <span className="text-sm font-semibold tracking-tight text-foreground">do it.</span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={onOpenSettings}
            aria-label="Open settings"
            title="Settings"
            className="flex size-10 items-center justify-center rounded-lg border border-black/[0.08] dark:border-zinc-800 bg-black/[0.03] dark:bg-[#0e1013] text-zinc-600 dark:text-zinc-400 transition-colors hover:border-black/20 dark:hover:border-zinc-700 hover:text-foreground"
          >
            <Settings size={14} />
          </button>

          {activePlayerSummary.currentStreak > 0 && (
            <span
              className="inline-flex items-center gap-0.5 rounded border border-amber-500/20 bg-amber-500/10 px-1.5 py-0.5 font-mono text-[10px] font-medium text-amber-500 dark:text-amber-400"
              title={`${activePlayerSummary.currentStreak}-day active streak`}
            >
              <Flame className="size-2.5" />
              {activePlayerSummary.currentStreak}d
            </span>
          )}

          <button
            type="button"
            onClick={handleProfileClick}
            aria-label={multiplayer.configured ? 'Open profile and settings' : `Switch profile (current: ${activePlayer?.name || 'Player'})`}
            title={multiplayer.configured ? 'Open profile and settings' : 'Switch profile (Shortcut: P)'}
            className="group flex size-10 items-center justify-center rounded-lg transition-colors hover:bg-black/5 dark:hover:bg-white/5"
          >
            <span
              className="flex size-7 items-center justify-center rounded-md border font-mono text-xs font-bold transition-colors group-hover:brightness-125"
              style={activePlayer ? getPlayerColorStyles(activePlayer) : undefined}
            >
              {activePlayer?.name[0] || 'D'}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}
