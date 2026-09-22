'use client';

import React, { useState } from 'react';
import { useStore } from '@/lib/store';
import { ProfileGate } from '@/components/ProfileGate';
import { Header } from '@/components/Header';
import { BottomNav, TabType } from '@/components/BottomNav';
import { TodayView } from '@/components/TodayView';
import { DuelView } from '@/components/DuelView';
import { VaultView } from '@/components/VaultView';

export default function Home() {
  const { isHydrated, activePlayerId } = useStore();
  const [activeTab, setActiveTab] = useState<TabType>('today');

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

      <main className="flex-1 max-w-md w-full mx-auto px-4 pt-4">
        {activeTab === 'today' && <TodayView />}
        {activeTab === 'duel' && <DuelView />}
        {activeTab === 'vault' && <VaultView />}
      </main>

      <BottomNav activeTab={activeTab} onChangeTab={setActiveTab} />
    </div>
  );
}
