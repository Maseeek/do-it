'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMultiplayer } from '@/lib/multiplayer';
import { getInviteOutcome } from '@/lib/invite-navigation';
import { DoLogo } from './DoLogo';

export function ExistingDuelInviteGate({ inviteCode, onDismiss }: { inviteCode: string; onDismiss?: () => void }) {
  const multiplayer = useMultiplayer();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const duel = multiplayer.duel;
  const user = multiplayer.user;
  if (!duel || !user) return null;

  const partnerName = duel.owner_id === user.id
    ? (duel.guest_name || 'your partner')
    : duel.owner_name;

  const outcome = getInviteOutcome({
    inviteCode,
    duelInviteCode: duel.invite_code,
    userId: user.id,
    ownerId: duel.owner_id,
    hasGuest: !!duel.guest_id,
  });

  const continueToCurrentDuel = () => {
    if (onDismiss) onDismiss();
    const url = new URL(window.location.href);
    url.searchParams.delete('invite');
    router.replace(url.pathname + (url.search ? url.search : '') + url.hash);
  };

  const copyInvite = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback if clipboard API unavailable
    }
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

  return <main className="min-h-screen bg-black text-white flex items-center justify-center px-4">
    <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-[#1c1c1e] p-6 space-y-5">
      <div className="text-center">
        <DoLogo size="lg" className="mx-auto mb-4" />
        <h1 className="text-2xl font-bold">
          {outcome === 'own-invite' ? 'Your invitation link' :
           outcome === 'already-joined' ? 'Already joined' :
           outcome === 'paired-conflict' ? 'Active duel in progress' : 'Join the duel'}
        </h1>
      </div>

      {outcome === 'own-invite' && (
        <div className="space-y-4">
          <p className="text-sm text-zinc-300">
            This is your active invitation link. Share it with someone signed in to a different account so they can join your duel.
          </p>
          <button
            type="button"
            disabled={busy}
            className="w-full rounded-xl bg-white text-black p-3 font-semibold disabled:opacity-50"
            onClick={() => void copyInvite()}
          >
            {copied ? 'Link copied!' : 'Copy invitation link'}
          </button>
        </div>
      )}

      {outcome === 'already-joined' && (
        <div className="space-y-4">
          <p className="text-sm text-zinc-300">
            You have already joined this duel with {partnerName}.
          </p>
        </div>
      )}

      {outcome === 'paired-conflict' && (
        <div className="space-y-2">
          <p className="text-sm text-zinc-300">
            You are already competing in an active duel with {partnerName}. Each account can belong to one duel at a time.
          </p>
          <p className="text-xs text-zinc-400">
            To join this invitation, sign out and use a different account.
          </p>
        </div>
      )}

      {outcome === 'solo-replaceable' && (
        <div className="space-y-3">
          <p className="text-sm text-zinc-300">
            This account has an unpaired solo duel. You can replace it to join this new duel.
          </p>
          <p className="text-sm text-amber-300">
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
        className="w-full rounded-xl border border-white/20 p-3 text-sm disabled:opacity-50"
        onClick={() => void switchAccount()}
      >
        Sign out and use another account
      </button>
      <button
        disabled={busy}
        className="w-full text-xs text-zinc-400 disabled:opacity-50"
        onClick={continueToCurrentDuel}
      >
        Continue to my current duel
      </button>
      {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
    </div>
  </main>;
}
