'use client';

import { createElement, memo, useSyncExternalStore, type ComponentType, type ReactNode } from 'react';
import { createDeferredResource } from '@/lib/deferred-resource';

const prefetchQueue: Array<() => Promise<void>> = [];

export function createDeferredView<Props extends object>(
  importView: () => Promise<ComponentType<Props>>,
  fallback: ReactNode = <p role="status" className="py-8 text-center text-sm text-zinc-500">Loading...</p>,
  options: { prefetch?: boolean } = {},
) {
  const resource = createDeferredResource(importView);
  if (options.prefetch) prefetchQueue.push(resource.load);

  function View(props: Props) {
    const snapshot = useSyncExternalStore(resource.subscribe, resource.getSnapshot, resource.getServerSnapshot);
    if (snapshot.status === 'error') throw snapshot.error;
    if (snapshot.status === 'ready') return createElement(snapshot.value, props);
    return fallback;
  }

  const isReady = () => resource.getSnapshot().status === 'ready';
  /**
   * Whether the view's code has loaded, without loading it. An <Activity>
   * boundary uses this to render the view while hidden: effects (including
   * the View's own subscription) only run once it is visible.
   */
  function useReady() {
    return useSyncExternalStore(resource.listen, isReady, () => false);
  }

  // Memoized so a parent's tab switch does not re-render an unchanged view.
  return { View: memo(View), preload: resource.preload, useReady };
}

/**
 * Loads every view created with `prefetch: true` behind one deployment check,
 * so opening one later renders without waiting for the network.
 */
export function prefetchDeferredViews(): Promise<void> {
  return Promise.allSettled(prefetchQueue.map(load => load())).then(() => {});
}
