'use client';

import React, { useState } from 'react';
import { useStore } from '@/lib/store';
import { formatFriendlyDate, getHeatmapDays } from '@/lib/date-utils';
import { PlayerId } from '@/lib/types';
import { soundEngine } from '@/lib/sound-utils';
import { hapticLight } from '@/lib/haptic-utils';

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
    if (points === 0) return 'bg-[#2c2c2e]';
    if (isMaciek) {
      if (points >= 240) return 'bg-blue-400';
      if (points >= 150) return 'bg-blue-600';
      if (points >= 75) return 'bg-blue-800';
      return 'bg-blue-950';
    } else {
      if (points >= 240) return 'bg-pink-400';
      if (points >= 150) return 'bg-pink-600';
      if (points >= 75) return 'bg-pink-800';
      return 'bg-pink-950';
    }
  };

  return (
    <div className="rounded-2xl bg-[#1c1c1e] border border-white/[0.08] p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-zinc-300">
          Consistency (12 Weeks)
        </span>

        {/* Player toggle */}
        <div className="flex p-0.5 rounded-full bg-[#2c2c2e] text-xs">
          <button
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

      {/* Grid: 12 cols x 7 rows */}
      <div className="overflow-x-auto pb-1">
        <div className="grid grid-rows-7 grid-flow-col gap-1 w-fit min-w-full justify-between">
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
                className={`w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-xs transition-all ${getIntensityClass(
                  stats.points
                )} ${isHovered ? 'scale-125 ring-2 ring-white z-10' : 'hover:scale-110'}`}
                title={`${formatFriendlyDate(d.dateStr)}: ${stats.points} pts`}
              />
            );
          })}
        </div>
      </div>

      {/* Tooltip / Details */}
      <div className="flex items-center justify-between text-[11px] pt-1 border-t border-white/[0.06]">
        {hoveredDay ? (
          <span className="text-zinc-300">
            {formatFriendlyDate(hoveredDay.dateStr)}: <strong className="text-white">{hoveredDay.points} pts</strong> ({hoveredDay.count} habits)
          </span>
        ) : (
          <span className="text-zinc-500">Tap square for details</span>
        )}

        <div className="flex items-center gap-1 text-[10px] text-zinc-500">
          <span>Less</span>
          <span className="w-2 h-2 rounded-xs bg-[#2c2c2e]" />
          <span className={`w-2 h-2 rounded-xs ${isMaciek ? 'bg-blue-800' : 'bg-pink-800'}`} />
          <span className={`w-2 h-2 rounded-xs ${isMaciek ? 'bg-blue-400' : 'bg-pink-400'}`} />
          <span>240 Par</span>
        </div>
      </div>
    </div>
  );
}
