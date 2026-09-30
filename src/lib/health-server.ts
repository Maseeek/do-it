import 'server-only';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import type { NextRequest } from 'next/server';
import type { DuelSession } from './multiplayer';
import type { PlayerId } from './types';
import { isValidSupabaseUrl } from './supabase';

export function healthEnabled() {
  return process.env.GOOGLE_HEALTH_ENABLED === 'true';
}

export function healthDatabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!isValidSupabaseUrl(url) || !key) throw new Error('Health storage is not configured.');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function encryptionKey() {
  const key = Buffer.from(process.env.HEALTH_TOKEN_ENCRYPTION_KEY || '', 'base64');
  if (key.length !== 32) throw new Error('Health token encryption is not configured.');
  return key;
}

export function encryptToken(token: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const payload = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), payload].map(part => part.toString('base64url')).join('.');
}

export function decryptToken(value: string) {
  const [iv, tag, payload] = value.split('.').map(part => Buffer.from(part, 'base64url'));
  if (!iv || !tag || !payload) throw new Error('Health token is invalid.');
  const decipher = createDecipheriv('aes-256-gcm', encryptionKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(payload), decipher.final()]).toString('utf8');
}

export async function authenticatedDuel(request: NextRequest) {
  const token = request.headers.get('authorization')?.match(/^Bearer (.+)$/)?.[1];
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!token || !isValidSupabaseUrl(url) || !anon) return null;
  const auth = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: { user }, error } = await auth.auth.getUser(token);
  if (error || !user) return null;
  const db = healthDatabase();
  const { data: duel, error: duelError } = await db.from('duels').select('*')
    .or(`owner_id.eq.${user.id},guest_id.eq.${user.id}`).limit(1).maybeSingle();
  if (duelError || !duel) return null;
  const slot: PlayerId = duel.owner_id === user.id ? 'maciek' : 'myrna';
  return { user, duel: duel as DuelSession, slot, db };
}

export function localDate(timeZone: string, instant = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(instant);
  const part = (type: string) => parts.find(item => item.type === type)?.value || '';
  return `${part('year')}-${part('month')}-${part('day')}`;
}

export function validTimeZone(value: string): boolean {
  try { new Intl.DateTimeFormat('en-US', { timeZone: value }); return true; } catch { return false; }
}
