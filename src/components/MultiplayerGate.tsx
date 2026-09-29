'use client';

import { FormEvent, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase';
import { useMultiplayer } from '@/lib/multiplayer';
import { DoLogo } from './DoLogo';

export function MultiplayerGate({ inviteCode }: { inviteCode: string | null }) {
  const multiplayer = useMultiplayer();
  const savedInviteCode = typeof multiplayer.user?.user_metadata?.invite_code === 'string' ? multiplayer.user.user_metadata.invite_code : null;
  const rawInviteCode = inviteCode || savedInviteCode;
  const [ignoredInviteCode, setIgnoredInviteCode] = useState<string | null>(null);
  const effectiveInviteCode = rawInviteCode === ignoredInviteCode ? null : rawInviteCode;
  const [mode, setMode] = useState<'signup' | 'signin'>('signup');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async (action: () => Promise<void>) => {
    setBusy(true); setError(null); setMessage(null);
    try { await action(); } catch (e) { setError(e instanceof Error ? e.message : 'Something went wrong.'); }
    finally { setBusy(false); }
  };
  const submitAuth = (event: FormEvent) => {
    event.preventDefault();
    void run(async () => {
      const client = getSupabaseClient();
      if (!client) throw new Error('Supabase is not configured');
      if (mode === 'signup') {
        const { data, error: authError } = await client.auth.signUp({ email, password, options: { emailRedirectTo: inviteCode ? window.location.href : window.location.origin, data: { display_name: name.trim(), ...(inviteCode ? { invite_code: inviteCode } : {}) } } });
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
      if (effectiveInviteCode) await multiplayer.acceptInvite(effectiveInviteCode, displayName);
      else await multiplayer.createDuel(displayName);
    });
  };

  return <main className="min-h-screen bg-black text-white flex items-center justify-center px-4">
    <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-[#1c1c1e] p-6 space-y-5">
      <div className="text-center"><DoLogo size="lg" className="mx-auto mb-4" /><h1 className="text-2xl font-bold">{multiplayer.user ? effectiveInviteCode ? 'Join the duel' : 'Start a duel' : mode === 'signup' ? 'Create your account' : 'Welcome back'}</h1>
        <p className="text-sm text-zinc-400 mt-2">{effectiveInviteCode ? 'Your invitation will be ready after you sign in.' : 'Build habits together, then face off each week.'}</p></div>
      {!multiplayer.configured ? <p role="alert" className="text-sm text-amber-300">Supabase needs to be configured by the app owner before accounts and duels can be used.</p> : multiplayer.loading ? <p className="text-center text-zinc-400">Loading…</p> : multiplayer.user && multiplayer.error ?
        <button className="w-full rounded-xl bg-white text-black p-3 font-semibold" onClick={() => void multiplayer.refresh()}>Retry loading account</button> : multiplayer.user ?
        <form onSubmit={submitDuel} className="space-y-3"><label className="block text-xs text-zinc-400">Your display name<input className="w-full mt-1 rounded-xl bg-black border border-white/15 p-3 text-white" maxLength={40} required value={name || String(multiplayer.user.user_metadata?.display_name || '')} onChange={e => setName(e.target.value)} /></label>
          <button disabled={busy} className="w-full rounded-xl bg-white text-black p-3 font-semibold disabled:opacity-50">{busy ? 'Please wait…' : effectiveInviteCode ? 'Accept invitation' : 'Create duel and get invite link'}</button>
          {effectiveInviteCode && <button type="button" className="w-full text-xs text-zinc-400" onClick={() => { setIgnoredInviteCode(effectiveInviteCode); setError(null); }}>Start my own duel instead</button>}
          <button type="button" className="w-full text-xs text-zinc-400" onClick={() => void run(multiplayer.signOut)}>Sign out</button></form> :
        <form onSubmit={submitAuth} className="space-y-3">
          {mode === 'signup' && <label className="block text-xs text-zinc-400">Display name<input className="w-full mt-1 rounded-xl bg-black border border-white/15 p-3 text-white" maxLength={40} required value={name} onChange={e => setName(e.target.value)} /></label>}
          <label className="block text-xs text-zinc-400">Email<input type="email" autoComplete="email" className="w-full mt-1 rounded-xl bg-black border border-white/15 p-3 text-white" required value={email} onChange={e => setEmail(e.target.value)} /></label>
          <label className="block text-xs text-zinc-400">Password<input type="password" minLength={6} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} className="w-full mt-1 rounded-xl bg-black border border-white/15 p-3 text-white" required value={password} onChange={e => setPassword(e.target.value)} /></label>
          <button disabled={busy} className="w-full rounded-xl bg-white text-black p-3 font-semibold disabled:opacity-50">{busy ? 'Please wait…' : mode === 'signup' ? 'Create account' : 'Sign in'}</button>
          <button type="button" className="w-full text-xs text-zinc-400" onClick={() => { setMode(mode === 'signup' ? 'signin' : 'signup'); setError(null); }}>{mode === 'signup' ? 'Already have an account? Sign in' : 'Need an account? Sign up'}</button></form>}
      {(error || multiplayer.error) && <p role="alert" className="text-sm text-red-300">{error || multiplayer.error}</p>}
      {message && <p role="status" className="text-sm text-emerald-300">{message}</p>}
    </div>
  </main>;
}
