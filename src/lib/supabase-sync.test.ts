import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  checkInToRow,
  habitToRow,
  rowToCheckIn,
  rowToHabit,
  rowToStake,
  stakeToRow,
} from './supabase-sync';
import { CheckIn, Habit, Stake } from './types';
import { INITIAL_HABITS } from './seed';

describe('Store: Supabase Cloud Serialization & Database Schema Parity', () => {
  describe('Habits Mapping (camelCase <-> snake_case)', () => {
    it('serializes Habit model to Supabase table row format', () => {
      const habit: Habit = INITIAL_HABITS[0]; // maciek-sleep
      const row = habitToRow(habit);

      assert.strictEqual(row.id, habit.id);
      assert.strictEqual(row.player_id, habit.playerId);
      assert.strictEqual(row.title, habit.title);
      assert.strictEqual(row.category, habit.category);
      assert.strictEqual(row.points, habit.points);
      assert.strictEqual(row.icon_name, habit.iconName);
      assert.strictEqual(row.is_active, true);
    });

    it('deserializes database row back into full Habit model', () => {
      const row = {
        id: 'test-habit-1',
        player_id: 'maciek',
        title: 'Morning Sunlight',
        description: 'Get 15 mins of natural light',
        category: 'foundation',
        points: 25,
        icon_name: 'Sun',
        frequency: 'daily',
        weekly_target_days: null,
        is_quantitative: true,
        quantity_unit: 'minutes',
        max_quantity: 30,
        points_per_unit: 1,
        requires_proof: true,
        order: 5,
        is_active: true,
      };

      const habit = rowToHabit(row);

      assert.strictEqual(habit.id, 'test-habit-1');
      assert.strictEqual(habit.playerId, 'maciek');
      assert.strictEqual(habit.title, 'Morning Sunlight');
      assert.strictEqual(habit.isQuantitative, true);
      assert.strictEqual(habit.quantityUnit, 'minutes');
      assert.strictEqual(habit.maxQuantity, 30);
      assert.strictEqual(habit.requiresProof, true);
      assert.strictEqual(habit.order, 5);
      assert.strictEqual(habit.isActive, true);
    });
  });

  describe('Check-Ins Mapping & Proof Serialization', () => {
    it('serializes single proof URL string', () => {
      const checkIn: CheckIn = {
        id: 'ci-1',
        habitId: 'maciek-clean',
        playerId: 'maciek',
        date: '2026-09-28',
        pointsEarned: 20,
        proofUrl: 'https://supabase.co/storage/v1/object/public/proofs/clean.jpg',
        completedAt: '2026-09-28T14:30:00Z',
      };

      const row = checkInToRow(checkIn);
      assert.strictEqual(row.id, 'ci-1');
      assert.strictEqual(row.habit_id, 'maciek-clean');
      assert.strictEqual(row.player_id, 'maciek');
      assert.strictEqual(row.proof_url, 'https://supabase.co/storage/v1/object/public/proofs/clean.jpg');

      const restored = rowToCheckIn(row);
      assert.strictEqual(restored.proofUrl, 'https://supabase.co/storage/v1/object/public/proofs/clean.jpg');
      assert.deepStrictEqual(restored.proofUrls, ['https://supabase.co/storage/v1/object/public/proofs/clean.jpg']);
    });

    it('serializes multiple proof URLs array to JSON string and parses back', () => {
      const urls = [
        'https://supabase.co/storage/v1/object/public/proofs/img1.jpg',
        'https://supabase.co/storage/v1/object/public/proofs/img2.jpg',
      ];

      const checkIn: CheckIn = {
        id: 'ci-multi',
        habitId: 'maciek-clean',
        playerId: 'maciek',
        date: '2026-09-28',
        pointsEarned: 20,
        proofUrls: urls,
        completedAt: '2026-09-28T14:30:00Z',
      };

      const row = checkInToRow(checkIn);
      assert.strictEqual(row.proof_url, JSON.stringify(urls));

      const restored = rowToCheckIn(row);
      assert.deepStrictEqual(restored.proofUrls, urls);
      assert.strictEqual(restored.proofUrl, urls[0]);
    });
  });

  describe('Stakes Mapping', () => {
    it('converts Stake entity to database row and back', () => {
      const stake: Stake = {
        id: 'stake-1',
        period: 'weekly',
        periodKey: '2026-W39',
        title: 'Sunday Dinner Date',
        description: 'Winner picks place',
        status: 'active',
        dueDate: '2026-09-28',
      };

      const row = stakeToRow(stake);
      assert.strictEqual(row.id, 'stake-1');
      assert.strictEqual(row.period_key, '2026-W39');
      assert.strictEqual(row.status, 'active');

      const restored = rowToStake(row);
      assert.strictEqual(restored.id, stake.id);
      assert.strictEqual(restored.period, stake.period);
      assert.strictEqual(restored.periodKey, stake.periodKey);
      assert.strictEqual(restored.title, stake.title);
      assert.strictEqual(restored.status, stake.status);
    });
  });
});
