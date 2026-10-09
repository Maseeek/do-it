'use client';

import React, { useEffect, useRef, useState } from 'react';
import { CheckIn, Habit, Player } from '@/lib/types';
import { HabitIcon } from './HabitIcon';
import { ProofModal } from './ProofModal';
import { ProofGalleryModal } from './ProofGalleryModal';

import {
  BookOpen,
  Camera,
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

interface HabitCardProps {
  habit: Habit;
  selectedDate: string;
  completed: boolean;
  checkIn: CheckIn | undefined;
  weeklyCompletions: number;
  habitStreak: number;
  activePlayer: Player | null;
  partnerPlayer: Player | null;
  partnerCleanSpaceCheckIn: CheckIn | undefined;
  partnerCleanSpaceHabit: Habit | undefined;
  toggleHabit: (habitId: string, proofUrl?: string | string[], quantity?: number, note?: string, targetDate?: string) => void;
  updateCheckInNote: (checkInId: string, note: string) => void;
  isLocking?: boolean;
  justSettled?: boolean;
  onCheckIn?: (habitId: string, pointsEarned: number, wasAlreadySatisfied: boolean) => void;
  onUncheck?: (habitId: string) => void;
}

export const HabitCard = React.memo(function HabitCard({
  habit,
  selectedDate,
  completed,
  checkIn,
  weeklyCompletions,
  habitStreak,
  activePlayer,
  partnerPlayer,
  partnerCleanSpaceCheckIn,
  partnerCleanSpaceHabit,
  toggleHabit,
  updateCheckInNote,
  isLocking = false,
  justSettled = false,
  onCheckIn,
  onUncheck,
}: HabitCardProps) {

  const [isProofModalOpen, setIsProofModalOpen] = useState(false);
  const [showFullProof, setShowFullProof] = useState(false);
  const [showPartnerProof, setShowPartnerProof] = useState(false);
  const [showQtyLogger, setShowQtyLogger] = useState(false);
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [localPulse, setLocalPulse] = useState<{ points: number; token: number } | null>(null);
  const pulseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (pulseTimerRef.current) clearTimeout(pulseTimerRef.current);
    };
  }, []);

  const isWeeklyHabit = Boolean(habit.weeklyTargetDays && habit.weeklyTargetDays > 0);
  const isWeeklyTargetMet = isWeeklyHabit && weeklyCompletions >= habit.weeklyTargetDays!;
  const satisfied = completed || isWeeklyTargetMet;
  const isMaciek = activePlayer?.id === 'maciek';
  const isPulsing = Boolean(isLocking || localPulse);
  const pulsePoints = localPulse?.points ?? checkIn?.pointsEarned ?? (isWeeklyTargetMet ? 0 : habit.points);

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

  const triggerKineticPulse = (earnedPts: number) => {
    if (pulseTimerRef.current) clearTimeout(pulseTimerRef.current);
    setLocalPulse((prev) => ({ points: earnedPts, token: (prev?.token ?? 0) + 1 }));
    onCheckIn?.(habit.id, earnedPts, satisfied);
    pulseTimerRef.current = setTimeout(() => {
      setLocalPulse(null);
    }, 520);
  };

  const clearKineticPulse = () => {
    if (pulseTimerRef.current) clearTimeout(pulseTimerRef.current);
    setLocalPulse(null);
    onUncheck?.(habit.id);
  };

  const handleToggle = () => {
    if (habit.isQuantitative) {
      soundEngine.playClick();
      hapticLight();
      if (completed) {
        clearKineticPulse();
        toggleHabit(habit.id, undefined, undefined, undefined, selectedDate);
      } else {
        setShowQtyLogger(true);
      }
      return;
    }

    if (completed) {
      soundEngine.playUncheck();
      hapticLight();
      clearKineticPulse();
      toggleHabit(habit.id, undefined, undefined, undefined, selectedDate);
    } else {
      if (habit.requiresProof && proofPhotos.length === 0) {
        soundEngine.playClick();
        hapticLight();
        setIsProofModalOpen(true);
      } else {
        const earnedPts = isWeeklyTargetMet ? 0 : habit.points;
        soundEngine.playCheck();
        hapticSuccess();
        triggerKineticPulse(earnedPts);
        toggleHabit(habit.id, undefined, undefined, undefined, selectedDate);
      }
    }
  };

  const handleProofConfirmed = (proofUrls?: string[]) => {
    const earnedPts = completed ? 0 : isWeeklyTargetMet ? 0 : habit.points;
    soundEngine.playCheck();
    hapticSuccess();
    triggerKineticPulse(earnedPts);
    toggleHabit(habit.id, proofUrls, undefined, undefined, selectedDate);
  };

  const handleLogQuantity = (qty: number) => {
    const clampedQty = Math.min(habit.maxQuantity || qty, Math.max(1, Math.floor(qty)));
    const newPts = isWeeklyTargetMet
      ? 0
      : Math.min(habit.points, Math.max(1, Math.round(clampedQty * (habit.pointsPerUnit || 1))));
    const prevPts = completed ? (checkIn?.pointsEarned ?? 0) : 0;
    const earnedPts = Math.max(0, newPts - prevPts) || newPts;

    soundEngine.playCheck();
    hapticSuccess();
    setQuantity(qty);
    triggerKineticPulse(earnedPts);
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
      const earnedPts = isWeeklyTargetMet ? 0 : habit.points;
      triggerKineticPulse(earnedPts);
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
        className={`group relative rounded-xl p-3.5 transition-all duration-200 border ${
          isPulsing
            ? isMaciek
              ? 'bg-[#10141f] border-blue-400/90 animate-kinetic-card-blue z-10'
              : 'bg-[#16101f] border-purple-400/90 animate-kinetic-card-purple z-10'
            : satisfied
            ? `bg-[#0b0c0f]/90 border-zinc-800/60 ${justSettled ? 'animate-kinetic-settle' : ''}`
            : 'bg-[#0e1013] border-zinc-800/90 hover:border-zinc-700 shadow-xs'
        }`}
      >
        {/* Recessed Left-Edge Telemetry Channel Bar for Completed State */}
        {satisfied && !isPulsing && (
          <div
            aria-hidden="true"
            className={`absolute left-0 top-3 bottom-3 w-[2px] rounded-r-full ${
              completed
                ? isMaciek
                  ? 'bg-blue-500/50'
                  : 'bg-purple-500/50'
                : 'bg-emerald-500/50'
            }`}
          />
        )}

        {/* Kinetic Score Pulse Surface Overlay (Laser Sweep + Edge Highlight) */}
        {isPulsing && (
          <div
            key={localPulse?.token ?? 'locking'}
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 overflow-hidden rounded-xl"
          >
            {/* Horizontal laser sweep from checkbox to points counter */}
            <div
              className={`absolute inset-y-0 w-1/2 animate-kinetic-laser-sweep bg-gradient-to-r ${
                isMaciek
                  ? 'from-transparent via-blue-400/22 to-transparent'
                  : 'from-transparent via-purple-400/22 to-transparent'
              }`}
            />
            {/* Top perimeter ignition filament */}
            <div
              className={`absolute inset-x-4 top-0 h-[1.5px] bg-gradient-to-r ${
                isMaciek
                  ? 'from-transparent via-blue-300/90 to-transparent'
                  : 'from-transparent via-purple-300/90 to-transparent'
              }`}
            />
          </div>
        )}

        <div className="relative flex items-center gap-3">
          {/* Precision Telemetry Checkbox with Shockwave Ring & Custom SVG Stroke Draw */}
          <div className="relative shrink-0">
            {isPulsing && (
              <span
                key={`ring-${localPulse?.token ?? 'lock'}`}
                aria-hidden="true"
                className={`pointer-events-none absolute inset-0 rounded-lg border-2 animate-kinetic-ring ${
                  isMaciek ? 'border-blue-400' : 'border-purple-400'
                }`}
              />
            )}

            <button
              onClick={handleToggle}
              aria-label={
                completed
                  ? `Mark ${habit.title} uncompleted for today`
                  : isWeeklyTargetMet
                  ? `Weekly goal reached (${weeklyCompletions}/${habit.weeklyTargetDays}). Click to log an extra session.`
                  : `Mark ${habit.title} completed`
              }
              className={`relative before:absolute before:-inset-2 w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all duration-150 active:scale-90 ${
                isPulsing ? 'animate-kinetic-box-snap ' : ''
              }${
                completed
                  ? isMaciek
                    ? 'bg-blue-500 border border-blue-300/90 text-white shadow-[0_0_14px_-2px_rgba(59,130,246,0.55),inset_0_1px_0_rgba(255,255,255,0.35)]'
                    : 'bg-purple-500 border border-purple-300/90 text-white shadow-[0_0_14px_-2px_rgba(168,85,247,0.55),inset_0_1px_0_rgba(255,255,255,0.35)]'
                  : isWeeklyTargetMet
                  ? 'border border-emerald-500/50 text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20'
                  : 'border border-zinc-700/90 bg-[#090a0d] hover:border-zinc-500 text-transparent hover:text-zinc-500 shadow-[inset_0_1px_2px_rgba(0,0,0,0.55)]'
              }`}
            >
              <svg
                viewBox="0 0 20 20"
                fill="none"
                aria-hidden="true"
                className={`w-4 h-4 ${
                  !completed && !isWeeklyTargetMet
                    ? 'opacity-0 group-hover:opacity-40 transition-opacity duration-150'
                    : 'opacity-100'
                }`}
              >
                <path
                  d="M4.5 10.5L8.25 14.25L15.5 6.25"
                  stroke="currentColor"
                  strokeWidth="2.6"
                  strokeLinecap="square"
                  strokeLinejoin="miter"
                  className={isPulsing ? 'animate-kinetic-check-draw' : ''}
                />
              </svg>
            </button>
          </div>

          {/* Middle: Metadata + Title + Description */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span
                className={`w-3.5 h-3.5 transition-colors ${
                  isPulsing
                    ? isMaciek
                      ? 'text-blue-400'
                      : 'text-purple-400'
                    : satisfied
                    ? 'text-zinc-500'
                    : 'text-zinc-400'
                }`}
              >
                <HabitIcon name={habit.iconName} className="w-3.5 h-3.5" />
              </span>

              <span
                className={`text-[10px] uppercase font-mono font-medium tracking-wider transition-colors ${
                  isPulsing
                    ? isMaciek
                      ? 'text-blue-300'
                      : 'text-purple-300'
                    : satisfied
                    ? 'text-zinc-500'
                    : 'text-zinc-400'
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
                className={`relative inline-block max-w-full text-sm font-medium tracking-tight truncate transition-colors ${
                  isPulsing
                    ? 'text-white'
                    : satisfied
                    ? 'line-through decoration-zinc-600/80 text-zinc-400'
                    : 'text-zinc-100'
                }`}
              >
                {habit.title}
                {isPulsing && (
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none absolute left-0 right-0 top-1/2 -translate-y-1/2 h-[1.5px] rounded-full animate-kinetic-strike bg-gradient-to-r ${
                      isMaciek
                        ? 'from-blue-400 via-blue-200 to-white shadow-[0_0_8px_rgba(96,165,250,0.9)]'
                        : 'from-purple-400 via-purple-200 to-white shadow-[0_0_8px_rgba(192,132,252,0.9)]'
                    }`}
                  />
                )}
              </span>
            </div>

            <p className={`text-[11px] truncate mt-0.5 ${satisfied && !isPulsing ? 'text-zinc-500' : 'text-zinc-400'}`}>
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

          {/* Right: Rectangular Points Badge & Kinetic +PTS Counter Pop */}
          <div className="relative flex flex-col items-end gap-1.5 shrink-0">
            {isPulsing && pulsePoints > 0 && (
              <span
                key={`pts-${localPulse?.token ?? 'lock'}`}
                aria-hidden="true"
                className={`pointer-events-none absolute -top-2 right-0 z-20 inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono font-extrabold tracking-tight whitespace-nowrap border shadow-lg animate-kinetic-pts-launch ${
                  isMaciek
                    ? 'bg-blue-500 text-white border-blue-300 shadow-blue-500/40'
                    : 'bg-purple-500 text-white border-purple-300 shadow-purple-500/40'
                }`}
              >
                <span>↑</span>
                <span>+{pulsePoints} PTS</span>
              </span>
            )}

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
              className={`text-xs font-mono font-bold px-2 py-0.5 rounded-md border transition-all tabular-nums ${
                isPulsing
                  ? isMaciek
                    ? 'bg-blue-500/20 border-blue-400 text-blue-200 shadow-[0_0_14px_-2px_rgba(59,130,246,0.5)] animate-kinetic-badge-ignite'
                    : 'bg-purple-500/20 border-purple-400 text-purple-200 shadow-[0_0_14px_-2px_rgba(168,85,247,0.5)] animate-kinetic-badge-ignite'
                  : completed
                  ? checkIn?.pointsEarned === 0
                    ? 'bg-zinc-900 border-zinc-800 text-zinc-500'
                    : isMaciek
                    ? 'bg-blue-500/10 border-blue-500/25 text-blue-300/90'
                    : 'bg-purple-500/10 border-purple-500/25 text-purple-300/90'
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
              className="text-purple-400 hover:text-purple-300 font-medium flex items-center gap-1 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20 transition-colors"
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
});
