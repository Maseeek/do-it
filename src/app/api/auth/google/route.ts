import { randomBytes } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { authenticatedDuel, healthEnabled, validTimeZone } from '@/lib/health-server';
import { healthScopes } from '@/lib/health-sync';
import type { Habit } from '@/lib/types';

export async function GET() {
  return NextResponse.json({ error: 'Sign in and connect from Settings.' }, { status: 405 });
}

export async function POST(request: NextRequest) {
  if (!healthEnabled()) return NextResponse.json({ error: 'Google Health is not available yet.' }, { status: 503 });
  try {
    const context = await authenticatedDuel(request);
    if (!context) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId || !process.env.GOOGLE_CLIENT_SECRET || !process.env.HEALTH_TOKEN_ENCRYPTION_KEY) return NextResponse.json({ error: 'Google Health is not available yet.' }, { status: 503 });
    const body = await request.json().catch(() => ({}));
    const timeZone = typeof body.timeZone === 'string' && validTimeZone(body.timeZone) ? body.timeZone : 'UTC';
    const { data: rows, error } = await context.db.from('duel_habits').select('data').eq('duel_id', context.duel.id).eq('player_slot', context.slot);
    if (error) throw error;
    const habits = (rows || []).map(row => row.data as Habit).filter(habit => habit.isActive && habit.automation);
    const scopes = new Set<string>();
    if (habits.some(habit => habit.automation?.metric === 'sleep')) scopes.add(healthScopes.sleep);
    if (habits.some(habit => habit.automation?.metric !== 'sleep')) scopes.add(healthScopes.activity);
    if (!scopes.size) return NextResponse.json({ error: 'Choose an automatic habit first.' }, { status: 400 });
    const state = `${context.user.id}:${randomBytes(32).toString('base64url')}`;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
    const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    url.searchParams.set('client_id', clientId);
    url.searchParams.set('redirect_uri', `${appUrl}/api/auth/google/callback`);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', [...scopes].join(' '));
    url.searchParams.set('access_type', 'offline');
    url.searchParams.set('prompt', 'consent');
    url.searchParams.set('state', state);
    const response = NextResponse.json({ url: url.toString() });
    response.cookies.set('health_oauth_state', JSON.stringify({ state, userId: context.user.id, scopes: [...scopes], timeZone }), { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/api/auth/google', maxAge: 600 });
    return response;
  } catch {
    return NextResponse.json({ error: 'Could not begin Google Health connection.' }, { status: 500 });
  }
}
