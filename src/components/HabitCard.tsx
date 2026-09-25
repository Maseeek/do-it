'use client';

import React, { useState } from 'react';
import { Habit } from '@/lib/types';
import { useStore } from '@/lib/store';
import { HabitIcon } from './HabitIcon';
import { ProofModal } from './ProofModal';
import { ProofGalleryModal } from './ProofGalleryModal';
import { calculateHabitStreak } from '@/lib/score-calculator';
import { BookOpen, Camera, Check, Flame, MessageSquare, MessageSquarePlus, Minus, Plus, Sparkles, X } from 'lucide-react';
import { soundEngine } from '@/lib/sound-utils';
import { hapticLight, hapticMedium } from '@/lib/haptic-utils';

export function HabitCard({ habit }: { habit: Habit }) {
  const {
    toggleHabit,
    updateCheckInNote,
    isHabitCompletedOnDate,
    getHabitCheckInOnDate,
    selectedDate,
    isTodaySelected,
    checkIns,
    activePlayer,
    partnerId,
    players,
    partnerCleanSpaceCheckIn,
    partnerCleanSpaceHabit,
  } = useStore();

  const [isProofModalOpen, setIsProofModalOpen] = useState(false);
  const [showFullProof, setShowFullProof] = useState(false);
  const [showPartnerProof, setShowPartnerProof] = useState(false);
  const [showQtyLogger, setShowQtyLogger] = useState(false);
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [noteText, setNoteText] = useState('');

  const completed = isHabitCompletedOnDate(habit.id, selectedDate);
  const checkIn = getHabitCheckInOnDate(habit.id, selectedDate);

  const isMaciek = activePlayer?.id === 'maciek';
  const partnerPlayer = partnerId ? players[partnerId] : null;

  const proofPhotos = checkIn?.proofUrls && checkIn.proofUrls.length > 0
    ? checkIn.proofUrls
    : checkIn?.proofUrl
    ? [checkIn.proofUrl]
    : [];

  const partnerProofPhotos = partnerCleanSpaceCheckIn?.proofUrls && partnerCleanSpaceCheckIn.proofUrls.length > 0
    ? partnerCleanSpaceCheckIn.proofUrls
    : partnerCleanSpaceCheckIn?.proofUrl
    ? [partnerCleanSpaceCheckIn.proofUrl]
    : [];

  const isCleanSpace = habit.category === 'environment' && habit.requiresProof;

  const [quantity, setQuantity] = useState<number>(checkIn?.quantity || habit.maxQuantity || 25);
  const habitStreak = calculateHabitStreak(habit, checkIns);

  const handleToggle = () => {
    soundEngine.playClick();
    hapticLight();

    if (habit.isQuantitative) {
      if (completed) {
        toggleHabit(habit.id, undefined, undefined, undefined, selectedDate);
      } else {
        setShowQtyLogger(true);
      }
      return;
    }

    if (completed) {
      toggleHabit(habit.id, undefined, undefined, undefined, selectedDate);
    } else {
      if (habit.requiresProof && proofPhotos.length === 0) {
        setIsProofModalOpen(true);
      } else {
        toggleHabit(habit.id, undefined, undefined, undefined, selectedDate);
      }
    }
  };

  const handleProofConfirmed = (proofUrls?: string[]) => {
    toggleHabit(habit.id, proofUrls, undefined, undefined, selectedDate);
  };

  const handleLogQuantity = (qty: number) => {
    soundEngine.playClick();
    hapticMedium();
    setQuantity(qty);
    toggleHabit(habit.id, undefined, qty, undefined, selectedDate);
    setShowQtyLogger(false);
  };

  const handleSaveNote = (e: React.FormEvent) => {
    e.preventDefault();
    soundEngine.playClick();
    if (checkIn) {
      updateCheckInNote(checkIn.id, noteText.trim());
    } else {
      toggleHabit(habit.id, undefined, undefined, noteText.trim(), selectedDate);
    }
    setIsEditingNote(false);
  };

  const openNoteEditor = () => {
    soundEngine.playClick();
    setNoteText(checkIn?.note || '');
    setIsEditingNote(true);
  };

  return (
    <>
      <div
        className={`group relative rounded-2xl p-3.5 transition-all duration-200 border ${
          completed
            ? 'bg-zinc-950/40 border-white/[0.04] opacity-80'
            : 'glass-card-interactive hover:border-white/20'
        }`}
      >
        <div className="flex items-center gap-3">
          {/* Tactile Check Button */}
          <button
            onClick={handleToggle}
            aria-label={completed ? `Mark ${habit.title} incomplete` : `Mark ${habit.title} completed`}
            className={`relative flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-200 active:scale-90 focus:outline-none ${
              completed
                ? isMaciek
                  ? 'bg-blue-500 border border-blue-400 text-white shadow-[0_0_12px_rgba(59,130,246,0.4)] animate-check-bounce'
                  : 'bg-pink-500 border border-pink-400 text-white shadow-[0_0_12px_rgba(236,72,153,0.4)] animate-check-bounce'
                : 'border border-zinc-700/80 bg-zinc-900/80 hover:border-zinc-500 text-transparent hover:text-zinc-600'
            }`}
          >
            <Check className="w-4 h-4 stroke-[3]" />
          </button>

          {/* Middle: Habit Details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="w-3.5 h-3.5 text-zinc-400">
                <HabitIcon name={habit.iconName} className="w-3.5 h-3.5" />
              </span>

              <span
                className={`text-[10px] uppercase font-mono font-medium tracking-wider ${
                  completed ? 'text-zinc-500' : 'text-zinc-400'
                }`}
              >
                {habit.category.replace('_', ' ')}
              </span>

              {/* Weekly Frequency Target Badge */}
              {habit.weeklyTargetDays && (
                <span className="inline-flex items-center text-[9px] font-mono text-zinc-400 bg-white/[0.04] px-1.5 py-0.2 rounded border border-white/[0.08]">
                  {habit.weeklyTargetDays}x/wk
                </span>
              )}

              {/* Individual Habit Streak Badge */}
              {habitStreak >= 2 && (
                <span
                  className="inline-flex items-center gap-0.5 text-[9px] font-mono font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.2 rounded border border-amber-500/20"
                  title={`${habitStreak}-day habit streak`}
                >
                  <Flame className="w-2.5 h-2.5 text-amber-400 animate-flame-pulse" />
                  {habitStreak}d
                </span>
              )}

              {habit.points >= 40 && (
                <span className="inline-flex items-center gap-0.5 text-[9px] font-mono text-amber-400 bg-amber-400/10 px-1.5 py-0.2 rounded border border-amber-400/20 font-medium">
                  <Sparkles className="w-2.5 h-2.5" />
                  Key
                </span>
              )}

              {!isTodaySelected && (
                <span className="text-[9px] font-mono text-amber-400/90 bg-amber-400/10 px-1.5 rounded">
                  {selectedDate}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 mt-0.5">
              <span
                className={`text-sm font-semibold tracking-tight truncate ${
                  completed ? 'line-through text-zinc-500' : 'text-zinc-100'
                }`}
              >
                {habit.title}
              </span>
            </div>

            <p className="text-[11px] text-zinc-400 truncate mt-0.5">
              {completed && checkIn?.quantity
                ? `Logged ${checkIn.quantity} ${habit.quantityUnit || 'units'} (+${checkIn.pointsEarned} pts)`
                : habit.description}
            </p>

            {/* Micro-note preview block */}
            {checkIn?.note && (
              <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-zinc-300 font-sans italic bg-zinc-900/60 border border-white/[0.06] rounded-lg px-2.5 py-1 max-w-fit shadow-xs">
                <MessageSquare className="w-3 h-3 text-blue-400 flex-shrink-0" />
                <span className="truncate">&ldquo;{checkIn.note}&rdquo;</span>
              </div>
            )}
          </div>

          {/* Right: Point Pill & Quick Actions */}
          <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
            <button
              onClick={() => {
                if (habit.isQuantitative) setShowQtyLogger(true);
              }}
              className={`text-xs font-mono font-bold px-2 py-0.5 rounded-lg border transition-all ${
                completed
                  ? 'bg-zinc-900/40 border-white/[0.04] text-zinc-500'
                  : habit.isQuantitative
                  ? 'bg-blue-500/10 border-blue-500/30 text-blue-300 hover:bg-blue-500/20'
                  : 'bg-zinc-900 border-white/[0.08] text-white hover:border-white/20'
              }`}
            >
              +{completed ? checkIn?.pointsEarned || habit.points : habit.points}
            </button>

            <div className="flex items-center gap-1">
              {/* Note Icon Button */}
              <button
                onClick={openNoteEditor}
                className="p-1 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.04] transition-colors focus:outline-none"
                title={checkIn?.note ? 'Edit reflection' : 'Add reflection note'}
              >
                {checkIn?.note ? (
                  <MessageSquare className="w-3.5 h-3.5 text-blue-400" />
                ) : (
                  <MessageSquarePlus className="w-3.5 h-3.5" />
                )}
              </button>

              {/* Uploaded Proof Photos Pill */}
              {proofPhotos.length > 0 && (
                <button
                  onClick={() => setShowFullProof(true)}
                  className="flex items-center gap-1 text-[10px] font-mono text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 px-1.5 py-0.5 rounded-md border border-emerald-500/30 transition-colors"
                  title="View your uploaded proof photos"
                >
                  <Camera className="w-3 h-3" />
                  <span>{proofPhotos.length}</span>
                </button>
              )}
            </div>

            {/* If quantitative and completed, allow editing pages */}
            {habit.isQuantitative && completed && (
              <button
                onClick={() => setShowQtyLogger(true)}
                className="text-[10px] font-mono text-zinc-400 hover:text-white underline decoration-zinc-600"
              >
                Edit pages
              </button>
            )}
          </div>
        </div>

        {/* Inline Micro-Note Editor */}
        {isEditingNote && (
          <form onSubmit={handleSaveNote} className="mt-2.5 pt-2 border-t border-white/[0.06] flex gap-1.5">
            <input
              type="text"
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Add reflection or workout details (e.g. 5km run, 90kg bench)..."
              autoFocus
              className="flex-1 px-3 py-1.5 rounded-xl bg-zinc-900 border border-white/[0.08] text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500"
            />
            <button
              type="submit"
              className="px-3 py-1.5 rounded-xl bg-white text-black text-xs font-semibold hover:bg-zinc-200 transition-colors"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => setIsEditingNote(false)}
              className="p-1.5 rounded-xl border border-white/[0.08] text-zinc-500 hover:text-zinc-300"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </form>
        )}

        {/* Clean Space Partner Proof Quick Link */}
        {isCleanSpace && partnerCleanSpaceCheckIn && partnerProofPhotos.length > 0 && (
          <div className="mt-2.5 pt-2 border-t border-white/[0.06] flex items-center justify-between text-[11px] font-mono">
            <span className="text-zinc-400 flex items-center gap-1.5">
              <span>{partnerPlayer?.avatar}</span>
              <span>{partnerPlayer?.name} checked in Clean Space</span>
            </span>
            <button
              type="button"
              onClick={() => setShowPartnerProof(true)}
              className="text-pink-400 hover:text-pink-300 font-medium flex items-center gap-1 bg-pink-500/10 px-2 py-0.5 rounded-lg border border-pink-500/20 transition-colors shadow-xs"
            >
              <Camera className="w-3 h-3" />
              View {partnerPlayer?.name}&apos;s photos ({partnerProofPhotos.length})
            </button>
          </div>
        )}

        {/* Inline Quantitative Reading Logger Drawer */}
        {showQtyLogger && habit.isQuantitative && (
          <div className="mt-3 pt-3 border-t border-white/[0.08] space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-300 font-medium flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-blue-400" />
                How many pages did you read?
              </span>
              <span className="font-mono text-blue-400 font-bold">
                {quantity} {habit.quantityUnit} = +{Math.min(habit.points, quantity)} pts
              </span>
            </div>

            {/* Quick Preset Buttons */}
            <div className="flex items-center gap-2">
              {[10, 15, 20, 25].map((pages) => (
                <button
                  key={pages}
                  onClick={() => handleLogQuantity(pages)}
                  className={`flex-1 py-1.5 rounded-xl text-xs font-mono border transition-all ${
                    quantity === pages
                      ? 'bg-blue-500/20 border-blue-500/50 text-blue-300 font-bold shadow-[0_0_8px_rgba(59,130,246,0.2)]'
                      : 'bg-zinc-900 border-white/[0.08] text-zinc-400 hover:text-white hover:border-white/20'
                  }`}
                >
                  {pages}p
                </button>
              ))}
            </div>

            {/* Stepper + Custom */}
            <div className="flex items-center gap-2 pt-1">
              <div className="flex items-center rounded-xl border border-white/[0.08] bg-zinc-900/80">
                <button
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="p-2 text-zinc-400 hover:text-white"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <input
                  type="number"
                  min="1"
                  max={habit.maxQuantity || 25}
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  className="w-12 text-center text-xs font-mono font-bold bg-transparent text-white focus:outline-none"
                />
                <button
                  onClick={() => setQuantity((q) => Math.min(habit.maxQuantity || 25, q + 1))}
                  className="p-2 text-zinc-400 hover:text-white"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              <button
                onClick={() => handleLogQuantity(quantity)}
                className="flex-1 py-2 rounded-xl bg-white text-black font-semibold text-xs hover:bg-zinc-200 transition-colors shadow-sm"
              >
                Confirm {quantity} Pages
              </button>

              <button
                onClick={() => setShowQtyLogger(false)}
                className="px-3 py-2 rounded-xl border border-white/[0.08] text-xs text-zinc-500 hover:text-zinc-300"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Proof Modal */}
      <ProofModal
        habit={habit}
        isOpen={isProofModalOpen}
        onClose={() => setIsProofModalOpen(false)}
        onConfirm={handleProofConfirmed}
        initialPhotos={proofPhotos}
      />

      {/* Own Proof Gallery Modal */}
      {showFullProof && proofPhotos.length > 0 && (
        <ProofGalleryModal
          isOpen={showFullProof}
          onClose={() => setShowFullProof(false)}
          playerName={activePlayer?.name || 'You'}
          playerAvatar={activePlayer?.avatar || '⚡'}
          habitTitle={habit.title}
          images={proofPhotos}
          date={checkIn?.date}
          completedAt={checkIn?.completedAt}
        />
      )}

      {/* Partner Proof Gallery Modal */}
      {showPartnerProof && partnerProofPhotos.length > 0 && (
        <ProofGalleryModal
          isOpen={showPartnerProof}
          onClose={() => setShowPartnerProof(false)}
          playerName={partnerPlayer?.name || 'Partner'}
          playerAvatar={partnerPlayer?.avatar || '✨'}
          habitTitle={partnerCleanSpaceHabit?.title || 'Clean Space'}
          images={partnerProofPhotos}
          date={partnerCleanSpaceCheckIn?.date}
          completedAt={partnerCleanSpaceCheckIn?.completedAt}
        />
      )}
    </>
  );
}
