import type { CheckIn, Habit, Player, CouplesReaction, PlayerId } from './types';
import { formatDateString } from './date-utils';

export type TimelineItem =
  | {
      type: 'check_in';
      id: string;
      timestamp: string;
      timestampMs: number;
      date: string;
      checkIn: CheckIn;
      habit: Habit;
      player: Player;
    }
  | {
      type: 'reaction';
      id: string;
      timestamp: string;
      timestampMs: number;
      date: string;
      fromPlayer: Player;
      toPlayer: Player;
      emoji: string;
      message: string;
    };

export interface BuildTimelineOptions {
  checkIns: CheckIn[];
  habits: Habit[];
  players: Record<PlayerId, Player>;
  reactions: CouplesReaction[];
}

export interface FilterTimelineOptions {
  feedFilter: 'all' | 'check_in' | 'reaction';
  playerFilter: 'everyone' | 'me' | 'partner';
  activePlayerId: PlayerId | null;
  partnerId: PlayerId | null;
  search: string;
}

/**
 * Parses an ISO or date timestamp into epoch milliseconds.
 * Returns NaN if the timestamp is missing, empty, or invalid.
 */
export function parseTimelineTimestamp(timestamp: string | undefined | null): number {
  if (!timestamp) return NaN;
  return Date.parse(timestamp);
}

/**
 * Chronological comparator for timeline items (newest first).
 * Uses pre-parsed timestampMs numbers. Preserves exact baseline ordering,
 * including ties and NaN fallback handling.
 */
export function compareTimelineItems(
  a: { timestampMs: number },
  b: { timestampMs: number }
): number {
  const diff = b.timestampMs - a.timestampMs;
  return Number.isNaN(diff) ? 0 : diff;
}

/**
 * Builds chronological timeline items from check-ins and reactions.
 * Parses timestamps once per record at ingestion rather than allocating
 * `new Date()` instances repeatedly during sorting.
 */
export function buildTimelineItems({
  checkIns,
  habits,
  players,
  reactions,
}: BuildTimelineOptions): TimelineItem[] {
  const timelineItems: TimelineItem[] = [];
  const habitById = new Map(habits.map((habit) => [habit.id, habit]));

  for (let i = 0; i < checkIns.length; i++) {
    const ci = checkIns[i];
    const habit = habitById.get(ci.habitId);
    const player = players[ci.playerId];
    if (habit && player) {
      const timestamp = ci.completedAt || `${ci.date}T12:00:00.000Z`;
      const timestampMs = parseTimelineTimestamp(timestamp);
      timelineItems.push({
        type: 'check_in',
        id: ci.id,
        timestamp,
        timestampMs,
        date: ci.date,
        checkIn: ci,
        habit,
        player,
      });
    }
  }

  for (let i = 0; i < reactions.length; i++) {
    const r = reactions[i];
    const fromPlayer = players[r.fromPlayerId];
    const toPlayer = players[r.toPlayerId];
    if (fromPlayer && toPlayer) {
      const timestampMs = parseTimelineTimestamp(r.timestamp);
      timelineItems.push({
        type: 'reaction',
        id: r.id,
        timestamp: r.timestamp,
        timestampMs,
        date: formatDateString(new Date(r.timestamp)),
        fromPlayer,
        toPlayer,
        emoji: r.emoji,
        message: r.message,
      });
    }
  }

  timelineItems.sort(compareTimelineItems);

  return timelineItems;
}

/**
 * Filters timeline items across feed type, player actor, and full-history search.
 * Bypasses string allocations and lowercase conversions when search query is empty.
 */
export function filterTimelineItems(
  items: TimelineItem[],
  { feedFilter, playerFilter, activePlayerId, partnerId, search }: FilterTimelineOptions
): TimelineItem[] {
  const query = search.trim().toLowerCase();

  return items.filter((item) => {
    if (feedFilter !== 'all' && item.type !== feedFilter) return false;

    const actorId = item.type === 'check_in' ? item.player.id : item.fromPlayer.id;
    if (playerFilter === 'me' && actorId !== activePlayerId) return false;
    if (playerFilter === 'partner' && actorId !== partnerId) return false;

    if (!query) return true;

    const content =
      item.type === 'check_in'
        ? `${item.player.name} ${item.habit.title} ${item.checkIn.note || ''}`
        : `${item.fromPlayer.name} ${item.toPlayer.name} ${item.message}`;

    return content.toLowerCase().includes(query);
  });
}
