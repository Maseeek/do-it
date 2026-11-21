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
        const membershipSetup = new URL(window.location.href).searchParams.get('membership') === 'setup';
        const { data, error: authError } = await client.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: validInvite || membershipSetup ? window.location.href : window.location.origin,
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

  const fieldLabel = 'block space-y-1.5 text-label text-secondary';
  const primaryButton = 'control control-primary w-full !min-h-12 !text-[0.9375rem]';
  const quietButton = 'flex min-h-11 w-full items-center justify-center rounded-xl text-label text-secondary hover:text-foreground transition-colors disabled:opacity-50';

  return (
    <main className="relative z-10 min-h-dvh bg-background text-foreground flex items-center justify-center px-4 py-10 transition-colors">
      {showPopup && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="gate-invite-dialog-title"
          ref={popupRef}
          tabIndex={-1}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md px-4 py-6"
        >
          <div className="w-full max-w-md rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface-1)] text-foreground p-6 flex flex-col gap-5 shadow-2xl">
            <div className="text-center">
              <DoLogo size="lg" className="mx-auto mb-4" />
              <h1 id="gate-invite-dialog-title" className="text-title text-foreground">
                {hasInvalidInviteLink ? 'Invalid invitation link' : 'Could not join duel'}
              </h1>
              {multiplayer.user?.email && (
                <p className="text-caption text-muted mt-1">
                  Signed in as {multiplayer.user.email}
                </p>
              )}
            </div>

            <div className="space-y-3 text-body text-secondary">
              <p>
                {hasInvalidInviteLink
                  ? 'This invitation link is not valid or has expired. Make sure you copied the full URL from your partner.'
                  : inviteJoinFailure || 'The invitation code could not be redeemed.'}
              </p>
              <p className="text-label font-normal text-muted">
                Press <strong className="text-foreground">OK</strong> to dismiss this invitation link and continue, or <strong className="text-foreground">Cancel</strong> to close this dialog.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="control flex-1 !min-h-12"
                onClick={() => {
                  if (hasInvalidInviteLink) dismissInvite();
                  else setInviteJoinFailure(null);
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="control control-primary flex-1 !min-h-12"
                onClick={dismissInvite}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="w-full max-w-sm flex flex-col gap-8">
        <div className="text-center">
          <DoLogo size="lg" className="mx-auto mb-5" />
          <h1 className="text-display text-foreground text-balance">
            {multiplayer.user
              ? effectiveInviteCode
                ? 'Join the duel'
                : 'Start a duel'
              : mode === 'signup'
              ? 'Create your account'
              : 'Welcome back'}
          </h1>
          <p className="text-body text-secondary mt-2 text-balance">
            {effectiveInviteCode
              ? multiplayer.user
                ? `Signed in as ${multiplayer.user.email}. Confirm your display name to accept this duel invitation.`
                : 'Your invitation will be ready as soon as you sign in with your email.'
              : 'Build habits together, then face off each week.'}
          </p>
        </div>

        {!multiplayer.configured ? (
          <p role="alert" className="text-body text-center text-amber-600 dark:text-amber-300">
            Supabase needs to be configured by the app owner before accounts and duels can be used.
          </p>
        ) : multiplayer.loading ? (
          <p className="text-center text-body text-secondary">Loading…</p>
        ) : multiplayer.user && multiplayer.error ? (
          <button className={primaryButton} onClick={() => void multiplayer.refresh()}>
            Retry loading account
          </button>
        ) : multiplayer.user ? (
          <form onSubmit={submitDuel} className="flex flex-col gap-4">
            <label className={fieldLabel}>
              <span>Your display name</span>
              <input
                className="field"
                maxLength={40}
                required
                value={name}
                onChange={e => setName(e.target.value)}
              />
            </label>

            {!effectiveInviteCode && (
              <label className={fieldLabel}>
                <span>Have an invitation link or code? (Optional)</span>
                <input
                  type="text"
                  placeholder="Paste invite link or code to join partner…"
                  className="field"
                  value={pastedInviteInput}
                  onChange={e => setPastedInviteInput(e.target.value)}
                />
              </label>
            )}

            <div className="mt-2 flex flex-col gap-1">
              {effectiveInviteCode ? (
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    disabled={busy}
                    className="control flex-1 !min-h-12"
                    onClick={dismissInvite}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={busy}
                    className="control control-primary flex-1 !min-h-12"
                  >
                    {busy ? 'Please wait…' : 'OK — Join duel'}
                  </button>
                </div>
              ) : (
                <button type="submit" disabled={busy} className={primaryButton}>
                  {busy
                    ? 'Please wait…'
                    : pastedInviteInput.trim()
                    ? 'Accept invitation and join duel'
                    : 'Create duel and get invite link'}
                </button>
              )}

              <button type="button" className={quietButton} onClick={() => void run(multiplayer.signOut)}>
                Sign out
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={submitAuth} className="flex flex-col gap-4">
            {mode === 'signup' && (
              <label className={fieldLabel}>
                <span>Display name</span>
                <input
                  className="field"
                  maxLength={40}
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                />
              </label>
            )}
            <label className={fieldLabel}>
              <span>Email</span>
              <input
                type="email"
                autoComplete="email"
                className="field"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </label>
            <label className={fieldLabel}>
              <span>Password</span>
              <input
                type="password"
                minLength={6}
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                className="field"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </label>
            <div className="mt-2 flex flex-col gap-1">
              <button disabled={busy} className={primaryButton}>
                {busy ? 'Please wait…' : mode === 'signup' ? 'Create account' : 'Sign in'}
              </button>
              <button
                type="button"
                className={quietButton}
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
                  className={quietButton}
                  onClick={dismissInvite}
                >
                  Cancel invitation link
                </button>
              )}
            </div>
          </form>
        )}

        {(error || multiplayer.error) && (
          <p role="alert" className="-mt-4 text-label text-center text-red-600 dark:text-red-300">
            {error || multiplayer.error}
          </p>
        )}
        {message && (
          <p role="status" className="-mt-4 text-label text-center text-emerald-600 dark:text-emerald-300">
            {message}
          </p>
        )}
      </div>
    </main>
  );
}
