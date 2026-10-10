'use client';

import React, { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import { useStore } from '@/lib/store';
import { useMultiplayer } from '@/lib/multiplayer';
import { getTodayDateString } from '@/lib/date-utils';
import { prepareQuickCheckIn } from '@/lib/quick-checkin';
import { getPlayerThemeStyles } from '@/lib/player-colors';
import { Header } from '@/components/Header';
import { DesktopSidebar } from '@/components/DesktopSidebar';
import { BottomNav, TabType } from '@/components/BottomNav';
import { TodayView } from '@/components/TodayView';
import { ProfileGate } from '@/components/ProfileGate';
import { getMultiplayerEntry, shouldHoldDuelLoadingScreen } from '@/lib/invite-navigation';
import { Check } from 'lucide-react';
import { soundEngine } from '@/lib/sound-utils';
import { hapticLight } from '@/lib/haptic-utils';
import { DoLogo } from '@/components/DoLogo';

function ViewLoading() {
  return <p role="status" className="py-8 text-center text-sm text-zinc-500">Loading...</p>;
}

const DuelView = dynamic(() => import('@/components/DuelView').then(module => module.DuelView), { loading: ViewLoading });
const ProgressView = dynamic(() => import('@/components/ProgressView').then(module => module.ProgressView), { loading: ViewLoading });
const SettingsView = dynamic(() => import('@/components/SettingsView').then(module => module.SettingsView), { loading: ViewLoading });
const MultiplayerGate = dynamic(() => import('@/components/MultiplayerGate').then(module => module.MultiplayerGate), { loading: ViewLoading });
const ExistingDuelInviteGate = dynamic(() => import('@/components/ExistingDuelInviteGate').then(module => module.ExistingDuelInviteGate), { loading: ViewLoading });
const HabitOnboarding = dynamic(() => import('@/components/HabitOnboarding').then(module => module.HabitOnboarding), { loading: ViewLoading });
const KeyboardShortcutsModal = dynamic(() => import('@/components/KeyboardShortcutsModal').then(module => module.KeyboardShortcutsModal), { loading: ViewLoading });

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
  const hasInviteParam = searchParams.has('invite');
  const rawInviteCode = hasInviteParam ? (searchParams.get('invite') ?? '') : null;
  const [dismissedInvite, setDismissedInvite] = useState<string | null>(null);
  const inviteCode = rawInviteCode !== null && rawInviteCode === dismissedInvite ? null : rawInviteCode;
  const multiplayerEntry = getMultiplayerEntry(multiplayer.configured, !!multiplayer.user, !!multiplayer.duel, inviteCode);
  const pendingDuelId = multiplayer.duel?.id;
  const pendingGuestId = multiplayer.duel?.guest_id;

  useEffect(() => {
    if (pendingDuelId && !pendingGuestId) setActiveTab('duel');
  }, [pendingDuelId, pendingGuestId]);

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
        <p role="alert">{storageError || 'Could not load your duel.'}</p>
        <button className="rounded-xl bg-white text-black px-4 py-2" onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }
  if (!isHydrated || multiplayer.loading || isDuelSyncing) {
    return (
      <div className="relative z-10 min-h-screen bg-background text-foreground flex flex-col items-center justify-center gap-3">
        {showInviteConflictModal && <ExistingDuelInviteGate inviteCode={inviteCode!} onDismiss={() => setDismissedInvite(rawInviteCode)} />}
        <DoLogo size="md" className="animate-pulse" />
        <span className="text-xs font-mono text-zinc-500">loading do...</span>
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
        <DesktopSidebar activeTab={activeTab} onChangeTab={(tab) => { setShowSettings(false); changeTab(tab); }} />
        <Header onOpenSettings={() => setShowSettings(true)} onOpenDuel={() => { setShowSettings(false); setActiveTab('duel'); }} />
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
            className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-[#1c1c1e] border border-black/10 dark:border-white/[0.12] text-foreground px-4 py-2 rounded-2xl text-xs font-medium shadow-2xl flex items-center gap-2 backdrop-blur-xl animate-in fade-in slide-in-from-top-3 duration-200 cursor-pointer active:scale-95"
          >
            <Check className="w-4 h-4 text-emerald-500 stroke-[2.5]" />
            <span>{toastMessage}</span>
          </div>
        )}

        <main id="main-content" className="flex-1 w-full px-4 lg:px-10 pt-5 lg:pt-9 pb-28 lg:pb-12">
          {storageError && <div role="alert" className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-500">{storageError}</div>}
          {showSettings ? <SettingsView onBack={() => setShowSettings(false)} onChooseHabits={() => { setShowSettings(false); setOpenPlanner(true); setActiveTab('progress'); }} /> : <>
            {activeTab === 'today' && <TodayView onOpenHabits={() => { setOpenPlanner(true); setActiveTab('progress'); }} onOpenDuel={() => { setShowSettings(false); setActiveTab('duel'); }} />}
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

        <BottomNav activeTab={activeTab} onChangeTab={(tab) => { setShowSettings(false); setOpenPlanner(false); changeTab(tab); }} />

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
