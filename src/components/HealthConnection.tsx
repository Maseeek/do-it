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
  const {
    activeHabits,
    selectedDate,
    setHealthTelemetry,
    clearHealthTelemetry,
    syncGoogleHealth,
  } = useStore();
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
    syncGoogleHealth().then(async result => {
      if (!cancelled) {
        if (!result.success) setError(result.message);
        await refresh();
      }
    });
    return () => { cancelled = true; };
  }, [compact, status?.connected, status?.lastCheckedAt, refresh, syncGoogleHealth]);

  if (!multiplayer.configured) return null;
  if (status?.available === false) {
    return compact ? null : <section className="surface surface-pad flex flex-col gap-1"><h2 className="text-headline">Google Health</h2><p role="status" className="text-body text-secondary">{status.message}</p></section>;
  }
  if (compact) {
    if (!status) return null;
    if (!activeHabits.some(habit => habit.automation) || (status?.connected && !status.needsAttention && !error)) return null;
    return <div role="status" className="rounded-xl border border-amber-400/25 bg-amber-400/[0.08] px-3 py-2.5 text-label text-amber-700 dark:text-amber-200">{status?.message || error || 'Connect Google Health from your profile to automate selected habits.'}</div>;
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
    try {
      const result = await syncGoogleHealth();
      if (!result.success) throw new Error(result.message);
      await refresh();
    }
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


  function simulateSleepTelemetry(hours: number) {
    const sleepHabit = activeHabits.find(h => h.automation?.metric === "sleep") || activeHabits.find(h => h.id.endsWith("-sleep"));
    if (!sleepHabit) return;
    const target = 8.5;
    setHealthTelemetry({
      habitId: sleepHabit.id,
      playerId: sleepHabit.playerId,
      date: selectedDate,
      metric: "sleep",
      value: hours,
      target,
      unit: "hrs",
      source: "simulated",
    });
  }

  function simulateNoWatchData() {
    const sleepHabit = activeHabits.find(h => h.automation?.metric === "sleep") || activeHabits.find(h => h.id.endsWith("-sleep"));
    if (!sleepHabit) return;
    clearHealthTelemetry(sleepHabit.id, selectedDate);
  }

  const pill = 'inline-flex min-h-11 items-center rounded-[var(--radius-control)] border px-3 text-label num transition-colors';

  return <section className="surface surface-pad flex flex-col gap-4">
    <div className="flex items-center gap-3">
      <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"><Activity size={20}/></span>
      <div className="min-w-0 flex-1">
        <h2 className="text-headline">Google Health</h2>
        <p className={`text-label font-normal ${status?.connected && !status.needsAttention ? 'text-emerald-600 dark:text-emerald-400' : status?.needsAttention ? 'text-amber-600 dark:text-amber-300' : 'text-secondary'}`}>{status?.connected ? status.needsAttention ? 'Needs attention' : 'Connected' : 'Connect to complete selected habits automatically'}</p>
      </div>
    </div>
    {status?.connected ? <>
      <p className="text-label font-normal text-secondary">{status.lastCheckedAt ? `Last checked ${new Date(status.lastCheckedAt).toLocaleString()}` : 'Waiting for first check'} · Manual check-ins remain available.</p>
      {status.message && <p role="status" className="text-label text-amber-600 dark:text-amber-300">{status.message}</p>}
      <div className="flex flex-wrap gap-2"><button className="control control-primary" disabled={busy} onClick={sync}><RefreshCw size={16}/>{busy ? 'Checking…' : 'Check now'}</button><button className="control" disabled={busy} onClick={connect}>Reconnect</button><button className="control" disabled={busy} onClick={disconnect}>Disconnect & delete connection</button></div>
    </> : <>
      <p className="text-body text-secondary">Do It reads only the sleep and activity needed for your selected automatic habits. Your partner can see completed habits and basic results such as sleep hours, workout type and duration, or steps. Raw health records stay private. Disconnect any time to delete this connection; imported check-ins stay until you delete them below.</p>
      {activeHabits.some(habit => habit.automation) ? <button className="control control-primary w-full" disabled={busy} onClick={connect}>{busy ? 'Connecting…' : 'Connect Google Health'}<ArrowUpRight size={16}/></button> : <button className="control control-primary w-full" onClick={onChooseHabits}>Choose an automatic habit<ArrowUpRight size={16}/></button>}
    </>}
    {error && <p role="alert" className="text-label text-amber-600 dark:text-amber-300">{error}</p>}

    <div className="-mx-[var(--card-pad)] -mb-[var(--card-pad)] divide-y divide-[var(--border-subtle)] border-t border-[var(--border-subtle)] text-label">
      {!status?.connected && <details className="group px-[var(--card-pad)]"><summary className="flex min-h-12 items-center text-foreground">Phone setup</summary><p className="pb-4 font-normal text-secondary">On iPhone, allow Apple Health to share with Google Health. On Android, allow Health Connect to share with Google Health. Your fitness apps must also send their data to the phone health store. Some apps and metrics may not be supported.</p><a className="mb-4 inline-flex min-h-11 items-center underline text-secondary" href="https://support.google.com/googlehealth/answer/14236613?hl=en" target="_blank" rel="noreferrer">Google’s connection guide</a></details>}
      <details className="px-[var(--card-pad)]">
        <summary className="flex min-h-12 items-center text-foreground">Test sleep points</summary>
        <p className="font-normal text-secondary">Try sleep readings for {selectedDate} in your local progress:</p>
        <div className="mt-3 mb-4 flex flex-wrap gap-2">
          <button type="button" onClick={() => simulateSleepTelemetry(8.5)} className={`${pill} border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20`}>
            8.5h · 100%
          </button>
          {[8, 7.5, 7, 6.5].map((hours, index) => (
            <button key={hours} type="button" onClick={() => simulateSleepTelemetry(hours)} className={`${pill} border-[var(--border-medium)] text-foreground hover:bg-[var(--surface-2)]`}>
              {hours}h · {[90, 60, 40, 20][index]}%
            </button>
          ))}
          <button type="button" onClick={() => simulateSleepTelemetry(3.0)} className={`${pill} border-orange-600/50 bg-orange-600/10 text-orange-700 dark:text-orange-300 hover:bg-orange-600/20`}>
            3h · 0%
          </button>
          <button type="button" onClick={() => simulateSleepTelemetry(1.5)} className={`${pill} border-red-600/50 bg-red-600/10 text-red-700 dark:text-red-300 hover:bg-red-600/20`}>
            1.5h · 0%
          </button>
          <button type="button" onClick={simulateNoWatchData} className={`${pill} border-[var(--border-medium)] text-secondary hover:bg-[var(--surface-2)]`}>
            ○ Watch Not Worn (Blank · Allow Check-in)
          </button>
        </div>
      </details>
      <details className="px-[var(--card-pad)]"><summary className="flex min-h-12 items-center text-foreground">Privacy</summary><button className="control mb-4" disabled={busy} onClick={deleteHistory}>Delete imported check-ins</button></details>
    </div>
  </section>;
}
