'use client';

import React, { useMemo, useState } from 'react';
import { calculatePlayerBadges } from '@/lib/badge-utils';
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
  const { checkIns, habits, stakes, maciekSummary, myrnaSummary, activePlayerId, players } = useStore();
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerId>(activePlayerId || 'maciek');
  const [filter, setFilter] = useState<'all' | 'unlocked' | 'locked'>('all');

  const currentStreak = selectedPlayer === 'maciek' ? maciekSummary.currentStreak : myrnaSummary.currentStreak;
  const badges = useMemo(
    () => calculatePlayerBadges(selectedPlayer, checkIns, habits, stakes, currentStreak),
    [selectedPlayer, checkIns, habits, stakes, currentStreak]
  );

  const filteredBadges = badges.filter((b) => {
    if (filter === 'unlocked') return b.isUnlocked;
    if (filter === 'locked') return !b.isUnlocked;
    return true;
  });

  const unlockedCount = badges.filter((b) => b.isUnlocked).length;

  const renderBadgeIcon = (iconName: string) => {
    const props = { className: 'h-[18px] w-[18px]' };
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

  const segmentTrack =
    'grid gap-0.5 rounded-[var(--radius-control)] border border-[var(--border-subtle)] bg-[var(--surface-2)] p-0.5';
  const segment = (active: boolean) =>
    `min-h-10 min-w-0 truncate rounded-[10px] px-3 text-label transition-colors ${
      active
        ? 'bg-[var(--surface-1)] font-semibold text-foreground shadow-[0_1px_2px_rgba(0,0,0,0.12)] dark:bg-[var(--surface-3)]'
        : 'text-secondary hover:text-foreground'
    }`;

  return (
    <div style={getPlayerThemeStyles(players[selectedPlayer])} className="stack-cards">
      {/* Top Controls: Player & Filter */}
      <div className="flex items-center justify-between gap-3">
        <div role="tablist" aria-label="Select player for badges" className={`${segmentTrack} grid-cols-2`}>
          {(['maciek', 'myrna'] as const).map((id) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={selectedPlayer === id}
              onClick={() => handlePlayerChange(id)}
              className={`${segment(selectedPlayer === id)} ${
                selectedPlayer === id ? (id === 'maciek' ? '!text-owner-300' : '!text-guest-300') : ''
              }`}
            >
              {players[id].name}
            </button>
          ))}
        </div>

        <span className="num shrink-0 text-caption text-muted">
          {unlockedCount} of {badges.length} unlocked
        </span>
      </div>

      {/* Filter Tabs */}
      <div role="tablist" aria-label="Filter badges by unlock state" className={`${segmentTrack} grid-cols-3`}>
        {([
          { id: 'all', label: 'All' },
          { id: 'unlocked', label: 'Unlocked' },
          { id: 'locked', label: 'Locked' },
        ] as const).map((option) => (
          <button
            key={option.id}
            type="button"
            role="tab"
            aria-selected={filter === option.id}
            onClick={() => handleFilterChange(option.id)}
            className={segment(filter === option.id)}
          >
            {option.label}
          </button>
        ))}
      </div>

      {/* Badges: one surface, hairline rows */}
      <ul className="surface divide-y divide-[var(--border-subtle)] px-4">
        {filteredBadges.map(({ badge, isUnlocked, progress, currentValue }) => (
          <li key={badge.id} className="flex items-start gap-3 py-3.5">
            <div
              aria-hidden="true"
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                isUnlocked ? 'bg-player-500/15 text-player-300' : 'bg-[var(--surface-2)] text-muted'
              }`}
            >
              {isUnlocked ? renderBadgeIcon(badge.icon) : <Lock className="h-4 w-4" />}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <h4 className={`truncate text-label font-semibold ${isUnlocked ? 'text-foreground' : 'text-secondary'}`}>
                  {badge.title}
                </h4>
                {isUnlocked ? (
                  <CheckCircle2 aria-label="Unlocked" className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <span className="num shrink-0 text-caption text-muted">{progress}%</span>
                )}
              </div>

              <p className="mt-0.5 text-caption text-secondary">{badge.description}</p>

              {!isUnlocked && (
                <div
                  role="progressbar"
                  aria-valuenow={currentValue}
                  aria-valuemin={0}
                  aria-valuemax={badge.targetCount}
                  aria-label={`${badge.title} progress: ${currentValue} of ${badge.targetCount}`}
                  className="mt-2 flex items-center gap-3"
                >
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--surface-3)]">
                    <div className="h-full rounded-full bg-player-500" style={{ width: `${progress}%` }} />
                  </div>
                  <span className="num shrink-0 text-caption text-muted">
                    {currentValue} / {badge.targetCount}
                  </span>
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
