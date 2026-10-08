import { NextRequest, NextResponse } from 'next/server';
import { authenticatedDuel } from '@/lib/health-server';
import { healthEnabled } from '@/lib/health-access';
import { syncUserHealth } from '@/lib/health-sync';
import { healthScopes } from '@/lib/health-sync';
import type { Habit } from '@/lib/types';

function unavailable() {
  return NextResponse.json({ available: false, connected: false, scopes: [], message: 'Automatic health check-ins are not available yet. You can keep checking off habits manually.' });
}

export async function GET(request: NextRequest) {
  if (!healthEnabled()) return unavailable();
  try {
    const context = await authenticatedDuel(request);
    if (!context) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });
    if (!healthEnabled(context.user.id)) return unavailable();
    const { data, error } = await context.db.from('health_connections').select('scopes,time_zone,last_checked_at,last_error').eq('user_id', context.user.id).maybeSingle();
    if (error) throw error;
    const { data: rows, error: habitsError } = await context.db.from('duel_habits').select('data').eq('duel_id', context.duel.id).eq('player_slot', context.slot);
    if (habitsError) throw habitsError;
    const habits = (rows || []).map(row => row.data as Habit).filter(habit => habit.isActive && habit.automation);
    const missing = !!data && habits.some(habit => !data.scopes.includes(habit.automation?.metric === 'sleep' ? healthScopes.sleep : healthScopes.activity));
    return NextResponse.json({ connected: !!data, scopes: data?.scopes || [], timeZone: data?.time_zone, lastCheckedAt: data?.last_checked_at, needsAttention: !!data?.last_error || missing, message: data?.last_error || (missing ? 'New automatic habits need Google Health permission. Reconnect from Settings.' : null) });
  } catch {
    return NextResponse.json({ error: 'Connection status is unavailable.' }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  if (!healthEnabled()) return NextResponse.json({ error: 'Google Health is not available yet.' }, { status: 503 });
  try {
    const context = await authenticatedDuel(request);
    if (!context) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });
    if (!healthEnabled(context.user.id)) return NextResponse.json({ error: 'Google Health is not available yet.' }, { status: 503 });
    return NextResponse.json(await syncUserHealth(context.user.id));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Health sync failed.' }, { status: 502 });
  }
}

export async function DELETE(request: NextRequest) {
  if (request.headers.get('origin') !== request.nextUrl.origin) return NextResponse.json({ error: 'Invalid origin.' }, { status: 403 });
  try {
    const context = await authenticatedDuel(request);
    if (!context) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });
    const { error } = await context.db.from('duel_check_ins').delete().eq('duel_id', context.duel.id).eq('player_slot', context.slot).eq('data->>source', 'google_health');
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Could not delete imported history.' }, { status: 502 });
  }
}
