import { BadgeDefinition, CheckIn, Habit, PlayerBadgeStatus, PlayerId, Stake } from './types';
import { getISOWeek, parseDate } from './date-utils';

export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  {
    id: 'first_checkin',
    title: 'First Flame',
    description: 'Complete your first habit check-in',
    icon: 'Zap',
    targetCount: 1,
    category: 'streak',
  },
  {
    id: 'perfect_par',
    title: 'Daily Par Master',
    description: 'Score 240+ points in a single day',
    icon: 'Trophy',
    targetCount: 1,
    category: 'parity',
  },
  {
    id: 'streak_3',
    title: 'Three-Day Spark',
    description: 'Maintain a 3-day active habit streak',
    icon: 'Flame',
    targetCount: 3,
    category: 'streak',
  },
  {
    id: 'streak_7',
    title: 'Weekly Inferno',
    description: 'Maintain a 7-day uninterrupted streak',
    icon: 'Flame',
    targetCount: 7,
    category: 'streak',
  },
  {
    id: 'streak_14',
    title: 'Fortnight Titan',
    description: 'Reach a legendary 14-day streak',
    icon: 'Sparkles',
    targetCount: 14,
    category: 'streak',
  },
  {
    id: 'reading_100',
    title: 'Centurion Reader',
    description: 'Read 100 cumulative book pages',
    icon: 'BookOpen',
    targetCount: 100,
    category: 'reading',
  },
  {
    id: 'clean_space_sentinel',
    title: 'Clean Space Sentinel',
    description: 'Submit 5 Clean Space check-ins with photo proof',
    icon: 'Camera',
    targetCount: 5,
    category: 'proof',
  },
  {
    id: 'gym_par',
    title: 'Iron Discipline',
    description: 'Hit 4 gym workouts in a single calendar week',
    icon: 'Dumbbell',
    targetCount: 4,
    category: 'mastery',
  },
  {
    id: 'polyglot',
    title: 'Polyglot Duelist',
    description: 'Log 7 language learning sessions (Swedish / Polish)',
    icon: 'Globe',
    targetCount: 7,
    category: 'mastery',
  },
  {
    id: 'deep_worker',
    title: 'Deep Work Architect',
    description: 'Complete 7 Personal Project deep work sessions',
    icon: 'Code',
    targetCount: 7,
    category: 'mastery',
  },
  {
    id: 'iron_couple',
    title: 'Iron Couple Synergy',
    description: 'Both Maciek & Myrna score 240 Par on the exact same day',
    icon: 'HeartHandshake',
    targetCount: 1,
    category: 'competition',
  },
  {
    id: 'stake_champion',
    title: 'Stake Champion',
    description: 'Win a weekly or monthly duel wager',
    icon: 'Award',
    targetCount: 1,
    category: 'competition',
  },
];

export function calculatePlayerBadges(
  playerId: PlayerId,
  checkIns: CheckIn[],
  habits: Habit[],
  stakes: Stake[],
  currentStreak: number
): PlayerBadgeStatus[] {
  const playerLogs = checkIns.filter((c) => c.playerId === playerId);

  // Daily point sums
  const dailyPointsMap: Record<string, number> = {};
  playerLogs.forEach((l) => {
    dailyPointsMap[l.date] = (dailyPointsMap[l.date] || 0) + l.pointsEarned;
  });

  // Check if scored 240+ in any single day
  const maxDayPoints = Object.values(dailyPointsMap).reduce((max, pts) => Math.max(max, pts), 0);

  // Cumulative pages read
  const readingHabitIds = habits
    .filter((h) => h.playerId === playerId && (h.isQuantitative || h.iconName === 'BookOpen'))
    .map((h) => h.id);
  const totalPages = playerLogs
    .filter((l) => readingHabitIds.includes(l.habitId))
    .reduce((sum, l) => sum + (l.quantity || l.pointsEarned), 0);

  // Clean space with photos
  const cleanHabitIds = habits
    .filter((h) => h.playerId === playerId && h.category === 'environment')
    .map((h) => h.id);
  const cleanWithPhotoCount = playerLogs.filter(
    (l) => cleanHabitIds.includes(l.habitId) && ((l.proofUrls && l.proofUrls.length > 0) || l.proofUrl)
  ).length;

  // Gym workouts in single week
  const gymHabitIds = habits
    .filter((h) => h.playerId === playerId && h.category === 'physical')
    .map((h) => h.id);
  const weeklyGymCounts: Record<string, number> = {};
  playerLogs
    .filter((l) => gymHabitIds.includes(l.habitId))
    .forEach((l) => {
      const d = parseDate(l.date);
      const { year, week } = getISOWeek(d);
      const key = `${year}-W${week}`;
      weeklyGymCounts[key] = (weeklyGymCounts[key] || 0) + 1;
    });
  const maxGymInSingleWeek = Object.values(weeklyGymCounts).reduce((max, c) => Math.max(max, c), 0);

  // Language count
  const langHabitIds = habits
    .filter((h) => h.playerId === playerId && h.category === 'language')
    .map((h) => h.id);
  const languageCount = playerLogs.filter((l) => langHabitIds.includes(l.habitId)).length;

  // Deep work project count
  const projectHabitIds = habits
    .filter((h) => h.playerId === playerId && h.category === 'deep_work')
    .map((h) => h.id);
  const projectCount = playerLogs.filter((l) => projectHabitIds.includes(l.habitId)).length;

  // Iron Couple Synergy check: did both hit 240+ on any same date?
  const partnerId: PlayerId = playerId === 'maciek' ? 'myrna' : 'maciek';
  const partnerLogs = checkIns.filter((c) => c.playerId === partnerId);
  const partnerDailyPoints: Record<string, number> = {};
  partnerLogs.forEach((l) => {
    partnerDailyPoints[l.date] = (partnerDailyPoints[l.date] || 0) + l.pointsEarned;
  });

  let bothHit240OnSameDay = false;
  for (const [date, pts] of Object.entries(dailyPointsMap)) {
    if (pts >= 240 && (partnerDailyPoints[date] || 0) >= 240) {
      bothHit240OnSameDay = true;
      break;
    }
  }

  // Stakes won
  const stakesWonCount = stakes.filter((s) => s.winnerId === playerId).length;

  return BADGE_DEFINITIONS.map((def) => {
    let currentVal = 0;
    let unlocked = false;

    switch (def.id) {
      case 'first_checkin':
        currentVal = playerLogs.length;
        unlocked = currentVal >= 1;
        break;
      case 'perfect_par':
        currentVal = maxDayPoints;
        unlocked = maxDayPoints >= 240;
        break;
      case 'streak_3':
        currentVal = currentStreak;
        unlocked = currentStreak >= 3;
        break;
      case 'streak_7':
        currentVal = currentStreak;
        unlocked = currentStreak >= 7;
        break;
      case 'streak_14':
        currentVal = currentStreak;
        unlocked = currentStreak >= 14;
        break;
      case 'reading_100':
        currentVal = totalPages;
        unlocked = totalPages >= 100;
        break;
      case 'clean_space_sentinel':
        currentVal = cleanWithPhotoCount;
        unlocked = cleanWithPhotoCount >= 5;
        break;
      case 'gym_par':
        currentVal = maxGymInSingleWeek;
        unlocked = maxGymInSingleWeek >= 4;
        break;
      case 'polyglot':
        currentVal = languageCount;
        unlocked = languageCount >= 7;
        break;
      case 'deep_worker':
        currentVal = projectCount;
        unlocked = projectCount >= 7;
        break;
      case 'iron_couple':
        currentVal = bothHit240OnSameDay ? 1 : 0;
        unlocked = bothHit240OnSameDay;
        break;
      case 'stake_champion':
        currentVal = stakesWonCount;
        unlocked = stakesWonCount >= 1;
        break;
    }

    const progress = Math.min(100, Math.round((currentVal / def.targetCount) * 100));

    return {
      badge: def,
      isUnlocked: unlocked,
      progress,
      currentValue: currentVal,
    };
  });
}
