'use client';

import { useEffect, useState } from 'react';
import { PLAYER_COLORS } from '@/lib/types';
import { getPlayerColorStyles, isPlayerColorUnlocked } from '@/lib/player-colors';
import { getRecommendationShareData, getRecommendationUrl, isRecommendationCode } from '@/lib/recommendation';
import { ArrowLeft, Copy, Gift, LogOut, Monitor, Moon, Palette, Share2, Sun, SunMedium, UserRound, Volume2 } from 'lucide-react';
import { useStore } from '@/lib/store';
import { useMultiplayer } from '@/lib/multiplayer';
import { getSupabaseClient } from '@/lib/supabase';
import { HealthConnection } from './HealthConnection';
import { BillingPanel } from './BillingPanel';
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
  const themeOptions = [
    { id: 'system', label: 'Auto', Icon: Monitor },
    { id: 'light', label: 'Light', Icon: Sun },
    { id: 'dark', label: 'Dark', Icon: Moon },
  ] as const;

  return (
    <div className="mx-auto w-full max-w-2xl space-y-3">
      <div className="mb-5 flex items-center gap-2">
        <button
          className="-ml-2 flex size-11 items-center justify-center rounded-xl text-secondary hover:text-foreground active:scale-95 transition-all"
          onClick={onBack}
          aria-label="Back"
        >
          <ArrowLeft size={22} />
        </button>
        <h1 className="text-title-lg text-foreground">Settings</h1>
      </div>

      {activePlayer && (
        <section className="settings-panel flex flex-col gap-5">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 !mb-0">
                <UserRound size={18} className="text-secondary" /> Profile
              </h2>
              {!multiplayer.configured && (
                <button type="button" className="control" onClick={switchProfile}>
                  Switch Player
                </button>
              )}
            </div>

            <form onSubmit={saveName} className="space-y-2">
              <label htmlFor="profile-name" className="block text-label text-secondary">Username</label>
              <div className="flex gap-2">
                <input
                  id="profile-name"
                  value={name}
                  maxLength={40}
                  onChange={event => { setName(event.target.value); setNameMessage(null); }}
                  autoComplete="nickname"
                  className="field min-w-0 flex-1 outline-none focus:border-player-400"
                />
                <button
                  type="submit"
                  className="control shrink-0"
                  disabled={savingName || name.trim() === activePlayer.name}
                >
                  {savingName ? 'Saving…' : 'Save name'}
                </button>
              </div>
              {nameMessage && <div role="status" className="text-caption text-secondary">{nameMessage}</div>}
            </form>
          </div>

          <div className="space-y-3 border-t border-[var(--border-subtle)] pt-5">
            <div className="flex items-baseline justify-between gap-3">
              <span className="flex items-center gap-2 text-label font-semibold text-foreground">
                <Palette size={16} className="text-secondary" /> Player color
              </span>
              <span className="text-caption text-muted num">{activePlayerSummary.karma.toLocaleString()} lifetime points</span>
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
                    className={`flex min-h-13 items-center gap-2.5 rounded-[var(--radius-control)] border px-3 text-left transition-colors ${
                      selected ? 'border-player-400 bg-player-500/10' : 'border-[var(--border-subtle)] hover:bg-[var(--surface-2)]'
                    } ${!selected && !occupied ? 'disabled:opacity-60' : ''} disabled:cursor-not-allowed disabled:hover:bg-transparent`}
                  >
                    <span className="size-4 shrink-0 rounded-full border border-[var(--border-medium)]" style={getPlayerColorStyles(option)} />
                    <span className="min-w-0">
                      <span className={`block text-label ${selected ? 'text-player-300' : 'text-foreground'}`}>{option.name}</span>
                      <span className="block truncate text-caption text-muted">
                        {occupied ? `Used by ${opponent.name}` : unlocked ? (selected ? 'Selected' : 'Unlocked') : lockLabel}
                      </span>
                    </span>
                    {occupied && (
                      <span aria-label={`${opponent.name}'s colour`} className="ml-auto flex size-7 shrink-0 items-center justify-center rounded-lg border text-caption font-semibold" style={getPlayerColorStyles(opponent)}>
                        {opponent.name[0]?.toUpperCase()}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            {savingColor && <div role="status" className="text-caption text-muted">Saving colour…</div>}
            {colorMessage && <div role="status" className="text-caption text-secondary">{colorMessage}</div>}
          </div>
        </section>
      )}

      {/* App recommendation & invite counter */}
      {activePlayer && (
        <section className="settings-panel flex flex-col gap-4">
          <div>
            <h2>Recommend do it. to friends</h2>
            <p>
              {inviteCount >= 1
                ? `${inviteCount} ${inviteCount === 1 ? 'person' : 'people'} confirmed a new account through your link. Gold is unlocked!`
                : 'Gold unlocks when a new friend creates and confirms a unique account through your link. Sharing or opening your own link does not count.'}
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <label htmlFor="settings-recommend-link" className="block text-label text-secondary">
                Your recommendation link
              </label>
              <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-1 text-caption font-medium text-amber-700 dark:text-amber-300 num">
                <Gift size={13} />
                {inviteCount} confirmed {inviteCount === 1 ? 'referral' : 'referrals'}
              </span>
            </div>
            <input
              id="settings-recommend-link"
              readOnly
              value={recommendUrl}
              placeholder={multiplayer.configured ? 'Loading your link…' : 'Sign in to earn referral rewards'}
              onFocus={event => event.currentTarget.select()}
              className="field outline-none text-secondary"
            />
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                className="control control-primary"
                disabled={!recommendUrl}
                onClick={handleShareRecommendation}
              >
                <Share2 size={16} />
                {recommendShared ? 'Shared!' : 'Share app'}
              </button>
              <button
                type="button"
                className="control"
                disabled={!recommendUrl}
                onClick={handleCopyRecommendation}
              >
                <Copy size={16} />
                {recommendCopied ? 'Copied!' : 'Copy link'}
              </button>
            </div>
            {(recommendCopied || recommendShared) && (
              <div role="status" className="text-caption text-emerald-600 dark:text-emerald-400">
                {recommendShared ? 'Shared!' : 'Link copied!'} Credit arrives when a new friend confirms their account.
              </div>
            )}
          </div>
        </section>
      )}

      {/* Theme / Appearance */}
      <section className="settings-panel flex flex-col gap-3">
        <h2 className="flex items-center gap-2">
          <SunMedium size={18} className="text-secondary" /> Appearance
        </h2>
        <div
          role="radiogroup"
          aria-label="Select theme"
          className="grid grid-cols-3 rounded-[var(--radius-control)] bg-[var(--surface-2)] p-0.5"
        >
          {themeOptions.map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={themePreference === id}
              onClick={() => handleSelectTheme(id)}
              className={`flex h-10 items-center justify-center gap-1.5 rounded-[10px] text-label transition-colors ${
                themePreference === id
                  ? 'bg-[var(--surface-1)] text-foreground font-semibold shadow-xs'
                  : 'text-secondary hover:text-foreground'
              }`}
            >
              <Icon size={15} />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </section>

      {multiplayer.configured && multiplayer.user && (
        <section className="settings-panel flex flex-col gap-4">
          <h2 className="flex items-center gap-2">
            <Share2 size={18} className="text-secondary" /> Account &amp; Duel Invitation
          </h2>
          <dl className="space-y-2 text-label">
            <div className="flex flex-wrap justify-between gap-x-3">
              <dt className="text-secondary font-normal">Signed-in account</dt>
              <dd className="min-w-0 truncate text-foreground">{multiplayer.user.email}</dd>
            </div>
            <div className="flex flex-wrap justify-between gap-x-3">
              <dt className="text-secondary font-normal">Opponent status</dt>
              <dd className={isPartnerConnected ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-300'}>
                {isPartnerConnected
                  ? `Paired with ${multiplayer.slot === 'maciek' ? players.myrna.name : players.maciek.name}`
                  : 'No opponent account matched yet — waiting for partner to accept invite'}
              </dd>
            </div>
          </dl>
          {multiplayer.duel && (
            <div className="space-y-2 border-t border-[var(--border-subtle)] pt-4">
              <label htmlFor="settings-invite-link" className="block text-label text-secondary">Invitation link</label>
              <input
                id="settings-invite-link"
                readOnly
                value={inviteUrl}
                onFocus={event => event.currentTarget.select()}
                className="field outline-none text-secondary"
              />
              <button
                type="button"
                className="control control-primary w-full"
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
                <Copy size={16} />
                {inviteCopied ? 'Copied!' : 'Copy invite link'}
              </button>
            </div>
          )}
        </section>
      )}

      <HealthConnection onChooseHabits={onChooseHabits} />
      <BillingPanel />

      <section className="settings-panel flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <span id="settings-sounds-label" className="flex items-center gap-2 text-body text-foreground">
            <Volume2 size={18} className="text-secondary" /> Sounds
          </span>
          <button
            role="switch"
            aria-checked={!!soundEnabled}
            aria-labelledby="settings-sounds-label"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="-mr-1 flex h-11 w-15 shrink-0 items-center justify-center"
          >
            <span
              aria-hidden="true"
              className={`relative h-7 w-12 rounded-full transition-colors ${soundEnabled ? 'bg-emerald-500' : 'bg-[var(--surface-3)]'}`}
            >
              <span
                className={`absolute top-0.5 left-0.5 size-6 rounded-full bg-white shadow-sm transition-transform ${soundEnabled ? 'translate-x-5' : ''}`}
              />
            </span>
          </button>
        </div>
        {multiplayer.user && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border-subtle)] pt-4">
            <span className="min-w-0 truncate text-label text-secondary">{multiplayer.user.email}</span>
            <button
              className="control"
              onClick={() => multiplayer.signOut().catch(caught => setError(caught instanceof Error ? caught.message : 'Could not sign out.'))}
            >
              <LogOut size={16} /> Sign out
            </button>
          </div>
        )}
        {error && <div role="alert" className="text-label text-amber-600 dark:text-amber-300">{error}</div>}
      </section>
    </div>
  );
}
