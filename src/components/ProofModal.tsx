'use client';

import { useStore } from '@/lib/store';

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
  const { resolveProofImages } = useStore();
  const [proofLoadFailed, setProofLoadFailed] = useState(false);
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
      const sequence = ++upload.id;
      setUploadError(null);
      setProofLoadFailed(false);
      setIsCompressing(true);
      setPhotoPreviews([]);
      resolveProofImages(openingPhotos.current).then(photos => {
        if (upload.id === sequence) setPhotoPreviews(photos);
      }).catch(error => {
        if (upload.id === sequence) { setProofLoadFailed(true); setUploadError(error instanceof Error ? error.message : 'Could not load existing photos. Close and try again.'); }
      }).finally(() => { if (upload.id === sequence) setIsCompressing(false); });
    }
    return () => { upload.id++; };
  }, [isOpen, resolveProofImages]);

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
    if (proofLoadFailed || isCompressing || (habit.requiresProof && photoPreviews.length === 0)) return;
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
        className="flex max-h-[90vh] w-full max-w-sm flex-col rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface-1)] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-4 flex shrink-0 items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 id="proof-modal-title" className="text-title text-foreground">Attach Proof</h2>
            <p className="mt-0.5 truncate text-label font-normal text-secondary">{habit.title}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              hapticLight();
              onClose();
            }}
            aria-label="Close attach proof dialog"
            className="-mr-2 -mt-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-secondary transition-colors hover:bg-[var(--surface-2)] hover:text-foreground"
          >
            <X className="h-5 w-5" />
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
        <p className="mb-4 text-caption text-muted">{habit.requiresProof ? 'Add a photo to check off this habit. ' : ''}Up to {MAX_PROOF_PHOTOS} photos, 20 MB each.</p>
        {uploadError && <p role="alert" className="mb-4 text-label font-normal text-amber-700 dark:text-amber-300">{uploadError}</p>}
        <div className="mb-5 min-h-0 flex-1 overflow-y-auto">
          {photoPreviews.length === 0 ? (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isCompressing}
              className="flex aspect-video w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-[var(--border-strong)] bg-[var(--surface-2)] transition-colors hover:border-[var(--text-muted)]"
            >
              {isCompressing ? (
                <>
                  <Loader2 className="h-6 w-6 animate-spin text-player-400" />
                  <span className="text-label text-secondary">Processing...</span>
                </>
              ) : (
                <>
                  <Upload className="h-6 w-6 text-muted" />
                  <span className="text-label text-foreground">Tap to upload photos</span>
                </>
              )}
            </button>
          ) : (
            <div className="space-y-2">
              <p className="num text-caption text-muted">
                {photoPreviews.length} {photoPreviews.length === 1 ? 'photo' : 'photos'}
              </p>

              <div className="grid grid-cols-2 gap-2">
                {photoPreviews.map((preview, index) => (
                  <div
                    key={index}
                    className="group relative aspect-video overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-black"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={preview}
                      alt={`Proof preview ${index + 1}`}
                      className="h-full w-full object-cover"
                    />

                    <button
                      type="button"
                      onClick={() => handleRemovePhoto(index)}
                      className="absolute right-0 top-0 flex h-11 w-11 items-center justify-center"
                      title="Remove photo"
                      aria-label={`Remove proof photo ${index + 1}`}
                    >
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-black/70 text-white transition-colors hover:bg-red-500">
                        <X className="h-3.5 w-3.5" />
                      </span>
                    </button>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isCompressing || photoPreviews.length >= MAX_PROOF_PHOTOS}
                  className="flex aspect-video flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-[var(--border-strong)] text-secondary transition-colors hover:text-foreground disabled:opacity-45"
                >
                  <ImagePlus className="h-5 w-5" />
                  <span className="text-caption font-medium">Add more</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              hapticLight();
              onClose();
            }}
            className="control"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleComplete}
            disabled={proofLoadFailed || isCompressing || (habit.requiresProof && photoPreviews.length === 0)}
            className="control control-primary flex-1"
          >
            <Check className="h-4 w-4 stroke-[2.5]" />
            {photoPreviews.length > 0 ? 'Submit Proof' : 'Check Off'}
          </button>
        </div>
      </div>
    </div>
  );
}
