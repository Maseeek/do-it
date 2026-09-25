'use client';

import React, { useState } from 'react';
import { useStore } from '@/lib/store';
import { Habit, CheckIn, Player } from '@/lib/types';
import { formatFriendlyDate, formatTimeAgo } from '@/lib/date-utils';
import { HabitIcon } from './HabitIcon';
import { ProofGalleryModal } from './ProofGalleryModal';
import { Camera, MessageSquare, Send } from 'lucide-react';
import { soundEngine } from '@/lib/sound-utils';
import { hapticSuccess } from '@/lib/haptic-utils';
import { fireCelebrationConfetti } from '@/lib/confetti';

export function ActivityFeed() {
  const {
    checkIns,
    habits,
    players,
    reactions,
    partnerId,
    addReaction,
  } = useStore();

  const [customMsg, setCustomMsg] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('💪');
  const [activeProofView, setActiveProofView] = useState<{
    habit: Habit;
    checkIn: CheckIn;
    player: Player;
  } | null>(null);

  const partner = partnerId ? players[partnerId] : null;

  const CHEER_PRESETS = [
    { emoji: '💪', text: 'Crush it!' },
    { emoji: '⚡', text: 'Unstoppable!' },
    { emoji: '🍕', text: 'Dinner is on you!' },
    { emoji: '☕', text: 'Coffee on me tomorrow!' },
    { emoji: '✨', text: 'Proud of you!' },
    { emoji: '🎯', text: 'Locked in!' },
  ];

  const handleSendReaction = (emoji: string, text: string) => {
    if (!partnerId) return;
    soundEngine.playCheck();
    hapticSuccess();
    fireCelebrationConfetti();
    addReaction({
      toPlayerId: partnerId,
      emoji,
      message: text,
    });
    setCustomMsg('');
  };

  const handleSendCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customMsg.trim() || !partnerId) return;
    handleSendReaction(selectedEmoji, customMsg.trim());
  };

  // Build unified chronological timeline items
  type TimelineItem =
    | {
        type: 'check_in';
        id: string;
        timestamp: string;
        date: string;
        checkIn: CheckIn;
        habit: Habit;
        player: Player;
      }
    | {
        type: 'reaction';
        id: string;
        timestamp: string;
        fromPlayer: Player;
        toPlayer: Player;
        emoji: string;
        message: string;
      };

  const timelineItems: TimelineItem[] = [];

  // Add check-ins
  checkIns.forEach((ci) => {
    const habit = habits.find((h) => h.id === ci.habitId);
    const player = players[ci.playerId];
    if (habit && player) {
      timelineItems.push({
        type: 'check_in',
        id: ci.id,
        timestamp: ci.completedAt || `${ci.date}T12:00:00.000Z`,
        date: ci.date,
        checkIn: ci,
        habit,
        player,
      });
    }
  });

  // Add reactions
  reactions.forEach((r) => {
    const fromPlayer = players[r.fromPlayerId];
    const toPlayer = players[r.toPlayerId];
    if (fromPlayer && toPlayer) {
      timelineItems.push({
        type: 'reaction',
        id: r.id,
        timestamp: r.timestamp,
        fromPlayer,
        toPlayer,
        emoji: r.emoji,
        message: r.message,
      });
    }
  });

  // Sort descending by timestamp
  timelineItems.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return (
    <div className="space-y-3.5">
      {/* Cheer & Reaction Bar */}
      {partner && (
        <div className="rounded-2xl glass-card border border-white/[0.09] p-4 shadow-md relative overflow-hidden">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2">
              <span className="text-lg">{partner.avatar}</span>
              <div>
                <h4 className="text-xs font-bold text-white">Cheer {partner.name}</h4>
                <p className="text-[10px] font-mono text-zinc-400">1-tap accountability cheer</p>
              </div>
            </div>
            <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 border border-amber-500/25 px-2 py-0.5 rounded-full font-semibold">
              Live Duel
            </span>
          </div>

          {/* Quick preset chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-1 no-scrollbar">
            {CHEER_PRESETS.map((preset, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setSelectedEmoji(preset.emoji);
                  handleSendReaction(preset.emoji, preset.text);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 border border-white/[0.08] hover:border-white/20 hover:bg-zinc-850 text-xs text-zinc-200 hover:text-white transition-all flex-shrink-0 active:scale-95 shadow-xs"
              >
                <span>{preset.emoji}</span>
                <span className="text-[11px] font-medium">{preset.text}</span>
              </button>
            ))}
          </div>

          {/* Custom message input form */}
          <form onSubmit={handleSendCustom} className="mt-3 flex gap-1.5">
            <input
              type="text"
              value={customMsg}
              onChange={(e) => setCustomMsg(e.target.value)}
              placeholder={`Send a quick message to ${partner.name}...`}
              className="flex-1 px-3 py-2 rounded-xl bg-zinc-900/90 border border-white/[0.08] text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-400"
            />
            <button
              type="submit"
              disabled={!customMsg.trim()}
              className="px-3 py-2 rounded-xl bg-white text-black font-semibold text-xs hover:bg-zinc-200 transition-colors disabled:opacity-40 flex items-center gap-1 shadow-sm active:scale-95"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      )}

      {/* Activity Timeline List */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 font-mono">
            Couples Activity Feed ({timelineItems.length})
          </span>
          <span className="text-[10px] font-mono text-zinc-500">Live & Chronological</span>
        </div>

        {timelineItems.length === 0 ? (
          <div className="rounded-2xl border border-white/[0.08] glass-card p-6 text-center text-zinc-500 text-xs font-mono">
            No activity logged yet. Check in a habit to start the timeline!
          </div>
        ) : (
          timelineItems.slice(0, 30).map((item) => {
            if (item.type === 'reaction') {
              const isMaciekSender = item.fromPlayer.id === 'maciek';
              return (
                <div
                  key={item.id}
                  className={`rounded-2xl glass-card p-3.5 shadow-sm border ${
                    isMaciekSender ? 'border-blue-500/25 bg-blue-500/[0.03]' : 'border-pink-500/25 bg-pink-500/[0.03]'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-base flex-shrink-0 shadow-[0_0_8px_rgba(245,158,11,0.2)]">
                      {item.emoji}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-white truncate">
                          {item.fromPlayer.name} cheered {item.toPlayer.name}
                        </span>
                        <span className="text-[10px] font-mono text-zinc-400 flex-shrink-0">
                          {formatTimeAgo(item.timestamp)}
                        </span>
                      </div>

                      <p className="text-xs text-zinc-200 mt-1 italic leading-relaxed">
                        &ldquo;{item.message}&rdquo;
                      </p>
                    </div>
                  </div>
                </div>
              );
            }

            // Check-in item
            const isMaciek = item.player.id === 'maciek';
            const photos =
              item.checkIn.proofUrls && item.checkIn.proofUrls.length > 0
                ? item.checkIn.proofUrls
                : item.checkIn.proofUrl
                ? [item.checkIn.proofUrl]
                : [];

            return (
              <div
                key={item.id}
                className="rounded-2xl glass-card border border-white/[0.08] p-3.5 shadow-sm space-y-2 hover:border-white/20 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 border ${
                        isMaciek
                          ? 'bg-blue-500/15 border-blue-500/30 text-blue-400 shadow-[0_0_8px_rgba(59,130,246,0.2)]'
                          : 'bg-pink-500/15 border-pink-500/30 text-pink-400 shadow-[0_0_8px_rgba(236,72,153,0.2)]'
                      }`}
                    >
                      <HabitIcon name={item.habit.iconName} className="w-3.5 h-3.5" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-bold text-white truncate">
                          {item.player.name}
                        </span>
                        <span className="text-[11px] text-zinc-400 font-mono">
                          checked in
                        </span>
                        <span className="text-xs font-semibold text-zinc-200 truncate">
                          {item.habit.title}
                        </span>
                      </div>
                      <div className="text-[10px] font-mono text-zinc-400 mt-0.5">
                        {formatTimeAgo(item.timestamp)} • {formatFriendlyDate(item.date)}
                        {item.checkIn.isRetroactive && (
                          <span className="ml-1 text-amber-400/90 font-semibold">(retroactive)</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <span
                    className={`font-mono text-xs font-bold px-2 py-0.5 rounded-full border flex-shrink-0 ${
                      isMaciek
                        ? 'bg-blue-500/15 border-blue-500/30 text-blue-300'
                        : 'bg-pink-500/15 border-pink-500/30 text-pink-300'
                    }`}
                  >
                    +{item.checkIn.pointsEarned} pts
                  </span>
                </div>

                {/* Attached micro-note */}
                {item.checkIn.note && (
                  <div className="flex items-start gap-1.5 bg-zinc-900/60 border border-white/[0.06] rounded-xl px-2.5 py-1.5 text-xs text-zinc-300">
                    <MessageSquare className="w-3 h-3 text-blue-400 flex-shrink-0 mt-0.5" />
                    <span className="leading-relaxed">&ldquo;{item.checkIn.note}&rdquo;</span>
                  </div>
                )}

                {/* Quantitative quantity */}
                {item.checkIn.quantity && (
                  <div className="text-[11px] font-mono text-zinc-400">
                    Quantity: <span className="text-white font-semibold">{item.checkIn.quantity}</span> {item.habit.quantityUnit || 'units'}
                  </div>
                )}

                {/* Photo proof thumbnails */}
                {photos.length > 0 && (
                  <div className="pt-1 flex items-center gap-2 overflow-x-auto">
                    {photos.map((photo, pIdx) => (
                      <button
                        key={pIdx}
                        onClick={() => {
                          soundEngine.playClick();
                          setActiveProofView({
                            habit: item.habit,
                            checkIn: item.checkIn,
                            player: item.player,
                          });
                        }}
                        className="relative rounded-xl overflow-hidden aspect-video w-20 flex-shrink-0 border border-white/[0.08] hover:border-zinc-400 transition-colors group focus:outline-none"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={photo}
                          alt="Proof preview"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                        <div className="absolute inset-0 bg-black/25 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                          <Camera className="w-3.5 h-3.5 text-white/90" />
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Proof Gallery Modal */}
      {activeProofView && (
        <ProofGalleryModal
          isOpen={!!activeProofView}
          onClose={() => setActiveProofView(null)}
          playerName={activeProofView.player.name}
          playerAvatar={activeProofView.player.avatar}
          habitTitle={activeProofView.habit.title}
          images={
            activeProofView.checkIn.proofUrls && activeProofView.checkIn.proofUrls.length > 0
              ? activeProofView.checkIn.proofUrls
              : activeProofView.checkIn.proofUrl
              ? [activeProofView.checkIn.proofUrl]
              : []
          }
          date={activeProofView.checkIn.date}
          completedAt={activeProofView.checkIn.completedAt}
        />
      )}
    </div>
  );
}
