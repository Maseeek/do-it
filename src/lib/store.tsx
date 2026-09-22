'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
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

const STORAGE_KEY = 'do_it_app_data_v2'; // Bumped version for clean Maciek & Myrna migration

interface StoreContextType {
  isHydrated: boolean;
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
  toggleHabit: (habitId: string, proofUrl?: string, quantity?: number) => void;
  isHabitCompletedToday: (habitId: string) => boolean;
  getHabitCheckInToday: (habitId: string) => CheckIn | undefined;
  addHabit: (newHabit: Omit<Habit, 'id'>) => void;
  updateHabit: (updatedHabit: Habit) => void;
  deleteHabit: (habitId: string) => void;
  updateStake: (updatedStake: Stake) => void;
  addStake: (newStake: Omit<Stake, 'id'>) => void;
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

  // Hydrate from localStorage on client mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Verify it contains maciek and myrna players
        if (parsed.players && parsed.players.maciek && parsed.players.myrna) {
          setState(parsed);
        } else {
          // Reset to clean seed if old format
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

  // Persist state changes
  useEffect(() => {
    if (isHydrated) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch (e) {
        console.error('Error saving state to localStorage', e);
      }
    }
  }, [state, isHydrated]);

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

  const toggleHabit = (habitId: string, proofUrl?: string, quantity?: number) => {
    if (!state.activePlayerId) return;

    const habit = state.habits.find((h) => h.id === habitId);
    if (!habit) return;

    setState((prev) => {
      const existingIndex = prev.checkIns.findIndex(
        (c) => c.habitId === habitId && c.date === todayStr
      );

      let updatedCheckIns: CheckIn[];

      // Calculate points earned
      let pointsToAward = habit.points;
      if (habit.isQuantitative && quantity !== undefined) {
        pointsToAward = Math.min(
          habit.points,
          Math.max(1, Math.round(quantity * (habit.pointsPerUnit || 1)))
        );
      }

      if (existingIndex >= 0 && quantity === undefined) {
        // Simple un-check when clicked again without quantity update
        updatedCheckIns = prev.checkIns.filter((_, i) => i !== existingIndex);
      } else if (existingIndex >= 0 && quantity !== undefined) {
        // Update quantity & points on existing checkin
        updatedCheckIns = prev.checkIns.map((c, i) =>
          i === existingIndex
            ? { ...c, pointsEarned: pointsToAward, quantity, proofUrl: proofUrl || c.proofUrl }
            : c
        );
      } else {
        // Create new check-in
        const newCheckIn: CheckIn = {
          id: `c-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          habitId,
          playerId: state.activePlayerId!,
          date: todayStr,
          pointsEarned: pointsToAward,
          quantity,
          proofUrl,
          completedAt: new Date().toISOString(),
        };
        updatedCheckIns = [...prev.checkIns, newCheckIn];

        if (pointsToAward >= 40) {
          fireCelebrationConfetti();
        }
      }

      return {
        ...prev,
        checkIns: updatedCheckIns,
      };
    });
  };

  const addHabit = (newHabit: Omit<Habit, 'id'>) => {
    const id = `habit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setState((prev) => ({
      ...prev,
      habits: [...prev.habits, { ...newHabit, id }],
    }));
  };

  const updateHabit = (updatedHabit: Habit) => {
    setState((prev) => ({
      ...prev,
      habits: prev.habits.map((h) => (h.id === updatedHabit.id ? updatedHabit : h)),
    }));
  };

  const deleteHabit = (habitId: string) => {
    setState((prev) => ({
      ...prev,
      habits: prev.habits.filter((h) => h.id !== habitId),
      checkIns: prev.checkIns.filter((c) => c.habitId !== habitId),
    }));
  };

  const updateStake = (updatedStake: Stake) => {
    setState((prev) => ({
      ...prev,
      stakes: prev.stakes.map((s) => (s.id === updatedStake.id ? updatedStake : s)),
    }));
  };

  const addStake = (newStake: Omit<Stake, 'id'>) => {
    const id = `stake-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setState((prev) => ({
      ...prev,
      stakes: [...prev.stakes, { ...newStake, id }],
    }));
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
        addHabit,
        updateHabit,
        deleteHabit,
        updateStake,
        addStake,
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
