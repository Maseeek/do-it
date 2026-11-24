'use client';

import React, { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  AppState,
  CheckIn,
  CouplesReaction,
  Habit,
  LeaderboardTier,
  Player,
  PlayerId,
  PlayerScoreSummary,
  RestDay,
  Stake,
  WearableConfig,
  GoogleHealthSyncResult,
  HealthTelemetryRecord,
  ThemePreference,
  EffectiveTheme,
  PlayerColorId,
  PLAYER_COLORS,
} from './types';
import { isPlayerColorUnlocked } from './player-colors';
import { getDuelPlayers } from './duel-profile';
import { getInitialState } from './seed';
import { getHealthProgressDetails } from './health-correlation';
import { createManualSleepCheckIn, getSleepTarget, isSleepHabit, reconcileSleepTelemetry } from './health-rewards';
import {
  HEALTH_AUTO_SYNC_COOLDOWN_MS,
  HEALTH_AUTO_SYNC_STARTUP_DELAY_MS,
  HEALTH_TELEMETRY_REFRESH_COOLDOWN_MS,
  type HealthAutoSyncDisabledReason,
  hasTelemetryForDate,
  pruneHealthTelemetry,
  resolveClientTimeZone,
  shouldRunAutoHealthSync,
} from './health-auto-sync';
import { isValidHabitPoints, maximumHabitPoints, weeklyPointPotential } from './habit-catalog';
import { parseBackup } from './backup';
import { canImportLegacyDatabase, needsLegacyReplacement, prepareLegacyImport, readLegacyProgress, restoreLegacyDuelProgress } from './legacy-import';
import { getTodayDateString, getWeekKey, isFutureDate, isValidDateString } from './date-utils';
import { calculateHabitStreak, calculatePlayerScores, getVersusComparison } from './score-calculator';
import { indexCheckIns } from './check-in-index';
import { getStakePhase, settleDueStakes } from './stake-settlement';
import {
  rebalanceWeeklyHabitCheckIns,
  rebalanceAllWeeklyCheckIns,
} from './weekly-utils';
import { soundEngine } from './sound-utils';
import { hapticLight, hapticMedium, hapticSuccess } from './haptic-utils';
import { getSupabaseClient } from './supabase';
import { useMultiplayer } from './multiplayer';
import { loadDuelData, syncDuelData, loadDuelProof, saveDuelCheckIns, saveDuelHabit, deleteDuelHabit, saveDuelCheckIn, deleteDuelCheckIn, saveDuelStake, deleteDuelStake, saveDuelReaction, saveDuelRestDay, deleteDuelRestDay } from './duel-sync';
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

import {
  applyLocalStakeDelete,
  applyLocalStakeSave,
  proofPhotos,
  proofReference,
  replaceOptimisticStake,
  shouldSyncRevision,
  stakesEqual,
  type DuelData,
  type DuelSnapshot,
} from './duel-data';
import { readDuelCache, writeDuelCache, duelCacheKey } from './duel-cache';
import { createSyncScheduler } from './sync-scheduler';

const STORAGE_KEY = 'do_it_app_data_v2';
const HEALTH_LAST_CHECKED_PREFIX = 'do_it_health_last_checked:';
const HEALTH_TELEMETRY_PREFIX = 'do_it_health_telemetry:';
const HEALTH_CONNECTED_PREFIX = 'do_it_health_connected:';
const EMPTY_REST_DAYS: RestDay[] = [];

function readStoredGoogleConnected(accountId: string | undefined): boolean {
  if (!accountId || typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(`${HEALTH_CONNECTED_PREFIX}${accountId}`) === 'true';
  } catch {
    return false;
  }
}

function writeStoredGoogleConnected(accountId: string | undefined, connected: boolean | undefined) {
  if (!accountId || typeof window === 'undefined' || connected === undefined) return;
  try {
    if (connected) localStorage.setItem(`${HEALTH_CONNECTED_PREFIX}${accountId}`, 'true');
    else localStorage.removeItem(`${HEALTH_CONNECTED_PREFIX}${accountId}`);
  } catch {
    // Browser storage may be restricted.
  }
}

function readStoredHealthCheckedAt(accountId: string | undefined): string | null {
  if (!accountId || typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(`${HEALTH_LAST_CHECKED_PREFIX}${accountId}`);
  } catch {
    return null;
  }
}

function writeStoredHealthCheckedAt(accountId: string | undefined, value: string | null) {
  if (!accountId || typeof window === 'undefined') return;
  try {
    if (value) localStorage.setItem(`${HEALTH_LAST_CHECKED_PREFIX}${accountId}`, value);
    else localStorage.removeItem(`${HEALTH_LAST_CHECKED_PREFIX}${accountId}`);
  } catch {
    // Browser storage may be restricted; server-side cooldown remains authoritative.
  }
}

function readStoredHealthTelemetry(accountId: string | undefined, today: string): Record<string, HealthTelemetryRecord> {
  if (!accountId || typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(`${HEALTH_TELEMETRY_PREFIX}${accountId}`);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, HealthTelemetryRecord>;
    return pruneHealthTelemetry(parsed, today);
  } catch {
    return {};
  }
}

function writeStoredHealthTelemetry(
  accountId: string | undefined,
  records: Record<string, HealthTelemetryRecord> | null,
  today: string,
) {
  if (!accountId || typeof window === 'undefined') return;
  try {
    if (!records) {
      localStorage.removeItem(`${HEALTH_TELEMETRY_PREFIX}${accountId}`);
      return;
    }
    const pruned = pruneHealthTelemetry(records, today);
    if (Object.keys(pruned).length === 0) {
      localStorage.removeItem(`${HEALTH_TELEMETRY_PREFIX}${accountId}`);
    } else {
      localStorage.setItem(`${HEALTH_TELEMETRY_PREFIX}${accountId}`, JSON.stringify(pruned));
    }
  } catch {
    // Browser storage may be restricted.
  }
}
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
  getHabitStreak: (habit: Habit, today?: string) => number;
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  selectProfile: (id: PlayerId) => void;
  switchProfile: () => void;
  updateLocalPlayerName: (name: string) => void;
  updatePlayerColor: (colorId: PlayerColorId) => Promise<void>;
  toggleHabit: (
    habitId: string,
    proofUrl?: string | string[],
    quantity?: number,
    note?: string,
    targetDate?: string
  ) => void;
  logSleepHours: (habitId: string, hours: number, targetDate?: string) => void;
  setGoogleHealthConnected: (connected: boolean) => void;
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
  resolveProofImages: (images: string[]) => Promise<string[]>;
  exportStateToJson: () => Promise<string>;
  importStateFromJson: (jsonStr: string) => { success: boolean; error?: string };
  wearableConfig: WearableConfig | undefined;
  healthAttentionMessage: string | null;
  healthTelemetry?: Record<string, HealthTelemetryRecord>;
  getHealthTelemetryOnDate: (habitId: string, date?: string) => HealthTelemetryRecord | undefined;
  setHealthTelemetry: (record: HealthTelemetryRecord) => void;
  clearHealthTelemetry: (habitId: string, date?: string) => void;
  syncGoogleHealth: (
    simulate?: boolean,
    simulateUnder?: boolean,
    options?: { auto?: boolean; needTelemetry?: boolean; date?: string }
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
  const [state, setState] = useState<AppState>(getInitialState);
  const [isHydrated, setIsHydrated] = useState(false);
  const [loadedDuelId, setLoadedDuelId] = useState<string | null>(null);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('local_only');
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString());
  const [soundEnabled, setSoundEnabledState] = useState<boolean>(true);
  const [themePreference, setThemePreferenceState] = useState<ThemePreference>('system');
  const [effectiveTheme, setEffectiveTheme] = useState<EffectiveTheme>('dark');
  const [healthAttentionMessage, setHealthAttentionMessage] = useState<string | null>(null);

  const supabaseRef = useRef(getSupabaseClient());
  const duelQueueRef = useRef<Promise<void>>(Promise.resolve());
  const stateDuelRef = useRef<string | null>(null);
  const stateSlotRef = useRef<PlayerId | null>(null);
  const restorationInProgressRef = useRef<Record<string, boolean>>({});
  const writeEpochRef = useRef(0);
  const syncSchedulerRef = useRef<ReturnType<typeof createSyncScheduler> | null>(null);
  const duelSyncStateRef = useRef<{ duelId: string; snapshot: DuelSnapshot | null; cacheKey: string } | null>(null);
  const proofCacheRef = useRef(new Map<string, Promise<string[]>>());
  const autoHealthRef = useRef<{
    accountId: string | undefined;
    inFlight: boolean;
    lastAttemptAt: number;
    lastCheckedAt: string | null;
    disabledReason: HealthAutoSyncDisabledReason | null;
  }>({
    accountId: undefined,
    inFlight: false,
    lastAttemptAt: 0,
    lastCheckedAt: null,
    disabledReason: null,
  });

  // 1. Hydrate from localStorage on client mount
  useEffect(() => {
    try {
      const saved = multiplayer.configured ? null : localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.players && parsed.players.maciek && parsed.players.myrna) {
          const habitsToUse = parsed.habits || [];
          let checkInsToUse = parsed.checkIns || [];
          for (const record of Object.values<HealthTelemetryRecord>(parsed.healthTelemetry || {})) {
            const habit = habitsToUse.find((item: Habit) => item.id === record.habitId && item.playerId === record.playerId);
            if (habit) checkInsToUse = reconcileSleepTelemetry(checkInsToUse, habit, record);
          }
          const rebalanced = rebalanceAllWeeklyCheckIns(checkInsToUse, habitsToUse);
          setState((prev) => ({
            ...prev,
            ...parsed,
            checkIns: rebalanced,
            reactions: parsed.reactions || prev.reactions || [],
            restDays: parsed.restDays || prev.restDays || [],
            healthTelemetry: parsed.healthTelemetry || prev.healthTelemetry || {},
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

  const playerSlot = multiplayer.slot;
  const accountId = multiplayer.user?.id;
  const paired = multiplayer.hasPairedPartner;
  useEffect(() => {
    if (!isHydrated || !multiplayer.configured) return;
    const client = getSupabaseClient();
    supabaseRef.current = null;
    if (!client || !duelId || !playerSlot || !accountId) {
      setLoadedDuelId(null);
      setSyncStatus('local_only');
      proofCacheRef.current.clear();
      return;
    }
    let cancelled = false;
    let subscribed = false;
    let hasSubscribedOnce = false;
    let wasDisconnected = false;
    const key = duelCacheKey(process.env.NEXT_PUBLIC_SUPABASE_URL || '', accountId, duelId);
    const syncState: { duelId: string; snapshot: DuelSnapshot | null; cacheKey: string } = {
      duelId,
      snapshot: null,
      cacheKey: key,
    };
    duelSyncStateRef.current = syncState;
    proofCacheRef.current.clear();
    const publish = (data: DuelData) => {
      const sameDuel = stateDuelRef.current === duelId && stateSlotRef.current === playerSlot;
      stateDuelRef.current = duelId;
      stateSlotRef.current = playerSlot;
      setState(prev => ({
        ...(sameDuel ? prev : getInitialState()),
        activePlayerId: playerSlot,
        players: sameDuel ? prev.players : getInitialState().players,
        healthTelemetry: sameDuel ? prev.healthTelemetry : readStoredHealthTelemetry(accountId, getTodayDateString()),
        wearableConfig: sameDuel
          ? prev.wearableConfig
          : { ...getInitialState().wearableConfig, googleConnected: readStoredGoogleConnected(accountId) },
        habits: paired ? data.habits : data.habits.filter(h => h.playerId === playerSlot),
        checkIns: paired ? data.checkIns : data.checkIns.filter(c => c.playerId === playerSlot),
        stakes: data.stakes,
        reactions: paired ? data.reactions : data.reactions.filter(r => r.fromPlayerId === playerSlot && r.toPlayerId === playerSlot),
        restDays: paired ? data.restDays : data.restDays.filter(r => r.playerId === playerSlot),
      }));
      setLoadedDuelId(duelId);
    };
    setLoadedDuelId(null);
    setSyncStatus('syncing');
    const ready = readDuelCache(key).then(cached => {
      if (cancelled || !cached || typeof cached.cursor !== 'string' || !cached.data?.checkIns) return;
      syncState.snapshot = cached;
      publish(cached.data);
    }).catch(() => { /* A denied device cache still permits cloud synchronization. */ });
    const scheduler = createSyncScheduler({
      active: () => document.visibilityState !== 'hidden' && navigator.onLine,
      subscribed: () => subscribed,
      failed: error => { if (!cancelled) { setSyncStatus('offline'); setStorageError(error instanceof Error ? error.message : 'Could not synchronize your Duel.'); } },
      read: async () => {
        await ready;
        await duelQueueRef.current;
        if (cancelled) return;
        const epoch = writeEpochRef.current;
        let next = await syncDuelData(client, duelId, syncState.snapshot);
        const restoreKey = duelId + ':' + playerSlot;
        if (canImportLegacyDatabase(playerSlot, multiplayer.user?.email) && needsLegacyReplacement(playerSlot, next.data.habits) && !restorationInProgressRef.current[restoreKey]) {
          restorationInProgressRef.current[restoreKey] = true;
          try {
            await restoreLegacyDuelProgress(client, duelId, playerSlot, next.data.habits, next.data.checkIns);
            next = await syncDuelData(client, duelId, next);
          } finally { delete restorationInProgressRef.current[restoreKey]; }
        }
        if (cancelled) return;
        if (writeEpochRef.current !== epoch) { scheduler.request(); return; }
        const changed = syncState.snapshot?.cursor !== next.cursor;
        syncState.snapshot = next;
        if (changed) {
          publish(next.data);
          await writeDuelCache(key, next).catch(() => {});
        }
        if (!cancelled) { setSyncStatus('connected'); setStorageError(null); }
      },
    });
    syncSchedulerRef.current = scheduler;
    const channel = client.channel('duel-revision-' + duelId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'duel_sync_heads', filter: 'duel_id=eq.' + duelId }, (payload) => {
        const remoteRevision = (payload.new as { revision?: string | number } | null)?.revision;
        if (shouldSyncRevision(syncState.snapshot?.cursor, remoteRevision)) {
          scheduler.request();
        }
      })
      .subscribe(status => {
        if (status === 'SUBSCRIBED') {
          subscribed = true;
          if (hasSubscribedOnce && wasDisconnected) scheduler.request();
          hasSubscribedOnce = true;
          wasDisconnected = false;
        } else {
          subscribed = false;
          if (hasSubscribedOnce && (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED')) {
            wasDisconnected = true;
          }
        }
      });
    const wake = () => { if (document.visibilityState === 'hidden' || !navigator.onLine) scheduler.pause(); else scheduler.request(); };
    document.addEventListener('visibilitychange', wake);
    window.addEventListener('online', wake);
    window.addEventListener('offline', wake);
    scheduler.request();
    return () => {
      cancelled = true;
      scheduler.stop();
      if (syncSchedulerRef.current === scheduler) syncSchedulerRef.current = null;
      if (duelSyncStateRef.current === syncState) duelSyncStateRef.current = null;
      document.removeEventListener('visibilitychange', wake);
      window.removeEventListener('online', wake);
      window.removeEventListener('offline', wake);
      void client.removeChannel(channel);
    };
  }, [isHydrated, multiplayer.configured, duelId, playerSlot, accountId, paired, multiplayer.user?.email]);

  const syncDuel = (operation: (client: NonNullable<ReturnType<typeof getSupabaseClient>>, id: string) => Promise<void | 'synced'>) => {
    const client = getSupabaseClient();
    if (!multiplayer.configured || !client || !duelId) return;
    writeEpochRef.current++;
    duelQueueRef.current = duelQueueRef.current
      .then(() => operation(client, duelId))
      .then(outcome => {
        if (outcome === 'synced') {
          setSyncStatus('connected');
          setStorageError(null);
        } else {
          syncSchedulerRef.current?.request();
        }
      })
      .catch(error => {
        setSyncStatus('offline');
        setStorageError(error instanceof Error ? error.message : 'Could not save duel change.');
        syncSchedulerRef.current?.request();
      });
  };

  const resolveProofImages = useStableCallback(async (images: string[]) => {
    const client = getSupabaseClient();
    return Promise.all(images.map(async image => {
      const reference = proofReference(image);
      if (!reference) return image;
      if (!client || !duelId || !multiplayer.user) throw new Error('Sign in to view these proof photos.');
      const key = multiplayer.user.id + ':' + duelId + ':' + reference.id + ':' + reference.version;
      let request = proofCacheRef.current.get(key);
      if (!request) {
        request = loadDuelProof(client, duelId, reference.id);
        proofCacheRef.current.set(key, request);
        request.catch(() => proofCacheRef.current.delete(key));
      }
      const photos = await request;
      if (!photos[reference.index]) throw new Error('This proof photo is unavailable.');
      return photos[reference.index];
    }));
  });

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

  const players = useMemo(() => multiplayer.configured && multiplayer.duel
    ? getDuelPlayers(state.players, multiplayer.duel) : state.players,
  [state.players, multiplayer.configured, multiplayer.duel]);
  const activePlayer = state.activePlayerId ? players[state.activePlayerId] : null;

  const activeHabits = useMemo(
    () => state.activePlayerId
      ? state.habits.filter((h) => h.playerId === state.activePlayerId && h.isActive).sort((a, b) => a.order - b.order)
      : [],
    [state.activePlayerId, state.habits]
  );
  const todayStr = getTodayDateString();
  const isTodaySelected = selectedDate === todayStr;
  const checkInIndex = useMemo(() => indexCheckIns(state.checkIns), [state.checkIns]);

  const isHabitCompletedToday = useCallback(
    (habitId: string): boolean => checkInIndex.byHabitAndDate.get(habitId)?.has(todayStr) ?? false,
    [checkInIndex, todayStr]
  );

  const getHabitCheckInToday = useCallback(
    (habitId: string): CheckIn | undefined => checkInIndex.byHabitAndDate.get(habitId)?.get(todayStr),
    [checkInIndex, todayStr]
  );

  const isHabitCompletedOnDate = useCallback(
    (habitId: string, date: string): boolean => checkInIndex.byHabitAndDate.get(habitId)?.has(date) ?? false,
    [checkInIndex]
  );

  const getHabitCheckInOnDate = useCallback(
    (habitId: string, date: string): CheckIn | undefined => checkInIndex.byHabitAndDate.get(habitId)?.get(date),
    [checkInIndex]
  );

  const getCheckInForHabit = useCallback(
    (habitId: string, date = selectedDate): CheckIn | undefined => checkInIndex.byHabitAndDate.get(habitId)?.get(date),
    [checkInIndex, selectedDate]
  );

  const getWeeklyHabitCompletions = useCallback(
    (habitId: string, date = selectedDate): number => checkInIndex.weeklyDates.get(habitId)?.get(getWeekKey(date))?.size ?? 0,
    [checkInIndex, selectedDate]
  );

  const isHabitWeeklyTargetMet = useCallback((habitId: string, date = selectedDate): boolean => {
    const habit = state.habits.find((h) => h.id === habitId);
    if (!habit) return false;
    return !!habit.weeklyTargetDays && habit.weeklyTargetDays > 0 && getWeeklyHabitCompletions(habitId, date) >= habit.weeklyTargetDays;
  }, [state.habits, getWeeklyHabitCompletions, selectedDate]);

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
    ? checkInIndex.byHabitAndDate.get(partnerCleanSpaceHabit.id)?.get(selectedDate)
    : undefined;

  const getHealthTelemetryOnDate = useCallback(
    (habitId: string, date = selectedDate): HealthTelemetryRecord | undefined => {
      return state.healthTelemetry?.[`${habitId}:${date}`];
    },
    [state.healthTelemetry, selectedDate]
  );

  const setHealthTelemetry = useStableCallback((record: HealthTelemetryRecord) => {
    setState((prev) => {
      const habit = prev.habits.find(item => item.id === record.habitId && item.playerId === record.playerId);
      const checkIns = habit ? reconcileSleepTelemetry(prev.checkIns, habit, record) : prev.checkIns;
      return {
        ...prev,
        checkIns: habit ? rebalanceWeeklyHabitCheckIns(checkIns, habit, getWeekKey(record.date)) : checkIns,
        healthTelemetry: { ...prev.healthTelemetry, [`${record.habitId}:${record.date}`]: record },
      };
    });
  });

  const clearHealthTelemetry = useStableCallback((habitId: string, date = selectedDate) => {
    setState((prev) => {
      if (!prev.healthTelemetry) return prev;
      const next = { ...prev.healthTelemetry };
      delete next[`${habitId}:${date}`];
      const habit = prev.habits.find(item => item.id === habitId);
      const checkIns = prev.checkIns.filter(entry => !(entry.habitId === habitId && entry.date === date && entry.source === 'google_health'));
      return {
        ...prev,
        healthTelemetry: next,
        checkIns: habit ? rebalanceWeeklyHabitCheckIns(checkIns, habit, getWeekKey(date)) : checkIns,
      };
    });
  });

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
  const existingCheckIn = checkInIndex.byHabitAndDate.get(habitId)?.get(targetDate);

  const telemetry = state.healthTelemetry?.[`${habitId}:${targetDate}`];
  const healthProgress = getHealthProgressDetails(habit, telemetry, existingCheckIn);
  // Sleep rewards are imported automatically. Manual actions cannot upgrade or remove them.
  if (healthProgress?.metric === 'sleep' || (!existingCheckIn && healthProgress?.isLocked)) {
    soundEngine.playUncheck();
    hapticLight();
    return;
  }
  
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
      rebalanced.forEach((c, index) => {
        const orig = nextCheckIns[index];
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
        await saveDuelCheckIns(client, id, syncedCheckIns);
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
      rebalanced.forEach((c, index) => {
        const orig = nextCheckIns[index];
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
        await saveDuelCheckIns(client, id, [...syncedCheckIns, nextCheckIns.find((c) => c.id === existingCheckIn.id) || updatedCheckIn]);
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
  
    // Sound & feedback: every check-in gets the same quiet confirmation; reaching par is celebrated on Today.
    soundEngine.playCheck();
    hapticSuccess();
  
    let nextCheckIns = [...state.checkIns, newCheckIn];
    const syncedCheckIns: CheckIn[] = [];
  
    if (habit.weeklyTargetDays && habit.weeklyTargetDays > 0) {
      const rebalanced = rebalanceWeeklyHabitCheckIns(nextCheckIns, habit, targetWeekKey);
      rebalanced.forEach((c, index) => {
        const orig = nextCheckIns[index];
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
        await saveDuelCheckIns(client, id, [...syncedCheckIns, nextCheckIns.find((c) => c.id === newCheckIn.id) || newCheckIn]);
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

  const logSleepHours = useStableCallback((habitId: string, hours: number, targetDate = selectedDate) => {
    if (!state.activePlayerId) return;
    if (!isValidDateString(targetDate) || isFutureDate(targetDate)) return;
    if (!Number.isFinite(hours) || hours < 0) return;

    const habit = state.habits.find((h) => h.id === habitId);
    if (!habit || !habit.isActive || habit.playerId !== state.activePlayerId || !isSleepHabit(habit)) return;

    const targetWeekKey = getWeekKey(targetDate);
    const existingCheckIn = checkInIndex.byHabitAndDate.get(habitId)?.get(targetDate);
    const telemetry = state.healthTelemetry?.[`${habitId}:${targetDate}`];
    const healthProgress = getHealthProgressDetails(habit, telemetry, existingCheckIn);
    if (healthProgress?.metric === 'sleep') {
      soundEngine.playUncheck();
      hapticLight();
      return;
    }

    const nextCheckIn = createManualSleepCheckIn(habit, targetDate, hours, existingCheckIn, { today: todayStr });

    if (!nextCheckIn) {
      if (!existingCheckIn) return;
      soundEngine.playUncheck();
      hapticLight();

      let nextCheckIns = state.checkIns.filter((c) => c.id !== existingCheckIn.id);
      const syncedCheckIns: CheckIn[] = [];
      if (habit.weeklyTargetDays && habit.weeklyTargetDays > 0) {
        const rebalanced = rebalanceWeeklyHabitCheckIns(nextCheckIns, habit, targetWeekKey);
        rebalanced.forEach((c, index) => {
          const orig = nextCheckIns[index];
          if (orig && orig.pointsEarned !== c.pointsEarned) {
            syncedCheckIns.push(c);
          }
        });
        nextCheckIns = rebalanced;
      }

      setState((prev) => ({ ...prev, checkIns: nextCheckIns }));

      if (multiplayer.configured) {
        syncDuel(async (client, id) => {
          await deleteDuelCheckIn(client, id, existingCheckIn.id);
          await saveDuelCheckIns(client, id, syncedCheckIns);
        });
      } else if (supabaseRef.current) {
        deleteCheckInSupabase(supabaseRef.current, habitId, targetDate);
        syncedCheckIns.forEach((c) => {
          insertCheckInSupabase(supabaseRef.current!, c);
        });
      }
      return;
    }

    if (existingCheckIn) {
      soundEngine.playCheck();
      hapticLight();
    } else {
      soundEngine.playCheck();
      hapticSuccess();
    }

    let nextCheckIns = existingCheckIn
      ? state.checkIns.map((c) => (c.id === existingCheckIn.id ? nextCheckIn : c))
      : [...state.checkIns, nextCheckIn];
    const syncedCheckIns: CheckIn[] = [];

    if (habit.weeklyTargetDays && habit.weeklyTargetDays > 0) {
      const rebalanced = rebalanceWeeklyHabitCheckIns(nextCheckIns, habit, targetWeekKey);
      rebalanced.forEach((c, index) => {
        const orig = nextCheckIns[index];
        if (orig && orig.pointsEarned !== c.pointsEarned) {
          syncedCheckIns.push(c);
        }
      });
      nextCheckIns = rebalanced;
    }

    const finalEntry = nextCheckIns.find((c) => c.id === nextCheckIn.id) || nextCheckIn;
    setState((prev) => ({ ...prev, checkIns: nextCheckIns }));

    if (multiplayer.configured) {
      syncDuel(async (client, id) => {
        await saveDuelCheckIns(client, id, [...syncedCheckIns, finalEntry]);
      });
    } else if (supabaseRef.current) {
      insertCheckInSupabase(supabaseRef.current, finalEntry);
      syncedCheckIns.forEach((c) => {
        if (c.id !== finalEntry.id) {
          insertCheckInSupabase(supabaseRef.current!, c);
        }
      });
    }
  });

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

  const updateHabit = useStableCallback((updatedHabit: Habit) => {
    const previousHabit = state.habits.find(h => h.id === updatedHabit.id);
    if (multiplayer.configured && (updatedHabit.playerId !== multiplayer.slot || previousHabit?.playerId !== multiplayer.slot)) return;
    soundEngine.playClick();

    // When a player changes their sleep target, recalculate today's (selectedDate) manual sleep check-in if present.
    let updatedCheckIn: CheckIn | null = null;
    let deletedCheckInId: string | null = null;
    const syncedCheckIns: CheckIn[] = [];
    let nextCheckIns = state.checkIns;

    if (
      previousHabit &&
      isSleepHabit(updatedHabit) &&
      getSleepTarget(previousHabit) !== getSleepTarget(updatedHabit)
    ) {
      const currentEntry = checkInIndex.byHabitAndDate.get(updatedHabit.id)?.get(selectedDate);
      if (currentEntry && currentEntry.source !== 'google_health' && typeof currentEntry.healthValue === 'number' && Number.isFinite(currentEntry.healthValue)) {
        const recalculated = createManualSleepCheckIn(updatedHabit, selectedDate, currentEntry.healthValue, currentEntry, { today: todayStr });
        if (recalculated) {
          nextCheckIns = state.checkIns.map((c) => (c.id === currentEntry.id ? recalculated : c));
          if (updatedHabit.weeklyTargetDays && updatedHabit.weeklyTargetDays > 0) {
            const rebalanced = rebalanceWeeklyHabitCheckIns(nextCheckIns, updatedHabit, getWeekKey(selectedDate));
            rebalanced.forEach((c, index) => {
              const orig = nextCheckIns[index];
              if (orig && orig.pointsEarned !== c.pointsEarned) syncedCheckIns.push(c);
            });
            nextCheckIns = rebalanced;
          }
          updatedCheckIn = nextCheckIns.find((c) => c.id === currentEntry.id) || recalculated;
        } else {
          deletedCheckInId = currentEntry.id;
          nextCheckIns = state.checkIns.filter((c) => c.id !== currentEntry.id);
          if (updatedHabit.weeklyTargetDays && updatedHabit.weeklyTargetDays > 0) {
            const rebalanced = rebalanceWeeklyHabitCheckIns(nextCheckIns, updatedHabit, getWeekKey(selectedDate));
            rebalanced.forEach((c, index) => {
              const orig = nextCheckIns[index];
              if (orig && orig.pointsEarned !== c.pointsEarned) syncedCheckIns.push(c);
            });
            nextCheckIns = rebalanced;
          }
        }
      }
    }

    setState((prev) => ({
      ...prev,
      habits: prev.habits.map((h) => (h.id === updatedHabit.id ? updatedHabit : h)),
      ...(updatedCheckIn || deletedCheckInId ? { checkIns: nextCheckIns } : {}),
    }));

    if (multiplayer.configured) {
      syncDuel(async (client, id) => {
        await saveDuelHabit(client, id, updatedHabit);
        if (deletedCheckInId) {
          await deleteDuelCheckIn(client, id, deletedCheckInId);
          await saveDuelCheckIns(client, id, syncedCheckIns);
        } else if (updatedCheckIn) {
          await saveDuelCheckIns(client, id, [...syncedCheckIns, updatedCheckIn]);
        }
      });
    } else if (supabaseRef.current) {
      upsertHabitSupabase(supabaseRef.current, updatedHabit);
      if (deletedCheckInId) {
        deleteCheckInSupabase(supabaseRef.current, updatedHabit.id, selectedDate);
        syncedCheckIns.forEach((c) => insertCheckInSupabase(supabaseRef.current!, c));
      } else if (updatedCheckIn) {
        insertCheckInSupabase(supabaseRef.current, updatedCheckIn);
        syncedCheckIns.forEach((c) => {
          if (c.id !== updatedCheckIn!.id) insertCheckInSupabase(supabaseRef.current!, c);
        });
      }
    }
  });

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
  const updatePlayerColor = useStableCallback(async (colorId: PlayerColorId) => {
    if (!state.activePlayerId) throw new Error('Choose a profile first.');
    const color = PLAYER_COLORS.find(option => option.id === colorId);
    const karma = state.checkIns.filter(checkIn => checkIn.playerId === state.activePlayerId).reduce((sum, checkIn) => sum + checkIn.pointsEarned, 0);
    const inviteCount = players[state.activePlayerId]?.inviteCount ?? 0;
    if (!color || !isPlayerColorUnlocked(colorId, karma, inviteCount)) throw new Error('That color is still locked.');
    const opponentId = state.activePlayerId === 'maciek' ? 'myrna' : 'maciek';
    if (isPartnerConnected && players[opponentId].color === color.color) throw new Error('Your opponent is already using that colour. Choose another.');
    if (multiplayer.configured) {
      if (state.activePlayerId !== multiplayer.slot) throw new Error('Choose your own profile first.');
      await multiplayer.updatePlayerColor(colorId);
      return;
    }
    const id = state.activePlayerId;
    setState(prev => ({ ...prev, players: { ...prev.players, [id]: { ...prev.players[id], color: color.color, accentBg: color.accentBg, accentBorder: color.accentBorder } } }));
  });

  const applyHabitPlan = useStableCallback(async (plannedHabits: Habit[]) => { const playerId = state.activePlayerId;
  if (!playerId || (multiplayer.configured && playerId !== multiplayer.slot)) throw new Error('Choose your own profile first.');
  if (plannedHabits.some(habit => habit.playerId !== playerId)) throw new Error('Choose your own profile first.');
  const invalid = plannedHabits.find(habit => habit.isActive && !isValidHabitPoints(habit));
  if (invalid) throw new Error(`${invalid.title} needs a whole number of points from 5 to ${maximumHabitPoints(invalid)}.`);
  // Points on an unselected habit do not count, so an abandoned edit there must not block saving.
  const planned = plannedHabits.map(habit => habit.isActive || isValidHabitPoints(habit)
    ? habit
    : { ...habit, points: Math.min(maximumHabitPoints(habit), Math.max(5, Math.round(habit.points) || 5)) });
  const total = weeklyPointPotential(planned);
  const partnerSlot = playerId === 'maciek' ? 'myrna' : 'maciek';
  const partnerTotal = (!multiplayer.configured || multiplayer.hasPairedPartner)
    ? weeklyPointPotential(state.habits.filter(habit => habit.playerId === partnerSlot))
    : 0;
  if (total === 0) throw new Error('Choose at least one habit.');
  if (partnerTotal > 0 && total !== partnerTotal) throw new Error(`Your weekly point potential needs to match your partner’s ${partnerTotal} points.`);
  const previous = state.habits.filter(habit => habit.playerId === playerId);
  const plannedIds = new Set(planned.map(habit => habit.id));
  const next = [...planned, ...previous.filter(habit => !plannedIds.has(habit.id)).map(habit => ({ ...habit, isActive: false }))];
  if (multiplayer.configured) {
    const client = getSupabaseClient();
    if (!client || !duelId) throw new Error('Your account is not connected. Try again.');
    // A sync read already in flight holds the old plan; bumping the epoch makes it retry instead of publishing it.
    writeEpochRef.current++;
    const save = duelQueueRef.current.then(async () => {
      const { error } = await client.from('duel_habits').upsert(next.map(habit => ({ duel_id: duelId, id: habit.id, player_slot: playerId, data: habit })));
      if (error) throw error;
    });
    duelQueueRef.current = save.catch(() => {}).finally(() => syncSchedulerRef.current?.request());
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

  const syncStakeSave = (optimisticId: string, stake: Stake) => {
    syncDuel(async (client, id) => {
      const result = await saveDuelStake(client, id, stake);
      if (!result) return;
      if (result.stake.id !== optimisticId || !stakesEqual(result.stake, stake)) {
        setState((prev) => ({
          ...prev,
          stakes: replaceOptimisticStake(prev.stakes, optimisticId, result.stake),
        }));
      }
      const syncState = duelSyncStateRef.current;
      if (syncState && syncState.duelId === id) {
        const fastForwarded = applyLocalStakeSave(syncState.snapshot, result, optimisticId);
        if (fastForwarded) {
          syncState.snapshot = fastForwarded;
          if (result.changed) {
            await writeDuelCache(syncState.cacheKey, fastForwarded).catch(() => {});
          }
          return 'synced';
        }
      }
    });
  };

  const updateStake = useStableCallback((updatedStake: Stake) => { soundEngine.playClick();
  const existing = state.stakes.find((s) => s.id === updatedStake.id);
  if (existing && stakesEqual(existing, updatedStake)) return;
  setState((prev) => ({
    ...prev,
    stakes: prev.stakes.map((s) => (s.id === updatedStake.id ? updatedStake : s)),
  }));
  
  if (multiplayer.configured) {
    syncStakeSave(updatedStake.id, updatedStake);
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
    syncStakeSave(id, fullStake);
  } else if (supabaseRef.current) {
    upsertStakeSupabase(supabaseRef.current, fullStake);
  } });

  const deleteStake = useStableCallback((stakeId: string) => { soundEngine.playClick();
  setState((prev) => ({
    ...prev,
    stakes: prev.stakes.filter((s) => s.id !== stakeId),
  }));
  
  if (multiplayer.configured) {
    syncDuel(async (client, id) => {
      const result = await deleteDuelStake(client, id, stakeId);
      if (!result) return;
      const syncState = duelSyncStateRef.current;
      if (syncState && syncState.duelId === id) {
        const fastForwarded = applyLocalStakeDelete(syncState.snapshot, result, stakeId);
        if (fastForwarded) {
          syncState.snapshot = fastForwarded;
          if (result.deleted) {
            await writeDuelCache(syncState.cacheKey, fastForwarded).catch(() => {});
          }
          return 'synced';
        }
      }
    });
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

  const exportStateToJson = useStableCallback(async (): Promise<string> => {
    const { supabaseConfig: _connection, wearableConfig: _wearable, ...backup } = state;
    void _connection; void _wearable;
    const checkIns = [...backup.checkIns];
    // Explicit backup exports include every original photo, with bounded requests.
    for (let offset = 0; offset < checkIns.length; offset += 4) {
      await Promise.all(checkIns.slice(offset, offset + 4).map(async (checkIn, index) => {
        const photos = await resolveProofImages(proofPhotos(checkIn));
        checkIns[offset + index] = { ...checkIn, proofUrls: photos.length ? photos : undefined, proofUrl: photos[0] };
      }));
    }
    return JSON.stringify({ ...backup, checkIns }, null, 2);
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
      simulateUnder = false,
      options?: { auto?: boolean; needTelemetry?: boolean; date?: string }
    ): Promise<{ success: boolean; message: string; count?: number; result?: GoogleHealthSyncResult }> => {
      const isAuto = Boolean(options?.auto) && !simulate && !simulateUnder;
      try {
        const params = new URLSearchParams();
        if (isAuto) {
          params.set('auto', 'true');
          if (options?.needTelemetry) params.set('needTelemetry', 'true');
        } else {
          params.set('date', options?.date ?? selectedDate);
        }
        if (simulate) params.set('simulate', 'true');
        if (simulateUnder) params.set('simulateUnder', 'true');

        if (!isAuto && !simulate && !simulateUnder) {
          autoHealthRef.current.disabledReason = null;
        }

        const url = `/api/sync/google-health?${params.toString()}`;
        const client = getSupabaseClient();
        const session = (await client?.auth.getSession())?.data.session;
        const headers: Record<string, string> = {};
        if (session) headers.Authorization = `Bearer ${session.access_token}`;
        let body: string | undefined;
        if (!simulate && !simulateUnder) {
          headers['Content-Type'] = 'application/json';
          body = JSON.stringify({
            timeZone: resolveClientTimeZone(),
            ...(isAuto ? { auto: true, ...(options?.needTelemetry ? { needTelemetry: true } : {}) } : {}),
          });
        }

        const res = await fetch(url, {
          method: 'POST',
          cache: 'no-store',
          headers,
          body,
        });
        const data: GoogleHealthSyncResult = await res.json();

        if (!res.ok || !data.success) {
          const message = data.error || data.message || 'Failed to sync with Google Health.';
          if (isAuto && res.status !== 401) {
            setHealthAttentionMessage(message);
          }
          return {
            success: false,
            message,
            result: data,
          };
        }

        if (data.simulated) return { success: true, message: `Preview only: ${data.message} Your progress has not changed.`, result: data };

        if (data.available === false) {
          autoHealthRef.current.disabledReason = 'unavailable';
          setHealthAttentionMessage(null);
        } else if (data.connected === false) {
          autoHealthRef.current.disabledReason = 'not_connected';
          setHealthAttentionMessage(null);
        } else if (data.reason === 'needs_attention') {
          autoHealthRef.current.disabledReason = 'needs_attention';
          setHealthAttentionMessage(data.message || 'Google Health permission needs attention. Reconnect in Settings.');
        } else {
          autoHealthRef.current.disabledReason = null;
          setHealthAttentionMessage(data.needsAttention ? (data.message || 'Some Google Health permissions are missing. Reconnect in Settings.') : null);
        }

        if (data.lastCheckedAt) {
          autoHealthRef.current.lastCheckedAt = data.lastCheckedAt;
          writeStoredHealthCheckedAt(accountId, data.lastCheckedAt);
        }

        if (data.skipped) {
          if (data.connected !== undefined) {
            writeStoredGoogleConnected(accountId, data.connected);
          }
          if (data.connected !== undefined || data.lastCheckedAt) {
            setState((prev) => ({
              ...prev,
              wearableConfig: {
                ...prev.wearableConfig,
                ...(data.connected !== undefined ? { googleConnected: data.connected } : {}),
                ...(data.lastCheckedAt ? { googleLastCheckedAt: data.lastCheckedAt } : {}),
              },
            }));
          }
          return {
            success: true,
            message: data.message || 'Google Health was checked recently.',
            count: 0,
            result: data,
          };
        }

        const syncTimeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const checkedAtIso = data.lastCheckedAt || new Date().toISOString();
        autoHealthRef.current.lastCheckedAt = checkedAtIso;
        writeStoredHealthCheckedAt(accountId, checkedAtIso);
        writeStoredGoogleConnected(accountId, true);

        setState((prev) => {
          let newCheckIns = [...prev.checkIns];
          const newTelemetry = { ...(prev.healthTelemetry || {}) };

          if (data.telemetry && data.telemetry.length > 0) {
            for (const t of data.telemetry) {
              newTelemetry[`${t.habitId}:${t.date}`] = t;
              const habit = prev.habits.find(item => item.id === t.habitId && item.playerId === t.playerId);
              if (habit?.automation?.metric === 'sleep') {
                newCheckIns = reconcileSleepTelemetry(newCheckIns, habit, t);
              } else if (t.value < t.target) {
                newCheckIns = newCheckIns.filter(
                  (c) => !(c.habitId === t.habitId && c.date === t.date && c.source === 'google_health')
                );
              }
            }
          }

          if (data.checkInsCreated && data.checkInsCreated.length > 0) {
            for (const incoming of data.checkInsCreated) {
              const idx = newCheckIns.findIndex(
                (c) => c.habitId === incoming.habitId && c.date === incoming.date
              );
              if (idx >= 0) {
                newCheckIns[idx] = incoming;
              } else {
                newCheckIns.push(incoming);
              }
            }
          }

          newCheckIns = rebalanceAllWeeklyCheckIns(newCheckIns, prev.habits);
          writeStoredHealthTelemetry(accountId, newTelemetry, getTodayDateString());

          return {
            ...prev,
            checkIns: newCheckIns,
            healthTelemetry: newTelemetry,
            wearableConfig: {
              ...prev.wearableConfig,
              googleConnected: true,
              googleLastSync: syncTimeString,
              googleLastCheckedAt: checkedAtIso,
              googleLastResult: data,
            },
          };
        });

        if ((data.changed ?? 0) > 0) {
          syncSchedulerRef.current?.request();
        }

        if (!isAuto && data.checkInsCreated && data.checkInsCreated.length > 0) {
          soundEngine.playFanfare();
          hapticMedium();
          return {
            success: true,
            message: `Synced! Completed ${data.checkInsCreated.length} habit(s) from Google Health.`,
            count: data.checkInsCreated.length,
            result: data,
          };
        }

        return {
          success: true,
          message: data.message || 'Checked: No qualifying sleep or workouts found for this date.',
          count: data.changed ?? 0,
          result: data,
        };
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Network error';
        return { success: false, message: msg };
      }
    },
    [selectedDate, accountId]
  );

  const hasAutomatedHabits = useMemo(
    () => activeHabits.some((habit) => Boolean(habit.automation)),
    [activeHabits]
  );
  const activeHabitsRef = useRef(activeHabits);
  const healthTelemetryRef = useRef(state.healthTelemetry);
  useLayoutEffect(() => {
    activeHabitsRef.current = activeHabits;
    healthTelemetryRef.current = state.healthTelemetry;
  }, [activeHabits, state.healthTelemetry]);

  // Foreground automatic Google Health checks: deferred past startup, cooldown-gated, paused while hidden/offline.
  useEffect(() => {
    if (autoHealthRef.current.accountId !== accountId) {
      const justConnected = typeof window !== 'undefined' &&
        new URLSearchParams(window.location.search).get('wearable_connected') === 'google';
      if (justConnected) {
        writeStoredHealthCheckedAt(accountId, null);
      }
      autoHealthRef.current = {
        accountId,
        inFlight: false,
        lastAttemptAt: 0,
        lastCheckedAt: justConnected ? null : readStoredHealthCheckedAt(accountId),
        disabledReason: null,
      };
      setHealthAttentionMessage(null);
    }

    if (!isHydrated || !multiplayer.configured || !duelId || loadedDuelId !== duelId || !accountId || !hasAutomatedHabits) {
      return;
    }

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const clearTimer = () => {
      if (timer !== undefined) {
        clearTimeout(timer);
        timer = undefined;
      }
    };

    const scheduleNext = (delayMs: number) => {
      clearTimer();
      if (cancelled || document.visibilityState === 'hidden' || !navigator.onLine) return;
      if (autoHealthRef.current.disabledReason !== null) return;
      timer = setTimeout(() => {
        timer = undefined;
        void runAutoCheck();
      }, Math.max(1_000, delayMs));
    };

    const nextCooldownDelay = (missingTodayTelemetry: boolean) => {
      const now = Date.now();
      const cooldown = missingTodayTelemetry
        ? Math.min(HEALTH_AUTO_SYNC_COOLDOWN_MS, HEALTH_TELEMETRY_REFRESH_COOLDOWN_MS)
        : HEALTH_AUTO_SYNC_COOLDOWN_MS;
      const attemptRemaining = autoHealthRef.current.lastAttemptAt > 0
        ? cooldown - (now - autoHealthRef.current.lastAttemptAt)
        : 0;
      const checkedMs = autoHealthRef.current.lastCheckedAt ? Date.parse(autoHealthRef.current.lastCheckedAt) : NaN;
      const checkedRemaining = Number.isFinite(checkedMs)
        ? cooldown - (now - checkedMs)
        : 0;
      const remaining = Math.max(attemptRemaining, checkedRemaining);
      return remaining > 0 ? remaining : HEALTH_AUTO_SYNC_COOLDOWN_MS;
    };

    const runAutoCheck = async () => {
      if (cancelled) return;
      const stateRef = autoHealthRef.current;
      const missingTodayTelemetry = !hasTelemetryForDate(
        healthTelemetryRef.current,
        activeHabitsRef.current,
        getTodayDateString(),
      );
      const eligible = shouldRunAutoHealthSync({
        isHydrated,
        multiplayerConfigured: multiplayer.configured,
        hasUser: Boolean(accountId),
        hasDuelLoaded: loadedDuelId === duelId,
        hasAutomatedHabits,
        isVisible: document.visibilityState !== 'hidden',
        isOnline: navigator.onLine,
        inFlight: stateRef.inFlight,
        disabledReason: stateRef.disabledReason,
        lastAttemptAt: stateRef.lastAttemptAt,
        lastCheckedAt: stateRef.lastCheckedAt,
        missingTodayTelemetry,
      });

      if (!eligible) {
        if (document.visibilityState !== 'hidden' && navigator.onLine && stateRef.disabledReason === null && !stateRef.inFlight) {
          scheduleNext(nextCooldownDelay(missingTodayTelemetry));
        }
        return;
      }

      stateRef.inFlight = true;
      stateRef.lastAttemptAt = Date.now();
      try {
        await syncGoogleHealth(false, false, { auto: true, needTelemetry: missingTodayTelemetry });
      } finally {
        stateRef.inFlight = false;
        if (!cancelled && stateRef.disabledReason === null && document.visibilityState !== 'hidden' && navigator.onLine) {
          const stillMissing = !hasTelemetryForDate(
            healthTelemetryRef.current,
            activeHabitsRef.current,
            getTodayDateString(),
          );
          scheduleNext(nextCooldownDelay(stillMissing));
        }
      }
    };

    const handleWake = () => {
      if (document.visibilityState === 'hidden' || !navigator.onLine) {
        clearTimer();
        return;
      }
      void runAutoCheck();
    };

    scheduleNext(HEALTH_AUTO_SYNC_STARTUP_DELAY_MS);
    document.addEventListener('visibilitychange', handleWake);
    window.addEventListener('focus', handleWake);
    window.addEventListener('pageshow', handleWake);
    window.addEventListener('online', handleWake);
    window.addEventListener('offline', handleWake);

    return () => {
      cancelled = true;
      clearTimer();
      document.removeEventListener('visibilitychange', handleWake);
      window.removeEventListener('focus', handleWake);
      window.removeEventListener('pageshow', handleWake);
      window.removeEventListener('online', handleWake);
      window.removeEventListener('offline', handleWake);
    };
  }, [isHydrated, multiplayer.configured, duelId, loadedDuelId, accountId, hasAutomatedHabits, syncGoogleHealth]);

  const setGoogleHealthConnected = useStableCallback((connected: boolean) => {
    writeStoredGoogleConnected(accountId, connected);
    setState((prev) => {
      if (prev.wearableConfig?.googleConnected === connected) return prev;
      return {
        ...prev,
        wearableConfig: {
          ...prev.wearableConfig,
          googleConnected: connected,
        },
      };
    });
  });

  const disconnectGoogleHealth = useStableCallback(() => { if (typeof document !== 'undefined') {
    document.cookie = 'g_fit_connected=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    document.cookie = 'g_fit_access_token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    document.cookie = 'g_fit_refresh_token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
  }
  autoHealthRef.current.lastCheckedAt = null;
  autoHealthRef.current.disabledReason = 'not_connected';
  setHealthAttentionMessage(null);
  writeStoredHealthCheckedAt(accountId, null);
  writeStoredHealthTelemetry(accountId, null, getTodayDateString());
  writeStoredGoogleConnected(accountId, false);
  setState((prev) => ({
    ...prev,
    healthTelemetry: {},
    wearableConfig: {
      ...prev.wearableConfig,
      googleConnected: false,
      googleLastCheckedAt: null,
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

  const getHabitStreak = useCallback(
    (habit: Habit, today = todayStr) => calculateHabitStreak(habit, state.checkIns, restDays, today, checkInIndex),
    [state.checkIns, restDays, todayStr, checkInIndex]
  );

  // A Stake is only "active" while its window is open; closed ones await the scoreboard's verdict.
  const activeWeeklyStake = state.stakes.find((s) => s.period === 'weekly' && s.status === 'active' && getStakePhase(s, todayStr) === 'open');
  const activeMonthlyStake = state.stakes.find((s) => s.period === 'monthly' && s.status === 'active' && getStakePhase(s, todayStr) === 'open');

  // Settle Stakes from the shared scoreboard once their final call passes. Players never pick the winner.
  // Wait for a fresh cloud read of both Players' check-ins so a stale cache cannot decide a verdict.
  const canSettleStakes = isHydrated && (!multiplayer.configured || (paired && loadedDuelId === duelId && syncStatus === 'connected'));
  useEffect(() => {
    if (!canSettleStakes) return;
    const settled = settleDueStakes(state.stakes, state.checkIns, todayStr);
    if (settled.length === 0) return;
    const byId = new Map(settled.map((stake) => [stake.id, stake]));
    setState((prev) => ({ ...prev, stakes: prev.stakes.map((stake) => byId.get(stake.id) ?? stake) }));
    for (const stake of settled) {
      if (multiplayer.configured) {
        syncStakeSave(stake.id, stake);
      } else if (supabaseRef.current) {
        upsertStakeSupabase(supabaseRef.current, stake);
      }
    }
    // syncDuel is recreated each render; settlement only needs to rerun when its inputs change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canSettleStakes, state.stakes, state.checkIns, todayStr, multiplayer.configured]);
  const getComparison = useCallback(
    (tier: LeaderboardTier) => getVersusComparison(maciekSummary, myrnaSummary, tier),
    [maciekSummary, myrnaSummary]
  );

 

  const contextValue = useMemo<StoreContextType>(() => ({
    isHydrated, loadedDuelId, syncStatus, storageError,
    supabaseConfig: state.supabaseConfig, activePlayerId: state.activePlayerId, activePlayer,
    players, habits: state.habits, activeHabits, checkIns: state.checkIns,
    stakes: state.stakes, reactions: state.reactions || [], restDays: state.restDays || [],
    selectedDate, isTodaySelected, setSelectedDate, maciekSummary, myrnaSummary,
    activePlayerSummary, getHabitStreak, soundEnabled,
    setSoundEnabled, selectProfile, switchProfile, updateLocalPlayerName, updatePlayerColor, toggleHabit,
    logSleepHours, setGoogleHealthConnected,
    updateCheckInNote, isHabitCompletedToday, getHabitCheckInToday, isHabitCompletedOnDate,
    getHabitCheckInOnDate, getCheckInForHabit, getWeeklyHabitCompletions,
    isHabitWeeklyTargetMet, isHabitSatisfiedOnDate, isPartnerConnected, partnerId,
    partnerCleanSpaceHabit, partnerCleanSpaceCheckIn, addReaction, toggleRestDay, isRestDay,
    addHabit, updateHabit, deleteHabit, applyHabitPlan, importPreviousProgress, updateStake,
    addStake, deleteStake, activeWeeklyStake, activeMonthlyStake, getComparison,
    resetToDefaults, updateSupabaseConfig, resolveProofImages, exportStateToJson, importStateFromJson,
    wearableConfig: state.wearableConfig, healthAttentionMessage, healthTelemetry: state.healthTelemetry,
    getHealthTelemetryOnDate, setHealthTelemetry, clearHealthTelemetry,
    syncGoogleHealth, disconnectGoogleHealth,
    themePreference, effectiveTheme, setThemePreference, toggleTheme,
  }), [
    isHydrated, loadedDuelId, syncStatus, storageError, state, players, activePlayer, activeHabits,
    selectedDate, isTodaySelected, maciekSummary, myrnaSummary, activePlayerSummary,
    getHabitStreak, soundEnabled, setSoundEnabled,
    selectProfile, switchProfile, updateLocalPlayerName, updatePlayerColor, toggleHabit, logSleepHours, setGoogleHealthConnected, updateCheckInNote,
    isHabitCompletedToday, getHabitCheckInToday, isHabitCompletedOnDate, getHabitCheckInOnDate,
    getCheckInForHabit, getWeeklyHabitCompletions, isHabitWeeklyTargetMet, isHabitSatisfiedOnDate,
    isPartnerConnected, partnerId, partnerCleanSpaceHabit, partnerCleanSpaceCheckIn, addReaction,
    toggleRestDay, isRestDay, addHabit, updateHabit, deleteHabit, applyHabitPlan,
    importPreviousProgress, updateStake, addStake, deleteStake, activeWeeklyStake, activeMonthlyStake,
    getComparison, resetToDefaults, updateSupabaseConfig, resolveProofImages, exportStateToJson, importStateFromJson,
    healthAttentionMessage, getHealthTelemetryOnDate, setHealthTelemetry, clearHealthTelemetry,
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
