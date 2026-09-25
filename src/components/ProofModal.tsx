'use client';

import React, { useRef, useState } from 'react';
import { Habit } from '@/lib/types';
import { Camera, Check, ImagePlus, Loader2, Upload, X } from 'lucide-react';
import { compressMultipleImages } from '@/lib/image-utils';
import { soundEngine } from '@/lib/sound-utils';
import { hapticMedium } from '@/lib/haptic-utils';

interface ProofModalProps {
  habit: Habit;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (proofUrls?: string[]) => void;
  initialPhotos?: string[];
}

export function ProofModal({ habit, isOpen, onClose, onConfirm, initialPhotos = [] }: ProofModalProps) {
  const [photoPreviews, setPhotoPreviews] = useState<string[]>(initialPhotos);
  const [isCompressing, setIsCompressing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setIsCompressing(true);
    soundEngine.playClick();
    try {
      const compressed = await compressMultipleImages(files, 1200, 0.8);
      setPhotoPreviews((prev) => [...prev, ...compressed]);
    } catch (err) {
      console.error('Error compressing image(s)', err);
    } finally {
      setIsCompressing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemovePhoto = (indexToRemove: number) => {
    soundEngine.playClick();
    setPhotoPreviews((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleComplete = () => {
    soundEngine.playCheck();
    hapticMedium();
    onConfirm(photoPreviews.length > 0 ? photoPreviews : undefined);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md px-4">
      <div className="w-full max-w-sm rounded-2xl glass-panel bg-zinc-950 border border-white/[0.1] p-5 shadow-2xl max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between mb-3 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-zinc-900 border border-white/[0.08] flex items-center justify-center text-zinc-300">
              <Camera className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white font-mono">Visual Proof</h2>
              <span className="text-[10px] font-mono text-zinc-400">Multiple photos supported</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-white p-1 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-zinc-300 mb-3 leading-relaxed flex-shrink-0">
          Upload photo proof for <span className="text-white font-semibold">&ldquo;{habit.title}&rdquo;</span>. Attach photos of your space, workout, or study.
        </p>

        {/* Hidden multi-file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => handleFiles(e.target.files)}
          className="hidden"
        />

        {/* Main Content Area / Photo Grid */}
        <div className="flex-1 overflow-y-auto min-h-0 mb-4 pr-0.5">
          {photoPreviews.length === 0 ? (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isCompressing}
              className="w-full flex flex-col items-center justify-center aspect-video rounded-xl border border-dashed border-white/[0.12] hover:border-zinc-500 bg-zinc-900/40 hover:bg-zinc-900/80 cursor-pointer transition-all"
            >
              {isCompressing ? (
                <>
                  <Loader2 className="w-6 h-6 text-blue-400 animate-spin mb-2" />
                  <span className="text-xs font-medium text-zinc-300">Optimizing photos...</span>
                </>
              ) : (
                <>
                  <Upload className="w-6 h-6 text-zinc-400 mb-2" />
                  <span className="text-xs font-semibold text-zinc-200">Tap to upload photos</span>
                  <span className="text-[10px] text-zinc-500 mt-0.5">Take photos or choose from library</span>
                </>
              )}
            </button>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400 px-1">
                <span>{photoPreviews.length} {photoPreviews.length === 1 ? 'photo' : 'photos'} attached</span>
                {isCompressing && (
                  <span className="flex items-center gap-1 text-blue-400">
                    <Loader2 className="w-3 h-3 animate-spin" /> Adding...
                  </span>
                )}
              </div>

              {/* Grid of thumbnails */}
              <div className="grid grid-cols-2 gap-2">
                {photoPreviews.map((preview, index) => (
                  <div
                    key={index}
                    className="relative rounded-xl overflow-hidden border border-white/[0.08] aspect-video bg-zinc-900 group"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={preview}
                      alt={`Proof preview ${index + 1}`}
                      className="w-full h-full object-cover"
                    />

                    {/* Photo index badge */}
                    <div className="absolute bottom-1.5 left-1.5 bg-black/75 backdrop-blur-xs text-white text-[9px] font-mono px-1.5 py-0.2 rounded">
                      #{index + 1}
                    </div>

                    {/* Delete button */}
                    <button
                      type="button"
                      onClick={() => handleRemovePhoto(index)}
                      className="absolute top-1.5 right-1.5 bg-black/80 hover:bg-red-500 text-white p-1 rounded-full text-xs transition-colors shadow-sm"
                      title="Remove this photo"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}

                {/* Add more button tile */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isCompressing}
                  className="flex flex-col items-center justify-center aspect-video rounded-xl border border-dashed border-white/[0.1] hover:border-zinc-500 bg-zinc-900/30 hover:bg-zinc-900/60 text-zinc-400 hover:text-white transition-colors"
                >
                  <ImagePlus className="w-5 h-5 mb-1 text-zinc-400" />
                  <span className="text-[11px] font-medium">+ Add More</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 flex-shrink-0 pt-2 border-t border-white/[0.08]">
          <button
            onClick={onClose}
            className="px-3.5 py-2.5 rounded-xl border border-white/[0.08] text-xs font-medium text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleComplete}
            disabled={isCompressing}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-white text-black font-semibold text-xs hover:bg-zinc-200 transition-colors disabled:opacity-50 shadow-sm"
          >
            <Check className="w-3.5 h-3.5 stroke-[2.5]" />
            {photoPreviews.length > 0
              ? `Submit Proof (${photoPreviews.length}) & Complete`
              : 'Check Off Without Photo'}
          </button>
        </div>
      </div>
    </div>
  );
}
