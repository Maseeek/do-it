'use client';

import React from 'react';
import { Keyboard, X } from 'lucide-react';
import { soundEngine } from '@/lib/sound-utils';
import { hapticLight } from '@/lib/haptic-utils';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function KeyboardShortcutsModal({ isOpen, onClose }: KeyboardShortcutsModalProps) {
  if (!isOpen) return null;

  const SHORTCUTS = [
    { key: '1', desc: 'Today' },
    { key: '2', desc: 'Duel' },
    { key: '3', desc: 'Vault' },
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
        className="w-full max-w-sm rounded-3xl bg-[#1c1c1e] border border-white/[0.12] p-5 shadow-2xl space-y-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-2 border-b border-white/[0.08]">
          <div className="flex items-center gap-2">
            <Keyboard className="w-4 h-4 text-blue-400" />
            <h3 className="text-sm font-semibold text-white">Shortcuts</h3>
          </div>
          <button
            onClick={() => {
              soundEngine.playClick();
              hapticLight();
              onClose();
            }}
            className="text-zinc-400 hover:text-white p-1 rounded-full transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-1.5">
          {SHORTCUTS.map((s, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between py-1.5 px-2 text-xs"
            >
              <span className="text-zinc-300">{s.desc}</span>
              <kbd className="px-2 py-0.5 rounded-lg bg-[#2c2c2e] border border-white/[0.1] font-mono text-[11px] text-white font-semibold">
                {s.key}
              </kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
