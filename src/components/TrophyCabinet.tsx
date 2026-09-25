'use client';

import React, { useState } from 'react';
import { useStore } from '@/lib/store';
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
  const { maciekBadges, myrnaBadges, activePlayerId } = useStore();
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerId>(activePlayerId || 'maciek');
  const [filter, setFilter] = useState<'all' | 'unlocked' | 'locked'>('all');

  const badges = selectedPlayer === 'maciek' ? maciekBadges : myrnaBadges;
  const isMaciek = selectedPlayer === 'maciek';

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
    <div className="space-y-3">
      {/* Top Controls: Player & Filter */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex p-0.5 rounded-full bg-[#1c1c1e] border border-white/[0.08] text-xs">
          <button
            onClick={() => handlePlayerChange('maciek')}
            className={`px-3 py-1 rounded-full transition-colors ${
              selectedPlayer === 'maciek'
                ? 'bg-blue-500/20 text-blue-300 font-semibold'
                : 'text-zinc-400'
            }`}
          >
            Maciek
          </button>
          <button
            onClick={() => handlePlayerChange('myrna')}
            className={`px-3 py-1 rounded-full transition-colors ${
              selectedPlayer === 'myrna'
                ? 'bg-pink-500/20 text-pink-300 font-semibold'
                : 'text-zinc-400'
            }`}
          >
            Myrna
          </button>
        </div>

        <span className="text-xs text-zinc-400 font-medium">
          {unlockedCount} of {badges.length} unlocked
        </span>
      </div>

      {/* Filter Tabs */}
      <div className="flex p-0.5 rounded-full bg-[#1c1c1e] border border-white/[0.08] text-xs">
        <button
          onClick={() => handleFilterChange('all')}
          className={`flex-1 py-1 rounded-full transition-colors ${
            filter === 'all' ? 'bg-[#2c2c2e] text-white font-medium' : 'text-zinc-400'
          }`}
        >
          All
        </button>
        <button
          onClick={() => handleFilterChange('unlocked')}
          className={`flex-1 py-1 rounded-full transition-colors ${
            filter === 'unlocked' ? 'bg-[#2c2c2e] text-emerald-400 font-medium' : 'text-zinc-400'
          }`}
        >
          Unlocked
        </button>
        <button
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
                    ? isMaciek
                      ? 'bg-blue-500/15 border-blue-500/30 text-blue-400'
                      : 'bg-pink-500/15 border-pink-500/30 text-pink-400'
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
                  <div className="mt-2 space-y-1">
                    <div className="h-1 w-full rounded-full bg-zinc-800 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${isMaciek ? 'bg-blue-500' : 'bg-pink-500'}`}
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
