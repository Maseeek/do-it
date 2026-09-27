import { NextRequest, NextResponse } from 'next/server';
import { AppleHealthSyncPayload, CheckIn } from '@/lib/types';
import { createClient } from '@supabase/supabase-js';
import { checkInToRow } from '@/lib/supabase-sync';
import { isValidSupabaseUrl } from '@/lib/supabase';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

interface PendingCheckInRecord {
  id: string;
  checkIn: CheckIn;
  receivedAt: string;
  consumed: boolean;
}

declare global {
  // eslint-disable-next-line no-var
  var __appleHealthPendingCheckIns: PendingCheckInRecord[] | undefined;
}

const CACHE_FILE_PATH = path.join(process.cwd(), '.scratch', 'apple-health-pending.json');

function getPendingQueue(): PendingCheckInRecord[] {
  if (!globalThis.__appleHealthPendingCheckIns) {
    let loaded: PendingCheckInRecord[] = [];
    try {
      if (fs.existsSync(CACHE_FILE_PATH)) {
        const raw = fs.readFileSync(CACHE_FILE_PATH, 'utf-8');
        loaded = JSON.parse(raw);
      }
    } catch {
      // Ignore read errors
    }
    globalThis.__appleHealthPendingCheckIns = loaded;
  }
  return globalThis.__appleHealthPendingCheckIns;
}

function persistQueue(queue: PendingCheckInRecord[]) {
  try {
    const dir = path.dirname(CACHE_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(CACHE_FILE_PATH, JSON.stringify(queue.slice(-50), null, 2), 'utf-8');
  } catch {
    // Ignore file write errors in serverless
  }
}

function enqueuePendingCheckIn(checkIn: CheckIn) {
  const queue = getPendingQueue();
  const existingIdx = queue.findIndex(
    (item) => item.checkIn.habitId === checkIn.habitId && item.checkIn.date === checkIn.date
  );

  const record: PendingCheckInRecord = {
    id: checkIn.id,
    checkIn,
    receivedAt: new Date().toISOString(),
    consumed: false,
  };

  if (existingIdx >= 0) {
    queue[existingIdx] = record;
  } else {
    queue.push(record);
  }

  if (queue.length > 50) {
    queue.splice(0, queue.length - 50);
  }

  persistQueue(queue);
}

function authenticateRequest(request: NextRequest): { authorized: boolean; reason?: string } {
  const expectedSecret = process.env.APPLE_HEALTH_SECRET;

  // If secret is not set, or is the default placeholder, allow requests
  if (!expectedSecret || expectedSecret === 'your-secure-shared-secret-key') {
    return { authorized: true };
  }

  const authHeader = request.headers.get('authorization');
  const customHeader = request.headers.get('x-apple-health-secret');
  const querySecret = request.nextUrl.searchParams.get('secret');

  let providedSecret = '';
  if (authHeader && authHeader.startsWith('Bearer ')) {
    providedSecret = authHeader.substring(7).trim();
  } else if (customHeader) {
    providedSecret = customHeader.trim();
  } else if (querySecret) {
    providedSecret = querySecret.trim();
  }

  if (providedSecret === expectedSecret) {
    return { authorized: true };
  }

  return {
    authorized: false,
    reason: 'Invalid or missing Apple Health secret token. Pass via ?secret=... or Authorization: Bearer <secret>',
  };
}

async function extractPayload(request: NextRequest): Promise<Record<string, unknown>> {
  const queryObj = Object.fromEntries(request.nextUrl.searchParams.entries());

  if (request.method === 'GET') {
    return queryObj;
  }

  let bodyObj: Record<string, unknown> = {};
  const contentType = request.headers.get('content-type') || '';

  try {
    if (contentType.includes('application/json')) {
      bodyObj = await request.json();
    } else if (
      contentType.includes('application/x-www-form-urlencoded') ||
      contentType.includes('multipart/form-data')
    ) {
      const formData = await request.formData();
      bodyObj = Object.fromEntries(formData.entries());
    } else {
      const rawText = await request.text();
      if (rawText.trim().startsWith('{')) {
        bodyObj = JSON.parse(rawText);
      } else {
        const params = new URLSearchParams(rawText);
        bodyObj = Object.fromEntries(params.entries());
      }
    }
  } catch {
    // Fall back to query parameters
  }

  return { ...queryObj, ...bodyObj };
}

async function handleCheckIn(raw: Record<string, unknown>) {
  const player = (String(raw.player || raw.playerId || 'myrna').toLowerCase() === 'maciek'
    ? 'maciek'
    : 'myrna') as 'myrna' | 'maciek';

  const rawMetric = String(raw.metric || raw.type || 'sleep').toLowerCase();
  const rawVal = Number(raw.value ?? raw.hours ?? raw.duration ?? raw.minutes ?? raw.seconds ?? raw.qty);
  const targetDate = String(raw.date || new Date().toISOString().split('T')[0]);
  const note = raw.note ? String(raw.note) : undefined;
  const unit = raw.unit ? String(raw.unit).toLowerCase() : undefined;

  if (isNaN(rawVal)) {
    return NextResponse.json(
      {
        success: false,
        error: 'missing_value',
        message: 'A numeric sleep or workout value is required (e.g. value=8.2 or hours=8.2).',
      },
      { status: 400 }
    );
  }

  // Normalize metric & value
  if (rawMetric.includes('sleep') || rawMetric.includes('asleep') || rawMetric.includes('bed')) {
    let hours = rawVal;
    // Normalize units dynamically
    if (unit === 'seconds' || unit === 'sec' || unit === 's' || rawVal > 1000) {
      hours = rawVal / 3600;
    } else if (unit === 'minutes' || unit === 'min' || unit === 'm' || rawVal > 24) {
      hours = rawVal / 60;
    }
    hours = Math.round(hours * 10) / 10;

    const habitId = `${player}-sleep`;
    const qualified = hours >= 8.0;

    if (!qualified) {
      return NextResponse.json({
        success: true,
        qualified: false,
        player,
        metric: 'sleep',
        value: hours,
        hoursLogged: hours,
        pointsAwarded: 0,
        date: targetDate,
        message: `Sleep was ${hours} hrs for ${player}. Below the 8.0h target, so 0 points awarded (${hours}/8.0 hrs).`,
      });
    }

    const points = 50;
    const summaryText = `Sleep 8+ Hours (${hours} hrs logged from Apple Health)`;
    const checkIn: CheckIn = {
      id: `checkin-${player}-sleep-${targetDate}`,
      habitId,
      playerId: player,
      date: targetDate,
      pointsEarned: points,
      completedAt: new Date().toISOString(),
      note: note || `Auto-logged via Apple Health: ${summaryText}`,
    };

    enqueuePendingCheckIn(checkIn);
    await maybePersistToSupabase(checkIn);

    return NextResponse.json({
      success: true,
      qualified: true,
      player,
      metric: 'sleep',
      value: hours,
      hoursLogged: hours,
      habitId,
      pointsAwarded: points,
      date: targetDate,
      checkIn,
      message: `Successfully logged ${hours} hrs sleep for ${player} (+50 pts). Habit completed!`,
    });
  }

  if (
    rawMetric.includes('run') ||
    rawMetric.includes('cardio') ||
    rawMetric.includes('sport') ||
    rawMetric.includes('basketball')
  ) {
    let km = rawVal;
    if (unit === 'meters' || unit === 'm' || rawVal > 500) {
      km = Math.round((rawVal / 1000) * 10) / 10;
    } else {
      km = Math.round(rawVal * 10) / 10;
    }

    const habitId = `${player}-sport`;
    const points = 30;
    const summaryText = `Running / Cardio (${km} km from Apple Health)`;
    const checkIn: CheckIn = {
      id: `checkin-${player}-sport-${targetDate}`,
      habitId,
      playerId: player,
      date: targetDate,
      pointsEarned: points,
      completedAt: new Date().toISOString(),
      note: note || `Auto-logged via Apple Health: ${summaryText}`,
    };

    enqueuePendingCheckIn(checkIn);
    await maybePersistToSupabase(checkIn);

    return NextResponse.json({
      success: true,
      qualified: true,
      player,
      metric: 'running',
      value: km,
      habitId,
      pointsAwarded: points,
      date: targetDate,
      checkIn,
      message: `Successfully logged running workout (${km} km) for ${player} (+30 pts)!`,
    });
  }

  if (rawMetric.includes('gym') || rawMetric.includes('strength') || rawMetric.includes('weight')) {
    let mins = rawVal;
    if (rawVal > 1000) {
      mins = Math.round(rawVal / 60);
    } else {
      mins = Math.round(rawVal);
    }

    const habitId = `${player}-gym`;
    const points = 40;
    const summaryText = `Gym & Strength (${mins} mins from Apple Health)`;
    const checkIn: CheckIn = {
      id: `checkin-${player}-gym-${targetDate}`,
      habitId,
      playerId: player,
      date: targetDate,
      pointsEarned: points,
      completedAt: new Date().toISOString(),
      note: note || `Auto-logged via Apple Health: ${summaryText}`,
    };

    enqueuePendingCheckIn(checkIn);
    await maybePersistToSupabase(checkIn);

    return NextResponse.json({
      success: true,
      qualified: true,
      player,
      metric: 'gym',
      value: mins,
      habitId,
      pointsAwarded: points,
      date: targetDate,
      checkIn,
      message: `Successfully logged gym workout (${mins} mins) for ${player} (+40 pts)!`,
    });
  }

  return NextResponse.json(
    {
      success: false,
      error: 'unsupported_metric',
      message: `Metric "${rawMetric}" is not supported. Use "sleep", "running", or "gym".`,
    },
    { status: 400 }
  );
}

async function maybePersistToSupabase(checkIn: CheckIn) {
  const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (sbUrl && isValidSupabaseUrl(sbUrl) && sbKey) {
    try {
      const client = createClient(sbUrl, sbKey);
      await client
        .from('check_ins')
        .upsert([checkInToRow(checkIn)], { onConflict: 'habit_id,date' });
    } catch (e) {
      console.warn('Could not auto-save Apple Health check-in to Supabase', e);
    }
  }
}

export async function GET(request: NextRequest) {
  const auth = authenticateRequest(request);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: 'unauthorized', message: auth.reason }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;

  // 1. Pending check-ins query
  if (searchParams.get('pending') === 'true' || searchParams.get('checkPending') === 'true') {
    const queue = getPendingQueue();
    const shouldConsume = searchParams.get('consume') === 'true';
    const unconsumed = queue.filter((item) => !item.consumed);

    if (shouldConsume && unconsumed.length > 0) {
      unconsumed.forEach((item) => {
        item.consumed = true;
      });
      persistQueue(queue);
    }

    return NextResponse.json({
      success: true,
      pendingCheckIns: unconsumed.map((item) => item.checkIn),
      count: unconsumed.length,
    });
  }

  // 2. Direct check-in via GET query parameters (great for simple 1-line iOS Shortcuts!)
  if (searchParams.has('metric') && (searchParams.has('value') || searchParams.has('hours'))) {
    const raw = Object.fromEntries(searchParams.entries());
    return handleCheckIn(raw);
  }

  // 3. Informational documentation response
  const origin = request.nextUrl.origin || 'https://do-it-app.vercel.app';
  return NextResponse.json({
    status: 'online',
    endpoint: '/api/sync/apple-health',
    description: 'Dynamic Apple Health ingestion endpoint for iOS Shortcuts & HealthKit.',
    howItWorks:
      'Apple Health runs in iOS HealthKit. An iOS Shortcut queries HealthKit samples dynamically (e.g. Find Health Samples -> Sleep Analysis) and sends the real hours/distance here.',
    supportedMethods: ['GET', 'POST'],
    authentication:
      process.env.APPLE_HEALTH_SECRET && process.env.APPLE_HEALTH_SECRET !== 'your-secure-shared-secret-key'
        ? 'Pass ?secret=<secret> or Authorization: Bearer <secret>'
        : 'Optional (Default development mode)',
    sampleShortcutUrls: {
      sleepDynamic: `${origin}/api/sync/apple-health?player=myrna&metric=sleep&value=[Shortcuts_Sleep_Hours_Variable]`,
      runningDynamic: `${origin}/api/sync/apple-health?player=myrna&metric=running&value=[Shortcuts_Run_Distance_Variable]`,
    },
    thresholds: {
      sleep: 'Requires >= 8.0 hours. Automatically normalizes seconds, minutes, or decimal hours.',
      running: 'Awards 30 points to sport habit.',
      gym: 'Awards 40 points to gym habit.',
    },
  });
}

export async function POST(request: NextRequest) {
  const auth = authenticateRequest(request);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: 'unauthorized', message: auth.reason }, { status: 401 });
  }

  const payload = await extractPayload(request);
  return handleCheckIn(payload);
}
