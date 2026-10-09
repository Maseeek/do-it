'use client';

import { useState } from 'react';
import { useMultiplayer } from '@/lib/multiplayer';
import { DoLogo } from './DoLogo';

export function ExistingDuelInviteGate({ inviteCode }: { inviteCode: string }) {
  const multiplayer = useMultiplayer();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const duel = multiplayer.duel;
  const user = multiplayer.user;
  if (!duel || !user) return null;

  const sameDuel = duel.invite_code.toLowerCase() === inviteCode.toLowerCase();
  const ownsDuel = duel.owner_id === user.id;
  const canReplace = !sameDuel && ownsDuel && !duel.guest_id;

  const continueToCurrentDuel = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete('invite');
    window.history.replaceState(null, '', url.pathname + url.search + url.hash);
  };

  const switchAccount = async () => {
    setBusy(true);
    setError(null);
    try { await multiplayer.signOut(); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not sign out.'); }
    finally { setBusy(false); }
  };

  const replaceDuel = async () => {
    if (!window.confirm('Joining this invitation will permanently delete your current solo duel, including its habits, check-ins, and stakes. Continue?')) return;
    setBusy(true);
    setError(null);
    try {
      const name = String(user.user_metadata?.display_name || '').trim() || duel.owner_name;
      await multiplayer.replaceSoloDuelWithInvite(inviteCode, name);
      continueToCurrentDuel();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not join the duel.');
    } finally { setBusy(false); }
  };

  return (
    <main className="min-h-screen bg-background text-foreground flex items-center justify-center px-4 transition-colors">
      <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-[#1c1c1e] p-6 space-y-5 shadow-2xl">
        <div className="text-center">
          <DoLogo size="lg" className="mx-auto mb-4" />
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Join the duel</h1>
        </div>
        {sameDuel ? (
          <p className="text-sm text-zinc-400">
            {ownsDuel ? 'This is your invitation link. Share it with someone signed in to a different account.' : 'You have already joined this duel.'}
          </p>
        ) : (
          <p className="text-sm text-zinc-400">
            This account already has a duel. Each account can belong to one duel at a time.
          </p>
        )}
        {canReplace && (
          <div className="space-y-3">
            <p className="text-sm text-amber-500">
              Joining will permanently delete your current solo duel and its habits, check-ins, and stakes.
            </p>
            <p className="text-xs text-zinc-400">
              To keep a copy, continue to your duel and export a backup from Settings first.
            </p>
            <button
              disabled={busy}
              className="w-full rounded-xl bg-white text-black p-3 font-semibold disabled:opacity-50"
              onClick={() => void replaceDuel()}
            >
              {busy ? 'Please wait…' : 'Replace solo duel and join'}
            </button>
          </div>
        )}
        <button
          disabled={busy}
          className="w-full rounded-xl border border-black/10 dark:border-white/20 p-3 text-sm font-medium disabled:opacity-50 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          onClick={() => void switchAccount()}
        >
          Sign out and use another account
        </button>
        <button
          disabled={busy}
          className="w-full text-xs text-zinc-400 hover:text-foreground disabled:opacity-50"
          onClick={continueToCurrentDuel}
        >
          Continue to my current duel
        </button>
        {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
      </div>
    </main>
  );
}
