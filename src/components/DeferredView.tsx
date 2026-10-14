'use client';

import { createElement, useSyncExternalStore, type ComponentType, type ReactNode } from 'react';
import { createDeferredResource } from '@/lib/deferred-resource';

export function createDeferredView<Props extends object>(
  importView: () => Promise<ComponentType<Props>>,
  fallback: ReactNode = <p role="status" className="py-8 text-center text-sm text-zinc-500">Loading...</p>,
) {
  const resource = createDeferredResource(importView);

  function View(props: Props) {
    const snapshot = useSyncExternalStore(resource.subscribe, resource.getSnapshot, resource.getServerSnapshot);
    if (snapshot.status === 'error') throw snapshot.error;
    if (snapshot.status === 'ready') return createElement(snapshot.value, props);
    return fallback;
  }

  return { View, preload: resource.preload };
}
