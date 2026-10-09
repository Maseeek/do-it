'use client';

import React from 'react';
import { useStore } from '@/lib/store';
import { PlayerId } from '@/lib/types';
import { ChevronRight } from 'lucide-react';
import { soundEngine } from '@/lib/sound-utils';
import { hapticSuccess } from '@/lib/haptic-utils';
import { getPlayerColorStyles } from '@/lib/player-colors';

import { DoLogo } from './DoLogo';

export function ProfileGate() {
  const { selectProfile, players, maciekSummary, myrnaSummary } = useStore();

  const handleSelect = (id: PlayerId) => {
    soundEngine.playCheck();
    hapticSuccess();
    selectProfile(id);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-gate-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-background px-4 transition-colors"
    >
      <div className="w-full max-w-sm">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <DoLogo size="lg" className="mb-3.5 shadow-2xl" />
          <h1 id="profile-gate-title" className="text-2xl font-bold tracking-tight text-foreground">
            Select Profile
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            do: habit tracker
          </p>
        </div>

        {/* Profile cards */}
        <div className="space-y-3">
          {/* Maciek */}
          <button
            onClick={() => handleSelect('maciek')}
            aria-label={`Select ${players.maciek.name}, ${maciekSummary.weekly} points this week, ${maciekSummary.karma} karma`}
            className="w-full text-left p-4 rounded-2xl bg-white dark:bg-[#1c1c1e] border border-black/10 dark:border-white/[0.08] transition-all active:scale-[0.98] shadow-sm"
            style={{ borderColor: players.maciek.accentBorder }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full border flex items-center justify-center font-bold text-base" style={getPlayerColorStyles(players.maciek)}>
                  {players.maciek.name[0]?.toUpperCase()}
                </div>
                <div>
                  <div className="text-base font-semibold text-foreground">
                    {players.maciek.name}
                  </div>
                  <div className="text-xs text-zinc-400 mt-0.5 tabular-nums">
                    {maciekSummary.weekly} pts this week · {maciekSummary.karma} karma
                  </div>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-zinc-400" />
            </div>
          </button>

          {/* Myrna */}
          <button
            onClick={() => handleSelect('myrna')}
            aria-label={`Select ${players.myrna.name}, ${myrnaSummary.weekly} points this week, ${myrnaSummary.karma} karma`}
            className="w-full text-left p-4 rounded-2xl bg-white dark:bg-[#1c1c1e] border border-black/10 dark:border-white/[0.08] transition-all active:scale-[0.98] shadow-sm"
            style={{ borderColor: players.myrna.accentBorder }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full border flex items-center justify-center font-bold text-base" style={getPlayerColorStyles(players.myrna)}>
                  {players.myrna.name[0]?.toUpperCase()}
                </div>
                <div>
                  <div className="text-base font-semibold text-foreground">
                    {players.myrna.name}
                  </div>
                  <div className="text-xs text-zinc-400 mt-0.5 tabular-nums">
                    {myrnaSummary.weekly} pts this week · {myrnaSummary.karma} karma
                  </div>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-zinc-400" />
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
