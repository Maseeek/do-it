import { CheckIn, PlayerId } from '@/lib/types';
import { createClient } from '@supabase/supabase-js';
import { checkInToRow } from '@/lib/supabase-sync';
import { isValidSupabaseUrl } from '@/lib/supabase';

export interface GoogleSession {
  id: string;
  name: string;
  description?: string;
  startTimeMillis: string;
  endTimeMillis: string;
  activityType: number;
}

export interface GoogleHealthSyncOptions {
  targetDate: string;
  playerId?: PlayerId | string;
  isSimulated?: boolean;
  isSimulatedUnder?: boolean;
  accessToken?: string;
  refreshToken?: string;
}

export interface GoogleHealthSyncResult {
  success: boolean;
  provider?: string;
  date: string;
  player: PlayerId;
  sleepHours?: number;
  sleepQualified?: boolean;
  sleepReason?: string;
  sleepSessions?: Array<{ start: string; end: string; durationMinutes: number; durationHours: number }>;
  activities?: Array<{ name: string; activityType: number | string; durationMinutes: number }>;
  gymDetected?: boolean;
  gymReason?: string;
  sportDetected?: boolean;
  sportReason?: string;
  checkInsCreated: CheckIn[];
  message: string;
  simulated?: boolean;
  error?: string;
  details?: Record<string, unknown>;
  connectUrl?: string;
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

export async function syncGoogleHealth(options: GoogleHealthSyncOptions): Promise<GoogleHealthSyncResult> {
  const { targetDate, isSimulated, isSimulatedUnder } = options;
  const targetPlayer: PlayerId = options.playerId === 'myrna' ? 'myrna' : 'maciek';
  let { accessToken, refreshToken } = options;

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Retrieve token from Supabase if missing
  if ((!accessToken || !refreshToken) && sbUrl && isValidSupabaseUrl(sbUrl) && sbKey) {
    try {
      const sbClient = createClient(sbUrl, sbKey);
      const { data: tokenRow } = await sbClient
        .from('oauth_tokens')
        .select('*')
        .eq('player_id', targetPlayer)
        .eq('provider', 'google')
        .maybeSingle();

      if (tokenRow) {
        if (!accessToken && tokenRow.access_token) {
          const isExpired = tokenRow.expires_at ? new Date(tokenRow.expires_at).getTime() < (Date.now() + 60000) : false;
          if (!isExpired) {
            accessToken = tokenRow.access_token;
          }
        }
        if (!refreshToken && tokenRow.refresh_token) {
          refreshToken = tokenRow.refresh_token;
        }
      }
    } catch (sbErr) {
      console.warn('Could not query oauth_tokens from Supabase', sbErr);
    }
  }

  // Handle simulation mode for easy verification and testing
  if (isSimulated || isSimulatedUnder || (!accessToken && !refreshToken && (isSimulated || isSimulatedUnder))) {
    if (isSimulatedUnder) {
      return {
        success: true,
        simulated: true,
        provider: 'Google Health (Simulated)',
        date: targetDate,
        player: targetPlayer,
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
      };
    }

    const mockCheckIns: CheckIn[] = [
      {
        id: `checkin-${targetPlayer}-sleep-${targetDate}`,
        habitId: `${targetPlayer}-sleep`,
        playerId: targetPlayer,
        date: targetDate,
        pointsEarned: 50,
        completedAt: new Date().toISOString(),
        note: 'Auto-synced via Google Health (Simulated: 8.2 hrs sleep)',
      },
      {
        id: `checkin-${targetPlayer}-gym-${targetDate}`,
        habitId: `${targetPlayer}-gym`,
        playerId: targetPlayer,
        date: targetDate,
        pointsEarned: 40,
        completedAt: new Date().toISOString(),
        note: 'Auto-synced via Google Health (Simulated: Heavy Strength Session)',
      },
    ];

    await trySaveToSupabase(mockCheckIns);

    return {
      success: true,
      simulated: true,
      provider: 'Google Health (Simulated)',
      date: targetDate,
      player: targetPlayer,
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
    };
  }

  // Refresh token if necessary
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

        if (sbUrl && sbKey) {
          try {
            const sbClient = createClient(sbUrl, sbKey);
            const expiresAt = new Date(Date.now() + (refreshData.expires_in || 3600) * 1000).toISOString();
            await sbClient.from('oauth_tokens').upsert(
              {
                player_id: targetPlayer,
                provider: 'google',
                access_token: accessToken,
                expires_at: expiresAt,
                updated_at: new Date().toISOString(),
              },
              { onConflict: 'player_id' }
            );
          } catch (e) {
            console.warn('Could not update refreshed oauth_tokens in Supabase', e);
          }
        }
      }
    } catch (e) {
      console.error('Failed to refresh Google token', e);
    }
  }

  if (!accessToken) {
    return {
      success: false,
      player: targetPlayer,
      date: targetDate,
      checkInsCreated: [],
      error: 'not_authenticated',
      message: `Google Health is not connected for player ${targetPlayer}. Connect via Vault or authenticate with Google.`,
      connectUrl: `/api/auth/google?player=${targetPlayer}`,
    };
  }

  try {
    const target = new Date(`${targetDate}T00:00:00.000Z`);
    const startTimeMillis = target.getTime() - 10 * 60 * 60 * 1000;
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

    // 1. Attempt Modern Google Health API (v4)
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
          const points = (sleepData.dataPoints || sleepData.data_points || []) as Array<{
            startTime?: string;
            endTime?: string;
            durationNanos?: string;
          }>;
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
            }
          }
        }

        if (exerciseRes.ok) {
          const exerciseData = await exerciseRes.json();
          const points = (exerciseData.dataPoints || exerciseData.data_points || []) as Array<{
            exerciseType?: string;
            title?: string;
            startTime?: string;
            endTime?: string;
          }>;
          for (const pt of points) {
            const st = pt.startTime ? new Date(pt.startTime).getTime() : 0;
            const et = pt.endTime ? new Date(pt.endTime).getTime() : 0;
            if (st >= startTimeMillis && et <= endTimeMillis && et > st) {
              const durMins = Math.round((et - st) / (1000 * 60));
              const typeStr = (pt.exerciseType || pt.title || '').toLowerCase();
              detectedActivities.push({
                name: pt.title || pt.exerciseType || 'Exercise',
                activityType: typeStr,
                durationMinutes: durMins,
              });

              if (
                typeStr.includes('strength') ||
                typeStr.includes('weight') ||
                typeStr.includes('gym') ||
                typeStr.includes('lifting')
              ) {
                hasGym = true;
              }
              if (
                typeStr.includes('running') ||
                typeStr.includes('run') ||
                typeStr.includes('basketball') ||
                typeStr.includes('cardio')
              ) {
                hasSport = true;
              }
            }
          }
        }
      } else {
        const [sleepErr, exerciseErr] = await Promise.all([sleepRes.text(), exerciseRes.text()]);
        healthApiError = `Sleep API: ${sleepRes.status} (${sleepErr.substring(0, 100)}); Exercise API: ${exerciseRes.status} (${exerciseErr.substring(0, 100)})`;
      }
    } catch (e: unknown) {
      healthApiError = e instanceof Error ? e.message : 'Unknown exception';
    }

    // 2. Fallback to Google Fitness API v1 Sessions if Health API was empty or failed
    if (!syncProvider && totalSleepMillis === 0 && detectedActivities.length === 0) {
      const fitUrl = `https://www.googleapis.com/fitness/v1/users/me/sessions?startTime=${encodeURIComponent(startTimeIso)}&endTime=${encodeURIComponent(endTimeIso)}`;
      const fitRes = await fetch(fitUrl, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (fitRes.ok) {
        syncProvider = 'Google Fitness API (v1)';
        const fitData = await fitRes.json();
        const sessions: GoogleSession[] = fitData.session || [];

        for (const s of sessions) {
          const st = parseInt(s.startTimeMillis, 10);
          const et = parseInt(s.endTimeMillis, 10);
          const dur = et - st;
          const durMins = Math.round(dur / (1000 * 60));

          if (s.activityType === 72) {
            totalSleepMillis += dur;
            sleepSessions.push({
              start: formatTime(st),
              end: formatTime(et),
              durationMinutes: durMins,
              durationHours: Math.round((dur / (1000 * 60 * 60)) * 10) / 10,
            });
          } else {
            detectedActivities.push({
              name: s.name || `Activity ${s.activityType}`,
              activityType: s.activityType,
              durationMinutes: durMins,
            });

            if (s.activityType === 97 || s.activityType === 114) {
              hasGym = true;
            }
            if (s.activityType === 8 || s.activityType === 10) {
              hasSport = true;
            }
          }
        }
      } else {
        const fitErrText = await fitRes.text();
        let parsedMsg = fitErrText;
        try {
          const jsonErr = JSON.parse(fitErrText);
          parsedMsg = jsonErr.error?.message || fitErrText;
        } catch {
          parsedMsg = fitErrText;
        }

        return {
          success: false,
          player: targetPlayer,
          date: targetDate,
          checkInsCreated: [],
          error: 'google_api_query_failed',
          details: { healthApiError, fitnessApiError: fitErrText },
          message: `Google API query failed. Fitness: ${parsedMsg}. ${healthApiError ? `Health API: ${healthApiError}` : ''}`,
        };
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

    // Build CheckIn objects
    if (sleepQualified) {
      checkInsToCreate.push({
        id: `checkin-${targetPlayer}-sleep-${targetDate}`,
        habitId: `${targetPlayer}-sleep`,
        playerId: targetPlayer,
        date: targetDate,
        pointsEarned: 50,
        completedAt: new Date().toISOString(),
        note: `Auto-synced from ${syncProvider} (${sleepHours} hrs sleep)`,
      });
    }

    if (hasGym) {
      checkInsToCreate.push({
        id: `checkin-${targetPlayer}-gym-${targetDate}`,
        habitId: `${targetPlayer}-gym`,
        playerId: targetPlayer,
        date: targetDate,
        pointsEarned: 40,
        completedAt: new Date().toISOString(),
        note: `Auto-synced from ${syncProvider} (Strength Workout)`,
      });
    }

    if (hasSport) {
      checkInsToCreate.push({
        id: `checkin-${targetPlayer}-sport-${targetDate}`,
        habitId: `${targetPlayer}-sport`,
        playerId: targetPlayer,
        date: targetDate,
        pointsEarned: 30,
        completedAt: new Date().toISOString(),
        note: `Auto-synced from ${syncProvider} (Basketball / Running)`,
      });
    }

    await trySaveToSupabase(checkInsToCreate);

    return {
      success: true,
      provider: syncProvider || 'Google Health / Fitness',
      date: targetDate,
      player: targetPlayer,
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
      message: `${syncProvider || 'Google Health'} sync complete: ${checkInsToCreate.length} habit(s) qualified.`,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Google Health sync failed:', message);
    return {
      success: false,
      player: targetPlayer,
      date: targetDate,
      checkInsCreated: [],
      error: 'sync_exception',
      message,
    };
  }
}

async function trySaveToSupabase(checkIns: CheckIn[]) {
  if (checkIns.length === 0) return;
  const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (sbUrl && isValidSupabaseUrl(sbUrl) && sbKey) {
    try {
      const client = createClient(sbUrl, sbKey);
      const rows = checkIns.map(checkInToRow);
      await client.from('check_ins').upsert(rows, { onConflict: 'habit_id,date' });
    } catch (e) {
      console.warn('Could not auto-save wearable check-in to Supabase', e);
    }
  }
}
