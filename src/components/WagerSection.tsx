'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  ChevronDown,
  Clock,
  Crown,
  Dices,
  Flame,
  Handshake,
  History,
  Plus,
  Scale,
  Sliders,
  Sparkles,
  Trash2,
  Trophy,
  X,
} from 'lucide-react';
import type { CheckIn, LeaderboardTier, Player, PlayerId, Stake, StakePeriod } from '@/lib/types';
import type { StakesRecord } from '@/lib/score-calculator';
import { addDays } from '@/lib/date-utils';
import { getStakePeriodEnd, getStakePeriodScores, getStakePhase, getStakeVerdictDate } from '@/lib/stake-settlement';
import { soundEngine } from '@/lib/sound-utils';
import { hapticCelebration, hapticLight, hapticMedium, hapticSuccess } from '@/lib/haptic-utils';

export interface WagerComparison {
  maciekScore: number;
  myrnaScore: number;
  maciekPct: number;
  myrnaPct: number;
  leader: PlayerId | 'tie';
  delta: number;
}

export interface WagerSectionProps {
  selectedTier: LeaderboardTier;
  activeWeeklyStake?: Stake | null;
  activeMonthlyStake?: Stake | null;
  stakes: Stake[];
  /** Shared check-ins; the scoreboard, not a Player, settles each Stake from them. */
  checkIns: CheckIn[];
  today: string;
  stakesRecord: StakesRecord;
  players: Record<PlayerId, Player>;
  comparison: WagerComparison;
  countdownLabel: string;
  onCreateStake: (payload: { period: StakePeriod; title: string; description: string }) => void;
  onUpdateStake: (stake: Stake) => void;
  onDeleteStake: (stakeId: string) => void;
  surfaceTheme?: 'app' | 'prototype';
}

interface WagerPreset {
  id: string;
  period: 'weekly' | 'monthly';
  emoji: string;
  label: string;
  title: string;
  description: string;
  vibe: 'Classic' | 'Cozy' | 'Playful' | 'Grand';
}

const WAGER_PRESETS: ReadonlyArray<WagerPreset> = [
  {
    id: 'w-dinner',
    period: 'weekly',
    emoji: '🍕',
    label: 'Dinner on loser',
    title: 'Sunday Dinner Date',
    description: 'Winner picks the spot and dessert. Loser handles the bill and the toast.',
    vibe: 'Classic',
  },
  {
    id: 'w-coffee',
    period: 'weekly',
    emoji: '☕',
    label: 'Coffee in bed',
    title: 'Morning Coffee & Pastries Run',
    description: 'Freshly brewed coffee and favorite bakery treat delivered right to bed.',
    vibe: 'Cozy',
  },
  {
    id: 'w-massage',
    period: 'weekly',
    emoji: '💆',
    label: '30m massage',
    title: '30-Minute Shoulder & Back Massage',
    description: 'Full phone-free relaxation session on the winner’s chosen evening.',
    vibe: 'Cozy',
  },
  {
    id: 'w-movie',
    period: 'weekly',
    emoji: '🎬',
    label: 'Movie + snacks',
    title: 'Double-Feature Movie Night',
    description: 'Winner gets total veto power over the film + custom snack spread.',
    vibe: 'Playful',
  },
  {
    id: 'w-brunch',
    period: 'weekly',
    emoji: '🍳',
    label: 'Home-cooked brunch',
    title: 'Chef’s Special Sunday Brunch',
    description: 'Loser cooks a full spread from scratch and handles every dish after.',
    vibe: 'Classic',
  },
  {
    id: 'w-chores',
    period: 'weekly',
    emoji: '🧹',
    label: 'Dish duty pass',
    title: 'Golden Pass on Chores',
    description: 'Loser takes kitchen cleanup and errands for 3 straight days.',
    vibe: 'Playful',
  },
  {
    id: 'm-spa',
    period: 'monthly',
    emoji: '🧖‍♀️',
    label: 'Full spa day',
    title: 'Full Day Spa & Thermal Bath',
    description: 'Grand monthly championship reward: luxury thermal bath day on the loser.',
    vibe: 'Grand',
  },
  {
    id: 'm-getaway',
    period: 'monthly',
    emoji: '✈️',
    label: 'Weekend escape',
    title: 'Spontaneous Weekend Getaway',
    description: 'Winner picks the destination within 3 hours; loser plans and books the stay.',
    vibe: 'Grand',
  },
  {
    id: 'm-tasting',
    period: 'monthly',
    emoji: '🍽️',
    label: 'Tasting menu',
    title: 'Fine Dining Tasting Menu',
    description: 'Dress-up celebratory night out at the winner’s dream restaurant.',
    vibe: 'Grand',
  },
  {
    id: 'm-treat',
    period: 'monthly',
    emoji: '🛍️',
    label: 'Wishlist treat',
    title: 'Mystery Wishlist Gift',
    description: 'Loser surprises the champion with something off their saved wishlist.',
    vibe: 'Grand',
  },
];

const EMBLEM_CHOICES = ['🏆', '🍕', '☕', '💆', '🎬', '🍳', '🧖‍♀️', '✈️', '🍽️', '🛍️', '🔥', '👑'] as const;

const HOLD_DURATION_MS = 650;

function extractEmojiAndTitle(rawTitle: string): { emoji: string; cleanTitle: string } {
  const trimmed = rawTitle.trim();
  if (!trimmed) return { emoji: '🏆', cleanTitle: '' };

  const emojiMatchStart = trimmed.match(/^(\p{Extended_Pictographic}(?:\uFE0F|\u200D\p{Extended_Pictographic})*)\s+(.+)$/u);
  if (emojiMatchStart) {
    return { emoji: emojiMatchStart[1], cleanTitle: emojiMatchStart[2].trim() };
  }

  const emojiMatchEnd = trimmed.match(/^(.+?)\s+(\p{Extended_Pictographic}(?:\uFE0F|\u200D\p{Extended_Pictographic})*)$/u);
  if (emojiMatchEnd) {
    return { emoji: emojiMatchEnd[2], cleanTitle: emojiMatchEnd[1].trim() };
  }

  return { emoji: '🏆', cleanTitle: trimmed };
}

function combineTitleAndEmoji(cleanTitle: string, emoji: string): string {
  const trimmed = cleanTitle.trim();
  if (!trimmed) return '';
  const { cleanTitle: stripped } = extractEmojiAndTitle(trimmed);
  if (!emoji || emoji === '🏆') return stripped;
  return `${stripped} ${emoji}`;
}

type ModalState =
  | { kind: 'closed' }
  | {
      kind: 'compose';
      mode: 'create' | 'edit';
      period: 'weekly' | 'monthly';
      existingStake?: Stake;
      initialEmoji?: string;
      initialTitle?: string;
      initialDesc?: string;
    };

export function WagerSection({
  selectedTier,
  activeWeeklyStake,
  activeMonthlyStake,
  stakes,
  checkIns,
  today,
  stakesRecord,
  players,
  comparison,
  countdownLabel,
  onCreateStake,
  onUpdateStake,
  onDeleteStake,
  surfaceTheme = 'app',
}: WagerSectionProps) {
  const [modal, setModal] = useState<ModalState>({ kind: 'closed' });
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [justSealedKey, setJustSealedKey] = useState<number>(0);

  const isProto = surfaceTheme === 'prototype';
  // Only a Stake whose window is still open can be edited or replaced; closed ones await the verdict.
  const openStake = (stake?: Stake | null) =>
    stake && stake.status === 'active' && getStakePhase(stake, today) === 'open' ? stake : null;
  const openWeeklyStake = openStake(activeWeeklyStake);
  const openMonthlyStake = openStake(activeMonthlyStake);
  const defaultPeriod: 'weekly' | 'monthly' = selectedTier === 'monthly' ? 'monthly' : 'weekly';
  const activeStake =
    selectedTier === 'monthly'
      ? openMonthlyStake
      : selectedTier === 'weekly'
        ? openWeeklyStake
        : null;

  const completedStakes = useMemo(
    () =>
      stakes
        .filter((s) => s.status === 'completed')
        .slice()
        .sort((a, b) => (b.dueDate || '').localeCompare(a.dueDate || '')),
    [stakes]
  );

  const periodPresets = useMemo(
    () => WAGER_PRESETS.filter((p) => p.period === defaultPeriod).slice(0, 4),
    [defaultPeriod]
  );

  // Auto-reset inline delete confirmation after 4s
  useEffect(() => {
    if (!confirmDeleteId) return;
    const t = window.setTimeout(() => setConfirmDeleteId(null), 4000);
    return () => window.clearTimeout(t);
  }, [confirmDeleteId]);

  const ownerColor = isProto ? 'var(--p-owner)' : players.maciek.color;
  const guestColor = isProto ? 'var(--p-guest)' : players.myrna.color;
  const ownerSoft = isProto ? 'var(--p-owner-soft)' : players.maciek.accentBg;
  const guestSoft = isProto ? 'var(--p-guest-soft)' : players.myrna.accentBg;

  const cardSurfaceStyle: React.CSSProperties = isProto
    ? {
        backgroundColor: 'var(--p-surface)',
        border: '1px solid var(--p-border)',
        boxShadow: 'var(--p-shadow-sm)',
        color: 'var(--p-ink)',
      }
    : {};

  const openCreateModal = useCallback(
    (preset?: WagerPreset, periodOverride?: 'weekly' | 'monthly') => {
      soundEngine.playClick();
      hapticLight();
      setConfirmDeleteId(null);
      setModal({
        kind: 'compose',
        mode: 'create',
        period: preset?.period ?? periodOverride ?? defaultPeriod,
        initialEmoji: preset?.emoji ?? (defaultPeriod === 'monthly' ? '🧖‍♀️' : '🍕'),
        initialTitle: preset?.title ?? '',
        initialDesc: preset?.description ?? '',
      });
    },
    [defaultPeriod]
  );

  const openEditModal = useCallback((stake: Stake) => {
    soundEngine.playClick();
    hapticLight();
    setConfirmDeleteId(null);
    const { emoji, cleanTitle } = extractEmojiAndTitle(stake.title);
    setModal({
      kind: 'compose',
      mode: 'edit',
      period: stake.period === 'monthly' ? 'monthly' : 'weekly',
      existingStake: stake,
      initialEmoji: emoji,
      initialTitle: cleanTitle,
      initialDesc: stake.description,
    });
  }, []);

  const handleComposeComplete = useCallback(
    (payload: {
      mode: 'create' | 'edit';
      period: 'weekly' | 'monthly';
      title: string;
      description: string;
      existingStake?: Stake;
    }) => {
      if (payload.mode === 'edit' && payload.existingStake) {
        onUpdateStake({
          ...payload.existingStake,
          title: payload.title,
          description: payload.description,
        });
      } else {
        const existingActiveForPeriod =
          payload.period === 'monthly' ? openMonthlyStake : openWeeklyStake;
        if (existingActiveForPeriod) {
          onUpdateStake({
            ...existingActiveForPeriod,
            title: payload.title,
            description: payload.description,
          });
        } else {
          onCreateStake({
            period: payload.period,
            title: payload.title,
            description: payload.description,
          });
        }
        setJustSealedKey(Date.now());
      }
      setModal({ kind: 'closed' });
    },
    [openMonthlyStake, openWeeklyStake, onCreateStake, onUpdateStake]
  );

  const leaderName =
    comparison.leader === 'maciek'
      ? players.maciek.name
      : comparison.leader === 'myrna'
        ? players.myrna.name
        : null;

  const paceHeadline =
    comparison.leader === 'tie'
      ? 'Dead heat — wide open'
      : `${leaderName} on track (+${comparison.delta.toLocaleString()} pts)`;

  const closingStakes = stakes.filter(
    (s) =>
      s.status === 'active' &&
      getStakePhase(s, today) === 'final-call' &&
      (selectedTier === 'karma' || s.period === selectedTier)
  );

  return (
    <>
      {closingStakes.map((stake) => (
        <FinalCallCard
          key={stake.id}
          stake={stake}
          today={today}
          scores={getStakePeriodScores(stake, checkIns)}
          players={players}
          ownerColor={ownerColor}
          guestColor={guestColor}
          cardSurfaceStyle={cardSurfaceStyle}
          isProto={isProto}
        />
      ))}

      <VerdictReveals
        stakes={completedStakes}
        checkIns={checkIns}
        today={today}
        players={players}
        ownerColor={ownerColor}
        guestColor={guestColor}
        cardSurfaceStyle={cardSurfaceStyle}
        isProto={isProto}
      />

      {selectedTier === 'karma' ? (
        /* All-Time Wager Ledger View */
        <section
          aria-label="All-time wager record"
          className={`relative overflow-hidden rounded-2xl p-4 sm:p-5 space-y-4 ${
            isProto
              ? ''
              : 'bg-white dark:bg-[#0e1013] border border-amber-500/25 dark:border-amber-500/20 shadow-xs'
          }`}
          style={{
            ...cardSurfaceStyle,
            borderColor: 'rgba(245, 158, 11, 0.28)',
          }}
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-[2px]"
            style={{
              background:
                'linear-gradient(90deg, transparent 0%, rgba(245,158,11,0.75) 50%, transparent 100%)',
            }}
          />

          <div className="flex items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/15 text-amber-500 dark:text-amber-400">
                <Trophy className="h-3.5 w-3.5" />
              </span>
              <div>
                <div className="text-[10px] font-mono uppercase tracking-[0.14em] font-semibold text-amber-600 dark:text-amber-400">
                  All-Time Wager Ledger
                </div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400 tabular-nums">
                  {stakesRecord.totalCompleted} settled · {stakesRecord.ties} draw{stakesRecord.ties === 1 ? '' : 's'}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => openCreateModal(undefined, 'weekly')}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-amber-500 px-3.5 text-xs font-semibold text-zinc-950 shadow-xs transition-[transform,background-color] duration-150 hover:bg-amber-400 active:scale-[0.96]"
            >
              <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
              <span>New Wager</span>
            </button>
          </div>

          {/* Head-to-head Wager Scoreboard */}
          <div className="grid grid-cols-2 gap-2.5">
            <div
              className="rounded-xl p-3 border"
              style={{
                backgroundColor: ownerSoft,
                borderColor: `color-mix(in srgb, ${ownerColor} 28%, transparent)`,
              }}
            >
              <div className="flex items-center gap-1.5 text-[11px] font-mono font-semibold" style={{ color: ownerColor }}>
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: ownerColor }} />
                <span>{players.maciek.name}</span>
              </div>
              <div className="mt-1 text-2xl font-bold font-mono tabular-nums">
                {stakesRecord.maciekWins}
                <span className="ml-1 text-xs font-medium opacity-70">wins</span>
              </div>
            </div>
            <div
              className="rounded-xl p-3 border text-right"
              style={{
                backgroundColor: guestSoft,
                borderColor: `color-mix(in srgb, ${guestColor} 28%, transparent)`,
              }}
            >
              <div className="flex items-center justify-end gap-1.5 text-[11px] font-mono font-semibold" style={{ color: guestColor }}>
                <span>{players.myrna.name}</span>
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: guestColor }} />
              </div>
              <div className="mt-1 text-2xl font-bold font-mono tabular-nums">
                {stakesRecord.myrnaWins}
                <span className="ml-1 text-xs font-medium opacity-70">wins</span>
              </div>
            </div>
          </div>

          {/* Active Wagers Snapshot */}
          {(openWeeklyStake || openMonthlyStake) && (
            <div className="space-y-1.5">
              {[openWeeklyStake, openMonthlyStake].filter(Boolean).map((s) => {
                const stakeItem = s as Stake;
                const { emoji, cleanTitle } = extractEmojiAndTitle(stakeItem.title);
                return (
                  <div
                    key={stakeItem.id}
                    className="flex items-center justify-between gap-2 rounded-xl border border-black/[0.06] dark:border-white/[0.08] bg-black/[0.02] dark:bg-white/[0.03] px-3 py-2"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-base leading-none" aria-hidden="true">{emoji}</span>
                      <div className="min-w-0">
                        <div className="text-[10px] font-mono uppercase tracking-wider text-amber-600 dark:text-amber-400 font-semibold">
                          Active {stakeItem.period}
                        </div>
                        <div className="text-xs font-semibold truncate">{cleanTitle}</div>
                      </div>
                    </div>
                    <span
                      className="inline-flex min-h-9 items-center gap-1 px-2.5 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-300 text-[11px] font-mono font-semibold shrink-0 tabular-nums"
                      title="The scoreboard settles this wager automatically"
                    >
                      <Scale className="h-3 w-3" />
                      {formatVerdictDay(getStakeVerdictDate(stakeItem))}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {completedStakes.length > 0 && (
            <PastWagersList stakes={completedStakes} players={players} ownerColor={ownerColor} guestColor={guestColor} />
          )}
        </section>
      ) : activeStake ? (
        /* ACTIVE WAGER — Official Duel Pact Card */
        <section
          key={justSealedKey > 0 ? `sealed-${activeStake.id}-${justSealedKey}` : activeStake.id}
          aria-label="Active wager"
          className={`relative overflow-hidden rounded-2xl p-4 sm:p-5 space-y-3.5 ${
            justSealedKey > 0 ? 'wager-card-ignite' : ''
          } ${
            isProto
              ? ''
              : 'bg-white dark:bg-[#0e1013] border border-amber-500/30 dark:border-amber-400/25 shadow-sm'
          }`}
          style={{
            ...cardSurfaceStyle,
            borderColor: 'rgba(245, 158, 11, 0.34)',
            backgroundImage: isProto
              ? 'radial-gradient(circle at 92% 0%, rgba(245, 158, 11, 0.12) 0%, transparent 52%)'
              : 'radial-gradient(circle at 92% 0%, rgba(245, 158, 11, 0.11) 0%, transparent 52%)',
          }}
        >
          {/* Gilded top edge hairline */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-[2px]"
            style={{
              background:
                'linear-gradient(90deg, transparent 0%, rgba(245,158,11,0.85) 50%, transparent 100%)',
            }}
          />

          {/* Diagonal light sweep when freshly sealed */}
          {justSealedKey > 0 && (
            <div
              aria-hidden="true"
              className="wager-sheen-sweep pointer-events-none absolute inset-y-0 left-0 w-1/2"
              style={{
                background:
                  'linear-gradient(90deg, transparent 0%, rgba(251, 191, 36, 0.28) 50%, transparent 100%)',
              }}
            />
          )}

          {/* Top Bar: Live Beacon + Period + Record */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="inline-flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5 items-center justify-center" aria-hidden="true">
                <span className="wager-beacon-ring absolute inline-flex h-full w-full rounded-full bg-amber-400" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
              </span>
              <span className="text-[10px] font-mono uppercase tracking-[0.15em] font-bold text-amber-600 dark:text-amber-400">
                On The Line · {activeStake.period === 'monthly' ? 'Monthly' : 'Weekly'} Wager
              </span>
            </div>

            <div className="flex items-center gap-2 text-[11px] font-mono tabular-nums">
              {countdownLabel && (
                <span className="inline-flex items-center gap-1 rounded-full border border-black/[0.07] dark:border-white/[0.08] bg-black/[0.03] dark:bg-white/[0.04] px-2 py-0.5 text-[10px] text-zinc-600 dark:text-zinc-300">
                  <Clock className="h-2.5 w-2.5 opacity-70" />
                  {countdownLabel}
                </span>
              )}
              <span className="inline-flex items-center gap-1 text-[10px] text-zinc-500 dark:text-zinc-400">
                <Trophy className="h-3 w-3 text-amber-500" />
                {players.maciek.name} {stakesRecord.maciekWins}–{stakesRecord.myrnaWins} {players.myrna.name}
              </span>
            </div>
          </div>

          {/* Centerpiece Hero Wager Display */}
          {(() => {
            const { emoji, cleanTitle } = extractEmojiAndTitle(activeStake.title);
            return (
              <div className="flex items-start gap-3.5">
                <div
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/12 text-2xl shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]"
                  aria-hidden="true"
                >
                  {emoji}
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="text-base sm:text-lg font-bold tracking-tight leading-snug text-balance">
                      {cleanTitle}
                    </h2>
                    {justSealedKey > 0 && (
                      <span className="wager-stamp-slam shrink-0 rounded-md border border-amber-500/60 bg-amber-500/15 px-2 py-0.5 font-mono text-[10px] font-extrabold uppercase tracking-[0.14em] text-amber-600 dark:text-amber-300">
                        Sealed
                      </span>
                    )}
                  </div>
                  {activeStake.description && (
                    <p className="text-xs sm:text-[13px] leading-relaxed text-zinc-600 dark:text-zinc-400 text-pretty">
                      {activeStake.description}
                    </p>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Live Pace Connection Strip */}
          <div className="rounded-xl border border-black/[0.06] dark:border-white/[0.07] bg-black/[0.025] dark:bg-white/[0.03] p-2.5 space-y-2">
            <div className="flex items-center justify-between gap-2 text-[11px] font-mono">
              <span className="inline-flex items-center gap-1.5 font-semibold truncate">
                <Flame
                  className="h-3.5 w-3.5 shrink-0"
                  style={{
                    color:
                      comparison.leader === 'maciek'
                        ? ownerColor
                        : comparison.leader === 'myrna'
                          ? guestColor
                          : '#f59e0b',
                  }}
                />
                <span className="truncate">{paceHeadline}</span>
              </span>
              <span className="text-[10px] text-zinc-500 dark:text-zinc-400 tabular-nums shrink-0">
                {comparison.maciekPct}% · {comparison.myrnaPct}%
              </span>
            </div>
            <div className="h-1.5 w-full rounded-full overflow-hidden flex bg-black/[0.08] dark:bg-white/[0.08]">
              <div
                className="h-full transition-[width] duration-500"
                style={{ width: `${comparison.maciekPct}%`, backgroundColor: ownerColor }}
              />
              <div
                className="h-full transition-[width] duration-500"
                style={{ width: `${comparison.myrnaPct}%`, backgroundColor: guestColor }}
              />
            </div>
          </div>

          {/* Footer Pact Signature & Actions */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-mono text-zinc-500 dark:text-zinc-400">
              <Handshake className="h-3.5 w-3.5 text-amber-500/80" />
              <span>
                {players.maciek.name} × {players.myrna.name} · Pact active
              </span>
            </span>

            <div className="flex items-center gap-1.5">
              <span
                className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 text-[11px] font-mono font-semibold text-amber-700 dark:text-amber-300"
                title={`Settled by points after ${formatVerdictDay(getStakePeriodEnd(activeStake))}. Nobody crowns themselves.`}
              >
                <Scale className="h-3.5 w-3.5" />
                <span>Scoreboard decides</span>
              </span>

              <button
                type="button"
                onClick={() => openEditModal(activeStake)}
                aria-label="Edit wager"
                title="Edit wager"
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-black/[0.08] dark:border-white/[0.09] text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition-[transform,color,background-color] duration-150 active:scale-[0.96]"
              >
                <Sliders className="h-3.5 w-3.5" />
              </button>

              {confirmDeleteId === activeStake.id ? (
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playUncheck();
                    hapticMedium();
                    onDeleteStake(activeStake.id);
                    setConfirmDeleteId(null);
                  }}
                  aria-label="Confirm delete wager"
                  className="inline-flex min-h-10 items-center gap-1 rounded-xl border border-red-500/40 bg-red-500/15 px-2.5 text-[11px] font-mono font-semibold text-red-500 dark:text-red-300 transition-[transform,background-color] duration-150 active:scale-[0.96]"
                >
                  <span>Remove?</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    hapticLight();
                    setConfirmDeleteId(activeStake.id);
                  }}
                  aria-label="Delete wager"
                  title="Delete wager"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-black/[0.08] dark:border-white/[0.09] text-zinc-500 hover:text-red-500 dark:text-zinc-400 dark:hover:text-red-400 transition-[transform,color] duration-150 active:scale-[0.96]"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Collapsible Past Wagers Strip */}
          {completedStakes.length > 0 && (
            <div className="pt-2 border-t border-black/[0.06] dark:border-white/[0.07]">
              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  hapticLight();
                  setHistoryOpen((prev) => !prev);
                }}
                aria-expanded={historyOpen}
                className="flex w-full min-h-9 items-center justify-between text-[11px] font-mono text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors"
              >
                <span className="inline-flex items-center gap-1.5">
                  <History className="h-3.5 w-3.5" />
                  <span>Past Wagers ({completedStakes.length})</span>
                </span>
                <ChevronDown
                  className={`h-3.5 w-3.5 transition-transform duration-200 ${historyOpen ? 'rotate-180' : ''}`}
                />
              </button>
              {historyOpen && (
                <div className="pt-2">
                  <PastWagersList
                    stakes={completedStakes}
                    players={players}
                    ownerColor={ownerColor}
                    guestColor={guestColor}
                  />
                </div>
              )}
            </div>
          )}
        </section>
      ) : (
        /* EMPTY STATE — Raise The Stakes Invitation Card */
        <section
          aria-label="Set a new wager"
          className={`relative overflow-hidden rounded-2xl p-4 sm:p-5 space-y-4 ${
            isProto
              ? ''
              : 'bg-white dark:bg-[#0e1013] border border-amber-500/25 dark:border-amber-400/20 shadow-xs'
          }`}
          style={{
            ...cardSurfaceStyle,
            borderColor: 'rgba(245, 158, 11, 0.28)',
            backgroundImage:
              'radial-gradient(circle at 88% 8%, rgba(245, 158, 11, 0.11) 0%, transparent 55%)',
          }}
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-[2px]"
            style={{
              background:
                'linear-gradient(90deg, transparent 0%, rgba(245,158,11,0.7) 50%, transparent 100%)',
            }}
          />

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="inline-flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.15em] font-bold text-amber-600 dark:text-amber-400">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Raise The Stakes · {defaultPeriod === 'monthly' ? 'Monthly' : 'Weekly'}</span>
            </div>
            <span className="inline-flex items-center gap-1 text-[10px] font-mono text-zinc-500 dark:text-zinc-400 tabular-nums">
              <Trophy className="h-3 w-3 text-amber-500" />
              {players.maciek.name} {stakesRecord.maciekWins}–{stakesRecord.myrnaWins} {players.myrna.name}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1 min-w-0">
              <h2 className="text-base sm:text-lg font-bold tracking-tight text-balance">
                Put something real on the line
              </h2>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 text-pretty">
                {comparison.leader === 'tie'
                  ? `You're dead even this ${defaultPeriod === 'monthly' ? 'month' : 'week'} — lock in a reward to fire up the duel.`
                  : `${leaderName} leads by ${comparison.delta.toLocaleString()} pts — make this ${defaultPeriod === 'monthly' ? 'month' : 'week'}'s win count.`}
              </p>
            </div>

            <button
              type="button"
              onClick={() => openCreateModal()}
              aria-label="Set new wager"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 text-xs font-bold text-zinc-950 shadow-sm transition-[transform,background-color] duration-150 hover:bg-amber-400 active:scale-[0.96] shrink-0"
            >
              <Handshake className="h-4 w-4" />
              <span>Put It On The Line</span>
            </button>
          </div>

          {/* Quick-Launch Wager Sparks */}
          <div className="space-y-2">
            <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Quick sparks — tap to draft
            </div>
            <div className="flex flex-wrap gap-1.5">
              {periodPresets.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => openCreateModal(preset)}
                  className="wager-chip-hover inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-black/[0.08] dark:border-white/[0.09] bg-black/[0.025] dark:bg-white/[0.04] px-3 text-xs font-medium transition-[transform,background-color,border-color] duration-150 hover:border-amber-500/45 active:scale-[0.96]"
                >
                  <span aria-hidden="true">{preset.emoji}</span>
                  <span>{preset.label}</span>
                </button>
              ))}
            </div>
          </div>

          {completedStakes.length > 0 && (
            <div className="pt-2 border-t border-black/[0.06] dark:border-white/[0.07]">
              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  hapticLight();
                  setHistoryOpen((prev) => !prev);
                }}
                aria-expanded={historyOpen}
                className="flex w-full min-h-9 items-center justify-between text-[11px] font-mono text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors"
              >
                <span className="inline-flex items-center gap-1.5">
                  <History className="h-3.5 w-3.5" />
                  <span>Past Wagers ({completedStakes.length})</span>
                </span>
                <ChevronDown
                  className={`h-3.5 w-3.5 transition-transform duration-200 ${historyOpen ? 'rotate-180' : ''}`}
                />
              </button>
              {historyOpen && (
                <div className="pt-2">
                  <PastWagersList
                    stakes={completedStakes}
                    players={players}
                    ownerColor={ownerColor}
                    guestColor={guestColor}
                  />
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {/* Wager Composer Studio Modal */}
      {modal.kind === 'compose' && (
        <WagerComposerModal
          mode={modal.mode}
          initialPeriod={modal.period}
          existingStake={modal.existingStake}
          initialEmoji={modal.initialEmoji ?? '🍕'}
          initialTitle={modal.initialTitle ?? ''}
          initialDesc={modal.initialDesc ?? ''}
          players={players}
          ownerColor={ownerColor}
          guestColor={guestColor}
          countdownLabel={countdownLabel}
          isProto={isProto}
          onClose={() => {
            soundEngine.playClick();
            hapticLight();
            setModal({ kind: 'closed' });
          }}
          onComplete={handleComposeComplete}
        />
      )}

    </>
  );
}

const verdictDayFormatter = new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
const monthNameFormatter = new Intl.DateTimeFormat('en-US', { month: 'long' });

function formatVerdictDay(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  return verdictDayFormatter.format(new Date(year, month - 1, day));
}

function formatStakeWindow(stake: Pick<Stake, 'period' | 'periodKey'>): string {
  if (stake.period === 'weekly') {
    const week = /W(\d+)$/.exec(stake.periodKey)?.[1];
    return week ? `Week ${Number(week)}` : 'Last week';
  }
  if (stake.period === 'monthly') {
    const [year, month] = stake.periodKey.split('-').map(Number);
    return year && month ? monthNameFormatter.format(new Date(year, month - 1, 1)) : 'Last month';
  }
  return stake.periodKey;
}

interface ScoreDuelBarProps {
  scores: { maciek: number; myrna: number };
  players: Record<PlayerId, Player>;
  ownerColor: string;
  guestColor: string;
  winnerId?: PlayerId | 'tie';
}

/** Head-to-head points for a Stake's own window, winner side emphasized. */
function ScoreDuelBar({ scores, players, ownerColor, guestColor, winnerId }: ScoreDuelBarProps) {
  const total = scores.maciek + scores.myrna;
  const maciekPct = total === 0 ? 50 : Math.round((scores.maciek / total) * 100);
  const dim = (id: PlayerId) => (winnerId && winnerId !== 'tie' && winnerId !== id ? 0.55 : 1);
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2 font-mono tabular-nums">
        <span className="inline-flex items-baseline gap-1.5 min-w-0" style={{ opacity: dim('maciek') }}>
          <span className="truncate text-[11px] font-semibold" style={{ color: ownerColor }}>
            {players.maciek.name}
          </span>
          <span className="text-base font-bold">{scores.maciek.toLocaleString()}</span>
        </span>
        <span className="inline-flex items-baseline gap-1.5 min-w-0" style={{ opacity: dim('myrna') }}>
          <span className="text-base font-bold">{scores.myrna.toLocaleString()}</span>
          <span className="truncate text-[11px] font-semibold" style={{ color: guestColor }}>
            {players.myrna.name}
          </span>
        </span>
      </div>
      <div
        role="img"
        aria-label={`${players.maciek.name} ${scores.maciek} points, ${players.myrna.name} ${scores.myrna} points`}
        className="h-1.5 w-full rounded-full overflow-hidden flex bg-black/[0.08] dark:bg-white/[0.08]"
      >
        <div className="h-full" style={{ width: `${maciekPct}%`, backgroundColor: ownerColor, opacity: dim('maciek') }} />
        <div className="h-full" style={{ width: `${100 - maciekPct}%`, backgroundColor: guestColor, opacity: dim('myrna') }} />
      </div>
    </div>
  );
}

interface StakeCardChromeProps {
  cardSurfaceStyle: React.CSSProperties;
  isProto: boolean;
}

/** Photo finish: the window has closed, late logs still count until the verdict is written. */
function FinalCallCard({
  stake,
  today,
  scores,
  players,
  ownerColor,
  guestColor,
  cardSurfaceStyle,
  isProto,
}: StakeCardChromeProps & {
  stake: Stake;
  today: string;
  scores: { maciek: number; myrna: number; winnerId: PlayerId | 'tie' };
  players: Record<PlayerId, Player>;
  ownerColor: string;
  guestColor: string;
}) {
  const { emoji, cleanTitle } = extractEmojiAndTitle(stake.title);
  const verdictDate = getStakeVerdictDate(stake);
  const lastLogDay = addDays(verdictDate, -1);
  const leader = scores.winnerId === 'tie' ? null : players[scores.winnerId];
  const margin = Math.abs(scores.maciek - scores.myrna);

  return (
    <section
      aria-label={`Final call for ${cleanTitle}`}
      className={`relative overflow-hidden rounded-2xl p-4 space-y-3 ${
        isProto ? '' : 'bg-white dark:bg-[#0e1013] border shadow-xs'
      }`}
      style={{
        ...cardSurfaceStyle,
        borderColor: 'rgba(245, 158, 11, 0.4)',
        borderStyle: 'dashed',
        borderWidth: 1,
      }}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="inline-flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.15em] font-bold text-amber-600 dark:text-amber-400">
          <span className="relative flex h-2.5 w-2.5 items-center justify-center" aria-hidden="true">
            <span className="wager-beacon-ring absolute inline-flex h-full w-full rounded-full bg-amber-400" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
          </span>
          Final Call · {formatStakeWindow(stake)} closed
        </span>
        <span className="inline-flex items-center gap-1 rounded-full border border-black/[0.07] dark:border-white/[0.08] bg-black/[0.03] dark:bg-white/[0.04] px-2 py-0.5 text-[10px] font-mono text-zinc-600 dark:text-zinc-300">
          <Clock className="h-2.5 w-2.5 opacity-70" />
          Verdict {formatVerdictDay(verdictDate)}
        </span>
      </div>

      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/10 text-xl" aria-hidden="true">
          {emoji}
        </span>
        <div className="min-w-0 space-y-0.5">
          <h2 className="text-sm font-bold tracking-tight truncate">{cleanTitle}</h2>
          <p className="text-xs leading-relaxed text-zinc-600 dark:text-zinc-400 text-pretty">
            {leader
              ? `${leader.name} is ahead by ${margin.toLocaleString()} pts.`
              : 'Dead level.'}{' '}
            Late logs for {formatStakeWindow(stake)} count {lastLogDay === today ? 'until midnight' : `through ${formatVerdictDay(lastLogDay)}`}, then the scoreboard decides.
          </p>
        </div>
      </div>

      <ScoreDuelBar scores={scores} players={players} ownerColor={ownerColor} guestColor={guestColor} />
    </section>
  );
}

const SEEN_VERDICTS_KEY = 'do-it:seen-wager-verdicts';
const VERDICT_SPOTLIGHT_DAYS = 7;

function readSeenVerdicts(): string[] {
  try {
    const raw = window.localStorage.getItem(SEEN_VERDICTS_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

function writeSeenVerdicts(ids: string[]) {
  try {
    window.localStorage.setItem(SEEN_VERDICTS_KEY, JSON.stringify(ids.slice(-40)));
  } catch {
    /* Private mode or blocked storage: the verdict simply shows again next visit. */
  }
}

/**
 * Freshly settled Stakes, announced once per device. Settlement happens in the
 * store; this only presents the result the scoreboard already wrote.
 */
function VerdictReveals({
  stakes,
  checkIns,
  today,
  players,
  ownerColor,
  guestColor,
  cardSurfaceStyle,
  isProto,
}: StakeCardChromeProps & {
  stakes: Stake[];
  checkIns: CheckIn[];
  today: string;
  players: Record<PlayerId, Player>;
  ownerColor: string;
  guestColor: string;
}) {
  const [seen, setSeen] = useState<string[] | null>(null);

  useEffect(() => {
    setSeen(readSeenVerdicts());
  }, []);

  const fresh = useMemo(() => {
    if (!seen) return [];
    return stakes.filter(
      (s) =>
        s.winnerId &&
        !seen.includes(s.id) &&
        today < addDays(getStakeVerdictDate(s), VERDICT_SPOTLIGHT_DAYS)
    );
  }, [stakes, seen, today]);

  // Accepting a win gets the fanfare; a draw stays quiet.
  const dismiss = (id: string, isTie: boolean) => {
    if (isTie) {
      soundEngine.playClick();
      hapticLight();
    } else {
      soundEngine.playFanfare();
      hapticCelebration();
    }
    setSeen((prev) => {
      const next = [...(prev ?? []), id];
      writeSeenVerdicts(next);
      return next;
    });
  };

  return (
    <>
      {fresh.map((stake) => {
        const { emoji, cleanTitle } = extractEmojiAndTitle(stake.title);
        const scores = getStakePeriodScores(stake, checkIns);
        const winnerId = stake.winnerId as PlayerId | 'tie';
        const isTie = winnerId === 'tie';
        const winner = isTie ? null : players[winnerId];
        const loser = isTie ? null : players[winnerId === 'maciek' ? 'myrna' : 'maciek'];
        const winnerColor = winnerId === 'maciek' ? ownerColor : winnerId === 'myrna' ? guestColor : '#f59e0b';
        const margin = Math.abs(scores.maciek - scores.myrna);

        return (
          <section
            key={stake.id}
            aria-label={`Wager verdict: ${cleanTitle}`}
            className={`wager-card-ignite relative overflow-hidden rounded-2xl p-4 sm:p-5 space-y-3.5 ${
              isProto ? '' : 'bg-white dark:bg-[#0e1013] border shadow-sm'
            }`}
            style={{
              ...cardSurfaceStyle,
              borderColor: `color-mix(in srgb, ${winnerColor} 45%, transparent)`,
              backgroundImage: `radial-gradient(circle at 50% -10%, color-mix(in srgb, ${winnerColor} 18%, transparent) 0%, transparent 60%)`,
            }}
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 top-0 h-[2px]"
              style={{ background: `linear-gradient(90deg, transparent 0%, ${winnerColor} 50%, transparent 100%)` }}
            />
            <div
              aria-hidden="true"
              className="wager-sheen-sweep pointer-events-none absolute inset-y-0 left-0 w-1/2"
              style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(251, 191, 36, 0.22) 50%, transparent 100%)' }}
            />

            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-[0.15em] font-bold text-amber-600 dark:text-amber-400">
                <Scale className="h-3.5 w-3.5" />
                Verdict · {formatStakeWindow(stake)}
              </span>
              <span
                className="wager-stamp-slam shrink-0 rounded-md border px-2 py-0.5 font-mono text-[10px] font-extrabold uppercase tracking-[0.14em]"
                style={{
                  borderColor: `color-mix(in srgb, ${winnerColor} 60%, transparent)`,
                  backgroundColor: `color-mix(in srgb, ${winnerColor} 14%, transparent)`,
                  color: winnerColor,
                }}
              >
                Settled
              </span>
            </div>

            <div className="flex flex-col items-center text-center gap-1.5 py-1">
              <span
                className="flex h-12 w-12 items-center justify-center rounded-full"
                style={{ backgroundColor: `color-mix(in srgb, ${winnerColor} 16%, transparent)`, color: winnerColor }}
                aria-hidden="true"
              >
                {isTie ? <Handshake className="h-6 w-6" /> : <Crown className="h-6 w-6" />}
              </span>
              <h2 className="text-xl font-bold tracking-tight text-balance" style={{ color: isTie ? undefined : winnerColor }}>
                {isTie ? 'Dead heat' : `${winner!.name} takes it`}
              </h2>
              <p className="text-xs font-mono text-zinc-500 dark:text-zinc-400 tabular-nums">
                {isTie
                  ? `${scores.maciek.toLocaleString()} apiece. Split it, or run it back.`
                  : `Won by ${margin.toLocaleString()} pt${margin === 1 ? '' : 's'}`}
              </p>
            </div>

            <ScoreDuelBar
              scores={scores}
              players={players}
              ownerColor={ownerColor}
              guestColor={guestColor}
              winnerId={winnerId}
            />

            <div className="flex items-start gap-3 rounded-xl border border-amber-500/25 bg-amber-500/[0.07] p-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 text-lg" aria-hidden="true">
                {emoji}
              </span>
              <div className="min-w-0">
                <div className="text-[10px] font-mono uppercase tracking-wider font-semibold text-amber-700 dark:text-amber-300">
                  {isTie ? 'The pot' : `${loser!.name} owes ${winner!.name}`}
                </div>
                <div className="text-sm font-bold truncate">{cleanTitle}</div>
                {stake.description && (
                  <p className="text-xs text-zinc-600 dark:text-zinc-400 line-clamp-2">{stake.description}</p>
                )}
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => dismiss(stake.id, isTie)}
                className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-amber-500 px-3.5 text-xs font-semibold text-zinc-950 shadow-xs transition-[transform,background-color] duration-150 hover:bg-amber-400 active:scale-[0.96]"
              >
                <Check className="h-3.5 w-3.5 stroke-[2.5]" />
                <span>{isTie ? 'Fair enough' : 'Deal'}</span>
              </button>
            </div>
          </section>
        );
      })}
    </>
  );
}

function PastWagersList({
  stakes,
  players,
  ownerColor,
  guestColor,
}: {
  stakes: Stake[];
  players: Record<PlayerId, Player>;
  ownerColor: string;
  guestColor: string;
}) {
  return (
    <div className="space-y-1.5">
      {stakes.slice(0, 5).map((item) => {
        const { emoji, cleanTitle } = extractEmojiAndTitle(item.title);
        const winnerName =
          item.winnerId === 'maciek'
            ? players.maciek.name
            : item.winnerId === 'myrna'
              ? players.myrna.name
              : 'Draw';
        const winnerColor =
          item.winnerId === 'maciek'
            ? ownerColor
            : item.winnerId === 'myrna'
              ? guestColor
              : '#9ca3af';

        return (
          <div
            key={item.id}
            className="flex items-center justify-between gap-2 rounded-xl border border-black/[0.05] dark:border-white/[0.06] bg-black/[0.02] dark:bg-white/[0.02] px-3 py-2 text-xs"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-sm leading-none" aria-hidden="true">{emoji}</span>
              <span className="font-medium truncate">{cleanTitle}</span>
            </div>
            <span
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold shrink-0"
              style={{
                backgroundColor: `color-mix(in srgb, ${winnerColor} 16%, transparent)`,
                color: winnerColor,
              }}
            >
              {item.winnerId !== 'tie' && <Crown className="h-2.5 w-2.5" />}
              {winnerName}
            </span>
          </div>
        );
      })}
    </div>
  );
}

interface WagerComposerModalProps {
  mode: 'create' | 'edit';
  initialPeriod: 'weekly' | 'monthly';
  existingStake?: Stake;
  initialEmoji: string;
  initialTitle: string;
  initialDesc: string;
  players: Record<PlayerId, Player>;
  ownerColor: string;
  guestColor: string;
  countdownLabel: string;
  isProto: boolean;
  onClose: () => void;
  onComplete: (payload: {
    mode: 'create' | 'edit';
    period: 'weekly' | 'monthly';
    title: string;
    description: string;
    existingStake?: Stake;
  }) => void;
}

function WagerComposerModal({
  mode,
  initialPeriod,
  existingStake,
  initialEmoji,
  initialTitle,
  initialDesc,
  players,
  ownerColor,
  guestColor,
  countdownLabel,
  isProto,
  onClose,
  onComplete,
}: WagerComposerModalProps) {
  const [period, setPeriod] = useState<'weekly' | 'monthly'>(initialPeriod);
  const [emoji, setEmoji] = useState(initialEmoji);
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDesc);
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const [diceSpinKey, setDiceSpinKey] = useState(0);
  const [previewSwapKey, setPreviewSwapKey] = useState(0);

  // Hold-to-Seal ceremony state
  const [isHolding, setIsHolding] = useState(false);
  const [holdHint, setHoldHint] = useState<string | null>(null);
  const [quickTapArmed, setQuickTapArmed] = useState(false);
  const [sealedOverlay, setSealedOverlay] = useState(false);

  const holdTimerRef = useRef<number | null>(null);
  const tickTimersRef = useRef<number[]>([]);
  const closeTimerRef = useRef<number | null>(null);
  const quickTapTimerRef = useRef<number | null>(null);
  const sealedRef = useRef(false);

  const presetsForPeriod = useMemo(
    () => WAGER_PRESETS.filter((p) => p.period === period),
    [period]
  );

  const clearHoldTimers = useCallback(() => {
    if (holdTimerRef.current !== null) {
      window.clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    tickTimersRef.current.forEach((id) => window.clearTimeout(id));
    tickTimersRef.current = [];
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !sealedOverlay) {
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      clearHoldTimers();
      if (closeTimerRef.current !== null) window.clearTimeout(closeTimerRef.current);
      if (quickTapTimerRef.current !== null) window.clearTimeout(quickTapTimerRef.current);
    };
  }, [clearHoldTimers, onClose, sealedOverlay]);

  const trimmedTitle = title.trim();
  const canCommit = trimmedTitle.length > 0;

  const finalizeCommit = useCallback(() => {
    if (sealedRef.current) return;
    if (!title.trim()) return;
    sealedRef.current = true;
    clearHoldTimers();
    setIsHolding(false);
    setHoldHint(null);

    const finalTitle = combineTitleAndEmoji(title, emoji);
    const finalDesc = description.trim();

    if (mode === 'edit') {
      soundEngine.playCheck();
      hapticSuccess();
      onComplete({
        mode: 'edit',
        period,
        title: finalTitle,
        description: finalDesc,
        existingStake,
      });
      return;
    }

    // Full ceremony for creating a new wager
    soundEngine.playWagerSeal();
    hapticCelebration();
    setSealedOverlay(true);

    closeTimerRef.current = window.setTimeout(() => {
      onComplete({
        mode: 'create',
        period,
        title: finalTitle,
        description: finalDesc,
      });
    }, 900);
  }, [clearHoldTimers, description, emoji, existingStake, mode, onComplete, period, title]);

  const applyPreset = (preset: WagerPreset) => {
    soundEngine.playClick();
    hapticLight();
    setSelectedPresetId(preset.id);
    setEmoji(preset.emoji);
    setTitle(preset.title);
    setDescription(preset.description);
    setPreviewSwapKey((k) => k + 1);
    setHoldHint(null);
  };

  const handleSurpriseMe = () => {
    const pool = presetsForPeriod;
    const currentIdx = pool.findIndex((p) => p.id === selectedPresetId || p.title === title.trim());
    const nextPreset = pool[(currentIdx + 1) % pool.length];
    if (!nextPreset) return;

    soundEngine.playDiceRoll();
    hapticMedium();
    setDiceSpinKey((k) => k + 1);
    setSelectedPresetId(nextPreset.id);
    setEmoji(nextPreset.emoji);
    setTitle(nextPreset.title);
    setDescription(nextPreset.description);
    setPreviewSwapKey((k) => k + 1);
    setHoldHint(null);
  };

  const handleHoldStart = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!canCommit || sealedOverlay) return;
    if (e.button !== 0 && e.pointerType === 'mouse') return;

    // If user already tapped once quickly, second tap seals immediately
    if (quickTapArmed) {
      finalizeCommit();
      return;
    }

    e.currentTarget.setPointerCapture?.(e.pointerId);
    setIsHolding(true);
    setHoldHint(null);
    hapticLight();
    soundEngine.playWagerChargeTick(0);

    tickTimersRef.current = [
      window.setTimeout(() => {
        soundEngine.playWagerChargeTick(1);
        hapticLight();
      }, 210),
      window.setTimeout(() => {
        soundEngine.playWagerChargeTick(2);
        hapticMedium();
      }, 430),
    ];

    holdTimerRef.current = window.setTimeout(() => {
      finalizeCommit();
    }, HOLD_DURATION_MS);
  };

  const handleHoldCancel = () => {
    if (!isHolding || sealedRef.current) return;
    clearHoldTimers();
    setIsHolding(false);
    soundEngine.playClick();
    setHoldHint('Hold briefly to seal — or tap again to lock now');
    setQuickTapArmed(true);
    if (quickTapTimerRef.current !== null) window.clearTimeout(quickTapTimerRef.current);
    quickTapTimerRef.current = window.setTimeout(() => {
      setQuickTapArmed(false);
    }, 2800);
  };

  const modalShellStyle: React.CSSProperties = isProto
    ? {
        backgroundColor: 'var(--p-surface-elevated, var(--p-surface))',
        border: '1px solid var(--p-border-strong)',
        color: 'var(--p-ink)',
      }
    : {};

  return (
    <div
      className="wager-backdrop-enter fixed inset-0 z-[85] flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-md sm:p-4"
      onClick={() => {
        if (sealedOverlay) {
          if (closeTimerRef.current !== null) window.clearTimeout(closeTimerRef.current);
          onComplete({
            mode: 'create',
            period,
            title: combineTitleAndEmoji(title, emoji),
            description: description.trim(),
          });
          return;
        }
        onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="wager-studio-title"
        onClick={(e) => e.stopPropagation()}
        style={modalShellStyle}
        className={`wager-modal-enter relative w-full sm:max-w-lg max-h-[92dvh] overflow-y-auto rounded-t-3xl sm:rounded-2xl p-5 sm:p-6 shadow-2xl ${
          isProto
            ? ''
            : 'bg-white dark:bg-[#0e1013] border border-black/[0.08] dark:border-zinc-800 text-zinc-900 dark:text-white'
        }`}
      >
        {sealedOverlay ? (
          /* CEREMONIAL "WAGER SEALED" REVEAL */
          <div
            className="py-6 sm:py-8 text-center space-y-5 cursor-pointer"
            onClick={() => {
              if (closeTimerRef.current !== null) window.clearTimeout(closeTimerRef.current);
              onComplete({
                mode: 'create',
                period,
                title: combineTitleAndEmoji(title, emoji),
                description: description.trim(),
              });
            }}
          >
            <div className="relative mx-auto max-w-sm overflow-hidden rounded-2xl border border-amber-500/50 bg-gradient-to-br from-amber-500/15 via-amber-500/5 to-transparent p-5 text-left shadow-[0_12px_40px_-8px_rgba(245,158,11,0.35)]">
              <div
                aria-hidden="true"
                className="wager-sheen-sweep pointer-events-none absolute inset-y-0 left-0 w-1/2"
                style={{
                  background:
                    'linear-gradient(90deg, transparent 0%, rgba(251, 191, 36, 0.35) 50%, transparent 100%)',
                }}
              />
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-amber-600 dark:text-amber-300">
                  {period === 'monthly' ? 'Monthly Championship' : 'Weekly Duel Pact'}
                </span>
                <span className="wager-stamp-slam inline-flex items-center gap-1 rounded-md border-2 border-amber-500 bg-amber-500/20 px-2 py-0.5 font-mono text-[10px] font-black uppercase tracking-[0.18em] text-amber-600 dark:text-amber-300">
                  <Check className="h-3 w-3 stroke-[3]" />
                  Sealed
                </span>
              </div>

              <div className="mt-4 flex items-center gap-3">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-amber-500/35 bg-amber-500/15 text-2xl">
                  {emoji}
                </span>
                <div className="min-w-0">
                  <div className="text-lg font-bold tracking-tight leading-snug text-balance">
                    {trimmedTitle}
                  </div>
                  {description.trim() && (
                    <p className="mt-0.5 text-xs text-zinc-600 dark:text-zinc-300 line-clamp-2">
                      {description.trim()}
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-amber-500/20 pt-3 font-mono text-[11px]">
                <span className="font-semibold" style={{ color: ownerColor }}>
                  {players.maciek.name}
                </span>
                <span className="text-amber-500">×</span>
                <span className="font-semibold" style={{ color: guestColor }}>
                  {players.myrna.name}
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-sm font-bold tracking-tight">It&apos;s officially on the line.</p>
              <p className="text-xs font-mono text-zinc-500 dark:text-zinc-400">
                Game on — may the most consistent player win.
              </p>
            </div>
          </div>
        ) : (
          /* COMPOSER FORM */
          <form
            onSubmit={(e) => {
              e.preventDefault();
              finalizeCommit();
            }}
            className="space-y-4"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="inline-flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-amber-600 dark:text-amber-400">
                  <Trophy className="h-3.5 w-3.5" />
                  <span>{mode === 'edit' ? 'Edit Duel Pact' : 'Wager Studio'}</span>
                </div>
                <h3 id="wager-studio-title" className="mt-0.5 text-lg font-bold tracking-tight">
                  {mode === 'edit' ? 'Tune the stakes' : 'Make this duel count'}
                </h3>
              </div>

              <button
                type="button"
                onClick={onClose}
                aria-label="Close wager dialog"
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-black/[0.08] dark:border-white/[0.1] text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition-[transform,color] duration-150 active:scale-[0.96]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Live Pact Ticket Preview */}
            <div
              className="wager-stagger-1 relative overflow-hidden rounded-2xl border p-4 transition-[transform,box-shadow,border-color] duration-200"
              style={{
                borderColor: isHolding
                  ? 'rgba(245, 158, 11, 0.85)'
                  : canCommit
                    ? 'rgba(245, 158, 11, 0.36)'
                    : 'rgba(128, 128, 128, 0.22)',
                background:
                  'radial-gradient(circle at 90% 0%, rgba(245, 158, 11, 0.14) 0%, transparent 56%)',
                transform: isHolding ? 'scale(1.018)' : 'scale(1)',
                boxShadow: isHolding
                  ? '0 0 0 1px rgba(245, 158, 11, 0.45), 0 14px 32px -6px rgba(245, 158, 11, 0.32)'
                  : 'none',
              }}
            >
              <div className="flex items-center justify-between gap-2 text-[10px] font-mono uppercase tracking-[0.14em]">
                <span className="font-bold text-amber-600 dark:text-amber-400">
                  {isHolding
                    ? 'Sealing Pact...'
                    : period === 'monthly'
                      ? 'Monthly Championship Ticket'
                      : 'Weekly Duel Ticket'}
                </span>
                <span className="text-zinc-500 dark:text-zinc-400 tabular-nums">
                  {countdownLabel || (period === 'monthly' ? 'This Month' : 'This Week')}
                </span>
              </div>

              <div key={previewSwapKey} className="wager-swap-blur mt-3 flex items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/15 text-xl">
                  {emoji}
                </span>
                <div className="min-w-0 flex-1">
                  <div
                    className={`text-base font-bold tracking-tight truncate ${
                      trimmedTitle ? '' : 'opacity-45'
                    }`}
                  >
                    {trimmedTitle || 'Your wager appears here...'}
                  </div>
                  <div className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                    {description.trim() || 'Winner claims the reward at period close'}
                  </div>
                </div>
              </div>

              {/* Perforated ticket footer */}
              <div className="mt-3 flex items-center justify-between border-t border-dashed border-black/[0.1] dark:border-white/[0.12] pt-2.5 font-mono text-[11px]">
                <span className="inline-flex items-center gap-1.5 font-semibold" style={{ color: ownerColor }}>
                  <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: ownerColor }} />
                  {players.maciek.name}
                </span>
                <span className="text-[10px] uppercase tracking-widest text-zinc-400">vs</span>
                <span className="inline-flex items-center gap-1.5 font-semibold" style={{ color: guestColor }}>
                  {players.myrna.name}
                  <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: guestColor }} />
                </span>
              </div>
            </div>

            {/* Period Selector (Create mode) */}
            {mode === 'create' && (
              <div className="wager-stagger-2 grid grid-cols-2 gap-2 rounded-xl border border-black/[0.07] dark:border-white/[0.08] bg-black/[0.03] dark:bg-white/[0.03] p-1">
                {(
                  [
                    { id: 'weekly', label: 'Weekly Sprint', sub: 'Resets Sunday' },
                    { id: 'monthly', label: 'Monthly Grand', sub: 'High stakes' },
                  ] as const
                ).map((opt) => {
                  const active = period === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        if (period === opt.id) return;
                        soundEngine.playClick();
                        hapticLight();
                        setPeriod(opt.id);
                        setSelectedPresetId(null);
                      }}
                      className={`min-h-11 rounded-[10px] px-3 py-1.5 text-left transition-[background-color,color,transform,box-shadow] duration-150 active:scale-[0.98] ${
                        active
                          ? 'bg-white dark:bg-zinc-800 shadow-xs text-zinc-900 dark:text-white'
                          : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
                      }`}
                    >
                      <div className="text-xs font-semibold leading-tight">{opt.label}</div>
                      <div className="text-[10px] font-mono opacity-70">{opt.sub}</div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Quick-Pick Deck + Surprise Me */}
            <div className="wager-stagger-2 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Inspiration Deck
                </span>
                <button
                  type="button"
                  onClick={handleSurpriseMe}
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 text-[11px] font-mono font-semibold text-amber-600 dark:text-amber-300 transition-[transform,background-color] duration-150 hover:bg-amber-500/20 active:scale-[0.96]"
                >
                  <Dices key={diceSpinKey} className={`h-3.5 w-3.5 ${diceSpinKey > 0 ? 'wager-dice-spin' : ''}`} />
                  <span>Surprise me</span>
                </button>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {presetsForPeriod.map((preset) => {
                  const active = selectedPresetId === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => applyPreset(preset)}
                      className={`wager-chip-hover inline-flex min-h-9 items-center gap-1.5 rounded-xl border px-2.5 text-xs font-medium transition-[transform,border-color,background-color] duration-150 active:scale-[0.96] ${
                        active
                          ? 'border-amber-500 bg-amber-500/15 text-amber-700 dark:text-amber-200'
                          : 'border-black/[0.08] dark:border-white/[0.09] bg-black/[0.025] dark:bg-white/[0.04]'
                      }`}
                    >
                      <span aria-hidden="true">{preset.emoji}</span>
                      <span>{preset.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Emblem + Custom Inputs */}
            <div className="wager-stagger-3 space-y-3">
              <div className="space-y-1.5">
                <span className="block font-mono text-[10px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Emblem
                </span>
                <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-0.5">
                  {EMBLEM_CHOICES.map((icon) => {
                    const selected = emoji === icon;
                    return (
                      <button
                        key={icon}
                        type="button"
                        onClick={() => {
                          soundEngine.playClick();
                          hapticLight();
                          setEmoji(icon);
                        }}
                        aria-label={`Select ${icon} emblem`}
                        aria-pressed={selected}
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border text-lg transition-[transform,border-color,background-color] duration-150 active:scale-[0.94] ${
                          selected
                            ? 'border-amber-500 bg-amber-500/18 shadow-xs'
                            : 'border-black/[0.07] dark:border-white/[0.08] bg-black/[0.02] dark:bg-white/[0.03]'
                        }`}
                      >
                        {icon}
                      </button>
                    );
                  })}
                </div>
              </div>

              <label className="block space-y-1">
                <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  What&apos;s on the line?
                </span>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    setSelectedPresetId(null);
                    setHoldHint(null);
                  }}
                  placeholder="e.g. Sunday Dinner Date"
                  className="w-full min-h-11 rounded-xl border border-black/[0.12] dark:border-zinc-800 bg-black/[0.03] dark:bg-black/50 px-3.5 text-sm placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-amber-500"
                />
              </label>

              <label className="block space-y-1">
                <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Terms & rules (optional)
                </span>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Winner picks the spot, loser covers the bill..."
                  className="w-full rounded-xl border border-black/[0.12] dark:border-zinc-800 bg-black/[0.03] dark:bg-black/50 px-3.5 py-2.5 text-sm placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-amber-500 resize-none"
                />
              </label>
            </div>

            {/* Commit Footer: Hold-to-Seal for Create, Instant Save for Edit */}
            <div className="wager-stagger-4 space-y-2 pt-1">
              {mode === 'create' ? (
                <>
                  <button
                    type="button"
                    disabled={!canCommit}
                    onPointerDown={handleHoldStart}
                    onPointerUp={handleHoldCancel}
                    onPointerCancel={handleHoldCancel}
                    onPointerLeave={handleHoldCancel}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        finalizeCommit();
                      }
                    }}
                    className={`relative w-full min-h-[52px] overflow-hidden rounded-xl border text-sm font-bold tracking-tight transition-[transform,opacity,border-color] duration-150 select-none ${
                      canCommit
                        ? 'border-amber-500/60 bg-zinc-900 text-white active:scale-[0.985]'
                        : 'border-black/[0.08] dark:border-white/[0.08] bg-zinc-200 dark:bg-zinc-900/60 text-zinc-400 opacity-60'
                    }`}
                  >
                    {/* Base resting label */}
                    <span className="relative z-10 flex items-center justify-center gap-2 px-4">
                      <Handshake className="h-4 w-4 text-amber-400" />
                      <span>
                        {quickTapArmed
                          ? 'Tap again to lock wager now'
                          : 'Hold to Seal the Wager'}
                      </span>
                    </span>

                    {/* Golden clip-path charge overlay */}
                    <span
                      aria-hidden="true"
                      data-holding={isHolding ? 'true' : 'false'}
                      data-sealed={sealedOverlay ? 'true' : 'false'}
                      className="wager-hold-fill pointer-events-none absolute inset-0 z-20 flex items-center justify-center gap-2 bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-400 text-zinc-950"
                    >
                      <Sparkles className="h-4 w-4" />
                      <span>Sealing pact...</span>
                    </span>
                  </button>

                  <div className="flex items-center justify-between gap-2 text-[11px] font-mono text-zinc-500 dark:text-zinc-400 px-0.5">
                    <span>
                      {holdHint || (canCommit ? 'Press & hold 0.6s · or press Enter' : 'Pick a spark or type a wager above')}
                    </span>
                    <button
                      type="button"
                      onClick={onClose}
                      className="underline underline-offset-2 hover:text-zinc-800 dark:hover:text-zinc-200"
                    >
                      Cancel
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 min-h-11 rounded-xl border border-black/[0.1] dark:border-zinc-800 text-xs font-mono font-semibold text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!canCommit}
                    className="flex-1 min-h-11 rounded-xl bg-amber-500 text-xs font-bold text-zinc-950 transition-[transform,background-color,opacity] duration-150 hover:bg-amber-400 active:scale-[0.96] disabled:opacity-45"
                  >
                    Save Changes
                  </button>
                </div>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
