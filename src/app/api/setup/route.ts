import { NextRequest, NextResponse } from 'next/server';

const configured = (value?: string) => !!value && !/^(your-|replace-|example)/i.test(value);

/** Only readiness flags are public; credentials and health records never leave the server. */
export async function GET(request: NextRequest) {
  const cloud = configured(process.env.NEXT_PUBLIC_SUPABASE_URL) && configured(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const serverStorage = cloud && configured(process.env.SUPABASE_SERVICE_ROLE_KEY);
  const google = configured(process.env.GOOGLE_CLIENT_ID) && configured(process.env.GOOGLE_CLIENT_SECRET);
  const strava = configured(process.env.STRAVA_CLIENT_ID) && configured(process.env.STRAVA_CLIENT_SECRET);
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin).replace(/\/$/, '');
  return NextResponse.json({
    cloud, serverStorage, appUrl,
    google: { configured: google, connected: !!(request.cookies.get('g_fit_access_token')?.value || request.cookies.get('g_fit_refresh_token')?.value), callback: `${appUrl}/api/auth/google/callback` },
    strava: { configured: strava, connected: !!(request.cookies.get('strava_access_token')?.value || request.cookies.get('strava_refresh_token')?.value), callback: `${appUrl}/api/auth/strava/callback` },
    apple: { configured: configured(process.env.APPLE_HEALTH_SECRET), durable: serverStorage },
    hevy: { configured: configured(process.env.HEVY_WEBHOOK_SECRET), durable: serverStorage },
    backgroundSync: google && serverStorage && configured(process.env.CRON_SECRET),
  }, { headers: { 'Cache-Control': 'no-store' } });
}
