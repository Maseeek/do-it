'use client';

import { Settings, Moon, Sun, Monitor } from 'lucide-react';
import { DoLogo } from './DoLogo';
import { useStore } from '@/lib/store';
import { useMultiplayer } from '@/lib/multiplayer';

export function Header({ onOpenSettings }: { onOpenSettings: () => void }) {
  const multiplayer = useMultiplayer();
  const { activePlayer, selectProfile, themePreference, effectiveTheme, toggleTheme } = useStore();

  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.08] bg-black/85 px-4 py-2 backdrop-blur-xl safe-area-top">
      <div className="mx-auto flex max-w-6xl items-center justify-between">
        <div className="flex items-center gap-2">
          <DoLogo size="xs" />
          <span className="text-sm font-semibold">do it.</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            aria-label={`Switch theme (current: ${themePreference})`}
            title={`Switch theme (current: ${themePreference})`}
            className="flex size-11 items-center justify-center rounded-full border border-white/[0.15] bg-white/[0.05] text-zinc-400 hover:text-white transition-colors"
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
            onClick={multiplayer.configured ? onOpenSettings : () => selectProfile(activePlayer?.id === 'maciek' ? 'myrna' : 'maciek')}
            aria-label={multiplayer.configured ? 'Open profile and settings' : 'Switch profile'}
            className="flex size-11 items-center justify-center rounded-full border border-white/[0.15] bg-white/[0.05] text-sm font-semibold"
          >
            <span className="sr-only"><Settings size={16} /></span>
            {activePlayer?.name[0] || 'D'}
          </button>
        </div>
      </div>
    </header>
  );
}
