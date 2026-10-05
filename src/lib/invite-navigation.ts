export type MultiplayerEntry = 'app' | 'gate' | 'invite-conflict';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidInviteCode(code: string | null | undefined): code is string {
  return typeof code === 'string' && UUID_PATTERN.test(code.trim());
}

export function extractInviteCode(input: string | null | undefined): string | null {
  if (typeof input !== 'string') return null;
  const trimmed = input.trim();
  if (!trimmed) return '';
  if (UUID_PATTERN.test(trimmed)) return trimmed;
  try {
    const url = new URL(trimmed);
    const param = url.searchParams.get('invite');
    if (param !== null) return param.trim();
  } catch {
    const match = trimmed.match(/[?&]invite=([^&#\s]*)/i);
    if (match) {
      try {
        return decodeURIComponent(match[1]).trim();
      } catch {
        return match[1].trim();
      }
    }
  }
  return trimmed;
}

export function hasMatchedAccount(user: { id?: string | null; email?: string | null } | null | undefined): boolean {
  if (!user || typeof user.id !== 'string' || !user.id.trim()) return false;
  if (typeof user.email !== 'string') return false;
  return EMAIL_PATTERN.test(user.email.trim());
}

export function hasMatchedDuelPartner(
  duel: { owner_id?: string | null; guest_id?: string | null; owner_name?: string | null; guest_name?: string | null } | null | undefined,
  user: { id?: string | null; email?: string | null } | null | undefined,
): boolean {
  if (!duel || !hasMatchedAccount(user)) return false;
  const ownerId = duel.owner_id?.trim() || '';
  const guestId = duel.guest_id?.trim() || '';
  if (!isValidInviteCode(ownerId) || !isValidInviteCode(guestId)) return false;
  if (ownerId.toLowerCase() === guestId.toLowerCase()) return false;
  if (user!.id === ownerId) {
    return Boolean(duel.guest_name?.trim());
  }
  if (user!.id === guestId) {
    return Boolean(duel.owner_name?.trim());
  }
  return false;
}

export function getMultiplayerEntry(configured: boolean, hasUser: boolean, hasDuel: boolean, inviteCode: string | null): MultiplayerEntry {
  if (!configured) return 'app';
  if (!hasUser || !hasDuel) return 'gate';
  if (inviteCode !== null) return 'invite-conflict';
  return 'app';
}

export type InviteOutcome =
  | 'empty-invite'
  | 'invalid-invite'
  | 'own-invite'
  | 'already-joined'
  | 'paired-conflict'
  | 'solo-replaceable';

export interface InviteOutcomeParams {
  inviteCode: string;
  duelInviteCode: string;
  userId: string;
  ownerId: string;
  hasGuest: boolean;
}

export function getInviteOutcome(params: InviteOutcomeParams): InviteOutcome {
  const normalizedInvite = params.inviteCode.trim();
  if (!normalizedInvite) {
    return 'empty-invite';
  }
  if (!isValidInviteCode(normalizedInvite)) {
    return 'invalid-invite';
  }
  const sameDuel = params.duelInviteCode.trim().toLowerCase() === normalizedInvite.toLowerCase();
  if (sameDuel) {
    return params.ownerId === params.userId ? 'own-invite' : 'already-joined';
  }
  if (params.hasGuest) {
    return 'paired-conflict';
  }
  return 'solo-replaceable';
}
