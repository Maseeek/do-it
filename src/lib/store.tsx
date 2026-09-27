'use client';

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  AppState,
  CheckIn,
  CouplesReaction,
  Habit,
  LeaderboardTier,
  Player,
  PlayerBadgeStatus,
  PlayerId,
  PlayerScoreSummary,
  RestDay,
  Stake,
  WearableConfig,
  GoogleHealthSyncResult,
} from './types';
import { getInitialState } from './seed';
import { getTodayDateString, getWeekKey, isFutureDate } from './date-utils';
import { calculatePlayerScores, getVersusComparison } from './score-calculator';
import { calculatePlayerBadges } from './badge-utils';
import {
  rebalanceWeeklyHabitCheckIns,
  rebalanceAllWeeklyCheckIns,
  getWeeklyHabitCompletionsCount,
  isWeeklyHabitTargetMet,
} from './weekly-utils';
import { fireCelebrationConfetti } from './confetti';
import { soundEngine } from './sound-utils';
import { hapticCelebration, hapticLight, hapticMedium, hapticSuccess } from './haptic-utils';
import { getSupabaseClient } from './supabase';
import {
  deleteCheckInSupabase,
  deleteHabitSupabase,
  insertCheckInSupabase,
  rowToCheckIn,
  rowToHabit,
  rowToStake,
  syncInitialDataFromSupabase,
  upsertHabitSupabase,
  upsertStakeSupabase,
  deleteStakeSupabase,
} from './supabase-sync';

const STORAGE_KEY = 'do_it_app_data_v2';

export type SyncStatus = 'connected' | 'syncing' | 'offline' | 'local_only';

interface StoreContextType {
  isHydrated: boolean;
  syncStatus: SyncStatus;
  activePlayerId: PlayerId | null;
  activePlayer: Player | null;
  players: Record<PlayerId, Player>;
  habits: Habit[];
  activeHabits: Habit[];
  checkIns: CheckIn[];
  stakes: Stake[];
  reactions: CouplesReaction[];
  restDays: RestDay[];
  selectedDate: string;
  isTodaySelected: boolean;
  setSelectedDate: (date: string) => void;
  maciekSummary: PlayerScoreSummary;
  myrnaSummary: PlayerScoreSummary;
  activePlayerSummary: PlayerScoreSummary;
  maciekBadges: PlayerBadgeStatus[];
  myrnaBadges: PlayerBadgeStatus[];
  activePlayerBadges: PlayerBadgeStatus[];
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  selectProfile: (id: PlayerId) => void;
  switchProfile: () => void;
  toggleHabit: (
    habitId: string,
    proofUrl?: string | string[],
    quantity?: number,
    note?: string,
    targetDate?: string
  ) => void;
  updateCheckInNote: (checkInId: string, note: string) => void;
  isHabitCompletedToday: (habitId: string) => boolean;
  getHabitCheckInToday: (habitId: string) => CheckIn | undefined;
  isHabitCompletedOnDate: (habitId: string, date: string) => boolean;
  getHabitCheckInOnDate: (habitId: string, date: string) => CheckIn | undefined;
  getCheckInForHabit: (habitId: string, date?: string) => CheckIn | undefined;
  getWeeklyHabitCompletions: (habitId: string, date?: string) => number;
  isHabitWeeklyTargetMet: (habitId: string, date?: string) => boolean;
  isHabitSatisfiedOnDate: (habitId: string, date?: string) => boolean;
  partnerId: PlayerId | null;
  partnerCleanSpaceHabit: Habit | undefined;
  partnerCleanSpaceCheckIn: CheckIn | undefined;
  addReaction: (reaction: { toPlayerId: PlayerId; emoji: string; message: string }) => void;
  toggleRestDay: (date: string, reason?: string) => void;
  isRestDay: (date: string, playerId?: PlayerId) => boolean;
  addHabit: (newHabit: Omit<Habit, 'id'>) => void;
  updateHabit: (updatedHabit: Habit) => void;
  deleteHabit: (habitId: string) => void;
  updateStake: (updatedStake: Stake) => void;
  addStake: (newStake: Omit<Stake, 'id'>) => void;
  deleteStake: (stakeId: string) => void;
  activeWeeklyStake: Stake | undefined;
  activeMonthlyStake: Stake | undefined;
  getComparison: (tier: LeaderboardTier) => ReturnType<typeof getVersusComparison>;
  resetToDefaults: () => void;
  updateSupabaseConfig: (config: { url: string; anonKey: string; enabled: boolean }) => void;
  exportStateToJson: () => string;
  importStateFromJson: (jsonStr: string) => { success: boolean; error?: string };
  wearableConfig: WearableConfig | undefined;
  syncGoogleHealth: (
    simulate?: boolean,
    simulateUnder?: boolean
  ) => Promise<{ success: boolean; message: string; count?: number; result?: GoogleHealthSyncResult }>;
  testAppleHealthSync: (
    metric: 'sleep' | 'running' | 'gym',
    value: number
  ) => Promise<{ success: boolean; message: string; qualified?: boolean }>;
  testStravaSync: (player?: string) => Promise<{ success: boolean; message: string }>;
  testHevySync: (workoutTitle?: string, player?: string) => Promise<{ success: boolean; message: string }>;
  disconnectGoogleHealth: () => void;
}

const StoreContext = createContext<StoreContextType | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(getInitialState);
  const [isHydrated, setIsHydrated] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('local_only');
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString());
  const [soundEnabled, setSoundEnabledState] = useState<boolean>(true);

  const supabaseRef = useRef(getSupabaseClient());

  // 1. Hydrate from localStorage on client mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.players && parsed.players.maciek && parsed.players.myrna) {
          const habitsToUse = parsed.habits || [];
          const checkInsToUse = parsed.checkIns || [];
          const rebalanced = rebalanceAllWeeklyCheckIns(checkInsToUse, habitsToUse);
          setState((prev) => ({
            ...prev,
            ...parsed,
            checkIns: rebalanced,
            reactions: parsed.reactions || prev.reactions || [],
            restDays: parsed.restDays || prev.restDays || [],
          }));
        } else {
          const fresh = getInitialState();
          const rebalanced = rebalanceAllWeeklyCheckIns(fresh.checkIns, fresh.habits);
          setState({ ...fresh, checkIns: rebalanced });
          localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...fresh, checkIns: rebalanced }));
        }
      }
      const savedSound = localStorage.getItem('do_it_sound_enabled');
      if (savedSound !== null) {
        const isSnd = savedSound === 'true';
        setSoundEnabledState(isSnd);
        soundEngine.setEnabled(isSnd);
      }

      if (typeof document !== 'undefined') {
        const hasGoogleCookie = document.cookie.includes('g_fit_connected=true');
        if (hasGoogleCookie) {
          setState((prev) => ({
            ...prev,
            wearableConfig: {
              ...prev.wearableConfig,
              googleConnected: true,
            },
          }));
        }
      }
    } catch (e) {
      console.error('Error hydrating state from localStorage', e);
    } finally {
      setIsHydrated(true);
    }
  }, []);

  // 2. Persist state changes to localStorage
  useEffect(() => {
    if (isHydrated) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch (e) {
        console.error('Error saving state to localStorage', e);
      }
    }
  }, [state, isHydrated]);

  // 3. Supabase Cloud Sync & Realtime Subscription
  useEffect(() => {
    if (!isHydrated) return;

    const customUrl = state.supabaseConfig?.enabled ? state.supabaseConfig.url : undefined;
    const customKey = state.supabaseConfig?.enabled ? state.supabaseConfig.anonKey : undefined;
    const client = getSupabaseClient(customUrl, customKey);
    supabaseRef.current = client;

    if (!client) {
      setSyncStatus('local_only');
      return;
    }

    setSyncStatus('syncing');

    // Fetch cloud data and seed if needed
    syncInitialDataFromSupabase(client).then((remoteData) => {
      if (remoteData) {
        setState((prev) => {
          const habitsToUse = remoteData.habits && remoteData.habits.length > 0 ? remoteData.habits : prev.habits;
          const checkInsToUse = remoteData.checkIns || prev.checkIns;
          const rebalanced = rebalanceAllWeeklyCheckIns(checkInsToUse, habitsToUse);
          return {
            ...prev,
            habits: habitsToUse,
            checkIns: rebalanced,
            stakes: remoteData.stakes && remoteData.stakes.length > 0 ? remoteData.stakes : prev.stakes,
          };
        });
        setSyncStatus('connected');
      } else {
        setSyncStatus('offline');
      }
    });

    // Realtime channel subscriptions
    const channel = client
      .channel('do_it_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'check_ins' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newCheckIn = rowToCheckIn(payload.new);
            setState((prev) => {
              if (prev.checkIns.some((c) => c.id === newCheckIn.id)) return prev;
              return { ...prev, checkIns: [...prev.checkIns, newCheckIn] };
            });
          } else if (payload.eventType === 'DELETE') {
            const deletedId = payload.old.id;
            setState((prev) => ({
              ...prev,
              checkIns: prev.checkIns.filter((c) => c.id !== deletedId),
            }));
          } else if (payload.eventType === 'UPDATE') {
            const updated = rowToCheckIn(payload.new);
            setState((prev) => ({
              ...prev,
              checkIns: prev.checkIns.map((c) => (c.id === updated.id ? updated : c)),
            }));
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'habits' },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const habit = rowToHabit(payload.new);
            setState((prev) => ({
              ...prev,
              habits: prev.habits.some((h) => h.id === habit.id)
                ? prev.habits.map((h) => (h.id === habit.id ? habit : h))
                : [...prev.habits, habit],
            }));
          } else if (payload.eventType === 'DELETE') {
            const deletedId = payload.old.id;
            setState((prev) => ({
              ...prev,
              habits: prev.habits.filter((h) => h.id !== deletedId),
            }));
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'stakes' },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const stake = rowToStake(payload.new);
            setState((prev) => ({
              ...prev,
              stakes: prev.stakes.some((s) => s.id === stake.id)
                ? prev.stakes.map((s) => (s.id === stake.id ? stake : s))
                : [...prev.stakes, stake],
            }));
          } else if (payload.eventType === 'DELETE') {
            const deletedId = payload.old.id;
            setState((prev) => ({
              ...prev,
              stakes: prev.stakes.filter((s) => s.id !== deletedId),
            }));
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setSyncStatus('connected');
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setSyncStatus('offline');
        }
      });

    return () => {
      client.removeChannel(channel);
    };
  }, [isHydrated, state.supabaseConfig]);

  const selectProfile = (id: PlayerId) => {
    soundEngine.playClick();
    hapticLight();
    setState((prev) => ({ ...prev, activePlayerId: id }));
  };

  const switchProfile = () => {
    soundEngine.playClick();
    hapticLight();
    setState((prev) => ({ ...prev, activePlayerId: null }));
  };

  const setSoundEnabled = (enabled: boolean) => {
    setSoundEnabledState(enabled);
    soundEngine.setEnabled(enabled);
    if (enabled) {
      soundEngine.playClick();
    }
  };

  const activePlayer = state.activePlayerId ? state.players[state.activePlayerId] : null;

  const activeHabits = state.activePlayerId
    ? state.habits.filter((h) => h.playerId === state.activePlayerId && h.isActive)
    : [];

  const todayStr = getTodayDateString();
  const isTodaySelected = selectedDate === todayStr;

  const isHabitCompletedToday = (habitId: string): boolean => {
    return state.checkIns.some((c) => c.habitId === habitId && c.date === todayStr);
  };

  const getHabitCheckInToday = (habitId: string): CheckIn | undefined => {
    return state.checkIns.find((c) => c.habitId === habitId && c.date === todayStr);
  };

  const isHabitCompletedOnDate = (habitId: string, date: string): boolean => {
    return state.checkIns.some((c) => c.habitId === habitId && c.date === date);
  };

  const getHabitCheckInOnDate = (habitId: string, date: string): CheckIn | undefined => {
    return state.checkIns.find((c) => c.habitId === habitId && c.date === date);
  };

  const getCheckInForHabit = (habitId: string, date = selectedDate): CheckIn | undefined => {
    return state.checkIns.find((c) => c.habitId === habitId && c.date === date);
  };

  const getWeeklyHabitCompletions = (habitId: string, date = selectedDate): number => {
    return getWeeklyHabitCompletionsCount(habitId, date, state.checkIns);
  };

  const isHabitWeeklyTargetMet = (habitId: string, date = selectedDate): boolean => {
    const habit = state.habits.find((h) => h.id === habitId);
    if (!habit) return false;
    return isWeeklyHabitTargetMet(habit, date, state.checkIns);
  };

  const isHabitSatisfiedOnDate = (habitId: string, date = selectedDate): boolean => {
    if (isHabitCompletedOnDate(habitId, date)) return true;
    return isHabitWeeklyTargetMet(habitId, date);
  };

  const partnerId: PlayerId | null =
    state.activePlayerId === 'maciek' ? 'myrna' : state.activePlayerId === 'myrna' ? 'maciek' : null;

  const partnerCleanSpaceHabit = state.habits.find(
    (h) => h.playerId === partnerId && h.category === 'environment' && h.requiresProof
  );

  const partnerCleanSpaceCheckIn = partnerCleanSpaceHabit
    ? state.checkIns.find((c) => c.habitId === partnerCleanSpaceHabit.id && c.date === selectedDate)
    : undefined;

  const toggleHabit = (
    habitId: string,
    proofUrl?: string | string[],
    quantity?: number,
    note?: string,
    targetDate = selectedDate
  ) => {
    if (!state.activePlayerId) return;
    if (isFutureDate(targetDate)) return; // Disallow future date check-ins

    const habit = state.habits.find((h) => h.id === habitId);
    if (!habit) return;

    const targetWeekKey = getWeekKey(targetDate);
    const existingCheckIn = state.checkIns.find(
      (c) => c.habitId === habitId && c.date === targetDate
    );

    // Calculate base points
    let basePoints = habit.points;
    if (habit.isQuantitative && quantity !== undefined) {
      basePoints = Math.min(
        habit.points,
        Math.max(1, Math.round(quantity * (habit.pointsPerUnit || 1)))
      );
    }

    // Process proofUrl / proofUrls array
    const proofUrls = Array.isArray(proofUrl)
      ? proofUrl
      : proofUrl
      ? [proofUrl]
      : undefined;
    const primaryProofUrl = proofUrls && proofUrls.length > 0 ? proofUrls[0] : undefined;

    if (existingCheckIn && quantity === undefined && proofUrl === undefined && note === undefined) {
      // Un-check
      soundEngine.playUncheck();
      hapticLight();

      let nextCheckIns = state.checkIns.filter((c) => c.id !== existingCheckIn.id);
      const syncedCheckIns: CheckIn[] = [];

      if (habit.weeklyTargetDays && habit.weeklyTargetDays > 0) {
        const rebalanced = rebalanceWeeklyHabitCheckIns(nextCheckIns, habit, targetWeekKey);
        rebalanced.forEach((c) => {
          const orig = nextCheckIns.find((o) => o.id === c.id);
          if (orig && orig.pointsEarned !== c.pointsEarned) {
            syncedCheckIns.push(c);
          }
        });
        nextCheckIns = rebalanced;
      }

      setState((prev) => ({
        ...prev,
        checkIns: nextCheckIns,
      }));

      if (supabaseRef.current) {
        deleteCheckInSupabase(supabaseRef.current, habitId, targetDate);
        syncedCheckIns.forEach((c) => {
          insertCheckInSupabase(supabaseRef.current!, c);
        });
      }
    } else if (existingCheckIn) {
      // Update existing check-in
      soundEngine.playCheck();
      hapticLight();

      const updatedCheckIn: CheckIn = {
        ...existingCheckIn,
        quantity: quantity !== undefined ? quantity : existingCheckIn.quantity,
        proofUrl: primaryProofUrl || existingCheckIn.proofUrl,
        proofUrls: proofUrls || existingCheckIn.proofUrls,
        note: note !== undefined ? note : existingCheckIn.note,
      };

      let nextCheckIns = state.checkIns.map((c) =>
        c.id === existingCheckIn.id ? updatedCheckIn : c
      );
      const syncedCheckIns: CheckIn[] = [];

      if (habit.weeklyTargetDays && habit.weeklyTargetDays > 0) {
        const rebalanced = rebalanceWeeklyHabitCheckIns(nextCheckIns, habit, targetWeekKey);
        rebalanced.forEach((c) => {
          const orig = nextCheckIns.find((o) => o.id === c.id);
          if (orig && orig.pointsEarned !== c.pointsEarned) {
            syncedCheckIns.push(c);
          }
        });
        nextCheckIns = rebalanced;
      } else {
        nextCheckIns = nextCheckIns.map((c) =>
          c.id === existingCheckIn.id ? { ...c, pointsEarned: basePoints } : c
        );
      }

      setState((prev) => ({
        ...prev,
        checkIns: nextCheckIns,
      }));

      if (supabaseRef.current) {
        const finalUpdated = nextCheckIns.find((c) => c.id === existingCheckIn.id) || updatedCheckIn;
        insertCheckInSupabase(supabaseRef.current, finalUpdated);
        syncedCheckIns.forEach((c) => {
          if (c.id !== existingCheckIn.id) {
            insertCheckInSupabase(supabaseRef.current!, c);
          }
        });
      }
    } else {
      // Create new check-in
      const isRetroactive = targetDate !== todayStr;

      let pointsToAward = basePoints;
      if (habit.weeklyTargetDays && habit.weeklyTargetDays > 0) {
        const existingCount = state.checkIns.filter(
          (c) => c.habitId === habitId && getWeekKey(c.date) === targetWeekKey
        ).length;
        if (existingCount >= habit.weeklyTargetDays) {
          pointsToAward = 0; // Extra sessions beyond weekly target earn 0 points
        }
      }

      const newCheckIn: CheckIn = {
        id: `c-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        habitId,
        playerId: state.activePlayerId!,
        date: targetDate,
        pointsEarned: pointsToAward,
        quantity,
        proofUrl: primaryProofUrl,
        proofUrls,
        note,
        isRetroactive,
        loggedAt: new Date().toISOString(),
        completedAt: targetDate === todayStr ? new Date().toISOString() : `${targetDate}T20:00:00.000Z`,
      };

      // Sound & feedback
      if (pointsToAward >= 40) {
        soundEngine.playFanfare();
        fireCelebrationConfetti();
        hapticCelebration();
      } else {
        soundEngine.playCheck();
        hapticSuccess();
      }

      let nextCheckIns = [...state.checkIns, newCheckIn];
      const syncedCheckIns: CheckIn[] = [];

      if (habit.weeklyTargetDays && habit.weeklyTargetDays > 0) {
        const rebalanced = rebalanceWeeklyHabitCheckIns(nextCheckIns, habit, targetWeekKey);
        rebalanced.forEach((c) => {
          const orig = nextCheckIns.find((o) => o.id === c.id);
          if (orig && orig.pointsEarned !== c.pointsEarned) {
            syncedCheckIns.push(c);
          }
        });
        nextCheckIns = rebalanced;
      }

      setState((prev) => ({
        ...prev,
        checkIns: nextCheckIns,
      }));

      if (supabaseRef.current) {
        const finalNew = nextCheckIns.find((c) => c.id === newCheckIn.id) || newCheckIn;
        insertCheckInSupabase(supabaseRef.current, finalNew);
        syncedCheckIns.forEach((c) => {
          if (c.id !== newCheckIn.id) {
            insertCheckInSupabase(supabaseRef.current!, c);
          }
        });
      }
    }
  };

  const updateCheckInNote = (checkInId: string, note: string) => {
    soundEngine.playClick();
    setState((prev) => ({
      ...prev,
      checkIns: prev.checkIns.map((c) => (c.id === checkInId ? { ...c, note } : c)),
    }));
  };

  const addReaction = (reaction: { toPlayerId: PlayerId; emoji: string; message: string }) => {
    if (!state.activePlayerId) return;
    soundEngine.playFanfare();
    hapticSuccess();

    const newReaction: CouplesReaction = {
      id: `r-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      fromPlayerId: state.activePlayerId,
      toPlayerId: reaction.toPlayerId,
      emoji: reaction.emoji,
      message: reaction.message,
      timestamp: new Date().toISOString(),
    };

    setState((prev) => ({
      ...prev,
      reactions: [newReaction, ...(prev.reactions || [])],
    }));
  };

  const toggleRestDay = (date: string, reason?: string) => {
    if (!state.activePlayerId) return;
    soundEngine.playClick();
    hapticLight();

    const existing = (state.restDays || []).find(
      (r) => r.playerId === state.activePlayerId && r.date === date
    );

    if (existing) {
      setState((prev) => ({
        ...prev,
        restDays: (prev.restDays || []).filter((r) => r.id !== existing.id),
      }));
    } else {
      const newRest: RestDay = {
        id: `rd-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        playerId: state.activePlayerId,
        date,
        reason: reason || 'Scheduled Recovery',
        createdAt: new Date().toISOString(),
      };
      setState((prev) => ({
        ...prev,
        restDays: [...(prev.restDays || []), newRest],
      }));
    }
  };

  const isRestDay = (date: string, playerId?: PlayerId): boolean => {
    const targetPlayerId = playerId || state.activePlayerId;
    if (!targetPlayerId) return false;
    return (state.restDays || []).some(
      (r) => r.playerId === targetPlayerId && r.date === date
    );
  };

  const addHabit = (newHabit: Omit<Habit, 'id'>) => {
    soundEngine.playClick();
    const id = `habit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const fullHabit: Habit = { ...newHabit, id };
    setState((prev) => ({
      ...prev,
      habits: [...prev.habits, fullHabit],
    }));

    if (supabaseRef.current) {
      upsertHabitSupabase(supabaseRef.current, fullHabit);
    }
  };

  const updateHabit = (updatedHabit: Habit) => {
    soundEngine.playClick();
    setState((prev) => ({
      ...prev,
      habits: prev.habits.map((h) => (h.id === updatedHabit.id ? updatedHabit : h)),
    }));

    if (supabaseRef.current) {
      upsertHabitSupabase(supabaseRef.current, updatedHabit);
    }
  };

  const deleteHabit = (habitId: string) => {
    soundEngine.playClick();
    setState((prev) => ({
      ...prev,
      habits: prev.habits.filter((h) => h.id !== habitId),
      checkIns: prev.checkIns.filter((c) => c.habitId !== habitId),
    }));

    if (supabaseRef.current) {
      deleteHabitSupabase(supabaseRef.current, habitId);
    }
  };

  const updateStake = (updatedStake: Stake) => {
    soundEngine.playClick();
    setState((prev) => ({
      ...prev,
      stakes: prev.stakes.map((s) => (s.id === updatedStake.id ? updatedStake : s)),
    }));

    if (supabaseRef.current) {
      upsertStakeSupabase(supabaseRef.current, updatedStake);
    }
  };

  const addStake = (newStake: Omit<Stake, 'id'>) => {
    soundEngine.playClick();
    const id = `stake-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const fullStake: Stake = { ...newStake, id };
    setState((prev) => ({
      ...prev,
      stakes: [...prev.stakes, fullStake],
    }));

    if (supabaseRef.current) {
      upsertStakeSupabase(supabaseRef.current, fullStake);
    }
  };

  const deleteStake = (stakeId: string) => {
    soundEngine.playClick();
    setState((prev) => ({
      ...prev,
      stakes: prev.stakes.filter((s) => s.id !== stakeId),
    }));

    if (supabaseRef.current) {
      deleteStakeSupabase(supabaseRef.current, stakeId);
    }
  };

  const updateSupabaseConfig = (config: { url: string; anonKey: string; enabled: boolean }) => {
    setState((prev) => ({
      ...prev,
      supabaseConfig: config,
    }));
  };

  const resetToDefaults = () => {
    const fresh = getInitialState();
    setState(fresh);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.error(e);
    }
  };

  const exportStateToJson = (): string => {
    return JSON.stringify(state, null, 2);
  };

  const importStateFromJson = (jsonStr: string): { success: boolean; error?: string } => {
    try {
      const parsed = JSON.parse(jsonStr);
      if (!parsed.players || !parsed.habits || !parsed.checkIns) {
        return { success: false, error: 'Invalid backup file structure' };
      }
      setState(parsed);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
      soundEngine.playFanfare();
      return { success: true };
    } catch {
      return { success: false, error: 'Failed to parse JSON file' };
    }
  };

  const syncGoogleHealth = useCallback(
    async (
      simulate = false,
      simulateUnder = false
    ): Promise<{ success: boolean; message: string; count?: number; result?: GoogleHealthSyncResult }> => {
      try {
        const params = new URLSearchParams({ date: selectedDate });
        if (simulate) params.set('simulate', 'true');
        if (simulateUnder) params.set('simulateUnder', 'true');

        const url = `/api/sync/google-health?${params.toString()}`;
        const res = await fetch(url, { method: 'POST' });
        const data: GoogleHealthSyncResult = await res.json();

        if (!res.ok || !data.success) {
          return {
            success: false,
            message: data.message || 'Failed to sync with Google Health.',
            result: data,
          };
        }

        const syncTimeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        if (data.checkInsCreated && data.checkInsCreated.length > 0) {
          setState((prev) => {
            const newCheckIns = [...prev.checkIns];
            for (const incoming of data.checkInsCreated!) {
              const idx = newCheckIns.findIndex(
                (c) => c.habitId === incoming.habitId && c.date === incoming.date
              );
              if (idx >= 0) {
                newCheckIns[idx] = incoming;
              } else {
                newCheckIns.push(incoming);
              }
            }
            return {
              ...prev,
              checkIns: newCheckIns,
              wearableConfig: {
                ...prev.wearableConfig,
                googleConnected: true,
                googleLastSync: syncTimeString,
                googleLastResult: data,
              },
            };
          });

          soundEngine.playFanfare();
          hapticMedium();
          fireCelebrationConfetti();
          return {
            success: true,
            message: `Synced! Completed ${data.checkInsCreated.length} habit(s) from Google Health.`,
            count: data.checkInsCreated.length,
            result: data,
          };
        }

        setState((prev) => ({
          ...prev,
          wearableConfig: {
            ...prev.wearableConfig,
            googleConnected: true,
            googleLastSync: syncTimeString,
            googleLastResult: data,
          },
        }));

        return {
          success: true,
          message: data.message || 'Checked: No qualifying sleep or workouts found for this date.',
          count: 0,
          result: data,
        };
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Network error';
        return { success: false, message: msg };
      }
    },
    [selectedDate]
  );

  const testAppleHealthSync = async (
    metric: 'sleep' | 'running' | 'gym',
    value: number
  ): Promise<{ success: boolean; message: string; qualified?: boolean }> => {
    try {
      const res = await fetch('/api/sync/apple-health', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          player: 'myrna',
          metric,
          value,
          date: selectedDate,
          note: `Apple Health Test (${metric}: ${value})`,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, message: data.message || 'Sync failed.' };
      }

      if (data.checkIn) {
        setState((prev) => {
          const newCheckIns = [...prev.checkIns];
          const idx = newCheckIns.findIndex(
            (c) => c.habitId === data.checkIn.habitId && c.date === data.checkIn.date
          );
          if (idx >= 0) {
            newCheckIns[idx] = data.checkIn;
          } else {
            newCheckIns.push(data.checkIn);
          }
          const rebalanced = rebalanceAllWeeklyCheckIns(newCheckIns, prev.habits);
          return {
            ...prev,
            checkIns: rebalanced,
            wearableConfig: {
              ...prev.wearableConfig,
              appleConnected: true,
              appleLastSync: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              appleLastResult: {
                metric,
                value,
                hours: data.hoursLogged ?? value,
                date: selectedDate,
                points: data.pointsAwarded ?? 0,
                qualified: data.qualified !== false,
                message: data.message,
              },
            },
          };
        });

        soundEngine.playFanfare();
        hapticMedium();
        fireCelebrationConfetti();
      } else {
        setState((prev) => ({
          ...prev,
          wearableConfig: {
            ...prev.wearableConfig,
            appleConnected: true,
            appleLastSync: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            appleLastResult: {
              metric,
              value,
              hours: data.hoursLogged ?? value,
              date: selectedDate,
              points: 0,
              qualified: false,
              message: data.message,
            },
          },
        }));
      }

      return {
        success: data.success,
        message: data.message || 'Sync processed.',
        qualified: data.qualified !== false,
      };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Network error';
      return { success: false, message: msg };
    }
  };

  // Automatically pull Apple Health check-ins queued by background iOS Shortcuts
  useEffect(() => {
    if (!isHydrated) return;

    const pullAppleHealthPending = async () => {
      try {
        const res = await fetch('/api/sync/apple-health?pending=true&consume=true');
        if (!res.ok) return;
        const data = await res.json();
        if (data.pendingCheckIns && Array.isArray(data.pendingCheckIns) && data.pendingCheckIns.length > 0) {
          setState((prev) => {
            let nextCheckIns = [...prev.checkIns];
            for (const incoming of data.pendingCheckIns) {
              if (!incoming || !incoming.habitId) continue;
              const idx = nextCheckIns.findIndex(
                (c) => c.habitId === incoming.habitId && c.date === incoming.date
              );
              if (idx >= 0) {
                nextCheckIns[idx] = incoming;
              } else {
                nextCheckIns.push(incoming);
              }
            }
            nextCheckIns = rebalanceAllWeeklyCheckIns(nextCheckIns, prev.habits);
            return {
              ...prev,
              checkIns: nextCheckIns,
              wearableConfig: {
                ...prev.wearableConfig,
                appleConnected: true,
                appleLastSync: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              },
            };
          });
          soundEngine.playFanfare();
          hapticSuccess();
        }
      } catch {
        // Silent failure in offline/local
      }
    };

    pullAppleHealthPending();
    const handleFocus = () => {
      pullAppleHealthPending();
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [isHydrated]);

  const testStravaSync = async (
    player: string = 'maciek'
  ): Promise<{ success: boolean; message: string }> => {
    try {
      const res = await fetch(`/api/sync/strava?player=${player}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          object_type: 'activity',
          aspect_type: 'create',
          object_id: Math.floor(Math.random() * 899999 + 100000),
          event_time: Math.floor(new Date(`${selectedDate}T12:00:00Z`).getTime() / 1000),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, message: data.message || 'Strava sync failed.' };
      }

      if (data.checkIn) {
        setState((prev) => {
          const newCheckIns = [...prev.checkIns];
          const idx = newCheckIns.findIndex(
            (c) => c.habitId === data.checkIn.habitId && c.date === data.checkIn.date
          );
          if (idx >= 0) {
            newCheckIns[idx] = data.checkIn;
          } else {
            newCheckIns.push(data.checkIn);
          }
          return {
            ...prev,
            checkIns: newCheckIns,
          };
        });

        soundEngine.playFanfare();
        hapticMedium();
        fireCelebrationConfetti();
      }

      return { success: true, message: data.message };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Network error';
      return { success: false, message: msg };
    }
  };

  const testHevySync = async (
    workoutTitle: string = 'Strength Workout (Bench & Squat)',
    player: string = 'maciek'
  ): Promise<{ success: boolean; message: string }> => {
    try {
      const res = await fetch(`/api/sync/hevy?player=${player}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          player,
          title: workoutTitle,
          date: selectedDate,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, message: data.message || 'Hevy sync failed.' };
      }

      if (data.checkIn) {
        setState((prev) => {
          const newCheckIns = [...prev.checkIns];
          const idx = newCheckIns.findIndex(
            (c) => c.habitId === data.checkIn.habitId && c.date === data.checkIn.date
          );
          if (idx >= 0) {
            newCheckIns[idx] = data.checkIn;
          } else {
            newCheckIns.push(data.checkIn);
          }
          return {
            ...prev,
            checkIns: newCheckIns,
          };
        });

        soundEngine.playFanfare();
        hapticMedium();
        fireCelebrationConfetti();
      }

      return { success: true, message: data.message };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Network error';
      return { success: false, message: msg };
    }
  };

  // Auto-sync Google Health in background on load for Maciek if connected
  const autoSyncedRef = useRef(false);
  useEffect(() => {
    if (!isHydrated || autoSyncedRef.current) return;
    if (state.activePlayerId === 'maciek' && state.wearableConfig?.googleConnected) {
      autoSyncedRef.current = true;
      syncGoogleHealth(false).catch(() => {});
    }
  }, [isHydrated, state.activePlayerId, state.wearableConfig?.googleConnected, syncGoogleHealth]);

  const disconnectGoogleHealth = () => {
    if (typeof document !== 'undefined') {
      document.cookie = 'g_fit_connected=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
      document.cookie = 'g_fit_access_token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
      document.cookie = 'g_fit_refresh_token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    }
    setState((prev) => ({
      ...prev,
      wearableConfig: {
        ...prev.wearableConfig,
        googleConnected: false,
      },
    }));
  };

  // Summaries
  const maciekSummary = calculatePlayerScores('maciek', state.checkIns, state.habits, state.restDays || []);
  const myrnaSummary = calculatePlayerScores('myrna', state.checkIns, state.habits, state.restDays || []);
  const activePlayerSummary =
    state.activePlayerId === 'maciek'
      ? maciekSummary
      : state.activePlayerId === 'myrna'
      ? myrnaSummary
      : {
          today: 0,
          weekly: 0,
          monthly: 0,
          yearly: 0,
          karma: 0,
          currentStreak: 0,
          completionRateWeekly: 0,
        };

  // Badges
  const maciekBadges = calculatePlayerBadges(
    'maciek',
    state.checkIns,
    state.habits,
    state.stakes,
    maciekSummary.currentStreak
  );

  const myrnaBadges = calculatePlayerBadges(
    'myrna',
    state.checkIns,
    state.habits,
    state.stakes,
    myrnaSummary.currentStreak
  );

  const activePlayerBadges = state.activePlayerId === 'maciek' ? maciekBadges : myrnaBadges;

  const activeWeeklyStake = state.stakes.find((s) => s.period === 'weekly' && s.status === 'active');
  const activeMonthlyStake = state.stakes.find(
    (s) => s.period === 'monthly' && s.status === 'active'
  );

  const getComparison = (tier: LeaderboardTier) => {
    return getVersusComparison(maciekSummary, myrnaSummary, tier);
  };

  return (
    <StoreContext.Provider
      value={{
        isHydrated,
        syncStatus,
        activePlayerId: state.activePlayerId,
        activePlayer,
        players: state.players,
        habits: state.habits,
        activeHabits,
        checkIns: state.checkIns,
        stakes: state.stakes,
        reactions: state.reactions || [],
        restDays: state.restDays || [],
        selectedDate,
        isTodaySelected,
        setSelectedDate,
        maciekSummary,
        myrnaSummary,
        activePlayerSummary,
        maciekBadges,
        myrnaBadges,
        activePlayerBadges,
        soundEnabled,
        setSoundEnabled,
        selectProfile,
        switchProfile,
        toggleHabit,
        updateCheckInNote,
        isHabitCompletedToday,
        getHabitCheckInToday,
        isHabitCompletedOnDate,
        getHabitCheckInOnDate,
        getCheckInForHabit,
        getWeeklyHabitCompletions,
        isHabitWeeklyTargetMet,
        isHabitSatisfiedOnDate,
        partnerId,
        partnerCleanSpaceHabit,
        partnerCleanSpaceCheckIn,
        addReaction,
        toggleRestDay,
        isRestDay,
        addHabit,
        updateHabit,
        deleteHabit,
        updateStake,
        addStake,
        deleteStake,
        activeWeeklyStake,
        activeMonthlyStake,
        getComparison,
        resetToDefaults,
        updateSupabaseConfig,
        exportStateToJson,
        importStateFromJson,
        wearableConfig: state.wearableConfig,
        syncGoogleHealth,
        testAppleHealthSync,
        testStravaSync,
        testHevySync,
        disconnectGoogleHealth,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore(): StoreContextType {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
}
