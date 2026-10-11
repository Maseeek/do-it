import { NextRequest, NextResponse } from 'next/server';
import { authenticatedDuel } from '@/lib/health-server';
import { healthEnabled } from '@/lib/health-access';
import { syncUserHealth } from '@/lib/health-sync';
import { healthScopes } from '@/lib/health-sync';
import type { CheckIn, Habit, HealthTelemetryRecord } from '@/lib/types';

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
  const targetDate = request.nextUrl.searchParams.get('date') || new Date().toISOString().slice(0, 10);
  const isSimulated = request.nextUrl.searchParams.get('simulate') === 'true';
  const isSimulatedUnder = request.nextUrl.searchParams.get('simulateUnder') === 'true';

  if (isSimulated || isSimulatedUnder) {
    const sleepValue = isSimulatedUnder ? 3.0 : 8.5;
    const stepsValue = isSimulatedUnder ? 4200 : 10500;
    const telemetry: HealthTelemetryRecord[] = [
      {
        habitId: 'maciek-sleep',
        playerId: 'maciek',
        date: targetDate,
        metric: 'sleep',
        value: sleepValue,
        target: 8.0,
        unit: 'hrs',
        source: 'google_health',
      },
      {
        habitId: 'maciek-steps',
        playerId: 'maciek',
        date: targetDate,
        metric: 'steps',
        value: stepsValue,
        target: 10000,
        unit: 'steps',
        source: 'google_health',
      },
    ];

    const checkInsCreated: CheckIn[] = [];
    if (!isSimulatedUnder) {
      checkInsCreated.push({
        id: `health-maciek-sleep-${targetDate}`,
        habitId: 'maciek-sleep',
        playerId: 'maciek',
        date: targetDate,
        pointsEarned: 50,
        completedAt: new Date().toISOString(),
        source: 'google_health',
        healthValue: 8.5,
        note: '8.5 h sleep',
      });
    }

    return NextResponse.json({
      success: true,
      simulated: true,
      provider: 'Google Health (Simulated)',
      date: targetDate,
      sleepHours: sleepValue,
      sleepQualified: !isSimulatedUnder,
      sleepReason: isSimulatedUnder ? '3.0 / 8.0 hrs logged (goal not reached)' : '8.5 / 8.0 hrs logged (goal achieved)',
      checkInsCreated,
      telemetry,
      message: isSimulatedUnder
        ? 'Google Health checked: 3.0 hrs sleep (below 8.0 hr goal).'
        : 'Google Health checked: 8.5 hrs sleep (goal achieved!).',
    });
  }

  if (!healthEnabled()) return NextResponse.json({ error: 'Google Health is not available yet.' }, { status: 503 });
  try {
    const context = await authenticatedDuel(request);
    if (!context) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });
    if (!healthEnabled(context.user.id)) return NextResponse.json({ error: 'Google Health is not available yet.' }, { status: 503 });
    return NextResponse.json(await syncUserHealth(context.user.id, targetDate));
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
