import { NextRequest, NextResponse } from 'next/server';
import { healthDatabase, healthEnabled, localDate } from '@/lib/health-server';
import { syncUserHealth } from '@/lib/health-sync';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  if (!healthEnabled()) return NextResponse.json({ checked: 0, failed: 0, skipped: true });
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const db = healthDatabase();
    const { data: connections, error } = await db.from('health_connections').select('user_id,time_zone');
    if (error) throw error;
    const results = [];
    for (const connection of connections || []) {
      const today = localDate(connection.time_zone);
      const yesterday = new Date(Date.parse(`${today}T12:00:00Z`) - 86400000).toISOString().slice(0, 10);
      for (const date of [yesterday, today]) {
        try { results.push({ userId: connection.user_id, ...(await syncUserHealth(connection.user_id, date)) }); }
        catch { results.push({ userId: connection.user_id, date, success: false }); }
      }
    }
    return NextResponse.json({ checked: results.length, failed: results.filter(result => !result.success).length });
  } catch {
    return NextResponse.json({ error: 'Scheduled health check failed.' }, { status: 503 });
  }
}
