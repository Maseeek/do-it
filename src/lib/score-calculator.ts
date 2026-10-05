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
  getWeekKey,
  getTodayDateString,
  isDateInCurrentMonth,
  isDateInCurrentWeek,
  isDateInCurrentYear,
  parseDate,
  addDays,
} from './date-utils';

export function calculatePlayerScores(
  playerId: PlayerId,
  checkIns: CheckIn[],
  habits: Habit[],
  restDays: RestDay[] = []
): PlayerScoreSummary {
  const today = getTodayDateString();
  const playerLogs = checkIns.filter((c) => c.playerId === playerId);
  const playerRestDays = new Set<string>();
  let restDaysUsed = 0;
  for (const restDay of restDays) {
    if (restDay.playerId === playerId) {
      playerRestDays.add(restDay.date);
      restDaysUsed++;
    }
  }

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
  const uniqueDates = new Set<string>();
  for (const log of playerLogs) uniqueDates.add(log.date);
  let currentStreak = 0;
  const checkDate = parseDate(today);

  // If today isn't completed and not a rest day, start checking from yesterday
  const todayCovered = uniqueDates.has(today) || playerRestDays.has(today);
  if (!todayCovered) {
    checkDate.setDate(checkDate.getDate() - 1);
  }

  for (let i = 0; i < 365; i++) {
    const y = checkDate.getFullYear();
    const m = String(checkDate.getMonth() + 1).padStart(2, '0');
    const d = String(checkDate.getDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${d}`;

    const isCheckInDay = uniqueDates.has(dateStr);
    const isRest = playerRestDays.has(dateStr);

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
  const playerHabits = habits.filter((h) => h.playerId === playerId && h.isActive);
  const now = new Date();
  const dayOfWeek = (now.getDay() + 6) % 7 + 1; // 1 = Mon, 7 = Sun

  let maxPossibleSoFar = 0;
  let validWeeklyLogs = 0;

  playerHabits.forEach((habit) => {
    const habitWeekLogs = playerLogs.filter(
      (l) => l.habitId === habit.id && isDateInCurrentWeek(l.date)
    );
    if (habit.weeklyTargetDays && habit.weeklyTargetDays > 0) {
      const targetSoFar = Math.min(dayOfWeek, habit.weeklyTargetDays);
      maxPossibleSoFar += targetSoFar;
      validWeeklyLogs += Math.min(habitWeekLogs.length, habit.weeklyTargetDays);
    } else {
      maxPossibleSoFar += dayOfWeek;
      validWeeklyLogs += Math.min(habitWeekLogs.length, dayOfWeek);
    }
  });

  maxPossibleSoFar = Math.max(1, maxPossibleSoFar);
  const completionRateWeekly = Math.min(100, Math.round((validWeeklyLogs / maxPossibleSoFar) * 100));

  return {
    today: todayPoints,
    weekly: weeklyPoints,
    monthly: monthlyPoints,
    yearly: yearlyPoints,
    karma: karmaPoints,
    currentStreak,
    completionRateWeekly,
    restDaysUsed,
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
    'finance',
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
    finance: 'Finance',
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

// Calculate consecutive week streak for a weekly-target habit
export function calculateWeeklyHabitStreak(
  habit: Habit,
  checkIns: CheckIn[]
): number {
  if (!habit.weeklyTargetDays || habit.weeklyTargetDays <= 0) return 0;

  const target = habit.weeklyTargetDays;
  const today = getTodayDateString();
  const todayDays = getCurrentWeekDays(today);
  const currentWeekMondayStr = todayDays[0].dateStr;

  const weekCompletions = new Map<string, Set<string>>();
  for (const checkIn of checkIns) {
    if (checkIn.habitId !== habit.id) continue;
    const weekKey = getWeekKey(checkIn.date);
    let completedDates = weekCompletions.get(weekKey);
    if (!completedDates) {
      completedDates = new Set<string>();
      weekCompletions.set(weekKey, completedDates);
    }
    completedDates.add(checkIn.date);
  }

  let streak = 0;
  const currentWeekCompletions = weekCompletions.get(getWeekKey(currentWeekMondayStr))?.size ?? 0;
  if (currentWeekCompletions >= target) {
    streak++;
  }

  for (let i = 1; i <= 52; i++) {
    const prevMondayStr = addDays(currentWeekMondayStr, -7 * i);
    const prevCompletions = weekCompletions.get(getWeekKey(prevMondayStr))?.size ?? 0;
    if (prevCompletions >= target) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}

// Calculate streak for an individual habit (daily or weekly)
export function calculateHabitStreak(
  habit: Habit,
  checkIns: CheckIn[],
  restDays: RestDay[] = []
): number {
  if (habit.weeklyTargetDays && habit.weeklyTargetDays > 0) {
    return calculateWeeklyHabitStreak(habit, checkIns);
  }

  const uniqueDates = new Set<string>();
  for (const checkIn of checkIns) {
    if (checkIn.habitId === habit.id) uniqueDates.add(checkIn.date);
  }
  if (uniqueDates.size === 0) return 0;

  const today = getTodayDateString();
  const playerRestDays = new Set<string>();
  for (const restDay of restDays) {
    if (restDay.playerId === habit.playerId) playerRestDays.add(restDay.date);
  }

  let streak = 0;
  const checkDate = parseDate(today);

  // If not completed today and not a rest day, check from yesterday
  const todayCovered = uniqueDates.has(today) || playerRestDays.has(today);
  if (!todayCovered) {
    checkDate.setDate(checkDate.getDate() - 1);
  }

  for (let i = 0; i < 365; i++) {
    const y = checkDate.getFullYear();
    const m = String(checkDate.getMonth() + 1).padStart(2, '0');
    const d = String(checkDate.getDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${d}`;

    if (uniqueDates.has(dateStr)) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else if (playerRestDays.has(dateStr)) {
      // Rest day preserves the habit streak without penalizing
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}


