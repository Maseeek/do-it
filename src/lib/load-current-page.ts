import { recoverPageOnce } from './page-recovery';

export function hasAppVersionChanged(current: string | undefined, response: unknown): boolean {
  return Boolean(current && response && typeof response === 'object' && 'version' in response
    && typeof response.version === 'string' && response.version && response.version !== current);
}

async function requestDeploymentCheck(version: string): Promise<boolean> {
  try {
    // Custom fetches are not deployment-pinned. Ask the current server before
    // requesting a lazy chunk that may belong to an expired deployment.
    const response = await fetch('/api/app-version', { cache: 'no-store', signal: AbortSignal.timeout(1500) });
    return response.ok && hasAppVersionChanged(version, await response.json());
  } catch {
    // Keep cached/offline pages usable when the version endpoint is unavailable.
    return false;
  }
}

let pendingCheck: Promise<boolean> | undefined;

// Views that load together share one request; each later load asks again.
function checkDeployment(version: string): Promise<boolean> {
  if (!pendingCheck) {
    pendingCheck = requestDeploymentCheck(version).finally(() => { pendingCheck = undefined; });
  }
  return pendingCheck;
}

export async function loadCurrentPage<T>(load: () => Promise<T>): Promise<T> {
  const version = process.env.NEXT_PUBLIC_APP_VERSION;
  if (typeof window !== 'undefined' && version && navigator.onLine && await checkDeployment(version)) {
    let recovering = false;
    try {
      recovering = recoverPageOnce(window.sessionStorage, window.location.href, url => window.location.replace(url));
    } catch {
      // Manual recovery remains available when session storage is denied.
    }
    if (recovering) return new Promise<T>(() => {});
    throw new Error('The app was updated. Return to Today to open the current version.');
  }
  return load();
}
