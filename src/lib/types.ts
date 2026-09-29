export type PlayerId = 'maciek' | 'myrna';

export interface Player {
  id: PlayerId;
  name: string;
  avatar: string;
  color: string;
  accentBg: string;
  accentBorder: string;
}

export type HabitCategory =
  | 'foundation'
  | 'physical'
  | 'cardio'
  | 'mind'
  | 'intellect'
  | 'skills'
  | 'deep_work'
  | 'language'
  | 'nutrition'
  | 'environment'
  | 'finance';

export type HabitFrequency = 'daily' | 'weekly';

export interface Habit {
  id: string;
  playerId: PlayerId;
  title: string;
  description: string;
  category: HabitCategory;
  points: number;
  iconName: string;
  frequency?: HabitFrequency;
  weeklyTargetDays?: number; // e.g. 4 for Gym (4x/week)
  isQuantitative?: boolean; // e.g. for Reading (pages)
  quantityUnit?: string; // "pages"
  maxQuantity?: number; // 25
  pointsPerUnit?: number; // 1
  requiresProof?: boolean;
  order: number;
  isActive: boolean;
}

export interface CheckIn {
  id: string;
  habitId: string;
  playerId: PlayerId;
  date: string; // YYYY-MM-DD
  pointsEarned: number;
  quantity?: number; // e.g. 25 pages
  proofUrl?: string; // base64 or url (primary)
  proofUrls?: string[]; // multiple base64 or urls
  completedAt: string; // ISO string
  note?: string; // optional micro-note or reflection
  isRetroactive?: boolean; // true if logged for past date
  loggedAt?: string; // timestamp when the check-in was registered
}

export interface CouplesReaction {
  id: string;
  fromPlayerId: PlayerId;
  toPlayerId: PlayerId;
  emoji: string;
  message: string;
  timestamp: string;
}

export interface RestDay {
  id: string;
  playerId: PlayerId;
  date: string; // YYYY-MM-DD
  reason?: string;
  createdAt: string;
}

export interface BadgeDefinition {
  id: string;
  title: string;
  description: string;
  icon: string;
  targetCount: number;
  category: 'streak' | 'parity' | 'reading' | 'proof' | 'competition' | 'mastery';
}

export interface PlayerBadgeStatus {
  badge: BadgeDefinition;
  isUnlocked: boolean;
  progress: number; // 0 to 100
  currentValue: number;
  unlockedAt?: string;
}

export type StakePeriod = 'weekly' | 'monthly' | 'yearly';
export type StakeStatus = 'active' | 'completed' | 'rolled_over';

export interface Stake {
  id: string;
  period: StakePeriod;
  periodKey: string; // e.g. "2026-W39" or "2026-09"
  title: string;
  description: string;
  status: StakeStatus;
  winnerId?: PlayerId | 'tie';
  dueDate: string; // YYYY-MM-DD
  acknowledged?: boolean;
}

export type LeaderboardTier = 'weekly' | 'monthly' | 'yearly' | 'karma';

export interface PlayerScoreSummary {
  today: number;
  weekly: number;
  monthly: number;
  yearly: number;
  karma: number; // all-time lifetime total
  currentStreak: number;
  completionRateWeekly: number; // percentage
  restDaysUsed?: number;
}

export interface SleepSessionInfo {
  start: string;
  end: string;
  durationMinutes: number;
  durationHours: number;
}

export interface GoogleHealthSyncResult {
  success: boolean;
  date: string;
  provider?: string;
  simulated?: boolean;
  sleepHours?: number;
  sleepQualified?: boolean;
  sleepReason?: string;
  sleepSessions?: SleepSessionInfo[];
  activities?: Array<{
    name: string;
    activityType: number | string;
    durationMinutes: number;
  }>;
  gymDetected?: boolean;
  gymReason?: string;
  sportDetected?: boolean;
  sportReason?: string;
  checkInsCreated?: CheckIn[];
  message: string;
  error?: string;
}

export interface WearableConfig {
  googleConnected?: boolean;
  googleLastSync?: string;
  googleLastResult?: GoogleHealthSyncResult;
  appleConnected?: boolean;
  appleLastSync?: string;
  appleLastResult?: {
    metric?: string;
    value?: number;
    hours?: number;
    date?: string;
    points?: number;
    qualified?: boolean;
    message?: string;
  };
  stravaConnected?: boolean;
  stravaAthleteName?: string;
  stravaLastSync?: string;
}

export interface AppleHealthSyncPayload {
  player?: 'myrna' | 'maciek';
  metric?: string;
  value?: number; // sleep in hours, running in km or mins, gym in mins
  hours?: number;
  duration?: number;
  minutes?: number;
  seconds?: number;
  qty?: number;
  unit?: string;
  date?: string; // YYYY-MM-DD
  note?: string;
}

export interface AppState {
  activePlayerId: PlayerId | null;
  players: Record<PlayerId, Player>;
  habits: Habit[];
  checkIns: CheckIn[];
  stakes: Stake[];
  reactions?: CouplesReaction[];
  restDays?: RestDay[];
  soundEnabled?: boolean;
  hapticsEnabled?: boolean;
  supabaseConfig?: {
    url: string;
    anonKey: string;
    enabled: boolean;
  };
  wearableConfig?: WearableConfig;
}

