'use client';

import { proofPhotos as getProofPhotos } from '@/lib/duel-data';
import { ProofImage } from './ProofImage';

import React, { useMemo, useState } from 'react';
import { useStore } from '@/lib/store';
import { Habit, CheckIn, Player } from '@/lib/types';
import { formatFriendlyDate, formatTimeAgo } from '@/lib/date-utils';
import { HabitIcon } from './HabitIcon';
import { ProofGalleryModal } from './ProofGalleryModal';
import { Camera, ChevronDown, Heart, MessageSquare, Search, Send, Sparkles, X } from 'lucide-react';
import { soundEngine } from '@/lib/sound-utils';
import { hapticSuccess, hapticLight } from '@/lib/haptic-utils';
import { buildTimelineItems, filterTimelineItems } from '@/lib/activity-timeline';

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

  const timelineItems = useMemo(
    () => buildTimelineItems({ checkIns, habits, players, reactions }),
    [checkIns, habits, players, reactions]
  );

  const filteredItems = useMemo(
    () =>
      filterTimelineItems(timelineItems, {
        feedFilter,
        playerFilter,
        activePlayerId,
        partnerId,
        search,
      }),
    [timelineItems, feedFilter, playerFilter, activePlayerId, partnerId, search]
  );

  const visibleItems = filteredItems.slice(0, visibleCount);
  const checkInCount = useMemo(
    () => timelineItems.filter((item) => item.type === 'check_in').length,
    [timelineItems]
  );

  // Group consecutive items by date so each day reads as one surface with hairline dividers.
  const dayGroups: { date: string; items: typeof visibleItems }[] = [];
  for (const item of visibleItems) {
    const last = dayGroups[dayGroups.length - 1];
    if (last && last.date === item.date) last.items.push(item);
    else dayGroups.push({ date: item.date, items: [item] });
  }

  const cheerButtonClass =
    '-ml-1 inline-flex min-h-11 items-center gap-1.5 px-1 text-label font-medium text-player-300 transition-colors hover:text-player-200';

  const inlineReply = (itemId: string) => replyTo === itemId && partner ? (
    <form onSubmit={(event) => {
      event.preventDefault();
      const item = timelineItems.find((entry) => entry.id === itemId);
      if (!item || !replyMsg.trim()) return;
      const context = item.type === 'check_in' ? `On ${item.habit.title}: ` : '';
      handleSendReaction(selectedEmoji, `${context}${replyMsg.trim()}`);
    }} className="mt-1 space-y-3 rounded-2xl bg-[var(--surface-2)] p-3">
      <p className="text-label text-secondary">Cheer {partner.name}</p>
      <div className="flex gap-2" aria-label="Choose a cheer emoji">
        {CHEER_PRESETS.slice(0, 4).map((preset) => (
          <button
            key={preset.emoji}
            type="button"
            aria-label={preset.text}
            aria-pressed={selectedEmoji === preset.emoji}
            onClick={() => setSelectedEmoji(preset.emoji)}
            className={`h-11 w-11 rounded-xl text-lg transition-colors ${
              selectedEmoji === preset.emoji
                ? 'bg-[var(--surface-1)] ring-1 ring-[var(--border-strong)]'
                : 'hover:bg-[var(--surface-1)]'
            }`}
          >
            {preset.emoji}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          autoFocus
          value={replyMsg}
          onChange={(event) => setReplyMsg(event.target.value)}
          maxLength={160}
          aria-label={`Cheer ${partner.name}`}
          placeholder="Write something encouraging…"
          className="field min-w-0 flex-1 !bg-[var(--surface-1)]"
        />
        <button type="submit" disabled={!replyMsg.trim()} aria-label="Send cheer" className="control control-primary !w-11 !px-0">
          <Send className="h-4 w-4" />
        </button>
      </div>
    </form>
  ) : null;

  return (
    <div className="stack-section">
      <section className="surface surface-pad">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-eyebrow text-muted">
              <Sparkles aria-hidden="true" className="h-3.5 w-3.5 text-amber-500" /> The shared story
            </p>
            <h2 className="mt-1.5 text-title text-foreground">Activity, together.</h2>
            <p className="mt-1 text-label font-normal text-secondary">See the little wins. Give each other a boost.</p>
          </div>
          <div aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-player-500/15 text-player-300">
            <Heart className="h-5 w-5" />
          </div>
        </div>
        <dl className="mt-4 grid grid-cols-2 divide-x divide-[var(--border-subtle)] border-t border-[var(--border-subtle)] pt-4">
          <div>
            <dt className="text-caption text-muted">Check-ins</dt>
            <dd className="num text-title text-foreground">{checkInCount}</dd>
          </div>
          <div className="pl-4">
            <dt className="text-caption text-muted">Cheers shared</dt>
            <dd className="num text-title text-foreground">{timelineItems.length - checkInCount}</dd>
          </div>
        </dl>
      </section>

      {/* Cheer Bar */}
      {partner && (
        <section className="surface surface-pad space-y-3">
          <h3 className="text-headline text-foreground">Send {partner.name} some energy</h3>

          {/* Quick Preset Pills */}
          <div className="-mx-4 flex items-center gap-2 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {CHEER_PRESETS.map((preset, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setSelectedEmoji(preset.emoji);
                  handleSendReaction(preset.emoji, preset.text);
                }}
                className="flex min-h-11 shrink-0 items-center gap-1.5 rounded-full bg-[var(--surface-2)] px-4 text-label text-foreground transition-colors hover:bg-[var(--surface-3)] active:scale-[0.97]"
              >
                <span aria-hidden="true">{preset.emoji}</span>
                <span>{preset.text}</span>
              </button>
            ))}
          </div>

          {/* Custom Message Input */}
          <form onSubmit={handleSendCustom} className="flex gap-2">
            <input
              type="text"
              value={customMsg}
              onChange={(e) => setCustomMsg(e.target.value)}
              maxLength={180}
              placeholder={`Message ${partner.name}...`}
              aria-label={`Message ${partner.name}`}
              className="field min-w-0 flex-1"
            />
            <button
              type="submit"
              disabled={!customMsg.trim()}
              aria-label="Send message"
              className="control control-primary !w-11 !px-0"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </section>
      )}

      <div className="space-y-4">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-headline text-foreground">
              The timeline <span className="num ml-1 text-caption font-normal text-muted">{filteredItems.length}</span>
            </h3>
            <div role="group" aria-label="Filter by person" className="grid grid-cols-3 gap-0.5 rounded-[var(--radius-control)] border border-[var(--border-subtle)] bg-[var(--surface-2)] p-0.5">
              {(['everyone', 'me', 'partner'] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={playerFilter === value}
                  onClick={() => { setPlayerFilter(value); setVisibleCount(12); }}
                  className={`min-h-10 rounded-[10px] px-3 text-label capitalize transition-colors ${
                    playerFilter === value
                      ? 'bg-[var(--surface-1)] font-semibold text-foreground shadow-[0_1px_2px_rgba(0,0,0,0.12)] dark:bg-[var(--surface-3)]'
                      : 'text-secondary hover:text-foreground'
                  }`}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {([{ id: 'all', label: 'All updates' }, { id: 'check_in', label: 'Check-ins' }, { id: 'reaction', label: 'Cheers' }] as const).map((option) => (
              <button
                key={option.id}
                type="button"
                aria-pressed={feedFilter === option.id}
                onClick={() => { setFeedFilter(option.id); setVisibleCount(12); }}
                className={`min-h-11 rounded-full border px-4 text-label transition-colors ${
                  feedFilter === option.id
                    ? 'border-transparent bg-foreground text-background'
                    : 'border-[var(--border-subtle)] text-secondary hover:text-foreground'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          <div className="relative">
            <Search aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              type="search"
              value={search}
              onChange={(event) => { setSearch(event.target.value); setVisibleCount(12); }}
              aria-label="Search activity"
              placeholder="Search habits, notes, or cheers"
              className="field !pl-10 !pr-11"
            />
            {search && (
              <button type="button" onClick={() => setSearch('')} aria-label="Clear search" className="absolute right-0 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center text-muted hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Activity Timeline List */}
        <div role="feed" aria-label="Activity timeline" className="space-y-5">
          {visibleItems.length === 0 ? (
            <div className="surface px-6 py-10 text-center">
              <Sparkles aria-hidden="true" className="mx-auto h-6 w-6 text-muted" />
              <p className="mt-3 text-headline text-foreground">{timelineItems.length ? 'Nothing matches those filters' : 'The story starts with a check-in'}</p>
              <p className="mt-1 text-label font-normal text-secondary">{timelineItems.length ? 'Try another search or switch filters.' : 'Complete a ritual and it will appear here.'}</p>
              {timelineItems.length > 0 && (
                <button type="button" onClick={() => { setFeedFilter('all'); setPlayerFilter('everyone'); setSearch(''); }} className="mt-3 min-h-11 px-3 text-label font-medium text-player-300 hover:text-player-200">
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            dayGroups.map((group) => (
              <div key={group.date} className="space-y-2">
                <p className="px-1 text-eyebrow text-muted">{formatFriendlyDate(group.date)}</p>
                <div className="surface divide-y divide-[var(--border-subtle)] px-4">
                  {group.items.map((item) => {
                    if (item.type === 'reaction') {
                      return (
                        <article key={`reaction:${item.id}`} className="py-3.5">
                          <div className="flex items-start gap-3">
                            <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center text-xl">{item.emoji}</span>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-baseline justify-between gap-3">
                                <p className="min-w-0 text-label font-semibold text-foreground">
                                  {item.fromPlayer.name} cheered {item.toPlayer.name}
                                </p>
                                <span className="shrink-0 text-caption text-muted">{formatTimeAgo(item.timestamp)}</span>
                              </div>
                              <p className="mt-0.5 text-label font-normal text-secondary">&ldquo;{item.message}&rdquo;</p>
                            </div>
                          </div>
                          {item.fromPlayer.id === partnerId && (
                            <div className="pl-11">
                              <button type="button" aria-expanded={replyTo === item.id} onClick={() => { setReplyTo(replyTo === item.id ? null : item.id); setReplyMsg(''); }} className={cheerButtonClass}>
                                <Heart aria-hidden="true" className="h-4 w-4" />Cheer back
                              </button>
                              {inlineReply(item.id)}
                            </div>
                          )}
                        </article>
                      );
                    }

                    // Check-in item
                    const isMaciek = item.player.id === 'maciek';
                    const photos = getProofPhotos(item.checkIn);

                    return (
                      <article key={`checkin:${item.id}`} className="space-y-2.5 py-3.5">
                        <div className="flex items-start gap-3">
                          <div
                            aria-hidden="true"
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                              isMaciek ? 'bg-owner-500/15 text-owner-300' : 'bg-guest-500/15 text-guest-300'
                            }`}
                          >
                            <HabitIcon name={item.habit.iconName} className="h-4 w-4" />
                          </div>

                          <div className="min-w-0 flex-1">
                            <p className="text-label font-normal text-secondary">
                              <span className="font-semibold text-foreground">{item.player.name}</span> completed{' '}
                              <span className="font-medium text-foreground">{item.habit.title}</span>
                            </p>
                            <p className="mt-0.5 text-caption text-muted">{formatTimeAgo(item.timestamp)}</p>
                          </div>

                          <span
                            className={`num shrink-0 rounded-full px-2 py-0.5 text-caption font-semibold ${
                              isMaciek ? 'bg-owner-500/15 text-owner-300' : 'bg-guest-500/15 text-guest-300'
                            }`}
                          >
                            +{item.checkIn.pointsEarned} pts
                          </span>
                        </div>

                        {item.checkIn.note && (
                          <div className="ml-11 flex items-start gap-2 rounded-xl bg-[var(--surface-2)] px-3 py-2 text-label font-normal text-secondary">
                            <MessageSquare aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted" />
                            <span>{item.checkIn.note}</span>
                          </div>
                        )}

                        {photos.length > 0 && (
                          <div className="ml-11 flex items-center gap-2 overflow-x-auto">
                            {photos.map((photo, pIdx) => (
                              <button
                                key={pIdx}
                                type="button"
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
                                className="relative aspect-video w-24 shrink-0 overflow-hidden rounded-xl border border-[var(--border-subtle)] transition-colors hover:border-[var(--border-strong)]"
                              >
                                <ProofImage src={photo} alt="Proof preview" className="h-full w-full object-cover" />
                                <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                                  <Camera className="h-3.5 w-3.5 text-white/90" />
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                        {item.player.id === partnerId && (
                          <div className="ml-11">
                            <button type="button" aria-expanded={replyTo === item.id} onClick={() => { setReplyTo(replyTo === item.id ? null : item.id); setReplyMsg(''); }} className={cheerButtonClass}>
                              <Heart aria-hidden="true" className="h-4 w-4" />Cheer this on
                            </button>
                            {inlineReply(item.id)}
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {filteredItems.length > visibleCount && (
          <button type="button" onClick={() => setVisibleCount((count) => count + 12)} className="control w-full">
            Show more <ChevronDown aria-hidden="true" className="h-4 w-4" />
          </button>
        )}
      </div>

      {sentNotice && (
        <div role="status" className="fixed bottom-24 left-1/2 z-50 flex -translate-x-1/2 items-center gap-1 rounded-full border border-emerald-500/25 bg-[var(--surface-1)] py-1 pl-4 pr-1 text-label text-emerald-700 shadow-xl dark:text-emerald-300">
          Cheer sent to {partner?.name}
          <button type="button" onClick={() => setSentNotice(false)} aria-label="Dismiss confirmation" className="flex h-9 w-9 items-center justify-center rounded-full text-muted hover:text-foreground">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Proof Gallery Modal */}
      {activeProofView && (
        <ProofGalleryModal
          isOpen={!!activeProofView}
          onClose={() => setActiveProofView(null)}
          playerName={activeProofView.player.name}
          playerAvatar={activeProofView.player.avatar}
          habitTitle={activeProofView.habit.title}
          images={
            getProofPhotos(activeProofView.checkIn)
          }
          date={activeProofView.checkIn.date}
          completedAt={activeProofView.checkIn.completedAt}
        />
      )}
    </div>
  );
}
