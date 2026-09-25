'use client';

import React from 'react';
import { useStore } from '@/lib/store';
import { PlayerId } from '@/lib/types';
import { Zap, Sparkles, ArrowRight } from 'lucide-react';
import { soundEngine } from '@/lib/sound-utils';
import { hapticMedium } from '@/lib/haptic-utils';

export function ProfileGate() {
  const { selectProfile, maciekSummary, myrnaSummary } = useStore();

  const handleSelect = (id: PlayerId) => {
    soundEngine.playCheck();
    hapticMedium();
    selectProfile(id);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#070809] px-4 selection:bg-zinc-800 selection:text-white">
      {/* Ambient background glow mesh */}
      <div className="ambient-mesh" aria-hidden="true" />

      <div className="w-full max-w-sm relative z-10 animate-in fade-in zoom-in-95 duration-300">
        {/* Brand header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl glass-card border border-white/[0.12] text-white font-mono text-xl font-extrabold tracking-widest mb-4 shadow-[0_0_24px_rgba(255,255,255,0.08)]">
            DO
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white mb-2">
            Who is using this device?
          </h1>
          <p className="text-xs text-zinc-400 max-w-xs mx-auto leading-relaxed">
            Your selection persists on this phone for instant 1-tap logging. Switch anytime in settings or by pressing &apos;P&apos;.
          </p>
        </div>

        {/* Profile cards */}
        <div className="space-y-3">
          {/* Maciek */}
          <button
            onClick={() => handleSelect('maciek')}
            className="group w-full text-left p-4 rounded-2xl glass-card border border-blue-500/25 hover:border-blue-400/60 hover:bg-blue-500/[0.06] transition-all duration-200 focus:outline-none shadow-[0_4px_20px_rgba(59,130,246,0.08)] active:scale-98"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400 group-hover:scale-105 transition-transform shadow-[0_0_12px_rgba(59,130,246,0.3)]">
                  <Zap className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-sm font-bold text-white group-hover:text-blue-300 transition-colors">
                    Maciek
                  </div>
                  <div className="text-xs text-zinc-400 font-mono mt-0.5">
                    {maciekSummary.weekly} pts this week • {maciekSummary.karma} karma
                  </div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-zinc-600 group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
            </div>
          </button>

          {/* Myrna */}
          <button
            onClick={() => handleSelect('myrna')}
            className="group w-full text-left p-4 rounded-2xl glass-card border border-pink-500/25 hover:border-pink-400/60 hover:bg-pink-500/[0.06] transition-all duration-200 focus:outline-none shadow-[0_4px_20px_rgba(236,72,153,0.08)] active:scale-98"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-pink-500/20 border border-pink-500/40 flex items-center justify-center text-pink-400 group-hover:scale-105 transition-transform shadow-[0_0_12px_rgba(236,72,153,0.3)]">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-sm font-bold text-white group-hover:text-pink-300 transition-colors">
                    Myrna
                  </div>
                  <div className="text-xs text-zinc-400 font-mono mt-0.5">
                    {myrnaSummary.weekly} pts this week • {myrnaSummary.karma} karma
                  </div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-zinc-600 group-hover:text-pink-400 group-hover:translate-x-1 transition-all" />
            </div>
          </button>
        </div>

        {/* Footer info */}
        <div className="mt-8 text-center">
          <span className="inline-block text-[11px] text-zinc-500 font-mono tracking-wider uppercase">
            Private 2-Player Habit Arena
          </span>
        </div>
      </div>
    </div>
  );
}
