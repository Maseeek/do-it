'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft, LogOut, UserRound, Volume2 } from 'lucide-react';
import { useStore } from '@/lib/store';
import { useMultiplayer } from '@/lib/multiplayer';
import { HealthConnection } from './HealthConnection';

export function SettingsView({ onBack, onChooseHabits }: { onBack: () => void; onChooseHabits?: () => void }) {
  const multiplayer = useMultiplayer();
  const { activePlayer, soundEnabled, setSoundEnabled, updateLocalPlayerName } = useStore();
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState(activePlayer?.name || '');
  const [savingName, setSavingName] = useState(false);
  const [nameMessage, setNameMessage] = useState<string | null>(null);
  useEffect(() => { setName(activePlayer?.name || ''); }, [activePlayer?.name]);
  useEffect(() => {
    const reason = new URLSearchParams(window.location.search).get('wearable_error');
    if (reason) setError(`Google Health connection was not completed (${reason.replaceAll('_', ' ')}). Try again below.`);
  }, []);
  const saveName = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || trimmed.length > 40) {
      setNameMessage('Name must be 1 to 40 characters.');
      return;
    }
    setSavingName(true);
    setNameMessage(null);
    try {
      if (multiplayer.configured) await multiplayer.updatePlayerName(trimmed);
      else updateLocalPlayerName(trimmed);
      setName(trimmed);
      setNameMessage('Name updated.');
    } catch (caught) {
      setNameMessage(caught instanceof Error ? caught.message : 'Could not update your name.');
    } finally {
      setSavingName(false);
    }
  };
  return <div className="mx-auto max-w-2xl space-y-5">
    <div className="flex items-center gap-3"><button className="flex size-11 items-center justify-center rounded-xl text-zinc-400 hover:text-white" onClick={onBack} aria-label="Back"><ArrowLeft size={20}/></button><h1 className="text-2xl font-semibold">Settings</h1></div>
    {activePlayer && <section className="rounded-2xl border border-white/[0.08] bg-[#17181b] p-4 space-y-3">
      <h2 className="flex items-center gap-2 text-sm font-semibold"><UserRound size={17}/>Profile</h2>
      <form onSubmit={saveName} className="space-y-3">
        <label htmlFor="profile-name" className="block text-xs text-zinc-400">Username</label>
        <div className="flex flex-wrap gap-2">
          <input id="profile-name" value={name} maxLength={40} onChange={event => { setName(event.target.value); setNameMessage(null); }} autoComplete="nickname" className="min-h-11 min-w-0 flex-1 rounded-xl border border-white/[0.15] bg-[#101113] px-3 text-sm text-white outline-none focus:border-emerald-400" />
          <button type="submit" className="control min-h-11" disabled={savingName || name.trim() === activePlayer.name}>{savingName ? 'Saving…' : 'Save name'}</button>
        </div>
        {nameMessage && <p role="status" className="text-xs text-zinc-300">{nameMessage}</p>}
      </form>
    </section>}
    <HealthConnection onChooseHabits={onChooseHabits} />
    <section className="rounded-2xl border border-white/[0.08] bg-[#17181b] p-4 space-y-3">
      <div className="flex items-center justify-between gap-3"><span className="flex items-center gap-2 text-sm"><Volume2 size={17}/>Sounds</span><button role="switch" aria-checked={!!soundEnabled} onClick={() => setSoundEnabled(!soundEnabled)} className={`min-h-11 min-w-16 rounded-full px-3 text-xs ${soundEnabled ? 'bg-emerald-400 text-black' : 'bg-zinc-700 text-white'}`}>{soundEnabled ? 'On' : 'Off'}</button></div>
      {multiplayer.user && <div className="border-t border-white/[0.08] pt-3"><p className="mb-3 text-xs text-zinc-500">{multiplayer.user.email}</p><button className="control min-h-11" onClick={() => multiplayer.signOut().catch(caught => setError(caught instanceof Error ? caught.message : 'Could not sign out.'))}><LogOut size={15}/>Sign out</button></div>}
      {error && <p role="alert" className="text-xs text-amber-300">{error}</p>}
    </section>
  </div>;
}
