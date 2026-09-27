import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { checkInToRow } from '@/lib/supabase-sync';
import { CheckIn, PlayerId } from '@/lib/types';

// Hevy Webhook Endpoint
// Ingests completed strength / weightlifting workouts from Hevy or custom webhooks

export async function GET() {
  return NextResponse.json({
    status: 'online',
    endpoint: '/api/sync/hevy',
    description: 'Hevy / Gym Webhook Handler for automatic strength workout check-ins.',
    samplePayload: {
      player: 'maciek',
      title: 'Leg Day / Upper Body',
      date: 'YYYY-MM-DD (optional, defaults to today)',
    },
  });
}

export async function POST(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const expectedSecret = process.env.HEVY_WEBHOOK_SECRET;

  const authHeader = request.headers.get('authorization');
  const apiKeyHeader = request.headers.get('x-api-key');
  const querySecret = searchParams.get('secret');

  let providedSecret = '';
  if (authHeader && authHeader.startsWith('Bearer ')) {
    providedSecret = authHeader.substring(7).trim();
  } else if (apiKeyHeader) {
    providedSecret = apiKeyHeader.trim();
  } else if (querySecret) {
    providedSecret = querySecret.trim();
  }

  if (expectedSecret && providedSecret !== expectedSecret) {
    return NextResponse.json({ error: 'unauthorized', message: 'Invalid or missing secret' }, { status: 401 });
  }

  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const rawPlayer = (body.player as string) || searchParams.get('player') || searchParams.get('playerId');
  const player: PlayerId = rawPlayer === 'myrna' ? 'myrna' : 'maciek';
  const workoutData = (body.workout as Record<string, unknown>) || body;

  let activityDate = new Date().toISOString().split('T')[0];
  if (workoutData.date && typeof workoutData.date === 'string') {
    activityDate = workoutData.date.slice(0, 10);
  } else if (workoutData.start_time && typeof workoutData.start_time === 'string') {
    activityDate = workoutData.start_time.slice(0, 10);
  }

  const workoutTitle = (workoutData.title as string) || (workoutData.name as string) || 'Strength Workout';
  const habitId = `${player}-gym`;

  const checkIn: CheckIn = {
    id: `checkin-${player}-gym-${activityDate}`,
    habitId,
    playerId: player,
    date: activityDate,
    pointsEarned: 40,
    completedAt: new Date().toISOString(),
    note: `Auto-synced via Hevy: ${workoutTitle}`,
  };

  const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (sbUrl && sbKey) {
    try {
      const client = createClient(sbUrl, sbKey);
      await client.from('check_ins').upsert([checkInToRow(checkIn)], { onConflict: 'habit_id,date' });
    } catch (err) {
      console.warn('Failed to persist Hevy check-in to Supabase:', err);
    }
  }

  return NextResponse.json({
    success: true,
    player,
    habitId,
    date: activityDate,
    checkIn,
    message: `Logged Hevy workout "${workoutTitle}" for ${player} (+40 pts).`,
  });
}
