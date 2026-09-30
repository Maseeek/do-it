'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft, LogOut, Volume2 } from 'lucide-react';
import { useStore } from '@/lib/store';
import { useMultiplayer } from '@/lib/multiplayer';
import { HealthConnection } from './HealthConnection';

export function SettingsView({ onBack, onChooseHabits }: { onBack: () => void; onChooseHabits?: () => void }) {
  const multiplayer = useMultiplayer();
  const { soundEnabled, setSoundEnabled } = useStore();
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const reason = new URLSearchParams(window.location.search).get('wearable_error');
    if (reason) setError(`Google Health connection was not completed (${reason.replaceAll('_', ' ')}). Try again below.`);
  }, []);
  return <div className="mx-auto max-w-2xl space-y-5">
    <div className="flex items-center gap-3"><button className="flex size-11 items-center justify-center rounded-xl text-zinc-400 hover:text-white" onClick={onBack} aria-label="Back"><ArrowLeft size={20}/></button><h1 className="text-2xl font-semibold">Settings</h1></div>
    <HealthConnection onChooseHabits={onChooseHabits} />
    <section className="rounded-2xl border border-white/[0.08] bg-[#17181b] p-4 space-y-3">
      <div className="flex items-center justify-between gap-3"><span className="flex items-center gap-2 text-sm"><Volume2 size={17}/>Sounds</span><button role="switch" aria-checked={!!soundEnabled} onClick={() => setSoundEnabled(!soundEnabled)} className={`min-h-11 min-w-16 rounded-full px-3 text-xs ${soundEnabled ? 'bg-emerald-400 text-black' : 'bg-zinc-700 text-white'}`}>{soundEnabled ? 'On' : 'Off'}</button></div>
      {multiplayer.user && <div className="border-t border-white/[0.08] pt-3"><p className="mb-3 text-xs text-zinc-500">{multiplayer.user.email}</p><button className="control min-h-11" onClick={() => multiplayer.signOut().catch(caught => setError(caught instanceof Error ? caught.message : 'Could not sign out.'))}><LogOut size={15}/>Sign out</button></div>}
      {error && <p role="alert" className="text-xs text-amber-300">{error}</p>}
    </section>
  </div>;
}
