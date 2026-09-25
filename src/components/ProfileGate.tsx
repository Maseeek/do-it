'use client';

import React from 'react';
import { useStore } from '@/lib/store';
import { PlayerId } from '@/lib/types';
import { ChevronRight } from 'lucide-react';

export function ProfileGate() {
  const { selectProfile, maciekSummary, myrnaSummary } = useStore();

  const handleSelect = (id: PlayerId) => {
    selectProfile(id);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black px-4">
      <div className="w-full max-w-sm">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[#1c1c1e] border border-white/[0.1] text-white text-lg font-bold mb-3 shadow-2xl">
            DO
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Select Profile
          </h1>
        </div>

        {/* Profile cards */}
        <div className="space-y-3">
          {/* Maciek */}
          <button
            onClick={() => handleSelect('maciek')}
            className="w-full text-left p-4 rounded-2xl bg-[#1c1c1e] border border-white/[0.08] hover:border-blue-500/50 transition-all active:scale-[0.98]"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold text-base">
                  M
                </div>
                <div>
                  <div className="text-base font-semibold text-white">
                    Maciek
                  </div>
                  <div className="text-xs text-zinc-400 mt-0.5 tabular-nums">
                    {maciekSummary.weekly} pts this week · {maciekSummary.karma} karma
                  </div>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-zinc-500" />
            </div>
          </button>

          {/* Myrna */}
          <button
            onClick={() => handleSelect('myrna')}
            className="w-full text-left p-4 rounded-2xl bg-[#1c1c1e] border border-white/[0.08] hover:border-pink-500/50 transition-all active:scale-[0.98]"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-pink-500/15 border border-pink-500/30 flex items-center justify-center text-pink-400 font-bold text-base">
                  M
                </div>
                <div>
                  <div className="text-base font-semibold text-white">
                    Myrna
                  </div>
                  <div className="text-xs text-zinc-400 mt-0.5 tabular-nums">
                    {myrnaSummary.weekly} pts this week · {myrnaSummary.karma} karma
                  </div>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-zinc-500" />
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
