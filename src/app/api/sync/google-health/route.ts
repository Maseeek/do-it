import { NextRequest, NextResponse } from 'next/server';
import { PlayerId } from '@/lib/types';
import { syncGoogleHealth } from '@/lib/wearables/google-health';

export async function GET(request: NextRequest) {
  return handleSync(request);
}

export async function POST(request: NextRequest) {
  return handleSync(request);
}

async function handleSync(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const targetDate = searchParams.get('date') || new Date().toISOString().split('T')[0];
  const rawPlayer = searchParams.get('playerId') || searchParams.get('player');
  const targetPlayer: PlayerId = rawPlayer === 'myrna' ? 'myrna' : 'maciek';
  const isSimulated = searchParams.get('simulate') === 'true';
  const isSimulatedUnder = searchParams.get('simulateUnder') === 'true';

  let accessToken = request.cookies.get('g_fit_access_token')?.value;
  const refreshToken = request.cookies.get('g_fit_refresh_token')?.value;

  const authHeader = request.headers.get('authorization');
  if (!accessToken && authHeader && authHeader.startsWith('Bearer ')) {
    accessToken = authHeader.substring(7).trim();
  }

  const result = await syncGoogleHealth({
    targetDate,
    playerId: targetPlayer,
    isSimulated,
    isSimulatedUnder,
    accessToken,
    refreshToken,
  });

  if (!result.success && result.error === 'not_authenticated') {
    return NextResponse.json(result, { status: 401 });
  }

  if (!result.success && result.error === 'google_api_query_failed') {
    return NextResponse.json(result, { status: 502 });
  }

  if (!result.success && result.error === 'sync_exception') {
    return NextResponse.json(result, { status: 500 });
  }

  return NextResponse.json(result);
}
