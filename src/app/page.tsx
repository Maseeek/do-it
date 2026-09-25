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
import { Check, Sparkles } from 'lucide-react';

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
      <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-zinc-900 border border-white/[0.08] flex items-center justify-center animate-pulse">
          <Sparkles className="w-5 h-5 text-zinc-500 animate-spin" />
        </div>
        <span className="text-xs font-mono text-zinc-600">Loading arena...</span>
      </div>
    );
  }

  // First time or logged out: "Who are you?" profile selection
  if (!activePlayerId) {
    return <ProfileGate />;
  }

  return (
    <div className="min-h-screen bg-black text-[#f5f5f7] flex flex-col font-sans relative selection:bg-zinc-800 selection:text-white">
      {/* Ambient background glow mesh */}
      <div className="ambient-mesh" aria-hidden="true" />

      {/* App frame */}
      <div className="relative z-10 flex flex-col flex-1">
        <Header onOpenSettings={() => setActiveTab('vault')} />

        {/* Floating Quick Action Toast */}
        {toastMessage && (
          <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-[#1c1c1e] border border-white/[0.12] text-white px-4 py-2 rounded-2xl text-xs font-medium shadow-2xl flex items-center gap-2 backdrop-blur-xl animate-in fade-in slide-in-from-top-3 duration-200">
            <Check className="w-4 h-4 text-emerald-400 stroke-[2.5]" />
            <span>{toastMessage}</span>
          </div>
        )}

        <main className="flex-1 max-w-md w-full mx-auto px-4 pt-3.5 pb-24">
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
    </div>
  );
}

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-black flex items-center justify-center">
          <div className="w-10 h-10 rounded-2xl bg-[#1c1c1e] border border-white/[0.08] animate-pulse" />
        </div>
      }
    >
      <AppContent />
    </Suspense>
  );
}
