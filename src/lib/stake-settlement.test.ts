import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  getStakePeriodEnd,
  getStakePeriodScores,
  getStakePhase,
  isStakePeriodClosed,
  settleDueStakes,
} from './stake-settlement';
import type { CheckIn, PlayerId, Stake } from './types';

const checkIn = (id: string, playerId: PlayerId, date: string, pointsEarned: number): CheckIn => ({
  id,
  habitId: 'h',
  playerId,
  date,
  pointsEarned,
  completedAt: `${date}T12:00:00.000Z`,
});

const stake = (overrides: Partial<Stake>): Stake => ({
  id: 's',
  period: 'weekly',
  periodKey: '2026-W46',
  title: '🍕 Dinner',
  description: '',
  status: 'active',
  dueDate: '2026-11-10',
  ...overrides,
});

test('a stake stays open until its window has passed', () => {
  const weekly = stake({ periodKey: '2026-W47' });
  assert.equal(isStakePeriodClosed(weekly, '2026-11-22'), false); // Sunday of W47
  assert.equal(isStakePeriodClosed(weekly, '2026-11-23'), true); // Monday of W48
  const monthly = stake({ period: 'monthly', periodKey: '2026-09' });
  assert.equal(isStakePeriodClosed(monthly, '2026-09-30'), false);
  assert.equal(isStakePeriodClosed(monthly, '2026-10-01'), true);
});

test('only points earned inside the stake window count toward the verdict', () => {
  const checkIns = [
    checkIn('a', 'maciek', '2026-11-09', 30), // Monday W46
    checkIn('b', 'myrna', '2026-11-15', 25), // Sunday W46
    checkIn('c', 'myrna', '2026-11-16', 100), // Monday W47, outside
    checkIn('d', 'myrna', '2026-11-08', 100), // Sunday W45, outside
  ];
  assert.deepEqual(getStakePeriodScores(stake({}), checkIns), { maciek: 30, myrna: 25, winnerId: 'maciek' });
});

test('equal points settle as a tie', () => {
  const checkIns = [checkIn('a', 'maciek', '2026-11-10', 20), checkIn('b', 'myrna', '2026-11-11', 20)];
  assert.equal(getStakePeriodScores(stake({}), checkIns).winnerId, 'tie');
  assert.equal(getStakePeriodScores(stake({}), []).winnerId, 'tie');
});

test('period ends land on the last day of the window', () => {
  assert.equal(getStakePeriodEnd(stake({ periodKey: '2026-W46' })), '2026-11-15');
  assert.equal(getStakePeriodEnd(stake({ periodKey: '2026-W01' })), '2026-01-04');
  assert.equal(getStakePeriodEnd(stake({ periodKey: '2021-W01' })), '2021-01-10');
  assert.equal(getStakePeriodEnd(stake({ periodKey: '2026-W53' })), '2027-01-03');
  assert.equal(getStakePeriodEnd(stake({ period: 'monthly', periodKey: '2028-02' })), '2028-02-29');
  assert.equal(getStakePeriodEnd(stake({ period: 'yearly', periodKey: '2026' })), '2026-12-31');
});

test('a closed window gets one final-call day for late logs before the verdict is due', () => {
  const weekly = stake({ periodKey: '2026-W47' }); // Nov 16–22
  assert.equal(getStakePhase(weekly, '2026-11-22'), 'open');
  assert.equal(getStakePhase(weekly, '2026-11-23'), 'final-call');
  assert.equal(getStakePhase(weekly, '2026-11-24'), 'due');
  const monthly = stake({ period: 'monthly', periodKey: '2026-10' });
  assert.equal(getStakePhase(monthly, '2026-11-01'), 'final-call');
  assert.equal(getStakePhase(monthly, '2026-11-02'), 'due');
});

test('settlement completes only due active stakes and names the points leader', () => {
  const stakes = [
    stake({ id: 'closed', periodKey: '2026-W46' }),
    stake({ id: 'open', periodKey: '2026-W48' }),
    stake({ id: 'final-call', periodKey: '2026-W47' }),
    stake({ id: 'done', periodKey: '2026-W40', status: 'completed', winnerId: 'maciek' }),
    stake({ id: 'month', period: 'monthly', periodKey: '2026-10', dueDate: '2026-10-02' }),
  ];
  const checkIns = [checkIn('a', 'myrna', '2026-11-12', 40), checkIn('b', 'maciek', '2026-10-20', 15)];
  const settled = settleDueStakes(stakes, checkIns, '2026-11-23');
  assert.deepEqual(
    settled.map((s) => [s.id, s.status, s.winnerId, s.dueDate]),
    [
      ['closed', 'completed', 'myrna', '2026-11-15'],
      ['month', 'completed', 'maciek', '2026-10-31'],
    ]
  );
});
