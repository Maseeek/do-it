import { NextRequest, NextResponse } from 'next/server';
import { AppleHealthSyncPayload, CheckIn } from '@/lib/types';
import { createClient } from '@supabase/supabase-js';
import { checkInToRow } from '@/lib/supabase-sync';

export async function GET() {
  return NextResponse.json({
    status: 'online',
    endpoint: '/api/sync/apple-health',
    description: 'Ingestion endpoint for Apple Health via iOS Shortcuts.',
    instructions: {
      auth: 'Send header "Authorization: Bearer <secret>" or query param "?secret=<secret>"',
      method: 'POST',
      body: {
        player: 'myrna (or maciek)',
        metric: 'sleep | running | gym | sport',
        value: 8.5,
        date: 'YYYY-MM-DD (optional, defaults to today)',
        note: 'optional note',
      },
      rules: {
        sleep: 'Value represents hours slept. Awarded 50 points if value >= 8.0 hrs.',
        running: 'Outdoor / treadmill run. Awarded 30 points.',
        gym: 'Gym / strength training. Awarded 40 points.',
      },
    },
  });
}

export async function POST(request: NextRequest) {
  // 1. Authenticate Request
  const expectedSecret = process.env.APPLE_HEALTH_SECRET;
  const authHeader = request.headers.get('authorization');
  const customHeader = request.headers.get('x-apple-health-secret');
  const querySecret = request.nextUrl.searchParams.get('secret');

  let providedSecret = '';
  if (authHeader && authHeader.startsWith('Bearer ')) {
    providedSecret = authHeader.substring(7).trim();
  } else if (customHeader) {
    providedSecret = customHeader.trim();
  } else if (querySecret) {
    providedSecret = querySecret.trim();
  }

  if (expectedSecret && providedSecret !== expectedSecret) {
    return NextResponse.json(
      {
        success: false,
        error: 'unauthorized',
        message: 'Invalid or missing Apple Health secret token.',
      },
      { status: 401 }
    );
  }

  // 2. Parse Payload
  let payload: AppleHealthSyncPayload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: 'invalid_json',
        message: 'Request body must be valid JSON.',
      },
      { status: 400 }
    );
  }

  const player = payload.player || 'myrna';
  const targetDate = payload.date || new Date().toISOString().split('T')[0];
  const metric = payload.metric;
  const value = Number(payload.value);

  if (!metric || isNaN(value)) {
    return NextResponse.json(
      {
        success: false,
        error: 'missing_fields',
        message: 'Both "metric" (sleep|running|gym) and numeric "value" are required.',
      },
      { status: 400 }
    );
  }

  // 3. Evaluate criteria and determine habit
  let habitId = '';
  let points = 0;
  let summaryText = '';

  if (metric === 'sleep') {
    habitId = `${player}-sleep`;
    if (value < 8.0) {
      return NextResponse.json({
        success: false,
        qualified: false,
        hoursLogged: value,
        message: `Sleep was ${value} hrs, which is below the 8.0 hrs threshold. No points awarded.`,
      });
    }
    points = 50;
    summaryText = `Sleep 8+ Hours (${value} hrs logged from Apple Health)`;
  } else if (metric === 'running' || metric === 'sport') {
    habitId = `${player}-sport`;
    points = 30;
    summaryText = `Running (${value} km/mins from Apple Health)`;
  } else if (metric === 'gym') {
    habitId = `${player}-gym`;
    points = 40;
    summaryText = `Gym & Strength (${value} mins from Apple Health)`;
  } else {
    return NextResponse.json(
      {
        success: false,
        error: 'unsupported_metric',
        message: `Metric "${metric}" is not supported. Use "sleep", "running", or "gym".`,
      },
      { status: 400 }
    );
  }

  // 4. Construct Check-In Record
  const checkIn: CheckIn = {
    id: `checkin-${player}-${metric}-${targetDate}`,
    habitId,
    playerId: player,
    date: targetDate,
    pointsEarned: points,
    completedAt: new Date().toISOString(),
    note: payload.note || `Auto-logged via Apple Health Shortcut: ${summaryText}`,
  };

  // 5. Auto-persist to Supabase if configured
  const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const sbKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (sbUrl && sbKey) {
    try {
      const client = createClient(sbUrl, sbKey);
      await client
        .from('check_ins')
        .upsert([checkInToRow(checkIn)], { onConflict: 'habit_id,date' });
    } catch (e) {
      console.warn('Could not auto-save Apple Health check-in to Supabase', e);
    }
  }

  return NextResponse.json({
    success: true,
    player,
    habitId,
    pointsAwarded: points,
    date: targetDate,
    checkIn,
    message: `Successfully registered ${summaryText} for ${player} (+${points} pts).`,
  });
}
