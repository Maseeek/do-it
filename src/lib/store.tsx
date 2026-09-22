'use client';

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import {
  AppState,
  CheckIn,
  Habit,
  LeaderboardTier,
  Player,
  PlayerId,
  PlayerScoreSummary,
  Stake,
} from './types';
import { getInitialState } from './seed';
import { getTodayDateString } from './date-utils';
import { calculatePlayerScores, getVersusComparison } from './score-calculator';
import { fireCelebrationConfetti } from './confetti';
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
  maciekSummary: PlayerScoreSummary;
  myrnaSummary: PlayerScoreSummary;
  activePlayerSummary: PlayerScoreSummary;
  selectProfile: (id: PlayerId) => void;
  switchProfile: () => void;
  toggleHabit: (habitId: string, proofUrl?: string | string[], quantity?: number) => void;
  isHabitCompletedToday: (habitId: string) => boolean;
  getHabitCheckInToday: (habitId: string) => CheckIn | undefined;
  getCheckInForHabit: (habitId: string, date?: string) => CheckIn | undefined;
  partnerId: PlayerId | null;
  partnerCleanSpaceHabit: Habit | undefined;
  partnerCleanSpaceCheckIn: CheckIn | undefined;
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
}

const StoreContext = createContext<StoreContextType | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(getInitialState);
  const [isHydrated, setIsHydrated] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('local_only');

  const supabaseRef = useRef(getSupabaseClient());

  // 1. Hydrate from localStorage on client mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.players && parsed.players.maciek && parsed.players.myrna) {
          setState(parsed);
        } else {
          const fresh = getInitialState();
          setState(fresh);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
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
        setState((prev) => ({
          ...prev,
          habits: remoteData.habits && remoteData.habits.length > 0 ? remoteData.habits : prev.habits,
          checkIns: remoteData.checkIns || prev.checkIns,
          stakes: remoteData.stakes && remoteData.stakes.length > 0 ? remoteData.stakes : prev.stakes,
        }));
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
    setState((prev) => ({ ...prev, activePlayerId: id }));
  };

  const switchProfile = () => {
    setState((prev) => ({ ...prev, activePlayerId: null }));
  };

  const activePlayer = state.activePlayerId ? state.players[state.activePlayerId] : null;

  const activeHabits = state.activePlayerId
    ? state.habits.filter((h) => h.playerId === state.activePlayerId && h.isActive)
    : [];

  const todayStr = getTodayDateString();

  const isHabitCompletedToday = (habitId: string): boolean => {
    return state.checkIns.some((c) => c.habitId === habitId && c.date === todayStr);
  };

  const getHabitCheckInToday = (habitId: string): CheckIn | undefined => {
    return state.checkIns.find((c) => c.habitId === habitId && c.date === todayStr);
  };

  const getCheckInForHabit = (habitId: string, date = todayStr): CheckIn | undefined => {
    return state.checkIns.find((c) => c.habitId === habitId && c.date === date);
  };

  const partnerId: PlayerId | null =
    state.activePlayerId === 'maciek' ? 'myrna' : state.activePlayerId === 'myrna' ? 'maciek' : null;

  const partnerCleanSpaceHabit = state.habits.find(
    (h) => h.playerId === partnerId && h.category === 'environment' && h.requiresProof
  );

  const partnerCleanSpaceCheckIn = partnerCleanSpaceHabit
    ? state.checkIns.find((c) => c.habitId === partnerCleanSpaceHabit.id && c.date === todayStr)
    : undefined;

  const toggleHabit = (habitId: string, proofUrl?: string | string[], quantity?: number) => {
    if (!state.activePlayerId) return;

    const habit = state.habits.find((h) => h.id === habitId);
    if (!habit) return;

    const existingCheckIn = state.checkIns.find(
      (c) => c.habitId === habitId && c.date === todayStr
    );

    // Calculate points
    let pointsToAward = habit.points;
    if (habit.isQuantitative && quantity !== undefined) {
      pointsToAward = Math.min(
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

    if (existingCheckIn && quantity === undefined && proofUrl === undefined) {
      // Un-check
      setState((prev) => ({
        ...prev,
        checkIns: prev.checkIns.filter((c) => c.id !== existingCheckIn.id),
      }));

      if (supabaseRef.current) {
        deleteCheckInSupabase(supabaseRef.current, habitId, todayStr);
      }
    } else if (existingCheckIn) {
      // Update existing check-in
      const updatedCheckIn: CheckIn = {
        ...existingCheckIn,
        pointsEarned: pointsToAward,
        quantity: quantity !== undefined ? quantity : existingCheckIn.quantity,
        proofUrl: primaryProofUrl || existingCheckIn.proofUrl,
        proofUrls: proofUrls || existingCheckIn.proofUrls,
      };

      setState((prev) => ({
        ...prev,
        checkIns: prev.checkIns.map((c) => (c.id === existingCheckIn.id ? updatedCheckIn : c)),
      }));

      if (supabaseRef.current) {
        insertCheckInSupabase(supabaseRef.current, updatedCheckIn);
      }
    } else {
      // Create new check-in
      const newCheckIn: CheckIn = {
        id: `c-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        habitId,
        playerId: state.activePlayerId!,
        date: todayStr,
        pointsEarned: pointsToAward,
        quantity,
        proofUrl: primaryProofUrl,
        proofUrls,
        completedAt: new Date().toISOString(),
      };

      setState((prev) => ({
        ...prev,
        checkIns: [...prev.checkIns, newCheckIn],
      }));

      if (pointsToAward >= 40) {
        fireCelebrationConfetti();
      }

      if (supabaseRef.current) {
        insertCheckInSupabase(supabaseRef.current, newCheckIn);
      }
    }
  };

  const addHabit = (newHabit: Omit<Habit, 'id'>) => {
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
    setState((prev) => ({
      ...prev,
      habits: prev.habits.map((h) => (h.id === updatedHabit.id ? updatedHabit : h)),
    }));

    if (supabaseRef.current) {
      upsertHabitSupabase(supabaseRef.current, updatedHabit);
    }
  };

  const deleteHabit = (habitId: string) => {
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
    setState((prev) => ({
      ...prev,
      stakes: prev.stakes.map((s) => (s.id === updatedStake.id ? updatedStake : s)),
    }));

    if (supabaseRef.current) {
      upsertStakeSupabase(supabaseRef.current, updatedStake);
    }
  };

  const addStake = (newStake: Omit<Stake, 'id'>) => {
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

  // Summaries
  const maciekSummary = calculatePlayerScores('maciek', state.checkIns, state.habits);
  const myrnaSummary = calculatePlayerScores('myrna', state.checkIns, state.habits);
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
        maciekSummary,
        myrnaSummary,
        activePlayerSummary,
        selectProfile,
        switchProfile,
        toggleHabit,
        isHabitCompletedToday,
        getHabitCheckInToday,
        getCheckInForHabit,
        partnerId,
        partnerCleanSpaceHabit,
        partnerCleanSpaceCheckIn,
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
