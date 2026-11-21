'use client';

import React from 'react';
import { Keyboard, X } from 'lucide-react';
import { soundEngine } from '@/lib/sound-utils';
import { hapticLight } from '@/lib/haptic-utils';
import { useModalFocus } from '@/lib/use-modal-focus';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function KeyboardShortcutsModal({ isOpen, onClose }: KeyboardShortcutsModalProps) {
  const dialogRef = useModalFocus(isOpen, onClose);
  if (!isOpen) return null;

  const SHORTCUTS = [
    { key: '1', desc: 'Today' },
    { key: '2', desc: 'Duel' },
    { key: '3', desc: 'Progress' },
    { key: 'P', desc: 'Switch Player' },
    { key: 'T', desc: 'Jump to Today' },
    { key: '?', desc: 'Shortcuts' },
    { key: 'Esc', desc: 'Dismiss' },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md px-4"
      onClick={() => {
        soundEngine.playClick();
        hapticLight();
        onClose();
      }}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="shortcuts-modal-title"
        className="w-full max-w-sm rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface-1)] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3">
          <h3 id="shortcuts-modal-title" className="flex items-center gap-2 text-title text-foreground">
            <Keyboard aria-hidden="true" className="h-5 w-5 text-player-400" />
            Shortcuts
          </h3>
          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              hapticLight();
              onClose();
            }}
            aria-label="Close shortcuts modal"
            className="-mr-2 flex h-11 w-11 items-center justify-center rounded-full text-secondary transition-colors hover:bg-[var(--surface-2)] hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <dl className="mt-4 divide-y divide-[var(--border-subtle)]">
          {SHORTCUTS.map((s) => (
            <div key={s.key} className="flex min-h-11 items-center justify-between gap-3">
              <dt className="text-body text-secondary">{s.desc}</dt>
              <dd>
                <kbd className="inline-flex h-7 min-w-7 items-center justify-center rounded-lg border border-[var(--border-medium)] bg-[var(--surface-2)] px-2 font-sans text-caption font-semibold text-foreground">
                  {s.key}
                </kbd>
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
