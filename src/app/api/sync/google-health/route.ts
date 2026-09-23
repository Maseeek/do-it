import { NextRequest, NextResponse } from 'next/server';
import { CheckIn } from '@/lib/types';
import { createClient } from '@supabase/supabase-js';
import { checkInToRow } from '@/lib/supabase-sync';

// Google Fit Activity Types
// 72 = Sleep
// 97 = Weightlifting
// 8 = Running
// 10 = Basketball
// 114 = HIIT / Fitness

interface GoogleSession {
  id: string;
  name: string;
  description?: string;
  startTimeMillis: string;
  endTimeMillis: string;
  activityType: number;
}

export async function GET(request: NextRequest) {
  return handleSync(request);
}

export async function POST(request: NextRequest) {
  return handleSync(request);
}

async function handleSync(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const targetDate = searchParams.get('date') || new Date().toISOString().split('T')[0];
  const isSimulated = searchParams.get('simulate') === 'true';

  // Retrieve tokens from cookies or Authorization header
  let accessToken = request.cookies.get('g_fit_access_token')?.value;
  const refreshToken = request.cookies.get('g_fit_refresh_token')?.value;

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  // Handle simulation mode for easy verification and zero-friction testing
  if (isSimulated || (!accessToken && !refreshToken && isSimulated)) {
    const mockCheckIns: CheckIn[] = [
      {
        id: `checkin-maciek-sleep-${targetDate}`,
        habitId: 'maciek-sleep',
        playerId: 'maciek',
        date: targetDate,
        pointsEarned: 50,
        completedAt: new Date().toISOString(),
        note: 'Auto-synced via Google Health (Simulated: 8.2 hrs sleep)',
      },
      {
        id: `checkin-maciek-gym-${targetDate}`,
        habitId: 'maciek-gym',
        playerId: 'maciek',
        date: targetDate,
        pointsEarned: 40,
        completedAt: new Date().toISOString(),
        note: 'Auto-synced via Google Health (Simulated: Heavy Strength Session)',
      },
    ];

    await trySaveToSupabase(mockCheckIns);

    return NextResponse.json({
      success: true,
      simulated: true,
      date: targetDate,
      sleepHours: 8.2,
      sleepQualified: true,
      activities: [
        { name: 'Night Sleep', activityType: 72, durationMinutes: 492 },
        { name: 'Strength Workout', activityType: 97, durationMinutes: 65 },
      ],
      checkInsCreated: mockCheckIns,
      message: 'Simulated sync successful: Sleep (50 pts) and Gym (40 pts) completed.',
    });
  }

  // If we don't have an access token but do have a refresh token, refresh it
  if (!accessToken && refreshToken && clientId && clientSecret) {
    try {
      const refreshRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          refresh_token: refreshToken,
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: 'refresh_token',
        }),
      });

      if (refreshRes.ok) {
        const refreshData = await refreshRes.json();
        accessToken = refreshData.access_token;
      }
    } catch (e) {
      console.error('Failed to refresh Google token', e);
    }
  }

  if (!accessToken) {
    return NextResponse.json(
      {
        success: false,
        error: 'not_authenticated',
        message: 'Google Health is not connected. Connect via Vault or authenticate with Google.',
        connectUrl: '/api/auth/google',
      },
      { status: 401 }
    );
  }

  try {
    // Determine time window: from 14:00 previous day to 23:59 target date (UTC)
    const target = new Date(`${targetDate}T00:00:00.000Z`);
    const startTimeMillis = target.getTime() - 10 * 60 * 60 * 1000; // Look back 10 hrs into previous evening
    const endTimeMillis = target.getTime() + 24 * 60 * 60 * 1000;

    const startTimeIso = new Date(startTimeMillis).toISOString();
    const endTimeIso = new Date(endTimeMillis).toISOString();

    const sessionsUrl = `https://www.googleapis.com/fitness/v1/users/me/sessions?startTime=${encodeURIComponent(
      startTimeIso
    )}&endTime=${encodeURIComponent(endTimeIso)}`;

    const fitRes = await fetch(sessionsUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!fitRes.ok) {
      const errText = await fitRes.text();
      return NextResponse.json(
        {
          success: false,
          error: 'fitness_api_error',
          details: errText,
          message: 'Error querying Google Fitness sessions.',
        },
        { status: fitRes.status }
      );
    }

    const fitData = await fitRes.json();
    const sessions: GoogleSession[] = fitData.session || [];

    let totalSleepMillis = 0;
    const detectedActivities: Array<{ name: string; activityType: number; durationMinutes: number }> = [];
    const checkInsToCreate: CheckIn[] = [];

    let hasGym = false;
    let hasSport = false;

    for (const s of sessions) {
      const start = parseInt(s.startTimeMillis, 10);
      const end = parseInt(s.endTimeMillis, 10);
      const durationMillis = Math.max(0, end - start);
      const durationMinutes = Math.round(durationMillis / (1000 * 60));

      const lowerName = (s.name || '').toLowerCase();

      // Check sleep
      if (s.activityType === 72 || lowerName.includes('sleep')) {
        totalSleepMillis += durationMillis;
        detectedActivities.push({
          name: s.name || 'Sleep',
          activityType: s.activityType,
          durationMinutes,
        });
      }

      // Check Strength / Gym
      if (
        s.activityType === 97 ||
        lowerName.includes('gym') ||
        lowerName.includes('strength') ||
        lowerName.includes('lifting') ||
        lowerName.includes('hevy')
      ) {
        hasGym = true;
        detectedActivities.push({
          name: s.name || 'Gym Session',
          activityType: s.activityType,
          durationMinutes,
        });
      }

      // Check Cardio / Running / Basketball
      if (
        s.activityType === 8 ||
        s.activityType === 10 ||
        lowerName.includes('run') ||
        lowerName.includes('basketball') ||
        lowerName.includes('hoops') ||
        lowerName.includes('strava')
      ) {
        hasSport = true;
        detectedActivities.push({
          name: s.name || 'Sport / Run',
          activityType: s.activityType,
          durationMinutes,
        });
      }
    }

    const sleepHours = Math.round((totalSleepMillis / (1000 * 60 * 60)) * 10) / 10;
    const sleepQualified = sleepHours >= 8.0;

    // Build CheckIn objects for qualifying habits
    if (sleepQualified) {
      checkInsToCreate.push({
        id: `checkin-maciek-sleep-${targetDate}`,
        habitId: 'maciek-sleep',
        playerId: 'maciek',
        date: targetDate,
        pointsEarned: 50,
        completedAt: new Date().toISOString(),
        note: `Auto-synced from Google Health (${sleepHours} hrs sleep)`,
      });
    }

    if (hasGym) {
      checkInsToCreate.push({
        id: `checkin-maciek-gym-${targetDate}`,
        habitId: 'maciek-gym',
        playerId: 'maciek',
        date: targetDate,
        pointsEarned: 40,
        completedAt: new Date().toISOString(),
        note: 'Auto-synced from Google Health (Strength Workout)',
      });
    }

    if (hasSport) {
      checkInsToCreate.push({
        id: `checkin-maciek-sport-${targetDate}`,
        habitId: 'maciek-sport',
        playerId: 'maciek',
        date: targetDate,
        pointsEarned: 30,
        completedAt: new Date().toISOString(),
        note: 'Auto-synced from Google Health (Basketball / Running)',
      });
    }

    // Persist to Supabase if configured
    await trySaveToSupabase(checkInsToCreate);

    return NextResponse.json({
      success: true,
      date: targetDate,
      sleepHours,
      sleepQualified,
      activities: detectedActivities,
      checkInsCreated: checkInsToCreate,
      message: `Google Health sync complete: ${checkInsToCreate.length} habit(s) qualified.`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Google Health sync failed:', message);
    return NextResponse.json(
      {
        success: false,
        error: 'sync_exception',
        message,
      },
      { status: 500 }
    );
  }
}

async function trySaveToSupabase(checkIns: CheckIn[]) {
  if (checkIns.length === 0) return;
  const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const sbKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (sbUrl && sbKey) {
    try {
      const client = createClient(sbUrl, sbKey);
      const rows = checkIns.map(checkInToRow);
      await client.from('check_ins').upsert(rows, { onConflict: 'habit_id,date' });
    } catch (e) {
      console.warn('Could not auto-save wearable check-in to Supabase', e);
    }
  }
}
