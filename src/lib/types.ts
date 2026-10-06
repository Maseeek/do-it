export type PlayerId = 'maciek' | 'myrna';

export type ThemePreference = 'system' | 'light' | 'dark';
export type EffectiveTheme = 'light' | 'dark';
export type PlayerColorId = 'blue' | 'purple' | 'teal' | 'orange' | 'pink' | 'green' | 'rainbow';
export const PLAYER_COLORS = [
  { id: 'blue', name: 'Blue', color: '#60a5fa', accentBg: 'rgba(96, 165, 250, 0.1)', accentBorder: 'rgba(96, 165, 250, 0.25)', unlockAt: 0 },
  { id: 'purple', name: 'Purple', color: '#c084fc', accentBg: 'rgba(192, 132, 252, 0.1)', accentBorder: 'rgba(192, 132, 252, 0.25)', unlockAt: 0 },
  { id: 'teal', name: 'Teal', color: '#2dd4bf', accentBg: 'rgba(45, 212, 191, 0.1)', accentBorder: 'rgba(45, 212, 191, 0.25)', unlockAt: 250 },
  { id: 'orange', name: 'Orange', color: '#fb923c', accentBg: 'rgba(251, 146, 60, 0.1)', accentBorder: 'rgba(251, 146, 60, 0.25)', unlockAt: 500 },
  { id: 'pink', name: 'Pink', color: '#f472b6', accentBg: 'rgba(244, 114, 182, 0.1)', accentBorder: 'rgba(244, 114, 182, 0.25)', unlockAt: 1000 },
  { id: 'green', name: 'Green', color: '#4ade80', accentBg: 'rgba(74, 222, 128, 0.1)', accentBorder: 'rgba(74, 222, 128, 0.25)', unlockAt: 2500 },
  { id: 'rainbow', name: 'Rainbow', color: '#f0abfc', accentBg: 'rgba(232, 121, 249, 0.1)', accentBorder: 'rgba(232, 121, 249, 0.3)', unlockAt: 10000 },
] as const;


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
export type HealthMetric = 'sleep' | 'workout' | 'cardio' | 'steps';

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
  isArchived?: boolean;
  automation?: { metric: HealthMetric; target: number };
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
  source?: 'google_health';
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
  themePreference?: ThemePreference;
  supabaseConfig?: {
    url: string;
    anonKey: string;
    enabled: boolean;
  };
  wearableConfig?: WearableConfig;
}

