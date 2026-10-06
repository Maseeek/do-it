'use client';

import { useEffect, useState } from 'react';
import { PLAYER_COLORS } from '@/lib/types';
import { isPlayerColorUnlocked } from '@/lib/player-colors';
import { ArrowLeft, Copy, LogOut, Share2, UserRound, Volume2 } from 'lucide-react';
import { useStore } from '@/lib/store';
import { useMultiplayer } from '@/lib/multiplayer';
import { HealthConnection } from './HealthConnection';

export function SettingsView({ onBack, onChooseHabits }: { onBack: () => void; onChooseHabits?: () => void }) {
  const multiplayer = useMultiplayer();
  const { activePlayer, isPartnerConnected, players, soundEnabled, setSoundEnabled, updateLocalPlayerName, updatePlayerColor, activePlayerSummary } = useStore();
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState(activePlayer?.name || '');
  const [savingName, setSavingName] = useState(false);
  const [nameMessage, setNameMessage] = useState<string | null>(null);
  const [savingColor, setSavingColor] = useState(false);
  const [colorMessage, setColorMessage] = useState<string | null>(null);
  const [inviteCopied, setInviteCopied] = useState(false);
  const inviteUrl = typeof window !== 'undefined' && multiplayer.duel
    ? `${window.location.origin}/?invite=${multiplayer.duel.invite_code}`
    : '';
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
  const savePlayerColor = async (colorId: typeof PLAYER_COLORS[number]['id']) => {
    setSavingColor(true);
    setColorMessage(null);
    try {
      await updatePlayerColor(colorId);
      setColorMessage('Player color updated.');
    } catch (caught) {
      setColorMessage(caught instanceof Error ? caught.message : 'Could not update your player color.');
    } finally {
      setSavingColor(false);
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
      <div className="space-y-2">
        <div className="flex items-baseline justify-between"><span className="text-xs text-zinc-400">Player color</span><span className="text-[11px] text-zinc-500">{activePlayerSummary.karma.toLocaleString()} lifetime points</span></div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {PLAYER_COLORS.map(option => {
            const unlocked = isPlayerColorUnlocked(option.id, activePlayerSummary.karma);
            const selected = activePlayer.color === option.color;
            return <button key={option.id} type="button" disabled={!unlocked || savingColor} onClick={() => { void savePlayerColor(option.id); }} aria-pressed={selected} className={`flex min-h-11 items-center gap-2 rounded-xl border px-3 text-left text-xs ${selected ? 'border-white/40 bg-white/[0.08]' : 'border-white/[0.08]'} disabled:cursor-not-allowed disabled:opacity-45`}>
              <span className="size-3.5 rounded-full border border-white/20" style={{ backgroundColor: option.color, ...(option.id === 'rainbow' ? { backgroundImage: 'linear-gradient(135deg,#f87171,#fbbf24,#4ade80,#60a5fa,#c084fc)' } : {}) }} />
              <span className="min-w-0"><span className="block">{option.name}</span><span className="text-[10px] text-zinc-500">{unlocked ? (selected ? 'Selected' : 'Unlocked') : `${option.unlockAt.toLocaleString()} points`}</span></span>
            </button>;
          })}
        </div>
        {colorMessage && <p role="status" className="text-xs text-zinc-300">{colorMessage}</p>}
      </div>
    </section>}
    {multiplayer.configured && multiplayer.user && (
      <section className="rounded-2xl border border-white/[0.08] bg-[#17181b] p-4 space-y-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold"><Share2 size={17}/>Account &amp; Duel Invitation</h2>
        <div className="space-y-1 text-xs text-zinc-400">
          <p>Signed-in account: <span className="font-mono text-zinc-200">{multiplayer.user.email}</span></p>
          <p>
            Opponent status:{' '}
            <span className={isPartnerConnected ? 'text-emerald-400 font-medium' : 'text-amber-300 font-medium'}>
              {isPartnerConnected
                ? `Paired with ${multiplayer.slot === 'maciek' ? players.myrna.name : players.maciek.name}`
                : 'No opponent account matched yet — waiting for partner to accept invite'}
            </span>
          </p>
        </div>
        {multiplayer.duel && (
          <div className="space-y-2 pt-1">
            <label htmlFor="settings-invite-link" className="block text-xs text-zinc-400">Invitation link</label>
            <div className="flex flex-wrap gap-2">
              <input
                id="settings-invite-link"
                readOnly
                value={inviteUrl}
                onFocus={event => event.currentTarget.select()}
                className="min-h-11 min-w-0 flex-1 rounded-xl border border-white/[0.15] bg-[#101113] px-3 text-xs text-white outline-none"
              />
              <button
                type="button"
                className="control control-primary min-h-11"
                onClick={async () => {
                  if (!inviteUrl) return;
                  try {
                    await navigator.clipboard.writeText(inviteUrl);
                    setInviteCopied(true);
                    setTimeout(() => setInviteCopied(false), 2500);
                  } catch {
                    setError('Select and copy the invitation link above.');
                  }
                }}
              >
                <Copy size={15} />
                {inviteCopied ? 'Copied!' : 'Copy invite link'}
              </button>
            </div>
          </div>
        )}
      </section>
    )}
    <HealthConnection onChooseHabits={onChooseHabits} />
    <section className="rounded-2xl border border-white/[0.08] bg-[#17181b] p-4 space-y-3">
      <div className="flex items-center justify-between gap-3"><span className="flex items-center gap-2 text-sm"><Volume2 size={17}/>Sounds</span><button role="switch" aria-checked={!!soundEnabled} onClick={() => setSoundEnabled(!soundEnabled)} className={`min-h-11 min-w-16 rounded-full px-3 text-xs ${soundEnabled ? 'bg-emerald-400 text-black' : 'bg-zinc-700 text-white'}`}>{soundEnabled ? 'On' : 'Off'}</button></div>
      {multiplayer.user && <div className="border-t border-white/[0.08] pt-3"><p className="mb-3 text-xs text-zinc-500">{multiplayer.user.email}</p><button className="control min-h-11" onClick={() => multiplayer.signOut().catch(caught => setError(caught instanceof Error ? caught.message : 'Could not sign out.'))}><LogOut size={15}/>Sign out</button></div>}
      {error && <p role="alert" className="text-xs text-amber-300">{error}</p>}
    </section>
  </div>;
}
