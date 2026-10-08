import { timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { decryptToken, encryptToken, healthDatabase } from '@/lib/health-server';
import { healthEnabled } from '@/lib/health-access';

export async function GET(request: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
  const redirect = (reason?: string) => {
    const url = new URL('/', appUrl);
    url.searchParams.set('section', 'settings');
    url.searchParams.set(reason ? 'wearable_error' : 'wearable_connected', reason || 'google');
    const response = NextResponse.redirect(url);
    response.cookies.delete('health_oauth_state');
    for (const name of ['g_fit_access_token', 'g_fit_refresh_token', 'g_fit_connected', 'g_fit_player', 'google_oauth_state']) response.cookies.delete(name);
    return response;
  };
  if (!healthEnabled()) return redirect('health_unavailable');
  try {
    const raw = request.cookies.get('health_oauth_state')?.value;
    if (!raw) return redirect('expired_connection');
    const stored = JSON.parse(decryptToken(raw)) as { state: string; userId: string; scopes: string[]; timeZone: string };
    const state = request.nextUrl.searchParams.get('state') || '';
    if (!state || state.length !== stored.state.length || !timingSafeEqual(Buffer.from(state), Buffer.from(stored.state))) return redirect('invalid_connection');
    if (!healthEnabled(stored.userId)) return redirect('health_unavailable');
    if (request.nextUrl.searchParams.has('error')) return redirect('permission_denied');
    const code = request.nextUrl.searchParams.get('code');
    if (!code) return redirect('missing_code');
    const db = healthDatabase();
    const { data: duel, error: duelError } = await db.from('duels').select('id').or(`owner_id.eq.${stored.userId},guest_id.eq.${stored.userId}`).limit(1).maybeSingle();
    if (duelError || !duel) return redirect('account_unavailable');
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ code, client_id: process.env.GOOGLE_CLIENT_ID || '', client_secret: process.env.GOOGLE_CLIENT_SECRET || '', redirect_uri: `${appUrl}/api/auth/google/callback`, grant_type: 'authorization_code' }), cache: 'no-store' });
    if (!tokenResponse.ok) return redirect('connection_failed');
    const tokens = await tokenResponse.json();
    if (!tokens.refresh_token) return redirect('missing_refresh_permission');
    const granted = typeof tokens.scope === 'string' ? tokens.scope.split(' ') : [];
    const scopes = stored.scopes.filter(scope => granted.includes(scope));
    const { error } = await db.from('health_connections').upsert({ user_id: stored.userId, encrypted_refresh_token: encryptToken(tokens.refresh_token), scopes, time_zone: stored.timeZone, last_checked_at: null, last_error: null, updated_at: new Date().toISOString() });
    if (error) throw error;
    return redirect();
  } catch {
    return redirect('connection_failed');
  }
}
