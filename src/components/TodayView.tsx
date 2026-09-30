'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, BedDouble, Camera, CheckCircle2, Plus } from 'lucide-react';
import { useStore } from '@/lib/store';
import { useMultiplayer } from '@/lib/multiplayer';
import { formatFriendlyDate, getTodayDateString } from '@/lib/date-utils';
import { soundEngine } from '@/lib/sound-utils';
import { hapticCelebration } from '@/lib/haptic-utils';
import { fireCelebrationConfetti } from '@/lib/confetti';
import { HabitCard } from './HabitCard';
import { ProofGalleryModal } from './ProofGalleryModal';
import { DateNavigator } from './DateNavigator';
import { ActivityFeed } from './ActivityFeed';

export function TodayView({ onOpenHabits }: { onOpenHabits: () => void }) {
  const multiplayer = useMultiplayer();
  const {
    activeHabits, isHabitSatisfiedOnDate, selectedDate, checkIns, activePlayer,
    partnerId, players, partnerCleanSpaceCheckIn, partnerCleanSpaceHabit, isRestDay,
  } = useStore();
  const [activeSubTab, setActiveSubTab] = useState<'ritual' | 'feed'>('ritual');
  const [proofIndex, setProofIndex] = useState<number | null>(null);
  const points = checkIns
    .filter((checkIn) => checkIn.playerId === activePlayer?.id && checkIn.date === selectedDate)
    .reduce((sum, checkIn) => sum + checkIn.pointsEarned, 0);
  const par = multiplayer.configured ? activeHabits.reduce((sum, habit) => sum + habit.points, 0) : 240;
  const pending = activeHabits.filter((habit) => !isHabitSatisfiedOnDate(habit.id, selectedDate));
  const done = activeHabits.filter((habit) => isHabitSatisfiedOnDate(habit.id, selectedDate));
  const allDone = activeHabits.length > 0 && pending.length === 0;
  const isRest = isRestDay(selectedDate);
  const partner = partnerId ? players[partnerId] : null;
  const partnerPoints = checkIns
    .filter((checkIn) => checkIn.playerId === partnerId && checkIn.date === selectedDate)
    .reduce((sum, checkIn) => sum + checkIn.pointsEarned, 0);
  const photos = partnerCleanSpaceCheckIn?.proofUrls?.length
    ? partnerCleanSpaceCheckIn.proofUrls
    : partnerCleanSpaceCheckIn?.proofUrl ? [partnerCleanSpaceCheckIn.proofUrl] : [];
  const context = `${activePlayer?.id}:${selectedDate}`;
  const previous = useRef({ context, points, allDone });

  useEffect(() => {
    if (previous.current.context === context && ((points >= par && previous.current.points < par) || (allDone && !previous.current.allDone))) {
      soundEngine.playFanfare();
      fireCelebrationConfetti();
      hapticCelebration();
    }
    previous.current = { context, points, allDone };
  }, [context, points, allDone, par]);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="mb-1 text-xs text-zinc-500">{selectedDate === getTodayDateString() ? 'Today' : formatFriendlyDate(selectedDate)}</p>
          <h1 className="text-3xl font-semibold tracking-tight">Your day</h1>
        </div>
        <div role="tablist" aria-label="Today views" className="flex items-center gap-4 pb-1 text-xs font-medium">
          <button role="tab" aria-selected={activeSubTab === 'ritual'} onClick={() => setActiveSubTab('ritual')} className={activeSubTab === 'ritual' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}>Habits</button>
          <button role="tab" aria-selected={activeSubTab === 'feed'} onClick={() => setActiveSubTab('feed')} className={activeSubTab === 'feed' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}>Activity</button>
        </div>
      </div>

      {activeSubTab === 'feed' ? <ActivityFeed /> : (
        <div className="space-y-6">
          <DateNavigator />
          {isRest && <div className="flex items-center gap-2.5 text-xs text-indigo-300"><BedDouble size={16} /> Rest day · Your streak is protected</div>}

          {activeHabits.length > 0 ? (
            <>
              <section aria-labelledby="pending-heading">
                <div className="mb-3 flex items-baseline justify-between gap-3">
                  <h2 id="pending-heading" className="text-sm font-semibold text-zinc-200">Your habits</h2>
                  <span className="text-xs tabular-nums text-zinc-500">{done.length} of {activeHabits.length} done</span>
                </div>
                {pending.length > 0 ? (
                  <div className="space-y-2">{pending.map((habit) => <HabitCard key={`${context}:${habit.id}`} habit={habit} />)}</div>
                ) : (
                  <div className="flex items-center gap-2.5 rounded-2xl border border-emerald-400/15 bg-emerald-400/[0.05] px-4 py-4 text-sm text-emerald-300"><CheckCircle2 size={18} /> All done for the day.</div>
                )}
              </section>
              {done.length > 0 && (
                <section aria-labelledby="done-heading">
                  <h2 id="done-heading" className="mb-3 text-xs font-medium text-zinc-500">Completed · {done.length}</h2>
                  <div className="space-y-2">{done.map((habit) => <HabitCard key={`${context}:${habit.id}`} habit={habit} />)}</div>
                </section>
              )}
            </>
          ) : (
            <div className="rounded-2xl border border-white/[0.08] bg-[#141518] px-5 py-7">
              <h2 className="text-sm font-semibold">Start with one habit.</h2>
              <p className="mt-1 text-xs text-zinc-400">Add something you want to do today.</p>
              <button onClick={onOpenHabits} className="control control-primary mt-5"><Plus size={15} /> Add a habit</button>
            </div>
          )}

          {partner && (
            <section aria-label={`${partner.name}'s day`} className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.08] pt-5 text-xs">
              <div className="flex items-center gap-2 text-zinc-400">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/[0.07] font-semibold text-zinc-200">{partner.name[0]}</span>
                <span>{partner.name}&apos;s day</span><span className="text-zinc-600">·</span><span className="tabular-nums">{partnerPoints} pts</span>
              </div>
              {photos.length > 0 ? (
                <button onClick={() => setProofIndex(0)} className="flex items-center gap-1.5 text-zinc-300 hover:text-white"><Camera size={14} /> View proof <ArrowUpRight size={13} /></button>
              ) : partnerCleanSpaceCheckIn ? <span className="text-zinc-500">Checked in</span> : null}
            </section>
          )}
        </div>
      )}

      {proofIndex !== null && partner && photos.length > 0 && (
        <ProofGalleryModal
          isOpen onClose={() => setProofIndex(null)} playerName={partner.name}
          playerAvatar={partner.avatar} habitTitle={partnerCleanSpaceHabit?.title || 'Clean Space'}
          images={photos} date={partnerCleanSpaceCheckIn?.date}
          completedAt={partnerCleanSpaceCheckIn?.completedAt} initialIndex={proofIndex}
        />
      )}
    </div>
  );
}
