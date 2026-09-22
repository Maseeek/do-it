'use client';

import React from 'react';
import { useStore } from '@/lib/store';
import { PlayerId } from '@/lib/types';
import { Zap, Sparkles, ArrowRight } from 'lucide-react';

export function ProfileGate() {
  const { selectProfile, maciekSummary, myrnaSummary } = useStore();

  const handleSelect = (id: PlayerId) => {
    selectProfile(id);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#08090a] px-4">
      <div className="w-full max-w-sm">
        {/* Brand header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 text-white font-mono text-lg font-bold tracking-wider mb-4 shadow-2xl">
            DO
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white mb-2">
            Who is using this device?
          </h1>
          <p className="text-xs text-zinc-400 max-w-xs mx-auto leading-relaxed">
            Your selection persists on this phone for instant 1-tap logging. Switch anytime in settings.
          </p>
        </div>

        {/* Profile cards */}
        <div className="space-y-3">
          {/* Maciek */}
          <button
            onClick={() => handleSelect('maciek')}
            className="group w-full text-left p-4 rounded-xl bg-zinc-900/80 border border-zinc-800 hover:border-blue-500/50 hover:bg-zinc-900 transition-all duration-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 group-hover:scale-105 transition-transform">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-white group-hover:text-blue-400 transition-colors">
                    Maciek
                  </div>
                  <div className="text-xs text-zinc-400 font-mono mt-0.5">
                    {maciekSummary.weekly} pts this week • {maciekSummary.karma} karma
                  </div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-zinc-600 group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all" />
            </div>
          </button>

          {/* Myrna */}
          <button
            onClick={() => handleSelect('myrna')}
            className="group w-full text-left p-4 rounded-xl bg-zinc-900/80 border border-zinc-800 hover:border-pink-500/50 hover:bg-zinc-900 transition-all duration-200 focus:outline-none focus:ring-1 focus:ring-pink-500"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-lg bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400 group-hover:scale-105 transition-transform">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-white group-hover:text-pink-400 transition-colors">
                    Myrna
                  </div>
                  <div className="text-xs text-zinc-400 font-mono mt-0.5">
                    {myrnaSummary.weekly} pts this week • {myrnaSummary.karma} karma
                  </div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-zinc-600 group-hover:text-pink-400 group-hover:translate-x-0.5 transition-all" />
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
