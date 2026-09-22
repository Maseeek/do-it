'use client';

import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { formatFriendlyDate } from '@/lib/date-utils';

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

  // Keyboard navigation (Arrow keys & Escape)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft' && images.length > 1) {
        setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
      } else if (e.key === 'ArrowRight' && images.length > 1) {
        setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, images.length, onClose]);

  if (!isOpen || images.length === 0) return null;

  const currentImage = images[currentIndex] || images[0];

  const formattedTime = completedAt
    ? new Date(completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-3 sm:p-5"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl bg-zinc-950 border border-zinc-800 overflow-hidden shadow-2xl flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-3.5 border-b border-zinc-800/80 bg-zinc-900/60">
          <div className="flex items-center gap-2.5">
            <span className="text-lg">{playerAvatar}</span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white tracking-tight">
                  {playerName}&apos;s {habitTitle}
                </span>
                <span className="text-[10px] font-mono text-zinc-400 bg-zinc-800/80 px-1.5 py-0.5 rounded border border-zinc-700/60">
                  {currentIndex + 1} of {images.length}
                </span>
              </div>
              <p className="text-[10px] text-zinc-400 font-mono mt-0.5">
                {date ? formatFriendlyDate(date) : 'Today'}
                {formattedTime ? ` • ${formattedTime}` : ''}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Main Photo View with Left/Right arrows */}
        <div className="relative flex-1 bg-black flex items-center justify-center min-h-[300px] max-h-[60vh] overflow-hidden select-none group">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={currentImage}
            alt={`${habitTitle} proof photo ${currentIndex + 1}`}
            className="w-full h-full object-contain max-h-[60vh] transition-all duration-200"
          />

          {images.length > 1 && (
            <>
              {/* Prev Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
                }}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/70 hover:bg-black text-white flex items-center justify-center transition-all border border-zinc-700/60 shadow-lg"
                aria-label="Previous photo"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              {/* Next Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/70 hover:bg-black text-white flex items-center justify-center transition-all border border-zinc-700/60 shadow-lg"
                aria-label="Next photo"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </>
          )}
        </div>

        {/* Bottom Thumbnail Strip (if multiple photos) */}
        {images.length > 1 && (
          <div className="p-3 border-t border-zinc-800/80 bg-zinc-950 flex items-center gap-2 overflow-x-auto justify-center">
            {images.map((img, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`relative rounded-lg overflow-hidden flex-shrink-0 w-12 h-12 border transition-all ${
                  currentIndex === idx
                    ? 'border-white scale-105 shadow-md shadow-white/10 ring-1 ring-white/50'
                    : 'border-zinc-800 opacity-60 hover:opacity-100 hover:border-zinc-600'
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img}
                  alt={`Thumbnail ${idx + 1}`}
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
