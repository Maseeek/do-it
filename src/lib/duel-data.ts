import type { CheckIn, CouplesReaction, Habit, RestDay, Stake } from './types';

export interface DuelData {
  habits: Habit[];
  checkIns: CheckIn[];
  stakes: Stake[];
  reactions: CouplesReaction[];
  restDays: RestDay[];
}
export interface DuelSnapshot { cursor: string; data: DuelData }
export interface DuelDelta {
  cursor: string;
  snapshot: DuelData | null;
  changes: { table: string; id: string; deleted: boolean; data: DuelData[keyof DuelData][number] | null }[];
}
const collections = { duel_habits: 'habits', duel_check_ins: 'checkIns', duel_stakes: 'stakes', duel_reactions: 'reactions', duel_rest_days: 'restDays' } as const;

export function applyDuelDelta(previous: DuelSnapshot | null, delta: DuelDelta): DuelSnapshot {
  if (delta.snapshot) return { cursor: delta.cursor, data: delta.snapshot };
  if (!previous) throw new Error('A full Duel snapshot is required.');
  const data = { ...previous.data };
  for (const [table, collection] of Object.entries(collections)) {
    const changes = delta.changes.filter(change => change.table === table);
    if (!changes.length) continue;
    const rows = new Map<string, DuelData[keyof DuelData][number]>(data[collection].map(row => [row.id, row]));
    for (const change of changes) {
      if (change.deleted) rows.delete(change.id);
      else if (change.data) rows.set(change.id, change.data);
      else throw new Error('A changed Duel record is missing.');
    }
    // Each table contains exactly the corresponding domain record.
    Object.assign(data, { [collection]: [...rows.values()] });
  }
  return { cursor: delta.cursor, data };
}

export function proofPhotos(checkIn?: CheckIn): string[] {
  if (!checkIn) return [];
  if (checkIn.proofUrls?.length) return checkIn.proofUrls;
  if (checkIn.proofUrl) return [checkIn.proofUrl];
  return Array.from({ length: checkIn.proofCount ?? 0 }, (_, index) => `doit-proof:${encodeURIComponent(checkIn.id)}:${checkIn.proofVersion ?? ''}:${index}`);
}
export function proofReference(value: string) {
  const match = /^doit-proof:([^:]+):([^:]*):(\d+)$/.exec(value);
  return match ? { id: decodeURIComponent(match[1]), version: match[2], index: Number(match[3]) } : null;
}

export interface StakeSaveResult {
  cursor: string;
  previousCursor: string;
  changed: boolean;
  stake: Stake;
}
export interface StakeDeleteResult {
  cursor: string;
  previousCursor: string;
  deleted: boolean;
}

export function shouldSyncRevision(currentCursor: string | null | undefined, remoteRevision: unknown): boolean {
  if (!currentCursor || !/^\d+$/.test(currentCursor)) return true;
  if (typeof remoteRevision !== 'string' && typeof remoteRevision !== 'number') return true;
  const text = String(remoteRevision).trim();
  if (!/^\d+$/.test(text)) return true;
  return BigInt(text) > BigInt(currentCursor);
}

export function stakesEqual(a: Stake, b: Stake): boolean {
  return (
    a.id === b.id &&
    a.period === b.period &&
    a.periodKey.trim() === b.periodKey.trim() &&
    a.title.trim() === b.title.trim() &&
    (a.description || '').trim() === (b.description || '').trim() &&
    a.status === b.status &&
    (a.winnerId ?? undefined) === (b.winnerId ?? undefined) &&
    (a.dueDate || '').trim() === (b.dueDate || '').trim() &&
    a.acknowledged === b.acknowledged
  );
}

export function replaceOptimisticStake(stakes: Stake[], optimisticId: string, canonical: Stake): Stake[] {
  const withoutOptimistic = optimisticId !== canonical.id ? stakes.filter(s => s.id !== optimisticId) : stakes;
  const exists = withoutOptimistic.some(s => s.id === canonical.id);
  return exists
    ? withoutOptimistic.map(s => (s.id === canonical.id ? canonical : s))
    : [...withoutOptimistic, canonical];
}

export function applyLocalStakeSave(
  snapshot: DuelSnapshot | null,
  result: StakeSaveResult,
  optimisticId?: string
): DuelSnapshot | null {
  if (!snapshot) return null;
  if (!result.changed) {
    return snapshot.cursor === result.cursor ? snapshot : null;
  }
  if (snapshot.cursor !== result.previousCursor) return null;
  return {
    cursor: result.cursor,
    data: {
      ...snapshot.data,
      stakes: replaceOptimisticStake(snapshot.data.stakes, optimisticId ?? result.stake.id, result.stake),
    },
  };
}

export function applyLocalStakeDelete(
  snapshot: DuelSnapshot | null,
  result: StakeDeleteResult,
  stakeId: string
): DuelSnapshot | null {
  if (!snapshot) return null;
  if (!result.deleted) {
    return snapshot.cursor === result.cursor ? snapshot : null;
  }
  if (snapshot.cursor !== result.previousCursor) return null;
  return {
    cursor: result.cursor,
    data: {
      ...snapshot.data,
      stakes: snapshot.data.stakes.filter(s => s.id !== stakeId),
    },
  };
}

export function checkInPatch(checkIn: CheckIn): Partial<CheckIn> {
  const { proofCount: _count, proofVersion: _version, ...patch } = checkIn;
  void _count; void _version;
  if (patch.proofUrls?.some(value => proofReference(value)) || (patch.proofUrl && proofReference(patch.proofUrl))) {
    throw new Error('Load your proof photos before saving them.');
  }
  return patch;
}
