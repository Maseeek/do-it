'use client';

import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { formatFriendlyDate } from '@/lib/date-utils';
import { soundEngine } from '@/lib/sound-utils';
import { hapticLight } from '@/lib/haptic-utils';

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
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [prevProps, setPrevProps] = useState({ initialIndex, isOpen });

  if (prevProps.initialIndex !== initialIndex || prevProps.isOpen !== isOpen) {
    setPrevProps({ initialIndex, isOpen });
    setCurrentIndex(initialIndex);
  }

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft' && images.length > 1) {
        soundEngine.playClick();
        setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
      } else if (e.key === 'ArrowRight' && images.length > 1) {
        soundEngine.playClick();
        setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, images.length, onClose]);

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
        role="dialog"
        aria-modal="true"
        aria-label="Proof photo gallery"
        className="w-full max-w-lg rounded-3xl bg-[#1c1c1e] border border-white/[0.1] overflow-hidden shadow-2xl flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-3.5 border-b border-white/[0.08] bg-[#1c1c1e]">
          <div className="flex items-center gap-2.5">
            <span className="text-base">{playerAvatar}</span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-white">
                  {playerName} · {habitTitle}
                </span>
                <span className="text-[10px] text-zinc-400 bg-white/[0.06] px-1.5 py-0.2 rounded-full">
                  {currentIndex + 1}/{images.length}
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 mt-0.5">
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
            className="p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Main Photo View */}
        <div className="relative flex-1 bg-black flex items-center justify-center min-h-[300px] max-h-[60vh] overflow-hidden select-none">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={currentImage}
            alt={`${habitTitle} proof ${currentIndex + 1}`}
            className="w-full h-full object-contain max-h-[60vh]"
          />

          {images.length > 1 && (
            <>
              <button
                onClick={handlePrev}
                className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center transition-all border border-white/[0.1] active:scale-95"
                aria-label="Previous"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <button
                onClick={handleNext}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center transition-all border border-white/[0.1] active:scale-95"
                aria-label="Next"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </>
          )}
        </div>

        {/* Thumbnail Strip */}
        {images.length > 1 && (
          <div className="p-3 border-t border-white/[0.08] bg-[#1c1c1e] flex items-center gap-2 overflow-x-auto justify-center">
            {images.map((img, idx) => (
              <button
                key={idx}
                onClick={() => {
                  soundEngine.playClick();
                  hapticLight();
                  setCurrentIndex(idx);
                }}
                className={`relative rounded-xl overflow-hidden flex-shrink-0 w-11 h-11 border transition-all ${
                  currentIndex === idx
                    ? 'border-white scale-105 ring-1 ring-white/40'
                    : 'border-white/[0.08] opacity-50 hover:opacity-100'
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
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
