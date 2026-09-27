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

function formatTime(isoOrMillis: string | number): string {
  try {
    const d = new Date(isoOrMillis);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
  } catch {
    return '';
  }
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
  const isSimulatedUnder = searchParams.get('simulateUnder') === 'true';

  // Retrieve tokens from cookies or Authorization header
  let accessToken = request.cookies.get('g_fit_access_token')?.value;
  const refreshToken = request.cookies.get('g_fit_refresh_token')?.value;

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  // Handle simulation mode for easy verification and zero-friction testing
  if (isSimulated || isSimulatedUnder || (!accessToken && !refreshToken && (isSimulated || isSimulatedUnder))) {
    if (isSimulatedUnder) {
      return NextResponse.json({
        success: true,
        simulated: true,
        provider: 'Google Health (Simulated)',
        date: targetDate,
        sleepHours: 6.5,
        sleepQualified: false,
        sleepReason: '6.5 / 8.0 hrs logged (1.5 hrs short of target)',
        sleepSessions: [
          {
            start: '23:45',
            end: '06:15',
            durationMinutes: 390,
            durationHours: 6.5,
          },
        ],
        activities: [
          { name: 'Night Sleep', activityType: 72, durationMinutes: 390 },
        ],
        gymDetected: false,
        gymReason: 'No gym or strength workout found',
        sportDetected: false,
        sportReason: 'No basketball or running workout found',
        checkInsCreated: [],
        message: 'Checked: 6.5 hrs sleep found (need 8.0 hrs for habit completion).',
      });
    }

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
      provider: 'Google Health (Simulated)',
      date: targetDate,
      sleepHours: 8.2,
      sleepQualified: true,
      sleepReason: 'Goal achieved: 8.2 / 8.0 hrs logged (+50 pts earned)',
      sleepSessions: [
        {
          start: '23:15',
          end: '07:27',
          durationMinutes: 492,
          durationHours: 8.2,
        },
      ],
      activities: [
        { name: 'Night Sleep', activityType: 72, durationMinutes: 492 },
        { name: 'Strength Workout', activityType: 97, durationMinutes: 65 },
      ],
      gymDetected: true,
      gymReason: 'Strength session recorded: Heavy Strength Session (65 mins) (+40 pts)',
      sportDetected: false,
      sportReason: 'No basketball or running workout found',
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

    let totalSleepMillis = 0;
    const sleepSessions: Array<{ start: string; end: string; durationMinutes: number; durationHours: number }> = [];
    const detectedActivities: Array<{ name: string; activityType: number | string; durationMinutes: number }> = [];
    const checkInsToCreate: CheckIn[] = [];

    let hasGym = false;
    let hasSport = false;
    let syncProvider = '';

    // =========================================================================
    // 1. ATTEMPT MODERN GOOGLE HEALTH API (v4)
    // =========================================================================
    let healthApiError = '';
    try {
      const healthSleepUrl = `https://health.googleapis.com/v4/users/me/dataTypes/sleep/dataPoints`;
      const healthExerciseUrl = `https://health.googleapis.com/v4/users/me/dataTypes/exercise/dataPoints`;

      const [sleepRes, exerciseRes] = await Promise.all([
        fetch(healthSleepUrl, { headers: { Authorization: `Bearer ${accessToken}` } }),
        fetch(healthExerciseUrl, { headers: { Authorization: `Bearer ${accessToken}` } }),
      ]);

      if (sleepRes.ok || exerciseRes.ok) {
        syncProvider = 'Google Health API (v4)';

        if (sleepRes.ok) {
          const sleepData = await sleepRes.json();
          const points = sleepData.dataPoints || sleepData.data_points || [];
          for (const pt of points) {
            const st = pt.startTime ? new Date(pt.startTime).getTime() : 0;
            const et = pt.endTime ? new Date(pt.endTime).getTime() : 0;
            if (st >= startTimeMillis && et <= endTimeMillis && et > st) {
              const dur = et - st;
              totalSleepMillis += dur;
              const durMins = Math.round(dur / (1000 * 60));
              sleepSessions.push({
                start: formatTime(st),
                end: formatTime(et),
                durationMinutes: durMins,
                durationHours: Math.round((dur / (1000 * 60 * 60)) * 10) / 10,
              });
              detectedActivities.push({
                name: pt.sleepType ? `Sleep (${pt.sleepType})` : 'Sleep',
                activityType: 'sleep',
                durationMinutes: durMins,
              });
            }
          }
        }

        if (exerciseRes.ok) {
          const exData = await exerciseRes.json();
          const exPoints = exData.dataPoints || exData.data_points || [];
          for (const ex of exPoints) {
            const st = ex.startTime ? new Date(ex.startTime).getTime() : 0;
            const et = ex.endTime ? new Date(ex.endTime).getTime() : 0;
            const dur = Math.max(0, et - st);
            const durMins = Math.round(dur / (1000 * 60));
            const exType = (ex.exerciseType || ex.name || '').toLowerCase();

            if (exType.includes('strength') || exType.includes('weight') || exType.includes('gym')) {
              hasGym = true;
              detectedActivities.push({ name: 'Gym / Strength', activityType: 'gym', durationMinutes: durMins });
            } else if (exType.includes('run') || exType.includes('basketball') || exType.includes('sport')) {
              hasSport = true;
              detectedActivities.push({ name: 'Sport / Run', activityType: 'sport', durationMinutes: durMins });
            }
          }
        }
      } else {
        const err1 = await sleepRes.text();
        healthApiError = `Health API (${sleepRes.status}): ${err1}`;
      }
    } catch (e) {
      healthApiError = e instanceof Error ? e.message : 'Health API call failed';
    }

    // =========================================================================
    // 2. FALLBACK TO GOOGLE FITNESS REST API (v1)
    // =========================================================================
    if (!syncProvider) {
      const sessionsUrl = `https://www.googleapis.com/fitness/v1/users/me/sessions?startTime=${encodeURIComponent(
        startTimeIso
      )}&endTime=${encodeURIComponent(endTimeIso)}`;

      const fitRes = await fetch(sessionsUrl, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (fitRes.ok) {
        syncProvider = 'Google Fitness API';
        const fitData = await fitRes.json();
        const sessions: GoogleSession[] = fitData.session || [];

        for (const s of sessions) {
          const start = parseInt(s.startTimeMillis, 10);
          const end = parseInt(s.endTimeMillis, 10);
          const durationMillis = Math.max(0, end - start);
          const durationMinutes = Math.round(durationMillis / (1000 * 60));
          const lowerName = (s.name || '').toLowerCase();

          if (s.activityType === 72 || lowerName.includes('sleep')) {
            totalSleepMillis += durationMillis;
            const durMins = Math.round(durationMillis / (1000 * 60));
            sleepSessions.push({
              start: formatTime(start),
              end: formatTime(end),
              durationMinutes: durMins,
              durationHours: Math.round((durationMillis / (1000 * 60 * 60)) * 10) / 10,
            });
            detectedActivities.push({
              name: s.name || 'Sleep',
              activityType: s.activityType,
              durationMinutes: durMins,
            });
          }

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
      } else {
        const fitErrText = await fitRes.text();
        console.error('Google Fitness API error:', fitRes.status, fitErrText);
        let parsedMsg = '';
        try {
          const parsed = JSON.parse(fitErrText);
          parsedMsg = parsed.error?.message || fitErrText;
        } catch {
          parsedMsg = fitErrText;
        }

        return NextResponse.json(
          {
            success: false,
            error: 'google_health_api_error',
            details: { healthApiError, fitnessApiError: fitErrText },
            message: `Google API query failed. Fitness: ${parsedMsg}. ${healthApiError ? `Health API: ${healthApiError}` : ''}`,
          },
          { status: fitRes.status }
        );
      }
    }

    const sleepHours = Math.round((totalSleepMillis / (1000 * 60 * 60)) * 10) / 10;
    const sleepQualified = sleepHours >= 8.0;

    let sleepReason = '';
    if (sleepQualified) {
      sleepReason = `Goal achieved: ${sleepHours} / 8.0 hrs logged (+50 pts earned)`;
    } else if (sleepHours > 0) {
      const diff = Math.round((8.0 - sleepHours) * 10) / 10;
      sleepReason = `${sleepHours} / 8.0 hrs logged (${diff} hrs short of 8.0 hr target)`;
    } else {
      sleepReason = 'No sleep sessions recorded for this day';
    }

    const gymReason = hasGym
      ? 'Strength session recorded (+40 pts)'
      : 'No gym or strength workout found';

    const sportReason = hasSport
      ? 'Sport / Run session recorded (+30 pts)'
      : 'No basketball or running workout found';

    // Build CheckIn objects for qualifying habits
    if (sleepQualified) {
      checkInsToCreate.push({
        id: `checkin-maciek-sleep-${targetDate}`,
        habitId: 'maciek-sleep',
        playerId: 'maciek',
        date: targetDate,
        pointsEarned: 50,
        completedAt: new Date().toISOString(),
        note: `Auto-synced from ${syncProvider} (${sleepHours} hrs sleep)`,
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
        note: `Auto-synced from ${syncProvider} (Strength Workout)`,
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
        note: `Auto-synced from ${syncProvider} (Basketball / Running)`,
      });
    }

    // Persist to Supabase if configured
    await trySaveToSupabase(checkInsToCreate);

    return NextResponse.json({
      success: true,
      provider: syncProvider,
      date: targetDate,
      sleepHours,
      sleepQualified,
      sleepReason,
      sleepSessions,
      activities: detectedActivities,
      gymDetected: hasGym,
      gymReason,
      sportDetected: hasSport,
      sportReason,
      checkInsCreated: checkInsToCreate,
      message: `${syncProvider} sync complete: ${checkInsToCreate.length} habit(s) qualified.`,
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
