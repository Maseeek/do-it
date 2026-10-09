'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMultiplayer } from '@/lib/multiplayer';
import { getInviteOutcome } from '@/lib/invite-navigation';
import { useModalFocus } from '@/lib/use-modal-focus';
import { DoLogo } from './DoLogo';

export function ExistingDuelInviteGate({ inviteCode, onDismiss }: { inviteCode: string; onDismiss?: () => void }) {
  const multiplayer = useMultiplayer();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const duel = multiplayer.duel;
  const user = multiplayer.user;

  const continueToCurrentDuel = () => {
    if (onDismiss) onDismiss();
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.delete('invite');
      router.replace(url.pathname + (url.search ? url.search : '') + url.hash);
    }
  };

  const modalRef = useModalFocus(Boolean(duel && user), continueToCurrentDuel);
  if (!duel || !user) return null;

  const partnerName = duel.owner_id === user.id
    ? (duel.guest_name || 'your partner')
    : duel.owner_name;

  const outcome = getInviteOutcome({
    inviteCode,
    duelInviteCode: duel.invite_code,
    userId: user.id,
    ownerId: duel.owner_id,
    hasGuest: multiplayer.hasPairedPartner,
  });

  const ownInviteUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/?invite=${duel.invite_code}`
    : `/?invite=${duel.invite_code}`;

  const copyInvite = async () => {
    try {
      await navigator.clipboard.writeText(ownInviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback if clipboard API unavailable
    }
  };

  const switchAccount = async () => {
    setBusy(true);
    setError(null);
    try {
      await multiplayer.signOut();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not sign out.');
    } finally {
      setBusy(false);
    }
  };

  const replaceDuel = async () => {
    setBusy(true);
    setError(null);
    try {
      const name = String(user.user_metadata?.display_name || '').trim() || duel.owner_name;
      await multiplayer.replaceSoloDuelWithInvite(inviteCode, name);
      continueToCurrentDuel();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not join the duel.');
    } finally {
      setBusy(false);
    }
  };

  const handlePrimaryOk = () => {
    if (outcome === 'solo-replaceable') {
      void replaceDuel();
      return;
    }
    if (outcome === 'paired-conflict') {
      void switchAccount();
      return;
    }
    continueToCurrentDuel();
  };

  const title =
    outcome === 'empty-invite' || outcome === 'invalid-invite'
      ? 'Invalid invitation link'
      : outcome === 'own-invite'
      ? 'Your invitation link'
      : outcome === 'already-joined'
      ? 'Already joined this duel'
      : outcome === 'paired-conflict'
      ? 'Cannot join — active duel in progress'
      : 'Replace solo duel and join?';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="invite-dialog-title"
      ref={modalRef}
      tabIndex={-1}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md px-4 py-6"
    >
      <div className="w-full max-w-md rounded-3xl border border-white/15 bg-[#16181d] text-white p-6 space-y-5 shadow-2xl">
        <div className="text-center">
          <DoLogo size="lg" className="mx-auto mb-3" />
          <h1 id="invite-dialog-title" className="text-xl font-bold tracking-tight text-white">
            {title}
          </h1>
          {user.email && (
            <p className="text-xs font-mono text-zinc-400 mt-1">
              Signed in as {user.email}
            </p>
          )}
        </div>

        {(outcome === 'empty-invite' || outcome === 'invalid-invite') && (
          <div className="space-y-3 text-sm text-zinc-300">
            <p>
              {outcome === 'empty-invite'
                ? 'This invitation link does not contain an invitation code. It may have been cut off when copied or shared.'
                : 'This invitation link is invalid or incomplete. It does not match a valid duel invitation token.'}
            </p>
            <p className="text-xs text-zinc-400">
              Ask your opponent to copy a fresh invitation link from their Duel tab, or press Cancel to return to your duel.
            </p>
          </div>
        )}

        {outcome === 'own-invite' && (
          <div className="space-y-3">
            <p className="text-sm text-zinc-300">
              You cannot join your own invitation link. This link belongs to your duel ({user.email}). Share it with your opponent on a separate account so they can join you.
            </p>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                disabled={busy}
                className="w-full rounded-xl border border-white/20 bg-white/10 hover:bg-white/15 p-2.5 text-xs font-semibold text-white disabled:opacity-50"
                onClick={() => void copyInvite()}
              >
                {copied ? 'Link copied!' : 'Copy invitation link'}
              </button>
              <button
                type="button"
                disabled={busy}
                className="w-full rounded-xl border border-white/15 p-2.5 text-xs text-zinc-300 hover:bg-white/5 disabled:opacity-50"
                onClick={() => void switchAccount()}
              >
                Sign out and use another account
              </button>
            </div>
          </div>
        )}

        {outcome === 'already-joined' && (
          <div className="space-y-3">
            <p className="text-sm text-zinc-300">
              You cannot re-join this invitation because your account ({user.email}) is already connected to this duel with {partnerName}.
            </p>
          </div>
        )}

        {outcome === 'paired-conflict' && (
          <div className="space-y-3">
            <p className="text-sm text-zinc-300">
              You cannot join this invitation on {user.email} because you are already competing in an active duel with {partnerName}. Each account can belong to one duel at a time.
            </p>
            <p className="text-xs text-zinc-400">
              Press <strong className="text-white">OK</strong> to sign out and accept this invitation with another account, or press <strong className="text-white">Cancel</strong> to stay in your current duel.
            </p>
          </div>
        )}

        {outcome === 'solo-replaceable' && (
          <div className="space-y-3">
            <p className="text-sm text-zinc-300">
              Your account ({user.email}) currently has an unpaired solo duel. Press <strong className="text-white">OK</strong> to replace your solo duel and join this invitation, or <strong className="text-white">Cancel</strong> to keep your current duel.
            </p>
            <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
              Joining will permanently delete your unpaired solo duel and any solo habits, check-ins, and wagers on it. To keep a copy, press Cancel and export a backup first.
            </p>
            <button
              type="button"
              disabled={busy}
              className="w-full rounded-xl border border-white/15 p-2.5 text-xs text-zinc-300 hover:bg-white/5 disabled:opacity-50"
              onClick={() => void switchAccount()}
            >
              Sign out and use another account instead
            </button>
          </div>
        )}

        {error && (
          <div role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-200 space-y-1">
            <p className="font-semibold">Why joining failed:</p>
            <p>{error}</p>
          </div>
        )}

        <div className="flex items-center gap-3 pt-1">
          <button
            type="button"
            disabled={busy}
            className="flex-1 rounded-xl border border-white/20 bg-transparent hover:bg-white/5 p-3 text-sm font-semibold text-zinc-200 disabled:opacity-50"
            onClick={continueToCurrentDuel}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busy}
            className="flex-1 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-black hover:opacity-90 p-3 text-sm font-semibold disabled:opacity-50"
            onClick={handlePrimaryOk}
          >
            {busy ? 'Please wait…' : 'OK'}
          </button>
        </div>
      </div>
    </div>
  );
}
