export function getRecommendationUrl(origin: string, referrerId?: string): string {
  const safeOrigin = origin.replace(/\/+$/, '');
  const ref = encodeURIComponent(referrerId || 'friend');
  return `${safeOrigin}/?ref=${ref}`;
}

export function extractRecommendationReferrer(searchParams: URLSearchParams): string | null {
  const ref = searchParams.get('ref') ?? searchParams.get('recommend');
  if (!ref) return null;
  const trimmed = ref.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function getRecommendationShareData(origin: string, referrerName?: string, referrerId?: string) {
  const url = getRecommendationUrl(origin, referrerId);
  const name = referrerName?.trim() || 'A friend';
  return {
    title: 'do it. — Habit Tracker',
    text: `${name} recommended do it. to you — build habits, challenge friends, and stay consistent!`,
    url,
  };
}
