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
  let activation: Promise<void> | undefined;
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

  return {
    getSnapshot: () => snapshot,
    getServerSnapshot: () => initial,
    preload: () => { void importOnce().catch(() => {}); },
    subscribe(listener: () => void) {
      listeners.add(listener);
      if (!activation) {
        activation = activate(importOnce).then(
          value => publish({ status: 'ready', value }),
          error => publish({ status: 'error', error }),
        );
      }
      return () => { listeners.delete(listener); };
    },
  };
}
