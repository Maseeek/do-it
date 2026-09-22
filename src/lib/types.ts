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
  | 'environment';

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
  proofUrl?: string; // base64 or url
  completedAt: string; // ISO string
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
}

export interface AppState {
  activePlayerId: PlayerId | null;
  players: Record<PlayerId, Player>;
  habits: Habit[];
  checkIns: CheckIn[];
  stakes: Stake[];
  supabaseConfig?: {
    url: string;
    anonKey: string;
    enabled: boolean;
  };
}
