'use client';

import { Flame } from 'lucide-react';
import { DoLogo } from './DoLogo';
import { useStore } from '@/lib/store';
import { soundEngine } from '@/lib/sound-utils';
import { hapticLight } from '@/lib/haptic-utils';
import { getPlayerColorStyles } from '@/lib/player-colors';

export function Header({ onOpenSettings }: { onOpenSettings: () => void }) {
  const { activePlayer, activePlayerSummary } = useStore();

  const handleProfileClick = () => {
    soundEngine.playClick();
    hapticLight();
    onOpenSettings();
  };

  return (
    <header className="sticky top-0 z-40 border-b border-black/[0.06] dark:border-zinc-800/80 bg-[#f6f7fa]/80 dark:bg-[#08090a]/90 px-4 py-2.5 backdrop-blur-xl safe-area-top transition-colors">
      <div className="flex w-full items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2 shrink-0">
          <DoLogo size="xs" />
          <span className="text-sm font-semibold tracking-tight text-foreground">do it.</span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {activePlayerSummary.currentStreak > 0 && (
            <span
              className="inline-flex size-11 flex-col items-center justify-center gap-0.5 rounded-lg border border-amber-500/20 bg-amber-500/10 font-mono text-[10px] font-medium text-amber-500 dark:text-amber-400"
              title={`${activePlayerSummary.currentStreak}-day active streak`}
            >
              <Flame className="size-3.5" />
              {activePlayerSummary.currentStreak}d
            </span>
          )}

          <button
            type="button"
            onClick={handleProfileClick}
            aria-label="Open profile and settings"
            title="Profile and settings"
            className="flex size-11 items-center justify-center rounded-lg border font-mono text-xs font-bold transition-colors hover:brightness-110 active:scale-95"
            style={activePlayer ? getPlayerColorStyles(activePlayer) : undefined}
          >
            {activePlayer?.name[0] || 'D'}
          </button>
        </div>
      </div>
    </header>
  );
}
