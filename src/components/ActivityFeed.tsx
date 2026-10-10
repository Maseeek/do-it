'use client';

import React, { useMemo, useState } from 'react';
import { useStore } from '@/lib/store';
import { Habit, CheckIn, Player } from '@/lib/types';
import { formatFriendlyDate, formatDateString, formatTimeAgo } from '@/lib/date-utils';
import { HabitIcon } from './HabitIcon';
import { ProofGalleryModal } from './ProofGalleryModal';
import { Camera, ChevronDown, Heart, MessageSquare, Search, Send, Sparkles, X } from 'lucide-react';
import { soundEngine } from '@/lib/sound-utils';
import { hapticSuccess, hapticLight } from '@/lib/haptic-utils';
import { fireCelebrationConfetti } from '@/lib/confetti';

export function ActivityFeed() {
  const {
    checkIns,
    habits,
    players,
    reactions,
    partnerId,
    activePlayerId,
    addReaction,
  } = useStore();

  const [customMsg, setCustomMsg] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('💪');
  const [feedFilter, setFeedFilter] = useState<'all' | 'check_in' | 'reaction'>('all');
  const [playerFilter, setPlayerFilter] = useState<'everyone' | 'me' | 'partner'>('everyone');
  const [search, setSearch] = useState('');
  const [visibleCount, setVisibleCount] = useState(12);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyMsg, setReplyMsg] = useState('');
  const [sentNotice, setSentNotice] = useState(false);
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
    setReplyMsg('');
    setReplyTo(null);
    setSentNotice(true);
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
        date: string;
        fromPlayer: Player;
        toPlayer: Player;
        emoji: string;
        message: string;
      };

  const timelineItems = useMemo(() => {
    const timelineItems: TimelineItem[] = [];
    const habitById = new Map(habits.map(habit => [habit.id, habit]));

    checkIns.forEach((ci) => {
      const habit = habitById.get(ci.habitId);
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
          date: formatDateString(new Date(r.timestamp)),
          fromPlayer,
          toPlayer,
          emoji: r.emoji,
          message: r.message,
        });
      }
    });

    timelineItems.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return timelineItems;
  }, [checkIns, habits, players, reactions]);

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    return timelineItems.filter((item) => {
      if (feedFilter !== 'all' && item.type !== feedFilter) return false;
      const actorId = item.type === 'check_in' ? item.player.id : item.fromPlayer.id;
      if (playerFilter === 'me' && actorId !== activePlayerId) return false;
      if (playerFilter === 'partner' && actorId !== partnerId) return false;
      const content = item.type === 'check_in'
        ? `${item.player.name} ${item.habit.title} ${item.checkIn.note || ''}`
        : `${item.fromPlayer.name} ${item.toPlayer.name} ${item.message}`;
      return content.toLowerCase().includes(query);
    });
  }, [timelineItems, feedFilter, playerFilter, activePlayerId, partnerId, search]);
  const visibleItems = filteredItems.slice(0, visibleCount);
  const checkInCount = timelineItems.filter((item) => item.type === 'check_in').length;

  const inlineReply = (itemId: string) => replyTo === itemId && partner ? (
    <form onSubmit={(event) => {
      event.preventDefault();
      const item = timelineItems.find((entry) => entry.id === itemId);
      if (!item || !replyMsg.trim()) return;
      const context = item.type === 'check_in' ? `On ${item.habit.title}: ` : '';
      handleSendReaction(selectedEmoji, `${context}${replyMsg.trim()}`);
    }} className="mt-3 space-y-2 rounded-xl border border-white/[0.08] bg-black/20 p-3">
      <p className="text-[11px] font-medium text-zinc-300">Cheer {partner.name}</p>
      <div className="flex gap-1.5" aria-label="Choose a cheer emoji">
        {CHEER_PRESETS.slice(0, 4).map((preset) => <button key={preset.emoji} type="button" aria-label={preset.text} aria-pressed={selectedEmoji === preset.emoji} onClick={() => setSelectedEmoji(preset.emoji)} className={`h-9 w-9 rounded-lg border text-base ${selectedEmoji === preset.emoji ? 'border-white/30 bg-white/15' : 'border-white/[0.06] bg-white/[0.03]'}`}>{preset.emoji}</button>)}
      </div>
      <div className="flex gap-2"><input autoFocus value={replyMsg} onChange={(event) => setReplyMsg(event.target.value)} maxLength={160} aria-label={`Cheer ${partner.name}`} placeholder="Write something encouraging…" className="min-w-0 flex-1 rounded-lg border border-white/10 bg-[#2c2c2e] px-3 py-2 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-white/30" /><button type="submit" disabled={!replyMsg.trim()} aria-label="Send cheer" className="rounded-lg bg-white px-3 text-black disabled:opacity-40"><Send className="h-4 w-4" /></button></div>
    </form>
  ) : null;

  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-white/[0.09] bg-gradient-to-br from-[#1b1d25] via-[#141518] to-[#1d1820] p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div><div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-400"><Sparkles className="h-3.5 w-3.5 text-amber-300" /> The shared story</div><h2 className="mt-2 text-2xl font-semibold tracking-tight text-white">Activity, together.</h2><p className="mt-1 text-xs leading-relaxed text-zinc-400">See the little wins. Give each other a boost.</p></div>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/[0.07] text-player-300"><Heart className="h-5 w-5" /></div>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-2 border-t border-white/[0.08] pt-4">
          <div className="rounded-xl bg-white/[0.04] p-3"><p className="text-xl font-semibold tabular-nums text-white">{checkInCount}</p><p className="mt-0.5 text-[11px] text-zinc-400">Check-ins</p></div>
          <div className="rounded-xl bg-white/[0.04] p-3"><p className="text-xl font-semibold tabular-nums text-white">{timelineItems.length - checkInCount}</p><p className="mt-0.5 text-[11px] text-zinc-400">Cheers shared</p></div>
        </div>
      </section>
      {/* Cheer Bar */}
      {partner && (
        <div className="rounded-2xl bg-[#1c1c1e] border border-white/[0.08] p-4 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-white">
              Send {partner.name} some energy
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
              maxLength={180}
              placeholder={`Message ${partner.name}...`}
              aria-label={`Message ${partner.name}`}
              className="flex-1 px-3 py-1.5 rounded-xl bg-[#2c2c2e] border border-white/[0.08] text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-zinc-400"
            />
            <button
              type="submit"
              disabled={!customMsg.trim()}
              aria-label="Send message"
              className="px-3.5 py-1.5 rounded-xl bg-white text-black font-semibold text-xs hover:bg-zinc-200 transition-colors disabled:opacity-40 flex items-center gap-1"
            >
              <Send className="w-3 h-3" />
            </button>
          </form>
        </div>
      )}

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-semibold text-white">The timeline <span className="ml-1 text-xs font-normal text-zinc-500">{filteredItems.length}</span></h3><div role="group" aria-label="Filter by person" className="flex rounded-xl border border-white/[0.08] bg-[#17181b] p-1">{(['everyone', 'me', 'partner'] as const).map((value) => <button key={value} type="button" aria-pressed={playerFilter === value} onClick={() => { setPlayerFilter(value); setVisibleCount(12); }} className={`rounded-lg px-2.5 py-1.5 text-[11px] capitalize transition-colors ${playerFilter === value ? 'bg-white/[0.12] text-white' : 'text-zinc-500 hover:text-zinc-200'}`}>{value}</button>)}</div></div>
        <div className="flex flex-wrap gap-2">{([{ id: 'all', label: 'All updates' }, { id: 'check_in', label: 'Check-ins' }, { id: 'reaction', label: 'Cheers' }] as const).map((option) => <button key={option.id} type="button" aria-pressed={feedFilter === option.id} onClick={() => { setFeedFilter(option.id); setVisibleCount(12); }} className={`rounded-full border px-3 py-1.5 text-[11px] font-medium transition-colors ${feedFilter === option.id ? 'border-white/30 bg-white text-black' : 'border-white/[0.08] bg-white/[0.03] text-zinc-400 hover:text-white'}`}>{option.label}</button>)}</div>
        <div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" /><input type="search" value={search} onChange={(event) => { setSearch(event.target.value); setVisibleCount(12); }} aria-label="Search activity" placeholder="Search habits, notes, or cheers" className="w-full rounded-xl border border-white/[0.08] bg-[#18191d] py-2.5 pl-9 pr-9 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-white/30" />{search && <button type="button" onClick={() => setSearch('')} aria-label="Clear search" className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"><X className="h-3.5 w-3.5" /></button>}</div>
      </div>

      {/* Activity Timeline List */}
      <div role="feed" aria-label="Activity timeline" className="space-y-2">
        {visibleItems.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/[0.1] bg-[#17181b] p-8 text-center"><Sparkles className="mx-auto h-6 w-6 text-zinc-500" /><p className="mt-3 text-sm font-medium text-white">{timelineItems.length ? 'Nothing matches those filters' : 'The story starts with a check-in'}</p><p className="mt-1 text-xs text-zinc-500">{timelineItems.length ? 'Try another search or switch filters.' : 'Complete a ritual and it will appear here.'}</p>{timelineItems.length > 0 && <button type="button" onClick={() => { setFeedFilter('all'); setPlayerFilter('everyone'); setSearch(''); }} className="mt-4 text-xs font-medium text-player-300 hover:text-player-200">Clear filters</button>}</div>
        ) : (
          visibleItems.map((item, index) => {
            const dateHeading = (index === 0 || visibleItems[index - 1].date !== item.date) && <div className="flex items-center gap-3 pt-3 pb-1"><span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">{formatFriendlyDate(item.date)}</span><span className="h-px flex-1 bg-white/[0.07]" /></div>;
            if (item.type === 'reaction') {
              const isMaciekSender = item.fromPlayer.id === 'maciek';
              return (
                <React.Fragment key={`reaction:${item.id}`}>{dateHeading}<article
                  className={`rounded-2xl bg-[#1c1c1e] border p-3 ${
                    isMaciekSender ? 'border-owner-500/20' : 'border-guest-500/20'
                  }`}
                >
                  <div className="flex items-start gap-3"><span className="text-xl flex-shrink-0">{item.emoji}</span>
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
                  </div></div>
                  {item.fromPlayer.id === partnerId && <div className="mt-3 border-t border-white/[0.06] pt-2"><button type="button" aria-expanded={replyTo === item.id} onClick={() => { setReplyTo(replyTo === item.id ? null : item.id); setReplyMsg(''); }} className="inline-flex items-center gap-1.5 text-[11px] text-player-300 hover:text-player-200"><Heart className="h-3.5 w-3.5" />Cheer back</button>{inlineReply(item.id)}</div>}
                </article></React.Fragment>
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
              <React.Fragment key={`checkin:${item.id}`}>{dateHeading}<article
                className="rounded-2xl bg-[#1c1c1e] border border-white/[0.08] p-3.5 space-y-2 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                        isMaciek
                          ? 'bg-owner-500/15 text-owner-400'
                          : 'bg-guest-500/15 text-guest-400'
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
                        ? 'bg-owner-500/15 text-owner-400'
                        : 'bg-guest-500/15 text-guest-400'
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
                        aria-label={`View proof photo ${pIdx + 1} for ${item.habit.title}`}
                        onClick={() => {
                          soundEngine.playClick();
                          hapticLight();
                          setActiveProofView({
                            habit: item.habit,
                            checkIn: item.checkIn,
                            player: item.player,
                          });
                        }}
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
                {item.player.id === partnerId && <div className="border-t border-white/[0.06] pt-2"><button type="button" aria-expanded={replyTo === item.id} onClick={() => { setReplyTo(replyTo === item.id ? null : item.id); setReplyMsg(''); }} className="inline-flex items-center gap-1.5 text-[11px] text-player-300 hover:text-player-200"><Heart className="h-3.5 w-3.5" />Cheer this on</button>{inlineReply(item.id)}</div>}
              </article></React.Fragment>
            );
          })
        )}
      </div>

      {filteredItems.length > visibleCount && <button type="button" onClick={() => setVisibleCount((count) => count + 12)} className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-white/[0.09] bg-white/[0.03] py-3 text-xs font-medium text-zinc-300 hover:bg-white/[0.07]">Show more <ChevronDown className="h-3.5 w-3.5" /></button>}
      {sentNotice && <div role="status" className="fixed bottom-20 left-1/2 z-50 -translate-x-1/2 rounded-full border border-emerald-400/25 bg-[#183023] px-4 py-2 text-xs font-medium text-emerald-200 shadow-xl">Cheer sent to {partner?.name}<button type="button" onClick={() => setSentNotice(false)} aria-label="Dismiss confirmation" className="ml-3 text-emerald-200/60 hover:text-white"><X className="inline h-3 w-3" /></button></div>}

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
