'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, Check, Cloud, Download, HardDrive, RefreshCw, Upload, Volume2 } from 'lucide-react';
import { useStore } from '@/lib/store';
import { getSupabaseClient, isValidSupabaseUrl } from '@/lib/supabase';
import { getTodayDateString, getWeekKey } from '@/lib/date-utils';
import { shareScorecardImage } from '@/lib/scorecard-image';
import { useMultiplayer } from '@/lib/multiplayer';

interface SetupStatus {
  cloud: boolean;
  serverStorage: boolean;
  appUrl: string;
  google: { configured: boolean; connected: boolean; callback: string };
  strava: { configured: boolean; connected: boolean; callback: string };
  apple: { configured: boolean; durable: boolean };
  hevy: { configured: boolean; durable: boolean };
  backgroundSync: boolean;
}

function Status({ ready, children }: { ready: boolean; children: React.ReactNode }) {
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[10px] font-medium whitespace-nowrap ${ready ? 'bg-emerald-400/10 text-emerald-300' : 'bg-white/[0.05] text-zinc-400'}`}><span className={`w-1 h-1 rounded-full ${ready ? 'bg-emerald-400' : 'bg-zinc-500'}`}/>{children}</span>;
}

export function SettingsView() {
  const multiplayer = useMultiplayer();
  const { activePlayer, players, selectProfile, switchProfile, soundEnabled, setSoundEnabled, syncStatus, supabaseConfig, updateSupabaseConfig, exportStateToJson, importStateFromJson, syncGoogleHealth, disconnectGoogleHealth, disconnectStrava, maciekSummary, myrnaSummary, activeWeeklyStake } = useStore();
  const [setup, setSetup] = useState<SetupStatus | null>(null);
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [url, setUrl] = useState(supabaseConfig?.url || '');
  const [key, setKey] = useState(supabaseConfig?.anonKey || '');
  const [showRestore, setShowRestore] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  async function refreshSetup() {
    const response = await fetch('/api/setup', { cache: 'no-store' });
    if (!response.ok) throw new Error('Connection status is unavailable. Try refreshing.');
    setSetup(await response.json());
  }
  useEffect(() => {
    refreshSetup().catch((error) => setMessage({ text: error.message, error: true }));
    const params = new URLSearchParams(window.location.search);
    if (params.has('wearable_error')) setMessage({ text: `The connection was not completed (${params.get('wearable_error')?.replaceAll('_', ' ')}). You can try connecting again below.`, error: true });
    if (params.has('wearable_connected')) setMessage({ text: 'Your health connection is ready.' });
  }, []);

  async function run(name: string, action: () => Promise<string>) {
    setPending(name); setMessage(null);
    try { setMessage({ text: await action() }); } catch (error) { setMessage({ text: error instanceof Error ? error.message : 'Something went wrong. Please try again.', error: true }); } finally { setPending(null); }
  }

  function exportBackup() {
    const blob = new Blob([exportStateToJson()], { type: 'application/json' });
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl; link.download = `do-it-backup-${getTodayDateString()}.json`; link.click();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    setMessage({ text: 'Backup downloaded. Keep it somewhere safe.' });
  }

  async function connectCloud(event: React.FormEvent) {
    event.preventDefault();
    await run('cloud', async () => {
      const cleanUrl = url.trim().replace(/\/$/, ''); const cleanKey = key.trim();
      if (!isValidSupabaseUrl(cleanUrl) || !cleanKey) throw new Error('Enter a valid project URL and publishable or anon key.');
      if (cleanKey.startsWith('sb_secret_')) throw new Error('Use a publishable or anon key. Secret keys must stay on the server.');
      try { if (JSON.parse(atob(cleanKey.split('.')[1] || '')).role === 'service_role') throw new Error('service-role'); } catch (error) { if (error instanceof Error && error.message === 'service-role') throw new Error('Service-role keys must stay on the server. Use the anon key instead.'); }
      const client = getSupabaseClient(cleanUrl, cleanKey);
      if (!client) throw new Error('Could not initialize this connection. Check the URL and key.');
      for (const table of ['players', 'habits', 'check_ins', 'stakes']) {
        const { error } = await client.from(table).select('id').limit(1);
        if (error) throw new Error(`Connection check failed for ${table}. Apply the database schema and check your key.`);
      }
      updateSupabaseConfig({ url: cleanUrl, anonKey: cleanKey, enabled: true });
      return 'Connection verified. Cloud sync is starting.';
    });
  }

  const leader = maciekSummary.weekly === myrnaSummary.weekly ? 'Tied' : maciekSummary.weekly > myrnaSummary.weekly ? players.maciek.name : players.myrna.name;

  return <div className="space-y-5">
    {message && <div role={message.error ? 'alert' : 'status'} className={`rounded-xl p-4 text-sm border flex justify-between gap-3 ${message.error ? 'bg-amber-400/[0.07] border-amber-400/20 text-amber-200' : 'bg-emerald-400/[0.07] border-emerald-400/20 text-emerald-200'}`}><span>{message.text}</span><button aria-label="Dismiss message" onClick={() => setMessage(null)}>×</button></div>}
    <div className="grid xl:grid-cols-2 gap-5 items-start">
      <div className="space-y-5">
        {multiplayer.configured && <section className="settings-panel"><h2>Your account</h2><p>Signed in as {activePlayer?.name} ({multiplayer.user?.email}).</p><button className="control mt-4" onClick={() => void run('signout', async () => { await multiplayer.signOut(); return 'Signed out.'; })}>Sign out</button></section>}
        <section className={multiplayer.configured ? 'hidden' : 'settings-panel'}><h2>Your profile</h2><p>This device is set to {activePlayer?.name}. You can switch at any time.</p><div className="flex flex-wrap gap-2 mt-4">{(['maciek', 'myrna'] as const).map((id) => <button key={id} className={`control ${activePlayer?.id === id ? 'bg-white/[0.08]' : ''}`} aria-pressed={activePlayer?.id === id} onClick={() => selectProfile(id)}>{activePlayer?.id === id && <Check size={13}/>}{id === 'maciek' ? 'Maciek' : 'Myrna'}</button>)}<button className="control text-zinc-400" onClick={switchProfile}>Profile picker</button></div></section>
        <section className="settings-panel"><div className="flex justify-between items-center gap-4"><div><h2 className="flex items-center gap-2"><Volume2 size={15}/>Sound effects</h2><p>Small celebrations for small wins.</p></div><button role="switch" aria-checked={soundEnabled} aria-label="Sound effects" onClick={() => setSoundEnabled(!soundEnabled)} className={`w-12 h-7 p-1 rounded-full shrink-0 transition-colors ${soundEnabled ? 'bg-blue-500' : 'bg-zinc-700'}`}><span className={`block h-5 w-5 rounded-full bg-white transition-transform ${soundEnabled ? 'translate-x-5' : ''}`}/></button></div></section>
        <section className={multiplayer.configured ? "hidden" : "settings-panel space-y-4"}><div className="flex items-center justify-between gap-2"><h2 className="flex items-center gap-2"><Cloud size={15}/>Cloud sync</h2><Status ready={syncStatus === 'connected'}>{syncStatus === 'connected' ? 'Connected' : syncStatus === 'syncing' ? 'Connecting' : syncStatus === 'offline' ? 'Unavailable' : 'This device only'}</Status></div><p>Sync habits, check-ins and stakes between your devices. Rest days and cheers stay on this device; include them in your backup.</p><form onSubmit={connectCloud} className="space-y-3"><label className="block text-xs text-zinc-400">Project URL<input className="field mt-2" type="url" autoComplete="off" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://your-project.supabase.co" required/></label><label className="block text-xs text-zinc-400">Publishable / anon key<input className="field mt-2" type="password" autoComplete="off" value={key} onChange={(e) => setKey(e.target.value)} placeholder="Your public API key" required/></label><div className="flex flex-wrap gap-2"><button className="control control-primary" disabled={!!pending}>{pending === 'cloud' ? 'Checking connection…' : 'Verify & connect'}</button>{(supabaseConfig?.enabled || setup?.cloud) && <button type="button" className="control" onClick={() => { updateSupabaseConfig({ url, anonKey: key, enabled: false }); setMessage({ text: 'Cloud sync paused on this device.' }); }}>Use this device only</button>}</div></form><p className="flex items-center gap-2"><HardDrive size={13}/>Progress is saved locally as you go.</p></section>
        <section className={multiplayer.configured ? "hidden" : "settings-panel"}><h2>Your data, in your hands</h2><p>Back up both players, habits, check-ins and stakes. Connection credentials are excluded.</p><div className="flex flex-wrap gap-2 mt-4"><button className="control" onClick={exportBackup}><Download size={14}/>Export backup</button><button className="control" onClick={() => fileInput.current?.click()}><Upload size={14}/>Restore backup</button></div><input ref={fileInput} className="hidden" aria-label="Choose backup file" type="file" accept=".json,application/json" onChange={async (event) => { const file = event.target.files?.[0]; event.target.value = ''; if (!file) return; if (file.size > 20 * 1024 * 1024) { setMessage({ text: 'Choose a backup smaller than 20 MB.', error: true }); return; } try { setShowRestore(await file.text()); } catch { setMessage({ text: 'Could not read that backup.', error: true }); } }}/>{showRestore && <div role="alert" className="mt-4 rounded-xl bg-amber-400/5 border border-amber-400/20 p-4"><p>Restoring replaces the progress on this device. Export your current backup first.</p><div className="flex gap-2 mt-3"><button className="control" onClick={() => { const result = importStateFromJson(showRestore); setMessage({ text: result.success ? 'Backup restored.' : result.error || 'Restore failed.', error: !result.success }); setShowRestore(null); }}>Restore this backup</button><button className="control" onClick={() => setShowRestore(null)}>Cancel</button></div></div>}</section>
        <section className="settings-panel"><h2>Share your week</h2><p>{players.maciek.name} {maciekSummary.weekly} · {players.myrna.name} {myrnaSummary.weekly} points.</p><div className="flex gap-2 mt-4"><button className="control" disabled={!!pending} onClick={() => run('scorecard', async () => { const result = await shareScorecardImage({ weekKey: getWeekKey(), maciekName: players.maciek.name, myrnaName: players.myrna.name, maciekScore: maciekSummary.weekly, myrnaScore: myrnaSummary.weekly, maciekStreak: maciekSummary.currentStreak, myrnaStreak: myrnaSummary.currentStreak, leaderName: leader, pointDiff: Math.abs(maciekSummary.weekly - myrnaSummary.weekly), stakeTitle: activeWeeklyStake?.title }); return result.action === 'copied' ? 'Scorecard image copied.' : 'Scorecard downloaded.'; })}><ArrowUpRight size={14}/>Export scorecard</button><button className="control" onClick={() => run('copy', async () => { await navigator.clipboard.writeText(`Do It · ${getWeekKey()}\n${players.maciek.name}: ${maciekSummary.weekly} pts\n${players.myrna.name}: ${myrnaSummary.weekly} pts\n${leader === 'Tied' ? 'An even match.' : `${leader} leads.`}`); return 'Weekly scorecard copied.'; })}>Copy text</button></div></section>
      </div>
      <div className="space-y-5">
        <section className={multiplayer.configured ? "hidden" : "settings-panel space-y-5"}><div className="flex items-start justify-between"><div><h2>Health connections</h2><p>Bring your real activity into your daily ritual.</p></div><button className="control !p-2.5" aria-label="Refresh connection status" disabled={!!pending} onClick={() => run('refresh', async () => { await refreshSetup(); return 'Connection status refreshed.'; })}><RefreshCw size={14}/></button></div>
          {!setup ? <p>Checking your configuration…</p> : <>
            {(['google', 'strava'] as const).map((provider) => <div key={provider} className="border-t border-white/[0.07] pt-5 space-y-3"><div className="flex items-center justify-between gap-2"><h3 className="text-sm font-medium">{provider === 'google' ? 'Google Health' : 'Strava'}</h3><Status ready={setup[provider].connected}>{setup[provider].connected ? 'Connected' : setup[provider].configured ? 'Ready to connect' : 'Setup needed'}</Status></div><p>{provider === 'google' ? 'Sleep, strength and cardio from your Google account.' : 'Connect your Strava account for activity access.'}</p><div className="flex flex-wrap gap-2">{setup[provider].connected ? <><button className="control" disabled={!!pending} onClick={() => run(provider, async () => { const response = await fetch(`/api/auth/disconnect?provider=${provider}`, { method: 'POST' }); if (!response.ok) throw new Error('Could not disconnect. Please try again.'); if (provider === 'google') disconnectGoogleHealth(); else disconnectStrava(); await refreshSetup(); return `${provider === 'google' ? 'Google Health' : 'Strava'} disconnected.`; })}>Disconnect</button>{provider === 'google' && <button className="control control-primary" disabled={!!pending} onClick={() => run('sync', async () => { const result = await syncGoogleHealth(); if (!result.success) throw new Error(result.message); return result.message; })}>{pending === 'sync' ? 'Syncing…' : 'Sync selected day'}</button>}</> : setup[provider].configured ? <a className="control control-primary" href={`/api/auth/${provider}?player=${provider === 'google' ? 'maciek' : activePlayer?.id || 'maciek'}`}>Connect {provider === 'google' ? 'Google' : 'Strava'}<ArrowUpRight size={14}/></a> : <p>Add the {provider === 'google' ? 'Google' : 'Strava'} app credentials in your hosting settings to enable this connection.</p>}</div><details className="text-xs"><summary className="text-zinc-500">Connection setup</summary><div className="mt-3 space-y-2 text-zinc-400"><p>Register this callback URL with your provider:</p><code className="block break-all bg-black/40 p-3 rounded-lg text-[11px]">{setup[provider].callback}</code><a className="inline-flex items-center gap-1 underline underline-offset-4" href={provider === 'google' ? 'https://console.cloud.google.com/apis/credentials' : 'https://www.strava.com/settings/api'} target="_blank" rel="noreferrer">Open {provider === 'google' ? 'Google Cloud' : 'Strava'} settings<ArrowUpRight size={12}/></a></div></details></div>)}
            <div className="border-t border-white/[0.07] pt-5 space-y-3"><div className="flex justify-between gap-2"><h3 className="text-sm font-medium">Apple Health</h3><Status ready={setup.apple.configured && setup.apple.durable}>{setup.apple.configured && setup.apple.durable ? 'Webhook configured' : 'Setup needed'}</Status></div><p>An iPhone Shortcut can send sleep hours and workouts. A webhook secret and server database connection are required for reliable background delivery.</p><details><summary className="text-xs text-zinc-500">Set up an iPhone Shortcut</summary><ol className="text-xs text-zinc-400 mt-3 space-y-2 list-decimal pl-4"><li>In Shortcuts, read your sleep duration from Health. Convert it to hours.</li><li>Use Get Contents of URL with POST to <code className="break-all">{setup.appUrl}/api/sync/apple-health</code>.</li><li>Add an Authorization header: Bearer followed by your Apple Health secret.</li><li>Send JSON with player (myrna), metric (sleep), value (your hours), and date (YYYY-MM-DD).</li><li>Run it manually once, then add your morning automation.</li></ol></details></div>
            <div className="border-t border-white/[0.07] pt-5 space-y-2"><div className="flex justify-between gap-2"><h3 className="text-sm font-medium">Hevy / strength webhook</h3><Status ready={setup.hevy.configured && setup.hevy.durable}>{setup.hevy.configured && setup.hevy.durable ? 'Webhook configured' : 'Setup needed'}</Status></div><p>Requires a webhook secret and server database connection. Send authenticated workouts to <code className="break-all">/api/sync/hevy</code>.</p></div>
          </>}
        </section>
        <section className={multiplayer.configured ? "hidden" : "settings-panel"}><div className="flex justify-between gap-2"><h2>Daily background sync</h2><Status ready={!!setup?.backgroundSync}>{setup?.backgroundSync ? 'Configured' : 'Setup needed'}</Status></div><p>Google Health is scheduled for 08:00 UTC. It needs cloud storage, a server key and a cron secret, plus a connected Google account.</p></section>
      </div>
    </div>
  </div>;
}
