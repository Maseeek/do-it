import type { CSSProperties } from 'react';
import { PLAYER_COLORS, type Player, type PlayerColorId } from './types';

const RAINBOW_GRADIENT = 'linear-gradient(135deg,#f87171,#fbbf24,#4ade80,#60a5fa,#c084fc)';

type PlayerColorStyleSource = Pick<Player, 'color' | 'accentBg' | 'accentBorder'>;

export function isPlayerColorUnlocked(colorId: PlayerColorId, lifetimePoints: number): boolean {
  const color = PLAYER_COLORS.find(option => option.id === colorId);
  return Number.isFinite(lifetimePoints) && color !== undefined && lifetimePoints >= color.unlockAt;
}

export function getPlayerColorStyles(player: PlayerColorStyleSource): CSSProperties {
  const isRainbow = PLAYER_COLORS.some(option => option.id === 'rainbow' && option.color === player.color);
  return {
    color: isRainbow ? '#fff' : player.color,
    backgroundColor: player.accentBg,
    borderColor: isRainbow ? 'rgba(255,255,255,.45)' : player.accentBorder,
    ...(isRainbow ? { backgroundImage: RAINBOW_GRADIENT } : {}),
  };
}
