import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { checkInToRow } from '@/lib/supabase-sync';
import { CheckIn, PlayerId } from '@/lib/types';

// Strava Webhook API Spec:
// GET: Strava webhook subscription verification challenge
// POST: Strava event webhook callback (e.g. activity created)

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  const expectedToken = process.env.STRAVA_WEBHOOK_VERIFY_TOKEN;

  if (mode === 'subscribe' && challenge) {
    if (expectedToken && token !== expectedToken) {
      return NextResponse.json({ error: 'invalid_verify_token' }, { status: 403 });
    }
    // Return challenge verbatim as required by Strava
    return NextResponse.json({ 'hub.challenge': challenge });
  }

  return NextResponse.json({
    status: 'online',
    endpoint: '/api/sync/strava',
    description: 'Strava Webhook Handler for automatic sport / cardio check-ins.',
  });
}

export async function POST(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const rawPlayer = searchParams.get('player') || searchParams.get('playerId');
  const player: PlayerId = rawPlayer === 'myrna' ? 'myrna' : 'maciek';

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const objectType = body.object_type;
  const aspectType = body.aspect_type;
  const eventTime = typeof body.event_time === 'number' ? body.event_time : Math.floor(Date.now() / 1000);
  const activityDate = new Date(eventTime * 1000).toISOString().split('T')[0];

  // Strava sends "activity" create events when a run/ride/workout finishes
  if (objectType === 'activity' && aspectType === 'create') {
    const habitId = `${player}-sport`;
    const checkIn: CheckIn = {
      id: `checkin-${player}-sport-${activityDate}`,
      habitId,
      playerId: player,
      date: activityDate,
      pointsEarned: 30,
      completedAt: new Date().toISOString(),
      note: `Auto-synced via Strava Activity #${body.object_id || ''}`,
    };

    const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (sbUrl && sbKey) {
      try {
        const client = createClient(sbUrl, sbKey);
        await client.from('check_ins').upsert([checkInToRow(checkIn)], { onConflict: 'habit_id,date' });
      } catch (err) {
        console.warn('Failed to persist Strava check-in to Supabase:', err);
      }
    }

    return NextResponse.json({
      success: true,
      player,
      habitId,
      date: activityDate,
      checkIn,
      message: `Logged Strava activity for ${player} (+30 pts).`,
    });
  }

  // Acknowledge other Strava webhook events immediately
  return NextResponse.json({ success: true, ignored: true, aspectType, objectType });
}
