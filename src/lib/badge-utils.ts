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
    targetCount: 240,
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
  // Pre-classify habits for this player in a single pass over habits
  const readingHabitSet = new Set<string>();
  const cleanHabitSet = new Set<string>();
  const gymHabitSet = new Set<string>();
  const langHabitSet = new Set<string>();
  const projectHabitSet = new Set<string>();

  for (let i = 0; i < habits.length; i++) {
    const h = habits[i];
    if (h.playerId !== playerId) continue;
    if (h.isQuantitative || h.iconName === 'BookOpen') readingHabitSet.add(h.id);
    if (h.category === 'environment') cleanHabitSet.add(h.id);
    if (h.category === 'physical') gymHabitSet.add(h.id);
    if (h.category === 'language') langHabitSet.add(h.id);
    if (h.category === 'deep_work') projectHabitSet.add(h.id);
  }

  const partnerId: PlayerId = playerId === 'maciek' ? 'myrna' : 'maciek';
  const dailyPointsMap: Record<string, number> = Object.create(null);
  const internalPartnerDailyPoints: Record<string, number> = Object.create(null);
  const dateToWeekMap = new Map<string, string>();
  const weeklyGymCounts: Record<string, number> = Object.create(null);

  let playerLogsCount = 0;
  let totalPages = 0;
  let cleanWithPhotoCount = 0;
  let languageCount = 0;
  let projectCount = 0;

  // Single pass over checkIns
  for (let i = 0; i < checkIns.length; i++) {
    const l = checkIns[i];
    if (l.playerId === playerId) {
      playerLogsCount++;
      dailyPointsMap[l.date] = (dailyPointsMap[l.date] || 0) + l.pointsEarned;

      if (readingHabitSet.has(l.habitId)) {
        totalPages += (l.quantity || l.pointsEarned);
      }
      if (cleanHabitSet.has(l.habitId) && ((l.proofUrls && l.proofUrls.length > 0) || l.proofUrl)) {
        cleanWithPhotoCount++;
      }
      if (gymHabitSet.has(l.habitId)) {
        let weekKey = dateToWeekMap.get(l.date);
        if (weekKey === undefined) {
          const d = parseDate(l.date);
          const { year, week } = getISOWeek(d);
          weekKey = `${year}-W${week}`;
          dateToWeekMap.set(l.date, weekKey);
        }
        weeklyGymCounts[weekKey] = (weeklyGymCounts[weekKey] || 0) + 1;
      }
      if (langHabitSet.has(l.habitId)) {
        languageCount++;
      }
      if (projectHabitSet.has(l.habitId)) {
        projectCount++;
      }
    } else if (l.playerId === partnerId) {
      internalPartnerDailyPoints[l.date] = (internalPartnerDailyPoints[l.date] || 0) + l.pointsEarned;
    }
  }

  // Calculate max day points
  let maxDayPoints = 0;
  for (const date in dailyPointsMap) {
    const pts = dailyPointsMap[date];
    if (pts > maxDayPoints) maxDayPoints = pts;
  }

  // Calculate max gym workouts in a single calendar week
  let maxGymInSingleWeek = 0;
  for (const weekKey in weeklyGymCounts) {
    const count = weeklyGymCounts[weekKey];
    if (count > maxGymInSingleWeek) maxGymInSingleWeek = count;
  }

  // Check if both hit 240+ on the same day
  let bothHit240OnSameDay = false;
  for (const date in dailyPointsMap) {
    if (dailyPointsMap[date] >= 240 && (internalPartnerDailyPoints[date] ?? 0) >= 240) {
      bothHit240OnSameDay = true;
      break;
    }
  }

  let stakesWonCount = 0;
  for (let i = 0; i < stakes.length; i++) {
    if (stakes[i].winnerId === playerId) {
      stakesWonCount++;
    }
  }

  return BADGE_DEFINITIONS.map((def) => {
    let currentVal = 0;
    let unlocked = false;

    switch (def.id) {
      case 'first_checkin':
        currentVal = playerLogsCount;
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
