'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Habit } from '@/lib/types';
import { Check, ImagePlus, Loader2, Upload, X } from 'lucide-react';
import { compressMultipleImages, MAX_PROOF_PHOTOS } from '@/lib/image-utils';
import { soundEngine } from '@/lib/sound-utils';
import { hapticMedium, hapticLight } from '@/lib/haptic-utils';
import { useModalFocus } from '@/lib/use-modal-focus';

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
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useModalFocus(isOpen, onClose);
  const openingPhotos = useRef(initialPhotos);
  const uploadSequence = useRef({ id: 0 });
  useEffect(() => { openingPhotos.current = initialPhotos; }, [initialPhotos]);
  useEffect(() => {
    const upload = uploadSequence.current;
    if (isOpen) {
      setPhotoPreviews(openingPhotos.current);
      setUploadError(null);
      setIsCompressing(false);
    }
    return () => { upload.id++; };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    if (photoPreviews.length + files.length > MAX_PROOF_PHOTOS) {
      setUploadError(`Add up to ${MAX_PROOF_PHOTOS} photos per check-in.`);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const sequence = ++uploadSequence.current.id;
    setUploadError(null);
    setIsCompressing(true);
    soundEngine.playClick();
    hapticLight();
    try {
      const compressed = await compressMultipleImages(files, 1200, 0.8);
      if (sequence === uploadSequence.current.id) setPhotoPreviews((prev) => [...prev, ...compressed]);
    } catch (err) {
      if (sequence === uploadSequence.current.id) setUploadError(err instanceof Error ? err.message : 'Could not process that photo. Try a JPEG or PNG.');
    } finally {
      if (sequence === uploadSequence.current.id) setIsCompressing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemovePhoto = (indexToRemove: number) => {
    soundEngine.playClick();
    hapticLight();
    setPhotoPreviews((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleComplete = () => {
    if (isCompressing || (habit.requiresProof && photoPreviews.length === 0)) return;
    soundEngine.playCheck();
    hapticMedium();
    onConfirm(photoPreviews.length > 0 ? photoPreviews : undefined);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md px-4"
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
        aria-labelledby="proof-modal-title"
        className="w-full max-w-sm rounded-3xl bg-[#1c1c1e] border border-white/[0.12] p-5 shadow-2xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-3 flex-shrink-0">
          <div>
            <h2 id="proof-modal-title" className="text-sm font-semibold text-white">Attach Proof</h2>
            <span className="text-xs text-zinc-400">{habit.title}</span>
          </div>
          <button
            onClick={() => {
              soundEngine.playClick();
              hapticLight();
              onClose();
            }}
            aria-label="Close attach proof dialog"
            className="text-zinc-400 hover:text-white p-1 rounded-full transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Hidden multi-file input */}
        <input
          ref={fileInputRef}
          aria-label="Choose proof photos"
          type="file"
          accept="image/*"
          multiple
          disabled={isCompressing}
          onChange={(e) => handleFiles(e.target.files)}
          className="hidden"
        />

        {/* Content Area */}
        <p className="text-xs text-zinc-400 mb-3">{habit.requiresProof ? 'Add a photo to check off this habit. ' : ''}Up to {MAX_PROOF_PHOTOS} photos, 20 MB each.</p>
        {uploadError && <p role="alert" className="text-xs text-amber-300 mb-3">{uploadError}</p>}
        <div className="flex-1 overflow-y-auto min-h-0 mb-4 pr-0.5">
          {photoPreviews.length === 0 ? (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isCompressing}
              className="w-full flex flex-col items-center justify-center aspect-video rounded-2xl border border-dashed border-white/[0.15] hover:border-zinc-400 bg-white/[0.02] hover:bg-white/[0.04] transition-all cursor-pointer"
            >
              {isCompressing ? (
                <>
                  <Loader2 className="w-6 h-6 text-player-400 animate-spin mb-1.5" />
                  <span className="text-xs font-medium text-zinc-300">Processing...</span>
                </>
              ) : (
                <>
                  <Upload className="w-6 h-6 text-zinc-400 mb-1.5" />
                  <span className="text-xs font-medium text-zinc-200">Tap to upload photos</span>
                </>
              )}
            </button>
          ) : (
            <div className="space-y-2">
              <div className="text-[11px] text-zinc-400 px-1">
                {photoPreviews.length} {photoPreviews.length === 1 ? 'photo' : 'photos'}
              </div>

              <div className="grid grid-cols-2 gap-2">
                {photoPreviews.map((preview, index) => (
                  <div
                    key={index}
                    className="relative rounded-2xl overflow-hidden border border-white/[0.08] aspect-video bg-black group"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={preview}
                      alt={`Proof preview ${index + 1}`}
                      className="w-full h-full object-cover"
                    />

                    <button
                      type="button"
                      onClick={() => handleRemovePhoto(index)}
                      className="absolute top-1.5 right-1.5 bg-black/80 hover:bg-red-500 text-white p-1 rounded-full text-xs transition-colors"
                      title="Remove photo"
                      aria-label={`Remove proof photo ${index + 1}`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isCompressing || photoPreviews.length >= MAX_PROOF_PHOTOS}
                  className="flex flex-col items-center justify-center aspect-video rounded-2xl border border-dashed border-white/[0.12] hover:border-zinc-400 bg-white/[0.02] text-zinc-400 hover:text-white transition-colors"
                >
                  <ImagePlus className="w-5 h-5 mb-1" />
                  <span className="text-[11px] font-medium">+ Add More</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 flex-shrink-0 pt-2 border-t border-white/[0.06]">
          <button
            onClick={() => {
              soundEngine.playClick();
              hapticLight();
              onClose();
            }}
            className="px-3.5 py-2 rounded-xl border border-white/[0.08] text-xs font-medium text-zinc-400 hover:text-white"
          >
            Cancel
          </button>
          <button
            onClick={handleComplete}
            disabled={isCompressing || (habit.requiresProof && photoPreviews.length === 0)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-white text-black font-semibold text-xs hover:bg-zinc-200 transition-colors disabled:opacity-50"
          >
            <Check className="w-3.5 h-3.5 stroke-[2.5]" />
            {photoPreviews.length > 0 ? 'Submit Proof' : 'Check Off'}
          </button>
        </div>
      </div>
    </div>
  );
}
