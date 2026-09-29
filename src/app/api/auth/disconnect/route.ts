import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin');
  if (origin && origin !== request.nextUrl.origin) return NextResponse.json({ error: 'Invalid origin' }, { status: 403 });
  const provider = request.nextUrl.searchParams.get('provider');
  if (provider !== 'google' && provider !== 'strava') return NextResponse.json({ error: 'Unknown provider' }, { status: 400 });
  if (provider === 'google') {
    const player = request.cookies.get('g_fit_player')?.value;
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (url && key && (player === 'maciek' || player === 'myrna')) {
      const { error } = await createClient(url, key).from('oauth_tokens').delete().eq('player_id', player).eq('provider', 'google');
      if (error) return NextResponse.json({ error: 'Could not stop background sync. Please try again.' }, { status: 502 });
    }
  }
  const response = NextResponse.json({ success: true });
  const names = provider === 'google' ? ['g_fit_access_token', 'g_fit_refresh_token', 'g_fit_connected', 'g_fit_player', 'google_oauth_state'] : ['strava_access_token', 'strava_refresh_token', 'strava_connected', 'strava_athlete_name', 'strava_athlete_id', 'strava_expires_at', 'strava_player', 'strava_oauth_state'];
  names.forEach((name) => response.cookies.set(name, '', { path: '/', maxAge: 0 }));
  return response;
}
