import {
  CheckIn,
  Habit,
  HabitCategory,
  LeaderboardTier,
  PlayerId,
  PlayerScoreSummary,
  RestDay,
  Stake,
} from './types';
import {
  getCurrentWeekDays,
  getTodayDateString,
  isDateInCurrentMonth,
  isDateInCurrentWeek,
  isDateInCurrentYear,
  parseDate,
} from './date-utils';

export function calculatePlayerScores(
  playerId: PlayerId,
  checkIns: CheckIn[],
  habits: Habit[],
  restDays: RestDay[] = []
): PlayerScoreSummary {
  const today = getTodayDateString();
  const playerLogs = checkIns.filter((c) => c.playerId === playerId);
  const playerRestDays = restDays.filter((r) => r.playerId === playerId).map((r) => r.date);

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

  // Calculate streak with rest-day protection
  const uniqueDates = Array.from(new Set(playerLogs.map((l) => l.date)));
  let currentStreak = 0;
  const checkDate = parseDate(today);

  // If today isn't completed and not a rest day, start checking from yesterday
  const todayCovered = uniqueDates.includes(today) || playerRestDays.includes(today);
  if (!todayCovered) {
    checkDate.setDate(checkDate.getDate() - 1);
  }

  for (let i = 0; i < 365; i++) {
    const y = checkDate.getFullYear();
    const m = String(checkDate.getMonth() + 1).padStart(2, '0');
    const d = String(checkDate.getDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${d}`;

    const isCheckInDay = uniqueDates.includes(dateStr);
    const isRest = playerRestDays.includes(dateStr);

    if (isCheckInDay) {
      currentStreak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else if (isRest) {
      // Rest day preserves the streak without penalizing
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
    restDaysUsed: playerRestDays.length,
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

// Category Breakdown: Compare Maciek vs Myrna by category (weekly or all-time)
export interface CategoryComparison {
  category: HabitCategory;
  label: string;
  maciekPoints: number;
  myrnaPoints: number;
  leader: PlayerId | 'tie';
}

export function getCategoryBreakdown(
  checkIns: CheckIn[],
  habits: Habit[],
  scope: 'weekly' | 'karma' = 'weekly'
): CategoryComparison[] {
  const habitMap = new Map<string, Habit>();
  habits.forEach((h) => habitMap.set(h.id, h));

  const filteredLogs = checkIns.filter((c) => (scope === 'weekly' ? isDateInCurrentWeek(c.date) : true));

  const categories: HabitCategory[] = [
    'foundation',
    'physical',
    'cardio',
    'intellect',
    'deep_work',
    'skills',
    'nutrition',
    'environment',
    'mind',
    'language',
  ];

  const categoryLabels: Record<HabitCategory, string> = {
    foundation: 'Sleep & Recovery',
    physical: 'Gym & Strength',
    cardio: 'Sport & Running',
    intellect: 'Reading & Books',
    deep_work: 'Personal Project',
    skills: 'Deliberate Craft',
    nutrition: 'Nutrition & Fuel',
    environment: 'Clean Space',
    mind: 'Mind & Meditation',
    language: 'Language Study',
  };

  return categories.map((cat) => {
    let maciekPts = 0;
    let myrnaPts = 0;

    filteredLogs.forEach((log) => {
      const h = habitMap.get(log.habitId);
      if (h && h.category === cat) {
        if (log.playerId === 'maciek') maciekPts += log.pointsEarned;
        if (log.playerId === 'myrna') myrnaPts += log.pointsEarned;
      }
    });

    let leader: PlayerId | 'tie' = 'tie';
    if (maciekPts > myrnaPts) leader = 'maciek';
    if (myrnaPts > maciekPts) leader = 'myrna';

    return {
      category: cat,
      label: categoryLabels[cat] || cat,
      maciekPoints: maciekPts,
      myrnaPoints: myrnaPts,
      leader,
    };
  });
}

// Daily Duel Chart: points per day for the current week (Monday to Sunday)
export interface DailyDuelPoint {
  dayName: string;
  dateStr: string;
  maciekPoints: number;
  myrnaPoints: number;
  isToday: boolean;
  isFuture: boolean;
}

export function getWeeklyDailyDuelPoints(checkIns: CheckIn[]): DailyDuelPoint[] {
  const days = getCurrentWeekDays();

  return days.map((day) => {
    const dayLogs = checkIns.filter((c) => c.date === day.dateStr);
    const maciekPoints = dayLogs
      .filter((c) => c.playerId === 'maciek')
      .reduce((sum, c) => sum + c.pointsEarned, 0);
    const myrnaPoints = dayLogs
      .filter((c) => c.playerId === 'myrna')
      .reduce((sum, c) => sum + c.pointsEarned, 0);

    return {
      dayName: day.dayName,
      dateStr: day.dateStr,
      maciekPoints,
      myrnaPoints,
      isToday: day.isToday,
      isFuture: day.isFuture,
    };
  });
}

// Stakes Win/Loss record
export interface StakesRecord {
  maciekWins: number;
  myrnaWins: number;
  ties: number;
  totalCompleted: number;
  history: Stake[];
}

export function getStakesRecord(stakes: Stake[]): StakesRecord {
  const completed = stakes.filter((s) => s.status === 'completed' && s.winnerId);
  const maciekWins = completed.filter((s) => s.winnerId === 'maciek').length;
  const myrnaWins = completed.filter((s) => s.winnerId === 'myrna').length;
  const ties = completed.filter((s) => s.winnerId === 'tie').length;

  return {
    maciekWins,
    myrnaWins,
    ties,
    totalCompleted: completed.length,
    history: completed,
  };
}

// Calculate consecutive day streak for an individual habit
export function calculateHabitStreak(habit: Habit, checkIns: CheckIn[]): number {
  const habitLogs = checkIns.filter((c) => c.habitId === habit.id);
  if (habitLogs.length === 0) return 0;

  const today = getTodayDateString();
  const uniqueDates = Array.from(new Set(habitLogs.map((l) => l.date)));

  let streak = 0;
  const checkDate = parseDate(today);

  // If not completed today, check from yesterday
  if (!uniqueDates.includes(today)) {
    checkDate.setDate(checkDate.getDate() - 1);
  }

  for (let i = 0; i < 365; i++) {
    const y = checkDate.getFullYear();
    const m = String(checkDate.getMonth() + 1).padStart(2, '0');
    const d = String(checkDate.getDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${d}`;

    if (uniqueDates.includes(dateStr)) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}

