import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const clientId = process.env.STRAVA_CLIENT_ID;
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL && process.env.NEXT_PUBLIC_APP_URL !== 'undefined'
      ? process.env.NEXT_PUBLIC_APP_URL
      : (request.nextUrl?.origin && request.nextUrl.origin !== 'null' ? request.nextUrl.origin : 'http://localhost:3000');
  const redirectUri = `${appUrl}/api/auth/strava/callback`;
  const player = request.nextUrl.searchParams.get('player') || 'maciek';

  if (!clientId) {
    return NextResponse.json(
      {
        error: 'STRAVA_CLIENT_ID is not configured in environment variables.',
        instructions:
          'Create a free Strava API application at https://www.strava.com/settings/api and set STRAVA_CLIENT_ID and STRAVA_CLIENT_SECRET in .env.local',
      },
      { status: 500 }
    );
  }

  // Scopes required to read athlete activities
  const scope = 'read,activity:read,activity:read_all';

  const authUrl = new URL('https://www.strava.com/oauth/authorize');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('approval_prompt', 'auto');
  authUrl.searchParams.set('scope', scope);
  authUrl.searchParams.set('state', player);

  return NextResponse.redirect(authUrl.toString());
}
