'use client';

import React, { useState } from 'react';
import { useStore } from '@/lib/store';
import { HabitCard } from './HabitCard';
import { ProofGalleryModal } from './ProofGalleryModal';
import { DateNavigator } from './DateNavigator';
import { ActivityFeed } from './ActivityFeed';
import { formatFriendlyDate } from '@/lib/date-utils';
import {
  BedDouble,
  Camera,
  CheckCircle2,
  ChevronRight,
  Clock,
  Sparkles,
  Trophy,
} from 'lucide-react';
import { soundEngine } from '@/lib/sound-utils';
import { hapticLight } from '@/lib/haptic-utils';

export function TodayView() {
  const {
    activeHabits,
    isHabitCompletedOnDate,
    selectedDate,
    isTodaySelected,
    checkIns,
    activePlayer,
    partnerId,
    players,
    partnerCleanSpaceCheckIn,
    partnerCleanSpaceHabit,
    isRestDay,
  } = useStore();

  const [activeSubTab, setActiveSubTab] = useState<'ritual' | 'feed'>('ritual');
  const [selectedProofIndex, setSelectedProofIndex] = useState<number | null>(null);

  const totalPossible = 240;

  // Calculate points and completion specifically for selectedDate
  const currentLogs = checkIns.filter(
    (c) => c.playerId === activePlayer?.id && c.date === selectedDate
  );
  const selectedDatePoints = currentLogs.reduce((acc, c) => acc + c.pointsEarned, 0);

  const completedCount = activeHabits.filter((h) => isHabitCompletedOnDate(h.id, selectedDate)).length;
  const totalCount = activeHabits.length;
  const allDone = completedCount === totalCount && totalCount > 0;
  const isParMet = selectedDatePoints >= totalPossible;

  // Separate uncompleted and completed habits for crisp daily focus
  const pendingHabits = activeHabits.filter((h) => !isHabitCompletedOnDate(h.id, selectedDate));
  const doneHabits = activeHabits.filter((h) => isHabitCompletedOnDate(h.id, selectedDate));

  const isMaciek = activePlayer?.id === 'maciek';
  const partner = partnerId ? players[partnerId] : null;

  const isRest = isRestDay(selectedDate);

  const partnerProofPhotos = partnerCleanSpaceCheckIn?.proofUrls && partnerCleanSpaceCheckIn.proofUrls.length > 0
    ? partnerCleanSpaceCheckIn.proofUrls
    : partnerCleanSpaceCheckIn?.proofUrl
    ? [partnerCleanSpaceCheckIn.proofUrl]
    : [];

  const handleSubTabChange = (tab: 'ritual' | 'feed') => {
    soundEngine.playClick();
    hapticLight();
    setActiveSubTab(tab);
  };

  return (
    <div className="space-y-3.5 pb-24">
      {/* Sub-tab segmented pill switch */}
      <div className="flex p-1 rounded-2xl glass-panel bg-zinc-900/60 border border-white/[0.08]">
        <button
          onClick={() => handleSubTabChange('ritual')}
          className={`flex-1 py-1.5 rounded-xl text-xs font-mono font-medium transition-all duration-200 ${
            activeSubTab === 'ritual'
              ? 'bg-white/[0.1] text-white shadow-sm font-semibold'
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          Daily Ritual ⚡
        </button>
        <button
          onClick={() => handleSubTabChange('feed')}
          className={`flex-1 py-1.5 rounded-xl text-xs font-mono font-medium transition-all duration-200 ${
            activeSubTab === 'feed'
              ? 'bg-white/[0.1] text-white shadow-sm font-semibold'
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          Couples Feed ✨
        </button>
      </div>

      {activeSubTab === 'feed' ? (
        <ActivityFeed />
      ) : (
        <>
          {/* Interactive 7-Day Date Navigator */}
          <DateNavigator />

          {/* Rest Day Announcement Banner */}
          {isRest && (
            <div className="rounded-2xl bg-indigo-950/40 border border-indigo-500/30 p-3.5 text-center space-y-1 shadow-[0_0_15px_rgba(99,102,241,0.15)] animate-in fade-in duration-300">
              <div className="flex items-center justify-center gap-2 text-indigo-300 font-semibold text-xs">
                <BedDouble className="w-4 h-4 text-indigo-400" />
                <span>Rest & Recovery Day Active</span>
              </div>
              <p className="text-[11px] text-indigo-200/80 font-sans">
                Scheduled rest day for {formatFriendlyDate(selectedDate)}. Your streak is protected while you recharge.
              </p>
            </div>
          )}

          {/* Daily Progress Overview Card */}
          <div className="rounded-2xl glass-card border border-white/[0.09] p-4.5 shadow-xl relative overflow-hidden">
            {/* Ambient subtle corner glow based on player */}
            <div
              className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl pointer-events-none ${
                isMaciek ? 'bg-blue-500/10' : 'bg-pink-500/10'
              }`}
            />

            <div className="flex items-start justify-between mb-3 relative z-10">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-medium">
                  {isTodaySelected ? 'Daily Par Goal' : `Score for ${formatFriendlyDate(selectedDate)}`}
                </span>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className="text-3xl font-extrabold font-mono tracking-tight text-white drop-shadow-sm">
                    {selectedDatePoints}
                  </span>
                  <span className="text-xs font-mono text-zinc-400 font-medium">
                    / {totalPossible} pts
                  </span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-medium">
                  Habits Done
                </span>
                <div className="text-xs font-bold font-mono text-white mt-0.5 bg-white/[0.05] px-2 py-0.5 rounded-md border border-white/[0.08]">
                  {completedCount} / {totalCount}
                </div>
              </div>
            </div>

            {/* Glowing progress track */}
            <div className="w-full h-2 rounded-full bg-zinc-800/80 overflow-hidden relative z-10 shadow-inner">
              <div
                className={`h-full rounded-full transition-all duration-700 ease-out ${
                  isParMet
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-400 shadow-[0_0_10px_#34d399]'
                    : isMaciek
                    ? 'bg-gradient-to-r from-blue-600 to-blue-400 shadow-[0_0_8px_#60a5fa]'
                    : 'bg-gradient-to-r from-pink-600 to-pink-400 shadow-[0_0_8px_#f472b6]'
                }`}
                style={{ width: `${Math.min(100, (selectedDatePoints / totalPossible) * 100)}%` }}
              />
            </div>

            {isParMet ? (
              <div className="mt-3 flex items-center justify-center gap-1.5 text-xs font-medium text-emerald-300 bg-emerald-500/10 py-1.5 px-3 rounded-xl border border-emerald-500/25 shadow-[0_0_12px_rgba(16,185,129,0.15)] relative z-10">
                <Trophy className="w-3.5 h-3.5 text-emerald-400" />
                <span>{allDone ? 'Daily Par Complete! All habits checked in.' : `Daily Par Complete! (+${selectedDatePoints} pts earned)`}</span>
              </div>
            ) : (
              <div className="mt-2.5 flex items-center justify-between text-[11px] text-zinc-400 font-mono relative z-10">
                <span>{Math.max(0, totalPossible - selectedDatePoints)} pts to daily par</span>
                <span className="font-semibold text-zinc-300">
                  {Math.round((selectedDatePoints / totalPossible) * 100)}%
                </span>
              </div>
            )}
          </div>

          {/* Partner's Clean Space Accountability Card */}
          {partner && (
            <div className="rounded-2xl glass-card border border-white/[0.08] p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-2.5">
                  <span className="text-lg">{partner.avatar}</span>
                  <div>
                    <h3 className="text-xs font-semibold text-white">
                      {partner.name}&apos;s Clean Space
                    </h3>
                    <span className="text-[10px] font-mono text-zinc-400">
                      {isTodaySelected ? 'Daily Photo Accountability' : `Date: ${selectedDate}`}
                    </span>
                  </div>
                </div>

                {partnerCleanSpaceCheckIn ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/25 font-semibold shadow-xs">
                    <CheckCircle2 className="w-3 h-3" />
                    Verified
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] font-mono text-zinc-400 bg-zinc-900 px-2.5 py-0.5 rounded-full border border-white/[0.06]">
                    <Clock className="w-3 h-3 text-zinc-500" />
                    Pending
                  </span>
                )}
              </div>

              {partnerCleanSpaceCheckIn ? (
                partnerProofPhotos.length > 0 ? (
                  <div className="space-y-2.5">
                    <p className="text-xs text-zinc-300">
                      {partner.name} uploaded {partnerProofPhotos.length} {partnerProofPhotos.length === 1 ? 'photo' : 'photos'} of their clean space:
                    </p>

                    {/* Inline Thumbnail Gallery */}
                    <div className="flex items-center gap-2 overflow-x-auto py-1">
                      {partnerProofPhotos.map((photo, idx) => (
                        <button
                          key={idx}
                          onClick={() => setSelectedProofIndex(idx)}
                          className="relative rounded-xl overflow-hidden aspect-video w-24 sm:w-28 flex-shrink-0 border border-white/[0.08] hover:border-zinc-400 transition-all group focus:outline-none"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={photo}
                            alt={`${partner.name}'s proof thumbnail ${idx + 1}`}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                          />
                          <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                            <Camera className="w-4 h-4 text-white opacity-80 group-hover:opacity-100" />
                          </div>
                          <span className="absolute bottom-1 right-1 bg-black/70 text-white text-[9px] font-mono px-1 rounded">
                            #{idx + 1}
                          </span>
                        </button>
                      ))}

                      <button
                        onClick={() => setSelectedProofIndex(0)}
                        className="flex flex-col items-center justify-center aspect-video w-20 flex-shrink-0 rounded-xl bg-zinc-900 border border-white/[0.08] hover:border-zinc-500 text-zinc-400 hover:text-white transition-colors"
                      >
                        <ChevronRight className="w-4 h-4" />
                        <span className="text-[9px] font-mono mt-0.5">View all</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-zinc-400 italic">
                    {partner.name} checked off Clean Space without attaching photos for this date.
                  </p>
                )
              ) : (
                <p className="text-xs text-zinc-400">
                  Waiting for {partner.name} to upload proof photos for Clean Space ⏳
                </p>
              )}
            </div>
          )}

          {/* Pending Habits to Complete */}
          {pendingHabits.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between px-1 pt-1">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 font-mono">
                  Incomplete ({pendingHabits.length})
                </span>
              </div>
              <div className="space-y-2">
                {pendingHabits.map((habit) => (
                  <HabitCard key={habit.id} habit={habit} />
                ))}
              </div>
            </div>
          )}

          {/* Completed Habits */}
          {doneHabits.length > 0 && (
            <div className="space-y-2 pt-2">
              <div className="flex items-center gap-1.5 px-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-zinc-500" />
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 font-mono">
                  Completed ({doneHabits.length})
                </span>
              </div>
              <div className="space-y-2">
                {doneHabits.map((habit) => (
                  <HabitCard key={habit.id} habit={habit} />
                ))}
              </div>
            </div>
          )}

          {activeHabits.length === 0 && (
            <div className="rounded-2xl border border-white/[0.08] glass-card p-8 text-center text-zinc-400">
              <Sparkles className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
              <p className="text-sm font-semibold text-white">No habits configured yet</p>
              <p className="text-xs text-zinc-500 mt-1">Visit Vault to configure your daily habits.</p>
            </div>
          )}

          {/* Partner Proof Gallery Modal */}
          {selectedProofIndex !== null && partner && partnerProofPhotos.length > 0 && (
            <ProofGalleryModal
              isOpen={selectedProofIndex !== null}
              onClose={() => setSelectedProofIndex(null)}
              playerName={partner.name}
              playerAvatar={partner.avatar}
              habitTitle={partnerCleanSpaceHabit?.title || 'Clean Space'}
              images={partnerProofPhotos}
              date={partnerCleanSpaceCheckIn?.date}
              completedAt={partnerCleanSpaceCheckIn?.completedAt}
              initialIndex={selectedProofIndex}
            />
          )}
        </>
      )}
    </div>
  );
}
