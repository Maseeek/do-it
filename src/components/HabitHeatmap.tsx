'use client';

import React, { useState } from 'react';
import { useStore } from '@/lib/store';
import { formatFriendlyDate, getHeatmapDays } from '@/lib/date-utils';
import { PlayerId } from '@/lib/types';
import { Calendar } from 'lucide-react';

export function HabitHeatmap() {
  const { checkIns, activePlayerId } = useStore();
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerId>(activePlayerId || 'maciek');
  const [hoveredDay, setHoveredDay] = useState<{ dateStr: string; points: number; count: number } | null>(null);

  // Generate 84 days (12 weeks)
  const heatmapDays = getHeatmapDays(84);

  // Map points and count per date for selected player
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

  // Intensity color mapper
  const getIntensityClass = (points: number) => {
    if (points === 0) return 'bg-zinc-900 border-zinc-800/80';
    if (isMaciek) {
      if (points >= 240) return 'bg-blue-400 border-blue-300 shadow-xs shadow-blue-400/50';
      if (points >= 150) return 'bg-blue-600 border-blue-500';
      if (points >= 75) return 'bg-blue-800/80 border-blue-700/80';
      return 'bg-blue-950 border-blue-900/60';
    } else {
      if (points >= 240) return 'bg-pink-400 border-pink-300 shadow-xs shadow-pink-400/50';
      if (points >= 150) return 'bg-pink-600 border-pink-500';
      if (points >= 75) return 'bg-pink-800/80 border-pink-700/80';
      return 'bg-pink-950 border-pink-900/60';
    }
  };

  return (
    <div className="rounded-2xl bg-[#0c0d10] border border-zinc-800/80 p-4 space-y-3 shadow-md">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-zinc-400" />
          <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-300 font-mono">
            Consistency Matrix (12 Weeks)
          </h4>
        </div>

        {/* Player toggle */}
        <div className="flex bg-zinc-900 border border-zinc-800 p-0.5 rounded-lg text-[10px] font-mono">
          <button
            onClick={() => setSelectedPlayer('maciek')}
            className={`px-2 py-0.5 rounded transition-colors ${
              selectedPlayer === 'maciek'
                ? 'bg-blue-500/20 text-blue-300 font-bold'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            ⚡ Maciek
          </button>
          <button
            onClick={() => setSelectedPlayer('myrna')}
            className={`px-2 py-0.5 rounded transition-colors ${
              selectedPlayer === 'myrna'
                ? 'bg-pink-500/20 text-pink-300 font-bold'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            ✨ Myrna
          </button>
        </div>
      </div>

      {/* Grid: 12 columns x 7 rows */}
      <div className="overflow-x-auto pb-1">
        <div className="grid grid-rows-7 grid-flow-col gap-1 w-fit min-w-full justify-between">
          {heatmapDays.map((d) => {
            const stats = dayStatsMap[d.dateStr] || { points: 0, count: 0 };
            const isHovered = hoveredDay?.dateStr === d.dateStr;

            return (
              <button
                key={d.dateStr}
                onClick={() =>
                  setHoveredDay(isHovered ? null : { dateStr: d.dateStr, points: stats.points, count: stats.count })
                }
                className={`w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-xs border transition-all ${getIntensityClass(
                  stats.points
                )} ${isHovered ? 'scale-125 ring-2 ring-white z-10' : 'hover:scale-110'}`}
                title={`${formatFriendlyDate(d.dateStr)}: ${stats.points} pts (${stats.count} habits)`}
              />
            );
          })}
        </div>
      </div>

      {/* Tooltip / Selected Day Details */}
      <div className="flex items-center justify-between text-[11px] font-mono pt-1 border-t border-zinc-800/60">
        {hoveredDay ? (
          <span className="text-zinc-300">
            {formatFriendlyDate(hoveredDay.dateStr)}: <strong className="text-white">{hoveredDay.points} pts</strong> ({hoveredDay.count} habits)
          </span>
        ) : (
          <span className="text-zinc-500">Tap any square for day stats</span>
        )}

        {/* Legend */}
        <div className="flex items-center gap-1 text-[9px] text-zinc-500">
          <span>Less</span>
          <span className="w-2 h-2 rounded-xs bg-zinc-900 border border-zinc-800" />
          <span className={`w-2 h-2 rounded-xs ${isMaciek ? 'bg-blue-950' : 'bg-pink-950'}`} />
          <span className={`w-2 h-2 rounded-xs ${isMaciek ? 'bg-blue-800' : 'bg-pink-800'}`} />
          <span className={`w-2 h-2 rounded-xs ${isMaciek ? 'bg-blue-600' : 'bg-pink-600'}`} />
          <span className={`w-2 h-2 rounded-xs ${isMaciek ? 'bg-blue-400' : 'bg-pink-400'}`} />
          <span>240 Par</span>
        </div>
      </div>
    </div>
  );
}
