export type MultiplayerEntry = 'app' | 'gate' | 'invite-conflict';

export function getMultiplayerEntry(configured: boolean, hasUser: boolean, hasDuel: boolean, inviteCode: string | null): MultiplayerEntry {
  if (!configured) return 'app';
  if (!hasUser || !hasDuel) return 'gate';
  if (inviteCode) return 'invite-conflict';
  return 'app';
}
