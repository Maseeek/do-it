'use client';

import React, { useState } from 'react';
import { useStore } from '@/lib/store';
import { getPlayerThemeStyles } from '@/lib/player-colors';
import { PlayerId } from '@/lib/types';
import {
  Award,
  BookOpen,
  Camera,
  CheckCircle2,
  Code,
  Dumbbell,
  Flame,
  Globe,
  HeartHandshake,
  Lock,
  Sparkles,
  Trophy,
  Zap,
} from 'lucide-react';
import { soundEngine } from '@/lib/sound-utils';
import { hapticLight } from '@/lib/haptic-utils';

export function TrophyCabinet() {
  const { maciekBadges, myrnaBadges, activePlayerId, players } = useStore();
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerId>(activePlayerId || 'maciek');
  const [filter, setFilter] = useState<'all' | 'unlocked' | 'locked'>('all');

  const badges = selectedPlayer === 'maciek' ? maciekBadges : myrnaBadges;

  const filteredBadges = badges.filter((b) => {
    if (filter === 'unlocked') return b.isUnlocked;
    if (filter === 'locked') return !b.isUnlocked;
    return true;
  });

  const unlockedCount = badges.filter((b) => b.isUnlocked).length;

  const renderBadgeIcon = (iconName: string) => {
    const props = { className: 'w-4 h-4' };
    switch (iconName) {
      case 'Zap':
        return <Zap {...props} />;
      case 'Trophy':
        return <Trophy {...props} />;
      case 'Flame':
        return <Flame {...props} />;
      case 'Sparkles':
        return <Sparkles {...props} />;
      case 'BookOpen':
        return <BookOpen {...props} />;
      case 'Camera':
        return <Camera {...props} />;
      case 'Dumbbell':
        return <Dumbbell {...props} />;
      case 'Globe':
        return <Globe {...props} />;
      case 'Code':
        return <Code {...props} />;
      case 'HeartHandshake':
        return <HeartHandshake {...props} />;
      case 'Award':
      default:
        return <Award {...props} />;
    }
  };

  const handlePlayerChange = (playerId: PlayerId) => {
    if (selectedPlayer !== playerId) {
      soundEngine.playClick();
      hapticLight();
      setSelectedPlayer(playerId);
    }
  };

  const handleFilterChange = (f: 'all' | 'unlocked' | 'locked') => {
    if (filter !== f) {
      soundEngine.playClick();
      hapticLight();
      setFilter(f);
    }
  };

  return (
    <div style={getPlayerThemeStyles(players[selectedPlayer])} className="space-y-3">
      {/* Top Controls: Player & Filter */}
      <div className="flex items-center justify-between gap-2">
        <div role="tablist" aria-label="Select player for badges" className="flex p-0.5 rounded-full bg-[#1c1c1e] border border-white/[0.08] text-xs">
          <button
            role="tab"
            aria-selected={selectedPlayer === 'maciek'}
            onClick={() => handlePlayerChange('maciek')}
            className={`px-3 py-1 rounded-full transition-colors ${
              selectedPlayer === 'maciek'
                ? 'bg-owner-500/20 text-owner-300 font-semibold'
                : 'text-zinc-400'
            }`}
          >
            {players.maciek.name}
          </button>
          <button
            role="tab"
            aria-selected={selectedPlayer === 'myrna'}
            onClick={() => handlePlayerChange('myrna')}
            className={`px-3 py-1 rounded-full transition-colors ${
              selectedPlayer === 'myrna'
                ? 'bg-guest-500/20 text-guest-300 font-semibold'
                : 'text-zinc-400'
            }`}
          >
            {players.myrna.name}
          </button>
        </div>

        <span className="text-xs text-zinc-400 font-medium">
          {unlockedCount} of {badges.length} unlocked
        </span>
      </div>

      {/* Filter Tabs */}
      <div role="tablist" aria-label="Filter badges by unlock state" className="flex p-0.5 rounded-full bg-[#1c1c1e] border border-white/[0.08] text-xs">
        <button
          role="tab"
          aria-selected={filter === 'all'}
          onClick={() => handleFilterChange('all')}
          className={`flex-1 py-1 rounded-full transition-colors ${
            filter === 'all' ? 'bg-[#2c2c2e] text-white font-medium' : 'text-zinc-400'
          }`}
        >
          All
        </button>
        <button
          role="tab"
          aria-selected={filter === 'unlocked'}
          onClick={() => handleFilterChange('unlocked')}
          className={`flex-1 py-1 rounded-full transition-colors ${
            filter === 'unlocked' ? 'bg-[#2c2c2e] text-emerald-400 font-medium' : 'text-zinc-400'
          }`}
        >
          Unlocked
        </button>
        <button
          role="tab"
          aria-selected={filter === 'locked'}
          onClick={() => handleFilterChange('locked')}
          className={`flex-1 py-1 rounded-full transition-colors ${
            filter === 'locked' ? 'bg-[#2c2c2e] text-white font-medium' : 'text-zinc-400'
          }`}
        >
          Locked
        </button>
      </div>

      {/* Badges Grid (Apple Activity Awards style) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {filteredBadges.map(({ badge, isUnlocked, progress, currentValue }) => (
          <div
            key={badge.id}
            className={`p-3.5 rounded-2xl border transition-all ${
              isUnlocked
                ? 'bg-[#1c1c1e] border-white/[0.08]'
                : 'bg-[#1c1c1e]/40 border-white/[0.04] opacity-60'
            }`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 border ${
                  isUnlocked
                    ? 'bg-player-500/15 border-player-500/30 text-player-400'
                    : 'bg-[#2c2c2e] border-white/[0.06] text-zinc-600'
                }`}
              >
                {isUnlocked ? renderBadgeIcon(badge.icon) : <Lock className="w-4 h-4" />}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <h4 className="text-xs font-semibold text-white truncate">{badge.title}</h4>
                  {isUnlocked ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                  ) : (
                    <span className="text-[10px] text-zinc-500 flex-shrink-0">
                      {progress}%
                    </span>
                  )}
                </div>

                <p className="text-[11px] text-zinc-400 mt-0.5 leading-snug">
                  {badge.description}
                </p>

                {!isUnlocked && (
                  <div
                    role="progressbar"
                    aria-valuenow={currentValue}
                    aria-valuemin={0}
                    aria-valuemax={badge.targetCount}
                    aria-label={`${badge.title} progress: ${currentValue} of ${badge.targetCount}`}
                    className="mt-2 space-y-1"
                  >
                    <div className="h-1 w-full rounded-full bg-zinc-800 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-player-500"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <div className="text-[9px] text-zinc-500 text-right tabular-nums">
                      {currentValue} / {badge.targetCount}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
