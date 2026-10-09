'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { extractInviteCode, hasMatchedAccount, hasMatchedDuelPartner, isValidInviteCode } from './invite-navigation';
import { getSupabaseClient } from './supabase';
import type { PlayerColorId, PlayerId } from './types';
export interface DuelSession {
  id: string;
  owner_id: string;
  guest_id: string | null;
  owner_name: string;
  guest_name: string | null;
  invite_code: string;
  owner_color: PlayerColorId;
  guest_color: PlayerColorId;
}

interface MultiplayerContextValue {
  configured: boolean;
  loading: boolean;
  user: User | null;
  duel: DuelSession | null;
  slot: PlayerId | null;
  hasValidAccount: boolean;
  hasPairedPartner: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  createDuel: (name: string) => Promise<void>;
  acceptInvite: (code: string, name: string) => Promise<void>;
  replaceSoloDuelWithInvite: (code: string, name: string) => Promise<void>;
  updatePlayerName: (name: string) => Promise<void>;
  updatePlayerColor: (colorId: PlayerColorId) => Promise<void>;
  signOut: () => Promise<void>;
}

const Context = createContext<MultiplayerContextValue | null>(null);
const client = getSupabaseClient();

export function MultiplayerProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [duel, setDuel] = useState<DuelSession | null>(null);
  const [loading, setLoading] = useState(!!client);
  const [error, setError] = useState<string | null>(null);
  const refreshSequence = useRef(0);

  const refresh = useCallback(async () => {
    if (!client) return;
    const sequence = ++refreshSequence.current;
    try {
      // The session is already persisted locally by Supabase. Reading it avoids
      // a blocking network round trip before the app can render the dashboard.
      const { data: sessionData, error: authError } = await client.auth.getSession();
      if (sequence !== refreshSequence.current) return;
      if (authError && authError.name !== 'AuthSessionMissingError') throw authError;
      const rawUser = sessionData.session?.user ?? null;
      const currentUser = hasMatchedAccount(rawUser) ? rawUser : null;
      setUser(currentUser);
      if (!currentUser) { setDuel(null); setError(null); return; }
      const { data, error: queryError } = await client.from('duels').select('*')
        .or(`owner_id.eq.${currentUser.id},guest_id.eq.${currentUser.id}`).limit(1).maybeSingle();
      if (sequence !== refreshSequence.current) return;
      if (queryError) throw queryError;
      const fetchedDuel = (data as DuelSession | null) || null;
      const cleanedDuel = fetchedDuel && fetchedDuel.owner_id === currentUser.id && !hasMatchedDuelPartner(fetchedDuel, currentUser)
        ? { ...fetchedDuel, guest_id: null, guest_name: null }
        : fetchedDuel;
      setDuel(cleanedDuel);
      setError(null);
    } catch (caught) {
      if (sequence !== refreshSequence.current) return;
      setDuel(null);
      setError(caught instanceof Error ? caught.message : 'Could not load your account.');
    } finally {
      if (sequence >= refreshSequence.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!client) return;
    void refresh();
    const { data: { subscription } } = client.auth.onAuthStateChange(() => {
      // Defer Supabase queries until the auth event has released its lock.
      setTimeout(() => void refresh(), 0);
    });
    let isSubscribed = false;
    const channel = client
      .channel('multiplayer-duels')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'duels' }, () => {
        void refresh();
      })
      .subscribe((status) => {
        isSubscribed = status === 'SUBSCRIBED';
      });
    const timer = setInterval(() => {
      if (!isSubscribed) {
        void refresh();
      }
    }, 15000);
    return () => {
      subscription.unsubscribe();
      clearInterval(timer);
      void client.removeChannel(channel);
    };
  }, [refresh]);

  const createDuel = async (name: string) => {
    if (!client) throw new Error('Supabase is not configured');
    const { error: rpcError } = await client.rpc('create_duel', { display_name: name });
    if (rpcError) throw rpcError;
    await refresh();
  };
  const acceptInvite = async (code: string, name: string) => {
    if (!client) throw new Error('Supabase is not configured');
    const normalizedCode = extractInviteCode(code) || '';
    if (!isValidInviteCode(normalizedCode)) {
      throw new Error('This invitation link is invalid or incomplete. Ask your opponent for a fresh invitation link.');
    }
    const displayName = user?.email?.toLowerCase() === 'myrnamarsh@icloud.com' ? 'Myrna' : name.trim();
    const { error: rpcError } = await client.rpc('accept_duel', { code: normalizedCode, display_name: displayName });
    if (rpcError) {
      throw new Error(rpcError.message || 'Could not join this invitation. It may have already been used or expired.');
    }
    await refresh();
  };
  const replaceSoloDuelWithInvite = async (code: string, name: string) => {
    if (!client) throw new Error('Supabase is not configured');
    const normalizedCode = extractInviteCode(code) || '';
    if (!isValidInviteCode(normalizedCode)) {
      throw new Error('This invitation link is invalid or incomplete. Ask your opponent for a fresh invitation link.');
    }
    const displayName = user?.email?.toLowerCase() === 'myrnamarsh@icloud.com' ? 'Myrna' : name.trim();
    const { error: rpcError } = await client.rpc('replace_solo_duel_with_invite', { code: normalizedCode, display_name: displayName });
    if (rpcError) {
      if (rpcError.code === 'PGRST202' || rpcError.message?.includes('replace_solo_duel_with_invite')) {
        throw new Error('Your account already owns a solo duel, and automatic solo-duel replacement (supabase/replace-solo-duel.sql) is not enabled in the database yet. Sign out to join with another account, or run supabase/replace-solo-duel.sql in the Supabase SQL Editor.');
      }
      throw new Error(rpcError.message || 'Could not replace your solo duel with this invitation.');
    }
    await refresh();
  };
  const updatePlayerName = async (name: string) => {
    if (!client || !duel || !slot) throw new Error('Join a duel before changing your name.');
    const { error: rpcError } = await client.rpc('update_duel_player_name', { display_name: name });
    if (rpcError) throw rpcError;
    await refresh();
  };
  const updatePlayerColor = async (colorId: PlayerColorId) => {
    if (!client || !duel || !slot) throw new Error('Join a duel before changing your color.');
    const { error: rpcError } = await client.rpc('set_player_color', { requested_color: colorId });
    if (rpcError) {
      if (rpcError.code === 'PGRST202' || rpcError.message?.includes('set_player_color')) {
        throw new Error('Player colors are not enabled in Supabase yet. Run supabase/player-colors.sql in the SQL Editor.');
      }
      throw new Error(rpcError.message || 'Could not update your player color.');
    }
    await refresh();
  };
  const signOut = async () => {
    if (!client) return;
    refreshSequence.current++;
    const { error: authError } = await client.auth.signOut();
    if (authError) throw authError;
    setUser(null);
    setDuel(null);
    setError(null);
  };
  const hasValidAccount = hasMatchedAccount(user);
  const hasPairedPartner = hasMatchedDuelPartner(duel, user);
  const slot = duel && user && hasValidAccount ? (duel.owner_id === user.id ? 'maciek' : duel.guest_id === user.id ? 'myrna' : null) : null;

  return <Context.Provider value={{ configured: !!client, loading, user, duel, slot, hasValidAccount, hasPairedPartner, error, refresh, createDuel, acceptInvite, replaceSoloDuelWithInvite, updatePlayerName, updatePlayerColor, signOut }}>{children}</Context.Provider>;
}

export function useMultiplayer() {
  const value = useContext(Context);
  if (!value) throw new Error('useMultiplayer must be used within MultiplayerProvider');
  return value;
}
