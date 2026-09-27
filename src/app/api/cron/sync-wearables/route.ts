import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { syncGoogleHealth } from '@/lib/wearables/google-health';
import { isValidSupabaseUrl } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  return handleCron(request);
}

export async function POST(request: NextRequest) {
  return handleCron(request);
}

async function handleCron(request: NextRequest) {
  // 1. Authenticate Cron Request
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get('authorization');
  const querySecret = request.nextUrl.searchParams.get('secret');

  if (cronSecret) {
    const isHeaderValid = authHeader === `Bearer ${cronSecret}`;
    const isQueryValid = querySecret === cronSecret;

    if (!isHeaderValid && !isQueryValid) {
      return NextResponse.json(
        {
          success: false,
          error: 'unauthorized',
          message: 'Invalid or missing CRON_SECRET authorization.',
        },
        { status: 401 }
      );
    }
  }

  // 2. Identify target dates: yesterday and today (UTC)
  const today = new Date().toISOString().split('T')[0];
  const yesterdayDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const yesterday = yesterdayDate.toISOString().split('T')[0];
  const targetDates = [yesterday, today];

  // 3. Find registered players with wearable tokens in Supabase
  const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  let playerIds: string[] = ['maciek'];

  if (sbUrl && isValidSupabaseUrl(sbUrl) && sbKey) {
    try {
      const client = createClient(sbUrl, sbKey);
      const { data: rows } = await client
        .from('oauth_tokens')
        .select('player_id')
        .eq('provider', 'google');

      if (rows && rows.length > 0) {
        playerIds = Array.from(new Set(rows.map((r: { player_id: string }) => r.player_id)));
      }
    } catch (sbErr) {
      console.warn('Could not query registered oauth_tokens for cron:', sbErr);
    }
  }

  // 4. Run sync for each player across both target dates
  const results = [];

  for (const playerId of playerIds) {
    for (const date of targetDates) {
      try {
        const syncResult = await syncGoogleHealth({
          targetDate: date,
          playerId,
        });

        results.push({
          playerId,
          date,
          success: syncResult.success,
          checkInsCreated: syncResult.checkInsCreated?.length || 0,
          sleepHours: syncResult.sleepHours,
          gymDetected: syncResult.gymDetected,
          sportDetected: syncResult.sportDetected,
          message: syncResult.message,
        });
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : 'Unknown sync error';
        results.push({
          playerId,
          date,
          success: false,
          checkInsCreated: 0,
          error: errMsg,
        });
      }
    }
  }

  return NextResponse.json({
    success: true,
    triggeredAt: new Date().toISOString(),
    datesSynced: targetDates,
    playersSynced: playerIds,
    results,
  });
}
