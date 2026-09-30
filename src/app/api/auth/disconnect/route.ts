import { NextRequest, NextResponse } from 'next/server';
import { authenticatedDuel, decryptToken } from '@/lib/health-server';

export async function POST(request: NextRequest) {
  if (request.headers.get('origin') !== request.nextUrl.origin) return NextResponse.json({ error: 'Invalid origin.' }, { status: 403 });
  const context = await authenticatedDuel(request).catch(() => null);
  if (!context) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });
  const { data: connection } = await context.db.from('health_connections').select('encrypted_refresh_token').eq('user_id', context.user.id).maybeSingle();
  let revoked = !connection;
  if (connection) {
    try {
      const response = await fetch('https://oauth2.googleapis.com/revoke', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ token: decryptToken(connection.encrypted_refresh_token) }), cache: 'no-store' });
      revoked = response.ok || response.status === 400;
    } catch { revoked = false; }
  }
  const { error } = await context.db.from('health_connections').delete().eq('user_id', context.user.id);
  if (error) return NextResponse.json({ error: 'Could not disconnect.' }, { status: 502 });
  return NextResponse.json({ success: true, revoked });
}
