// Without an account ID, this checks whether any health access is configured.
// Account-specific operations must also check the authenticated account ID.
export function healthEnabled(userId?: string): boolean {
  if (process.env.GOOGLE_HEALTH_ENABLED === 'true') return true;
  const allowedIds = process.env.GOOGLE_HEALTH_ALLOWED_USER_IDS;
  if (!allowedIds) return false;
  return allowedIds.split(',').some(value => {
    const allowedId = value.trim();
    return allowedId !== '' && (userId === undefined || allowedId === userId);
  });
}
