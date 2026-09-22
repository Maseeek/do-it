'use client';

import React, { useState } from 'react';
import { Habit } from '@/lib/types';
import { Camera, Check, Upload, X } from 'lucide-react';

interface ProofModalProps {
  habit: Habit;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (proofUrl?: string) => void;
}

export function ProofModal({ habit, isOpen, onClose, onConfirm }: ProofModalProps) {
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleComplete = () => {
    onConfirm(photoPreview || undefined);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
      <div className="w-full max-w-sm rounded-2xl bg-zinc-950 border border-zinc-800 p-5 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-300">
              <Camera className="w-3.5 h-3.5" />
            </div>
            <h2 className="text-sm font-semibold text-white">Visual Proof</h2>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-white p-1 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-zinc-400 mb-4 leading-relaxed">
          Snap a quick photo of your <span className="text-white font-medium">{habit.title}</span> to verify completion.
        </p>

        {/* Upload area or Preview */}
        <div className="mb-4">
          {photoPreview ? (
            <div className="relative rounded-xl overflow-hidden border border-zinc-800 aspect-video bg-zinc-900">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photoPreview}
                alt="Proof preview"
                className="w-full h-full object-cover"
              />
              <button
                onClick={() => setPhotoPreview(null)}
                className="absolute top-2 right-2 bg-black/70 hover:bg-black text-white p-1 rounded-full text-xs"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center aspect-video rounded-xl border border-dashed border-zinc-800 hover:border-zinc-700 bg-zinc-900/40 hover:bg-zinc-900/80 cursor-pointer transition-all">
              <Upload className="w-6 h-6 text-zinc-500 mb-2" />
              <span className="text-xs font-medium text-zinc-300">Tap to upload proof</span>
              <span className="text-[10px] text-zinc-500 mt-0.5">Camera or Photo Library</span>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          <button
            onClick={handleComplete}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-white text-black font-semibold text-xs hover:bg-zinc-200 transition-colors"
          >
            <Check className="w-3.5 h-3.5" />
            {photoPreview ? 'Submit Proof & Complete' : 'Check Off Without Photo'}
          </button>
        </div>
      </div>
    </div>
  );
}
