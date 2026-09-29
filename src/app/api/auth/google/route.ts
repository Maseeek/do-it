import { createOAuthState } from '@/lib/oauth';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
  const redirectUri = `${appUrl}/api/auth/google/callback`;

  if (!clientId) {
    return NextResponse.json(
      {
        error: 'GOOGLE_CLIENT_ID is not configured in environment variables.',
        instructions: 'Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to .env.local',
      },
      { status: 500 }
    );
  }

  // Google Health API (v4) & Google Fitness Scopes for Sleep & Workouts
  const scopes = [
    'https://www.googleapis.com/auth/googlehealth.activity_and_fitness.readonly',
    'https://www.googleapis.com/auth/googlehealth.sleep.readonly',
    'https://www.googleapis.com/auth/googlehealth.health_metrics_and_measurements.readonly',
    'https://www.googleapis.com/auth/fitness.sleep.read',
    'https://www.googleapis.com/auth/fitness.activity.read',
  ].join(' ');

  const player = request.nextUrl.searchParams.get('player') === 'myrna' ? 'myrna' : 'maciek';

  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', scopes);
  authUrl.searchParams.set('access_type', 'offline');
  authUrl.searchParams.set('prompt', 'consent'); // Force refresh_token on consent
  const response = NextResponse.redirect(authUrl.toString());
  authUrl.searchParams.set('state', createOAuthState(response, 'google', player));
  response.headers.set('Location', authUrl.toString());

  return response;
}
