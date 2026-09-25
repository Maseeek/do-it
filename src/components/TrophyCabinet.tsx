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

  const handlePlayerChange = (playerId: PlayerId) => {
    soundEngine.playClick();
    hapticLight();
    setSelectedPlayer(playerId);
  };

  const handleFilterChange = (f: 'all' | 'unlocked' | 'locked') => {
    soundEngine.playClick();
    hapticLight();
    setFilter(f);
  };

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
    <div className="space-y-3.5">
      {/* Top Banner: Unlocked Count & Player Switcher */}
      <div className="rounded-2xl glass-card border border-white/[0.08] p-4 shadow-md relative overflow-hidden">
        <div
          className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl pointer-events-none ${
            isMaciek ? 'bg-blue-500/10' : 'bg-pink-500/10'
          }`}
        />

        <div className="flex items-center justify-between mb-3 relative z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.2)]">
              <Trophy className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-200 font-mono">
                Trophy Cabinet & Badges
              </h3>
              <p className="text-[10px] font-mono text-zinc-400">
                {unlockedCount} of {badges.length} Unlocked ({Math.round((unlockedCount / badges.length) * 100)}%)
              </p>
            </div>
          </div>

          {/* Player Switcher */}
          <div className="flex bg-zinc-900 border border-white/[0.08] p-0.5 rounded-xl text-xs font-mono">
            <button
              onClick={() => handlePlayerChange('maciek')}
              className={`px-2.5 py-1 rounded-lg transition-colors ${
                selectedPlayer === 'maciek'
                  ? 'bg-blue-500/20 text-blue-300 font-bold shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              ⚡ Maciek
            </button>
            <button
              onClick={() => handlePlayerChange('myrna')}
              className={`px-2.5 py-1 rounded-lg transition-colors ${
                selectedPlayer === 'myrna'
                  ? 'bg-pink-500/20 text-pink-300 font-bold shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              ✨ Myrna
            </button>
          </div>
        </div>

        {/* Global Trophy Progress Bar */}
        <div className="h-1.5 w-full rounded-full bg-zinc-800/80 overflow-hidden relative z-10">
          <div
            className={`h-full rounded-full transition-all duration-700 ${
              isMaciek
                ? 'bg-gradient-to-r from-blue-500 to-indigo-400 shadow-[0_0_8px_#60a5fa]'
                : 'bg-gradient-to-r from-pink-500 to-rose-400 shadow-[0_0_8px_#f472b6]'
            }`}
            style={{ width: `${(unlockedCount / badges.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between px-1">
        <div className="flex gap-1 bg-zinc-900 border border-white/[0.08] p-0.5 rounded-xl text-xs font-mono">
          <button
            onClick={() => handleFilterChange('all')}
            className={`px-2.5 py-1 rounded-lg transition-colors ${
              filter === 'all' ? 'bg-white/[0.1] text-white font-semibold' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            All ({badges.length})
          </button>
          <button
            onClick={() => handleFilterChange('unlocked')}
            className={`px-2.5 py-1 rounded-lg transition-colors ${
              filter === 'unlocked' ? 'bg-emerald-500/20 text-emerald-300 font-semibold' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            Unlocked ({unlockedCount})
          </button>
          <button
            onClick={() => handleFilterChange('locked')}
            className={`px-2.5 py-1 rounded-lg transition-colors ${
              filter === 'locked' ? 'bg-white/[0.1] text-white font-semibold' : 'text-zinc-500 hover:text-zinc-300'
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
                  ? 'glass-card border-blue-500/30 shadow-[0_0_12px_rgba(59,130,246,0.12)]'
                  : 'glass-card border-pink-500/30 shadow-[0_0_12px_rgba(236,72,153,0.12)]'
                : 'glass-card border-white/[0.05] opacity-60'
            }`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 border ${
                  isUnlocked
                    ? isMaciek
                      ? 'bg-blue-500/15 border-blue-500/40 text-blue-400 shadow-[0_0_8px_rgba(59,130,246,0.3)]'
                      : 'bg-pink-500/15 border-pink-500/40 text-pink-400 shadow-[0_0_8px_rgba(236,72,153,0.3)]'
                    : 'bg-zinc-900 border-white/[0.06] text-zinc-600'
                }`}
              >
                {isUnlocked ? renderBadgeIcon(badge.icon) : <Lock className="w-4 h-4" />}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <h4 className="text-xs font-bold text-white truncate">{badge.title}</h4>
                  {isUnlocked ? (
                    <span className="inline-flex items-center gap-1 text-[9px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20 font-bold flex-shrink-0">
                      <CheckCircle2 className="w-2.5 h-2.5" />
                      Unlocked
                    </span>
                  ) : (
                    <span className="text-[9px] font-mono text-zinc-500 flex-shrink-0 font-medium">
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
