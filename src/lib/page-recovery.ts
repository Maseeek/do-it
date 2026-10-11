const RECOVERY_KEY = 'do_it_page_recovery_attempted';

export function getTodayRecoveryUrl(href: string): string {
  const current = new URL(href);
  const params = new URLSearchParams({ tab: 'today' });
  // Keep invitations, but never replay a check-in or reopen the failing view.
  const invite = current.searchParams.get('invite');
  if (invite !== null) params.set('invite', invite);
  return `/?${params}`;
}

export function recoverPageOnce(
  storage: Pick<Storage, 'getItem' | 'setItem'>,
  href: string,
  navigate: (url: string) => void,
): boolean {
  try {
    // Reserve before navigating. Keep this across reloads, including failures
    // in the providers, so even a broken Today page cannot cause a reload loop.
    if (storage.getItem(RECOVERY_KEY)) return false;
    storage.setItem(RECOVERY_KEY, '1');
    navigate(getTodayRecoveryUrl(href));
    return true;
  } catch {
    // Without session storage we cannot safely bound automatic reloads.
    return false;
  }
}
