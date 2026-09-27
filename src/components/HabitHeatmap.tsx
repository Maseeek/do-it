'use client';

import React, { useState } from 'react';
import { useStore } from '@/lib/store';
import { formatFriendlyDate, getHeatmapDays } from '@/lib/date-utils';
import { PlayerId } from '@/lib/types';
import { soundEngine } from '@/lib/sound-utils';
import { hapticLight } from '@/lib/haptic-utils';
import { X } from 'lucide-react';

export function HabitHeatmap() {
  const { checkIns, activePlayerId } = useStore();
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
      if (points >= 240) return 'bg-blue-400 hover:bg-blue-300 shadow-[0_0_6px_rgba(96,165,250,0.5)]';
      if (points >= 150) return 'bg-blue-600 hover:bg-blue-500';
      if (points >= 75) return 'bg-blue-800 hover:bg-blue-700';
      return 'bg-blue-950 hover:bg-blue-900';
    } else {
      if (points >= 240) return 'bg-pink-400 hover:bg-pink-300 shadow-[0_0_6px_rgba(244,114,182,0.5)]';
      if (points >= 150) return 'bg-pink-600 hover:bg-pink-500';
      if (points >= 75) return 'bg-pink-800 hover:bg-pink-700';
      return 'bg-pink-950 hover:bg-pink-900';
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
                ? 'bg-blue-500/20 text-blue-300 font-semibold'
                : 'text-zinc-400'
            }`}
          >
            Maciek
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
                ? 'bg-pink-500/20 text-pink-300 font-semibold'
                : 'text-zinc-400'
            }`}
          >
            Myrna
          </button>
        </div>
      </div>

      {/* Grid: 12 cols x 7 rows centered with dedicated padding */}
      <div className="flex justify-center items-center py-1 overflow-x-auto no-scrollbar">
        <div className="grid grid-rows-7 grid-flow-col gap-1.5 p-3 rounded-xl bg-black/30 border border-white/[0.04]">
          {heatmapDays.map((d) => {
            const stats = dayStatsMap[d.dateStr] || { points: 0, count: 0 };
            const isHovered = hoveredDay?.dateStr === d.dateStr;

            return (
              <button
                key={d.dateStr}
                onClick={() => {
                  soundEngine.playClick();
                  hapticLight();
                  setHoveredDay(isHovered ? null : { dateStr: d.dateStr, points: stats.points, count: stats.count });
                }}
                aria-label={`${formatFriendlyDate(d.dateStr)}: ${stats.points} points, ${stats.count} habits`}
                className={`w-4 h-4 sm:w-4.5 sm:h-4.5 rounded-xs transition-all duration-150 focus:outline-none ${getIntensityClass(
                  stats.points
                )} ${isHovered ? 'scale-115 ring-2 ring-white shadow-lg z-10' : 'hover:scale-110'}`}
                title={`${formatFriendlyDate(d.dateStr)}: ${stats.points} pts`}
              />
            );
          })}
        </div>
      </div>

      {/* Tooltip / Details */}
      <div className="flex items-center justify-between text-[11px] pt-1 border-t border-white/[0.06]">
        {hoveredDay ? (
          <div className="flex items-center gap-1.5 min-w-0 pr-2">
            <span className="text-zinc-300 truncate">
              {formatFriendlyDate(hoveredDay.dateStr)}: <strong className="text-white">{hoveredDay.points} pts</strong> ({hoveredDay.count} habits)
            </span>
            <button
              onClick={() => {
                soundEngine.playClick();
                setHoveredDay(null);
              }}
              aria-label="Clear selection"
              className="text-zinc-500 hover:text-zinc-300 p-0.5 rounded transition-colors"
              title="Clear selection"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <span className="text-zinc-500">Tap square for details</span>
        )}

        <div className="flex items-center gap-1 text-[10px] text-zinc-500 flex-shrink-0">
          <span>Less</span>
          <span className="w-2 h-2 rounded-xs bg-[#2c2c2e]" />
          <span className={`w-2 h-2 rounded-xs ${isMaciek ? 'bg-blue-800' : 'bg-pink-800'}`} />
          <span className={`w-2 h-2 rounded-xs ${isMaciek ? 'bg-blue-600' : 'bg-pink-600'}`} />
          <span className={`w-2 h-2 rounded-xs ${isMaciek ? 'bg-blue-400' : 'bg-pink-400'}`} />
          <span>240 Par</span>
        </div>
      </div>
    </div>
  );
}
