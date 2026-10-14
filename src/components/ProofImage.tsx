'use client';
import { useEffect, useRef, useState } from 'react';
import { Camera } from 'lucide-react';
import { proofReference } from '@/lib/duel-data';
import { useStore } from '@/lib/store';

export function ProofImage({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const { resolveProofImages } = useStore();
  const container = useRef<HTMLSpanElement>(null);
  const [result, setResult] = useState<{ source: string; url?: string; error?: boolean } | null>(null);
  const remote = !!proofReference(src);
  useEffect(() => {
    if (!remote) return;
    let cancelled = false;
    let requested = false;
    const load = () => {
      if (requested) return;
      requested = true;
      resolveProofImages([src]).then(([url]) => {
        if (!cancelled) setResult({ source: src, url });
      }).catch(() => { if (!cancelled) setResult({ source: src, error: true }); });
    };
    const element = container.current;
    const observer = typeof IntersectionObserver !== 'undefined' ? new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) { load(); observer?.disconnect(); }
    }) : null;
    if (element && observer) observer.observe(element); else load();
    return () => { cancelled = true; observer?.disconnect(); };
  }, [src, remote, resolveProofImages]);
  const current = result?.source === src ? result : null;
  const url = remote ? current?.url : src;
  // Proof bytes are fetched by this component after visibility, including legacy data URLs.
  /* eslint-disable @next/next/no-img-element */
  return <span ref={container} className={'inline-flex items-center justify-center bg-black/20 ' + (className || '')}>
    {url ? <img src={url} alt={alt} className="h-full w-full [object-fit:inherit]" loading="lazy" /> : current?.error ?
      <span role="img" aria-label={"Photo unavailable: " + alt} className="text-xs text-white">Photo unavailable</span> :
      <span role="img" aria-label={alt} className="text-zinc-400"><Camera size={14} /></span>}
  </span>;
}
