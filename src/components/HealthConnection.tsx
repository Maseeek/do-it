'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Activity, ArrowUpRight, RefreshCw } from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabase';
import { useMultiplayer } from '@/lib/multiplayer';
import { useStore } from '@/lib/store';

type Status = { available?: boolean; connected: boolean; scopes: string[]; lastCheckedAt?: string | null; needsAttention?: boolean; message?: string | null };

async function healthRequest(path: string, method: 'GET' | 'POST' | 'DELETE', body?: object) {
  const client = getSupabaseClient();
  const { data: { session } } = await client?.auth.getSession() || { data: { session: null } };
  if (!session) throw new Error('Sign in first.');
  const response = await fetch(path, { method, cache: 'no-store', headers: { Authorization: `Bearer ${session.access_token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Health connection is unavailable.');
  return data;
}

export function HealthConnection({ compact = false, onChooseHabits }: { compact?: boolean; onChooseHabits?: () => void }) {
  const multiplayer = useMultiplayer();
  const { activeHabits } = useStore();
  const [status, setStatus] = useState<Status | null>(null);
  const [busy, setBusy] = useState(false);
  const lastAttempt = useRef(0);
  const [error, setError] = useState<string | null>(null);
  const refresh = useCallback(async () => {
    if (!multiplayer.user || !multiplayer.duel) return;
    try { setStatus(await healthRequest('/api/sync/google-health', 'GET')); }
    catch (caught) { if (!compact) setError(caught instanceof Error ? caught.message : 'Health status unavailable.'); }
  }, [multiplayer.user, multiplayer.duel, compact]);

  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => {
    if (!compact || !status?.connected || Date.now() - lastAttempt.current < 10 * 60_000) return;
    if (status.lastCheckedAt && Date.now() - Date.parse(status.lastCheckedAt) < 10 * 60_000) return;
    let cancelled = false;
    lastAttempt.current = Date.now();
    healthRequest('/api/sync/google-health', 'POST').then(async () => { if (!cancelled) await refresh(); }).catch(async () => { if (!cancelled) await refresh(); });
    return () => { cancelled = true; };
  }, [compact, status?.connected, status?.lastCheckedAt, refresh]);

  if (!multiplayer.configured) return null;
  if (status?.available === false) {
    return compact ? null : <section className="rounded-2xl border border-white/[0.08] bg-[#17181b] p-4 space-y-2"><h2 className="text-sm font-semibold">Google Health</h2><p role="status" className="text-xs leading-5 text-zinc-400">{status.message}</p></section>;
  }
  if (compact) {
    if (!status) return null;
    if (!activeHabits.some(habit => habit.automation) || (status?.connected && !status.needsAttention && !error)) return null;
    return <div role="status" className="rounded-xl border border-amber-400/20 bg-amber-400/[0.06] px-3 py-2 text-xs text-amber-200">{status?.message || error || 'Connect Google Health from your profile to automate selected habits.'}</div>;
  }

  async function connect() {
    setBusy(true); setError(null);
    try {
      const data = await healthRequest('/api/auth/google', 'POST', { timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone });
      window.location.assign(data.url);
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not connect.'); setBusy(false); }
  }
  async function sync() {
    setBusy(true); setError(null);
    try { await healthRequest('/api/sync/google-health', 'POST'); await refresh(); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not check health data.'); }
    finally { setBusy(false); }
  }
  async function disconnect() {
    setBusy(true); setError(null);
    try { const result = await healthRequest('/api/auth/disconnect', 'POST'); await refresh(); if (!result.revoked) setError('Disconnected here. Remove Do It in your Google account to revoke its access.'); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not disconnect.'); }
    finally { setBusy(false); }
  }
  async function deleteHistory() {
    if (!window.confirm('Delete your Google Health check-ins from this duel? This cannot be undone. Manual check-ins stay.')) return;
    setBusy(true); setError(null);
    try { await healthRequest('/api/sync/google-health', 'DELETE'); setError('Imported check-ins deleted.'); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not delete imported history.'); }
    finally { setBusy(false); }
  }

  return <section className="rounded-2xl border border-white/[0.08] bg-[#17181b] p-4 space-y-4">
    <div className="flex items-center gap-3"><Activity size={20} className="text-emerald-300"/><div className="flex-1"><h2 className="text-sm font-semibold">Google Health</h2><p className="text-xs text-zinc-400">{status?.connected ? status.needsAttention ? 'Needs attention' : 'Connected' : 'Connect to complete selected habits automatically'}</p></div></div>
    {status?.connected ? <>
      <p className="text-xs text-zinc-400">{status.lastCheckedAt ? `Last checked ${new Date(status.lastCheckedAt).toLocaleString()}` : 'Waiting for first check'} · Manual check-ins remain available.</p>
      {status.message && <p role="status" className="text-xs text-amber-300">{status.message}</p>}
      <div className="flex flex-wrap gap-2"><button className="control control-primary min-h-11" disabled={busy} onClick={sync}><RefreshCw size={15}/>{busy ? 'Checking…' : 'Check now'}</button><button className="control min-h-11" disabled={busy} onClick={connect}>Reconnect</button><button className="control min-h-11" disabled={busy} onClick={disconnect}>Disconnect & delete connection</button></div>
    </> : <>
      <p className="text-xs leading-5 text-zinc-400">Do It reads only the sleep and activity needed for your selected automatic habits. Your partner can see completed habits and basic results such as sleep hours, workout type and duration, or steps. Raw health records stay private. Disconnect any time to delete this connection; imported check-ins stay until you delete them below.</p>
      {activeHabits.some(habit => habit.automation) ? <button className="control control-primary min-h-11" disabled={busy} onClick={connect}>{busy ? 'Connecting…' : 'Connect Google Health'}<ArrowUpRight size={15}/></button> : <button className="control control-primary min-h-11" onClick={onChooseHabits}>Choose an automatic habit<ArrowUpRight size={15}/></button>}
      <details className="text-xs text-zinc-400"><summary className="cursor-pointer">Phone setup</summary><p className="mt-2 leading-5">On iPhone, allow Apple Health to share with Google Health. On Android, allow Health Connect to share with Google Health. Your fitness apps must also send their data to the phone health store. Some apps and metrics may not be supported.</p><a className="mt-2 inline-flex underline" href="https://support.google.com/googlehealth/answer/14236613?hl=en" target="_blank" rel="noreferrer">Google’s connection guide</a></details>
    </>}
    <details className="border-t border-white/[0.08] pt-3 text-xs text-zinc-400"><summary className="cursor-pointer">Privacy</summary><button className="control mt-3 min-h-11" disabled={busy} onClick={deleteHistory}>Delete imported check-ins</button></details>
    {error && <p role="alert" className="text-xs text-amber-300">{error}</p>}
  </section>;
}
