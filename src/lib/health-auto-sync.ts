export const HEALTH_AUTO_SYNC_COOLDOWN_MS = 15 * 60_000;
export const HEALTH_AUTO_SYNC_STARTUP_DELAY_MS = 1_500;

export type HealthAutoSyncDisabledReason = 'unavailable' | 'not_connected' | 'needs_attention';

export interface AutoHealthSyncEligibility {
  isHydrated: boolean;
  multiplayerConfigured: boolean;
  hasUser: boolean;
  hasDuelLoaded: boolean;
  hasAutomatedHabits: boolean;
  isVisible: boolean;
  isOnline: boolean;
  inFlight: boolean;
  disabledReason: HealthAutoSyncDisabledReason | null;
  lastAttemptAt: number;
  lastCheckedAt?: string | null;
  nowMs?: number;
  cooldownMs?: number;
}

export function shiftDate(date: string, days: number): string {
  return new Date(Date.parse(`${date}T12:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);
}

export function previousDate(date: string): string {
  return shiftDate(date, -1);
}

export function nextDate(date: string): string {
  return shiftDate(date, 1);
}

export function resolveSyncDates(
  today: string,
  requestedDate?: string,
  includeYesterday = false,
): string[] {
  if (requestedDate && requestedDate !== today) {
    return [requestedDate];
  }
  if (includeYesterday) {
    return [previousDate(today), today];
  }
  return [today];
}

export function isHealthCooldownActive(
  lastCheckedAt: string | null | undefined,
  nowMs = Date.now(),
  cooldownMs = HEALTH_AUTO_SYNC_COOLDOWN_MS,
): boolean {
  if (!lastCheckedAt) return false;
  const parsed = Date.parse(lastCheckedAt);
  if (!Number.isFinite(parsed)) return false;
  return nowMs - parsed < cooldownMs;
}

export function needsHealthReconnect(lastError: string | null | undefined): boolean {
  if (!lastError) return false;
  return /permission needs attention|reconnect|invalid_grant/i.test(lastError);
}

export function resolveClientTimeZone(fallback = 'UTC'): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return tz && tz.trim().length > 0 ? tz : fallback;
  } catch {
    return fallback;
  }
}

export function shouldRunAutoHealthSync(input: AutoHealthSyncEligibility): boolean {
  if (
    !input.isHydrated ||
    !input.multiplayerConfigured ||
    !input.hasUser ||
    !input.hasDuelLoaded ||
    !input.hasAutomatedHabits ||
    !input.isVisible ||
    !input.isOnline ||
    input.inFlight ||
    input.disabledReason !== null
  ) {
    return false;
  }

  const nowMs = input.nowMs ?? Date.now();
  const cooldownMs = input.cooldownMs ?? HEALTH_AUTO_SYNC_COOLDOWN_MS;
  if (input.lastAttemptAt > 0 && nowMs - input.lastAttemptAt < cooldownMs) {
    return false;
  }
  if (isHealthCooldownActive(input.lastCheckedAt, nowMs, cooldownMs)) {
    return false;
  }
  return true;
}
