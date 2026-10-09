import { NextRequest, NextResponse } from 'next/server';
import { healthDatabase, localDate } from '@/lib/health-server';
import { healthEnabled } from '@/lib/health-access';
import { syncUserHealth } from '@/lib/health-sync';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const BATCH_SIZE = 5;

export async function GET(request: NextRequest) {
  if (!healthEnabled()) return NextResponse.json({ checked: 0, failed: 0, skipped: true });
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const db = healthDatabase();
    const { data: connections, error } = await db.from('health_connections').select('user_id,time_zone');
    if (error) throw error;
    const results = [];
    const connectionList = (connections || []).filter(connection => healthEnabled(connection.user_id));
    for (let i = 0; i < connectionList.length; i += BATCH_SIZE) {
      const batch = connectionList.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.all(
        batch.map(async (connection) => {
          const userResults = [];
          const today = localDate(connection.time_zone);
          const yesterday = new Date(Date.parse(`${today}T12:00:00Z`) - 86400000).toISOString().slice(0, 10);
          for (const date of [yesterday, today]) {
            try {
              userResults.push({ userId: connection.user_id, ...(await syncUserHealth(connection.user_id, date)) });
            } catch {
              userResults.push({ userId: connection.user_id, date, success: false });
            }
          }
          return userResults;
        })
      );
      results.push(...batchResults.flat());
    }
    return NextResponse.json({ checked: results.length, failed: results.filter(result => !result.success).length });
  } catch {
    return NextResponse.json({ error: 'Scheduled health check failed.' }, { status: 503 });
  }
}
