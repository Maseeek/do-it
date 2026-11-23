import type { CheckIn, PlayerId, Stake, StakePeriod } from './types';
import { addDays, formatDateString, getMonthKey, getTodayDateString, getWeekKey, getYearKey } from './date-utils';

/**
 * Stakes are settled by the scoreboard, never by a Player. Once a Stake's
 * Leaderboard window closes, the Player with more points in that window wins.
 * Settlement is a pure function of shared check-ins, so both Players' devices
 * reach the same verdict independently.
 *
 * Check-ins can be logged retroactively, so a closed window gets one
 * "final call" day for late logs before the verdict is written.
 */

export const STAKE_FINAL_CALL_DAYS = 1;

export type StakePhase = 'open' | 'final-call' | 'due';

export interface StakePeriodScores {
  maciek: number;
  myrna: number;
  winnerId: PlayerId | 'tie';
}

function periodKeyFor(period: StakePeriod, dateStr: string): string {
  if (period === 'weekly') return getWeekKey(dateStr);
  if (period === 'monthly') return getMonthKey(dateStr);
  return getYearKey(dateStr);
}

export function isStakePeriodClosed(stake: Pick<Stake, 'period' | 'periodKey'>, today = getTodayDateString()): boolean {
  // Keys are zero-padded ("2026-W09", "2026-09", "2026"), so string order is chronological order.
  return stake.periodKey < periodKeyFor(stake.period, today);
}

export function getStakePeriodScores(stake: Pick<Stake, 'period' | 'periodKey'>, checkIns: CheckIn[]): StakePeriodScores {
  let maciek = 0;
  let myrna = 0;
  for (const checkIn of checkIns) {
    if (periodKeyFor(stake.period, checkIn.date) !== stake.periodKey) continue;
    if (checkIn.playerId === 'maciek') maciek += checkIn.pointsEarned;
    else if (checkIn.playerId === 'myrna') myrna += checkIn.pointsEarned;
  }
  const winnerId: PlayerId | 'tie' = maciek > myrna ? 'maciek' : myrna > maciek ? 'myrna' : 'tie';
  return { maciek, myrna, winnerId };
}

/** Last calendar day of the Stake's window, as YYYY-MM-DD. */
export function getStakePeriodEnd(stake: Pick<Stake, 'period' | 'periodKey'>): string {
  if (stake.period === 'monthly') {
    const [year, month] = stake.periodKey.split('-').map(Number);
    return formatDateString(new Date(year, month, 0));
  }
  if (stake.period === 'yearly') return `${stake.periodKey.slice(0, 4)}-12-31`;
  const match = /^(\d{4})-W(\d{2})$/.exec(stake.periodKey);
  if (!match) return stake.periodKey;
  const year = Number(match[1]);
  const week = Number(match[2]);
  // ISO week 1 contains January 4th; its Monday anchors every other week.
  const week1MondayDay = 4 - ((new Date(year, 0, 4).getDay() + 6) % 7);
  return formatDateString(new Date(year, 0, week1MondayDay + (week - 1) * 7 + 6));
}

/** First day on which the verdict is written: the day after the final call. */
export function getStakeVerdictDate(stake: Pick<Stake, 'period' | 'periodKey'>): string {
  return addDays(getStakePeriodEnd(stake), STAKE_FINAL_CALL_DAYS + 1);
}

export function getStakePhase(stake: Pick<Stake, 'period' | 'periodKey'>, today = getTodayDateString()): StakePhase {
  if (!isStakePeriodClosed(stake, today)) return 'open';
  return today < getStakeVerdictDate(stake) ? 'final-call' : 'due';
}

/** Returns the active Stakes whose final call has passed, settled by points. */
export function settleDueStakes(stakes: Stake[], checkIns: CheckIn[], today = getTodayDateString()): Stake[] {
  const settled: Stake[] = [];
  for (const stake of stakes) {
    if (stake.status !== 'active' || getStakePhase(stake, today) !== 'due') continue;
    settled.push({
      ...stake,
      status: 'completed',
      winnerId: getStakePeriodScores(stake, checkIns).winnerId,
      dueDate: getStakePeriodEnd(stake),
    });
  }
  return settled;
}
