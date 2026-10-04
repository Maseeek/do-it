'use client';

import React, { useState } from 'react';
import { Habit } from '@/lib/types';
import { useStore } from '@/lib/store';
import { HabitIcon } from './HabitIcon';
import { ProofModal } from './ProofModal';
import { ProofGalleryModal } from './ProofGalleryModal';
import { calculateHabitStreak } from '@/lib/score-calculator';
import {
  BookOpen,
  Camera,
  Check,
  Flame,
  MessageSquare,
  MessageSquarePlus,
  Minus,
  Plus,
  Sparkles,
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
    getWeeklyHabitCompletions,
    selectedDate,
    checkIns,
    restDays,
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
  const isWeeklyHabit = Boolean(habit.weeklyTargetDays && habit.weeklyTargetDays > 0);
  const weeklyCompletions = getWeeklyHabitCompletions(habit.id, selectedDate);
  const isWeeklyTargetMet = isWeeklyHabit && weeklyCompletions >= habit.weeklyTargetDays!;
  const satisfied = completed || isWeeklyTargetMet;
  const habitStreak = calculateHabitStreak(habit, checkIns, restDays);

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
        className={`group relative rounded-xl p-3.5 transition-all duration-150 border ${
          satisfied
            ? 'bg-zinc-900/30 border-zinc-800/50 opacity-75'
            : 'bg-[#0e1013] border-zinc-800/90 hover:border-zinc-700 shadow-xs'
        }`}
      >
        <div className="flex items-center gap-3">
          {/* Sharp Linear-style square checkbox with 44px touch target */}
          <button
            onClick={handleToggle}
            aria-label={
              completed
                ? `Mark ${habit.title} uncompleted for today`
                : isWeeklyTargetMet
                ? `Weekly goal reached (${weeklyCompletions}/${habit.weeklyTargetDays}). Click to log an extra session.`
                : `Mark ${habit.title} completed`
            }
            className={`relative before:absolute before:-inset-2 w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all duration-150 active:scale-95 ${
              completed
                ? isMaciek
                  ? 'bg-blue-500 border border-blue-400 text-white shadow-xs'
                  : 'bg-pink-500 border border-pink-400 text-white shadow-xs'
                : isWeeklyTargetMet
                ? 'border border-emerald-500/50 text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20'
                : 'border border-zinc-700 bg-zinc-900/80 hover:border-zinc-500 text-transparent hover:text-zinc-600'
            }`}
          >
            <Check className={`w-4 h-4 stroke-[3] ${!completed && !isWeeklyTargetMet ? ' opacity-0 group-hover:opacity-40' : ''}`} />
          </button>

          {/* Middle: Metadata + Title + Description */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className={`w-3.5 h-3.5 ${satisfied ? 'text-zinc-500' : 'text-zinc-400'}`}>
                <HabitIcon name={habit.iconName} className="w-3.5 h-3.5" />
              </span>

              <span
                className={`text-[10px] uppercase font-mono font-medium tracking-wider ${
                  satisfied ? 'text-zinc-500' : 'text-zinc-400'
                }`}
              >
                {habit.category.replace('_', ' ')}
              </span>

              {isWeeklyHabit && (
                <span
                  className={`inline-flex items-center text-[9px] font-mono px-1.5 py-0.2 rounded border ${
                    isWeeklyTargetMet
                      ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25 font-semibold'
                      : 'text-zinc-400 bg-zinc-900 border-zinc-800'
                  }`}
                >
                  {weeklyCompletions}/{habit.weeklyTargetDays} wk{isWeeklyTargetMet ? ' · met' : ''}
                </span>
              )}

              {habitStreak >= 2 && (
                <span
                  className="inline-flex items-center gap-0.5 text-[9px] font-mono font-semibold text-amber-400 bg-amber-500/10 px-1.5 py-0.2 rounded border border-amber-500/20"
                  title={`${habitStreak}-day habit streak`}
                >
                  <Flame className="w-2.5 h-2.5 text-amber-400" />
                  {habitStreak}d
                </span>
              )}

              {habit.points >= 40 && (
                <span className="inline-flex items-center gap-0.5 text-[9px] font-mono text-amber-400/90 bg-amber-400/10 px-1.5 py-0.2 rounded border border-amber-400/20">
                  <Sparkles className="w-2.5 h-2.5" />
                  Key
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 mt-0.5">
              <span
                className={`text-sm font-medium tracking-tight truncate ${
                  satisfied ? 'line-through text-zinc-500' : 'text-zinc-100'
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

            {/* Micro-note preview */}
            {checkIn?.note && (
              <div className="mt-1.5 inline-flex items-center gap-1.5 text-[11px] text-zinc-300 italic bg-zinc-900/70 border border-zinc-800/80 rounded-md px-2 py-0.5 max-w-full">
                <MessageSquare className="w-2.5 h-2.5 text-blue-400 shrink-0" />
                <span className="truncate">{checkIn.note}</span>
              </div>
            )}
          </div>

          {/* Right: Rectangular Points Badge & Compact Quick Actions */}
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <button
              onClick={() => {
                if (habit.isQuantitative) {
                  soundEngine.playClick();
                  hapticLight();
                  setShowQtyLogger(true);
                }
              }}
              aria-label={
                habit.isQuantitative
                  ? `Log quantity for ${habit.title}`
                  : `${habit.points} points`
              }
              className={`text-xs font-mono font-bold px-2 py-0.5 rounded-md border transition-colors ${
                completed
                  ? checkIn?.pointsEarned === 0
                    ? 'bg-zinc-900 border-zinc-800 text-zinc-500'
                    : 'bg-zinc-900/60 border-zinc-800/80 text-zinc-500'
                  : isWeeklyTargetMet
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
                  : habit.isQuantitative
                  ? 'bg-blue-500/10 border-blue-500/30 text-blue-400 hover:bg-blue-500/20'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-100 hover:border-zinc-700'
              }`}
              title={
                completed && checkIn?.pointsEarned === 0
                  ? 'Weekly target reached · 0 pts awarded'
                  : isWeeklyTargetMet && !completed
                  ? 'Weekly goal met · Target reached'
                  : undefined
              }
            >
              {completed
                ? checkIn && checkIn.pointsEarned === 0
                  ? '+0 pts (limit)'
                  : `+${checkIn?.pointsEarned ?? habit.points}`
                : isWeeklyTargetMet
                ? 'Goal Met'
                : `+${habit.points}`}
            </button>

            <div className="flex items-center gap-1">
              {/* Note icon button */}
              <button
                onClick={openNoteEditor}
                aria-label={checkIn?.note ? `Edit note for ${habit.title}` : `Add note for ${habit.title}`}
                className={`w-7 h-7 rounded-md border flex items-center justify-center transition-colors ${
                  checkIn?.note
                    ? 'text-blue-400 bg-blue-500/10 border-blue-500/25'
                    : 'text-zinc-500 border-transparent hover:text-zinc-300 hover:bg-zinc-900 hover:border-zinc-800'
                }`}
                title={checkIn?.note ? 'Edit note' : 'Add note'}
              >
                {checkIn?.note ? (
                  <MessageSquare className="w-3.5 h-3.5" />
                ) : (
                  <MessageSquarePlus className="w-3.5 h-3.5" />
                )}
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
                  className="flex items-center gap-1 text-[10px] font-mono font-medium text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 px-1.5 py-0.5 rounded border border-emerald-500/25 transition-colors"
                  title="View proof photos"
                >
                  <Camera className="w-3 h-3" />
                  <span>{proofPhotos.length}</span>
                </button>
              )}
            </div>

            {habit.isQuantitative && completed && (
              <button
                onClick={() => {
                  soundEngine.playClick();
                  hapticLight();
                  setShowQtyLogger(true);
                }}
                className="text-[10px] font-mono text-zinc-400 hover:text-white"
              >
                Edit pages
              </button>
            )}
          </div>
        </div>

        {/* Inline Micro-Note Editor */}
        {isEditingNote && (
          <form onSubmit={handleSaveNote} className="mt-2.5 pt-2.5 border-t border-zinc-800/80 flex gap-1.5">
            <input
              type="text"
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Add reflection or workout details..."
              aria-label={`Reflection note for ${habit.title}`}
              autoFocus
              className="flex-1 px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-zinc-600"
            />
            <button
              type="submit"
              className="px-3 py-1.5 rounded-lg bg-white text-black text-xs font-semibold hover:bg-zinc-200 transition-colors"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                hapticLight();
                setIsEditingNote(false);
              }}
              aria-label="Cancel note edit"
              className="p-1.5 rounded-lg border border-zinc-800 text-zinc-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </form>
        )}

        {/* Clean Space Partner Proof Quick Link */}
        {isCleanSpace && partnerCleanSpaceCheckIn && partnerProofPhotos.length > 0 && (
          <div className="mt-2.5 pt-2 border-t border-zinc-800/70 flex items-center justify-between text-[11px] font-mono">
            <span className="text-zinc-400 flex items-center gap-1.5">
              <span>{partnerPlayer?.avatar}</span>
              <span>{partnerPlayer?.name} checked in Clean Space</span>
            </span>
            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                hapticLight();
                setShowPartnerProof(true);
              }}
              className="text-pink-400 hover:text-pink-300 font-medium flex items-center gap-1 bg-pink-500/10 px-2 py-0.5 rounded border border-pink-500/20 transition-colors"
            >
              <Camera className="w-3 h-3" />
              <span>Photos ({partnerProofPhotos.length})</span>
            </button>
          </div>
        )}

        {/* Inline Quantitative Stepper Logger */}
        {showQtyLogger && habit.isQuantitative && (
          <div className="mt-3 pt-3 border-t border-zinc-800/80 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-300 font-medium flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-blue-400" />
                How many pages did you read?
              </span>
              <span className="font-mono font-bold text-blue-400">
                {quantity} {habit.quantityUnit} = +{Math.min(habit.points, quantity)} pts
              </span>
            </div>

            {/* Preset Buttons */}
            <div className="flex items-center gap-1.5">
              {[10, 15, 20, 25].map((pages) => (
                <button
                  key={pages}
                  onClick={() => handleLogQuantity(pages)}
                  className={`flex-1 py-1 rounded-lg text-xs font-mono border transition-colors ${
                    quantity === pages
                      ? 'bg-blue-500/20 border-blue-500/50 text-blue-300 font-bold'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                  }`}
                >
                  {pages}p
                </button>
              ))}
            </div>

            {/* Stepper + Custom */}
            <div className="flex items-center gap-2">
              <div className="flex items-center rounded-lg border border-zinc-800 bg-zinc-900/80">
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
                  className="w-12 text-center text-xs font-mono font-bold bg-transparent text-white focus:outline-none"
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
                className="flex-1 py-1.5 rounded-lg bg-white text-black font-semibold text-xs hover:bg-zinc-200 transition-colors"
              >
                Log {quantity} Pages
              </button>

              <button
                onClick={() => {
                  soundEngine.playClick();
                  hapticLight();
                  setShowQtyLogger(false);
                }}
                className="px-2.5 py-1.5 rounded-lg border border-zinc-800 text-xs text-zinc-400 hover:text-white"
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
