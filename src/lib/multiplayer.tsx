'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { getSupabaseClient } from './supabase';
import type { PlayerId } from './types';

export interface DuelSession {
  id: string;
  owner_id: string;
  guest_id: string | null;
  owner_name: string;
  guest_name: string | null;
  invite_code: string;
}

interface MultiplayerContextValue {
  configured: boolean;
  loading: boolean;
  user: User | null;
  duel: DuelSession | null;
  slot: PlayerId | null;
  error: string | null;
  refresh: () => Promise<void>;
  createDuel: (name: string) => Promise<void>;
  acceptInvite: (code: string, name: string) => Promise<void>;
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
      const { data: sessionData, error: authError } = await client.auth.getUser();
      if (sequence !== refreshSequence.current) return;
      if (authError && authError.name !== 'AuthSessionMissingError') throw authError;
      const currentUser = sessionData.user;
      setUser(currentUser);
      if (!currentUser) { setDuel(null); setError(null); return; }
      const { data, error: queryError } = await client.from('duels').select('*')
        .or(`owner_id.eq.${currentUser.id},guest_id.eq.${currentUser.id}`).limit(1).maybeSingle();
      if (sequence !== refreshSequence.current) return;
      if (queryError) throw queryError;
      setDuel((data as DuelSession | null) || null);
      setError(null);
    } catch (caught) {
      if (sequence !== refreshSequence.current) return;
      setDuel(null);
      setError(caught instanceof Error ? caught.message : 'Could not load your account.');
    } finally {
      if (sequence === refreshSequence.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!client) return;
    void refresh();
    const { data: { subscription } } = client.auth.onAuthStateChange(() => {
      // Defer Supabase queries until the auth event has released its lock.
      setTimeout(() => void refresh(), 0);
    });
    const timer = setInterval(() => void refresh(), 15000);
    return () => { subscription.unsubscribe(); clearInterval(timer); };
  }, [refresh]);

  const createDuel = async (name: string) => {
    if (!client) throw new Error('Supabase is not configured');
    const { error: rpcError } = await client.rpc('create_duel', { display_name: name });
    if (rpcError) throw rpcError;
    await refresh();
  };
  const acceptInvite = async (code: string, name: string) => {
    if (!client) throw new Error('Supabase is not configured');
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(code)) {
      throw new Error('This invitation link is invalid. Ask for a new link.');
    }
    const { error: rpcError } = await client.rpc('accept_duel', { code, display_name: name });
    if (rpcError) throw rpcError;
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
  const slot = duel && user ? (duel.owner_id === user.id ? 'maciek' : duel.guest_id === user.id ? 'myrna' : null) : null;

  return <Context.Provider value={{ configured: !!client, loading, user, duel, slot, error, refresh, createDuel, acceptInvite, signOut }}>{children}</Context.Provider>;
}

export function useMultiplayer() {
  const value = useContext(Context);
  if (!value) throw new Error('useMultiplayer must be used within MultiplayerProvider');
  return value;
}
