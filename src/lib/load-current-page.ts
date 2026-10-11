import { recoverPageOnce } from './page-recovery';

export function hasAppVersionChanged(current: string | undefined, response: unknown): boolean {
  return Boolean(current && response && typeof response === 'object' && 'version' in response
    && typeof response.version === 'string' && response.version && response.version !== current);
}

export async function loadCurrentPage<T>(load: () => Promise<T>): Promise<T> {
  const version = process.env.NEXT_PUBLIC_APP_VERSION;
  if (typeof window !== 'undefined' && version && navigator.onLine) {
    let changed = false;
    try {
      // Custom fetches are not deployment-pinned. Ask the current server before
      // requesting a lazy chunk that may belong to an expired deployment.
      const response = await fetch('/api/app-version', { cache: 'no-store', signal: AbortSignal.timeout(1500) });
      if (response.ok) changed = hasAppVersionChanged(version, await response.json());
    } catch {
      // Keep cached/offline pages usable when the version endpoint is unavailable.
    }
    if (changed) {
      let recovering = false;
      try {
        recovering = recoverPageOnce(window.sessionStorage, window.location.href, url => window.location.replace(url));
      } catch {
        // Manual recovery remains available when session storage is denied.
      }
      if (recovering) return new Promise<T>(() => {});
      throw new Error('The app was updated. Return to Today to open the current version.');
    }
  }
  return load();
}
