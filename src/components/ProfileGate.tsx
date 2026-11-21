'use client';

import React from 'react';
import Link from 'next/link';
import { useStore } from '@/lib/store';
import { PlayerId } from '@/lib/types';
import { ChevronRight, Compass } from 'lucide-react';
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

  const profiles = [
    { id: 'maciek' as const, summary: maciekSummary },
    { id: 'myrna' as const, summary: myrnaSummary },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-gate-title"
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-background px-4 py-10 transition-colors"
    >
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <DoLogo size="lg" className="mb-5 shadow-lg" />
          <h1 id="profile-gate-title" className="text-display text-foreground">
            Select Profile
          </h1>
          <p className="mt-1.5 text-body text-secondary">
            do: habit tracker
          </p>
        </div>

        <div className="surface overflow-hidden divide-y divide-[var(--border-subtle)] shadow-sm">
          {profiles.map(({ id, summary }) => {
            const player = players[id];
            const invites = player.inviteCount ?? 0;
            return (
              <button
                key={id}
                onClick={() => handleSelect(id)}
                aria-label={`Select ${player.name}, ${summary.weekly} points this week, ${summary.karma} karma, ${invites} invites`}
                className="flex min-h-18 w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[var(--surface-2)]/60 active:bg-[var(--surface-2)]"
              >
                <span
                  aria-hidden="true"
                  className="flex size-11 shrink-0 items-center justify-center rounded-full border text-headline"
                  style={getPlayerColorStyles(player)}
                >
                  {player.name[0]?.toUpperCase()}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-headline text-foreground">{player.name}</span>
                  <span className="mt-0.5 block truncate text-caption text-muted num">
                    {summary.weekly} pts this week &middot; {summary.karma} karma &middot; {invites} {invites === 1 ? 'invite' : 'invites'}
                  </span>
                </span>
                <ChevronRight aria-hidden="true" className="size-5 shrink-0 text-muted" />
              </button>
            );
          })}
        </div>

        <div className="mt-6 text-center">
          <Link
            href="/welcome"
            className="inline-flex min-h-11 items-center gap-1.5 rounded-xl px-3 text-label text-secondary hover:text-foreground transition-colors"
          >
            <Compass className="size-4" />
            <span>Explore Do It & Membership &rarr;</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
