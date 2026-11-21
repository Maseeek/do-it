'use client';

import React, { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { createDeferredView } from '@/components/DeferredView';
import { loadCurrentPage } from '@/lib/load-current-page';
import { useSearchParams } from 'next/navigation';
import { useStore } from '@/lib/store';
import { useMultiplayer } from '@/lib/multiplayer';
import { getTodayDateString } from '@/lib/date-utils';
import { prepareQuickCheckIn } from '@/lib/quick-checkin';
import { getPlayerThemeStyles } from '@/lib/player-colors';
import { extractRecommendationReferrer } from '@/lib/recommendation';
import { Header } from '@/components/Header';
import { DesktopSidebar } from '@/components/DesktopSidebar';
import { BottomNav, TabType } from '@/components/BottomNav';
import { TodayPrototype } from '@/components/prototypes/today/TodayPrototype';
import { ProfileGate } from '@/components/ProfileGate';
import { getMultiplayerEntry, shouldHoldDuelLoadingScreen } from '@/lib/invite-navigation';
import { Check } from 'lucide-react';
import { soundEngine } from '@/lib/sound-utils';
import { hapticLight } from '@/lib/haptic-utils';
import { DoLogo } from '@/components/DoLogo';

function ViewLoading() {
  return <p role="status" className="py-8 text-center text-label font-normal text-[var(--text-muted)]">Loading…</p>;
}

const { View: DuelView, preload: preloadDuel } = createDeferredView(() => import('@/components/DuelView').then(module => module.DuelView));
const { View: ProgressView, preload: preloadProgress } = createDeferredView(() => import('@/components/ProgressView').then(module => module.ProgressView));
const { View: SettingsView, preload: preloadSettings } = createDeferredView(() => import('@/components/SettingsView').then(module => module.SettingsView));

function preloadTab(tab: TabType) {
  if (tab === 'duel') preloadDuel();
  if (tab === 'progress') preloadProgress();
}
const { View: MultiplayerGate } = createDeferredView(() => import('@/components/MultiplayerGate').then(module => module.MultiplayerGate));
const ExistingDuelInviteGate = dynamic(() => loadCurrentPage(() => import('@/components/ExistingDuelInviteGate')).then(module => module.ExistingDuelInviteGate), { loading: ViewLoading });
const { View: HabitOnboarding } = createDeferredView(() => import('@/components/HabitOnboarding').then(module => module.HabitOnboarding));
const { View: KeyboardShortcutsModal } = createDeferredView(() => import('@/components/KeyboardShortcutsModal').then(module => module.KeyboardShortcutsModal), null);

function AppContent() {
  const {
    isHydrated,
    activePlayerId,
    switchProfile,
    setSelectedDate,
    storageError,
    habits,
    checkIns,
    toggleHabit,
    syncStatus,
    loadedDuelId,
    players,
  } = useStore();
  const multiplayer = useMultiplayer();
  const [activeTab, setActiveTab] = useState<TabType>('today');
  const [showSettings, setShowSettings] = useState(false);
  const [openPlanner, setOpenPlanner] = useState(false);
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const handledAction = useRef<string | null>(null);
  const changeTab = useCallback((tab: TabType) => {
    if (tab === 'today') setSelectedDate(getTodayDateString());
    setActiveTab(tab);
  }, [setSelectedDate]);

  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  const hasInviteParam = searchParams.has('invite');
  const rawInviteCode = hasInviteParam ? (searchParams.get('invite') ?? '') : null;
  const [dismissedInvite, setDismissedInvite] = useState<string | null>(null);
  const inviteCode = rawInviteCode !== null && rawInviteCode === dismissedInvite ? null : rawInviteCode;
  const multiplayerEntry = getMultiplayerEntry(multiplayer.configured, !!multiplayer.user, !!multiplayer.duel, inviteCode);
  const pendingDuelId = multiplayer.duel?.id;
  const pendingGuestId = multiplayer.duel?.guest_id;
  const membershipSetup = searchParams.get('membership') === 'setup';

  useEffect(() => {
    if (membershipSetup && multiplayer.user && pendingDuelId) {
      window.location.replace('/billing');
    }
  }, [membershipSetup, multiplayer.user, pendingDuelId]);

  useEffect(() => {
    if (pendingDuelId && !pendingGuestId && tabParam !== 'today') setActiveTab('duel');
  }, [pendingDuelId, pendingGuestId, tabParam]);

  // Handle URL deep-linking query parameters (?tab=..., ?action=checkin&habit=...)
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'today' || tabParam === 'duel' || tabParam === 'progress' || tabParam === 'vault') {
      setActiveTab(tabParam === 'vault' ? 'progress' : tabParam as TabType);
    }
    if (searchParams.get('section') === 'habits') {
      setActiveTab('progress');
      setOpenPlanner(true);
    }
    if (searchParams.has('wearable_error') || searchParams.has('wearable_connected') || searchParams.get('section') === 'settings') {
      setShowSettings(true);
    }
  }, [searchParams]);

  useEffect(() => {
    const referrer = extractRecommendationReferrer(searchParams);
    if (!referrer) return;
    const url = new URL(window.location.href);
    url.searchParams.delete('ref');
    url.searchParams.delete('recommend');
    window.history.replaceState(null, '', url.pathname + (url.search ? url.search : '') + url.hash);
    const displayName = referrer === 'maciek' ? 'Maciek' : referrer === 'myrna' ? 'Myrna' : 'a friend';
    setToastMessage(`Welcome to do it.! Recommended by ${displayName}.`);
  }, [searchParams]);

  useEffect(() => {
    if (!isHydrated || !activePlayerId) return;
    if (multiplayer.configured && (!multiplayer.duel || loadedDuelId !== multiplayer.duel.id || activePlayerId !== multiplayer.slot)) return;
    const action = searchParams.get('action');
    const habitId = searchParams.get('habit');
    const actionKey = searchParams.toString();
    if (action !== 'checkin' || !habitId || handledAction.current === actionKey) return;
    handledAction.current = actionKey;
    const today = getTodayDateString();
    const result = prepareQuickCheckIn(habitId, activePlayerId, habits, checkIns, today);
    const url = new URL(window.location.href);
    url.searchParams.delete('action');
    url.searchParams.delete('habit');
    window.history.replaceState(null, '', url.pathname + url.search + url.hash);
    setSelectedDate(today);
    setActiveTab('today');
    if (result.habit) {
      toggleHabit(habitId, undefined, undefined, undefined, today);
    }
    setToastMessage(result.message);
  }, [isHydrated, activePlayerId, multiplayer.configured, multiplayer.duel, multiplayer.slot, loadedDuelId, searchParams, habits, checkIns, toggleHabit, setSelectedDate]);

  // Auto-dismiss toast after 4.5 seconds
  useEffect(() => {
    if (!toastMessage) return;
    const timeout = setTimeout(() => setToastMessage(null), 4500);
    return () => clearTimeout(timeout);
  }, [toastMessage]);

  // Global Keyboard shortcuts (1, 2, 3, P, T, ?)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input or textarea
      if (e.metaKey || e.ctrlKey || e.altKey || (e.target as HTMLElement)?.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }
      if (document.querySelector('[role="dialog"]') && e.key !== 'Escape') return;

      if (e.key === '1') {
        soundEngine.playClick();
        hapticLight();
        changeTab('today');
      } else if (e.key === '2') {
        soundEngine.playClick();
        hapticLight();
        setActiveTab('duel');
      } else if (e.key === '3') {
        soundEngine.playClick();
        hapticLight();
        setActiveTab('progress');
      } else if ((e.key === 'p' || e.key === 'P') && !multiplayer.configured) {
        soundEngine.playClick();
        hapticLight();
        switchProfile();
        setToastMessage('Switched player profile');
        setTimeout(() => setToastMessage(null), 2000);
      } else if (e.key === 't' || e.key === 'T') {
        soundEngine.playClick();
        hapticLight();
        const todayStr = getTodayDateString();
        setSelectedDate(todayStr);
        setToastMessage('Jumped to Today');
        setTimeout(() => setToastMessage(null), 2000);
      } else if (e.key === '?') {
        e.preventDefault();
        soundEngine.playClick();
        hapticLight();
        setIsShortcutsModalOpen((prev) => !prev);
      } else if (e.key === 'Escape') {
        soundEngine.playClick();
        hapticLight();
        setIsShortcutsModalOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [changeTab, switchProfile, setSelectedDate, multiplayer.configured]);

  const showInviteConflictModal = !multiplayer.loading && multiplayerEntry === 'invite-conflict' && inviteCode !== null;

  if (!multiplayer.loading && multiplayerEntry === 'gate') {
    return <MultiplayerGate inviteCode={inviteCode} onDismissInvite={() => setDismissedInvite(rawInviteCode)} />;
  }

  // SSR hydration placeholder
  const isDuelSyncing = shouldHoldDuelLoadingScreen(
    multiplayer.configured,
    Boolean(multiplayer.duel),
    multiplayer.slot,
    loadedDuelId,
    activePlayerId,
    multiplayer.duel?.id
  );

  // SSR hydration placeholder
  if (multiplayer.configured && multiplayer.duel && syncStatus === 'offline' && isDuelSyncing) {
    return (
      <div className="relative z-10 min-h-screen bg-background text-foreground flex flex-col items-center justify-center gap-3 px-4">
        {showInviteConflictModal && <ExistingDuelInviteGate inviteCode={inviteCode!} onDismiss={() => setDismissedInvite(rawInviteCode)} />}
        <p role="alert" className="text-body">{storageError || 'Could not load your duel.'}</p>
        <button className="control control-primary" onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }
  if (!isHydrated || multiplayer.loading || isDuelSyncing) {
    return (
      <div className="relative z-10 min-h-screen bg-background text-foreground flex flex-col items-center justify-center gap-3">
        {showInviteConflictModal && <ExistingDuelInviteGate inviteCode={inviteCode!} onDismiss={() => setDismissedInvite(rawInviteCode)} />}
        <DoLogo size="md" className="animate-pulse" />
        <span className="text-label font-normal text-[var(--text-muted)]">Loading…</span>
      </div>
    );
  }

  // First time or logged out: "Who are you?" profile selection
  if (!activePlayerId) {
    return <ProfileGate />;
  }

  if (multiplayer.configured && !habits.some(habit => habit.playerId === activePlayerId)) {
    return (
      <>
        {showInviteConflictModal && <ExistingDuelInviteGate inviteCode={inviteCode!} onDismiss={() => setDismissedInvite(rawInviteCode)} />}
        <div style={getPlayerThemeStyles(players[activePlayerId])}><HabitOnboarding firstRun onDone={() => { setActiveTab('today'); }} /></div>
      </>
    );
  }

  return (
    <div
      style={{
        ...getPlayerThemeStyles(players[activePlayerId]),
        ...getPlayerThemeStyles(players.maciek, 'owner'),
        ...getPlayerThemeStyles(players.myrna, 'guest'),
      }}
      className="min-h-screen bg-background text-foreground flex flex-col font-sans relative selection:bg-zinc-200 selection:text-black dark:selection:bg-zinc-800 dark:selection:text-white transition-colors"
    >
      {/* Ambient background glow mesh */}
      <div className="ambient-mesh" aria-hidden="true" />

      {showInviteConflictModal && <ExistingDuelInviteGate inviteCode={inviteCode!} onDismiss={() => setDismissedInvite(rawInviteCode)} />}

      {/* App frame */}
      <div className="relative z-10 flex flex-col flex-1 lg:pl-60">
        <a href="#main-content" className="skip-link">Skip to content</a>
        <DesktopSidebar activeTab={activeTab} onWarmTab={preloadTab} onChangeTab={(tab) => { setShowSettings(false); changeTab(tab); }} />
        <Header onOpenSettings={() => setShowSettings(true)} onWarmSettings={preloadSettings} />
        {/* Floating Quick Action Toast */}
        {toastMessage && (
          <div
            role="status"
            aria-live="polite"
            onClick={() => {
              soundEngine.playClick();
              hapticLight();
              setToastMessage(null);
            }}
            className="fixed top-[calc(env(safe-area-inset-top)+4rem)] left-1/2 z-50 flex min-h-11 max-w-[calc(100vw-2rem)] -translate-x-1/2 cursor-pointer items-center gap-2 rounded-full border border-[var(--border-medium)] bg-[var(--surface-1)] px-4 py-2 text-label text-foreground shadow-xl animate-in fade-in slide-in-from-top-3 duration-200 active:scale-95"
          >
            <Check className="size-4 shrink-0 text-emerald-500 stroke-[2.5]" aria-hidden="true" />
            <span>{toastMessage}</span>
          </div>
        )}

        <main id="main-content" className="flex-1 w-full px-[var(--page-gutter)] pt-6 lg:pt-10 pb-[calc(env(safe-area-inset-bottom)+6.5rem)] lg:pb-12">
          {storageError && <div role="alert" className="mb-6 rounded-[var(--radius-card)] bg-amber-500/10 px-4 py-3 text-label font-normal text-amber-700 dark:text-amber-300">{storageError}</div>}
          {showSettings ? <SettingsView onBack={() => setShowSettings(false)} onChooseHabits={() => { setShowSettings(false); setOpenPlanner(true); setActiveTab('progress'); }} /> : <>
            {activeTab === 'today' && <TodayPrototype onOpenHabits={() => { setOpenPlanner(true); setActiveTab('progress'); }} onOpenDuel={() => { setShowSettings(false); setActiveTab('duel'); }} />}
            {activeTab === 'duel' && <DuelView />}
            {activeTab === 'progress' && (
              <ProgressView
                key={openPlanner ? 'planner' : 'progress'}
                openPlanner={openPlanner}
                onOpenDateInToday={(dateStr) => {
                  setSelectedDate(dateStr);
                  setOpenPlanner(false);
                  setActiveTab('today');
                }}
              />
            )}
          </>}
        </main>

        <BottomNav activeTab={activeTab} onWarmTab={preloadTab} onChangeTab={(tab) => { setShowSettings(false); setOpenPlanner(false); changeTab(tab); }} />

        {isShortcutsModalOpen && <KeyboardShortcutsModal
          isOpen={isShortcutsModalOpen}
          onClose={() => setIsShortcutsModalOpen(false)}
        />}
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <DoLogo size="md" className="animate-pulse" />
        </div>
      }
    >
      <AppContent />
    </Suspense>
  );
}
