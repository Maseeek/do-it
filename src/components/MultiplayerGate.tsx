'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase';
import { useMultiplayer } from '@/lib/multiplayer';
import { extractInviteCode, isValidInviteCode } from '@/lib/invite-navigation';
import { useModalFocus } from '@/lib/use-modal-focus';
import { DoLogo } from './DoLogo';

export function MultiplayerGate({ inviteCode, onDismissInvite }: { inviteCode: string | null; onDismissInvite?: () => void }) {
  const multiplayer = useMultiplayer();
  const router = useRouter();
  const savedInviteCode = typeof multiplayer.user?.user_metadata?.invite_code === 'string' ? multiplayer.user.user_metadata.invite_code : null;
  const rawInviteCode = inviteCode !== null ? inviteCode : savedInviteCode;
  const [ignoredInviteCode, setIgnoredInviteCode] = useState<string | null>(null);
  const [pastedInviteInput, setPastedInviteInput] = useState('');
  const effectiveInviteCode = rawInviteCode !== null && rawInviteCode === ignoredInviteCode ? null : rawInviteCode;
  const hasInvalidInviteLink = effectiveInviteCode !== null && !isValidInviteCode(effectiveInviteCode);
  const [mode, setMode] = useState<'signup' | 'signin'>('signup');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [inviteJoinFailure, setInviteJoinFailure] = useState<string | null>(null);

  useEffect(() => {
    if (!multiplayer.user) return;
    const metadataName = String(multiplayer.user.user_metadata?.display_name || '').trim();
    const fallbackName = metadataName || (multiplayer.user.email?.split('@')[0] ?? '');
    setName(prev => (prev.trim() ? prev : fallbackName));
  }, [multiplayer.user]);

  const dismissInvite = () => {
    if (effectiveInviteCode !== null) setIgnoredInviteCode(effectiveInviteCode);
    setInviteJoinFailure(null);
    setError(null);
    if (onDismissInvite) onDismissInvite();
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (url.searchParams.has('invite')) {
        url.searchParams.delete('invite');
        router.replace(url.pathname + (url.search ? url.search : '') + url.hash);
      }
    }
  };

  const showPopup = hasInvalidInviteLink || inviteJoinFailure !== null;
  const popupRef = useModalFocus(showPopup, () => {
    if (hasInvalidInviteLink) dismissInvite();
    else setInviteJoinFailure(null);
  });

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await action();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  };

  const submitAuth = (event: FormEvent) => {
    event.preventDefault();
    void run(async () => {
      const client = getSupabaseClient();
      if (!client) throw new Error('Supabase is not configured');
      if (mode === 'signup') {
        const validInvite = isValidInviteCode(effectiveInviteCode) ? effectiveInviteCode.trim() : undefined;
        const { data, error: authError } = await client.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: validInvite ? window.location.href : window.location.origin,
            data: { display_name: name.trim(), ...(validInvite ? { invite_code: validInvite } : {}) },
          },
        });
        if (authError) throw authError;
        if (!data.session) setMessage('Check your email to confirm your account, then sign in.');
      } else {
        const { error: authError } = await client.auth.signInWithPassword({ email, password });
        if (authError) throw authError;
      }
      await multiplayer.refresh();
    });
  };

  const submitDuel = (event: FormEvent) => {
    event.preventDefault();
    void run(async () => {
      const displayName = name.trim() || String(multiplayer.user?.user_metadata?.display_name || '').trim();
      if (!displayName) throw new Error('Enter your display name.');
      const candidateInvite = effectiveInviteCode || (pastedInviteInput.trim() ? extractInviteCode(pastedInviteInput) : null);
      if (candidateInvite !== null) {
        try {
          await multiplayer.acceptInvite(candidateInvite, displayName);
          dismissInvite();
        } catch (joinErr) {
          const reason = joinErr instanceof Error ? joinErr.message : 'Could not join this invitation.';
          setInviteJoinFailure(reason);
          throw joinErr;
        }
      } else {
        await multiplayer.createDuel(displayName);
      }
    });
  };

  return (
    <main className="relative z-10 min-h-screen bg-[#f7f8f9] dark:bg-black text-white flex items-center justify-center px-4 py-8 transition-colors">
      {showPopup && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="gate-invite-dialog-title"
          ref={popupRef}
          tabIndex={-1}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md px-4 py-6"
        >
          <div className="w-full max-w-md rounded-3xl border border-white/15 bg-[#16181d] text-white p-6 space-y-5 shadow-2xl">
            <div className="text-center">
              <DoLogo size="lg" className="mx-auto mb-3" />
              <h1 id="gate-invite-dialog-title" className="text-xl font-bold tracking-tight text-white">
                {hasInvalidInviteLink ? 'Invalid invitation link' : 'Could not join duel'}
              </h1>
              {multiplayer.user?.email && (
                <p className="text-xs font-mono text-zinc-400 mt-1">
                  Signed in as {multiplayer.user.email}
                </p>
              )}
            </div>

            <div className="space-y-3 text-sm text-zinc-300">
              <p>
                {hasInvalidInviteLink
                  ? 'This invitation link is not valid or has expired. Make sure you copied the full URL from your partner.'
                  : inviteJoinFailure || 'The invitation code could not be redeemed.'}
              </p>
              <p className="text-xs text-zinc-400">
                Press <strong className="text-white">OK</strong> to dismiss this invitation link and continue, or <strong className="text-white">Cancel</strong> to close this dialog.
              </p>
            </div>
            <div className="flex items-center gap-3 pt-1">
              <button
                type="button"
                className="flex-1 rounded-xl border border-white/20 bg-transparent hover:bg-white/5 p-3 text-sm font-semibold text-zinc-200"
                onClick={() => {
                  if (hasInvalidInviteLink) dismissInvite();
                  else setInviteJoinFailure(null);
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="flex-1 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-black hover:opacity-90 p-3 text-sm font-semibold"
                onClick={dismissInvite}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-[#1c1c1e] p-6 space-y-5 shadow-2xl">
        <div className="text-center">
          <DoLogo size="lg" className="mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white">
            {multiplayer.user
              ? effectiveInviteCode
                ? 'Join the duel'
                : 'Start a duel'
              : mode === 'signup'
              ? 'Create your account'
              : 'Welcome back'}
          </h1>
          <p className="text-sm text-zinc-400 mt-2">
            {effectiveInviteCode
              ? multiplayer.user
                ? `Signed in as ${multiplayer.user.email}. Confirm your display name to accept this duel invitation.`
                : 'Your invitation will be ready as soon as you sign in with your email.'
              : 'Build habits together, then face off each week.'}
          </p>
        </div>

        {!multiplayer.configured ? (
          <p role="alert" className="text-sm text-amber-300">
            Supabase needs to be configured by the app owner before accounts and duels can be used.
          </p>
        ) : multiplayer.loading ? (
          <p className="text-center text-zinc-400">Loading…</p>
        ) : multiplayer.user && multiplayer.error ? (
          <button className="w-full rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-black p-3 font-semibold" onClick={() => void multiplayer.refresh()}>
            Retry loading account
          </button>
        ) : multiplayer.user ? (
          <form onSubmit={submitDuel} className="space-y-3">
            <label className="block text-xs text-zinc-400">
              Your display name
              <input
                className="w-full mt-1 rounded-xl bg-zinc-900 border border-white/15 p-3 text-white"
                maxLength={40}
                required
                value={name}
                onChange={e => setName(e.target.value)}
              />
            </label>

            {!effectiveInviteCode && (
              <label className="block text-xs text-zinc-400">
                Have an invitation link or code? (Optional)
                <input
                  type="text"
                  placeholder="Paste invite link or code to join partner…"
                  className="w-full mt-1 rounded-xl bg-zinc-900 border border-white/15 p-3 text-white text-xs"
                  value={pastedInviteInput}
                  onChange={e => setPastedInviteInput(e.target.value)}
                />
              </label>
            )}

            {effectiveInviteCode ? (
              <div className="flex items-center gap-3 pt-1">
                <button
                  type="button"
                  disabled={busy}
                  className="flex-1 rounded-xl border border-white/20 p-3 text-sm font-semibold text-zinc-200 disabled:opacity-50"
                  onClick={dismissInvite}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="flex-1 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-black p-3 text-sm font-semibold disabled:opacity-50"
                >
                  {busy ? 'Please wait…' : 'OK — Join duel'}
                </button>
              </div>
            ) : (
              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-black p-3 font-semibold disabled:opacity-50"
              >
                {busy
                  ? 'Please wait…'
                  : pastedInviteInput.trim()
                  ? 'Accept invitation and join duel'
                  : 'Create duel and get invite link'}
              </button>
            )}

            <button type="button" className="w-full text-xs text-zinc-400" onClick={() => void run(multiplayer.signOut)}>
              Sign out
            </button>
          </form>
        ) : (
          <form onSubmit={submitAuth} className="space-y-3">
            {mode === 'signup' && (
              <label className="block text-xs text-zinc-400">
                Display name
                <input
                  className="w-full mt-1 rounded-xl bg-zinc-900 border border-white/15 p-3 text-white"
                  maxLength={40}
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                />
              </label>
            )}
            <label className="block text-xs text-zinc-400">
              Email
              <input
                type="email"
                autoComplete="email"
                className="w-full mt-1 rounded-xl bg-zinc-900 border border-white/15 p-3 text-white"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </label>
            <label className="block text-xs text-zinc-400">
              Password
              <input
                type="password"
                minLength={6}
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                className="w-full mt-1 rounded-xl bg-zinc-900 border border-white/15 p-3 text-white"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </label>
            <button disabled={busy} className="w-full rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-black p-3 font-semibold disabled:opacity-50">
              {busy ? 'Please wait…' : mode === 'signup' ? 'Create account' : 'Sign in'}
            </button>
            <button
              type="button"
              className="w-full text-xs text-zinc-400"
              onClick={() => {
                setMode(mode === 'signup' ? 'signin' : 'signup');
                setError(null);
              }}
            >
              {mode === 'signup' ? 'Already have an account? Sign in' : 'Need an account? Sign up'}
            </button>
            {effectiveInviteCode && (
              <button
                type="button"
                className="w-full text-xs text-zinc-500 hover:text-zinc-300"
                onClick={dismissInvite}
              >
                Cancel invitation link
              </button>
            )}
          </form>
        )}

        {(error || multiplayer.error) && (
          <p role="alert" className="text-sm text-red-300">
            {error || multiplayer.error}
          </p>
        )}
        {message && (
          <p role="status" className="text-sm text-emerald-300">
            {message}
          </p>
        )}
      </div>
    </main>
  );
}
