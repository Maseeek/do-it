'use client';

// PROTOTYPE: bottom sheet for logging a quantitative Habit (e.g. pages read) from a Variant B tile.
import React, { useEffect, useState } from 'react';
import { Minus, Plus, X } from 'lucide-react';
import type { Habit } from '@/lib/types';
import { HabitIcon } from '@/components/HabitIcon';

export function QuantitySheet({
  habit,
  onClose,
  onLog,
}: {
  habit: Habit;
  onClose: () => void;
  onLog: (quantity: number) => void;
}) {
  const max = habit.maxQuantity || 25;
  const unit = habit.quantityUnit || 'units';
  const [quantity, setQuantity] = useState(max);
  const points = Math.min(habit.points, Math.max(1, Math.round(quantity * (habit.pointsPerUnit || 1))));
  const presets = [0.4, 0.6, 0.8, 1].map(f => Math.max(1, Math.round(max * f)));

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center">
      <button aria-label="Close" onClick={onClose} className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Log ${habit.title}`}
        className="relative w-full max-w-md rounded-t-3xl border border-[var(--border-subtle)] bg-[var(--surface-1)] px-5 pt-3 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] shadow-2xl"
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-[var(--surface-3)]" />
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--surface-2)] text-secondary">
            <HabitIcon name={habit.iconName} className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-headline truncate">{habit.title}</p>
            <p className="text-caption text-muted">How many {unit} today?</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-11 w-11 items-center justify-center rounded-full text-muted hover:bg-[var(--surface-2)]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5 grid grid-cols-4 gap-2">
          {presets.map(value => (
            <button
              key={value}
              onClick={() => setQuantity(value)}
              aria-pressed={quantity === value}
              className={`h-14 rounded-2xl border text-headline num transition-colors ${
                quantity === value
                  ? 'border-transparent bg-player-500 text-white'
                  : 'border-[var(--border-subtle)] bg-[var(--surface-2)] text-foreground'
              }`}
            >
              {value}
            </button>
          ))}
        </div>

        <div className="mt-3 flex items-center gap-3">
          <div className="flex items-center rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-2)]">
            <button
              onClick={() => setQuantity(q => Math.max(1, q - 1))}
              aria-label="Decrease"
              className="flex h-12 w-12 items-center justify-center text-secondary"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="w-10 text-center text-headline num">{quantity}</span>
            <button
              onClick={() => setQuantity(q => Math.min(max, q + 1))}
              aria-label="Increase"
              className="flex h-12 w-12 items-center justify-center text-secondary"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <button
            onClick={() => onLog(quantity)}
            className="h-12 flex-1 rounded-2xl bg-player-500 text-headline text-white active:scale-[0.98] transition-transform"
          >
            Log <span className="num">+{points}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
