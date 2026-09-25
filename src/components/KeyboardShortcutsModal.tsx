'use client';

import React from 'react';
import { Keyboard, X } from 'lucide-react';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function KeyboardShortcutsModal({ isOpen, onClose }: KeyboardShortcutsModalProps) {
  if (!isOpen) return null;

  const SHORTCUTS = [
    { key: '1', desc: 'Jump to Today (Daily Ritual & Feed)' },
    { key: '2', desc: 'Jump to Duel (Tug-of-War & Battles)' },
    { key: '3', desc: 'Jump to Vault (Karma, Badges & Settings)' },
    { key: 'P', desc: 'Switch Active Player (Maciek ⇄ Myrna)' },
    { key: 'T', desc: 'Jump back to Today (reset date traveler)' },
    { key: '?', desc: 'Toggle keyboard shortcuts help' },
    { key: 'Esc', desc: 'Close any active modal or lightbox' },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl glass-panel bg-zinc-950 border border-white/[0.1] p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
          <div className="flex items-center gap-2">
            <Keyboard className="w-4 h-4 text-blue-400" />
            <h3 className="text-sm font-bold text-white font-mono">Keyboard Shortcuts</h3>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-white p-1 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-2">
          {SHORTCUTS.map((s, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-900/60 border border-white/[0.06] text-xs"
            >
              <span className="text-zinc-300 font-medium">{s.desc}</span>
              <kbd className="px-2 py-0.5 rounded-lg bg-zinc-800 border border-white/[0.12] font-mono text-[11px] text-white font-bold shadow-xs">
                {s.key}
              </kbd>
            </div>
          ))}
        </div>

        <p className="text-[11px] text-zinc-500 font-mono text-center pt-1">
          Designed for instant couples accountability
        </p>
      </div>
    </div>
  );
}
