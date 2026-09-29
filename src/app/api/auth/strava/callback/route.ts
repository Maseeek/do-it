import { validateOAuthState } from '@/lib/oauth';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get('code');
  const error = searchParams.get('error');


  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL && process.env.NEXT_PUBLIC_APP_URL !== 'undefined'
      ? process.env.NEXT_PUBLIC_APP_URL
      : (request.nextUrl?.origin && request.nextUrl.origin !== 'null' ? request.nextUrl.origin : 'http://localhost:3000');

  if (error) {
    return NextResponse.redirect(
      new URL(`/?tab=vault&wearable_error=${encodeURIComponent(error)}`, appUrl)
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL('/?tab=vault&wearable_error=missing_code', appUrl)
    );
  }

  const player = validateOAuthState(request, 'strava');
  if (!player) return NextResponse.redirect(new URL('/?tab=vault&section=settings&wearable_error=invalid_oauth_state', appUrl));

  const clientId = process.env.STRAVA_CLIENT_ID;
  const clientSecret = process.env.STRAVA_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(
      new URL('/?tab=vault&wearable_error=missing_strava_credentials', appUrl)
    );
  }

  try {
    const tokenResponse = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      console.error('Strava token exchange failed:', tokenResponse.status);
      return NextResponse.redirect(
        new URL('/?tab=vault&wearable_error=token_exchange_failed', appUrl)
      );
    }

    const tokenData = await tokenResponse.json();
    const { access_token, refresh_token, expires_at, expires_in, athlete } = tokenData;

    const athleteName = athlete
      ? `${athlete.firstname || ''} ${athlete.lastname || ''}`.trim() || athlete.username || 'Strava Athlete'
      : 'Strava Athlete';
    const athleteId = athlete?.id ? String(athlete.id) : '';

    // Successful exchange: set cookies and redirect to Vault
    const response = NextResponse.redirect(
      new URL(`/?tab=vault&wearable_connected=strava&athlete=${encodeURIComponent(athleteName)}`, appUrl)
    );

    const isProd = process.env.NODE_ENV === 'production';

    if (refresh_token) {
      response.cookies.set('strava_refresh_token', refresh_token, {
        httpOnly: true,
        secure: isProd,
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 365, // 1 year
      });
    }

    if (access_token) {
      response.cookies.set('strava_access_token', access_token, {
        httpOnly: true,
        secure: isProd,
        sameSite: 'lax',
        path: '/',
        maxAge: expires_in || 21600,
      });
    }

    if (expires_at) {
      response.cookies.set('strava_expires_at', String(expires_at), {
        httpOnly: false,
        secure: isProd,
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 365,
      });
    }

    response.cookies.set('strava_athlete_name', athleteName, {
      httpOnly: false,
      secure: isProd,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
    });

    if (athleteId) {
      response.cookies.set('strava_athlete_id', athleteId, {
        httpOnly: false,
        secure: isProd,
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 365,
      });
    }

    response.cookies.set('strava_player', player, {
      httpOnly: false,
      secure: isProd,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
    });

    response.cookies.set('strava_connected', 'true', {
      httpOnly: false,
      secure: isProd,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
    });

    response.cookies.set('strava_oauth_state', '', { path: '/', maxAge: 0 });
    return response;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Strava OAuth callback exception:', message);
    return NextResponse.redirect(
      new URL(`/?tab=vault&wearable_error=${encodeURIComponent(message)}`, appUrl)
    );
  }
}
