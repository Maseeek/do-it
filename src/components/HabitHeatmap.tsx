'use client';

import React, { useState } from 'react';
import { useStore } from '@/lib/store';
import { formatFriendlyDate, getHeatmapDays } from '@/lib/date-utils';
import { PlayerId } from '@/lib/types';
import { soundEngine } from '@/lib/sound-utils';
import { hapticLight } from '@/lib/haptic-utils';
import { X } from 'lucide-react';

export function HabitHeatmap() {
  const { checkIns, activePlayerId, players } = useStore();
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerId>(activePlayerId || 'maciek');
  const [hoveredDay, setHoveredDay] = useState<{ dateStr: string; points: number; count: number } | null>(null);

  const heatmapDays = getHeatmapDays(84);

  const dayStatsMap: Record<string, { points: number; count: number }> = {};
  checkIns
    .filter((c) => c.playerId === selectedPlayer)
    .forEach((c) => {
      const existing = dayStatsMap[c.date] || { points: 0, count: 0 };
      dayStatsMap[c.date] = {
        points: existing.points + c.pointsEarned,
        count: existing.count + 1,
      };
    });

  const isMaciek = selectedPlayer === 'maciek';

  const getIntensityClass = (points: number) => {
    if (points === 0) return 'bg-[#2c2c2e] hover:bg-[#38383a]';
    if (isMaciek) {
      if (points >= 240) return 'bg-blue-500 hover:bg-blue-400 shadow-[0_0_6px_rgba(59,130,246,0.4)]';
      if (points >= 150) return 'bg-blue-600 dark:bg-blue-600 hover:bg-blue-500';
      if (points >= 75) return 'bg-blue-300 dark:bg-blue-800 hover:bg-blue-400 dark:hover:bg-blue-700';
      return 'bg-blue-100 dark:bg-blue-950 hover:bg-blue-200 dark:hover:bg-blue-900';
    } else {
      if (points >= 240) return 'bg-pink-500 hover:bg-pink-400 shadow-[0_0_6px_rgba(236,72,153,0.4)]';
      if (points >= 150) return 'bg-pink-600 dark:bg-pink-600 hover:bg-pink-500';
      if (points >= 75) return 'bg-pink-300 dark:bg-pink-800 hover:bg-pink-400 dark:hover:bg-pink-700';
      return 'bg-pink-100 dark:bg-pink-950 hover:bg-pink-200 dark:hover:bg-pink-900';
    }
  };

  return (
    <div className="rounded-2xl bg-[#1c1c1e] border border-white/[0.08] p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-zinc-300">
          Consistency (12 Weeks)
        </span>

        {/* Player toggle */}
        <div role="tablist" aria-label="Select player for consistency heatmap" className="flex p-0.5 rounded-full bg-[#2c2c2e] text-xs">
          <button
            role="tab"
            aria-selected={selectedPlayer === 'maciek'}
            onClick={() => {
              if (selectedPlayer !== 'maciek') {
                soundEngine.playClick();
                hapticLight();
                setSelectedPlayer('maciek');
              }
            }}
            className={`px-2.5 py-0.5 rounded-full transition-colors ${
              selectedPlayer === 'maciek'
                ? 'bg-blue-500/20 text-blue-600 dark:text-blue-300 font-semibold'
                : 'text-zinc-500 hover:text-foreground'
            }`}
          >
            {players.maciek.name}
          </button>
          <button
            role="tab"
            aria-selected={selectedPlayer === 'myrna'}
            onClick={() => {
              if (selectedPlayer !== 'myrna') {
                soundEngine.playClick();
                hapticLight();
                setSelectedPlayer('myrna');
              }
            }}
            className={`px-2.5 py-0.5 rounded-full transition-colors ${
              selectedPlayer === 'myrna'
                ? 'bg-pink-500/20 text-pink-600 dark:text-pink-300 font-semibold'
                : 'text-zinc-500 hover:text-foreground'
            }`}
          >
            {players.myrna.name}
          </button>
        </div>
      </div>

      {/* Grid: 12 cols x 7 rows centered with dedicated padding */}
      <div className="flex justify-center items-center py-1 overflow-x-auto no-scrollbar">
        <div className="grid grid-rows-7 grid-flow-col gap-1.5 p-3 rounded-xl bg-black/5 dark:bg-black/30 border border-black/5 dark:border-white/[0.04]">
          {heatmapDays.map((d) => {
            const stats = dayStatsMap[d.dateStr] || { points: 0, count: 0 };
            const isHovered = hoveredDay?.dateStr === d.dateStr;

            return (
              <button
                key={d.dateStr}
                onClick={() => {
                  soundEngine.playClick();
                  hapticLight();
                  setHoveredDay(isHovered ? null : { dateStr: d.dateStr, ...stats });
                }}
                title={`${formatFriendlyDate(d.dateStr)}: ${stats.points} pts (${stats.count} habits)`}
                aria-label={`${formatFriendlyDate(d.dateStr)}: ${stats.points} points, ${stats.count} habits`}
                className={`w-3.5 h-3.5 rounded-xs transition-all active:scale-90 ${getIntensityClass(
                  stats.points
                )} ${isHovered ? 'ring-2 ring-white ring-offset-1 ring-offset-black' : ''}`}
              />
            );
          })}
        </div>
      </div>

      {/* Detail Popover / Legend */}
      <div className="flex items-center justify-between text-[11px] text-zinc-400 px-1">
        {hoveredDay ? (
          <div className="flex items-center gap-2 text-zinc-200">
            <span>
              {formatFriendlyDate(hoveredDay.dateStr)}: <strong className="text-white">{hoveredDay.points} pts</strong> ({hoveredDay.count} habits)
            </span>
            <button
              onClick={() => setHoveredDay(null)}
              aria-label="Close day detail"
              className="text-zinc-500 hover:text-white"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <span>Tap a square for details</span>
        )}

        <div className="flex items-center gap-1.5">
          <span className="text-[10px]">Less</span>
          <div className="flex gap-0.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-[#2c2c2e]" />
            <span className={`w-2.5 h-2.5 rounded-xs ${isMaciek ? 'bg-blue-100 dark:bg-blue-950' : 'bg-pink-100 dark:bg-pink-950'}`} />
            <span className={`w-2.5 h-2.5 rounded-xs ${isMaciek ? 'bg-blue-300 dark:bg-blue-800' : 'bg-pink-300 dark:bg-pink-800'}`} />
            <span className={`w-2.5 h-2.5 rounded-xs ${isMaciek ? 'bg-blue-600 dark:bg-blue-600' : 'bg-pink-600 dark:bg-pink-600'}`} />
            <span className={`w-2.5 h-2.5 rounded-xs ${isMaciek ? 'bg-blue-500 dark:bg-blue-400' : 'bg-pink-500 dark:bg-pink-400'}`} />
          </div>
          <span className="text-[10px]">More</span>
        </div>
      </div>
    </div>
  );
}
