import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { INITIAL_HABITS, INITIAL_PLAYERS, getInitialStakes, getInitialState } from './seed';

describe('Store: State Machine & Domain Invariants', () => {
  it('validates player profiles: exactly Maciek and Myrna with distinct identities', () => {
    assert.ok(INITIAL_PLAYERS.maciek);
    assert.ok(INITIAL_PLAYERS.myrna);
    assert.strictEqual(INITIAL_PLAYERS.maciek.name, 'Maciek');
    assert.strictEqual(INITIAL_PLAYERS.myrna.name, 'Myrna');
    assert.notStrictEqual(INITIAL_PLAYERS.maciek.color, INITIAL_PLAYERS.myrna.color);
  });

  it('seeded initial habits balance point totals between players', () => {
    const maciekHabits = INITIAL_HABITS.filter((h) => h.playerId === 'maciek');
    const myrnaHabits = INITIAL_HABITS.filter((h) => h.playerId === 'myrna');

    const maciekTotal = maciekHabits.reduce((sum, h) => sum + h.points, 0);
    const myrnaTotal = myrnaHabits.reduce((sum, h) => sum + h.points, 0);

    assert.strictEqual(maciekTotal, myrnaTotal, 'Both players start with balanced point parity');
  });

  it('verifies category parity between Maciek and Myrna in initial habits', () => {
    const maciekCategories = INITIAL_HABITS.filter((h) => h.playerId === 'maciek').map((h) => h.category);
    const myrnaCategories = INITIAL_HABITS.filter((h) => h.playerId === 'myrna').map((h) => h.category);

    assert.deepStrictEqual(maciekCategories.sort(), myrnaCategories.sort());
  });

  it('verifies quantitative reading habit is calibrated with 1 pt per page up to 25 cap', () => {
    const maciekReading = INITIAL_HABITS.find((h) => h.id === 'maciek-reading')!;
    const myrnaReading = INITIAL_HABITS.find((h) => h.id === 'myrna-reading')!;

    for (const h of [maciekReading, myrnaReading]) {
      assert.strictEqual(h.isQuantitative, true);
      assert.strictEqual(h.quantityUnit, 'pages');
      assert.strictEqual(h.maxQuantity, 25);
      assert.strictEqual(h.pointsPerUnit, 1);
      assert.strictEqual(h.points, 25);
    }
  });

  it('verifies clean space habit requires proof for both players', () => {
    const maciekClean = INITIAL_HABITS.find((h) => h.id === 'maciek-clean')!;
    const myrnaClean = INITIAL_HABITS.find((h) => h.id === 'myrna-clean')!;

    assert.strictEqual(maciekClean.requiresProof, true);
    assert.strictEqual(myrnaClean.requiresProof, true);
  });

  it('initial state provides active weekly and monthly stakes plus past history', () => {
    const stakes = getInitialStakes();
    const activeWeekly = stakes.find((s) => s.period === 'weekly' && s.status === 'active');
    const activeMonthly = stakes.find((s) => s.period === 'monthly' && s.status === 'active');
    const pastCompleted = stakes.filter((s) => s.status === 'completed');

    assert.ok(activeWeekly, 'Must have active weekly stake');
    assert.ok(activeMonthly, 'Must have active monthly stake');
    assert.ok(pastCompleted.length >= 2, 'Must have at least 2 completed historical stakes');
  });

  it('initial state begins with activePlayerId = null for zero-password Profile Gate', () => {
    const state = getInitialState();
    assert.strictEqual(state.activePlayerId, null);
    assert.ok(state.players.maciek);
    assert.ok(state.players.myrna);
    assert.ok(state.habits.length > 0);
    assert.ok(Array.isArray(state.checkIns));
    assert.strictEqual(state.checkIns.length, 0);
    assert.ok(Array.isArray(state.reactions));
    assert.strictEqual(state.reactions.length, 0);
    assert.ok(Array.isArray(state.restDays));
    assert.strictEqual(state.restDays.length, 0);
  });
});
