import { CheckIn, Habit, LeaderboardTier, PlayerId, PlayerScoreSummary } from './types';
import {
  getTodayDateString,
  isDateInCurrentMonth,
  isDateInCurrentWeek,
  isDateInCurrentYear,
  parseDate,
} from './date-utils';

export function calculatePlayerScores(
  playerId: PlayerId,
  checkIns: CheckIn[],
  habits: Habit[]
): PlayerScoreSummary {
  const today = getTodayDateString();
  const playerLogs = checkIns.filter((c) => c.playerId === playerId);

  let todayPoints = 0;
  let weeklyPoints = 0;
  let monthlyPoints = 0;
  let yearlyPoints = 0;
  let karmaPoints = 0;

  playerLogs.forEach((log) => {
    karmaPoints += log.pointsEarned;
    if (log.date === today) {
      todayPoints += log.pointsEarned;
    }
    if (isDateInCurrentWeek(log.date)) {
      weeklyPoints += log.pointsEarned;
    }
    if (isDateInCurrentMonth(log.date)) {
      monthlyPoints += log.pointsEarned;
    }
    if (isDateInCurrentYear(log.date)) {
      yearlyPoints += log.pointsEarned;
    }
  });

  // Calculate streak
  const uniqueDates = Array.from(new Set(playerLogs.map((l) => l.date))).sort().reverse();
  let currentStreak = 0;
  const checkDate = parseDate(today);

  // Check if today is completed or yesterday was the last
  const todayIncluded = uniqueDates.includes(today);
  if (!todayIncluded) {
    checkDate.setDate(checkDate.getDate() - 1);
  }

  for (let i = 0; i < 365; i++) {
    const y = checkDate.getFullYear();
    const m = String(checkDate.getMonth() + 1).padStart(2, '0');
    const d = String(checkDate.getDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${d}`;

    if (uniqueDates.includes(dateStr)) {
      currentStreak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  // Weekly completion rate calculation
  const activeHabitsCount = habits.filter((h) => h.playerId === playerId && h.isActive).length;
  const weeklyLogs = playerLogs.filter((l) => isDateInCurrentWeek(l.date)).length;
  const now = new Date();
  const dayOfWeek = (now.getDay() + 6) % 7 + 1; // 1 = Mon, 7 = Sun
  const maxPossibleSoFar = Math.max(1, activeHabitsCount * dayOfWeek);
  const completionRateWeekly = Math.min(100, Math.round((weeklyLogs / maxPossibleSoFar) * 100));

  return {
    today: todayPoints,
    weekly: weeklyPoints,
    monthly: monthlyPoints,
    yearly: yearlyPoints,
    karma: karmaPoints,
    currentStreak,
    completionRateWeekly,
  };
}

export function getTierScore(summary: PlayerScoreSummary, tier: LeaderboardTier): number {
  switch (tier) {
    case 'weekly':
      return summary.weekly;
    case 'monthly':
      return summary.monthly;
    case 'yearly':
      return summary.yearly;
    case 'karma':
      return summary.karma;
  }
}

export function getVersusComparison(
  maciekSummary: PlayerScoreSummary,
  myrnaSummary: PlayerScoreSummary,
  tier: LeaderboardTier
) {
  const maciekScore = getTierScore(maciekSummary, tier);
  const myrnaScore = getTierScore(myrnaSummary, tier);
  const delta = Math.abs(maciekScore - myrnaScore);

  let leader: PlayerId | 'tie' = 'tie';
  if (maciekScore > myrnaScore) leader = 'maciek';
  if (myrnaScore > maciekScore) leader = 'myrna';

  const total = maciekScore + myrnaScore;
  const maciekPct = total === 0 ? 50 : Math.round((maciekScore / total) * 100);
  const myrnaPct = total === 0 ? 50 : 100 - maciekPct;

  return {
    maciekScore,
    myrnaScore,
    leader,
    delta,
    maciekPct,
    myrnaPct,
  };
}
