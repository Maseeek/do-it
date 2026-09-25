'use client';

import React, { useState } from 'react';
import { Habit } from '@/lib/types';
import { useStore } from '@/lib/store';
import { HabitIcon } from './HabitIcon';
import { ProofModal } from './ProofModal';
import { ProofGalleryModal } from './ProofGalleryModal';
import { calculateHabitStreak } from '@/lib/score-calculator';
import {
  Camera,
  Check,
  Flame,
  MessageSquare,
  Minus,
  Plus,
  X,
} from 'lucide-react';
import { soundEngine } from '@/lib/sound-utils';
import { hapticLight, hapticSuccess } from '@/lib/haptic-utils';

export function HabitCard({ habit }: { habit: Habit }) {
  const {
    toggleHabit,
    updateCheckInNote,
    isHabitCompletedOnDate,
    getHabitCheckInOnDate,
    selectedDate,
    checkIns,
    activePlayer,
    partnerId,
    players,
    partnerCleanSpaceCheckIn,
    partnerCleanSpaceHabit,
    restDays,
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
  const habitStreak = calculateHabitStreak(habit, checkIns, restDays);

  const handleToggle = () => {
    if (habit.isQuantitative) {
      soundEngine.playClick();
      hapticLight();
      if (completed) {
        toggleHabit(habit.id, undefined, undefined, undefined, selectedDate);
      } else {
        setShowQtyLogger(true);
      }
      return;
    }

    if (completed) {
      soundEngine.playUncheck();
      hapticLight();
      toggleHabit(habit.id, undefined, undefined, undefined, selectedDate);
    } else {
      if (habit.requiresProof && proofPhotos.length === 0) {
        soundEngine.playClick();
        hapticLight();
        setIsProofModalOpen(true);
      } else {
        soundEngine.playCheck();
        hapticSuccess();
        toggleHabit(habit.id, undefined, undefined, undefined, selectedDate);
      }
    }
  };

  const handleProofConfirmed = (proofUrls?: string[]) => {
    soundEngine.playCheck();
    hapticSuccess();
    toggleHabit(habit.id, proofUrls, undefined, undefined, selectedDate);
  };

  const handleLogQuantity = (qty: number) => {
    soundEngine.playCheck();
    hapticSuccess();
    setQuantity(qty);
    toggleHabit(habit.id, undefined, qty, undefined, selectedDate);
    setShowQtyLogger(false);
  };

  const handleSaveNote = (e: React.FormEvent) => {
    e.preventDefault();
    soundEngine.playClick();
    hapticLight();
    if (checkIn) {
      updateCheckInNote(checkIn.id, noteText.trim());
    } else {
      toggleHabit(habit.id, undefined, undefined, noteText.trim(), selectedDate);
    }
    setIsEditingNote(false);
  };

  const openNoteEditor = () => {
    soundEngine.playClick();
    hapticLight();
    setNoteText(checkIn?.note || '');
    setIsEditingNote(true);
  };

  return (
    <>
      <div
        className={`group relative rounded-2xl p-3.5 transition-all duration-200 border ${
          completed
            ? 'bg-[#1c1c1e]/60 border-white/[0.04] opacity-80'
            : 'bg-[#1c1c1e] border-white/[0.08] hover:border-white/[0.16]'
        }`}
      >
        <div className="flex items-center gap-3">
          {/* Apple Reminders style circular checkbox */}
          <button
            onClick={handleToggle}
            aria-label={completed ? `Mark ${habit.title} uncompleted` : `Mark ${habit.title} completed`}
            className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-all active:scale-90 ${
              completed
                ? isMaciek
                  ? 'bg-blue-500 text-white'
                  : 'bg-pink-500 text-white'
                : 'border-2 border-zinc-600 hover:border-zinc-400 text-transparent'
            }`}
          >
            <Check className="w-3.5 h-3.5 stroke-[3]" />
          </button>

          {/* Middle: Icon + Title + Metadata */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className={`w-3.5 h-3.5 ${completed ? 'text-zinc-600' : 'text-zinc-400'}`}>
                <HabitIcon name={habit.iconName} className="w-3.5 h-3.5" />
              </span>

              <span
                className={`text-sm font-semibold tracking-tight truncate ${
                  completed ? 'line-through text-zinc-500' : 'text-white'
                }`}
              >
                {habit.title}
              </span>

              {habitStreak >= 2 && (
                <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-amber-400 bg-amber-400/10 px-1.5 py-0.2 rounded-full">
                  <Flame className="w-2.5 h-2.5" />
                  {habitStreak}d
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-zinc-400">
              <span className="capitalize">{habit.category.replace('_', ' ')}</span>
              {habit.weeklyTargetDays && (
                <>
                  <span>•</span>
                  <span>{habit.weeklyTargetDays}x/wk</span>
                </>
              )}
              {completed && checkIn?.quantity && (
                <>
                  <span>•</span>
                  <span>{checkIn.quantity} {habit.quantityUnit || 'units'}</span>
                </>
              )}
            </div>

            {/* Micro-note preview */}
            {checkIn?.note && (
              <div className="mt-1 flex items-center gap-1 text-[11px] text-zinc-300 italic">
                <MessageSquare className="w-2.5 h-2.5 text-zinc-500 flex-shrink-0" />
                <span className="truncate">{checkIn.note}</span>
              </div>
            )}
          </div>

          {/* Right: Points & Quick Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Note icon button */}
            <button
              onClick={openNoteEditor}
              aria-label={checkIn?.note ? `Edit note for ${habit.title}` : `Add note for ${habit.title}`}
              className={`p-1.5 rounded-full transition-colors ${
                checkIn?.note
                  ? 'text-blue-400 bg-blue-500/10'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
              title={checkIn?.note ? 'Edit note' : 'Add note'}
            >
              <MessageSquare className="w-3.5 h-3.5" />
            </button>

            {/* Proof icon if exists */}
            {proofPhotos.length > 0 && (
              <button
                onClick={() => {
                  soundEngine.playClick();
                  hapticLight();
                  setShowFullProof(true);
                }}
                aria-label={`View ${proofPhotos.length} proof photos for ${habit.title}`}
                className="flex items-center gap-1 text-[11px] font-medium text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-500/20 transition-colors"
                title="View proof photos"
              >
                <Camera className="w-3 h-3" />
                <span>{proofPhotos.length}</span>
              </button>
            )}

            {/* Points pill */}
            <button
              onClick={() => {
                if (habit.isQuantitative) {
                  soundEngine.playClick();
                  hapticLight();
                  setShowQtyLogger(true);
                }
              }}
              aria-label={habit.isQuantitative ? `Log quantity for ${habit.title}` : `${habit.points} points`}
              className={`text-xs font-semibold px-2.5 py-1 rounded-full transition-colors ${
                completed
                  ? 'bg-white/[0.04] text-zinc-500'
                  : habit.isQuantitative
                  ? 'bg-blue-500/15 text-blue-400 hover:bg-blue-500/25'
                  : 'bg-white/[0.08] text-white'
              }`}
            >
              +{completed ? checkIn?.pointsEarned || habit.points : habit.points}
            </button>
          </div>
        </div>

        {/* Inline Micro-Note Editor */}
        {isEditingNote && (
          <form onSubmit={handleSaveNote} className="mt-2.5 pt-2 border-t border-white/[0.06] flex gap-1.5">
            <input
              type="text"
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Add reflection or workout details..."
              aria-label={`Reflection note for ${habit.title}`}
              autoFocus
              className="flex-1 px-3 py-1.5 rounded-xl bg-[#2c2c2e] border border-white/[0.08] text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-zinc-400"
            />
            <button
              type="submit"
              className="px-3 py-1.5 rounded-xl bg-white text-black text-xs font-semibold hover:bg-zinc-200 transition-colors"
            >
              Done
            </button>
            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                hapticLight();
                setIsEditingNote(false);
              }}
              aria-label="Cancel note edit"
              className="p-1.5 rounded-xl text-zinc-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </form>
        )}

        {/* Clean Space Partner Proof Quick Link */}
        {isCleanSpace && partnerCleanSpaceCheckIn && partnerProofPhotos.length > 0 && (
          <div className="mt-2.5 pt-2 border-t border-white/[0.06] flex items-center justify-between text-xs">
            <span className="text-zinc-400 flex items-center gap-1.5">
              <span>{partnerPlayer?.avatar}</span>
              <span>{partnerPlayer?.name}&apos;s clean space</span>
            </span>
            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                hapticLight();
                setShowPartnerProof(true);
              }}
              className="text-pink-400 hover:text-pink-300 font-medium flex items-center gap-1 bg-pink-500/10 px-2 py-0.5 rounded-full border border-pink-500/20 transition-colors"
            >
              <Camera className="w-3 h-3" />
              <span>Photos ({partnerProofPhotos.length})</span>
            </button>
          </div>
        )}

        {/* Inline Quantitative Stepper Logger */}
        {showQtyLogger && habit.isQuantitative && (
          <div className="mt-3 pt-3 border-t border-white/[0.08] space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-300 font-medium">
                Pages read
              </span>
              <span className="font-semibold text-blue-400">
                {quantity} {habit.quantityUnit} = +{Math.min(habit.points, quantity)} pts
              </span>
            </div>

            {/* Preset Pills */}
            <div className="flex items-center gap-1.5">
              {[10, 15, 20, 25].map((pages) => (
                <button
                  key={pages}
                  onClick={() => handleLogQuantity(pages)}
                  className={`flex-1 py-1 rounded-xl text-xs font-medium border transition-colors ${
                    quantity === pages
                      ? 'bg-blue-500/20 border-blue-500/50 text-blue-300 font-bold'
                      : 'bg-[#2c2c2e] border-white/[0.08] text-zinc-400 hover:text-white'
                  }`}
                >
                  {pages}p
                </button>
              ))}
            </div>

            {/* Stepper + Custom */}
            <div className="flex items-center gap-2">
              <div className="flex items-center rounded-xl border border-white/[0.08] bg-[#2c2c2e]">
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    hapticLight();
                    setQuantity((q) => Math.max(1, q - 1));
                  }}
                  aria-label="Decrease quantity"
                  className="p-1.5 text-zinc-400 hover:text-white"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <input
                  type="number"
                  min="1"
                  max={habit.maxQuantity || 25}
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  aria-label="Quantity value"
                  className="w-10 text-center text-xs font-semibold bg-transparent text-white focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    hapticLight();
                    setQuantity((q) => Math.min(habit.maxQuantity || 25, q + 1));
                  }}
                  aria-label="Increase quantity"
                  className="p-1.5 text-zinc-400 hover:text-white"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              <button
                onClick={() => handleLogQuantity(quantity)}
                className="flex-1 py-1.5 rounded-xl bg-white text-black font-semibold text-xs hover:bg-zinc-200 transition-colors"
              >
                Log {quantity} Pages
              </button>

              <button
                onClick={() => {
                  soundEngine.playClick();
                  hapticLight();
                  setShowQtyLogger(false);
                }}
                className="px-2.5 py-1.5 rounded-xl border border-white/[0.08] text-xs text-zinc-400 hover:text-white"
              >
                Cancel
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

      {/* Own Proof Gallery Lightbox */}
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

      {/* Partner Proof Gallery Lightbox */}
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
