'use client';

import React, { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useStore } from '@/lib/store';
import { ProfileGate } from '@/components/ProfileGate';
import { Header } from '@/components/Header';
import { BottomNav, TabType } from '@/components/BottomNav';
import { TodayView } from '@/components/TodayView';
import { DuelView } from '@/components/DuelView';
import { VaultView } from '@/components/VaultView';
import { KeyboardShortcutsModal } from '@/components/KeyboardShortcutsModal';
import { Check } from 'lucide-react';
import { DoLogo } from '@/components/DoLogo';
import { soundEngine } from '@/lib/sound-utils';
import { hapticLight } from '@/lib/haptic-utils';
import { getTodayDateString } from '@/lib/date-utils';
import { prepareQuickCheckIn } from '@/lib/quick-checkin';
import { DesktopSidebar } from '@/components/DesktopSidebar';
import { useMultiplayer } from '@/lib/multiplayer';
import { MultiplayerGate } from '@/components/MultiplayerGate';
import { HabitOnboarding } from '@/components/HabitOnboarding';

function AppContent() {
  const multiplayer = useMultiplayer();
  const { isHydrated, loadedDuelId, syncStatus, activePlayerId, toggleHabit, habits, checkIns, switchProfile, setSelectedDate, storageError } = useStore();
  const [activeTab, setActiveTab] = useState<TabType>('today');
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [vaultSection, setVaultSection] = useState<'stats' | 'habits' | 'settings'>('stats');
  const handledAction = useRef<string | null>(null);

  const searchParams = useSearchParams();
  const pendingDuelId = multiplayer.duel?.id;
  const pendingGuestId = multiplayer.duel?.guest_id;

  useEffect(() => {
    if (pendingDuelId && !pendingGuestId) setActiveTab('duel');
  }, [pendingDuelId, pendingGuestId]);

  // Handle URL deep-linking query parameters (?tab=..., ?action=checkin&habit=...)
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'today' || tabParam === 'duel' || tabParam === 'vault') {
      setActiveTab(tabParam as TabType);
    }
    if (searchParams.get('section') === 'habits') {
      setActiveTab('vault');
      setVaultSection('habits');
    }
    if (searchParams.has('wearable_error') || searchParams.has('wearable_connected') || searchParams.get('section') === 'settings') {
      setActiveTab('vault');
      setVaultSection('settings');
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
        setActiveTab('vault');
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

  // SSR hydration placeholder
  if (multiplayer.configured && multiplayer.duel && syncStatus === 'offline' && (loadedDuelId !== multiplayer.duel.id || activePlayerId !== multiplayer.slot)) {
    return <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center gap-3 px-4"><p role="alert">{storageError || 'Could not load your duel.'}</p><button className="rounded-xl bg-white text-black px-4 py-2" onClick={() => window.location.reload()}>Retry</button></div>;
  }
  if (!isHydrated || multiplayer.loading || (multiplayer.configured && multiplayer.duel && (loadedDuelId !== multiplayer.duel.id || activePlayerId !== multiplayer.slot))) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-3">
        <DoLogo size="md" className="animate-pulse" />
        <span className="text-xs font-mono text-zinc-500">loading do...</span>
      </div>
    );
  }

  if (multiplayer.configured && (!multiplayer.user || !multiplayer.duel)) {
    return <MultiplayerGate inviteCode={searchParams.get('invite')} />;
  }

  // First time or logged out: "Who are you?" profile selection
  if (!activePlayerId) {
    return <ProfileGate />;
  }

  if (multiplayer.configured && !habits.some(habit => habit.playerId === activePlayerId)) {
    return <HabitOnboarding firstRun onDone={() => { setActiveTab('today'); }} />;
  }

  return (
    <div className="min-h-screen bg-black text-[#f5f5f7] flex flex-col font-sans relative selection:bg-zinc-800 selection:text-white">
      {/* Ambient background glow mesh */}
      <div className="ambient-mesh" aria-hidden="true" />

      {/* App frame */}
      <div className="relative z-10 flex flex-col flex-1 lg:pl-60">
        <a href="#main-content" className="skip-link">Skip to content</a>
        <DesktopSidebar activeTab={activeTab} onChangeTab={setActiveTab} onOpenSettings={() => { setVaultSection('settings'); setActiveTab('vault'); }} />
        <Header onOpenSettings={() => { setVaultSection('settings'); setActiveTab('vault'); }} />

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
            className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-[#1c1c1e] border border-white/[0.12] text-white px-4 py-2 rounded-2xl text-xs font-medium shadow-2xl flex items-center gap-2 backdrop-blur-xl animate-in fade-in slide-in-from-top-3 duration-200 cursor-pointer active:scale-95"
          >
            <Check className="w-4 h-4 text-emerald-400 stroke-[2.5]" />
            <span>{toastMessage}</span>
          </div>
        )}

        <main id="main-content" className="flex-1 max-w-xl lg:max-w-6xl w-full mx-auto px-4 lg:px-10 pt-5 lg:pt-9 pb-28 lg:pb-12">
          {storageError && <div role="alert" className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">{storageError}</div>}
          {activeTab === 'today' && <TodayView />}
          {activeTab === 'duel' && <DuelView />}
          {activeTab === 'vault' && <VaultView key={vaultSection} initialSection={vaultSection} />}
        </main>

        <BottomNav activeTab={activeTab} onChangeTab={setActiveTab} />

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
        <div className="min-h-screen bg-black flex items-center justify-center">
          <DoLogo size="md" className="animate-pulse" />
        </div>
      }
    >
      <AppContent />
    </Suspense>
  );
}
