import { NextRequest, NextResponse } from 'next/server';
import { healthDatabase, localDate } from '@/lib/health-server';
import { healthEnabled } from '@/lib/health-access';
import { needsHealthReconnect, previousDate } from '@/lib/health-auto-sync';
import { syncUserHealth } from '@/lib/health-sync';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const BATCH_SIZE = 5;
const TIME_BUDGET_MS = 45_000;

export async function GET(request: NextRequest) {
  if (!healthEnabled()) return NextResponse.json({ checked: 0, failed: 0, skipped: true });
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const startedAt = Date.now();
  try {
    const db = healthDatabase();
    const { data: connections, error } = await db
      .from('health_connections')
      .select('user_id,time_zone,last_error,last_checked_at')
      .order('last_checked_at', { ascending: true, nullsFirst: true });
    if (error) throw error;
    const enabledConnections = (connections || []).filter(connection => healthEnabled(connection.user_id));
    let skipped = 0;
    const eligible = enabledConnections.filter(connection => {
      if (needsHealthReconnect(connection.last_error)) {
        skipped++;
        return false;
      }
      return true;
    });

    const results: Array<{ userId: string; success: boolean }> = [];
    let deferred = 0;
    for (let i = 0; i < eligible.length; i += BATCH_SIZE) {
      if (Date.now() - startedAt > TIME_BUDGET_MS) {
        deferred = eligible.length - i;
        break;
      }
      const batch = eligible.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.all(
        batch.map(async (connection) => {
          const today = localDate(connection.time_zone);
          const yesterday = previousDate(today);
          try {
            const result = await syncUserHealth(connection.user_id, {
              dates: [yesterday, today],
              skipIfAuthError: true,
            });
            return { userId: connection.user_id, success: result.success };
          } catch {
            return { userId: connection.user_id, success: false };
          }
        }),
      );
      results.push(...batchResults);
    }
    return NextResponse.json({
      checked: results.length,
      failed: results.filter(result => !result.success).length,
      skipped,
      deferred,
    });
  } catch {
    return NextResponse.json({ error: 'Scheduled health check failed.' }, { status: 503 });
  }
}
