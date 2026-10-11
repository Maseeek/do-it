'use client';

import { useEffect, useState } from 'react';
import { PLAYER_COLORS } from '@/lib/types';
import { getPlayerColorStyles, isPlayerColorUnlocked } from '@/lib/player-colors';
import { getRecommendationShareData, getRecommendationUrl, isRecommendationCode } from '@/lib/recommendation';
import { ArrowLeft, Copy, Gift, LogOut, Monitor, Moon, Share2, Sparkles, Sun, SunMedium, UserRound, Volume2 } from 'lucide-react';
import { useStore } from '@/lib/store';
import { useMultiplayer } from '@/lib/multiplayer';
import { getSupabaseClient } from '@/lib/supabase';
import { HealthConnection } from './HealthConnection';
import { soundEngine } from '@/lib/sound-utils';
import { hapticLight } from '@/lib/haptic-utils';

export function SettingsView({ onBack, onChooseHabits }: { onBack: () => void; onChooseHabits?: () => void }) {
  const multiplayer = useMultiplayer();
  const {
    activePlayer,
    switchProfile,
    isPartnerConnected,
    players,
    soundEnabled,
    setSoundEnabled,
    updateLocalPlayerName,
    updatePlayerColor,
    activePlayerSummary,
    themePreference,
    setThemePreference,
  } = useStore();

  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState(activePlayer?.name || '');
  const [savingName, setSavingName] = useState(false);
  const [nameMessage, setNameMessage] = useState<string | null>(null);
  const [savingColor, setSavingColor] = useState(false);
  const [colorMessage, setColorMessage] = useState<string | null>(null);
  const [inviteCopied, setInviteCopied] = useState(false);
  const [recommendCopied, setRecommendCopied] = useState(false);
  const [recommendShared, setRecommendShared] = useState(false);
  const [recommendationCode, setRecommendationCode] = useState<string | null>(null);
  const recommendationPlayerId = multiplayer.user?.id;
  useEffect(() => {
    const client = getSupabaseClient();
    if (!client || !recommendationPlayerId) return;
    let cancelled = false;
    void Promise.resolve(client.rpc('get_recommendation_code')).then(({ data, error: rpcError }) => {
      if (cancelled) return;
      if (rpcError || !isRecommendationCode(data)) {
        setError('Could not load your recommendation link. Reopen settings to try again.');
        return;
      }
      setRecommendationCode(data);
    }).catch(() => { if (!cancelled) setError('Could not load your recommendation link. Reopen settings to try again.'); });
    return () => { cancelled = true; };
  }, [recommendationPlayerId]);

  const inviteUrl = typeof window !== 'undefined' && multiplayer.duel
    ? `${window.location.origin}/?invite=${multiplayer.duel.invite_code}`
    : '';

  const recommendUrl = typeof window !== 'undefined' && recommendationCode
    ? getRecommendationUrl(window.location.origin, recommendationCode)
    : '';

  useEffect(() => {
    setName(activePlayer?.name || '');
  }, [activePlayer?.name]);

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

  const handleShareRecommendation = async () => {
    if (!recommendUrl || !activePlayer) return;
    soundEngine.playClick();
    hapticLight();
    const shareData = getRecommendationShareData(window.location.origin, activePlayer.name, recommendationCode ?? undefined);
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      try {
        await navigator.share(shareData);
        setRecommendShared(true);
        setTimeout(() => setRecommendShared(false), 3000);
        return;
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return;
      }
    }
    try {
      await navigator.clipboard.writeText(recommendUrl);
      setRecommendCopied(true);
      setTimeout(() => setRecommendCopied(false), 3000);
    } catch {
      setError('Select and copy the recommendation link above.');
    }
  };

  const handleCopyRecommendation = async () => {
    if (!recommendUrl || !activePlayer) return;
    soundEngine.playClick();
    hapticLight();
    try {
      await navigator.clipboard.writeText(recommendUrl);
      setRecommendCopied(true);
      setTimeout(() => setRecommendCopied(false), 3000);
    } catch {
      setError('Select and copy the recommendation link above.');
    }
  };

  const handleSelectTheme = (pref: 'system' | 'light' | 'dark') => {
    soundEngine.playClick();
    hapticLight();
    setThemePreference(pref);
  };

  const inviteCount = activePlayer?.inviteCount ?? 0;
  const opponent = activePlayer && isPartnerConnected ? players[activePlayer.id === 'maciek' ? 'myrna' : 'maciek'] : null;

  return (
    <div className="w-full max-w-2xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <button
          className="flex size-11 items-center justify-center rounded-xl text-zinc-400 hover:text-foreground active:scale-95 transition-all"
          onClick={onBack}
          aria-label="Back"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Settings</h1>
      </div>

      {activePlayer && (
        <section className="rounded-2xl border border-white/[0.08] bg-[#17181b] p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <UserRound size={17} /> Profile
            </h2>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-mono text-zinc-300">
                <Gift size={13} className="text-amber-400" />
                <span>{inviteCount} confirmed {inviteCount === 1 ? 'referral' : 'referrals'}</span>
              </span>
            </div>
          </div>

          {!multiplayer.configured && (
            <button
              type="button"
              className="control min-h-11"
              onClick={switchProfile}
            >
              Switch Player
            </button>
          )}

          <form onSubmit={saveName} className="space-y-3">
            <label htmlFor="profile-name" className="block text-xs text-zinc-400">Username</label>
            <div className="flex flex-wrap gap-2">
              <input
                id="profile-name"
                value={name}
                maxLength={40}
                onChange={event => { setName(event.target.value); setNameMessage(null); }}
                autoComplete="nickname"
                className="min-h-11 min-w-0 basis-full sm:basis-auto flex-1 rounded-xl border border-black/10 dark:border-white/[0.15] bg-zinc-100 dark:bg-[#101113] px-3 text-sm text-foreground outline-none focus:border-player-400"
              />
              <button
                type="submit"
                className="control min-h-11"
                disabled={savingName || name.trim() === activePlayer.name}
              >
                {savingName ? 'Saving…' : 'Save name'}
              </button>
            </div>
            {nameMessage && <p role="status" className="text-xs text-zinc-300">{nameMessage}</p>}
          </form>

          {/* App Recommendation & Invite Counter */}
          <div className="space-y-2 rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-zinc-100 dark:bg-[#101113] p-3.5 shadow-2xs">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                  <Sparkles size={14} className="text-amber-400" />
                  <span>Recommend do it. to friends</span>
                </div>
                <p className="mt-0.5 text-[11px] leading-relaxed text-zinc-400">
                  {inviteCount >= 1
                    ? `${inviteCount} ${inviteCount === 1 ? 'person' : 'people'} confirmed a new account through your link. Gold is unlocked!`
                    : 'Gold unlocks when a new friend creates and confirms a unique account through your link. Sharing or opening your own link does not count.'}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <span className="text-xl font-bold font-mono text-amber-400 tabular-nums">
                  {inviteCount}
                </span>
                <span className="block text-[10px] font-mono uppercase tracking-wider text-zinc-500">
                  {inviteCount === 1 ? 'referral' : 'referrals'}
                </span>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <label htmlFor="settings-recommend-link" className="block text-[11px] text-zinc-400">
                Your recommendation link
              </label>
              <div className="flex flex-wrap gap-2">
                <input
                  id="settings-recommend-link"
                  readOnly
                  value={recommendUrl}
                  placeholder={multiplayer.configured ? 'Loading your link…' : 'Sign in to earn referral rewards'}
                  onFocus={event => event.currentTarget.select()}
                  className="min-h-11 min-w-0 flex-1 rounded-xl border border-black/10 dark:border-white/[0.15] bg-white dark:bg-[#17181b] px-3 text-xs text-foreground outline-none font-mono"
                />
                <button
                  type="button"
                  className="control control-primary min-h-11"
                  disabled={!recommendUrl}
                  onClick={handleShareRecommendation}
                >
                  <Share2 size={15} />
                  {recommendShared ? 'Shared!' : 'Share app'}
                </button>
                <button
                  type="button"
                  className="control min-h-11"
                  disabled={!recommendUrl}
                  onClick={handleCopyRecommendation}
                >
                  <Copy size={15} />
                  {recommendCopied ? 'Copied!' : 'Copy link'}
                </button>
              </div>
              {(recommendCopied || recommendShared) && (
                <p role="status" className="text-xs text-emerald-400">
                  {recommendShared ? 'Shared!' : 'Link copied!'} Credit arrives when a new friend confirms their account.
                </p>
              )}
            </div>
          </div>

          {/* Color Palettes Section */}
          <div className="space-y-2">
            <div className="flex items-baseline justify-between">
              <span className="text-xs text-zinc-400">Player color</span>
              <span className="text-[11px] text-zinc-500">{activePlayerSummary.karma.toLocaleString()} lifetime points</span>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {PLAYER_COLORS.map(option => {
                const unlocked = isPlayerColorUnlocked(option.id, activePlayerSummary.karma, inviteCount);
                const selected = activePlayer.color === option.color;
                const occupied = opponent?.color === option.color;
                const lockLabel = 'requiredInvites' in option && typeof option.requiredInvites === 'number'
                  ? '1 confirmed referral'
                  : `${option.unlockAt.toLocaleString()} points`;
                return (
                  <button
                    key={option.id}
                    type="button"
                    disabled={!unlocked || savingColor || occupied || selected}
                    onClick={() => {
                      if (!unlocked) {
                        if ('requiredInvites' in option) {
                          setColorMessage('A new friend must confirm an account through your link to unlock Gold.');
                        }
                        return;
                      }
                      void savePlayerColor(option.id);
                    }}
                    aria-pressed={selected}
                    className={`flex min-h-11 items-center gap-2 rounded-xl border px-3 text-left text-xs ${
                      selected ? 'border-player-400 bg-player-500/15 text-player-400' : 'border-white/[0.08]'
                    } ${!selected && !occupied ? 'disabled:opacity-45' : ''} disabled:cursor-not-allowed`}
                  >
                    <span className="size-3.5 rounded-full border border-white/20" style={getPlayerColorStyles(option)} />
                    <span className="min-w-0">
                      <span className="block font-medium">{option.name}</span>
                      <span className="text-[10px] text-zinc-500">
                        {occupied ? `Used by ${opponent.name}` : unlocked ? (selected ? 'Selected' : 'Unlocked') : lockLabel}
                      </span>
                    </span>
                    {occupied && (
                      <span aria-label={`${opponent.name}'s colour`} className="ml-auto flex size-7 shrink-0 items-center justify-center rounded-lg border font-mono text-xs font-bold" style={getPlayerColorStyles(opponent)}>
                        {opponent.name[0]?.toUpperCase()}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            {savingColor && <p role="status" className="text-xs text-zinc-500">Saving colour…</p>}
            {colorMessage && <p role="status" className="text-xs text-zinc-300">{colorMessage}</p>}
          </div>
        </section>
      )}

      {/* Theme / Appearance Section */}
      <section className="rounded-2xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#17181b] p-4 space-y-3 shadow-xs">
        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <SunMedium size={17} /> Appearance
          </span>
          <div
            role="radiogroup"
            aria-label="Select theme"
            className="flex p-0.5 rounded-xl bg-black/5 dark:bg-[#2c2c2e] border border-black/5 dark:border-white/[0.08]"
          >
            <button
              type="button"
              role="radio"
              aria-checked={themePreference === 'system'}
              onClick={() => handleSelectTheme('system')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                themePreference === 'system'
                  ? 'bg-white dark:bg-zinc-800 text-foreground font-semibold shadow-xs'
                  : 'text-zinc-500 hover:text-foreground'
              }`}
            >
              <Monitor size={14} />
              <span>Auto</span>
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={themePreference === 'light'}
              onClick={() => handleSelectTheme('light')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                themePreference === 'light'
                  ? 'bg-white dark:bg-zinc-800 text-foreground font-semibold shadow-xs'
                  : 'text-zinc-500 hover:text-foreground'
              }`}
            >
              <Sun size={14} />
              <span>Light</span>
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={themePreference === 'dark'}
              onClick={() => handleSelectTheme('dark')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                themePreference === 'dark'
                  ? 'bg-white dark:bg-zinc-800 text-foreground font-semibold shadow-xs'
                  : 'text-zinc-500 hover:text-foreground'
              }`}
            >
              <Moon size={14} />
              <span>Dark</span>
            </button>
          </div>
        </div>
      </section>

      {multiplayer.configured && multiplayer.user && (
        <section className="rounded-2xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#17181b] p-4 space-y-3 shadow-xs">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Share2 size={17} /> Account &amp; Duel Invitation
          </h2>
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
                  className="min-h-11 min-w-0 flex-1 rounded-xl border border-black/10 dark:border-white/[0.15] bg-zinc-100 dark:bg-[#101113] px-3 text-xs text-foreground outline-none"
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

      <section className="rounded-2xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#17181b] p-4 space-y-3 shadow-xs">
        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-2 text-sm text-foreground">
            <Volume2 size={17} /> Sounds
          </span>
          <button
            role="switch"
            aria-checked={!!soundEnabled}
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`min-h-11 min-w-16 rounded-full px-3 text-xs font-semibold ${
              soundEnabled ? 'bg-emerald-400 text-black' : 'bg-zinc-700 text-white'
            }`}
          >
            {soundEnabled ? 'On' : 'Off'
          }</button>
        </div>
        {multiplayer.user && (
          <div className="border-t border-white/[0.08] pt-3">
            <p className="mb-3 text-xs text-zinc-500">{multiplayer.user.email}</p>
            <button
              className="control min-h-11"
              onClick={() => multiplayer.signOut().catch(caught => setError(caught instanceof Error ? caught.message : 'Could not sign out.'))}
            >
              <LogOut size={15} /> Sign out
            </button>
          </div>
        )}
        {error && <p role="alert" className="text-xs text-amber-300">{error}</p>}
      </section>
    </div>
  );
}
