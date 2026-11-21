'use client';

// PROTOTYPE: floating variant switcher for throwaway UI prototypes. Never ships to production.
import React, { useCallback, useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export type PrototypeVariant = { key: string; name: string };

export function prototypesEnabled() {
  return process.env.NODE_ENV !== 'production' || process.env.NEXT_PUBLIC_PROTOTYPES === '1';
}

export function PrototypeSwitcher({ variants, current }: { variants: PrototypeVariant[]; current: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const index = Math.max(0, variants.findIndex(v => v.key === current));

  const go = useCallback((delta: number) => {
    const next = variants[(index + delta + variants.length) % variants.length];
    const params = new URLSearchParams(searchParams.toString());
    params.set('variant', next.key);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [index, variants, searchParams, pathname, router]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t?.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t?.tagName ?? '')) return;
      if (e.key === 'ArrowLeft') go(-1);
      if (e.key === 'ArrowRight') go(1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go]);

  if (!prototypesEnabled()) return null;
  const v = variants[index];
  return (
    <div
      className="fixed left-1/2 z-[60] -translate-x-1/2 flex items-center gap-1 rounded-full bg-fuchsia-600 text-white shadow-[0_8px_30px_rgba(0,0,0,0.45)] ring-2 ring-white/70 p-1"
      style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 5.5rem)' }}
      role="toolbar"
      aria-label="Prototype variant switcher"
    >
      <button type="button" onClick={() => go(-1)} aria-label="Previous variant" className="grid size-9 place-items-center rounded-full hover:bg-white/15 active:bg-white/25">
        <ChevronLeft className="size-4" />
      </button>
      <span className="px-2 text-[13px] font-semibold whitespace-nowrap">
        {v.key} · {v.name}
      </span>
      <button type="button" onClick={() => go(1)} aria-label="Next variant" className="grid size-9 place-items-center rounded-full hover:bg-white/15 active:bg-white/25">
        <ChevronRight className="size-4" />
      </button>
    </div>
  );
}
