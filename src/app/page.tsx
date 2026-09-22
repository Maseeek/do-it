'use client';

import React, { Suspense, useEffect, useState } from 'react';
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

function AppContent() {
  const { isHydrated, activePlayerId, toggleHabit, habits, switchProfile, setSelectedDate } = useStore();
  const [activeTab, setActiveTab] = useState<TabType>('today');
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const searchParams = useSearchParams();

  // Handle URL deep-linking query parameters (?tab=..., ?action=checkin&habit=...)
  useEffect(() => {
    if (!isHydrated) return;

    const tabParam = searchParams.get('tab');
    if (tabParam === 'today' || tabParam === 'duel' || tabParam === 'vault') {
      setActiveTab(tabParam as TabType);
    }

    const action = searchParams.get('action');
    const habitId = searchParams.get('habit');
    if (action === 'checkin' && habitId) {
      const targetHabit = habits.find((h) => h.id === habitId);
      if (targetHabit) {
        toggleHabit(habitId);
        setToastMessage(`Quick Logged: ${targetHabit.title} (+${targetHabit.points} pts)`);
        setTimeout(() => setToastMessage(null), 3500);
      }
    }
  }, [isHydrated, searchParams, habits, toggleHabit]);

  // Global Keyboard shortcuts (1, 2, 3, P, T, ?)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input or textarea
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (e.key === '1') {
        setActiveTab('today');
      } else if (e.key === '2') {
        setActiveTab('duel');
      } else if (e.key === '3') {
        setActiveTab('vault');
      } else if (e.key === 'p' || e.key === 'P') {
        switchProfile();
        setToastMessage('Switched player profile');
        setTimeout(() => setToastMessage(null), 2000);
      } else if (e.key === 't' || e.key === 'T') {
        const todayStr = new Date().toISOString().split('T')[0];
        setSelectedDate(todayStr);
        setToastMessage('Jumped to Today');
        setTimeout(() => setToastMessage(null), 2000);
      } else if (e.key === '?') {
        e.preventDefault();
        setIsShortcutsModalOpen((prev) => !prev);
      } else if (e.key === 'Escape') {
        setIsShortcutsModalOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [switchProfile, setSelectedDate]);

  // SSR hydration placeholder
  if (!isHydrated) {
    return (
      <div className="min-h-screen bg-[#08090a] flex items-center justify-center">
        <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 animate-pulse" />
      </div>
    );
  }

  // First time or logged out: "Who are you?" profile selection
  if (!activePlayerId) {
    return <ProfileGate />;
  }

  return (
    <div className="min-h-screen bg-[#08090a] text-zinc-100 flex flex-col font-sans">
      <Header onOpenSettings={() => setActiveTab('vault')} />

      {/* Deep-link quick check-in toast */}
      {toastMessage && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-emerald-500/90 text-black px-4 py-2 rounded-xl text-xs font-mono font-bold shadow-lg flex items-center gap-2 backdrop-blur-md animate-in fade-in slide-in-from-top-2">
          <Check className="w-4 h-4 stroke-[3]" />
          <span>{toastMessage}</span>
        </div>
      )}

      <main className="flex-1 max-w-md w-full mx-auto px-4 pt-4">
        {activeTab === 'today' && <TodayView />}
        {activeTab === 'duel' && <DuelView />}
        {activeTab === 'vault' && <VaultView />}
      </main>

      <BottomNav activeTab={activeTab} onChangeTab={setActiveTab} />

      <KeyboardShortcutsModal
        isOpen={isShortcutsModalOpen}
        onClose={() => setIsShortcutsModalOpen(false)}
      />
    </div>
  );
}

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#08090a] flex items-center justify-center">
          <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 animate-pulse" />
        </div>
      }
    >
      <AppContent />
    </Suspense>
  );
}
