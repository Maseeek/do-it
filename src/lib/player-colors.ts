import type { CSSProperties } from 'react';
import { PLAYER_COLORS, type Player, type PlayerColorId } from './types';

const RAINBOW_GRADIENT = 'linear-gradient(135deg,#b91c1c,#a16207,#15803d,#1d4ed8,#7e22ce)';

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

// Scope a palette without changing the container's text or background.
// CSS derives readable shades for light/dark mode from the saved Player color.
type PlayerThemeStyles = CSSProperties & { [key: `--${string}`]: string };

export function getPlayerThemeStyles(
  player: Pick<Player, 'color'>,
  scope: 'player' | 'owner' | 'guest' = 'player',
): PlayerThemeStyles {
  const isRainbow = PLAYER_COLORS.some(option => option.id === 'rainbow' && option.color === player.color);
  return {
    [`--${scope}-base`]: player.color,
    [`--${scope}-gradient`]: isRainbow ? RAINBOW_GRADIENT : 'none',
  };
}
