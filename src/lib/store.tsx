'use client';

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
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
} from './types';
import { getInitialState } from './seed';
import { getTodayDateString, isFutureDate } from './date-utils';
import { calculatePlayerScores, getVersusComparison } from './score-calculator';
import { calculatePlayerBadges } from './badge-utils';
import { fireCelebrationConfetti } from './confetti';
import { soundEngine } from './sound-utils';
import { hapticCelebration, hapticLight, hapticSuccess } from './haptic-utils';
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
          setState((prev) => ({
            ...prev,
            ...parsed,
            reactions: parsed.reactions || prev.reactions || [],
            restDays: parsed.restDays || prev.restDays || [],
          }));
        } else {
          const fresh = getInitialState();
          setState(fresh);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
        }
      }
      const savedSound = localStorage.getItem('do_it_sound_enabled');
      if (savedSound !== null) {
        const isSnd = savedSound === 'true';
        setSoundEnabledState(isSnd);
        soundEngine.setEnabled(isSnd);
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

    const existingCheckIn = state.checkIns.find(
      (c) => c.habitId === habitId && c.date === targetDate
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

    if (existingCheckIn && quantity === undefined && proofUrl === undefined && note === undefined) {
      // Un-check
      soundEngine.playUncheck();
      hapticLight();

      setState((prev) => ({
        ...prev,
        checkIns: prev.checkIns.filter((c) => c.id !== existingCheckIn.id),
      }));

      if (supabaseRef.current) {
        deleteCheckInSupabase(supabaseRef.current, habitId, targetDate);
      }
    } else if (existingCheckIn) {
      // Update existing check-in
      soundEngine.playCheck();
      hapticLight();

      const updatedCheckIn: CheckIn = {
        ...existingCheckIn,
        pointsEarned: pointsToAward,
        quantity: quantity !== undefined ? quantity : existingCheckIn.quantity,
        proofUrl: primaryProofUrl || existingCheckIn.proofUrl,
        proofUrls: proofUrls || existingCheckIn.proofUrls,
        note: note !== undefined ? note : existingCheckIn.note,
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
      const isRetroactive = targetDate !== todayStr;
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

      setState((prev) => ({
        ...prev,
        checkIns: [...prev.checkIns, newCheckIn],
      }));

      if (supabaseRef.current) {
        insertCheckInSupabase(supabaseRef.current, newCheckIn);
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
