import { AppState, HabitCategory } from './types';
import { getInitialState } from './seed';
import { isValidDateString } from './date-utils';
import { rebalanceAllWeeklyCheckIns } from './weekly-utils';

const categories: HabitCategory[] = ['foundation', 'physical', 'cardio', 'mind', 'intellect', 'skills', 'deep_work', 'language', 'nutrition', 'environment', 'finance'];
const player = (value: unknown) => value === 'maciek' || value === 'myrna';
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const text = (value: unknown) => typeof value === 'string';
const number = (value: unknown) => typeof value === 'number' && Number.isFinite(value) && value >= 0;
const optionalText = (value: unknown) => value === undefined || text(value);
const optionalBoolean = (value: unknown) => value === undefined || typeof value === 'boolean';
const photo = (value: unknown) => {
  if (typeof value !== 'string') return false;
  if (/^data:image\/(?:jpeg|png|gif|webp|avif);base64,[a-z\d+/=\s]+$/i.test(value)) return true;
  try { return ['https:', 'http:'].includes(new URL(value).protocol); }
  catch { return false; }
};

/** Validate untrusted backups before they can replace any saved progress. */
export function parseBackup(json: string, preserveCheckInPoints = false): AppState {
  const data: unknown = JSON.parse(json);
  if (!record(data) || !record(data.players) || !Array.isArray(data.habits) || !Array.isArray(data.checkIns)) throw new Error('Choose a Do It JSON backup with players, habits and check-ins.');
  for (const id of ['maciek', 'myrna']) {
    const p = data.players[id];
    if (!record(p) || p.id !== id || !text(p.name)) throw new Error('The backup contains an invalid player.');
  }
  if (data.activePlayerId != null && !player(data.activePlayerId)) throw new Error('The selected player is invalid.');
  if (!optionalBoolean(data.soundEnabled) || !optionalBoolean(data.hapticsEnabled)) throw new Error('The backup contains invalid preferences.');
  const habitIds = new Map<string, unknown>();
  for (const h of data.habits) {
    if (!record(h) || !text(h.id) || !h.id || habitIds.has(h.id as string) || !player(h.playerId) || !text(h.title) || !h.title || !categories.includes(h.category as HabitCategory) || !number(h.points) || !number(h.order) || typeof h.isActive !== 'boolean' || !text(h.iconName)) throw new Error('The backup contains an invalid or duplicate habit.');
    if (h.weeklyTargetDays !== undefined && (!Number.isInteger(h.weeklyTargetDays) || Number(h.weeklyTargetDays) < 1 || Number(h.weeklyTargetDays) > 7)) throw new Error('Weekly targets must be between 1 and 7.');
    if (!optionalText(h.description) || !optionalText(h.quantityUnit) || !optionalBoolean(h.requiresProof) || !optionalBoolean(h.isQuantitative) || !optionalBoolean(h.isArchived) || (h.frequency !== undefined && !['daily', 'weekly'].includes(String(h.frequency)))) throw new Error('The backup contains invalid habit details.');
    if (h.isQuantitative && (!number(h.maxQuantity) || !Number(h.maxQuantity) || !number(h.pointsPerUnit) || !Number(h.pointsPerUnit))) throw new Error('Quantitative habits need a valid maximum and points per unit.');
    habitIds.set(h.id as string, h.playerId);
  }
  const seen = new Set<string>();
  const ids = new Set<string>();
  for (const c of data.checkIns) {
    if (!record(c) || !text(c.id) || !c.id || !text(c.habitId) || !player(c.playerId) || habitIds.get(c.habitId as string) !== c.playerId || !isValidDateString(c.date) || !number(c.pointsEarned) || !text(c.completedAt) || !Number.isFinite(Date.parse(c.completedAt as string))) throw new Error('The backup contains an invalid check-in.');
    const key = `${c.habitId}:${c.date}`;
    if (seen.has(key) || ids.has(c.id as string)) throw new Error('The backup contains duplicate check-ins.');
    if (c.quantity !== undefined && !number(c.quantity)) throw new Error('Check-in quantities must be positive numbers.');
    if (!optionalText(c.note) || !optionalBoolean(c.isRetroactive) || (c.loggedAt !== undefined && (!text(c.loggedAt) || !Number.isFinite(Date.parse(c.loggedAt as string))))) throw new Error('The backup contains invalid check-in details.');
    if ((c.proofUrl !== undefined && !photo(c.proofUrl)) || (c.proofUrls !== undefined && (!Array.isArray(c.proofUrls) || !c.proofUrls.every(photo)))) throw new Error('Invalid proof photos.');
    seen.add(key);
    ids.add(c.id as string);
  }
  if (data.stakes !== undefined && (!Array.isArray(data.stakes) || !data.stakes.every((s) => record(s) && text(s.id) && text(s.title) && text(s.periodKey) && ['weekly', 'monthly', 'yearly'].includes(String(s.period)) && ['active', 'completed', 'rolled_over'].includes(String(s.status)) && isValidDateString(s.dueDate)))) throw new Error('The backup contains an invalid stake.');
  if (Array.isArray(data.stakes) && !data.stakes.every((s) => optionalText(s.description) && optionalBoolean(s.acknowledged) && (s.winnerId === undefined || s.winnerId === 'tie' || player(s.winnerId)))) throw new Error('The backup contains invalid stake details.');
  if (data.restDays !== undefined && (!Array.isArray(data.restDays) || !data.restDays.every((r) => record(r) && text(r.id) && player(r.playerId) && isValidDateString(r.date)))) throw new Error('The backup contains invalid rest days.');
  if (Array.isArray(data.restDays) && !data.restDays.every((r) => optionalText(r.reason) && text(r.createdAt) && Number.isFinite(Date.parse(r.createdAt)))) throw new Error('The backup contains invalid rest-day details.');
  if (data.reactions !== undefined && (!Array.isArray(data.reactions) || !data.reactions.every((r) => record(r) && text(r.id) && player(r.fromPlayerId) && player(r.toPlayerId) && text(r.emoji) && text(r.message) && text(r.timestamp)))) throw new Error('The backup contains invalid reactions.');
  const defaults = getInitialState();
  // Connection settings belong to this device and are never trusted from an imported file.
  const restored = { ...defaults, ...data, players: defaults.players, supabaseConfig: undefined, wearableConfig: undefined } as AppState;
  if (!preserveCheckInPoints) restored.checkIns = rebalanceAllWeeklyCheckIns(restored.checkIns, restored.habits);
  return restored;
}
