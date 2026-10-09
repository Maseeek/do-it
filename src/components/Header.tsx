'use client';

import { Settings, Moon, Sun, Monitor } from 'lucide-react';
import { DoLogo } from './DoLogo';
import { useStore } from '@/lib/store';
import { useMultiplayer } from '@/lib/multiplayer';

export function Header({ onOpenSettings }: { onOpenSettings: () => void }) {
  const multiplayer = useMultiplayer();
  const { activePlayer, selectProfile, themePreference, effectiveTheme, toggleTheme } = useStore();
  const isMaciek = activePlayer?.id === 'maciek';

  return (
    <header className="sticky top-0 z-40 border-b border-black/[0.06] dark:border-white/[0.08] bg-[#f6f7fa]/80 dark:bg-black/80 px-4 py-2.5 backdrop-blur-xl safe-area-top transition-colors">
      <div className="mx-auto flex max-w-6xl items-center justify-between">
        <div className="flex items-center gap-2">
          <DoLogo size="xs" />
          <span className="text-sm font-semibold tracking-tight text-foreground">do it.</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            aria-label={`Switch theme (current: ${themePreference === 'system' ? `system [${effectiveTheme}]` : themePreference})`}
            title={`Theme: ${themePreference === 'system' ? `System (${effectiveTheme})` : themePreference} (click to toggle)`}
            className="flex size-10 items-center justify-center rounded-full border border-black/[0.08] dark:border-white/[0.12] bg-black/[0.03] dark:bg-white/[0.06] text-zinc-600 dark:text-zinc-300 hover:text-black dark:hover:text-white hover:bg-black/[0.06] dark:hover:bg-white/[0.1] active:scale-95 transition-all shadow-sm"
          >
            {themePreference === 'system' ? (
              <Monitor size={16} />
            ) : effectiveTheme === 'dark' ? (
              <Moon size={16} />
            ) : (
              <Sun size={16} />
            )}
          </button>
          <button
            onClick={multiplayer.configured ? onOpenSettings : () => selectProfile(isMaciek ? 'myrna' : 'maciek')}
            aria-label={multiplayer.configured ? 'Open profile and settings' : `Switch profile to ${isMaciek ? 'Myrna' : 'Maciek'}`}
            title={multiplayer.configured ? 'Open settings' : `Switch profile to ${isMaciek ? 'Myrna' : 'Maciek'}`}
            className={`flex size-10 items-center justify-center rounded-full border text-xs font-bold active:scale-95 transition-all shadow-sm ${
              isMaciek
                ? 'bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400 hover:border-blue-500/50'
                : 'bg-pink-500/10 border-pink-500/30 text-pink-600 dark:text-pink-400 hover:border-pink-500/50'
            }`}
          >
            <span className="sr-only"><Settings size={16} /></span>
            {activePlayer?.name[0]?.toUpperCase() || 'D'}
          </button>
        </div>
      </div>
    </header>
  );
}
