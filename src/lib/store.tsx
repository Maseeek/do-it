'use client';

import React, { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
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
  ThemePreference,
  EffectiveTheme,
  PlayerColorId,
  PLAYER_COLORS,
} from './types';
import { getInitialState } from './seed';
import { maximumHabitPoints, weeklyPointPotential } from './habit-catalog';
import { parseBackup } from './backup';
import { canImportLegacyDatabase, needsLegacyReplacement, prepareLegacyImport, readLegacyProgress, restoreLegacyDuelProgress } from './legacy-import';
import { getTodayDateString, getWeekKey, isFutureDate, isValidDateString } from './date-utils';
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
import { useMultiplayer } from './multiplayer';
import { loadDuelData, saveDuelHabit, deleteDuelHabit, saveDuelCheckIn, deleteDuelCheckIn, saveDuelStake, deleteDuelStake, saveDuelReaction, saveDuelRestDay, deleteDuelRestDay } from './duel-sync';
import {
  habitToRow,
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
const EMPTY_REST_DAYS: RestDay[] = [];
const EMPTY_PLAYER_SUMMARY: PlayerScoreSummary = {
  today: 0,
  weekly: 0,
  monthly: 0,
  yearly: 0,
  karma: 0,
  currentStreak: 0,
  completionRateWeekly: 0,
};

export type SyncStatus = 'connected' | 'syncing' | 'offline' | 'local_only';
function useStableCallback<T extends (...args: never[]) => unknown>(callback: T): T {
  const callbackRef = useRef(callback);
  useLayoutEffect(() => {
    callbackRef.current = callback;
  }, [callback]);
  return useCallback((...args: Parameters<T>) => callbackRef.current(...args), []) as unknown as T;
}

interface StoreContextType {
  isHydrated: boolean;
  loadedDuelId: string | null;
  syncStatus: SyncStatus;
  storageError: string | null;
  supabaseConfig: AppState['supabaseConfig'];
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
  updateLocalPlayerName: (name: string) => void;
  updatePlayerColor: (colorId: PlayerColorId) => void;
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
  isPartnerConnected: boolean;
  partnerId: PlayerId | null;
  partnerCleanSpaceHabit: Habit | undefined;
  partnerCleanSpaceCheckIn: CheckIn | undefined;
  addReaction: (reaction: { toPlayerId: PlayerId; emoji: string; message: string }) => void;
  toggleRestDay: (date: string, reason?: string) => void;
  isRestDay: (date: string, playerId?: PlayerId) => boolean;
  addHabit: (newHabit: Omit<Habit, 'id'>) => void;
  updateHabit: (updatedHabit: Habit) => void;
  deleteHabit: (habitId: string) => void;
  applyHabitPlan: (plannedHabits: Habit[]) => Promise<void>;
  importPreviousProgress: (source?: { habits: Habit[]; checkIns: CheckIn[] }) => Promise<{ habits: number; checkIns: number; duplicatesConsolidated: number }>;
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
  disconnectGoogleHealth: () => void;
  themePreference: ThemePreference;
  effectiveTheme: EffectiveTheme;
  setThemePreference: (pref: ThemePreference) => void;
  toggleTheme: () => void;
}

const StoreContext = createContext<StoreContextType | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const multiplayer = useMultiplayer();
  const duelId = multiplayer.duel?.id || null;
  const duelOwnerName = multiplayer.duel?.owner_name || '';
  const duelGuestName = multiplayer.duel?.guest_name || '';
  const [state, setState] = useState<AppState>(getInitialState);
  const [isHydrated, setIsHydrated] = useState(false);
  const [loadedDuelId, setLoadedDuelId] = useState<string | null>(null);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('local_only');
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString());
  const [soundEnabled, setSoundEnabledState] = useState<boolean>(true);
  const [themePreference, setThemePreferenceState] = useState<ThemePreference>('system');
  const [effectiveTheme, setEffectiveTheme] = useState<EffectiveTheme>('dark');

  const supabaseRef = useRef(getSupabaseClient());
  const duelQueueRef = useRef<Promise<void>>(Promise.resolve());
  const stateDuelRef = useRef<string | null>(null);
  const stateSlotRef = useRef<PlayerId | null>(null);
  const restorationInProgressRef = useRef<Record<string, boolean>>({});
  const latestAppliedSequenceRef = useRef(0);

  // 1. Hydrate from localStorage on client mount
  useEffect(() => {
    try {
      const saved = multiplayer.configured ? null : localStorage.getItem(STORAGE_KEY);
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

      const savedTheme = localStorage.getItem('theme_preference') as ThemePreference | null;
      if (savedTheme && ['system', 'light', 'dark'].includes(savedTheme)) {
        setThemePreferenceState(savedTheme);
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
  }, [multiplayer.configured]);

  // 2. Persist state changes to localStorage
  useEffect(() => {
    if (isHydrated && !multiplayer.configured) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        setStorageError(null);
      } catch (e) {
        console.error('Error saving state to localStorage', e);
        setStorageError('Your latest changes could not be saved on this device. Export a backup before closing the app.');
      }
    }
  }, [state, isHydrated, multiplayer.configured]);

  // Theme synchronization and system mode detection
  const applyThemeToDocument = useCallback((effective: EffectiveTheme) => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    if (effective === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
      root.style.colorScheme = 'light';
    }

    const themeColorMeta = document.querySelector('meta[name="theme-color"]');
    if (themeColorMeta) {
      themeColorMeta.setAttribute('content', effective === 'dark' ? '#08090a' : '#f2f2f7');
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const resolveAndApplyTheme = () => {
      const resolved: EffectiveTheme =
        themePreference === 'system'
          ? (mediaQuery.matches ? 'dark' : 'light')
          : themePreference;
      setEffectiveTheme(resolved);
      applyThemeToDocument(resolved);
    };

    resolveAndApplyTheme();

    const handleSystemChange = () => {
      if (themePreference === 'system') {
        resolveAndApplyTheme();
      }
    };

    mediaQuery.addEventListener('change', handleSystemChange);
    return () => mediaQuery.removeEventListener('change', handleSystemChange);
  }, [themePreference, applyThemeToDocument]);

  const setThemePreference = useCallback((pref: ThemePreference) => {
    setThemePreferenceState(pref);
    try {
      localStorage.setItem('theme_preference', pref);
    } catch (e) {
      console.error('Error saving theme preference to localStorage', e);
    }
    setState((prev) => ({ ...prev, themePreference: pref }));
  }, []);

  const toggleTheme = useCallback(() => {
    if (themePreference === 'system') {
      setThemePreference(effectiveTheme === 'dark' ? 'light' : 'dark');
    } else if (themePreference === 'light') {
      setThemePreference('dark');
    } else {
      setThemePreference('system');
    }
  }, [themePreference, effectiveTheme, setThemePreference]);

  // 3. Supabase Cloud Sync & Realtime Subscription
  useEffect(() => {
    if (!isHydrated || multiplayer.configured) return;

    const customUrl = state.supabaseConfig?.enabled ? state.supabaseConfig.url : undefined;
    const customKey = state.supabaseConfig?.enabled ? state.supabaseConfig.anonKey : undefined;
    const client = state.supabaseConfig?.enabled === false ? null : getSupabaseClient(customUrl, customKey);
    let cancelled = false;
    supabaseRef.current = client;

    if (!client) {
      setSyncStatus('local_only');
      return;
    }

    setSyncStatus('syncing');

    // Fetch cloud data and seed if needed
    syncInitialDataFromSupabase(client).then((remoteData) => {
      if (cancelled) return;
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
      cancelled = true;
      client.removeChannel(channel);
    };
  }, [isHydrated, state.supabaseConfig, multiplayer.configured]);

  // Authenticated duels use isolated tables and never touch the legacy public schema.
  useEffect(() => {
    if (!isHydrated || !multiplayer.configured) return;
    const client = getSupabaseClient();
    supabaseRef.current = null;
    if (!client || !duelId || !multiplayer.slot) {
      setLoadedDuelId(null);
      setSyncStatus('local_only');
      return;
    }
    let cancelled = false;
    let reloadSequence = 0;
    if (stateDuelRef.current !== duelId) {
      setLoadedDuelId(null);
      setSyncStatus('syncing');
    }
    const reload = async () => {
      const sequence = ++reloadSequence;
      try {
        await duelQueueRef.current;
        let data = await loadDuelData(client, duelId);
        const restoreKey = `${duelId}:${multiplayer.slot}`;
        if (
          multiplayer.slot &&
          canImportLegacyDatabase(multiplayer.slot, multiplayer.user?.email) &&
          needsLegacyReplacement(multiplayer.slot, data.habits) &&
          !restorationInProgressRef.current[restoreKey]
        ) {
          restorationInProgressRef.current[restoreKey] = true;
          const slot = multiplayer.slot;
          const restoration = duelQueueRef.current
            .then(() => restoreLegacyDuelProgress(client, duelId, slot, data.habits, data.checkIns))
            .finally(() => {
              delete restorationInProgressRef.current[restoreKey];
            });
          duelQueueRef.current = restoration.then(() => {}, () => {});
          if (await restoration) data = await loadDuelData(client, duelId);
        }
        if (cancelled) return;
        if (sequence < latestAppliedSequenceRef.current) return;
        latestAppliedSequenceRef.current = sequence;
        const initial = getInitialState();
        const sameDuel = stateDuelRef.current === duelId && stateSlotRef.current === multiplayer.slot;
        stateDuelRef.current = duelId;
        stateSlotRef.current = multiplayer.slot;
        const partnerPaired = multiplayer.hasPairedPartner;
        const visibleHabits = partnerPaired ? data.habits : data.habits.filter(h => h.playerId === multiplayer.slot);
        const visibleCheckIns = partnerPaired ? data.checkIns : data.checkIns.filter(c => c.playerId === multiplayer.slot);
        const visibleReactions = partnerPaired ? data.reactions : data.reactions.filter(r => r.fromPlayerId === multiplayer.slot && r.toPlayerId === multiplayer.slot);
        const visibleRestDays = partnerPaired ? data.restDays : data.restDays.filter(r => r.playerId === multiplayer.slot);
        setState(prev => ({
          ...(sameDuel ? prev : initial),
          activePlayerId: multiplayer.slot,
          habits: visibleHabits,
          checkIns: visibleCheckIns,
          stakes: data.stakes,
          reactions: visibleReactions,
          restDays: visibleRestDays,
          players: {
            maciek: { ...initial.players.maciek, name: duelOwnerName || initial.players.maciek.name },
            myrna: { ...initial.players.myrna, name: partnerPaired ? (duelGuestName || 'Invited player') : 'Waiting for opponent' },
          },
        }));
        setLoadedDuelId(duelId);
        setSyncStatus('connected');
        setStorageError(null);
      } catch (error) {
        if (!cancelled) {
          setSyncStatus('offline');
          setStorageError(error instanceof Error ? error.message : 'Could not load duel data.');
        }
      }
    };
    void reload();
    let isSubscribed = false;
    const channel = client.channel(`duel-${duelId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'duel_habits', filter: `duel_id=eq.${duelId}` }, () => void reload())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'duel_check_ins', filter: `duel_id=eq.${duelId}` }, () => void reload())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'duel_stakes', filter: `duel_id=eq.${duelId}` }, () => void reload())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'duel_reactions', filter: `duel_id=eq.${duelId}` }, () => void reload())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'duel_rest_days', filter: `duel_id=eq.${duelId}` }, () => void reload())
      .subscribe((status) => {
        isSubscribed = status === 'SUBSCRIBED';
      });
    const poll = setInterval(() => {
      if (!isSubscribed) {
        void reload();
      }
    }, 30000);
    return () => { cancelled = true; clearInterval(poll); void client.removeChannel(channel); };
  }, [isHydrated, multiplayer.configured, duelId, multiplayer.slot, multiplayer.hasPairedPartner, multiplayer.user?.email, duelOwnerName, duelGuestName]);

  const syncDuel = (operation: (client: NonNullable<ReturnType<typeof getSupabaseClient>>, id: string) => Promise<void>) => {
    const client = getSupabaseClient();
    if (!multiplayer.configured || !client || !duelId) return;
    duelQueueRef.current = duelQueueRef.current.then(() => operation(client, duelId)).catch(error => {
      setSyncStatus('offline');
      setStorageError(error instanceof Error ? error.message : 'Could not save duel change.');
    });
  };

  const selectProfile = useStableCallback((id: PlayerId) => { if (multiplayer.configured) return;
  soundEngine.playClick();
  hapticLight();
  setState((prev) => ({ ...prev, activePlayerId: id })); });

  const switchProfile = useStableCallback(() => { if (multiplayer.configured) return;
  soundEngine.playClick();
  hapticLight();
  setState((prev) => ({ ...prev, activePlayerId: null })); });

  const setSoundEnabled = useStableCallback((enabled: boolean) => { setSoundEnabledState(enabled);
  try { localStorage.setItem('do_it_sound_enabled', String(enabled)); } catch { /* Storage warning is handled by persistence. */ }
  setState((prev) => ({ ...prev, soundEnabled: enabled }));
  soundEngine.setEnabled(enabled);
  if (enabled) {
    soundEngine.playClick();
  } });

  const activePlayer = state.activePlayerId ? state.players[state.activePlayerId] : null;

  const activeHabits = useMemo(
    () => state.activePlayerId
      ? state.habits.filter((h) => h.playerId === state.activePlayerId && h.isActive).sort((a, b) => a.order - b.order)
      : [],
    [state.activePlayerId, state.habits]
  );
  const todayStr = getTodayDateString();
  const isTodaySelected = selectedDate === todayStr;

  const isHabitCompletedToday = useCallback(
    (habitId: string): boolean => state.checkIns.some((c) => c.habitId === habitId && c.date === todayStr),
    [state.checkIns, todayStr]
  );

  const getHabitCheckInToday = useCallback(
    (habitId: string): CheckIn | undefined => state.checkIns.find((c) => c.habitId === habitId && c.date === todayStr),
    [state.checkIns, todayStr]
  );

  const isHabitCompletedOnDate = useCallback(
    (habitId: string, date: string): boolean => state.checkIns.some((c) => c.habitId === habitId && c.date === date),
    [state.checkIns]
  );

  const getHabitCheckInOnDate = useCallback(
    (habitId: string, date: string): CheckIn | undefined => state.checkIns.find((c) => c.habitId === habitId && c.date === date),
    [state.checkIns]
  );

  const getCheckInForHabit = useCallback(
    (habitId: string, date = selectedDate): CheckIn | undefined => state.checkIns.find((c) => c.habitId === habitId && c.date === date),
    [state.checkIns, selectedDate]
  );

  const getWeeklyHabitCompletions = useCallback(
    (habitId: string, date = selectedDate): number => getWeeklyHabitCompletionsCount(habitId, date, state.checkIns),
    [state.checkIns, selectedDate]
  );

  const isHabitWeeklyTargetMet = useCallback((habitId: string, date = selectedDate): boolean => {
    const habit = state.habits.find((h) => h.id === habitId);
    if (!habit) return false;
    return isWeeklyHabitTargetMet(habit, date, state.checkIns);
  }, [state.habits, state.checkIns, selectedDate]);

  const isHabitSatisfiedOnDate = useCallback(
    (habitId: string, date = selectedDate): boolean =>
      isHabitCompletedOnDate(habitId, date) || isHabitWeeklyTargetMet(habitId, date),
    [isHabitCompletedOnDate, isHabitWeeklyTargetMet, selectedDate]
  );

  const isPartnerConnected = multiplayer.configured ? multiplayer.hasPairedPartner : true;
  const partnerId: PlayerId | null =
    !isPartnerConnected
      ? null
      : state.activePlayerId === 'maciek'
      ? 'myrna'
      : state.activePlayerId === 'myrna'
      ? 'maciek'
      : null;
  const partnerCleanSpaceHabit = state.habits.find(
    (h) => h.playerId === partnerId && h.category === 'environment' && h.requiresProof
  );

  const partnerCleanSpaceCheckIn = partnerCleanSpaceHabit
    ? state.checkIns.find((c) => c.habitId === partnerCleanSpaceHabit.id && c.date === selectedDate)
    : undefined;

  const toggleHabit = useStableCallback((habitId: string,
  proofUrl?: string | string[],
  quantity?: number,
  note?: string,
  targetDate = selectedDate) => { if (!state.activePlayerId) return;
  if (!isValidDateString(targetDate) || isFutureDate(targetDate)) return; // Disallow future date check-ins
  
  const habit = state.habits.find((h) => h.id === habitId);
  if (!habit || !habit.isActive || habit.playerId !== state.activePlayerId) return;
  if (quantity !== undefined && (!Number.isFinite(quantity) || quantity <= 0)) return;
  
  const targetWeekKey = getWeekKey(targetDate);
  const existingCheckIn = state.checkIns.find(
    (c) => c.habitId === habitId && c.date === targetDate
  );
  
  // Calculate base points
  let basePoints = existingCheckIn?.pointsEarned ?? habit.points;
  if (habit.isQuantitative && quantity !== undefined) {
    quantity = Math.min(habit.maxQuantity || quantity, Math.floor(quantity));
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
  
    if (multiplayer.configured) {
      syncDuel(async (client, id) => {
        await deleteDuelCheckIn(client, id, existingCheckIn.id);
        await Promise.all(syncedCheckIns.map(c => saveDuelCheckIn(client, id, c)));
      });
    } else if (supabaseRef.current) {
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
  
    if (multiplayer.configured) {
      syncDuel(async (client, id) => {
        await saveDuelCheckIn(client, id, nextCheckIns.find((c) => c.id === existingCheckIn.id) || updatedCheckIn);
        await Promise.all(syncedCheckIns.map(c => saveDuelCheckIn(client, id, c)));
      });
    } else if (supabaseRef.current) {
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
  
    if (multiplayer.configured) {
      syncDuel(async (client, id) => {
        await saveDuelCheckIn(client, id, nextCheckIns.find((c) => c.id === newCheckIn.id) || newCheckIn);
        await Promise.all(syncedCheckIns.map(c => saveDuelCheckIn(client, id, c)));
      });
    } else if (supabaseRef.current) {
      const finalNew = nextCheckIns.find((c) => c.id === newCheckIn.id) || newCheckIn;
      insertCheckInSupabase(supabaseRef.current, finalNew);
      syncedCheckIns.forEach((c) => {
        if (c.id !== newCheckIn.id) {
          insertCheckInSupabase(supabaseRef.current!, c);
        }
      });
    }
  } });

  const updateCheckInNote = useStableCallback((checkInId: string, note: string) => { const existing = state.checkIns.find(c => c.id === checkInId);
  if (!existing || (multiplayer.configured && existing.playerId !== multiplayer.slot)) return;
  soundEngine.playClick();
  setState((prev) => ({
    ...prev,
    checkIns: prev.checkIns.map((c) => (c.id === checkInId ? { ...c, note } : c)),
  }));
  if (multiplayer.configured) syncDuel((client, id) => saveDuelCheckIn(client, id, { ...existing, note })); });

  const addReaction = useStableCallback((reaction: { toPlayerId: PlayerId; emoji: string; message: string }) => { if (!state.activePlayerId) return;
  if (multiplayer.configured && (state.activePlayerId !== multiplayer.slot || reaction.toPlayerId === multiplayer.slot)) return;
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
  if (multiplayer.configured) syncDuel((client, id) => saveDuelReaction(client, id, newReaction)); });

  const toggleRestDay = useStableCallback((date: string, reason?: string) => { if (!state.activePlayerId) return;
  if (multiplayer.configured && state.activePlayerId !== multiplayer.slot) return;
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
    if (multiplayer.configured) syncDuel((client, id) => deleteDuelRestDay(client, id, existing.id));
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
    if (multiplayer.configured) syncDuel((client, id) => saveDuelRestDay(client, id, newRest));
  } });

  const isRestDay = useCallback(
    (date: string, playerId?: PlayerId): boolean => {
      const targetPlayerId = playerId || state.activePlayerId;
      if (!targetPlayerId) return false;
      return (state.restDays || []).some((r) => r.playerId === targetPlayerId && r.date === date);
    },
    [state.activePlayerId, state.restDays]
  );

  const addHabit = useStableCallback((newHabit: Omit<Habit, 'id'>) => { if (multiplayer.configured && newHabit.playerId !== multiplayer.slot) return;
  soundEngine.playClick();
  const id = `habit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const fullHabit: Habit = { ...newHabit, id };
  setState((prev) => ({
    ...prev,
    habits: [...prev.habits, fullHabit],
  }));
  
  if (multiplayer.configured) {
    syncDuel((client, id) => saveDuelHabit(client, id, fullHabit));
  } else if (supabaseRef.current) {
    upsertHabitSupabase(supabaseRef.current, fullHabit);
  } });

  const updateHabit = useStableCallback((updatedHabit: Habit) => { if (multiplayer.configured && (updatedHabit.playerId !== multiplayer.slot || state.habits.find(h => h.id === updatedHabit.id)?.playerId !== multiplayer.slot)) return;
  soundEngine.playClick();
  setState((prev) => ({
    ...prev,
    habits: prev.habits.map((h) => (h.id === updatedHabit.id ? updatedHabit : h)),
  }));
  
  if (multiplayer.configured) {
    syncDuel((client, id) => saveDuelHabit(client, id, updatedHabit));
  } else if (supabaseRef.current) {
    upsertHabitSupabase(supabaseRef.current, updatedHabit);
  } });

  const deleteHabit = useStableCallback((habitId: string) => { if (multiplayer.configured && state.habits.find(h => h.id === habitId)?.playerId !== multiplayer.slot) return;
  soundEngine.playClick();
  setState((prev) => ({
    ...prev,
    habits: prev.habits.filter((h) => h.id !== habitId),
    checkIns: prev.checkIns.filter((c) => c.habitId !== habitId),
  }));
  
  if (multiplayer.configured) {
    syncDuel((client, id) => deleteDuelHabit(client, id, habitId));
  } else if (supabaseRef.current) {
    deleteHabitSupabase(supabaseRef.current, habitId);
  } });

  const updateLocalPlayerName = useStableCallback((name: string) => { if (multiplayer.configured || !state.activePlayerId) throw new Error('Choose a profile first.');
  const trimmed = name.trim();
  if (trimmed.length < 1 || trimmed.length > 40) throw new Error('Name must be 1 to 40 characters.');
  const id = state.activePlayerId;
  setState(prev => ({ ...prev, players: { ...prev.players, [id]: { ...prev.players[id], name: trimmed } } })); });
  const updatePlayerColor = useStableCallback((colorId: PlayerColorId) => {
    if (multiplayer.configured || !state.activePlayerId) throw new Error('Choose a local profile first.');
    const color = PLAYER_COLORS.find(option => option.id === colorId);
    const karma = state.checkIns.filter(checkIn => checkIn.playerId === state.activePlayerId).reduce((sum, checkIn) => sum + checkIn.pointsEarned, 0);
    if (!color || color.unlockAt > karma) throw new Error('That color is still locked.');
    const id = state.activePlayerId;
    setState(prev => ({ ...prev, players: { ...prev.players, [id]: { ...prev.players[id], color: color.color, accentBg: color.accentBg, accentBorder: color.accentBorder } } }));
  });

  const applyHabitPlan = useStableCallback(async (plannedHabits: Habit[]) => { const playerId = state.activePlayerId;
  if (!playerId || (multiplayer.configured && playerId !== multiplayer.slot)) throw new Error('Choose your own profile first.');
  if (plannedHabits.some(habit => habit.playerId !== playerId || !Number.isInteger(habit.points) || habit.points < 5 || habit.points > maximumHabitPoints(habit))) {
    throw new Error('Each habit needs a valid point value. Quantity habits cannot exceed their maximum earned points.');
  }
  const total = weeklyPointPotential(plannedHabits);
  const partnerSlot = playerId === 'maciek' ? 'myrna' : 'maciek';
  const partnerTotal = (!multiplayer.configured || multiplayer.hasPairedPartner)
    ? weeklyPointPotential(state.habits.filter(habit => habit.playerId === partnerSlot))
    : 0;
  if (total === 0) throw new Error('Choose at least one habit.');
  if (partnerTotal > 0 && total !== partnerTotal) throw new Error(`Your weekly point potential needs to match your partner’s ${partnerTotal} points.`);
  const previous = state.habits.filter(habit => habit.playerId === playerId);
  const plannedIds = new Set(plannedHabits.map(habit => habit.id));
  const next = [...plannedHabits, ...previous.filter(habit => !plannedIds.has(habit.id)).map(habit => ({ ...habit, isActive: false }))];
  if (multiplayer.configured) {
    const client = getSupabaseClient();
    if (!client || !duelId) throw new Error('Your account is not connected. Try again.');
    const save = duelQueueRef.current.then(async () => {
      const { error } = await client.from('duel_habits').upsert(next.map(habit => ({ duel_id: duelId, id: habit.id, player_slot: playerId, data: habit })));
      if (error) throw error;
    });
    duelQueueRef.current = save.catch(() => {});
    await save;
  } else if (supabaseRef.current) {
    const { error } = await supabaseRef.current.from('habits').upsert(next.map(habitToRow));
    if (error) throw error;
  }
  setState(prev => ({ ...prev, habits: [...prev.habits.filter(habit => habit.playerId !== playerId), ...next] })); });

  const importPreviousProgress = useStableCallback(async (source?: { habits: Habit[]; checkIns: CheckIn[] }) => { const playerId = multiplayer.slot;
  const client = getSupabaseClient();
  if (!multiplayer.configured || !client || !duelId || !playerId) throw new Error('Sign in to your account first.');
  if (!source && !canImportLegacyDatabase(playerId, multiplayer.user?.email)) {
    throw new Error('The previous database import is not available for this account. You can import a backup file instead.');
  }
  const previous = source || await readLegacyProgress(client, playerId);
  const save = duelQueueRef.current.then(async () => {
    const current = await loadDuelData(client, duelId);
    const { missingHabits, missingCheckIns, duplicatesConsolidated } = prepareLegacyImport(playerId, previous.habits, previous.checkIns, current.habits, current.checkIns);
    for (let offset = 0; offset < missingHabits.length; offset += 50) {
      const batch = missingHabits.slice(offset, offset + 50).map(habit => ({ duel_id: duelId, id: habit.id, player_slot: playerId, data: habit }));
      const { error } = await client.from('duel_habits').upsert(batch, { onConflict: 'duel_id,id', ignoreDuplicates: true });
      if (error) throw error;
    }
    for (let offset = 0; offset < missingCheckIns.length; offset += 10) {
      const batch = missingCheckIns.slice(offset, offset + 10).map(checkIn => ({ duel_id: duelId, id: checkIn.id, habit_id: checkIn.habitId, player_slot: playerId, data: checkIn }));
      const { error } = await client.from('duel_check_ins').upsert(batch, { onConflict: 'duel_id,id', ignoreDuplicates: true });
      if (error) throw error;
    }
    const refreshed = await loadDuelData(client, duelId);
    setState(prev => ({ ...prev, habits: refreshed.habits, checkIns: refreshed.checkIns }));
    return { habits: missingHabits.length, checkIns: missingCheckIns.length, duplicatesConsolidated };
  });
  duelQueueRef.current = save.then(() => {}, () => {});
  return save; });

  const updateStake = useStableCallback((updatedStake: Stake) => { soundEngine.playClick();
  setState((prev) => ({
    ...prev,
    stakes: prev.stakes.map((s) => (s.id === updatedStake.id ? updatedStake : s)),
  }));
  
  if (multiplayer.configured) {
    syncDuel((client, id) => saveDuelStake(client, id, updatedStake));
  } else if (supabaseRef.current) {
    upsertStakeSupabase(supabaseRef.current, updatedStake);
  } });

  const addStake = useStableCallback((newStake: Omit<Stake, 'id'>) => { soundEngine.playClick();
  const id = `stake-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const fullStake: Stake = { ...newStake, id };
  setState((prev) => ({
    ...prev,
    stakes: [...prev.stakes, fullStake],
  }));
  
  if (multiplayer.configured) {
    syncDuel((client, id) => saveDuelStake(client, id, fullStake));
  } else if (supabaseRef.current) {
    upsertStakeSupabase(supabaseRef.current, fullStake);
  } });

  const deleteStake = useStableCallback((stakeId: string) => { soundEngine.playClick();
  setState((prev) => ({
    ...prev,
    stakes: prev.stakes.filter((s) => s.id !== stakeId),
  }));
  
  if (multiplayer.configured) {
    syncDuel((client, id) => deleteDuelStake(client, id, stakeId));
  } else if (supabaseRef.current) {
    deleteStakeSupabase(supabaseRef.current, stakeId);
  } });

  const updateSupabaseConfig = useStableCallback((config: { url: string; anonKey: string; enabled: boolean }) => { setState((prev) => ({
    ...prev,
    supabaseConfig: config,
  })); });

  const resetToDefaults = useStableCallback(() => { const fresh = getInitialState();
  setState(fresh);
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.error(e);
  } });

  const exportStateToJson = useStableCallback((): string => {
    const { supabaseConfig: _connection, wearableConfig: _wearable, ...backup } = state;
    void _connection; void _wearable;
    return JSON.stringify(backup, null, 2);
  });

  const importStateFromJson = useStableCallback((jsonStr: string): { success: boolean; error?: string } => {
    try {
      const restored = parseBackup(jsonStr);
      const next = { ...restored, supabaseConfig: state.supabaseConfig, wearableConfig: state.wearableConfig };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      setState(next);
      setSoundEnabled(restored.soundEnabled !== false);
      soundEngine.playFanfare();
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Could not restore this backup.' };
    }
  });

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

        if (data.simulated) return { success: true, message: `Preview only: ${data.message} Your progress has not changed.`, result: data };

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


  // Automatically pull Apple Health check-ins queued by background iOS Shortcuts
  useEffect(() => {
    if (!isHydrated || multiplayer.configured) return;

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
  }, [isHydrated, multiplayer.configured]);


  const disconnectGoogleHealth = useStableCallback(() => { if (typeof document !== 'undefined') {
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
  })); });


  // Summaries
  const restDays = state.restDays ?? EMPTY_REST_DAYS;
  const maciekSummary = useMemo(
    () => calculatePlayerScores('maciek', state.checkIns, state.habits, restDays, todayStr),
    [state.checkIns, state.habits, restDays, todayStr]
  );
  const myrnaSummary = useMemo(
    () => calculatePlayerScores('myrna', state.checkIns, state.habits, restDays, todayStr),
    [state.checkIns, state.habits, restDays, todayStr]
  );
  const activePlayerSummary = useMemo(
    () => state.activePlayerId === 'maciek'
      ? maciekSummary
      : state.activePlayerId === 'myrna'
        ? myrnaSummary
        : EMPTY_PLAYER_SUMMARY,
    [state.activePlayerId, maciekSummary, myrnaSummary]
  );

  // Badges
  const maciekBadges = useMemo(
    () => calculatePlayerBadges('maciek', state.checkIns, state.habits, state.stakes, maciekSummary.currentStreak),
    [state.checkIns, state.habits, state.stakes, maciekSummary.currentStreak]
  );

  const myrnaBadges = useMemo(
    () => calculatePlayerBadges('myrna', state.checkIns, state.habits, state.stakes, myrnaSummary.currentStreak),
    [state.checkIns, state.habits, state.stakes, myrnaSummary.currentStreak]
  );

  const activePlayerBadges = state.activePlayerId === 'maciek' ? maciekBadges : myrnaBadges;

  const activeWeeklyStake = state.stakes.find((s) => s.period === 'weekly' && s.status === 'active');
  const activeMonthlyStake = state.stakes.find((s) => s.period === 'monthly' && s.status === 'active');
  const getComparison = useCallback(
    (tier: LeaderboardTier) => getVersusComparison(maciekSummary, myrnaSummary, tier),
    [maciekSummary, myrnaSummary]
  );

 

  const contextValue = useMemo<StoreContextType>(() => ({
    isHydrated, loadedDuelId, syncStatus, storageError,
    supabaseConfig: state.supabaseConfig, activePlayerId: state.activePlayerId, activePlayer,
    players: state.players, habits: state.habits, activeHabits, checkIns: state.checkIns,
    stakes: state.stakes, reactions: state.reactions || [], restDays: state.restDays || [],
    selectedDate, isTodaySelected, setSelectedDate, maciekSummary, myrnaSummary,
    activePlayerSummary, maciekBadges, myrnaBadges, activePlayerBadges, soundEnabled,
    setSoundEnabled, selectProfile, switchProfile, updateLocalPlayerName, updatePlayerColor, toggleHabit,
    updateCheckInNote, isHabitCompletedToday, getHabitCheckInToday, isHabitCompletedOnDate,
    getHabitCheckInOnDate, getCheckInForHabit, getWeeklyHabitCompletions,
    isHabitWeeklyTargetMet, isHabitSatisfiedOnDate, isPartnerConnected, partnerId,
    partnerCleanSpaceHabit, partnerCleanSpaceCheckIn, addReaction, toggleRestDay, isRestDay,
    addHabit, updateHabit, deleteHabit, applyHabitPlan, importPreviousProgress, updateStake,
    addStake, deleteStake, activeWeeklyStake, activeMonthlyStake, getComparison,
    resetToDefaults, updateSupabaseConfig, exportStateToJson, importStateFromJson,
    wearableConfig: state.wearableConfig, syncGoogleHealth, disconnectGoogleHealth,
    themePreference, effectiveTheme, setThemePreference, toggleTheme,
  }), [
    isHydrated, loadedDuelId, syncStatus, storageError, state, activePlayer, activeHabits,
    selectedDate, isTodaySelected, maciekSummary, myrnaSummary, activePlayerSummary,
    maciekBadges, myrnaBadges, activePlayerBadges, soundEnabled, setSoundEnabled,
    selectProfile, switchProfile, updateLocalPlayerName, updatePlayerColor, toggleHabit, updateCheckInNote,
    isHabitCompletedToday, getHabitCheckInToday, isHabitCompletedOnDate, getHabitCheckInOnDate,
    getCheckInForHabit, getWeeklyHabitCompletions, isHabitWeeklyTargetMet, isHabitSatisfiedOnDate,
    isPartnerConnected, partnerId, partnerCleanSpaceHabit, partnerCleanSpaceCheckIn, addReaction,
    toggleRestDay, isRestDay, addHabit, updateHabit, deleteHabit, applyHabitPlan,
    importPreviousProgress, updateStake, addStake, deleteStake, activeWeeklyStake, activeMonthlyStake,
    getComparison, resetToDefaults, updateSupabaseConfig, exportStateToJson, importStateFromJson,
    syncGoogleHealth, disconnectGoogleHealth, themePreference, effectiveTheme, setThemePreference, toggleTheme,
  ]);

  return (
    <StoreContext.Provider value={contextValue}>
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
