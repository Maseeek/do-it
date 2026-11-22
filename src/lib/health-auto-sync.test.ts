import assert from 'node:assert/strict';
import test from 'node:test';
import {
  HEALTH_AUTO_SYNC_COOLDOWN_MS,
  isHealthCooldownActive,
  needsHealthReconnect,
  nextDate,
  previousDate,
  resolveSyncDates,
  shiftDate,
  shouldRunAutoHealthSync,
} from './health-auto-sync';

test('date shifting handles month, year, and leap-year boundaries', () => {
  assert.equal(previousDate('2026-01-01'), '2025-12-31');
  assert.equal(nextDate('2025-12-31'), '2026-01-01');
  assert.equal(previousDate('2024-03-01'), '2024-02-29');
  assert.equal(shiftDate('2026-03-02', -2), '2026-02-28');
});

test('resolveSyncDates checks yesterday and today for today/auto checks, and only target for past dates', () => {
  assert.deepEqual(resolveSyncDates('2026-10-15', undefined, true), ['2026-10-14', '2026-10-15']);
  assert.deepEqual(resolveSyncDates('2026-10-15', '2026-10-15', true), ['2026-10-14', '2026-10-15']);
  assert.deepEqual(resolveSyncDates('2026-10-15', '2026-10-10', true), ['2026-10-10']);
  assert.deepEqual(resolveSyncDates('2026-10-15', undefined, false), ['2026-10-15']);
});

test('cooldown detects recent checks and expires cleanly at boundary', () => {
  const now = Date.parse('2026-10-15T12:00:00Z');
  assert.equal(isHealthCooldownActive(null, now), false);
  assert.equal(isHealthCooldownActive('not-a-date', now), false);
  assert.equal(isHealthCooldownActive('2026-10-15T11:50:00Z', now), true);
  assert.equal(isHealthCooldownActive('2026-10-15T11:45:00Z', now), false);
  assert.equal(isHealthCooldownActive('2026-10-15T11:45:01Z', now), true);
});

test('needsHealthReconnect matches auth/permission failures and ignores transient errors', () => {
  assert.equal(needsHealthReconnect('Google Health permission needs attention. Reconnect to continue.'), true);
  assert.equal(needsHealthReconnect('invalid_grant: Token has been expired or revoked.'), true);
  assert.equal(needsHealthReconnect('Google Health is busy right now. Try again shortly.'), false);
  assert.equal(needsHealthReconnect('Google Health could not be checked (503).'), false);
  assert.equal(needsHealthReconnect(null), false);
});

test('shouldRunAutoHealthSync enforces foreground, connectivity, habits, disabled state, and cooldowns', () => {
  const nowMs = Date.parse('2026-10-15T12:00:00Z');
  const base = {
    isHydrated: true,
    multiplayerConfigured: true,
    hasUser: true,
    hasDuelLoaded: true,
    hasAutomatedHabits: true,
    isVisible: true,
    isOnline: true,
    inFlight: false,
    disabledReason: null,
    lastAttemptAt: 0,
    lastCheckedAt: null as string | null,
    nowMs,
  };

  assert.equal(shouldRunAutoHealthSync(base), true);
  assert.equal(shouldRunAutoHealthSync({ ...base, isVisible: false }), false);
  assert.equal(shouldRunAutoHealthSync({ ...base, isOnline: false }), false);
  assert.equal(shouldRunAutoHealthSync({ ...base, hasAutomatedHabits: false }), false);
  assert.equal(shouldRunAutoHealthSync({ ...base, inFlight: true }), false);
  assert.equal(shouldRunAutoHealthSync({ ...base, disabledReason: 'not_connected' }), false);
  assert.equal(shouldRunAutoHealthSync({ ...base, disabledReason: 'needs_attention' }), false);
  assert.equal(shouldRunAutoHealthSync({ ...base, lastAttemptAt: nowMs - HEALTH_AUTO_SYNC_COOLDOWN_MS + 1000 }), false);
  assert.equal(shouldRunAutoHealthSync({ ...base, lastAttemptAt: nowMs - HEALTH_AUTO_SYNC_COOLDOWN_MS }), true);
  assert.equal(shouldRunAutoHealthSync({ ...base, lastCheckedAt: '2026-10-15T11:55:00Z' }), false);
  assert.equal(shouldRunAutoHealthSync({ ...base, lastCheckedAt: '2026-10-15T11:40:00Z' }), true);
});
