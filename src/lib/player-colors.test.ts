import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { PLAYER_COLORS } from './types';
import { getPlayerColorStyles, getPlayerThemeStyles, isPlayerColorUnlocked } from './player-colors';

describe('Domain: Karma-gated player colors', () => {
  it('keeps colors locked immediately below each lifetime-point threshold', () => {
    assert.equal(isPlayerColorUnlocked('teal', 249), false);
    assert.equal(isPlayerColorUnlocked('orange', 499), false);
    assert.equal(isPlayerColorUnlocked('pink', 999), false);
    assert.equal(isPlayerColorUnlocked('green', 2499), false);
    assert.equal(isPlayerColorUnlocked('rainbow', 9999), false);
  });

  it('unlocks each color at its exact lifetime-point milestone', () => {
    assert.equal(isPlayerColorUnlocked('teal', 250), true);
    assert.equal(isPlayerColorUnlocked('orange', 500), true);
    assert.equal(isPlayerColorUnlocked('pink', 1000), true);
    assert.equal(isPlayerColorUnlocked('green', 2500), true);
    assert.equal(isPlayerColorUnlocked('rainbow', 10000), true);
  });

  it('keeps the default blue and purple colors available from the start', () => {
    assert.equal(isPlayerColorUnlocked('blue', 0), true);
    assert.equal(isPlayerColorUnlocked('purple', 0), true);
  });
});

describe('Player color identity styles', () => {
  it('uses a high-contrast rainbow gradient for the Rainbow identity', () => {
    assert.deepEqual(getPlayerColorStyles({
      color: '#f0abfc',
      accentBg: 'rgba(232, 121, 249, 0.1)',
      accentBorder: 'rgba(232, 121, 249, 0.3)',
    }), {
      color: '#fff',
      backgroundColor: 'rgba(232, 121, 249, 0.1)',
      borderColor: 'rgba(255,255,255,.45)',
      backgroundImage: 'linear-gradient(135deg,#b91c1c,#a16207,#15803d,#1d4ed8,#7e22ce)',
    });
  });
});


describe('Player theme scopes', () => {
  it('uses the chosen color for every unlocked palette without setting container colors', () => {
    for (const palette of PLAYER_COLORS) {
      const styles = getPlayerThemeStyles(palette);
      assert.equal(styles['--player-base'], palette.color);
      assert.equal(styles.color, undefined);
      assert.equal(styles.backgroundColor, undefined);
    }
  });

  it('keeps active, owner and guest palettes independent when the guest is active', () => {
    const owner = PLAYER_COLORS.find(color => color.id === 'orange');
    const guest = PLAYER_COLORS.find(color => color.id === 'teal');
    assert.ok(owner && guest);
    const styles = {
      ...getPlayerThemeStyles(guest),
      ...getPlayerThemeStyles(owner, 'owner'),
      ...getPlayerThemeStyles(guest, 'guest'),
    };
    assert.equal(styles['--player-base'], guest.color);
    assert.equal(styles['--owner-base'], owner.color);
    assert.equal(styles['--guest-base'], guest.color);
  });

  it('clears an inherited Rainbow fill when a solid Player is selected locally', () => {
    const rainbow = PLAYER_COLORS.find(color => color.id === 'rainbow');
    const solid = PLAYER_COLORS.find(color => color.id === 'green');
    assert.ok(rainbow && solid);
    const styles = { ...getPlayerThemeStyles(rainbow), ...getPlayerThemeStyles(solid) };
    assert.match(getPlayerThemeStyles(rainbow)['--player-gradient'], /linear-gradient/);
    assert.equal(styles['--player-gradient'], 'none');
    assert.equal(styles['--player-base'], solid.color);
  });
});
