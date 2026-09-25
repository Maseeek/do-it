'use client';

import React, { useState } from 'react';
import { useStore } from '@/lib/store';
import { HabitCard } from './HabitCard';
import { ProofGalleryModal } from './ProofGalleryModal';
import { DateNavigator } from './DateNavigator';
import { ActivityFeed } from './ActivityFeed';
import {
  BedDouble,
  Camera,
  CheckCircle2,
  Clock,
  Sparkles,
} from 'lucide-react';
import { soundEngine } from '@/lib/sound-utils';
import { hapticLight, hapticCelebration } from '@/lib/haptic-utils';
import { fireCelebrationConfetti } from '@/lib/confetti';

export function TodayView() {
  const {
    activeHabits,
    isHabitCompletedOnDate,
    selectedDate,
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

  // Calculate points specifically for selectedDate
  const currentLogs = checkIns.filter(
    (c) => c.playerId === activePlayer?.id && c.date === selectedDate
  );
  const selectedDatePoints = currentLogs.reduce((acc, c) => acc + c.pointsEarned, 0);

  const completedCount = activeHabits.filter((h) => isHabitCompletedOnDate(h.id, selectedDate)).length;
  const totalCount = activeHabits.length;
  const allDone = completedCount === totalCount && totalCount > 0;
  const pct = Math.min(100, Math.round((selectedDatePoints / totalPossible) * 100));

  const prevPointsRef = React.useRef(selectedDatePoints);
  React.useEffect(() => {
    if (selectedDatePoints >= totalPossible && prevPointsRef.current < totalPossible) {
      soundEngine.playFanfare();
      fireCelebrationConfetti();
      hapticCelebration();
    }
    prevPointsRef.current = selectedDatePoints;
  }, [selectedDatePoints, totalPossible]);

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

  // Ring geometry
  const radius = 24;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (pct / 100) * circumference;

  return (
    <div className="space-y-4">
      {/* Apple Segmented Control: Today vs Activity */}
      <div className="flex p-1 rounded-full bg-[#1c1c1e] border border-white/[0.08]">
        <button
          onClick={() => {
            soundEngine.playClick();
            hapticLight();
            setActiveSubTab('ritual');
          }}
          className={`flex-1 py-1.5 rounded-full text-xs font-medium transition-all ${
            activeSubTab === 'ritual'
              ? 'bg-[#2c2c2e] text-white shadow-sm font-semibold'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          Daily Ritual
        </button>
        <button
          onClick={() => {
            soundEngine.playClick();
            hapticLight();
            setActiveSubTab('feed');
          }}
          className={`flex-1 py-1.5 rounded-full text-xs font-medium transition-all ${
            activeSubTab === 'feed'
              ? 'bg-[#2c2c2e] text-white shadow-sm font-semibold'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          Activity
        </button>
      </div>

      {activeSubTab === 'feed' ? (
        <ActivityFeed />
      ) : (
        <>
          {/* Week Date Strip */}
          <DateNavigator />

          {/* Rest Day Pill Card */}
          {isRest && (
            <div className="rounded-2xl bg-indigo-950/30 border border-indigo-500/20 p-3 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-300">
                  <BedDouble className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-indigo-200">Rest & Recovery Day</div>
                  <div className="text-[11px] text-indigo-300/70">Streak protected</div>
                </div>
              </div>
              <span className="text-[10px] font-medium text-indigo-300 bg-indigo-500/20 px-2 py-0.5 rounded-full">
                Active
              </span>
            </div>
          )}

          {/* Apple Fitness Activity Summary Card */}
          <div className="rounded-2xl bg-[#1c1c1e] border border-white/[0.08] p-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Circular Progress Ring */}
              <div className="relative w-16 h-16 flex items-center justify-center flex-shrink-0">
                <svg className="w-16 h-16 -rotate-90" viewBox="0 0 60 60">
                  <circle
                    cx="30"
                    cy="30"
                    r={radius}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="5"
                    className="text-white/[0.08]"
                  />
                  <circle
                    cx="30"
                    cy="30"
                    r={radius}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="5"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    className={`transition-all duration-700 ${
                      pct >= 100
                        ? 'text-emerald-400'
                        : isRest
                        ? 'text-indigo-400'
                        : isMaciek
                        ? 'text-blue-500'
                        : 'text-pink-500'
                    }`}
                  />
                </svg>
                <span className={`absolute text-xs font-bold font-mono ${pct >= 100 ? 'text-emerald-400' : 'text-white'}`}>
                  {pct}%
                </span>
              </div>

              {/* Score metrics */}
              <div>
                <div className="flex items-baseline gap-1.5">
                  <span className={`text-2xl font-bold tracking-tight tabular-nums ${pct >= 100 ? 'text-emerald-400' : 'text-white'}`}>
                    {selectedDatePoints}
                  </span>
                  <span className="text-xs text-zinc-400">/ {totalPossible} pts</span>
                </div>
                <div className="text-xs text-zinc-400 mt-0.5">
                  {completedCount} of {totalCount} completed
                </div>
              </div>
            </div>

            {/* Status Badge */}
            {pct >= 100 ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {allDone ? 'All Done' : 'Par Met'}
              </span>
            ) : (
              <span className="text-xs text-zinc-400 tabular-nums">
                {Math.max(0, totalPossible - selectedDatePoints)} left
              </span>
            )}
          </div>

          {/* Partner Clean Space Accountability Card */}
          {partner && (
            <div className="rounded-2xl bg-[#1c1c1e] border border-white/[0.08] p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm">{partner.avatar}</span>
                  <span className="text-xs font-semibold text-white">
                    {partner.name}&apos;s Clean Space
                  </span>
                </div>

                {partnerCleanSpaceCheckIn ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    <CheckCircle2 className="w-3 h-3" />
                    Verified
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium text-zinc-400 bg-white/[0.04] px-2 py-0.5 rounded-full border border-white/[0.06]">
                    <Clock className="w-3 h-3 text-zinc-500" />
                    Pending
                  </span>
                )}
              </div>

              {partnerCleanSpaceCheckIn && partnerProofPhotos.length > 0 && (
                <div className="flex items-center gap-2 overflow-x-auto py-0.5">
                  {partnerProofPhotos.map((photo, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        soundEngine.playClick();
                        hapticLight();
                        setSelectedProofIndex(idx);
                      }}
                      className="relative rounded-xl overflow-hidden aspect-video w-24 flex-shrink-0 border border-white/[0.1] hover:border-zinc-400 transition-all active:scale-95"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photo}
                        alt="Proof thumbnail"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                        <Camera className="w-3.5 h-3.5 text-white/90" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Incomplete Habits */}
          {pendingHabits.length > 0 && (
            <div className="space-y-2">
              <div className="space-y-2">
                {pendingHabits.map((habit) => (
                  <HabitCard key={habit.id} habit={habit} />
                ))}
              </div>
            </div>
          )}

          {/* Completed Habits */}
          {doneHabits.length > 0 && (
            <div className="space-y-2 pt-1">
              <div className="text-[11px] font-medium text-zinc-500 px-1 uppercase tracking-wider">
                Completed · {doneHabits.length}
              </div>
              <div className="space-y-2">
                {doneHabits.map((habit) => (
                  <HabitCard key={habit.id} habit={habit} />
                ))}
              </div>
            </div>
          )}

          {activeHabits.length === 0 && (
            <div className="rounded-2xl border border-white/[0.08] bg-[#1c1c1e] p-8 text-center text-zinc-400">
              <Sparkles className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
              <p className="text-sm font-medium text-white">No habits configured</p>
            </div>
          )}

          {/* Partner Proof Gallery Lightbox */}
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
