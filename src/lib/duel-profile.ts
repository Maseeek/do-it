import { PLAYER_COLORS, type Player, type PlayerColorId, type PlayerId } from './types';

export interface DuelProfile {
  id: string;
  owner_id: string;
  guest_id: string | null;
  owner_name: string;
  guest_name: string | null;
  invite_code: string;
  owner_color: PlayerColorId;
  guest_color: PlayerColorId;
  owner_invites?: number;
  guest_invites?: number;
}

export function isDuelProfile(value: unknown): value is DuelProfile {
  if (!value || typeof value !== 'object') return false;
  const isColor = (id: unknown) => PLAYER_COLORS.some(color => color.id === id);
  return 'id' in value && typeof value.id === 'string'
    && 'owner_id' in value && typeof value.owner_id === 'string'
    && 'guest_id' in value && (value.guest_id === null || typeof value.guest_id === 'string')
    && 'owner_name' in value && typeof value.owner_name === 'string'
    && 'guest_name' in value && (value.guest_name === null || typeof value.guest_name === 'string')
    && 'invite_code' in value && typeof value.invite_code === 'string'
    && 'owner_color' in value && isColor(value.owner_color)
    && 'guest_color' in value && isColor(value.guest_color)
    && (!('owner_invites' in value) || (typeof value.owner_invites === 'number' && Number.isInteger(value.owner_invites) && value.owner_invites >= 0))
    && (!('guest_invites' in value) || (typeof value.guest_invites === 'number' && Number.isInteger(value.guest_invites) && value.guest_invites >= 0));
}

export function getDuelPlayers(players: Record<PlayerId, Player>, duel: DuelProfile): Record<PlayerId, Player> {
  const owner = PLAYER_COLORS.find(color => color.id === duel.owner_color) || PLAYER_COLORS[0];
  const guest = PLAYER_COLORS.find(color => color.id === duel.guest_color) || PLAYER_COLORS[1];
  return {
    maciek: { ...players.maciek, name: duel.owner_name, color: owner.color, accentBg: owner.accentBg, accentBorder: owner.accentBorder, inviteCount: duel.owner_invites ?? 0 },
    myrna: { ...players.myrna, name: duel.guest_name || 'Waiting for opponent', color: guest.color, accentBg: guest.accentBg, accentBorder: guest.accentBorder, inviteCount: duel.guest_invites ?? 0 },
  };
}

// Install optimistic metadata before awaiting the network. The RPC returns both
// slots, so confirmation needs no extra fetch and failure can restore the snapshot.
export async function saveDuelColor(
  duel: DuelProfile,
  slot: PlayerId,
  color: PlayerColorId,
  apply: (duel: DuelProfile) => void,
  save: () => Promise<unknown>,
): Promise<void> {
  apply({ ...duel, ...(slot === 'maciek' ? { owner_color: color } : { guest_color: color }) });
  try {
    const response = await save();
    const saved = Array.isArray(response) && response.length === 1 ? response[0] : response;
    if (!isDuelProfile(saved) || saved.id !== duel.id) throw new Error('Could not confirm your saved colour. Try again.');
    apply(saved);
  } catch (error) {
    apply(duel);
    throw error;
  }
}
