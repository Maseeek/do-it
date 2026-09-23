import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
  const redirectUri = `${appUrl}/api/auth/google/callback`;

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

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(
      new URL('/?tab=vault&wearable_error=missing_server_credentials', appUrl)
    );
  }

  try {
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      const errText = await tokenResponse.text();
      console.error('Failed to exchange code for tokens:', errText);
      return NextResponse.redirect(
        new URL(`/?tab=vault&wearable_error=token_exchange_failed`, appUrl)
      );
    }

    const tokenData = await tokenResponse.json();
    const { access_token, refresh_token, expires_in } = tokenData;

    // Successful exchange: set cookies and redirect to Vault
    const response = NextResponse.redirect(
      new URL('/?tab=vault&wearable_connected=google', appUrl)
    );

    if (refresh_token) {
      response.cookies.set('g_fit_refresh_token', refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 365, // 1 year
      });
    }

    if (access_token) {
      response.cookies.set('g_fit_access_token', access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: expires_in || 3600,
      });
    }

    // Also set a client-readable status cookie
    response.cookies.set('g_fit_connected', 'true', {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
    });

    return response;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('OAuth callback exception:', message);
    return NextResponse.redirect(
      new URL(`/?tab=vault&wearable_error=${encodeURIComponent(message)}`, appUrl)
    );
  }
}
