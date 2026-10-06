import { PLAYER_COLORS, type PlayerColorId } from './types';

export function isPlayerColorUnlocked(colorId: PlayerColorId, lifetimePoints: number): boolean {
  const color = PLAYER_COLORS.find(option => option.id === colorId);
  return Number.isFinite(lifetimePoints) && color !== undefined && lifetimePoints >= color.unlockAt;
}
