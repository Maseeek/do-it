'use client';

import { ProofImage } from './ProofImage';

import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { formatFriendlyDate } from '@/lib/date-utils';
import { soundEngine } from '@/lib/sound-utils';
import { hapticLight } from '@/lib/haptic-utils';
import { useModalFocus } from '@/lib/use-modal-focus';

interface ProofGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  playerName: string;
  playerAvatar: string;
  habitTitle: string;
  images: string[];
  date?: string;
  completedAt?: string;
  initialIndex?: number;
}

export function ProofGalleryModal({
  isOpen,
  onClose,
  playerName,
  playerAvatar,
  habitTitle,
  images,
  date,
  completedAt,
  initialIndex = 0,
}: ProofGalleryModalProps) {
  const dialogRef = useModalFocus(isOpen && images.length > 0, onClose);
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [prevProps, setPrevProps] = useState({ initialIndex, isOpen });

  if (prevProps.initialIndex !== initialIndex || prevProps.isOpen !== isOpen) {
    setPrevProps({ initialIndex, isOpen });
    setCurrentIndex(initialIndex);
  }

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' && images.length > 1) {
        soundEngine.playClick();
        setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
      } else if (e.key === 'ArrowRight' && images.length > 1) {
        soundEngine.playClick();
        setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, images.length]);

  if (!isOpen || images.length === 0) return null;

  const currentImage = images[currentIndex] || images[0];

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    soundEngine.playClick();
    hapticLight();
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    soundEngine.playClick();
    hapticLight();
    setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
  };

  const formattedTime = completedAt
    ? new Date(completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl p-3 sm:p-5"
      onClick={() => {
        soundEngine.playClick();
        hapticLight();
        onClose();
      }}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="Proof photo gallery"
        className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface-1)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 py-3 pl-5 pr-2">
          <div className="flex min-w-0 items-center gap-3">
            <span aria-hidden="true" className="text-xl">{playerAvatar}</span>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="truncate text-headline text-foreground">
                  {playerName} · {habitTitle}
                </h2>
                <span className="num shrink-0 rounded-full bg-[var(--surface-2)] px-2 py-0.5 text-caption text-secondary">
                  {currentIndex + 1}/{images.length}
                </span>
              </div>
              <p className="mt-0.5 text-caption text-muted">
                {date ? formatFriendlyDate(date) : 'Today'}
                {formattedTime ? ` · ${formattedTime}` : ''}
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              soundEngine.playClick();
              hapticLight();
              onClose();
            }}
            aria-label="Close proof photo gallery"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-secondary transition-colors hover:bg-[var(--surface-2)] hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Main Photo View */}
        <div className="relative flex-1 bg-black flex items-center justify-center min-h-[300px] max-h-[60vh] overflow-hidden select-none">
          <ProofImage
            src={currentImage}
            alt={`${habitTitle} proof ${currentIndex + 1}`}
            className="w-full h-full object-contain max-h-[60vh]"
          />

          {images.length > 1 && (
            <>
              <button
                onClick={handlePrev}
                className="absolute left-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white transition-colors hover:bg-black/90 active:scale-95"
                aria-label="Previous"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <button
                onClick={handleNext}
                className="absolute right-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white transition-colors hover:bg-black/90 active:scale-95"
                aria-label="Next"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </>
          )}
        </div>

        {/* Thumbnail Strip */}
        {images.length > 1 && (
          <div className="flex items-center justify-center gap-2 overflow-x-auto p-3">
            {images.map((img, idx) => (
              <button
                key={idx}
                aria-label={`View proof photo ${idx + 1}`}
                aria-pressed={currentIndex === idx}
                onClick={() => {
                  soundEngine.playClick();
                  hapticLight();
                  setCurrentIndex(idx);
                }}
                className={`relative rounded-xl overflow-hidden flex-shrink-0 w-11 h-11 border transition-all ${
                  currentIndex === idx
                    ? 'border-[var(--text-primary)] ring-1 ring-[var(--border-strong)]'
                    : 'border-[var(--border-subtle)] opacity-50 hover:opacity-100'
                }`}
              >
                <ProofImage
                  src={img}
                  alt={`Thumb ${idx + 1}`}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
