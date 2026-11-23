import { loadCurrentPage } from './load-current-page';

export type DeferredSnapshot<T> =
  | { readonly status: 'pending' }
  | { readonly status: 'ready'; readonly value: T }
  | { readonly status: 'error'; readonly error: unknown };

export function createDeferredResource<T>(
  importModule: () => Promise<T>,
  activate: (load: () => Promise<T>) => Promise<T> = loadCurrentPage,
) {
  const initial: DeferredSnapshot<T> = { status: 'pending' };
  let snapshot: DeferredSnapshot<T> = initial;
  let imported: Promise<T> | undefined;
  let activation: Promise<T> | undefined;
  const listeners = new Set<() => void>();

  function importOnce(): Promise<T> {
    if (!imported) {
      imported = Promise.resolve().then(importModule).catch(error => {
        imported = undefined;
        throw error;
      });
    }
    return imported;
  }

  function publish(next: DeferredSnapshot<T>) {
    snapshot = next;
    for (const listener of listeners) listener();
  }

  // Every activation runs the deployment guard before importing. Once it
  // succeeds, the snapshot stays ready, so later renders need no network.
  function activateOnce(): Promise<T> {
    if (!activation) {
      activation = activate(importOnce).then(value => {
        publish({ status: 'ready', value });
        return value;
      });
    }
    return activation;
  }

  return {
    getSnapshot: () => snapshot,
    getServerSnapshot: () => initial,
    /** Warms the module cache on intent. Opening the view still runs the guard. */
    preload: () => { void importOnce().catch(() => {}); },
    /**
     * Activates the view before anyone opens it, so its first render is
     * synchronous. A failure stays silent and the next open retries.
     */
    load: (): Promise<void> => {
      const attempt = activateOnce();
      return attempt.then(() => {}, error => {
        // A view already waiting on this attempt shows the error; otherwise
        // the next activation starts over.
        if (activation === attempt) activation = undefined;
        throw error;
      });
    },
    /** Follows the snapshot without activating the view. */
    listen(listener: () => void) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      if (snapshot.status === 'pending') {
        activateOnce().catch(error => {
          if (snapshot.status === 'pending') publish({ status: 'error', error });
        });
      }
      return () => { listeners.delete(listener); };
    },
  };
}
