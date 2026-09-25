'use client';

import React, { useState } from 'react';
import { useStore } from '@/lib/store';
import { Habit, CheckIn, Player } from '@/lib/types';
import { formatTimeAgo } from '@/lib/date-utils';
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
    { emoji: '☕', text: 'Coffee on me!' },
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

  timelineItems.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return (
    <div className="space-y-3">
      {/* Cheer Bar */}
      {partner && (
        <div className="rounded-2xl bg-[#1c1c1e] border border-white/[0.08] p-3.5 space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-white">
              Cheer {partner.name}
            </span>
          </div>

          {/* Quick Preset Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 no-scrollbar">
            {CHEER_PRESETS.map((preset, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setSelectedEmoji(preset.emoji);
                  handleSendReaction(preset.emoji, preset.text);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#2c2c2e] border border-white/[0.06] text-xs text-white hover:bg-zinc-700 transition-all flex-shrink-0 active:scale-95"
              >
                <span>{preset.emoji}</span>
                <span className="text-[11px] font-medium">{preset.text}</span>
              </button>
            ))}
          </div>

          {/* Custom Message Input */}
          <form onSubmit={handleSendCustom} className="flex gap-1.5 pt-1">
            <input
              type="text"
              value={customMsg}
              onChange={(e) => setCustomMsg(e.target.value)}
              placeholder={`Message ${partner.name}...`}
              className="flex-1 px-3 py-1.5 rounded-xl bg-[#2c2c2e] border border-white/[0.08] text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-zinc-400"
            />
            <button
              type="submit"
              disabled={!customMsg.trim()}
              className="px-3.5 py-1.5 rounded-xl bg-white text-black font-semibold text-xs hover:bg-zinc-200 transition-colors disabled:opacity-40 flex items-center gap-1"
            >
              <Send className="w-3 h-3" />
            </button>
          </form>
        </div>
      )}

      {/* Activity Timeline List */}
      <div className="space-y-2">
        {timelineItems.length === 0 ? (
          <div className="rounded-2xl border border-white/[0.08] bg-[#1c1c1e] p-6 text-center text-zinc-500 text-xs">
            No activity logged yet
          </div>
        ) : (
          timelineItems.slice(0, 30).map((item) => {
            if (item.type === 'reaction') {
              const isMaciekSender = item.fromPlayer.id === 'maciek';
              return (
                <div
                  key={item.id}
                  className={`rounded-2xl bg-[#1c1c1e] border p-3 flex items-start gap-3 ${
                    isMaciekSender ? 'border-blue-500/20' : 'border-pink-500/20'
                  }`}
                >
                  <span className="text-xl flex-shrink-0">{item.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-white">
                        {item.fromPlayer.name} cheered {item.toPlayer.name}
                      </span>
                      <span className="text-[10px] text-zinc-500">
                        {formatTimeAgo(item.timestamp)}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-300 mt-0.5 italic">
                      &ldquo;{item.message}&rdquo;
                    </p>
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
                className="rounded-2xl bg-[#1c1c1e] border border-white/[0.08] p-3.5 space-y-2 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                        isMaciek
                          ? 'bg-blue-500/15 text-blue-400'
                          : 'bg-pink-500/15 text-pink-400'
                      }`}
                    >
                      <HabitIcon name={item.habit.iconName} className="w-3.5 h-3.5" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 text-xs">
                        <span className="font-semibold text-white">
                          {item.player.name}
                        </span>
                        <span className="text-zinc-500">completed</span>
                        <span className="font-medium text-white truncate">
                          {item.habit.title}
                        </span>
                      </div>
                      <div className="text-[10px] text-zinc-500 mt-0.5">
                        {formatTimeAgo(item.timestamp)}
                      </div>
                    </div>
                  </div>

                  <span
                    className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${
                      isMaciek
                        ? 'bg-blue-500/15 text-blue-400'
                        : 'bg-pink-500/15 text-pink-400'
                    }`}
                  >
                    +{item.checkIn.pointsEarned} pts
                  </span>
                </div>

                {item.checkIn.note && (
                  <div className="flex items-start gap-1.5 bg-[#2c2c2e] rounded-xl px-2.5 py-1.5 text-xs text-zinc-300">
                    <MessageSquare className="w-3 h-3 text-zinc-500 flex-shrink-0 mt-0.5" />
                    <span>{item.checkIn.note}</span>
                  </div>
                )}

                {photos.length > 0 && (
                  <div className="pt-0.5 flex items-center gap-2 overflow-x-auto">
                    {photos.map((photo, pIdx) => (
                      <button
                        key={pIdx}
                        onClick={() =>
                          setActiveProofView({
                            habit: item.habit,
                            checkIn: item.checkIn,
                            player: item.player,
                          })
                        }
                        className="relative rounded-xl overflow-hidden aspect-video w-20 flex-shrink-0 border border-white/[0.08] hover:border-zinc-400 transition-colors"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={photo}
                          alt="Proof preview"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                          <Camera className="w-3 h-3 text-white/90" />
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
