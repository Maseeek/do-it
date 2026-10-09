'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useStore } from '@/lib/store';
import { useMultiplayer } from '@/lib/multiplayer';
import { getTodayDateString } from '@/lib/date-utils';
import { Header } from '@/components/Header';
import { DesktopSidebar } from '@/components/DesktopSidebar';
import { BottomNav, TabType } from '@/components/BottomNav';
import { TodayView } from '@/components/TodayView';
import { DuelView } from '@/components/DuelView';
import { ProgressView } from '@/components/ProgressView';
import { SettingsView } from '@/components/SettingsView';
import { MultiplayerGate } from '@/components/MultiplayerGate';
import { ExistingDuelInviteGate } from '@/components/ExistingDuelInviteGate';
import { ProfileGate } from '@/components/ProfileGate';
import { HabitOnboarding } from '@/components/HabitOnboarding';
import { KeyboardShortcutsModal } from '@/components/KeyboardShortcutsModal';
import { Check } from 'lucide-react';
import { soundEngine } from '@/lib/sound-utils';
import { hapticLight } from '@/lib/haptic-utils';
import { DoLogo } from '@/components/DoLogo';
import { resolveMultiplayerEntry } from '@/lib/invite-navigation';

function AppContent() {
  const {
    isHydrated,
    activePlayerId,
    switchProfile,
    setSelectedDate,
    storageError,
    habits,
    syncStatus,
    loadedDuelId,
  } = useStore();
  const multiplayer = useMultiplayer();

  const [activeTab, setActiveTab] = useState<TabType>('today');
  const [showSettings, setShowSettings] = useState(false);
  const [openPlanner, setOpenPlanner] = useState(false);
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [inviteCode, setInviteCode] = useState<string | null>(null);

  // Sync tab from URL query params (?tab=today|duel|progress&section=habits)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab') as TabType | null;
    const sectionParam = params.get('section');
    const inviteParam = params.get('invite');
    if (inviteParam) setInviteCode(inviteParam);
    if (tabParam && ['today', 'duel', 'progress'].includes(tabParam)) {
      setActiveTab(tabParam);
      if (tabParam === 'progress' && sectionParam === 'habits') {
        setOpenPlanner(true);
      }
    }
  }, []);

  const multiplayerEntry = resolveMultiplayerEntry({
    configured: multiplayer.configured,
    loading: multiplayer.loading,
    user: multiplayer.user,
    duel: multiplayer.duel,
    inviteCode,
  });

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
        setActiveTab('today');
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
  }, [switchProfile, setSelectedDate, multiplayer.configured]);

  if (!multiplayer.loading && multiplayerEntry === 'invite-conflict' && inviteCode) {
    return <ExistingDuelInviteGate inviteCode={inviteCode} />;
  }

  // SSR hydration placeholder
  if (multiplayer.configured && multiplayer.duel && syncStatus === 'offline' && (loadedDuelId !== multiplayer.duel.id || activePlayerId !== multiplayer.slot)) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center gap-3 px-4">
        <p role="alert">{storageError || 'Could not load your duel.'}</p>
        <button className="rounded-xl bg-white text-black px-4 py-2" onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }
  if (!isHydrated || multiplayer.loading || (multiplayer.configured && multiplayer.duel && (loadedDuelId !== multiplayer.duel.id || activePlayerId !== multiplayer.slot))) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center gap-3">
        <DoLogo size="md" className="animate-pulse" />
        <span className="text-xs font-mono text-zinc-500">loading do...</span>
      </div>
    );
  }

  if (multiplayerEntry === 'gate') {
    return <MultiplayerGate inviteCode={inviteCode} />;
  }

  // First time or logged out: "Who are you?" profile selection
  if (!activePlayerId) {
    return <ProfileGate />;
  }

  if (multiplayer.configured && !habits.some(habit => habit.playerId === activePlayerId)) {
    return <HabitOnboarding firstRun onDone={() => { setActiveTab('today'); }} />;
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans relative selection:bg-zinc-200 selection:text-black dark:selection:bg-zinc-800 dark:selection:text-white transition-colors">
      {/* Ambient background glow mesh */}
      <div className="ambient-mesh" aria-hidden="true" />

      {/* App frame */}
      <div className="relative z-10 flex flex-col flex-1 lg:pl-60">
        <a href="#main-content" className="skip-link">Skip to content</a>
        <DesktopSidebar activeTab={activeTab} onChangeTab={(tab) => { setShowSettings(false); setActiveTab(tab); }} />
        <Header onOpenSettings={() => setShowSettings(true)} />

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

        <main id="main-content" className="flex-1 max-w-xl lg:max-w-6xl w-full mx-auto px-4 lg:px-10 pt-5 lg:pt-9 pb-28 lg:pb-12">
          {storageError && <div role="alert" className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-500">{storageError}</div>}
          {showSettings ? <SettingsView onBack={() => setShowSettings(false)} onChooseHabits={() => { setShowSettings(false); setOpenPlanner(true); setActiveTab('progress'); }} /> : <>
            {activeTab === 'today' && <TodayView onOpenHabits={() => { setOpenPlanner(true); setActiveTab('progress'); }} />}
            {activeTab === 'duel' && <DuelView />}
            {activeTab === 'progress' && <ProgressView key={openPlanner ? 'planner' : 'progress'} openPlanner={openPlanner} />}
          </>}
        </main>

        <BottomNav activeTab={activeTab} onChangeTab={(tab) => { setShowSettings(false); setOpenPlanner(false); setActiveTab(tab); }} />

        <KeyboardShortcutsModal
          isOpen={isShortcutsModalOpen}
          onClose={() => setIsShortcutsModalOpen(false)}
        />
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
