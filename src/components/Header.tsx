'use client';

import { Flame, Moon, Sun, Monitor } from 'lucide-react';
import { DoLogo } from './DoLogo';
import { useStore } from '@/lib/store';
import { soundEngine } from '@/lib/sound-utils';
import { hapticLight } from '@/lib/haptic-utils';
import { getPlayerColorStyles } from '@/lib/player-colors';

export function Header({ onOpenSettings, onWarmSettings }: { onOpenSettings: () => void; onWarmSettings?: () => void }) {
  const { activePlayer, activePlayerSummary, themePreference, effectiveTheme, toggleTheme } = useStore();

  const handleProfileClick = () => {
    soundEngine.playClick();
    hapticLight();
    onOpenSettings();
  };

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border-subtle)] bg-[#f6f7fa]/80 px-[var(--page-gutter)] pb-2.5 backdrop-blur-xl safe-area-top transition-colors dark:bg-[#08090a]/90">
      <div className="-my-1.5 flex w-full items-center justify-between gap-3">
        <div className="flex min-w-0 shrink-0 items-center gap-2">
          <DoLogo size="xs" />
          <span className="text-headline text-foreground">do it.</span>
        </div>

        <div className="-mr-2 flex shrink-0 items-center">
          {activePlayerSummary.currentStreak > 0 && (
            <span
              className="num mr-1 inline-flex items-center gap-1 px-2 text-label text-amber-600 dark:text-amber-400"
              title={`${activePlayerSummary.currentStreak}-day active streak`}
            >
              <Flame className="size-4" aria-hidden="true" />
              {activePlayerSummary.currentStreak}
              <span className="sr-only"> day streak</span>
            </span>
          )}

          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              hapticLight();
              toggleTheme();
            }}
            aria-label={`Switch theme (current: ${themePreference})`}
            title={`Switch theme (current: ${themePreference})`}
            className="flex size-11 items-center justify-center rounded-full text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-2)] hover:text-foreground"
          >
            {themePreference === "system" ? (
              <Monitor size={18} />
            ) : effectiveTheme === "dark" ? (
              <Moon size={18} />
            ) : (
              <Sun size={18} />
            )}
          </button>

          <button
            type="button"
            onClick={handleProfileClick}
            onPointerEnter={onWarmSettings}
            onFocus={onWarmSettings}
            aria-label="Open profile and settings"
            title="Profile and settings"
            className="group flex size-11 items-center justify-center rounded-full active:scale-95 transition-transform"
          >
            <span
              className="flex size-8 items-center justify-center rounded-full border text-label font-semibold transition-[filter] group-hover:brightness-110"
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
