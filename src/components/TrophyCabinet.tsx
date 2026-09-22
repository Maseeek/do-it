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

  return (
    <div className="space-y-4">
      {/* Top Banner: Unlocked Count & Player Switcher */}
      <div className="rounded-2xl bg-gradient-to-b from-[#14161f] to-[#0c0d10] border border-zinc-800/90 p-4 shadow-md">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Trophy className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-300 font-mono">
                Trophy Cabinet & Badges
              </h3>
              <p className="text-[10px] font-mono text-zinc-400">
                {unlockedCount} of {badges.length} Unlocked ({Math.round((unlockedCount / badges.length) * 100)}%)
              </p>
            </div>
          </div>

          {/* Player Switcher */}
          <div className="flex bg-zinc-900 border border-zinc-800 p-0.5 rounded-lg text-xs font-mono">
            <button
              onClick={() => setSelectedPlayer('maciek')}
              className={`px-2.5 py-1 rounded transition-colors ${
                selectedPlayer === 'maciek'
                  ? 'bg-blue-500/20 text-blue-300 font-bold'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              ⚡ Maciek
            </button>
            <button
              onClick={() => setSelectedPlayer('myrna')}
              className={`px-2.5 py-1 rounded transition-colors ${
                selectedPlayer === 'myrna'
                  ? 'bg-pink-500/20 text-pink-300 font-bold'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              ✨ Myrna
            </button>
          </div>
        </div>

        {/* Global Trophy Progress Bar */}
        <div className="h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              isMaciek
                ? 'bg-gradient-to-r from-blue-500 to-indigo-400'
                : 'bg-gradient-to-r from-pink-500 to-rose-400'
            }`}
            style={{ width: `${(unlockedCount / badges.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between px-1">
        <div className="flex gap-1 bg-zinc-900 border border-zinc-800 p-0.5 rounded-lg text-xs font-mono">
          <button
            onClick={() => setFilter('all')}
            className={`px-2.5 py-0.5 rounded transition-colors ${
              filter === 'all' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            All ({badges.length})
          </button>
          <button
            onClick={() => setFilter('unlocked')}
            className={`px-2.5 py-0.5 rounded transition-colors ${
              filter === 'unlocked' ? 'bg-zinc-800 text-emerald-400' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            Unlocked ({unlockedCount})
          </button>
          <button
            onClick={() => setFilter('locked')}
            className={`px-2.5 py-0.5 rounded transition-colors ${
              filter === 'locked' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            In Progress ({badges.length - unlockedCount})
          </button>
        </div>
      </div>

      {/* Badges Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {filteredBadges.map(({ badge, isUnlocked, progress, currentValue }) => (
          <div
            key={badge.id}
            className={`p-3.5 rounded-2xl border transition-all ${
              isUnlocked
                ? isMaciek
                  ? 'bg-gradient-to-b from-[#10141f] to-[#0c0d10] border-blue-500/30 shadow-md'
                  : 'bg-gradient-to-b from-[#18121a] to-[#0c0d10] border-pink-500/30 shadow-md'
                : 'bg-[#0c0d10] border-zinc-800/70 opacity-60'
            }`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 border ${
                  isUnlocked
                    ? isMaciek
                      ? 'bg-blue-500/15 border-blue-500/40 text-blue-400'
                      : 'bg-pink-500/15 border-pink-500/40 text-pink-400'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-600'
                }`}
              >
                {isUnlocked ? renderBadgeIcon(badge.icon) : <Lock className="w-4 h-4" />}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <h4 className="text-xs font-bold text-white truncate">{badge.title}</h4>
                  {isUnlocked ? (
                    <span className="inline-flex items-center gap-0.5 text-[9px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20 font-medium flex-shrink-0">
                      <CheckCircle2 className="w-2.5 h-2.5" />
                      Unlocked
                    </span>
                  ) : (
                    <span className="text-[9px] font-mono text-zinc-500 flex-shrink-0">
                      {progress}%
                    </span>
                  )}
                </div>

                <p className="text-[11px] text-zinc-400 mt-0.5 leading-relaxed">
                  {badge.description}
                </p>

                {/* Progress bar if not yet unlocked */}
                {!isUnlocked && (
                  <div className="mt-2 space-y-1">
                    <div className="h-1 w-full rounded-full bg-zinc-800 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${isMaciek ? 'bg-blue-500/70' : 'bg-pink-500/70'}`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <div className="text-[9px] font-mono text-zinc-500 text-right">
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
