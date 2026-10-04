export type MultiplayerEntry = 'app' | 'gate' | 'invite-conflict';

export function getMultiplayerEntry(configured: boolean, hasUser: boolean, hasDuel: boolean, inviteCode: string | null): MultiplayerEntry {
  if (!configured) return 'app';
  if (!hasUser || !hasDuel) return 'gate';
  if (inviteCode) return 'invite-conflict';
  return 'app';
}

export type InviteOutcome =
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
  const sameDuel = params.duelInviteCode.toLowerCase() === params.inviteCode.toLowerCase();
  if (sameDuel) {
    return params.ownerId === params.userId ? 'own-invite' : 'already-joined';
  }
  if (params.hasGuest) {
    return 'paired-conflict';
  }
  return 'solo-replaceable';
}
